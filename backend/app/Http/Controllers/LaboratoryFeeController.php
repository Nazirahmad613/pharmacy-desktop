<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaboratoryFee;
use App\Models\Registration;
use App\Models\LaboratoryRequest;
use App\Models\Journal;
use App\Models\QRCode;
use App\Models\JournalEntry;
 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;
 

class LaboratoryFeeController extends Controller
{
    /**
     * دریافت لیست فیس‌های لابراتوار
     */
    public function index(Request $request)
    {
        $query = LaboratoryFee::with(['patient', 'registration', 'laboratoryRequest', 'qrCode']);

        if ($request->has('registration_id')) {
            $query->where('registration_id', $request->registration_id);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('barcode', 'LIKE', "%{$search}%")
                  ->orWhereHas('patient', function ($p) use ($search) {
                      $p->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%");
                  });
            });
        }

        $perPage = $request->per_page ?? 15;
        $fees = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $fees,
            'message' => 'لیست فیس‌های لابراتوار'
        ]);
    }

    /**
     * دریافت آمار فیس‌های لابراتوار
     */
    public function statistics(Request $request)
    {
        $query = LaboratoryFee::query();

        // فیلتر بر اساس registration_id در صورت وجود
        if ($request->has('registration_id')) {
            $query->where('registration_id', $request->registration_id);
        }

        $stats = [
            'total' => $query->count(),
            'pending' => (clone $query)->where('payment_status', 'pending')->count(),
            'partial' => (clone $query)->where('payment_status', 'partial')->count(),
            'paid' => (clone $query)->where('payment_status', 'paid')->count(),
            'total_amount' => $query->sum('amount'),
            'total_paid' => $query->sum('paid_amount'),
            'total_remaining' => $query->sum('remaining_amount'),
            'today' => (clone $query)->whereDate('created_at', Carbon::today())->count(),
            'today_amount' => (clone $query)->whereDate('created_at', Carbon::today())->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * دریافت فیس‌های یک مراجعه خاص
     */
    public function getByRegistration($registrationId)
    {
        $registration = Registration::find($registrationId);
        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $fees = LaboratoryFee::where('registration_id', $registrationId)
            ->with(['patient', 'laboratoryRequest', 'qrCode'])
            ->orderBy('created_at', 'desc')
            ->get();

        $totalAmount = $fees->sum('amount');
        $totalPaid = $fees->sum('paid_amount');
        $totalRemaining = $fees->sum('remaining_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'registration' => $registration,
                'fees' => $fees,
                'summary' => [
                    'total_fees' => $fees->count(),
                    'total_amount' => $totalAmount,
                    'total_paid' => $totalPaid,
                    'total_remaining' => $totalRemaining,
                    'has_pending' => $fees->whereIn('payment_status', ['pending', 'partial'])->count() > 0,
                ]
            ]
        ]);
    }

    /**
     * دریافت درخواست‌های لابراتوار بدون فیس برای یک مراجعه
     */
    public function getUnpaidRequests($registrationId)
    {
        $registration = Registration::find($registrationId);
        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $requests = LaboratoryRequest::where('registration_id', $registrationId)
            ->whereNull('fee_id')
            ->whereIn('status', ['pending', 'sample_taken'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($test) {
                return [
                    'id' => $test->id,
                    'test_type' => $test->test_type,
                    'test_type_label' => $test->test_type_label,
                    'test_name' => $test->test_name,
                    'test_description' => $test->test_description,
                    'clinical_indication' => $test->clinical_indication,
                    'special_notes' => $test->special_notes,
                    'request_date' => $test->request_date,
                    'sample_collection_date' => $test->sample_collection_date,
                    'status' => $test->status,
                    'status_label' => $test->status_label,
                    'barcode' => $test->barcode,
                    'created_at' => $test->created_at,
                ];
            });

        // دریافت درخواست‌های دارای فیس برای نمایش در کنار درخواست‌های بدون فیس
        $paidRequests = LaboratoryRequest::where('registration_id', $registrationId)
            ->whereNotNull('fee_id')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($test) {
                return [
                    'id' => $test->id,
                    'test_type' => $test->test_type,
                    'test_type_label' => $test->test_type_label,
                    'test_name' => $test->test_name,
                    'test_description' => $test->test_description,
                    'clinical_indication' => $test->clinical_indication,
                    'special_notes' => $test->special_notes,
                    'request_date' => $test->request_date,
                    'sample_collection_date' => $test->sample_collection_date,
                    'status' => $test->status,
                    'status_label' => $test->status_label,
                    'barcode' => $test->barcode,
                    'fee_id' => $test->fee_id,
                    'has_fee' => true,
                    'created_at' => $test->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'unpaid_requests' => $requests,
                'has_unpaid_requests' => $requests->count() > 0,
                'total_unpaid_requests' => $requests->count(),
                'paid_requests' => $paidRequests,
                'has_paid_requests' => $paidRequests->count() > 0,
                'total_paid_requests' => $paidRequests->count(),
                'all_requests' => $requests->concat($paidRequests)->sortByDesc('created_at')->values(),
                'total_requests' => $requests->count() + $paidRequests->count(),
            ],
            'message' => 'درخواست‌های لابراتوار'
        ]);
    }

    /**
     * ثبت فیس جدید لابراتوار
     */
    public function store(Request $request, $registrationId)
    {
        $registration = Registration::find($registrationId);
        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|in:cash,card,online,insurance',
            'discount' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string',
            'note' => 'nullable|string',
            'laboratory_request_ids' => 'nullable|array',
            'laboratory_request_ids.*' => 'exists:laboratory_requests,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $barcode = $request->barcode ?? $this->generateBarcode();
        $discount = $request->discount ?? 0;
        $amount = $request->amount;
        $paidAmount = $request->paid_amount ?? 0;
        $remainingAmount = $amount - $paidAmount - ($amount * $discount / 100);

        // تعیین وضعیت پرداخت
        $paymentStatus = 'pending';
        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidAmount > 0 && $remainingAmount > 0) {
            $paymentStatus = 'partial';
        }

        // ایجاد فیس لابراتوار
        $fee = LaboratoryFee::create([
            'registration_id' => $registration->id,
            'patient_id' => $registration->patient_id,
            'barcode' => $barcode,
            'amount' => $amount,
            'paid_amount' => $paidAmount,
            'discount' => $discount,
            'remaining_amount' => $remainingAmount,
            'payment_status' => $paymentStatus,
            'payment_method' => $request->payment_method ?? 'cash',
            'description' => $request->description,
            'note' => $request->note,
            'laboratory_request_id' => null,
        ]);

        // ارتباط با درخواست‌های لابراتوار
        $laboratoryRequestIds = $request->laboratory_request_ids ?? [];
        $updatedRequests = collect();
        
        if (!empty($laboratoryRequestIds)) {
            // به‌روزرسانی fee_id در درخواست‌های لابراتوار
            LaboratoryRequest::whereIn('id', $laboratoryRequestIds)
                ->where('registration_id', $registrationId)
                ->update(['fee_id' => $fee->id]);
            
            $updatedRequests = LaboratoryRequest::whereIn('id', $laboratoryRequestIds)->get();
            
            // اگر چندین درخواست وجود دارد، اولین را به عنوان اصلی انتخاب می‌کنیم
            if ($updatedRequests->count() > 0) {
                $fee->laboratory_request_id = $updatedRequests->first()->id;
                $fee->save();
            }
        }

        // تولید QR Code
        $this->generateQRCode($fee);

        // همگام‌سازی با ژورنال
        $this->syncJournal($fee);

        // بارگذاری روابط
        $fee->load(['patient', 'registration']);

        // دریافت همه تست‌های این مراجعه
        $allTests = LaboratoryRequest::where('registration_id', $registrationId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($test) {
                return [
                    'id' => $test->id,
                    'test_type' => $test->test_type,
                    'test_type_label' => $test->test_type_label,
                    'test_name' => $test->test_name,
                    'test_description' => $test->test_description,
                    'clinical_indication' => $test->clinical_indication,
                    'special_notes' => $test->special_notes,
                    'request_date' => $test->request_date,
                    'sample_collection_date' => $test->sample_collection_date,
                    'status' => $test->status,
                    'barcode' => $test->barcode,
                    'fee_id' => $test->fee_id,
                    'has_fee' => $test->fee_id !== null,
                    'created_at' => $test->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'fee' => $fee,
                'all_tests' => $allTests,
                'has_tests' => $allTests->count() > 0,
                'total_tests' => $allTests->count(),
                'updated_requests' => $updatedRequests,
                'has_updated_requests' => $updatedRequests->count() > 0,
            ],
            'message' => 'فیس لابراتوار با موفقیت ثبت شد'
        ], 201);
    }

    /**
     * نمایش یک فیس خاص
     */
    public function show($id)
    {
        $fee = LaboratoryFee::with(['patient', 'registration', 'laboratoryRequest', 'qrCode'])->find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        // دریافت درخواست‌های مرتبط با این فیس
        $relatedRequests = LaboratoryRequest::where('fee_id', $fee->id)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'fee' => $fee,
                'related_requests' => $relatedRequests,
                'has_related_requests' => $relatedRequests->count() > 0,
                'total_related_requests' => $relatedRequests->count()
            ]
        ]);
    }

    /**
     * ویرایش فیس لابراتوار
     */
    public function update(Request $request, $id)
    {
        $fee = LaboratoryFee::find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        if ($fee->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'فیس پرداخت کامل شده قابل ویرایش نیست'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'sometimes|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'sometimes|in:cash,card,online,insurance',
            'description' => 'nullable|string',
            'note' => 'nullable|string',
            'laboratory_request_ids' => 'nullable|array',
            'laboratory_request_ids.*' => 'exists:laboratory_requests,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $amount = $request->amount ?? $fee->amount;
        $paidAmount = $request->paid_amount ?? $fee->paid_amount;
        $discount = $request->discount ?? $fee->discount;
        $remainingAmount = $amount - $paidAmount - ($amount * $discount / 100);

        $paymentStatus = $fee->payment_status;
        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidAmount > 0 && $remainingAmount > 0) {
            $paymentStatus = 'partial';
        } elseif ($paidAmount == 0) {
            $paymentStatus = 'pending';
        }

        $fee->update([
            'amount' => $amount,
            'paid_amount' => $paidAmount,
            'discount' => $discount,
            'payment_method' => $request->payment_method ?? $fee->payment_method,
            'payment_status' => $paymentStatus,
            'description' => $request->description ?? $fee->description,
            'note' => $request->note ?? $fee->note,
        ]);

        // به‌روزرسانی ارتباط با درخواست‌های لابراتوار
        if ($request->has('laboratory_request_ids')) {
            // حذف ارتباط قبلی
            LaboratoryRequest::where('fee_id', $fee->id)->update(['fee_id' => null]);
            
            // برقراری ارتباط جدید
            if (!empty($request->laboratory_request_ids)) {
                LaboratoryRequest::whereIn('id', $request->laboratory_request_ids)
                    ->where('registration_id', $fee->registration_id)
                    ->update(['fee_id' => $fee->id]);
                
                $updatedRequests = LaboratoryRequest::whereIn('id', $request->laboratory_request_ids)->get();
                if ($updatedRequests->count() > 0) {
                    $fee->laboratory_request_id = $updatedRequests->first()->id;
                    $fee->save();
                }
            } else {
                $fee->laboratory_request_id = null;
                $fee->save();
            }
        }

        // بروزرسانی QR Code
        $this->updateQRCode($fee);

        // همگام‌سازی با ژورنال
        $this->syncJournal($fee);

        $fee->load(['patient', 'registration', 'laboratoryRequest']);

        return response()->json([
            'success' => true,
            'data' => $fee,
            'message' => 'فیس لابراتوار با موفقیت ویرایش شد'
        ]);
    }

    /**
     * حذف فیس لابراتوار
     */
    public function destroy($id)
    {
        $fee = LaboratoryFee::find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        if (in_array($fee->payment_status, ['paid', 'refunded'])) {
            return response()->json([
                'success' => false,
                'message' => 'فیس پرداخت یا برگشت داده شده قابل حذف نیست'
            ], 400);
        }

        // حذف ارتباط با درخواست‌های لابراتوار
        LaboratoryRequest::where('fee_id', $fee->id)->update(['fee_id' => null]);

        // حذف QR Code مرتبط
        QRCode::where('laboratory_fee_id', $fee->id)->delete();

        // حذف از ژورنال
        JournalEntry::where('reference_type', 'laboratory_fee')
            ->where('reference_id', $fee->id)
            ->delete();

        $fee->delete();

        return response()->json([
            'success' => true,
            'message' => 'فیس لابراتوار با موفقیت حذف شد'
        ]);
    }

    /**
     * ثبت پرداخت جدید برای یک فیس
     */
    public function addPayment(Request $request, $id)
    {
        $fee = LaboratoryFee::find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        if ($fee->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'این فیس قبلاً به طور کامل پرداخت شده است'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,card,online,insurance',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $newPaidAmount = $fee->paid_amount + $request->amount;
        $discountAmount = $fee->amount * ($fee->discount / 100);
        $remainingAmount = $fee->amount - $newPaidAmount - $discountAmount;

        $paymentStatus = 'partial';
        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        }

        $fee->update([
            'paid_amount' => $newPaidAmount,
            'payment_status' => $paymentStatus,
            'payment_method' => $request->payment_method,
            'note' => $request->note ?? $fee->note,
        ]);

        // بروزرسانی QR Code
        $this->updateQRCode($fee);

        // همگام‌سازی با ژورنال
        $this->syncJournal($fee);

        $fee->load(['patient', 'registration']);

        return response()->json([
            'success' => true,
            'data' => $fee,
            'message' => 'پرداخت با موفقیت ثبت شد'
        ]);
    }

    /**
     * تایید و ارسال به لابراتوار
     */
    public function confirmAndSend(Request $request, $id)
    {
        $fee = LaboratoryFee::with(['laboratoryRequest', 'patient'])->find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        // دریافت تمام درخواست‌های مرتبط با این فیس
        $relatedRequests = LaboratoryRequest::where('fee_id', $fee->id)->get();
        
        if ($relatedRequests->count() == 0) {
            return response()->json([
                'success' => false,
                'message' => 'هیچ درخواستی به این فیس متصل نیست'
            ], 400);
        }

        if ($fee->payment_status !== 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'فیس باید به طور کامل پرداخت شود تا به لابراتوار ارسال شود'
            ], 400);
        }

        // بروزرسانی وضعیت تمام درخواست‌های مرتبط
        foreach ($relatedRequests as $request) {
            $request->update([
                'status' => 'sample_taken',
                'sent_to_lab_at' => Carbon::now(),
                'fee_id' => $fee->id
            ]);
        }

        // تولید QR Code جدید با اطلاعات کامل
        $qrData = $this->generateQRCode($fee, true);

        return response()->json([
            'success' => true,
            'message' => 'درخواست‌ها با موفقیت به لابراتوار ارسال شد',
            'data' => [
                'fee' => $fee,
                'related_requests' => $relatedRequests,
                'total_requests' => $relatedRequests->count(),
                'qr_code' => $qrData
            ]
        ]);
    }

    /**
     * دریافت QR Code یک فیس
     */
    public function getQRCode($id)
    {
        $fee = LaboratoryFee::with(['patient', 'laboratoryRequest'])->find($id);
        
        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس لابراتوار یافت نشد'
            ], 404);
        }

        $qrCode = QRCode::where('laboratory_fee_id', $fee->id)->first();

        if (!$qrCode) {
            $qrCode = $this->generateQRCode($fee);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'fee' => $fee,
                'qr_code' => $qrCode
            ]
        ]);
    }

    /**
     * تولید QR Code
     */
    private function generateQRCode($fee, $forceNew = false)
    {
        // دریافت اطلاعات مریض
        $patient = $fee->patient;
        $registration = $fee->registration;
        
        // دریافت درخواست‌های مرتبط
        $labRequests = LaboratoryRequest::where('fee_id', $fee->id)->get();
        $firstRequest = $labRequests->first();

        // ساخت داده‌های QR
        $qrData = [
            'fee_id' => $fee->id,
            'patient_name' => $patient ? $patient->first_name . ' ' . $patient->last_name : 'نامشخص',
            'patient_id' => $patient ? $patient->id : null,
            'patient_mobile' => $patient ? $patient->mobile : null,
            'registration_id' => $registration ? $registration->id : null,
            'visit_number' => $registration ? $registration->visit_number : null,
            'barcode' => $fee->barcode,
            'amount' => $fee->amount,
            'discount' => $fee->discount,
            'net_amount' => $fee->amount - ($fee->amount * $fee->discount / 100),
            'paid_amount' => $fee->paid_amount,
            'remaining' => $fee->remaining_amount,
            'payment_status' => $fee->payment_status,
            'payment_method' => $fee->payment_method,
            'created_at' => $fee->created_at->toISOString(),
            'tests' => $labRequests->map(function($req) {
                return [
                    'id' => $req->id,
                    'test_type' => $req->test_type,
                    'test_type_label' => $req->test_type_label,
                    'test_name' => $req->test_name,
                    'test_description' => $req->test_description,
                    'clinical_indication' => $req->clinical_indication,
                    'status' => $req->status,
                    'barcode' => $req->barcode,
                ];
            })->toArray(),
            'total_tests' => $labRequests->count(),
        ];

        // تبدیل به JSON
        $qrJson = json_encode($qrData, JSON_UNESCAPED_UNICODE);

        // تولید فایل QR Code
        $fileName = 'qr_' . $fee->barcode . '_' . time() . '.png';
        $path = storage_path('app/public/qrcodes/' . $fileName);
        
        // ایجاد پوشه اگر وجود ندارد
        if (!file_exists(storage_path('app/public/qrcodes'))) {
            mkdir(storage_path('app/public/qrcodes'), 0777, true);
        }

        // تولید QR Code با کتابخانه
        \QrCode::format('png')
            ->size(300)
            ->errorCorrection('H')
            ->generate($qrJson, $path);

        // ذخیره در دیتابیس
        $qrCode = QRCode::updateOrCreate(
            ['laboratory_fee_id' => $fee->id],
            [
                'laboratory_request_id' => $firstRequest ? $firstRequest->id : null,
                'patient_id' => $patient ? $patient->id : null,
                'registration_id' => $registration ? $registration->id : null,
                'qr_code_path' => 'storage/qrcodes/' . $fileName,
                'qr_code_data' => $qrJson,
                'qr_code_type' => 'laboratory_fee',
                'is_active' => true,
            ]
        );

        return $qrCode;
    }

    /**
     * بروزرسانی QR Code
     */
    private function updateQRCode($fee)
    {
        return $this->generateQRCode($fee, true);
    }

    /**
     * همگام‌سازی با ژورنال
     */
    private function syncJournal($fee)
    {
        try {
            // حذف ورودی قبلی
            JournalEntry::where('reference_type', 'laboratory_fee')
                ->where('reference_id', $fee->id)
                ->delete();

            // دریافت اطلاعات مریض
            $patient = $fee->patient;
            $patientName = $patient ? $patient->first_name . ' ' . $patient->last_name : 'نامشخص';
            
            // دریافت درخواست‌های مرتبط
            $requests = LaboratoryRequest::where('fee_id', $fee->id)->get();
            $testTypes = $requests->pluck('test_type')->unique()->implode('، ');
            $testNames = $requests->pluck('test_name')->filter()->implode('، ');

            $description = 'فیس لابراتوار - ' . $patientName;
            if ($testNames) {
                $description .= ' - تست‌ها: ' . $testNames;
            } elseif ($testTypes) {
                $description .= ' - نوع تست: ' . $testTypes;
            }
            $description .= ' - بارکد: ' . $fee->barcode;

            // محاسبه مبلغ نهایی
            $totalAmount = $fee->amount;
            $discountAmount = $totalAmount * ($fee->discount / 100);
            $netAmount = $totalAmount - $discountAmount;
            $remaining = $netAmount - $fee->paid_amount;

            // ثبت ورودی جدید
            JournalEntry::create([
                'registration_id' => $fee->registration_id,
                'patient_id' => $fee->patient_id,
                'reference_type' => 'laboratory_fee',
                'reference_id' => $fee->id,
                'description' => $description,
                'debit' => $netAmount,
                'credit' => $fee->paid_amount,
                'balance' => $remaining,
                'payment_method' => $fee->payment_method,
                'payment_status' => $fee->payment_status,
                'transaction_date' => Carbon::now(),
                'barcode' => $fee->barcode,
                'metadata' => json_encode([
                    'fee_amount' => $fee->amount,
                    'discount' => $fee->discount,
                    'discount_amount' => $discountAmount,
                    'net_amount' => $netAmount,
                    'paid_amount' => $fee->paid_amount,
                    'remaining' => $remaining,
                    'laboratory_request_ids' => $requests->pluck('id')->toArray(),
                    'test_types' => $requests->pluck('test_type')->toArray(),
                    'test_names' => $requests->pluck('test_name')->filter()->toArray(),
                    'patient_name' => $patientName,
                    'patient_mobile' => $patient ? $patient->mobile : null,
                ])
            ]);

        } catch (\Exception $e) {
            \Log::error('خطا در همگام‌سازی ژورنال: ' . $e->getMessage());
        }
    }

    /**
     * تولید بارکد یکتا
     */
    private function generateBarcode()
    {
        $prefix = 'FEE';
        $date = Carbon::now()->format('Ymd');
        $random = Str::random(6);
        $barcode = $prefix . $date . $random;

        while (LaboratoryFee::where('barcode', $barcode)->exists()) {
            $random = Str::random(6);
            $barcode = $prefix . $date . $random;
        }

        return $barcode;
    }
}