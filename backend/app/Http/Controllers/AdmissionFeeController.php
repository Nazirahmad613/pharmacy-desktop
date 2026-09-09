<?php

namespace App\Http\Controllers;

use App\Models\AdmissionFee;
use App\Models\AdmissionRequest;
use App\Models\Patient;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdmissionFeeController extends Controller
{
    /**
     * دریافت لیست فیس‌های بستری
     */
    public function index(Request $request)
    {
        try {
            $query = AdmissionFee::with(['patient', 'admissionRequest', 'collector', 'doctor', 'registration']);

            // فیلتر بر اساس بیمار
            if ($request->has('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            // فیلتر بر اساس درخواست بستری
            if ($request->has('admission_request_id')) {
                $query->where('admission_request_id', $request->admission_request_id);
            }

            // فیلتر بر اساس reg_id
            if ($request->has('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }

            // فیلتر بر اساس وضعیت
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // فیلتر بر اساس تاریخ
            if ($request->has('from_date')) {
                $query->whereDate('fee_date', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('fee_date', '<=', $request->to_date);
            }

            // فیلتر بر اساس روش پرداخت
            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

            // فیلتر بر اساس پزشک
            if ($request->has('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            // جستجو
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('receipt_number', 'like', "%{$search}%")
                      ->orWhereHas('patient', function($p) use ($search) {
                          $p->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('mobile', 'like', "%{$search}%");
                      });
                });
            }

            $fees = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

            // محاسبه آمار
            $stats = [
                'total' => AdmissionFee::count(),
                'pending' => AdmissionFee::where('status', 'pending')->count(),
                'paid' => AdmissionFee::where('status', 'paid')->count(),
                'total_amount' => AdmissionFee::sum('amount'),
                'paid_amount' => AdmissionFee::where('status', 'paid')->sum('amount'),
                'pending_amount' => AdmissionFee::where('status', 'pending')->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'data' => $fees,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست فیس‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت فیس بستری جدید با محاسبه دقیق مبالغ
     * reg_id از طریق admission_request_id از جدول admission_requests دریافت می‌شود
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'admission_request_id' => 'required|exists:admission_requests,id',
            'patient_id' => 'required|exists:patients,id',
            'amount' => 'required|numeric|min:0.01',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'fee_type' => 'required|in:daily,weekly,monthly,custom',
            'period' => 'nullable|in:morning,evening,night,full_day',
            'day_number' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
            'payment_method' => 'required|in:cash,card,bank_transfer,insurance,online',
            'fee_date' => 'required|date',
            'fee_time' => 'required|date_format:H:i'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // بررسی وضعیت بستری
            $admission = AdmissionRequest::with(['registration'])
                ->find($request->admission_request_id);
                
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            if ($admission->status !== 'admitted') {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار بستری نمی‌باشد'
                ], 400);
            }

            // دریافت reg_id از جدول admission_requests
            $regId = $admission->reg_id;
            
            if (!$regId) {
                return response()->json([
                    'success' => false,
                    'message' => 'شناسه مراجعه (reg_id) برای این درخواست بستری یافت نشد'
                ], 400);
            }

            // دریافت doctor_id از admission
            $doctorId = $admission->doctor_id;

            // ============ محاسبه دقیق مبالغ ============
            $amount = (float) $request->amount;
            $paidAmount = (float) ($request->paid_amount ?? 0);
            $discountPercent = (float) ($request->discount ?? 0);

            // محاسبه مبلغ تخفیف
            $discountAmount = ($amount * $discountPercent) / 100;
            
            // محاسبه مبلغ پس از تخفیف
            $amountAfterDiscount = $amount - $discountAmount;
            
            // محاسبه مبلغ باقی‌مانده
            $remainingAmount = max(0, $amountAfterDiscount - $paidAmount);

            // تعیین وضعیت بر اساس مبلغ باقی‌مانده
            $status = 'pending';
            $collectedBy = null;
            $collectedAt = null;

            if ($remainingAmount <= 0 && $paidAmount > 0) {
                $status = 'paid';
                $collectedBy = auth()->id();
                $collectedAt = now();
            } elseif ($remainingAmount <= 0 && $paidAmount == 0) {
                // اگر مبلغ صفر باشد اما پرداختی هم صفر باشد، در انتظار بماند
                $status = 'pending';
            }

            // ایجاد شماره رسید
            $receiptNumber = 'FEE-' . date('Ymd') . '-' . str_pad(AdmissionFee::count() + 1, 6, '0', STR_PAD_LEFT);

            // ایجاد فیس بستری
            $fee = AdmissionFee::create([
                'admission_request_id' => $request->admission_request_id,
                'patient_id' => $request->patient_id,
                'reg_id' => $regId,
                'doctor_id' => $doctorId,
                'fee_date' => $request->fee_date,
                'fee_time' => $request->fee_time,
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'remaining_amount' => $remainingAmount,
                'fee_type' => $request->fee_type,
                'period' => $request->period ?? 'full_day',
                'day_number' => $request->day_number ?? 1,
                'description' => $request->description,
                'notes' => $request->notes,
                'receipt_number' => $receiptNumber,
                'payment_method' => $request->payment_method,
                'status' => $status,
                'collected_by' => $collectedBy,
                'collected_at' => $collectedAt
            ]);

            // به‌روزرسانی وضعیت فیس در admission_request
            $this->updateAdmissionFeeStatus($admission);

            DB::commit();

            // بارگذاری روابط با doctor
            $fee->load(['patient', 'admissionRequest', 'collector', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'درخواست فیس بستری با موفقیت ایجاد شد',
                'data' => $fee
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ایجاد فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک فیس بستری
     */
    public function show($id)
    {
        try {
            $fee = AdmissionFee::with(['patient', 'admissionRequest', 'collector', 'doctor', 'registration'])
                ->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس بستری یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            Log::error('Error in show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی فیس بستری با محاسبه دقیق مبالغ
     */
    public function update(Request $request, $id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'این فیس قبلاً پرداخت شده است و قابل ویرایش نمی‌باشد'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'sometimes|numeric|min:0.01',
            'paid_amount' => 'sometimes|numeric|min:0',
            'discount' => 'sometimes|numeric|min:0|max:100',
            'fee_type' => 'sometimes|in:daily,weekly,monthly,custom',
            'period' => 'nullable|in:morning,evening,night,full_day',
            'day_number' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
            'payment_method' => 'sometimes|in:cash,card,bank_transfer,insurance,online',
            'fee_date' => 'sometimes|date',
            'fee_time' => 'sometimes|date_format:H:i'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // دریافت مقادیر جدید یا استفاده از مقادیر فعلی
            $amount = (float) ($request->amount ?? $fee->amount);
            $paidAmount = (float) ($request->paid_amount ?? $fee->paid_amount);
            $discountPercent = (float) ($request->discount ?? $fee->discount_percent ?? 0);

            // محاسبه دقیق مبالغ
            $discountAmount = ($amount * $discountPercent) / 100;
            $amountAfterDiscount = $amount - $discountAmount;
            $remainingAmount = max(0, $amountAfterDiscount - $paidAmount);

            // تعیین وضعیت بر اساس مبلغ باقی‌مانده
            $status = $fee->status;
            $collectedBy = $fee->collected_by;
            $collectedAt = $fee->collected_at;

            if ($remainingAmount <= 0 && $paidAmount > 0) {
                $status = 'paid';
                $collectedBy = auth()->id();
                $collectedAt = now();
            } elseif ($remainingAmount > 0 && $fee->status === 'paid') {
                // اگر قبلاً paid بوده اما حالا باقی‌مانده دارد، وضعیت را به pending برگردان
                $status = 'pending';
                $collectedBy = null;
                $collectedAt = null;
            }

            // به‌روزرسانی فیس
            $updateData = [
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'remaining_amount' => $remainingAmount,
                'status' => $status,
                'collected_by' => $collectedBy,
                'collected_at' => $collectedAt
            ];

            // افزودن فیلدهای اختیاری
            if ($request->has('fee_type')) {
                $updateData['fee_type'] = $request->fee_type;
            }
            if ($request->has('period')) {
                $updateData['period'] = $request->period;
            }
            if ($request->has('day_number')) {
                $updateData['day_number'] = $request->day_number;
            }
            if ($request->has('description')) {
                $updateData['description'] = $request->description;
            }
            if ($request->has('notes')) {
                $updateData['notes'] = $request->notes;
            }
            if ($request->has('payment_method')) {
                $updateData['payment_method'] = $request->payment_method;
            }
            if ($request->has('fee_date')) {
                $updateData['fee_date'] = $request->fee_date;
            }
            if ($request->has('fee_time')) {
                $updateData['fee_time'] = $request->fee_time;
            }

            $fee->update($updateData);

            // به‌روزرسانی وضعیت فیس در admission_request
            if ($fee->admissionRequest) {
                $this->updateAdmissionFeeStatus($fee->admissionRequest);
            }

            DB::commit();

            $fee->load(['patient', 'admissionRequest', 'collector', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت به‌روزرسانی شد',
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در به‌روزرسانی فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت فیس (تغییر وضعیت به paid)
     */
    public function collectFee($id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'این فیس قبلاً دریافت شده است'
            ], 400);
        }

        $admission = $fee->admissionRequest;
        if (!$admission || $admission->status !== 'admitted') {
            return response()->json([
                'success' => false,
                'message' => 'بیمار بستری نمی‌باشد'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // محاسبه مبلغ باقی‌مانده
            $discountAmount = ($fee->amount * ($fee->discount_percent ?? 0)) / 100;
            $remainingAmount = max(0, $fee->amount - $fee->paid_amount - $discountAmount);

            // اگر مبلغ باقی‌مانده صفر است، فیس را پرداخت شده علامت بزن
            if ($remainingAmount <= 0) {
                $fee->update([
                    'status' => 'paid',
                    'collected_by' => auth()->id(),
                    'collected_at' => now(),
                    'remaining_amount' => 0
                ]);
            } else {
                // در غیر این صورت، مبلغ پرداخت شده را به روزرسانی کن
                $newPaidAmount = $fee->paid_amount + $remainingAmount;
                $fee->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => 0,
                    'status' => 'paid',
                    'collected_by' => auth()->id(),
                    'collected_at' => now()
                ]);
            }

            // به‌روزرسانی وضعیت فیس در admission_request
            $this->updateAdmissionFeeStatus($admission);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت دریافت شد',
                'data' => $fee->fresh(['patient', 'admissionRequest', 'collector', 'doctor'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در دریافت فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس بستری
     */
    public function destroy($id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        try {
            DB::beginTransaction();

            // اگر فیس پرداخت شده باشد، مبلغ را از کل پرداختی کم کن
            if ($fee->status === 'paid') {
                $admission = $fee->admissionRequest;
                if ($admission) {
                    $admission->decrement('paid_amount', $fee->amount);
                    
                    if ($admission->paid_amount == 0) {
                        $admission->update(['payment_status' => 'pending']);
                    } elseif ($admission->paid_amount > 0) {
                        $admission->update(['payment_status' => 'partial']);
                    }
                }
            }

            $fee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در حذف فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت فیس‌های بیمار
     */
    public function getPatientFees($patientId, Request $request)
    {
        try {
            $patient = Patient::find($patientId);
            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار یافت نشد'
                ], 404);
            }

            $query = AdmissionFee::with(['admissionRequest', 'collector', 'doctor'])
                ->where('patient_id', $patientId);

            if ($request->has('admission_request_id')) {
                $query->where('admission_request_id', $request->admission_request_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $fees = $query->orderBy('created_at', 'desc')->get();

            // محاسبه آمار
            $statistics = [
                'total_fees' => $fees->count(),
                'total_amount' => $fees->sum('amount'),
                'paid_amount' => $fees->where('status', 'paid')->sum('amount'),
                'pending_amount' => $fees->where('status', 'pending')->sum('amount'),
                'total_paid' => $fees->where('status', 'paid')->count(),
                'total_pending' => $fees->where('status', 'pending')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'patient' => $patient,
                    'fees' => $fees,
                    'statistics' => $statistics
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getPatientFees: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌های بیمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت فیس‌های یک درخواست بستری
     */
    public function getAdmissionFees($admissionId)
    {
        try {
            $admission = AdmissionRequest::find($admissionId);
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            $fees = AdmissionFee::with(['collector', 'doctor', 'patient'])
                ->where('admission_request_id', $admissionId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'admission' => $admission,
                    'fees' => $fees,
                    'total_amount' => $fees->sum('amount'),
                    'paid_amount' => $fees->where('status', 'paid')->sum('amount'),
                    'pending_amount' => $fees->where('status', 'pending')->sum('amount')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAdmissionFees: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌های بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت فیس‌های نیازمند هشدار (بیشتر از 24 ساعت)
     */
    public function getPendingFeesForAlert()
    {
        try {
            $pendingFees = AdmissionFee::with(['patient', 'admissionRequest', 'collector', 'doctor'])
                ->where('status', 'pending')
                ->where('created_at', '<=', now()->subHours(24))
                ->get();

            return response()->json([
                'success' => true,
                'data' => $pendingFees,
                'count' => $pendingFees->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getPendingFeesForAlert: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت هشدارها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * پرینت رسید
     */
    public function printReceipt($id)
    {
        try {
            $fee = AdmissionFee::with(['patient', 'admissionRequest', 'collector', 'doctor', 'registration'])
                ->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس بستری یافت نشد'
                ], 404);
            }

            // افزایش تعداد پرینت
            $fee->increment('print_count');
            $fee->update(['last_printed_at' => now()]);

            // داده‌های مورد نیاز برای پرینت
            $receiptData = [
                'fee' => $fee,
                'patient' => $fee->patient,
                'admission' => $fee->admissionRequest,
                'collector' => $fee->collector,
                'doctor' => $fee->doctor,
                'registration' => $fee->registration,
                'hospital_name' => config('app.name', 'بیمارستان'),
                'hospital_address' => config('app.address', ''),
                'hospital_phone' => config('app.phone', ''),
                'print_count' => $fee->print_count,
                'print_date' => now()->format('Y/m/d H:i')
            ];

            return response()->json([
                'success' => true,
                'data' => $receiptData
            ]);

        } catch (\Exception $e) {
            Log::error('Error in printReceipt: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در آماده‌سازی پرینت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار فیس‌ها
     */
    public function getFeeStatistics(Request $request)
    {
        try {
            $query = AdmissionFee::query();

            // فیلتر بر اساس تاریخ
            if ($request->has('from_date')) {
                $query->whereDate('fee_date', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('fee_date', '<=', $request->to_date);
            }

            // فیلتر بر اساس پزشک
            if ($request->has('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            $statistics = [
                'total_fees' => $query->count(),
                'total_amount' => $query->sum('amount'),
                'paid_amount' => (clone $query)->where('status', 'paid')->sum('amount'),
                'pending_amount' => (clone $query)->where('status', 'pending')->sum('amount'),
                'total_paid' => (clone $query)->where('status', 'paid')->count(),
                'total_pending' => (clone $query)->where('status', 'pending')->count(),
                'by_payment_method' => [
                    'cash' => (clone $query)->where('payment_method', 'cash')->count(),
                    'card' => (clone $query)->where('payment_method', 'card')->count(),
                    'bank_transfer' => (clone $query)->where('payment_method', 'bank_transfer')->count(),
                    'insurance' => (clone $query)->where('payment_method', 'insurance')->count(),
                    'online' => (clone $query)->where('payment_method', 'online')->count()
                ],
                'by_fee_type' => [
                    'daily' => (clone $query)->where('fee_type', 'daily')->count(),
                    'weekly' => (clone $query)->where('fee_type', 'weekly')->count(),
                    'monthly' => (clone $query)->where('fee_type', 'monthly')->count(),
                    'custom' => (clone $query)->where('fee_type', 'custom')->count()
                ],
                'daily_average' => $query->count() > 0 ? round($query->sum('amount') / $query->count(), 2) : 0,
                'today' => (clone $query)->whereDate('fee_date', today())->count(),
                'today_amount' => (clone $query)->whereDate('fee_date', today())->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'data' => $statistics
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getFeeStatistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت فیس برای مراجعه (با reg_id)
     */
    public function storeForRegistration(Request $request, $regId)
    {
        try {
            // پیدا کردن admission بر اساس reg_id
            $admission = AdmissionRequest::where('reg_id', $regId)
                ->where('status', 'admitted')
                ->first();

            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری فعال برای این مراجعه یافت نشد'
                ], 404);
            }

            // اضافه کردن admission_request_id به request
            $request->merge(['admission_request_id' => $admission->id]);

            // استفاده از متد store
            return $this->store($request);

        } catch (\Exception $e) {
            Log::error('Error in storeForRegistration: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی وضعیت فیس در admission_request
     */
    private function updateAdmissionFeeStatus($admission)
    {
        if (!$admission) return;

        // محاسبه مجموع فیس‌های پرداخت شده
        $totalFees = $admission->fees()->sum('amount');
        $totalPaid = $admission->fees()->where('status', 'paid')->sum('amount');
        $remaining = $totalFees - $totalPaid;

        if ($remaining <= 0 && $totalFees > 0) {
            $admission->update(['payment_status' => 'paid']);
        } elseif ($totalPaid > 0) {
            $admission->update(['payment_status' => 'partial']);
        } else {
            $admission->update(['payment_status' => 'pending']);
        }
    }
}