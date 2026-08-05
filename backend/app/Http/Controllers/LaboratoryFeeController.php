<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaboratoryFee;
use App\Models\Registration;
use App\Models\LaboratoryRequest;
use App\Models\JournalEntry;
 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

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
     * ثبت فیس جدید لابراتوار
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'registration_id' => 'required|exists:registrations,id',
            'patient_id' => 'required|exists:patients,id',
            'laboratory_request_id' => 'nullable|exists:laboratory_requests,id',
            'amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'required|in:cash,card,online,insurance',
            'description' => 'nullable|string',
            'note' => 'nullable|string',
            'barcode' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $paidAmount = $request->paid_amount ?? 0;
        $discount = $request->discount ?? 0;
        $amount = $request->amount;
        $remainingAmount = $amount - $paidAmount - ($amount * $discount / 100);

        $paymentStatus = 'pending';
        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidAmount > 0 && $remainingAmount > 0) {
            $paymentStatus = 'partial';
        }

        $barcode = $request->barcode ?? $this->generateBarcode();

        $fee = LaboratoryFee::create([
            'registration_id' => $request->registration_id,
            'patient_id' => $request->patient_id,
            'laboratory_request_id' => $request->laboratory_request_id,
            'amount' => $amount,
            'paid_amount' => $paidAmount,
            'discount' => $discount,
            'payment_method' => $request->payment_method,
            'payment_status' => $paymentStatus,
            'description' => $request->description,
            'note' => $request->note,
            'barcode' => $barcode,
        ]);

        // تولید QR Code
        $qrCode = $this->generateQRCode($fee);

        // همگام‌سازی با ژورنال
        $this->syncJournal($fee);

        $fee->load(['patient', 'registration', 'laboratoryRequest']);
        
        // اضافه کردن QR Code به پاسخ
        $fee->qr_code = $qrCode;

        // اگر درخواست لابراتوار مرتبط وجود داشت، وضعیت آن را به روزرسانی کن
        if ($request->laboratory_request_id && $paymentStatus === 'paid') {
            $labRequest = LaboratoryRequest::find($request->laboratory_request_id);
            if ($labRequest) {
                $labRequest->update([
                    'status' => 'sample_taken',
                    'fee_id' => $fee->id
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $fee,
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

        return response()->json([
            'success' => true,
            'data' => $fee
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

        if (!$fee->laboratory_request_id) {
            return response()->json([
                'success' => false,
                'message' => 'این فیس به هیچ درخواستی متصل نیست'
            ], 400);
        }

        if ($fee->payment_status !== 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'فیس باید به طور کامل پرداخت شود تا به لابراتوار ارسال شود'
            ], 400);
        }

        // بروزرسانی وضعیت درخواست
        $fee->laboratoryRequest->update([
            'status' => 'sample_taken',
            'sent_to_lab_at' => Carbon::now(),
            'fee_id' => $fee->id
        ]);

        // تولید QR Code جدید با اطلاعات کامل
        $qrData = $this->generateQRCode($fee, true);

        return response()->json([
            'success' => true,
            'message' => 'درخواست با موفقیت به لابراتوار ارسال شد',
            'data' => [
                'fee' => $fee,
                'laboratory_request' => $fee->laboratoryRequest,
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
        $labRequest = $fee->laboratoryRequest;

        // ساخت داده‌های QR
        $qrData = [
            'fee_id' => $fee->id,
            'patient_name' => $patient ? $patient->first_name . ' ' . $patient->last_name : 'نامشخص',
            'patient_id' => $patient ? $patient->id : null,
            'patient_mobile' => $patient ? $patient->mobile : null,
            'registration_id' => $registration ? $registration->id : null,
            'visit_number' => $registration ? $registration->visit_number : null,
            'laboratory_request_id' => $labRequest ? $labRequest->id : null,
            'test_type' => $labRequest ? $labRequest->test_type : null,
            'test_name' => $labRequest ? $labRequest->test_name : null,
            'barcode' => $fee->barcode,
            'amount' => $fee->amount,
            'payment_status' => $fee->payment_status,
            'payment_method' => $fee->payment_method,
            'created_at' => $fee->created_at->toISOString(),
        ];

        // تبدیل به JSON
        $qrJson = json_encode($qrData);

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
                'laboratory_request_id' => $labRequest ? $labRequest->id : null,
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

            // ثبت ورودی جدید
            JournalEntry::create([
                'registration_id' => $fee->registration_id,
                'patient_id' => $fee->patient_id,
                'reference_type' => 'laboratory_fee',
                'reference_id' => $fee->id,
                'description' => 'فیس لابراتوار - ' . $patientName . ' - بارکد: ' . $fee->barcode,
                'debit' => $fee->amount - ($fee->amount * $fee->discount / 100),
                'credit' => $fee->paid_amount,
                'balance' => $fee->amount - $fee->paid_amount - ($fee->amount * $fee->discount / 100),
                'payment_method' => $fee->payment_method,
                'payment_status' => $fee->payment_status,
                'transaction_date' => Carbon::now(),
                'barcode' => $fee->barcode,
                'metadata' => json_encode([
                    'fee_amount' => $fee->amount,
                    'discount' => $fee->discount,
                    'paid_amount' => $fee->paid_amount,
                    'remaining' => $fee->amount - $fee->paid_amount - ($fee->amount * $fee->discount / 100),
                    'laboratory_request_id' => $fee->laboratory_request_id,
                    'patient_name' => $patientName,
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