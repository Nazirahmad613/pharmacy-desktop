<?php

namespace App\Http\Controllers;

use App\Models\AdmissionFee;
use App\Models\AdmissionRequest;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdmissionFeeController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmissionFee::with(['patient', 'admissionRequest', 'collector']);

        // فیلتر بر اساس بیمار
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        // فیلتر بر اساس درخواست بستری
        if ($request->has('admission_request_id')) {
            $query->where('admission_request_id', $request->admission_request_id);
        }

        // فیلتر بر اساس وضعیت
        if ($request->has('status')) {
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

        $fees = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $fees
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'admission_request_id' => 'required|exists:admission_requests,id',
            'patient_id' => 'required|exists:patients,id',
            'amount' => 'required|numeric|min:0.01',
            'fee_type' => 'required|in:daily,weekly,monthly,custom',
            'description' => 'nullable|string|max:500',
            'payment_method' => 'required|in:cash,card,bank_transfer,insurance',
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
            $admission = AdmissionRequest::find($request->admission_request_id);
            if ($admission->status !== 'admitted') {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار بستری نمی‌باشد'
                ], 400);
            }

            // ایجاد شماره رسید
            $receiptNumber = 'FEE-' . date('Ymd') . '-' . str_pad(AdmissionFee::count() + 1, 6, '0', STR_PAD_LEFT);

            // ایجاد فیس بستری
            $fee = AdmissionFee::create([
                'admission_request_id' => $request->admission_request_id,
                'patient_id' => $request->patient_id,
                'fee_date' => $request->fee_date,
                'fee_time' => $request->fee_time,
                'amount' => $request->amount,
                'fee_type' => $request->fee_type,
                'description' => $request->description,
                'receipt_number' => $receiptNumber,
                'payment_method' => $request->payment_method,
                'status' => 'pending',
                'collected_by' => auth()->id(),
                'collected_at' => null
            ]);

            DB::commit();

            $fee->load(['patient', 'admissionRequest', 'collector']);

            return response()->json([
                'success' => true,
                'message' => 'درخواست فیس بستری با موفقیت ایجاد شد',
                'data' => $fee
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $fee = AdmissionFee::with(['patient', 'admissionRequest', 'collector'])
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
    }

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
            'fee_type' => 'sometimes|in:daily,weekly,monthly,custom',
            'description' => 'nullable|string|max:500',
            'payment_method' => 'sometimes|in:cash,card,bank_transfer,insurance',
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

            $fee->update($request->only([
                'amount', 'fee_type', 'description', 'payment_method', 'fee_date', 'fee_time'
            ]));

            DB::commit();

            $fee->load(['patient', 'admissionRequest', 'collector']);

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت به‌روزرسانی شد',
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

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

        if ($fee->admissionRequest->status !== 'admitted') {
            return response()->json([
                'success' => false,
                'message' => 'بیمار بستری نمی‌باشد'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $fee->update([
                'status' => 'paid',
                'collected_at' => now()
            ]);

            // به‌روزرسانی مبلغ پرداخت شده در درخواست بستری
            $admission = $fee->admissionRequest;
            $admission->increment('paid_amount', $fee->amount);

            // اگر کل مبلغ پرداخت شده باشد، وضعیت پرداخت را به‌روزرسانی کن
            if ($admission->paid_amount >= $admission->total_amount) {
                $admission->update(['payment_status' => 'paid']);
            } elseif ($admission->paid_amount > 0) {
                $admission->update(['payment_status' => 'partial']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت دریافت شد',
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

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
                $admission->decrement('paid_amount', $fee->amount);
                
                if ($admission->paid_amount == 0) {
                    $admission->update(['payment_status' => 'pending']);
                } elseif ($admission->paid_amount > 0) {
                    $admission->update(['payment_status' => 'partial']);
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
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // دریافت فیس‌های بیمار برای یک مراجعه خاص
    public function getPatientFees($patientId, Request $request)
    {
        $patient = Patient::find($patientId);
        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'بیمار یافت نشد'
            ], 404);
        }

        $query = AdmissionFee::with(['admissionRequest', 'collector'])
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
    }

    // دریافت فیس‌های برای یک درخواست بستری خاص
    public function getAdmissionFees($admissionId)
    {
        $admission = AdmissionRequest::find($admissionId);
        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        $fees = AdmissionFee::with(['collector'])
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
    }

    // دریافت فیس‌های نیازمند هشدار (بیشتر از 24 ساعت)
    public function getPendingFeesForAlert()
    {
        $pendingFees = AdmissionFee::with(['patient', 'admissionRequest', 'collector'])
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subHours(24))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $pendingFees,
            'count' => $pendingFees->count()
        ]);
    }

    // پرینت رسید
    public function printReceipt($id)
    {
        $fee = AdmissionFee::with(['patient', 'admissionRequest', 'collector'])
            ->find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        // داده‌های مورد نیاز برای پرینت
        $receiptData = [
            'fee' => $fee,
            'patient' => $fee->patient,
            'admission' => $fee->admissionRequest,
            'collector' => $fee->collector,
            'hospital_name' => config('app.name'),
            'hospital_address' => config('app.address'),
            'hospital_phone' => config('app.phone')
        ];

        return response()->json([
            'success' => true,
            'data' => $receiptData
        ]);
    }

    // دریافت آمار فیس‌ها
    public function getFeeStatistics(Request $request)
    {
        $query = AdmissionFee::query();

        // فیلتر بر اساس تاریخ
        if ($request->has('from_date')) {
            $query->whereDate('fee_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('fee_date', '<=', $request->to_date);
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
                'insurance' => (clone $query)->where('payment_method', 'insurance')->count()
            ],
            'by_fee_type' => [
                'daily' => (clone $query)->where('fee_type', 'daily')->count(),
                'weekly' => (clone $query)->where('fee_type', 'weekly')->count(),
                'monthly' => (clone $query)->where('fee_type', 'monthly')->count(),
                'custom' => (clone $query)->where('fee_type', 'custom')->count()
            ],
            'daily_average' => $query->count() > 0 ? round($query->sum('amount') / $query->count(), 2) : 0
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }
}