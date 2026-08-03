<?php

namespace App\Http\Controllers;

use App\Models\LaboratoryFee;
use App\Models\Journal;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;
use Illuminate\Support\Facades\Log;

class LaboratoryFeeController extends Controller
{
    /**
     * ثبت فیس لابراتوار
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'registration_id' => 'required|exists:registrations,reg_id',
            'patient_id' => 'required|exists:patients,id',
            'amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'nullable|string|in:cash,card,online,insurance',
            'test_items' => 'nullable|array',
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

            $amount = $request->amount;
            $discount = $request->discount ?? 0;
            $paidAmount = $request->paid_amount ?? 0;
            $remainingAmount = $amount - $discount - $paidAmount;

            // ایجاد فیس لابراتوار
            $fee = LaboratoryFee::create([
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discount,
                'remaining_amount' => $remainingAmount,
                'payment_status' => $remainingAmount <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending'),
                'payment_method' => $request->payment_method,
                'payment_date' => $paidAmount > 0 ? now() : null,
                'test_items' => $request->test_items,
                'description' => $request->description,
                'note' => $request->note,
                'created_by' => Auth::id(),
            ]);

            // ثبت در ژورنال
            if ($paidAmount > 0) {
                $journal = Journal::create([
                    'journal_date' => now(),
                    'description' => "فیس لابراتوار - مراجعه #{$request->registration_id} - مریض ID: {$request->patient_id}",
                    'entry_type' => 'debit',
                    'amount' => $paidAmount,
                    'ref_type' => 'laboratory_fee',
                    'ref_id' => $fee->id,
                    'user_id' => Auth::id(),
                ]);

                try {
                    LogService::create(
                        'create',
                        'journals',
                        $journal->id,
                        'Laboratory fee journal created',
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
                    'laboratory_fees',
                    $fee->id,
                    'Laboratory fee created',
                    $fee->toArray()
                );
            } catch(\Exception $e){
                Log::error("Laboratory fee log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس لابراتوار با موفقیت ثبت شد',
                'data' => $fee->load(['patient', 'registration'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Laboratory fee store error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی فیس لابراتوار
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

            $fee = LaboratoryFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس لابراتوار یافت نشد'
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
            $fee->remaining_amount = $fee->amount - $fee->discount - $fee->paid_amount;
            $fee->save();

            // به‌روزرسانی ژورنال
            $journal = Journal::where('ref_type', 'laboratory_fee')
                ->where('ref_id', $fee->id)
                ->first();

            if ($journal) {
                // اگر مبلغ تغییر کرده، ژورنال را به‌روز کن
                if ($fee->paid_amount != $oldPaidAmount) {
                    $journal->update([
                        'amount' => $fee->paid_amount,
                        'description' => "فیس لابراتوار - مراجعه #{$fee->registration_id} (به‌روزرسانی)"
                    ]);
                }
            } elseif ($fee->paid_amount > 0) {
                // اگر ژورنال وجود ندارد ولی مبلغ پرداخت شده است
                $journal = Journal::create([
                    'journal_date' => now(),
                    'description' => "فیس لابراتوار - مراجعه #{$fee->registration_id}",
                    'entry_type' => 'debit',
                    'amount' => $fee->paid_amount,
                    'ref_type' => 'laboratory_fee',
                    'ref_id' => $fee->id,
                    'user_id' => Auth::id(),
                ]);
            }

            // اگر مبلغ پرداخت شده صفر شده، ژورنال را حذف کن
            if ($fee->paid_amount == 0 && $journal) {
                $journal->delete();
            }

            DB::commit();

            // ثبت لاگ
            try {
                LogService::create(
                    'update',
                    'laboratory_fees',
                    $fee->id,
                    'Laboratory fee updated',
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
                Log::error("Laboratory fee update log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس لابراتوار با موفقیت بروزرسانی شد',
                'data' => $fee->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Laboratory fee update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی فیس لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس لابراتوار
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $fee = LaboratoryFee::find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس لابراتوار یافت نشد'
                ], 404);
            }

            // حذف ژورنال مرتبط
            Journal::where('ref_type', 'laboratory_fee')
                ->where('ref_id', $fee->id)
                ->delete();

            $feeData = $fee->toArray();
            $fee->delete();

            DB::commit();

            // ثبت لاگ
            try {
                LogService::create(
                    'delete',
                    'laboratory_fees',
                    $id,
                    'Laboratory fee deleted',
                    $feeData
                );
            } catch(\Exception $e){
                Log::error("Laboratory fee delete log failed: ".$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'فیس لابراتوار با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Laboratory fee delete error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست فیس‌های لابراتوار
     */
    public function index(Request $request)
    {
        try {
            $query = LaboratoryFee::with(['patient', 'registration']);

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
            Log::error('Laboratory fee index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست فیس‌های لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار فیس‌های لابراتوار
     */
    public function statistics()
    {
        try {
            $stats = [
                'total' => LaboratoryFee::count(),
                'pending' => LaboratoryFee::where('payment_status', 'pending')->count(),
                'partial' => LaboratoryFee::where('payment_status', 'partial')->count(),
                'paid' => LaboratoryFee::where('payment_status', 'paid')->count(),
                'total_amount' => LaboratoryFee::sum('amount'),
                'total_paid' => LaboratoryFee::sum('paid_amount'),
                'total_remaining' => LaboratoryFee::sum('remaining_amount'),
                'today' => LaboratoryFee::whereDate('created_at', today())->count(),
                'today_amount' => LaboratoryFee::whereDate('created_at', today())->sum('amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Laboratory fee statistics error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار فیس‌های لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }
}