<?php

namespace App\Http\Controllers;

use App\Models\LaboratoryFee;
use App\Models\Registrations;
use App\Models\LaboratoryRequest;
use App\Models\QRCode;
use App\Models\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
 

class LaboratoryFeeController extends Controller
{
    /**
     * ============================================================
     * لیست فیس‌های لابراتوار
     * ============================================================
     */
    public function index(Request $request)
    {
        $query = LaboratoryFee::with([
            'patient',
            'registration',
            'laboratoryRequest',
            'qrCode'
        ]);

        if ($request->filled('reg_id')) {
            $query->where('reg_id', $request->reg_id);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('barcode', 'LIKE', "%{$search}%")
                  ->orWhereHas('patient', function ($p) use ($search) {
                      $p->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%");
                  });
            });
        }

        $perPage = (int) ($request->per_page ?? 15);
        if ($perPage < 1) {
            $perPage = 15;
        }

        $fees = $query
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $fees,
            'message' => 'لیست فیس‌های لابراتوار'
        ]);
    }

    /**
     * ============================================================
     * دریافت تمام درخواست‌های لابراتوار تمام مراجعه‌کنندگان
     * ============================================================
     */
    public function getAllRequests()
    {
        try {
            Log::info('دریافت تمام درخواست‌های لابراتوار تمام مراجعه‌کنندگان');

            // دریافت تمام درخواست‌های لابراتوار با اطلاعات مرتبط
            $allRequests = LaboratoryRequest::with([
                'doctor',
                'fee',
                'patient',
                'registration'
            ])
            ->orderByDesc('created_at')
            ->get();

            Log::info('تعداد کل درخواست‌ها: ' . $allRequests->count());

            // فرمت کردن درخواست‌ها
            $formattedRequests = $allRequests->map(function ($request) {
                $fee = $request->fee;
                $hasFee = !is_null($fee);

                return [
                    'id' => $request->id,
                    'reg_id' => $request->reg_id,
                    'patient_id' => $request->patient_id,
                    'doctor_id' => $request->doctor_id,
                    
                    // اطلاعات مریض
                    'patient' => $request->patient ? [
                        'id' => $request->patient->id,
                        'first_name' => $request->patient->first_name ?? '',
                        'last_name' => $request->patient->last_name ?? '',
                        'full_name' => trim(($request->patient->first_name ?? '') . ' ' . ($request->patient->last_name ?? '')),
                        'age' => $request->patient->age ?? null,
                        'gender' => $request->patient->gender ?? null,
                        'mobile' => $request->patient->mobile ?? null,
                        'national_id' => $request->patient->national_id ?? null,
                    ] : null,

                    // اطلاعات مراجعه
                    'registration' => $request->registration ? [
                        'reg_id' => $request->registration->reg_id,
                        'visit_number' => $request->registration->visit_number ?? null,
                        'visit_date' => $request->registration->created_at ?? null,
                    ] : null,

                    // اطلاعات داکتر
                    'doctor' => $request->doctor ? [
                        'id' => $request->doctor->id,
                        'name' => $request->doctor->name ?? '',
                    ] : null,

                    // نوع و مشخصات تست
                    'test_type' => $request->test_type,
                    'test_type_label' => $this->getTestTypeLabel($request->test_type),
                    'test_name' => $request->test_name ?? '',
                    'test_description' => $request->test_description ?? '',
                    'clinical_indication' => $request->clinical_indication ?? '',
                    'special_notes' => $request->special_notes ?? '',

                    // تاریخ‌ها
                    'request_date' => $request->request_date,
                    'sample_collection_date' => $request->sample_collection_date,
                    'result_date' => $request->result_date,

                    // وضعیت
                    'status' => $request->status,
                    'status_label' => $this->getStatusLabel($request->status),

                    // بارکد
                    'barcode' => $request->barcode,

                    // فیس
                    'fee_id' => $request->fee_id,
                    'has_fee' => $hasFee,

                    // اطلاعات فیس (اگر وجود داشته باشد)
                    'fee' => $hasFee ? [
                        'id' => $fee->id,
                        'amount' => (float) $fee->amount,
                        'paid_amount' => (float) $fee->paid_amount,
                        'discount' => (float) $fee->discount,
                        'remaining_amount' => (float) $fee->remaining_amount,
                        'payment_status' => $fee->payment_status,
                        'payment_method' => $fee->payment_method,
                        'barcode' => $fee->barcode,
                        'description' => $fee->description,
                        'note' => $fee->note,
                        'created_at' => $fee->created_at,
                        'reg_id' => $fee->reg_id,
                        'patient_id' => $fee->patient_id,
                    ] : null,

                    // فیلدهای مبلغ (برای نمایش در لیست)
                    'amount' => $hasFee ? (float) $fee->amount : 0,
                    'paid_amount' => $hasFee ? (float) $fee->paid_amount : 0,
                    'discount_percent' => $hasFee ? (float) $fee->discount : 0,
                    'remaining_amount' => $hasFee ? (float) $fee->remaining_amount : 0,
                    'payment_status' => $hasFee ? $fee->payment_status : null,
                    'payment_method' => $hasFee ? $fee->payment_method : null,

                    // زمان ایجاد و ویرایش
                    'created_at' => $request->created_at,
                    'updated_at' => $request->updated_at,
                ];
            });

            // جدا کردن درخواست‌های دارای فیس و بدون فیس
            $unpaidRequests = $formattedRequests->filter(function ($request) {
                return !$request['has_fee'];
            })->values();

            $paidRequests = $formattedRequests->filter(function ($request) {
                return $request['has_fee'];
            })->values();

            // گروه‌بندی بر اساس reg_id برای نمایش بهتر
            $groupedByRegId = $formattedRequests->groupBy('reg_id')->map(function ($requests, $regId) {
                $firstRequest = $requests->first();
                $patientName = $firstRequest['patient']['full_name'] ?? 'نامشخص';
                $hasFeeCount = $requests->filter(function ($r) { return $r['has_fee']; })->count();
                $unpaidCount = $requests->filter(function ($r) { return !$r['has_fee']; })->count();
                
                return [
                    'reg_id' => $regId,
                    'patient_name' => $patientName,
                    'total_requests' => $requests->count(),
                    'has_fee_count' => $hasFeeCount,
                    'unpaid_count' => $unpaidCount,
                    'requests' => $requests->values()->toArray()
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $formattedRequests->toArray(),
                    'unpaid_requests' => $unpaidRequests->toArray(),
                    'paid_requests' => $paidRequests->toArray(),
                    'grouped_by_reg_id' => $groupedByRegId->toArray(),
                    'total_requests' => $formattedRequests->count(),
                    'total_unpaid' => $unpaidRequests->count(),
                    'total_paid' => $paidRequests->count(),
                    'total_registrations' => $groupedByRegId->count(),
                ],
                'message' => 'تمام درخواست‌های لابراتوار تمام مراجعه‌کنندگان با موفقیت دریافت شد',
            ], 200);

        } catch (\Throwable $e) {
            Log::error('خطا در دریافت تمام درخواست‌های لابراتوار', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌های لابراتوار',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت درخواست‌های لابراتوار بر اساس reg_id (برای فیلتر)
     * ============================================================
     */
    public function getRequestsByRegId($regId)
    {
        try {
            Log::info('دریافت درخواست‌های لابراتوار برای reg_id: ' . $regId);

            $allRequests = LaboratoryRequest::with([
                'doctor',
                'fee',
                'patient',
                'registration'
            ])
            ->where('reg_id', $regId)
            ->orderByDesc('created_at')
            ->get();

            Log::info('تعداد درخواست‌ها برای reg_id ' . $regId . ': ' . $allRequests->count());

            $formattedRequests = $allRequests->map(function ($request) {
                $fee = $request->fee;
                $hasFee = !is_null($fee);

                return [
                    'id' => $request->id,
                    'reg_id' => $request->reg_id,
                    'patient_id' => $request->patient_id,
                    'doctor_id' => $request->doctor_id,
                    
                    'patient' => $request->patient ? [
                        'id' => $request->patient->id,
                        'first_name' => $request->patient->first_name ?? '',
                        'last_name' => $request->patient->last_name ?? '',
                        'full_name' => trim(($request->patient->first_name ?? '') . ' ' . ($request->patient->last_name ?? '')),
                        'age' => $request->patient->age ?? null,
                        'gender' => $request->patient->gender ?? null,
                        'mobile' => $request->patient->mobile ?? null,
                        'national_id' => $request->patient->national_id ?? null,
                    ] : null,

                    'registration' => $request->registration ? [
                        'reg_id' => $request->registration->reg_id,
                        'visit_number' => $request->registration->visit_number ?? null,
                    ] : null,

                    'doctor' => $request->doctor ? [
                        'id' => $request->doctor->id,
                        'name' => $request->doctor->name ?? '',
                    ] : null,

                    'test_type' => $request->test_type,
                    'test_type_label' => $this->getTestTypeLabel($request->test_type),
                    'test_name' => $request->test_name ?? '',
                    'test_description' => $request->test_description ?? '',
                    'clinical_indication' => $request->clinical_indication ?? '',
                    'special_notes' => $request->special_notes ?? '',

                    'request_date' => $request->request_date,
                    'sample_collection_date' => $request->sample_collection_date,
                    'result_date' => $request->result_date,

                    'status' => $request->status,
                    'status_label' => $this->getStatusLabel($request->status),

                    'barcode' => $request->barcode,

                    'fee_id' => $request->fee_id,
                    'has_fee' => $hasFee,

                    'fee' => $hasFee ? [
                        'id' => $fee->id,
                        'amount' => (float) $fee->amount,
                        'paid_amount' => (float) $fee->paid_amount,
                        'discount' => (float) $fee->discount,
                        'remaining_amount' => (float) $fee->remaining_amount,
                        'payment_status' => $fee->payment_status,
                        'payment_method' => $fee->payment_method,
                        'barcode' => $fee->barcode,
                        'description' => $fee->description,
                        'note' => $fee->note,
                        'created_at' => $fee->created_at,
                    ] : null,

                    'amount' => $hasFee ? (float) $fee->amount : 0,
                    'paid_amount' => $hasFee ? (float) $fee->paid_amount : 0,
                    'discount_percent' => $hasFee ? (float) $fee->discount : 0,
                    'remaining_amount' => $hasFee ? (float) $fee->remaining_amount : 0,
                    'payment_status' => $hasFee ? $fee->payment_status : null,
                    'payment_method' => $hasFee ? $fee->payment_method : null,

                    'created_at' => $request->created_at,
                    'updated_at' => $request->updated_at,
                ];
            });

            $unpaidRequests = $formattedRequests->filter(function ($request) {
                return !$request['has_fee'];
            })->values();

            $paidRequests = $formattedRequests->filter(function ($request) {
                return $request['has_fee'];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $formattedRequests->toArray(),
                    'unpaid_requests' => $unpaidRequests->toArray(),
                    'paid_requests' => $paidRequests->toArray(),
                    'total_requests' => $formattedRequests->count(),
                    'total_unpaid' => $unpaidRequests->count(),
                    'total_paid' => $paidRequests->count(),
                ],
                'message' => "درخواست‌های لابراتوار مراجعه {$regId} با موفقیت دریافت شد",
            ], 200);

        } catch (\Throwable $e) {
            Log::error('خطا در دریافت درخواست‌های لابراتوار بر اساس reg_id', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'reg_id' => $regId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌های لابراتوار',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت برچسب وضعیت
     * ============================================================
     */
    private function getStatusLabel($status)
    {
        $labels = [
            'pending' => 'در انتظار',
            'sample_collected' => 'نمونه گرفته شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'rejected' => 'رد شده',
            'cancelled' => 'لغو شده',
        ];
        return $labels[$status] ?? $status;
    }

    /**
     * ============================================================
     * دریافت برچسب نوع تست
     * ============================================================
     */
    private function getTestTypeLabel($type)
    {
        $labels = [
            'blood' => 'خون',
            'urine' => 'ادرار',
            'stool' => 'مدفوع',
            'biochemistry' => 'بیوشیمی',
            'hormonal' => 'هورمونی',
            'microbial' => 'میکروبی',
            'pathology' => 'پاتولوژی',
            'genetic' => 'ژنتیک',
            'imaging' => 'تصویربرداری',
            'other' => 'سایر'
        ];
        
        return $labels[$type] ?? $type;
    }

    /**
     * ============================================================
     * ثبت فیس جدید
     * ============================================================
     */
    public function store(Request $request, $regId)
    {
        // دریافت رجیستریشن با reg_id
        $registration = Registrations::where('reg_id', $regId)->first();

        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'amount' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'in:cash,card,online,insurance'],
            'discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'laboratory_request_ids' => ['nullable', 'array'],
            'laboratory_request_ids.*' => ['integer', 'exists:laboratory_requests,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $amount = (float) $request->amount;
        $paidAmount = (float) ($request->paid_amount ?? 0);
        $discount = (float) ($request->discount ?? 0);

        $discountAmount = $amount * ($discount / 100);
        $netAmount = $amount - $discountAmount;

        if ($paidAmount > $netAmount) {
            return response()->json([
                'success' => false,
                'message' => 'مبلغ پرداختی نمی‌تواند بیشتر از مبلغ قابل پرداخت باشد'
            ], 422);
        }

        $remainingAmount = $netAmount - $paidAmount;

        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidAmount > 0) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'pending';
        }

        $barcode = $request->barcode ?: $this->generateBarcode();

        DB::beginTransaction();

        try {
            // ایجاد فیس با reg_id
            $fee = LaboratoryFee::create([
                'reg_id' => $registration->reg_id,
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

            // اتصال درخواست‌های لابراتوار به فیس
            $laboratoryRequestIds = $request->laboratory_request_ids ?? [];
            $updatedRequests = collect();

            if (!empty($laboratoryRequestIds)) {
                LaboratoryRequest::whereIn('id', $laboratoryRequestIds)
                    ->where('reg_id', $registration->reg_id)
                    ->update(['fee_id' => $fee->id]);

                $updatedRequests = LaboratoryRequest::whereIn('id', $laboratoryRequestIds)
                    ->where('reg_id', $registration->reg_id)
                    ->get();

                if ($updatedRequests->isNotEmpty()) {
                    $fee->update(['laboratory_request_id' => $updatedRequests->first()->id]);
                }
            }

            // تولید QR با try-catch
            try {
                $this->generateQRCode($fee);
            } catch (\Throwable $e) {
                Log::error('خطا در تولید QR Code', [
                    'fee_id' => $fee->id,
                    'message' => $e->getMessage()
                ]);
            }

            // همگام‌سازی با Journal با try-catch
            try {
                $this->syncJournal($fee);
            } catch (\Throwable $e) {
                Log::error('خطا در همگام‌سازی ژورنال', [
                    'fee_id' => $fee->id,
                    'reg_id' => $fee->reg_id,
                    'message' => $e->getMessage()
                ]);
            }

            DB::commit();

            $fee->load(['patient', 'registration', 'laboratoryRequest', 'qrCode']);

            return response()->json([
                'success' => true,
                'data' => $fee,
                'message' => 'فیس لابراتوار با موفقیت ثبت شد'
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('خطا در ثبت فیس لابراتوار', [
                'message' => $e->getMessage(),
                'reg_id' => $regId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * نمایش یک فیس
     * ============================================================
     */
    public function show($id)
    {
        try {
            $fee = LaboratoryFee::with([
                'patient',
                'registration',
                'laboratoryRequest',
                'qrCode',
                'laboratoryRequests'
            ])->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $fee,
                'message' => 'فیس با موفقیت دریافت شد'
            ]);
        } catch (\Throwable $e) {
            Log::error('خطا در نمایش فیس', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در نمایش فیس'
            ], 500);
        }
    }

    /**
     * ============================================================
     * ویرایش فیس
     * ============================================================
     */
    public function update(Request $request, $id)
    {
        try {
            $fee = LaboratoryFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'amount' => ['nullable', 'numeric', 'min:0'],
                'paid_amount' => ['nullable', 'numeric', 'min:0'],
                'payment_method' => ['nullable', 'in:cash,card,online,insurance'],
                'discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'description' => ['nullable', 'string'],
                'note' => ['nullable', 'string'],
                'payment_status' => ['nullable', 'in:pending,partial,paid'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            try {
                // به‌روزرسانی فیلدها
                if ($request->has('amount')) {
                    $fee->amount = (float) $request->amount;
                }

                if ($request->has('paid_amount')) {
                    $fee->paid_amount = (float) $request->paid_amount;
                }

                if ($request->has('discount')) {
                    $fee->discount = (float) $request->discount;
                }

                if ($request->has('payment_method')) {
                    $fee->payment_method = $request->payment_method;
                }

                if ($request->has('description')) {
                    $fee->description = $request->description;
                }

                if ($request->has('note')) {
                    $fee->note = $request->note;
                }

                // محاسبه مجدد مقادیر
                $amount = (float) $fee->amount;
                $discount = (float) $fee->discount;
                $discountAmount = $amount * ($discount / 100);
                $netAmount = $amount - $discountAmount;
                $paidAmount = (float) $fee->paid_amount;

                if ($paidAmount > $netAmount) {
                    return response()->json([
                        'success' => false,
                        'message' => 'مبلغ پرداختی نمی‌تواند بیشتر از مبلغ قابل پرداخت باشد'
                    ], 422);
                }

                $fee->remaining_amount = $netAmount - $paidAmount;

                // به‌روزرسانی وضعیت پرداخت
                if ($fee->remaining_amount <= 0) {
                    $fee->payment_status = 'paid';
                } elseif ($fee->paid_amount > 0) {
                    $fee->payment_status = 'partial';
                } else {
                    $fee->payment_status = 'pending';
                }

                if ($request->has('payment_status')) {
                    $fee->payment_status = $request->payment_status;
                }

                $fee->save();

                try {
                    $this->syncJournal($fee);
                } catch (\Throwable $e) {
                    Log::error('خطا در همگام‌سازی ژورنال', [
                        'fee_id' => $fee->id,
                        'message' => $e->getMessage()
                    ]);
                }

                DB::commit();

                $fee->load(['patient', 'registration', 'laboratoryRequest', 'qrCode']);

                return response()->json([
                    'success' => true,
                    'data' => $fee,
                    'message' => 'فیس با موفقیت ویرایش شد'
                ]);

            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Throwable $e) {
            Log::error('خطا در ویرایش فیس', [
                'id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ویرایش فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * حذف فیس
     * ============================================================
     */
    public function destroy($id)
    {
        try {
            $fee = LaboratoryFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس یافت نشد'
                ], 404);
            }

            DB::beginTransaction();

            try {
                LaboratoryRequest::where('fee_id', $fee->id)
                    ->update(['fee_id' => null]);

                if ($fee->qrCode) {
                    $fee->qrCode->delete();
                }

                Journal::where('ref_type', 'laboratory_fee')
                    ->where('ref_id', $fee->id)
                    ->delete();

                $fee->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'فیس با موفقیت حذف شد'
                ]);

            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Throwable $e) {
            Log::error('خطا در حذف فیس', [
                'id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * تولید QR Code
     * ============================================================
     */
    private function generateQRCode($fee)
    {
        try {
            $patient = $fee->patient;
            $registration = $fee->registration;

            $labRequests = LaboratoryRequest::where('fee_id', $fee->id)
                ->orderBy('created_at')
                ->get();

            $firstRequest = $labRequests->first();

            $qrData = [
                'fee_id' => $fee->id,
                'patient_name' => $patient ? trim($patient->first_name . ' ' . $patient->last_name) : 'نامشخص',
                'patient_id' => $patient ? $patient->id : null,
                'patient_mobile' => $patient ? $patient->mobile : null,
                'reg_id' => $registration ? $registration->reg_id : $fee->reg_id,
                'visit_number' => $registration ? $registration->visit_number : null,
                'barcode' => $fee->barcode,
                'amount' => (float) $fee->amount,
                'discount' => (float) $fee->discount,
                'net_amount' => (float) ($fee->amount - ($fee->amount * $fee->discount / 100)),
                'paid_amount' => (float) $fee->paid_amount,
                'remaining' => (float) $fee->remaining_amount,
                'payment_status' => $fee->payment_status,
                'payment_method' => $fee->payment_method,
                'created_at' => $fee->created_at ? $fee->created_at->toISOString() : null,
                'tests' => $labRequests->map(function ($req) {
                    return [
                        'id' => $req->id,
                        'test_type' => $req->test_type,
                        'test_type_label' => $this->getTestTypeLabel($req->test_type),
                        'test_name' => $req->test_name,
                        'test_description' => $req->test_description,
                        'clinical_indication' => $req->clinical_indication,
                        'status' => $req->status,
                        'barcode' => $req->barcode,
                    ];
                })->values()->toArray(),
                'total_tests' => $labRequests->count(),
            ];

            $qrJson = json_encode($qrData, JSON_UNESCAPED_UNICODE);

            $directory = storage_path('app/public/qrcodes');
            if (!is_dir($directory)) {
                mkdir($directory, 0777, true);
            }

            $fileName = 'qr_' . $fee->barcode . '_' . time() . '_' . Str::random(5) . '.png';
            $path = $directory . DIRECTORY_SEPARATOR . $fileName;

            QrCode::format('png')
                ->size(300)
                ->errorCorrection('H')
                ->generate($qrJson, $path);

            $qrCode = QRCode::updateOrCreate(
                ['laboratory_fee_id' => $fee->id],
                [
                    'laboratory_request_id' => $firstRequest ? $firstRequest->id : null,
                    'patient_id' => $patient ? $patient->id : null,
                    'reg_id' => $registration ? $registration->reg_id : $fee->reg_id,
                    'qr_code_path' => 'storage/qrcodes/' . $fileName,
                    'qr_code_data' => $qrJson,
                    'qr_code_type' => 'laboratory_fee',
                    'is_active' => true,
                ]
            );

            return $qrCode;

        } catch (\Throwable $e) {
            Log::error('خطا در تولید QR Code', [
                'fee_id' => $fee->id,
                'message' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * همگام‌سازی با Journal
     * ============================================================
     */
    private function syncJournal($fee)
    {
        try {
            Journal::where('ref_type', 'laboratory_fee')
                ->where('ref_id', $fee->id)
                ->delete();

            $patient = $fee->patient;
            $patientName = $patient ? trim($patient->first_name . ' ' . $patient->last_name) : 'نامشخص';
            $patientTazkira = $patient ? $patient->national_id : null;

            $requests = LaboratoryRequest::where('fee_id', $fee->id)->get();
            $testTypes = $requests->pluck('test_type')->filter()->unique()->implode('، ');
            $testNames = $requests->pluck('test_name')->filter()->unique()->implode('، ');

            $description = 'فیس لابراتوار - ' . $patientName;
            if ($testNames) {
                $description .= ' - تست‌ها: ' . $testNames;
            } elseif ($testTypes) {
                $description .= ' - نوع تست: ' . $testTypes;
            }
            $description .= ' - بارکد: ' . $fee->barcode;

            $totalAmount = (float) $fee->amount;
            $discountAmount = $totalAmount * ((float) $fee->discount / 100);
            $netAmount = $totalAmount - $discountAmount;

            Journal::create([
                'journal_date' => Carbon::now()->format('Y-m-d'),
                'description' => $description,
                'entry_type' => 'credit',
                'amount' => $netAmount,
                'tazkira_number' => $patientTazkira,
                'ref_type' => 'laboratory_fee',
                'ref_id' => $fee->id,
                'user_id' => auth()->user()?->id,
                'patient_id' => $fee->patient_id,
                'reg_id' => $fee->reg_id,
                'doc_id' => null,
                'cust_id' => null,
                'supplier_id' => null,
                'med_id' => null,
                'pres_id' => null,
                'parchase_id' => null,
                'pres_num' => null,
            ]);

        } catch (\Throwable $e) {
            Log::error('خطا در همگام‌سازی ژورنال', [
                'fee_id' => $fee->id,
                'reg_id' => $fee->reg_id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * ============================================================
     * تولید Barcode یکتا
     * ============================================================
     */
    private function generateBarcode()
    {
        do {
            $barcode = 'FEE' . Carbon::now()->format('Ymd') . strtoupper(Str::random(6));
        } while (LaboratoryFee::where('barcode', $barcode)->exists());

        return $barcode;
    }
}