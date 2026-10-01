<?php
// app/Http/Controllers/PrescriptionFeeController.php

namespace App\Http\Controllers;

use App\Models\PrescriptionFee;
use App\Models\Journal;
use App\Models\Registrations;
use App\Models\PharmacyExecution;
use App\Models\ExternalPrescription;
use App\Models\Patient;
use App\Models\User;
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
                    LogService::create('create', 'journals', $journal->id, 'Prescription fee journal created', $journal->toArray());
                } catch (\Exception $e) {
                    Log::error("Journal log failed: " . $e->getMessage());
                }
            }

            DB::commit();

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

            try {
                LogService::create('create', 'prescription_fees', $fee->id, 'Prescription fee created', $fee->toArray());
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
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $fee = PrescriptionFee::find($id);
            if (!$fee) {
                return response()->json(['success' => false, 'message' => 'فیس نسخه یافت نشد'], 404);
            }

            $oldPaidAmount = $fee->paid_amount;
            $oldDiscount = $fee->discount;
            $oldStatus = $fee->payment_status;

            $refType = $fee->ref_type ?? 'prescription_fee';
            $refId   = $fee->ref_id   ?? $fee->id;

            $fee->update([
                'paid_amount' => $request->paid_amount ?? $fee->paid_amount,
                'discount' => $request->discount ?? $fee->discount,
                'payment_method' => $request->payment_method ?? $fee->payment_method,
                'payment_status' => $request->payment_status ?? $fee->payment_status,
                'note' => $request->note ?? $fee->note,
                'updated_by' => Auth::id(),
            ]);

            $fee->remaining_amount = $fee->total_amount - $fee->discount - $fee->paid_amount;
            $fee->save();

            $journal = Journal::where('ref_type', $refType)->where('ref_id', $refId)->first();

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

            try {
                LogService::create('update', 'prescription_fees', $fee->id, 'Prescription fee updated', [
                    'old' => ['paid_amount' => $oldPaidAmount, 'discount' => $oldDiscount, 'status' => $oldStatus],
                    'new' => $fee->toArray()
                ]);
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
            return response()->json(['success' => false, 'message' => 'خطا در بروزرسانی فیس نسخه: ' . $e->getMessage()], 500);
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
                return response()->json(['success' => false, 'message' => 'فیس نسخه یافت نشد'], 404);
            }

            $refType = $fee->ref_type ?? 'prescription_fee';
            $refId   = $fee->ref_id   ?? $fee->id;

            Journal::where('ref_type', $refType)->where('ref_id', $refId)->delete();

            $feeData = $fee->toArray();
            $fee->delete();

            DB::commit();

            $this->journalSync->deleteFee($refType, $refId);

            try {
                LogService::create('delete', 'prescription_fees', $id, 'Prescription fee deleted', $feeData);
            } catch (\Exception $e) {
                Log::error("Prescription fee delete log failed: " . $e->getMessage());
            }

            return response()->json(['success' => true, 'message' => 'فیس نسخه با موفقیت حذف شد']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription fee delete error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در حذف فیس نسخه: ' . $e->getMessage()], 500);
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

            if ($request->payment_status) $query->where('payment_status', $request->payment_status);
            if ($request->patient_id) $query->where('patient_id', $request->patient_id);
            if ($request->registration_id) $query->where('registration_id', $request->registration_id);
            if ($request->from_date) $query->whereDate('created_at', '>=', $request->from_date);
            if ($request->to_date) $query->whereDate('created_at', '<=', $request->to_date);

            $fees = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

            return response()->json(['success' => true, 'data' => $fees]);

        } catch (\Exception $e) {
            Log::error('Prescription fee index error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در دریافت لیست فیس‌های نسخه: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * نمایش جزئیات یک فیس نسخه
     * ============================================================
     */
    public function show($id)
    {
        try {
            $fee = PrescriptionFee::with(['patient', 'registration'])->find($id);
            if (!$fee) {
                return response()->json(['success' => false, 'message' => 'فیس نسخه یافت نشد'], 404);
            }
            return response()->json(['success' => true, 'data' => $fee]);

        } catch (\Exception $e) {
            Log::error('Prescription fee show error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در دریافت جزئیات: ' . $e->getMessage()], 500);
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
            return response()->json(['success' => true, 'data' => $stats]);

        } catch (\Exception $e) {
            Log::error('Prescription fee statistics error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در دریافت آمار: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * لیست فیس‌های در انتظار پرداخت (داخلی + بیرونی)
     * ============================================================
     */
    public function pendingFees(Request $request)
    {
        try {
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
            return response()->json(['success' => false, 'message' => 'خطا در دریافت لیست: ' . $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * ⭐⭐ دریافت همه فیس‌ها (تاریخچه کامل + در انتظار)
     * ============================================================
     *
     * ✅ نام بیمار داخلی: از جدول patients (از طریق registrations.patient_id)
     * ✅ نام بیمار بیرونی: از جدول external_prescriptions
     * ✅ نام داکتر: از جدول users (از طریق registrations.doctor_id)
     */
    public function allFees(Request $request)
    {
        try {
            $all = collect();

            /* ====================================================
             * 1. رکوردهای پرداخت‌شده / partial از جدول fees
             * ==================================================== */
            $feeQuery = PrescriptionFee::query()->orderByDesc('created_at');

            if ($request->filled('source')) {
                if ($request->source === 'internal') {
                    $feeQuery->where('ref_type', 'prescription_fee');
                } elseif ($request->source === 'external') {
                    $feeQuery->where('ref_type', 'external_prescription');
                }
            }

            if ($request->filled('payment_status')) {
                $feeQuery->where('payment_status', $request->payment_status);
            }

            if ($request->filled('from_date')) {
                $feeQuery->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->filled('to_date')) {
                $feeQuery->whereDate('created_at', '<=', $request->to_date);
            }

            $fees = $feeQuery->get()->map(function ($fee) {
                $isExternal = ($fee->ref_type === 'external_prescription');

                $patientName   = null;
                $patientAge    = null;
                $patientGender = null;
                $patientPhone  = null;
                $tazkira       = $fee->tazkira_number ?? null;
                $doctorName    = $fee->doctor_name ?? null;
                $receiptNumber = null;
                $items         = $fee->medication_items ?? [];

                /* =============================================
                 * ✅ نسخه بیرونی — از ExternalPrescription
                 * ============================================= */
                if ($isExternal && $fee->ref_id) {
                    $external = ExternalPrescription::find($fee->ref_id);
                    if ($external) {
                        $patientName   = $external->patient_name;
                        $patientAge    = $external->patient_age;
                        $patientGender = $external->patient_gender;
                        $patientPhone  = $external->patient_phone;
                        $tazkira       = $tazkira ?? $external->tazkira_number;
                        $doctorName    = $doctorName ?? $external->doctor_name;
                        $receiptNumber = $external->receipt_number ?? ('EXT-' . $external->id);
                        if (empty($items)) {
                            $items = $external->items ?? [];
                        }
                    }
                }
                /* =============================================
                 * ✅ نسخه داخلی — از Registration + Patient + User (داکتر)
                 * ============================================= */
                else {
                    $reg = null;
                    if ($fee->registration_id) {
                        $reg = Registrations::where('reg_id', $fee->registration_id)->first();
                    }

                    /* ---------- نام بیمار ---------- */
                    // ⭐ 1. patient_id موجود در registration
                    $patient = null;
                    if ($reg && !empty($reg->patient_id)) {
                        $patient = Patient::find($reg->patient_id);
                    }

                    // ⭐ 2. اگر پیدا نشد، patient_id خود fee
                    if (!$patient && !empty($fee->patient_id)) {
                        $patient = Patient::find($fee->patient_id);
                    }

                    // ساخت نام از first_name + last_name
                    if ($patient) {
                        $computed = trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? ''));
                        if ($computed !== '') {
                            $patientName = $computed;
                        }
                        $tazkira       = $tazkira ?? ($patient->national_id ?? null);
                        $patientPhone  = $patientPhone ?? ($patient->phone ?? null);
                    }

                    // ⭐ 3. Fallback از registration.full_name
                    if (empty($patientName) && $reg && !empty($reg->full_name)) {
                        $patientName = $reg->full_name;
                    }

                    // ⭐ 4. Fallback از fee.patient_name (اگر قبلاً ذخیره شده)
                    if (empty($patientName) && !empty($fee->patient_name)) {
                        $patientName = $fee->patient_name;
                    }

                    // تذکره از registration
                    if (empty($tazkira) && $reg && !empty($reg->tazkira_number)) {
                        $tazkira = $reg->tazkira_number;
                    }

                    /* ---------- نام داکتر از جدول users ---------- */
                    if (empty($doctorName) && $reg) {
                        // ⭐ 1. doctor_id → User
                        if (!empty($reg->doctor_id)) {
                            $doc = User::find($reg->doctor_id);
                            if ($doc) {
                                $doctorName = !empty($doc->name)
                                    ? $doc->name
                                    : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                            }
                        }
                        // ⭐ 2. اگر doctor_id نبود، doc_id را امتحان کن
                        if (empty($doctorName) && !empty($reg->doc_id)) {
                            $doc = User::find($reg->doc_id);
                            if ($doc) {
                                $doctorName = !empty($doc->name)
                                    ? $doc->name
                                    : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                            }
                        }
                        // ⭐ 3. Fallback: doctor_name مستقیم ذخیره شده
                        if (empty($doctorName) && !empty($reg->doctor_name)) {
                            $doctorName = $reg->doctor_name;
                        }
                    }

                    $receiptNumber = 'FEE-' . $fee->id;
                }

                /* =============================================
                 * Fallback نهایی
                 * ============================================= */
                if (empty($patientName)) {
                    if (!empty($fee->patient_name)) {
                        $patientName = $fee->patient_name;
                    } elseif (!empty($fee->registration_id)) {
                        $patientName = 'مریض #' . $fee->registration_id;
                    } else {
                        $patientName = '-';
                    }
                }

                $source = $isExternal ? 'external' : 'internal';
                $status = $fee->payment_status;

                return [
                    'id'             => $fee->id,
                    'fee_id'         => $fee->id,
                    'ref_id'         => $fee->ref_id,
                    'source'         => $source,
                    'source_label'   => $isExternal ? 'نسخه بیرونی' : 'نسخه داخلی',
                    'pres_id'        => null,
                    'reg_id'         => $fee->registration_id,
                    'patient_id'     => $fee->patient_id,
                    'patient_name'   => $patientName,
                    'patient_age'    => $patientAge,
                    'patient_gender' => $patientGender,
                    'patient_phone'  => $patientPhone,
                    'tazkira_number' => $tazkira,
                    'doctor_name'    => $doctorName ?? '-',
                    'total_amount'   => (float) $fee->total_amount,
                    'discount'       => (float) ($fee->discount ?? 0),
                    'paid_amount'    => (float) ($fee->paid_amount ?? 0),
                    'remaining_amount' => (float) ($fee->remaining_amount ?? 0),
                    'status'         => $status,
                    'payment_method' => $fee->payment_method,
                    'payment_date'   => $fee->payment_date,
                    'receipt_number' => $receiptNumber ?? ('FEE-' . $fee->id),
                    'items'          => $items,
                    'description'    => $fee->description,
                    'note'           => $fee->note,
                    'created_at'     => $fee->created_at,
                    'is_paid'        => in_array($status, ['paid'], true),
                    'is_history'     => true,
                ];
            });

            $all = $all->concat($fees);

            /* ====================================================
             * 2. نسخه‌های داخلی در انتظار (PharmacyExecution)
             * ==================================================== */
            $shouldIncludePending = !$request->filled('payment_status')
                || in_array($request->payment_status, ['pending', 'sent_to_registration']);

            if ($shouldIncludePending) {
                $internalPending = PharmacyExecution::where('status', 'sent_to_registration')
                    ->with('items')
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(function ($ex) {
                        $alreadyExists = PrescriptionFee::where('ref_type', 'prescription_fee')
                            ->where('ref_id', $ex->id)
                            ->exists();

                        if ($alreadyExists) return null;

                        $patientName   = $ex->patient_name;
                        $tazkira       = $ex->tazkira_number;
                        $doctorName    = $ex->doctor_name;
                        $patientAge    = $ex->patient_age;
                        $patientGender = $ex->patient_gender;
                        $patientPhone  = $ex->patient_phone;

                        /* ---------- تکمیل از registration + patient + user ---------- */
                        if ($ex->reg_id) {
                            $reg = Registrations::where('reg_id', $ex->reg_id)->first();

                            // نام بیمار
                            if (empty($patientName)) {
                                $p = null;
                                if ($reg && !empty($reg->patient_id)) {
                                    $p = Patient::find($reg->patient_id);
                                }
                                if (!$p && !empty($ex->patient_id)) {
                                    $p = Patient::find($ex->patient_id);
                                }
                                if ($p) {
                                    $computed = trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? ''));
                                    if ($computed !== '') $patientName = $computed;
                                    if (empty($tazkira)) $tazkira = $p->national_id ?? null;
                                    if (empty($patientPhone)) $patientPhone = $p->phone ?? null;
                                }
                                if (empty($patientName) && $reg && !empty($reg->full_name)) {
                                    $patientName = $reg->full_name;
                                }
                            }

                            // نام داکتر از جدول users
                            if (empty($doctorName) && $reg) {
                                if (!empty($reg->doctor_id)) {
                                    $doc = User::find($reg->doctor_id);
                                    if ($doc) {
                                        $doctorName = !empty($doc->name)
                                            ? $doc->name
                                            : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                                    }
                                }
                                if (empty($doctorName) && !empty($reg->doc_id)) {
                                    $doc = User::find($reg->doc_id);
                                    if ($doc) {
                                        $doctorName = !empty($doc->name)
                                            ? $doc->name
                                            : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                                    }
                                }
                                if (empty($doctorName) && !empty($reg->doctor_name)) {
                                    $doctorName = $reg->doctor_name;
                                }
                            }
                        }

                        return [
                            'id'             => $ex->id,
                            'fee_id'         => null,
                            'ref_id'         => $ex->id,
                            'source'         => 'internal',
                            'source_label'   => 'نسخه داخلی',
                            'pres_id'        => $ex->pres_id,
                            'reg_id'         => $ex->reg_id,
                            'patient_id'     => $ex->patient_id,
                            'patient_name'   => $patientName ?? ($ex->reg_id ? 'مریض #' . $ex->reg_id : '-'),
                            'patient_age'    => $patientAge,
                            'patient_gender' => $patientGender,
                            'patient_phone'  => $patientPhone,
                            'tazkira_number' => $tazkira,
                            'doctor_name'    => $doctorName ?? '-',
                            'total_amount'   => (float) $ex->total_amount,
                            'discount'       => (float) ($ex->discount ?? 0),
                            'paid_amount'    => (float) ($ex->paid_amount ?? 0),
                            'remaining_amount' => (float) $ex->total_amount,
                            'status'         => 'sent_to_registration',
                            'payment_method' => null,
                            'payment_date'   => null,
                            'receipt_number' => $ex->receipt_number ?? ('INT-' . $ex->id),
                            'items'          => $ex->items,
                            'description'    => null,
                            'note'           => null,
                            'created_at'     => $ex->created_at,
                            'is_paid'        => false,
                            'is_history'     => false,
                        ];
                    })
                    ->filter();

                $all = $all->concat($internalPending);

                /* ================================================
                 * 3. نسخه‌های بیرونی در انتظار
                 * ================================================ */
                $externalPending = ExternalPrescription::where('status', 'sent_to_registration')
                    ->with('items')
                    ->orderByDesc('created_at')
                    ->get()
                    ->map(function ($ex) {
                        $alreadyExists = PrescriptionFee::where('ref_type', 'external_prescription')
                            ->where('ref_id', $ex->id)
                            ->exists();

                        if ($alreadyExists) return null;

                        return [
                            'id'             => $ex->id,
                            'fee_id'         => null,
                            'ref_id'         => $ex->id,
                            'source'         => 'external',
                            'source_label'   => 'نسخه بیرونی',
                            'pres_id'        => null,
                            'reg_id'         => null,
                            'patient_id'     => null,
                            'patient_name'   => $ex->patient_name ?? '-',
                            'patient_age'    => $ex->patient_age,
                            'patient_gender' => $ex->patient_gender,
                            'patient_phone'  => $ex->patient_phone,
                            'tazkira_number' => $ex->tazkira_number,
                            'doctor_name'    => $ex->doctor_name ?? '-',
                            'total_amount'   => (float) $ex->total_amount,
                            'discount'       => (float) ($ex->discount ?? 0),
                            'paid_amount'    => 0,
                            'remaining_amount' => (float) $ex->total_amount,
                            'status'         => 'sent_to_registration',
                            'payment_method' => null,
                            'payment_date'   => null,
                            'receipt_number' => $ex->receipt_number ?? ('EXT-' . $ex->id),
                            'items'          => $ex->items,
                            'description'    => null,
                            'note'           => null,
                            'created_at'     => $ex->created_at,
                            'is_paid'        => false,
                            'is_history'     => false,
                        ];
                    })
                    ->filter();

                $all = $all->concat($externalPending);
            }

            $sorted = $all
                ->sortByDesc(function ($item) {
                    return $item['created_at'] instanceof \Carbon\Carbon
                        ? $item['created_at']->timestamp
                        : strtotime($item['created_at']);
                })
                ->values();

            return response()->json([
                'success' => true,
                'data'    => $sorted,
                'counts'  => [
                    'total'    => $sorted->count(),
                    'paid'     => $sorted->where('is_paid', true)->count(),
                    'pending'  => $sorted->where('is_paid', false)->count(),
                    'internal' => $sorted->where('source', 'internal')->count(),
                    'external' => $sorted->where('source', 'external')->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('allFees error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * اخذ فیس (داخلی یا بیرونی)
     * ============================================================
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
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $paidAmount = (float) $request->paid_amount;
            $discount   = (float) ($request->discount ?? 0);
            $method     = $request->payment_method ?? 'cash';

            /* ==========================================
             * نسخه داخلی
             * ========================================== */
            if ($source === 'internal') {
                $execution = PharmacyExecution::find($id);

                if (!$execution) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'نسخه یافت نشد'], 404);
                }

                if ($execution->status === 'paid') {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'این نسخه قبلاً پرداخت شده است'], 422);
                }

                $execution->update(['status' => 'paid']);

                $feeData = [
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
                ];

                if (\Schema::hasColumn('prescription_fees', 'patient_name') && !empty($execution->patient_name)) {
                    $feeData['patient_name'] = $execution->patient_name;
                }
                if (\Schema::hasColumn('prescription_fees', 'tazkira_number') && !empty($execution->tazkira_number)) {
                    $feeData['tazkira_number'] = $execution->tazkira_number;
                }
                if (\Schema::hasColumn('prescription_fees', 'doctor_name') && !empty($execution->doctor_name)) {
                    $feeData['doctor_name'] = $execution->doctor_name;
                }

                $fee = PrescriptionFee::create($feeData);

                DB::commit();

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

                try {
                    LogService::create('create', 'prescription_fees', $fee->id, 'Internal prescription fee collected', $fee->toArray());
                } catch (\Exception $e) {
                    Log::error("Internal fee log failed: " . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'فیس نسخه داخلی با موفقیت اخذ شد',
                    'data'    => $execution->fresh(),
                ]);
            }

            /* ==========================================
             * نسخه بیرونی
             * ========================================== */
            if ($source === 'external') {
                $external = ExternalPrescription::find($id);

                if (!$external) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'نسخه بیرونی یافت نشد'], 404);
                }

                if ($external->status === 'paid') {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'این نسخه قبلاً پرداخت شده است'], 422);
                }

                if ($external->status === 'cancelled') {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'این نسخه لغو شده است'], 422);
                }

                $fee = PrescriptionFee::where('ref_type', 'external_prescription')
                    ->where('ref_id', $external->id)
                    ->first();

                $feeData = [
                    'registration_id'  => null,
                    'patient_id'       => null,
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
                    'ref_type'         => 'external_prescription',
                    'ref_id'           => $external->id,
                    'source_type'      => 'external',
                ];

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

                $external->update([
                    'status'  => 'paid',
                    'paid_by' => Auth::id(),
                    'paid_at' => now(),
                ]);

                DB::commit();

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

                try {
                    LogService::create('create', 'prescription_fees', $fee->id, 'External prescription fee collected', $fee->toArray());
                } catch (\Exception $e) {
                    Log::error("External fee log failed: " . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'فیس نسخه بیرونی با موفقیت اخذ شد',
                    'data'    => $external->fresh(),
                ]);
            }

            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'نوع منبع نامعتبر است'], 400);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('collectFee error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در اخذ فیس: ' . $e->getMessage()], 500);
        }
    }
}