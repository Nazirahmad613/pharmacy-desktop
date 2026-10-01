<?php
// app/Http/Controllers/PrescriptionFeeController.php

namespace App\Http\Controllers;

use App\Models\PrescriptionFee;
use App\Models\Journal;
use App\Models\Registrations;
use App\Models\PharmacyExecution;
use App\Models\ExternalPrescription;
use App\Services\JournalSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;
use Illuminate\Support\Facades\Log;

class PrescriptionFeeController extends Controller
{
    protected JournalSyncService $journalSync;

    public function __construct(JournalSyncService $journalSync)
    {
        $this->journalSync = $journalSync;
    }

    /**
     * ============================================================
     * ثبت فیس نسخه
     * ============================================================
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

            // ثبت در ژورنال (روش قدیمی)
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
                } catch (\Exception $e) {
                    Log::error("Journal log failed: " . $e->getMessage());
                }
            }

            DB::commit();

            // ✅ ثبت در ژورنال جدید (اتوماتیک)
            $this->journalSync->syncFee([
                'reg_id'           => $request->registration_id,
                'patient_id'       => $request->patient_id,
                'source_type'      => 'prescription_fee',
                'ref_type'         => 'prescription_fee',
                'ref_id'           => $fee->id,
                'amount'           => (float) $fee->total_amount,
                'paid_amount'      => (float) $fee->paid_amount,
                'discount'         => (float) ($fee->discount ?? 0),
                'remaining_amount' => (float) $fee->remaining_amount,
                'payment_status'   => $fee->payment_status,
                'description'      => 'فیس نسخه - مراجعه #' . $request->registration_id,
            ]);

            // ثبت لاگ
            try {
                LogService::create(
                    'create',
                    'prescription_fees',
                    $fee->id,
                    'Prescription fee created',
                    $fee->toArray()
                );
            } catch (\Exception $e) {
                Log::error("Prescription fee log failed: " . $e->getMessage());
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
     * ============================================================
     * بروزرسانی فیس نسخه
     * ============================================================
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

            // ✅ تشخیص نوع فیس (داخلی / بیرونی)
            $refType = $fee->ref_type ?? 'prescription_fee';
            $refId   = $fee->ref_id   ?? $fee->id;

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

            // به‌روزرسانی ژورنال (روش قدیمی)
            $journal = Journal::where('ref_type', $refType)
                ->where('ref_id', $refId)
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
                    'ref_type' => $refType,
                    'ref_id' => $refId,
                    'user_id' => Auth::id(),
                ]);
            }

            if ($fee->paid_amount == 0 && $journal) {
                $journal->delete();
            }

            DB::commit();

            // ✅ ثبت در ژورنال جدید (اتوماتیک - حذف قبلی و ساخت جدید)
            $this->journalSync->syncFee([
                'reg_id'           => $fee->registration_id,
                'patient_id'       => $fee->patient_id,
                'source_type'      => $fee->source_type ?? 'prescription_fee',
                'ref_type'         => $refType,
                'ref_id'           => $refId,
                'fee_id'           => $fee->id,
                'amount'           => (float) $fee->total_amount,
                'paid_amount'      => (float) $fee->paid_amount,
                'discount'         => (float) ($fee->discount ?? 0),
                'remaining_amount' => (float) $fee->remaining_amount,
                'payment_status'   => $fee->payment_status,
                'description'      => 'فیس نسخه (ویرایش) - ' . $refType . ' #' . $refId,
                'patient_name'     => $fee->patient_name ?? null,
                'tazkira_number'   => $fee->tazkira_number ?? null,
            ]);

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
            } catch (\Exception $e) {
                Log::error("Prescription fee update log failed: " . $e->getMessage());
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
     * ============================================================
     * حذف فیس نسخه
     * ============================================================
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

            // ✅ تشخیص نوع فیس (داخلی / بیرونی)
            $refType = $fee->ref_type ?? 'prescription_fee';
            $refId   = $fee->ref_id   ?? $fee->id;

            // حذف ژورنال مرتبط (روش قدیمی)
            Journal::where('ref_type', $refType)
                ->where('ref_id', $refId)
                ->delete();

            $feeData = $fee->toArray();
            $feeId = $fee->id;
            $fee->delete();

            DB::commit();

            // ✅ حذف از ژورنال جدید (اتوماتیک)
            $this->journalSync->deleteFee($refType, $refId);

            // ثبت لاگ
            try {
                LogService::create(
                    'delete',
                    'prescription_fees',
                    $id,
                    'Prescription fee deleted',
                    $feeData
                );
            } catch (\Exception $e) {
                Log::error("Prescription fee delete log failed: " . $e->getMessage());
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
     * ============================================================
     * دریافت لیست فیس‌های نسخه
     * ============================================================
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
     * ============================================================
     * ⭐ نمایش جزئیات یک فیس نسخه (اضافه شده برای رفع خطا)
     * ============================================================
     */
    public function show($id)
    {
        try {
            $fee = PrescriptionFee::with(['patient', 'registration'])->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس نسخه یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            Log::error('Prescription fee show error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت جزئیات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت آمار فیس‌های نسخه
     * ============================================================
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

    /**
     * ============================================================
     * ⭐ لیست فیس‌های در انتظار پرداخت (داخلی + بیرونی)
     * ============================================================
     * 
     * ✅ اصلاح شده: استفاده از collect() پایه به جای Eloquent\Collection
     * تا از خطای "Call to a member function getKey() on array" جلوگیری شود.
     */
    public function pendingFees(Request $request)
    {
        try {
            // ⭐ 1. نسخه‌های داخلی
            $internalFees = PharmacyExecution::where('status', 'sent_to_registration')
                ->with('items')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($ex) {
                    return [
                        'id'             => $ex->id,
                        'source'         => 'internal',
                        'source_label'   => 'نسخه داخلی',
                        'pres_id'        => $ex->pres_id,
                        'reg_id'         => $ex->reg_id,
                        'patient_id'     => $ex->patient_id,
                        'patient_name'   => $ex->patient_name,
                        'patient_age'    => $ex->patient_age,
                        'patient_gender' => $ex->patient_gender,
                        'patient_phone'  => $ex->patient_phone,
                        'tazkira_number' => $ex->tazkira_number,
                        'doctor_name'    => $ex->doctor_name,
                        'total_amount'   => (float) $ex->total_amount,
                        'discount'       => (float) ($ex->discount ?? 0),
                        'paid_amount'    => (float) ($ex->paid_amount ?? 0),
                        'status'         => $ex->status,
                        'receipt_number' => $ex->receipt_number ?? ('INT-' . $ex->id),
                        'items'          => $ex->items,
                        'created_at'     => $ex->created_at,
                    ];
                });

            // ⭐ 2. نسخه‌های بیرونی
            $externalFees = ExternalPrescription::where('status', 'sent_to_registration')
                ->with('items')
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($ex) {
                    return [
                        'id'             => $ex->id,
                        'source'         => 'external',
                        'source_label'   => 'نسخه بیرونی',
                        'pres_id'        => null,
                        'reg_id'         => null,
                        'patient_id'     => null,
                        'patient_name'   => $ex->patient_name,
                        'patient_age'    => $ex->patient_age,
                        'patient_gender' => $ex->patient_gender,
                        'patient_phone'  => $ex->patient_phone,
                        'tazkira_number' => $ex->tazkira_number,
                        'doctor_name'    => $ex->doctor_name,
                        'total_amount'   => (float) $ex->total_amount,
                        'discount'       => (float) ($ex->discount ?? 0),
                        'paid_amount'    => 0,
                        'status'         => $ex->status,
                        'receipt_number' => $ex->receipt_number ?? ('EXT-' . $ex->id),
                        'items'          => $ex->items,
                        'created_at'     => $ex->created_at,
                    ];
                });

            // ✅ اصلاح: تبدیل به Collection پایه با collect() قبل از merge
            // چون map() روی Eloquent\Collection یک Eloquent\Collection از آرایه‌ها برمی‌گرداند
            // و merge() در Eloquent\Collection روی آرایه‌ها getKey() صدا می‌زند → خطا
            $all = collect($internalFees->all())
                ->concat(collect($externalFees->all()))
                ->sortByDesc('created_at')
                ->values();

            return response()->json([
                'success' => true,
                'data'    => $all,
                'counts'  => [
                    'internal' => $internalFees->count(),
                    'external' => $externalFees->count(),
                    'total'    => $all->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('pendingFees error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * ⭐ اخذ فیس (داخلی یا بیرونی)
     * ============================================================
     * 
     * @param  string  $source  internal | external
     * @param  int     $id
     */
    public function collectFee(Request $request, $source, $id)
    {
        $validator = Validator::make($request->all(), [
            'paid_amount'    => 'required|numeric|min:0',
            'discount'       => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:cash,card,online,insurance',
            'note'           => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $paidAmount = (float) $request->paid_amount;
            $discount   = (float) ($request->discount ?? 0);
            $method     = $request->payment_method ?? 'cash';

            // ==========================================
            // ⭐ نسخه داخلی
            // ==========================================
            if ($source === 'internal') {
                $execution = PharmacyExecution::find($id);

                if (!$execution) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'نسخه یافت نشد'
                    ], 404);
                }

                if ($execution->status === 'paid') {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'این نسخه قبلاً پرداخت شده است'
                    ], 422);
                }

                // بروزرسانی وضعیت
                $execution->update([
                    'status' => 'paid',
                ]);

                // ثبت در فیس نسخه (برای ژورنال و آمار)
                $fee = PrescriptionFee::create([
                    'registration_id'  => $execution->reg_id,
                    'patient_id'       => $execution->patient_id,
                    'total_amount'     => (float) $execution->total_amount,
                    'paid_amount'      => $paidAmount,
                    'discount'         => $discount,
                    'remaining_amount' => max(0, $execution->total_amount - $discount - $paidAmount),
                    'payment_status'   => ($execution->total_amount - $discount - $paidAmount) <= 0 ? 'paid' : 'partial',
                    'payment_method'   => $method,
                    'payment_date'     => now(),
                    'medication_items' => $execution->items,
                    'description'      => 'فیس نسخه داخلی #' . $execution->pres_id,
                    'note'             => $request->note,
                    'created_by'       => Auth::id(),
                    'ref_type'         => 'prescription_fee',
                    'ref_id'           => $execution->id,
                    'source_type'      => 'internal',
                ]);

                DB::commit();

                // ✅ ژورنال جدید
                $this->journalSync->syncFee([
                    'reg_id'           => $execution->reg_id,
                    'patient_id'       => $execution->patient_id,
                    'source_type'      => 'internal',
                    'ref_type'         => 'prescription_fee',
                    'ref_id'           => $execution->id,
                    'fee_id'           => $fee->id,
                    'amount'           => (float) $execution->total_amount,
                    'paid_amount'      => $paidAmount,
                    'discount'         => $discount,
                    'remaining_amount' => (float) $fee->remaining_amount,
                    'payment_status'   => $fee->payment_status,
                    'description'      => 'فیس نسخه داخلی #' . $execution->pres_id,
                    'patient_name'     => $execution->patient_name ?? null,
                    'tazkira_number'   => $execution->tazkira_number ?? null,
                ]);

                // لاگ
                try {
                    LogService::create(
                        'create',
                        'prescription_fees',
                        $fee->id,
                        'Internal prescription fee collected',
                        $fee->toArray()
                    );
                } catch (\Exception $e) {
                    Log::error("Internal fee log failed: " . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'فیس نسخه داخلی با موفقیت اخذ شد',
                    'data'    => $execution->fresh(),
                ]);
            }

            // ==========================================
            // ⭐ نسخه بیرونی
            // ==========================================
            if ($source === 'external') {
                $external = ExternalPrescription::find($id);

                if (!$external) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'نسخه بیرونی یافت نشد'
                    ], 404);
                }

                if ($external->status === 'paid') {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'این نسخه قبلاً پرداخت شده است'
                    ], 422);
                }

                if ($external->status === 'cancelled') {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'این نسخه لغو شده است'
                    ], 422);
                }

                // ✅ اگر قبلاً فیس برای این نسخه ثبت شده، همان را بروزرسانی کن
                $fee = PrescriptionFee::where('ref_type', 'external_prescription')
                    ->where('ref_id', $external->id)
                    ->first();

                $feeData = [
                    'registration_id'  => null,           // نسخه بیرونی reg_id ندارد
                    'patient_id'       => null,           // بیمار ثبت‌نام‌شده نیست
                    'total_amount'     => (float) $external->total_amount,
                    'paid_amount'      => $paidAmount,
                    'discount'         => $discount,
                    'remaining_amount' => max(0, $external->total_amount - $discount - $paidAmount),
                    'payment_status'   => ($external->total_amount - $discount - $paidAmount) <= 0 ? 'paid' : 'partial',
                    'payment_method'   => $method,
                    'payment_date'     => now(),
                    'medication_items' => $external->items,
                    'description'      => 'فیس نسخه بیرونی - ' . ($external->receipt_number ?? $external->id),
                    'note'             => $request->note,
                    'ref_type'         => 'external_prescription',   // ✅ نوع مرجع
                    'ref_id'           => $external->id,             // ✅ شناسه نسخه بیرونی
                    'source_type'      => 'external',                // ✅ تفکیک منبع
                ];

                // ✅ اضافه کردن فیلدهای اختیاری اگر در جدول وجود دارند
                if (\Schema::hasColumn('prescription_fees', 'patient_name')) {
                    $feeData['patient_name'] = $external->patient_name;
                }
                if (\Schema::hasColumn('prescription_fees', 'patient_phone')) {
                    $feeData['patient_phone'] = $external->patient_phone;
                }
                if (\Schema::hasColumn('prescription_fees', 'tazkira_number')) {
                    $feeData['tazkira_number'] = $external->tazkira_number;
                }
                if (\Schema::hasColumn('prescription_fees', 'doctor_name')) {
                    $feeData['doctor_name'] = $external->doctor_name;
                }

                if ($fee) {
                    $feeData['updated_by'] = Auth::id();
                    $fee->update($feeData);
                } else {
                    $feeData['created_by'] = Auth::id();
                    $fee = PrescriptionFee::create($feeData);
                }

                // بروزرسانی وضعیت نسخه بیرونی
                $external->update([
                    'status'  => 'paid',
                    'paid_by' => Auth::id(),
                    'paid_at' => now(),
                ]);

                DB::commit();

                // ✅ ثبت در ژورنال جدید با ref_type = 'external_prescription'
                $this->journalSync->syncFee([
                    'reg_id'           => null,
                    'patient_id'       => null,
                    'source_type'      => 'external',
                    'ref_type'         => 'external_prescription',
                    'ref_id'           => $external->id,
                    'fee_id'           => $fee->id,
                    'amount'           => (float) $external->total_amount,
                    'paid_amount'      => $paidAmount,
                    'discount'         => $discount,
                    'remaining_amount' => (float) $fee->remaining_amount,
                    'payment_status'   => $fee->payment_status,
                    'description'      => 'فیس نسخه بیرونی - ' . ($external->receipt_number ?? $external->id),
                    'patient_name'     => $external->patient_name ?? null,
                    'tazkira_number'   => $external->tazkira_number ?? null,
                ]);

                // لاگ
                try {
                    LogService::create(
                        'create',
                        'prescription_fees',
                        $fee->id,
                        'External prescription fee collected',
                        $fee->toArray()
                    );
                } catch (\Exception $e) {
                    Log::error("External fee log failed: " . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'فیس نسخه بیرونی با موفقیت اخذ شد',
                    'data'    => $external->fresh(),
                ]);
            }

            // منبع نامعتبر
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'نوع منبع نامعتبر است (باید internal یا external باشد)'
            ], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('collectFee error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در اخذ فیس: ' . $e->getMessage()
            ], 500);
        }
    }
}