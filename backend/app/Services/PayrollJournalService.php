<?php
// app/Services/PayrollJournalService.php

namespace App\Services;

use App\Models\Journal;
use App\Models\PayrollPeriod;
use App\Models\EmployeeSalary;
use App\Models\EmployeeSalaryInfo;
use App\Models\SalaryAdvance; // فقط برای سازگاری با ژورنال‌های قدیمی
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PayrollJournalService
{
    /* ============================================================
     *  ✅ ref_type های مربوط به پیش‌پرداخت
     *  credit = پرداخت پیش‌پرداخت به کارمند (بدهی کارمند)
     *  debit  = تسویه پیش‌پرداخت از معاش
     * ============================================================ */
    public const ADVANCE_CREDIT_REF_TYPES = [
        'salary_advance',
        'salary_advance_debit',
    ];

    public const ADVANCE_SETTLEMENT_REF_TYPES = [
        'salary_advance_settlement',
    ];

    /* ============================================================
     *  🔧 کمک: گرفتن شناسه کاربر جاری به شکل ایمن
     * ============================================================ */
    private function currentUserId(): ?int
    {
        try {
            return optional(auth()->user())->id ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /* ============================================================
     *  ✅ استخراج حساب کارمند از EmployeeSalary
     *  اولویت:
     *   1) salary.account_id (اگر پر بود)
     *   2) EmployeeSalaryInfo.account_id (مرتبط با user_id یا account_id)
     *   3) null (یعنی ژورنال «یوزر»)
     * ============================================================ */
    private function resolveAccountId($salaryOrAdvance): ?int
    {
        if (!$salaryOrAdvance) return null;

        // 1) اگر خود رکورد account_id دارد
        if (!empty($salaryOrAdvance->account_id)) {
            return (int) $salaryOrAdvance->account_id;
        }

        // 2) اگر رکورد EmployeeSalaryInfo دارد → از آن بخوان
        try {
            if (!empty($salaryOrAdvance->salary_info_id)) {
                $info = EmployeeSalaryInfo::find($salaryOrAdvance->salary_info_id);
                if ($info && !empty($info->account_id)) {
                    return (int) $info->account_id;
                }
            }

            // 3) اگر user_id دارد → از salary_info آن کاربر بخوان
            if (!empty($salaryOrAdvance->user_id)) {
                $info = EmployeeSalaryInfo::where('user_id', $salaryOrAdvance->user_id)->first();
                if ($info && !empty($info->account_id)) {
                    return (int) $info->account_id;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('resolveAccountId failed: ' . $e->getMessage());
        }

        return null;
    }

    /* ============================================================
     *  ثبت ژورنال تولید معاش
     * ============================================================ */
    public function recordSalaryGeneration(EmployeeSalary $salary, ?string $journalDate = null): ?Journal
    {
        try {
            $journalDate = $journalDate ?? now()->toDateString();
            $amount      = (float) $salary->net_salary;

            if ($amount <= 0) return null;

            $period = PayrollPeriod::find($salary->period_id);

            // حذف ژورنال‌های قبلی این معاش (idempotent)
            Journal::whereIn('ref_type', ['salary_generation', 'salary_payable'])
                ->where('ref_id', $salary->id)
                ->delete();

            $employeeName = $salary->employee_name ?? '—';
            $periodLabel  = $period ? "{$period->period_month} {$period->period_year}" : "";
            $description  = "تولید معاش - {$employeeName}" . ($periodLabel ? " - {$periodLabel}" : "");

            $hasSourceType = Schema::hasColumn('journals', 'source_type');
            $accountId     = $this->resolveAccountId($salary);
            $userId        = $this->currentUserId();

            /* ---------------------------------------------
             * debit: هزینه معاش
             * --------------------------------------------- */
            $debitData = [
                'journal_date' => $journalDate,
                'description'  => $description . ' (هزینه معاش)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_generation',
                'ref_id'       => $salary->id,
                'account_id'   => $accountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary';
            $debitJournal = Journal::create($debitData);

            /* ---------------------------------------------
             * credit: معاش قابل پرداخت
             * --------------------------------------------- */
            $creditData = [
                'journal_date' => $journalDate,
                'description'  => $description . ' (معاش قابل پرداخت)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payable',
                'ref_id'       => $salary->id,
                'account_id'   => $accountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary';
            Journal::create($creditData);

            return $debitJournal;
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordSalaryGeneration error', [
                'message'   => $e->getMessage(),
                'salary_id' => $salary->id ?? null,
            ]);
            return null;
        }
    }

    /* ============================================================
     *  ثبت ژورنال پرداخت معاش
     * ============================================================ */
    public function recordSalaryPayment(
        EmployeeSalary $salary,
        string $paymentDate,
        ?int $paidFromAccountId = null
    ): ?Journal {
        try {
            $amount = (float) $salary->net_salary;
            if ($amount <= 0) return null;

            // حذف ژورنال‌های قبلی پرداخت (idempotent)
            Journal::whereIn('ref_type', ['salary_payment', 'salary_payment_debit'])
                ->where('ref_id', $salary->id)
                ->delete();

            $period = PayrollPeriod::find($salary->period_id);
            $description = "پرداخت معاش - " . ($salary->employee_name ?? '—')
                . ($period ? " - {$period->period_month} {$period->period_year}" : "")
                . ($salary->receipt_number ? " - رسید: {$salary->receipt_number}" : "");

            $hasSourceType    = Schema::hasColumn('journals', 'source_type');
            $userId           = $this->currentUserId();
            $employeeAccountId = $this->resolveAccountId($salary);
            $paymentAccountId  = $paidFromAccountId ?? $employeeAccountId;

            /* ---------------------------------------------
             * debit: تسویه معاش (بدهی به کارمند کم می‌شود)
             * --------------------------------------------- */
            $debitData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (تسویه معاش)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payment_debit',
                'ref_id'       => $salary->id,
                'account_id'   => $employeeAccountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary';
            Journal::create($debitData);

            /* ---------------------------------------------
             * credit: پرداخت از صندوق/بانک
             * --------------------------------------------- */
            $creditData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (پرداخت از صندوق/بانک)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payment',
                'ref_id'       => $salary->id,
                'account_id'   => $paymentAccountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary';
            return Journal::create($creditData);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordSalaryPayment error', [
                'message'   => $e->getMessage(),
                'salary_id' => $salary->id ?? null,
            ]);
            return null;
        }
    }

    /* ============================================================
     *  ✅ جدید: ثبت ژورنال تسویه پیش‌پرداخت از معاش
     *  این ژورنال مانده پیش‌پرداخت روی حساب کارمند را کاهش می‌دهد.
     * ============================================================ */
    public function recordAdvanceSettlement(
        EmployeeSalary $salary,
        string $paymentDate,
        ?int $employeeAccountId = null
    ): ?Journal {
        try {
            $amount = (float) $salary->advance_deduction;

            if ($amount <= 0) {
                return null;
            }

            $accountId = $employeeAccountId ?? $this->resolveAccountId($salary);

            if (!$accountId) {
                Log::warning('recordAdvanceSettlement: حساب کارمند یافت نشد', [
                    'salary_id' => $salary->id,
                ]);
                return null;
            }

            // حذف ژورنال تسویه‌ی قبلی (idempotent)
            Journal::whereIn('ref_type', self::ADVANCE_SETTLEMENT_REF_TYPES)
                ->where('ref_id', $salary->id)
                ->delete();

            $employeeName = $salary->employee_name ?? 'کارمند';
            $description  = "تسویه پیش‌پرداخت از معاش - {$employeeName}";

            $data = [
                'journal_date' => $paymentDate,
                'description'  => $description,
                'entry_type'   => 'debit', // کاهش بدهی کارمند
                'amount'       => $amount,
                'ref_type'     => 'salary_advance_settlement',
                'ref_id'       => $salary->id,
                'account_id'   => $accountId,
                'user_id'      => $this->currentUserId(),
            ];

            if (Schema::hasColumn('journals', 'source_type')) {
                $data['source_type'] = 'salary';
            }

            return Journal::create($data);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordAdvanceSettlement error', [
                'message'   => $e->getMessage(),
                'salary_id' => $salary->id ?? null,
            ]);
            return null;
        }
    }

    /* ============================================================
     *  ✅ حذف ژورنال تسویه پیش‌پرداخت
     * ============================================================ */
    public function deleteAdvanceSettlementJournals(int $salaryId): void
    {
        try {
            Journal::whereIn('ref_type', self::ADVANCE_SETTLEMENT_REF_TYPES)
                ->where('ref_id', $salaryId)
                ->delete();
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::deleteAdvanceSettlementJournals error', [
                'message'   => $e->getMessage(),
                'salary_id' => $salaryId,
            ]);
        }
    }

    /* ============================================================
     *  ✅ حذف همه ژورنال‌های معاش (تولید + پرداخت + تسویه پیش‌پرداخت)
     * ============================================================ */
    public function deleteSalaryJournals(int $salaryId): void
    {
        try {
            Journal::whereIn('ref_type', [
                'salary_generation',
                'salary_payable',
                'salary_payment',
                'salary_payment_debit',
            ])->where('ref_id', $salaryId)->delete();

            // ✅ ژورنال تسویه پیش‌پرداخت
            $this->deleteAdvanceSettlementJournals($salaryId);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::deleteSalaryJournals error', [
                'message'   => $e->getMessage(),
                'salary_id' => $salaryId,
            ]);
        }
    }

    /* ============================================================
     *  ⚠️ متد قدیمی: ثبت ژورنال پیش‌پرداخت از SalaryAdvance
     *
     *  از این به بعد پیش‌پرداخت مستقیماً در صفحه ژورنال با
     *  entry_type = credit و ref_type = salary_advance ثبت می‌شود.
     *
     *  این متد فقط برای سازگاری با داده‌های قدیمی (اگر داده‌ای
     *  در salary_advances مانده باشد) نگه داشته شده است.
     *
     *  در createAdvance جدید از این متد استفاده نمی‌شود.
     * ============================================================ */
    public function recordAdvancePayment(SalaryAdvance $advance, ?string $paymentDate = null): ?Journal
    {
        try {
            $amount = (float) $advance->amount;
            if ($amount <= 0) return null;

            $paymentDate = $paymentDate ?? now()->toDateString();

            // حذف ژورنال‌های قبلی این پیش‌پرداخت
            Journal::whereIn('ref_type', self::ADVANCE_CREDIT_REF_TYPES)
                ->where('ref_id', $advance->id)
                ->delete();

            $employeeName = $advance->user->name
                ?? $advance->user->full_name
                ?? $advance->account->account_name
                ?? '—';
            $description = "پیش‌پرداخت معاش - {$employeeName}";

            $hasSourceType = Schema::hasColumn('journals', 'source_type');
            $accountId     = $this->resolveAccountId($advance);
            $userId        = $this->currentUserId();

            /* ---------------------------------------------
             * debit: ثبت پیش‌پرداخت (هزینه/مطالبات)
             * --------------------------------------------- */
            $debitData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (ثبت پیش‌پرداخت)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_advance_debit',
                'ref_id'       => $advance->id,
                'account_id'   => $accountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary_advance';
            Journal::create($debitData);

            /* ---------------------------------------------
             * credit: پرداخت از صندوق/بانک (پول به کارمند داده شد)
             * --------------------------------------------- */
            $creditData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (پرداخت از صندوق/بانک)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_advance',
                'ref_id'       => $advance->id,
                'account_id'   => $accountId,
                'user_id'      => $userId,
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary_advance';
            return Journal::create($creditData);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordAdvancePayment error', [
                'message'    => $e->getMessage(),
                'advance_id' => $advance->id ?? null,
            ]);
            return null;
        }
    }

    /* ============================================================
     *  ⚠️ متد قدیمی: حذف ژورنال‌های پیش‌پرداخت
     * ============================================================ */
    public function deleteAdvanceJournals(int $advanceId): void
    {
        try {
            Journal::whereIn('ref_type', self::ADVANCE_CREDIT_REF_TYPES)
                ->where('ref_id', $advanceId)
                ->delete();
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::deleteAdvanceJournals error', [
                'message'    => $e->getMessage(),
                'advance_id' => $advanceId,
            ]);
        }
    }

    /* ============================================================
     *  🧮 کمک: محاسبه مانده پیش‌پرداخت یک کارمند از ژورنال
     *  (در صورت نیاز در سرویس‌های دیگر)
     * ============================================================ */
    public function getAdvanceBalance(?int $accountId): float
    {
        if (!$accountId) return 0.0;

        try {
            $row = \DB::table('journals')
                ->where('account_id', $accountId)
                ->whereIn('ref_type', array_merge(
                    self::ADVANCE_CREDIT_REF_TYPES,
                    self::ADVANCE_SETTLEMENT_REF_TYPES
                ))
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN entry_type = "credit" THEN amount ELSE 0 END), 0) AS total_credit,
                    COALESCE(SUM(CASE WHEN entry_type = "debit"  THEN amount ELSE 0 END), 0) AS total_debit
                ')
                ->first();

            $credit = (float) ($row->total_credit ?? 0);
            $debit  = (float) ($row->total_debit  ?? 0);

            return max(0, round($credit - $debit, 2));
        } catch (\Throwable $e) {
            Log::warning('getAdvanceBalance failed: ' . $e->getMessage());
            return 0.0;
        }
    }
}