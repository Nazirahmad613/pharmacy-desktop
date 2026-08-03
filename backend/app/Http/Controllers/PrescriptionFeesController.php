<?php

namespace App\Http\Controllers;

use App\Models\PrescriptionFee;
use App\Models\Journal;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;
use Illuminate\Support\Facades\Log;

class PrescriptionFeeController extends Controller
{
    /**
     * ثبت فیس نسخه
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'registration_id' => 'required|exists:registrations,reg_id',
            'patient_id' => 'required|exists:patients,id',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'nullable|string|in:cash,card,online,insurance',
            'medication_items' => 'nullable|array',
            'description' => 'nullable|string',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $totalAmount = $request->total_amount;
            $discount = $request->discount ?? 0;
            $paidAmount = $request->paid_amount ?? 0;
            $remainingAmount = $totalAmount - $discount - $paidAmount;

            // ایجاد فیس نسخه
            $fee = PrescriptionFee::create([
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'discount' => $discount,
                'remaining_amount' => $remainingAmount,
                'payment_status' => $remainingAmount <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending'),
                'payment_method' => $request->payment_method,
                'payment_date' => $paidAmount > 0 ? now() : null,
                'medication_items' => $request->medication_items,
                'description' => $request->description,
                'note' => $request->note,
                'created_by' => Auth::id(),
            ]);

            // ثبت در ژورنال
            if ($paidAmount > 0) {
                $journal = Journal::create([
                    'journal_date' => now(),
                    'description' => "فیس نسخه - مراجعه #{$request->registration_id} - مریض ID: {$request->patient_id}",
                    'entry_type' => 'debit',
                    'amount' => $paidAmount,
                    'ref_type' => 'prescription_fee',
                    'ref_id' => $fee->id,
                    'user_id' => Auth::id(),
                ]);

                try {
                    LogService::create(
                        'create',
                        'journals',
                        $journal->id,
                        'Prescription fee journal created',
                        $journal->toArray()
                    );
                } catch(\Exception $e){
                    Log::error("Journal log failed: ".$e->getMessage());
                }
            }

            DB::commit();

            // ثبت لاگ
            try {
                LogService::create(
                    'create',
                    'prescription_fees',
                    $fee->id,
                    'Prescription fee created',
                    $fee->toArray()
                );
            } catch(\Exception $e){
                Log::error("Prescription fee log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس نسخه با موفقیت ثبت شد',
                'data' => $fee->load(['patient', 'registration'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription fee store error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس نسخه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی فیس نسخه
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'nullable|string|in:cash,card,online,insurance',
            'payment_status' => 'nullable|string|in:pending,partial,paid,refunded,cancelled',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $fee = PrescriptionFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس نسخه یافت نشد'
                ], 404);
            }

            $oldPaidAmount = $fee->paid_amount;
            $oldDiscount = $fee->discount;
            $oldStatus = $fee->payment_status;

            // به‌روزرسانی
            $fee->update([
                'paid_amount' => $request->paid_amount ?? $fee->paid_amount,
                'discount' => $request->discount ?? $fee->discount,
                'payment_method' => $request->payment_method ?? $fee->payment_method,
                'payment_status' => $request->payment_status ?? $fee->payment_status,
                'note' => $request->note ?? $fee->note,
                'updated_by' => Auth::id(),
            ]);

            // محاسبه مجدد باقیمانده
            $fee->remaining_amount = $fee->total_amount - $fee->discount - $fee->paid_amount;
            $fee->save();

            // به‌روزرسانی ژورنال
            $journal = Journal::where('ref_type', 'prescription_fee')
                ->where('ref_id', $fee->id)
                ->first();

            if ($journal) {
                if ($fee->paid_amount != $oldPaidAmount) {
                    $journal->update([
                        'amount' => $fee->paid_amount,
                        'description' => "فیس نسخه - مراجعه #{$fee->registration_id} (به‌روزرسانی)"
                    ]);
                }
            } elseif ($fee->paid_amount > 0) {
                $journal = Journal::create([
                    'journal_date' => now(),
                    'description' => "فیس نسخه - مراجعه #{$fee->registration_id}",
                    'entry_type' => 'debit',
                    'amount' => $fee->paid_amount,
                    'ref_type' => 'prescription_fee',
                    'ref_id' => $fee->id,
                    'user_id' => Auth::id(),
                ]);
            }

            if ($fee->paid_amount == 0 && $journal) {
                $journal->delete();
            }

            DB::commit();

            // ثبت لاگ
            try {
                LogService::create(
                    'update',
                    'prescription_fees',
                    $fee->id,
                    'Prescription fee updated',
                    [
                        'old' => [
                            'paid_amount' => $oldPaidAmount,
                            'discount' => $oldDiscount,
                            'status' => $oldStatus
                        ],
                        'new' => $fee->toArray()
                    ]
                );
            } catch(\Exception $e){
                Log::error("Prescription fee update log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس نسخه با موفقیت بروزرسانی شد',
                'data' => $fee->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription fee update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی فیس نسخه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس نسخه
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $fee = PrescriptionFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس نسخه یافت نشد'
                ], 404);
            }

            // حذف ژورنال مرتبط
            Journal::where('ref_type', 'prescription_fee')
                ->where('ref_id', $fee->id)
                ->delete();

            $feeData = $fee->toArray();
            $fee->delete();

            DB::commit();

            // ثبت لاگ
            try {
                LogService::create(
                    'delete',
                    'prescription_fees',
                    $id,
                    'Prescription fee deleted',
                    $feeData
                );
            } catch(\Exception $e){
                Log::error("Prescription fee delete log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس نسخه با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription fee delete error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس نسخه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست فیس‌های نسخه
     */
    public function index(Request $request)
    {
        try {
            $query = PrescriptionFee::with(['patient', 'registration']);

            if ($request->payment_status) {
                $query->where('payment_status', $request->payment_status);
            }

            if ($request->patient_id) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->registration_id) {
                $query->where('registration_id', $request->registration_id);
            }

            if ($request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            $fees = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

            return response()->json([
                'success' => true,
                'data' => $fees
            ]);

        } catch (\Exception $e) {
            Log::error('Prescription fee index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست فیس‌های نسخه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار فیس‌های نسخه
     */
    public function statistics()
    {
        try {
            $stats = [
                'total' => PrescriptionFee::count(),
                'pending' => PrescriptionFee::where('payment_status', 'pending')->count(),
                'partial' => PrescriptionFee::where('payment_status', 'partial')->count(),
                'paid' => PrescriptionFee::where('payment_status', 'paid')->count(),
                'total_amount' => PrescriptionFee::sum('total_amount'),
                'total_paid' => PrescriptionFee::sum('paid_amount'),
                'total_remaining' => PrescriptionFee::sum('remaining_amount'),
                'today' => PrescriptionFee::whereDate('created_at', today())->count(),
                'today_amount' => PrescriptionFee::whereDate('created_at', today())->sum('total_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Prescription fee statistics error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار فیس‌های نسخه: ' . $e->getMessage()
            ], 500);
        }
    }
}