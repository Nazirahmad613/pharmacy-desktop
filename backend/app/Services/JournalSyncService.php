<?php
// app/Services/JournalSyncService.php

namespace App\Services;

use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Patient;
use App\Models\ExternalPrescription;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class JournalSyncService
{
    /**
     * نگاشت نوع منبع به نوع تراکنش
     *
     * قاعده طلایی:
     *   - هر پولی که از مریض/مشتری گرفته می‌شود  → debit (اخذ پول)
     *   - هر پولی که به کسی داده می‌شود         → credit (پرداخت پول)
     */
    protected array $entryTypeMap = [
        // فیس‌ها → اخذ پول از مریض
        'laboratory_fee'         => 'debit',
        'radiology_fee'          => 'debit',
        'operation_fee'          => 'debit',
        'admission_fee'          => 'debit',
        'prescription_fee'       => 'debit',
        'external_prescription'  => 'debit',   // ✅ فیس نسخه بیرونی
        'pharmacy_fee'           => 'debit',
        'registration_fee'       => 'debit',
        'consultation_fee'       => 'debit',

        // فروش → اخذ پول از مشتری
        'sale'                   => 'debit',

        // خرید → پرداخت پول به تأمین‌کننده
        'parchase'               => 'credit',

        // مصارف → پرداخت پول
        'expense'                => 'credit',
        'salary'                 => 'credit',
        'rent'                   => 'credit',
        'electricity'            => 'credit',
        'water'                  => 'credit',
        'internet'               => 'credit',
        'fuel'                   => 'credit',
        'maintenance'            => 'credit',
        'transport'              => 'credit',
    ];

    /**
     * برچسب فارسی نوع منبع
     */
    protected array $sourceLabels = [
        'laboratory_fee'         => 'فیس لابراتوار',
        'radiology_fee'          => 'فیس رادیولوژی',
        'operation_fee'          => 'فیس عملیات',
        'admission_fee'          => 'فیس بستری',
        'prescription_fee'       => 'فیس نسخه',
        'external_prescription'  => 'فیس نسخه بیرونی',   // ✅
        'pharmacy_fee'           => 'فیس دواخانه',
        'registration_fee'       => 'فیس مراجعه',
        'consultation_fee'       => 'فیس مشاوره',
        'sale'                   => 'فروش',
        'parchase'               => 'خرید',
    ];

    /* ============================================================
     *  ثبت/به‌روزرسانی ژورنال برای یک فیس
     * ============================================================ */
    public function syncFee(array $params): ?Journal
    {
        try {
            $regId      = $params['reg_id'] ?? null;
            $refType    = $params['ref_type'] ?? ($params['source_type'] ?? null);
            $refId      = $params['ref_id'] ?? null;
            $sourceType = $params['source_type'] ?? $refType;

            // ✅ اجازه‌ی نبودِ reg_id برای نسخه‌های بیرونی
            if (!$refType || !$refId) {
                Log::warning('JournalSyncService: پارامترهای ناقص', $params);
                return null;
            }

            // ✅ اگر نه reg_id دارد و نه مریض/نام بیمار، نمی‌توان ژورنال ساخت
            // (به‌جز نسخه بیرونی که patient_name را از پارامتر می‌گیرد)
            $isExternal = in_array($refType, ['external_prescription'], true)
                || ($sourceType === 'external');

            if (!$regId && !$isExternal && empty($params['patient_name'])) {
                Log::warning('JournalSyncService: نه reg_id و نه patient_name موجود است', $params);
                return null;
            }

            /* ---------- دریافت مریض و اطلاعات مراجعه ---------- */
            $registration = null;
            $patient      = null;

            if ($regId) {
                $registration = Registrations::with('patient')->where('reg_id', $regId)->first();
                $patient      = $registration?->patient;
            }

            /* ---------- استخراج نام بیمار و تذکره ---------- */
            $patientName = null;
            $patientId   = $params['patient_id'] ?? null;
            $tazkira     = $params['tazkira_number'] ?? null;

            if ($isExternal) {
                // ✅ نسخه بیرونی: نام و تذکره از پارامترها یا جدول ExternalPrescription
                if (empty($params['patient_name']) && $refType === 'external_prescription' && $refId) {
                    $external = ExternalPrescription::find($refId);
                    if ($external) {
                        $params['patient_name']   = $external->patient_name;
                        $params['tazkira_number'] = $params['tazkira_number'] ?? $external->tazkira_number;
                    }
                }

                $patientName = $params['patient_name'] ?? null;
                $tazkira     = $params['tazkira_number'] ?? $tazkira;
            } else {
                // فیس‌های داخلی: نام از patient یا registration
                $patientName = $patient
                    ? trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? ''))
                    : null;

                if (empty($patientName) && !empty($params['patient_name'])) {
                    $patientName = $params['patient_name'];
                }

                $patientId = $patientId
                    ?? ($patient->id ?? null)
                    ?? ($registration->patient_id ?? null);

                $tazkira = $tazkira
                    ?? ($patient->national_id ?? null)
                    ?? ($registration->tazkira_number ?? null);
            }

            /* ---------- محاسبه مبالغ ---------- */
            $amount        = (float) ($params['amount'] ?? 0);
            $paidAmount    = (float) ($params['paid_amount'] ?? 0);
            $discount      = (float) ($params['discount'] ?? 0);
            $netAmount     = max(0, $amount - $discount);
            $remaining     = (float) ($params['remaining_amount'] ?? max(0, $netAmount - $paidAmount));
            $paymentStatus = $params['payment_status'] ?? $this->computeStatus($netAmount, $paidAmount);

            /* ---------- تاریخ فیس (اگر داده شده) ---------- */
            $journalDate = $params['journal_date']
                ?? ($params['fee_date'] ?? null)
                ?? now()->toDateString();

            /* ---------- تعیین نوع تراکنش (debit/credit) ---------- */
            $entryType = $params['entry_type']
                ?? ($this->entryTypeMap[$sourceType] ?? 'debit'); // پیش‌فرض: اخذ پول

            /* ---------- حذف ژورنال قبلی این فیس ---------- */
            Journal::where('ref_type', $refType)
                ->where('ref_id', $refId)
                ->delete();

            /* ---------- اگر پرداختی وجود ندارد → ژورنال نمی‌سازیم ---------- */
            if ($paidAmount <= 0) {
                return null;
            }

            /* ---------- ساخت توضیحات ---------- */
            $description = $params['description']
                ?? $this->buildDescription($sourceType, $patientName, $tazkira);

            /* ---------- ساخت داده‌های ژورنال ---------- */
            $journalData = [
                'journal_date'      => $journalDate,
                'description'       => $description,
                'entry_type'        => $entryType,

                // ✅ مبلغ واقعی پرداخت شده (نه amount اصلی)
                'amount'            => $paidAmount,

                'tazkira_number'    => $tazkira,
                'ref_type'          => $refType,
                'ref_id'            => $refId,

                // ✅ ارتباط با مریض و مراجعه (برای نسخه بیرونی null هستند)
                'patient_id'        => $patientId,
                'reg_id'            => $regId,

                // ✅ ساختار درختی
                'parent_journal_id' => $params['parent_journal_id'] ?? null,

                'user_id'           => auth()->id(),

                'pres_id'           => $params['pres_id'] ?? null,
                'pres_num'          => $params['pres_num'] ?? null,
                'doc_id'            => $params['doc_id'] ?? ($registration->doctor_id ?? null),
                'cust_id'           => $params['cust_id'] ?? null,
                'supplier_id'       => $params['supplier_id'] ?? null,
                'med_id'            => $params['med_id'] ?? null,
                'parchase_id'       => $params['parchase_id'] ?? null,
            ];

            // ✅ اگر جدول journals ستون‌های کمکی دارد، آن‌ها را پر کن
            if (Schema::hasColumn('journals', 'source_type')) {
                $journalData['source_type'] = $sourceType;
            }
            if (Schema::hasColumn('journals', 'patient_name')) {
                $journalData['patient_name'] = $patientName;
            }

            $journal = Journal::create($journalData);

            /* ---------- اگر reg_id دارد، والد را به‌روزرسانی کن ---------- */
            if ($regId && !empty($params['update_parent']) && $params['update_parent'] === true) {
                $this->updateParentJournal($regId);
            }

            return $journal;

        } catch (\Throwable $e) {
            Log::error('JournalSyncService::syncFee error', [
                'message' => $e->getMessage(),
                'params'  => $params,
            ]);
            return null;
        }
    }

    /* ============================================================
     *  حذف ژورنال مربوط به یک فیس
     * ============================================================ */
    public function deleteFee(string $refType, int $refId): void
    {
        try {
            // ✅ پشتیبانی از انواع مختلف ref_type
            $allowedTypes = [
                'prescription_fee',
                'external_prescription',
                'laboratory_fee',
                'radiology_fee',
                'operation_fee',
                'admission_fee',
                'pharmacy_fee',
                'registration_fee',
                'consultation_fee',
            ];

            if (!in_array($refType, $allowedTypes, true)) {
                Log::warning("JournalSyncService::deleteFee: ref_type نامعتبر: {$refType}");
                return;
            }

            $journal = Journal::where('ref_type', $refType)
                ->where('ref_id', $refId)
                ->first();

            $regId = $journal?->reg_id;

            Journal::where('ref_type', $refType)
                ->where('ref_id', $refId)
                ->delete();

            // به‌روزرسانی والد اگر reg_id داشت
            if ($regId) {
                $this->updateParentJournal($regId);
            }
        } catch (\Throwable $e) {
            Log::error('JournalSyncService::deleteFee error', [
                'message'  => $e->getMessage(),
                'ref_type' => $refType,
                'ref_id'   => $refId,
            ]);
        }
    }

    /* ============================================================
     *  به‌روزرسانی ژورنال والد
     * ============================================================ */
    protected function updateParentJournal($regId): void
    {
        if (!$regId) return;

        $parentJournal = Journal::where('reg_id', $regId)
            ->whereNull('parent_journal_id')
            ->first();

        if (!$parentJournal) return;

        $totalDebit = Journal::where('reg_id', $regId)
            ->whereNull('parent_journal_id')
            ->where('entry_type', 'debit')
            ->sum('amount');

        $totalCredit = Journal::where('reg_id', $regId)
            ->whereNull('parent_journal_id')
            ->where('entry_type', 'credit')
            ->sum('amount');

        $netAmount = $totalDebit - $totalCredit;

        $parentJournal->update([
            'amount'      => $netAmount,
            'description' => "مجموع فیس‌های مریض - مجموع: {$netAmount}",
        ]);
    }

    /* ============================================================
     *  محاسبه وضعیت پرداخت
     * ============================================================ */
    protected function computeStatus(float $netAmount, float $paidAmount): string
    {
        if ($paidAmount <= 0) return 'pending';
        if ($paidAmount + 0.01 >= $netAmount) return 'paid';
        return 'partial';
    }

    /* ============================================================
     *  ساخت توضیحات استاندارد (شامل نام بیمار)
     * ============================================================ */
    protected function buildDescription(
        ?string $sourceType,
        ?string $patientName,
        ?string $tazkira = null
    ): string {
        $label = $this->sourceLabels[$sourceType] ?? 'فیس';

        // ✅ فرمت استاندارد شامل «بیمار:» تا extractNameFromDescription بتواند استخراج کند
        if ($patientName) {
            $desc = "{$label} - بیمار: {$patientName}";
            if ($tazkira) {
                $desc .= " - تذکره: {$tazkira}";
            }
            return $desc;
        }

        return $label;
    }
}