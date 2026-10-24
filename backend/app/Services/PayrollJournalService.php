<?php
// app/Services/PayrollJournalService.php

namespace App\Services;

use App\Models\Journal;
use App\Models\PayrollPeriod;
use App\Models\EmployeeSalary;
use App\Models\SalaryAdvance;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PayrollJournalService
{
    public function recordSalaryGeneration(EmployeeSalary $salary, ?string $journalDate = null): ?Journal
    {
        try {
            $journalDate = $journalDate ?? now()->toDateString();
            $amount      = (float) $salary->net_salary;
            if ($amount <= 0) return null;

            $period = PayrollPeriod::find($salary->period_id);

            Journal::where('ref_type', 'salary_generation')->where('ref_id', $salary->id)->delete();
            Journal::where('ref_type', 'salary_payable')->where('ref_id', $salary->id)->delete();

            $employeeName = $salary->employee_name ?? '—';
            $periodLabel  = $period ? "{$period->period_month} {$period->period_year}" : "";
            $description  = "تولید معاش - {$employeeName}" . ($periodLabel ? " - {$periodLabel}" : "");

            $hasSourceType = Schema::hasColumn('journals', 'source_type');

            $debitData = [
                'journal_date' => $journalDate,
                'description'  => $description . ' (هزینه معاش)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_generation',
                'ref_id'       => $salary->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary';
            $debitJournal = Journal::create($debitData);

            $creditData = [
                'journal_date' => $journalDate,
                'description'  => $description . ' (معاش قابل پرداخت)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payable',
                'ref_id'       => $salary->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary';
            Journal::create($creditData);

            return $debitJournal;
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordSalaryGeneration error', [
                'message' => $e->getMessage(), 'salary_id' => $salary->id ?? null,
            ]);
            return null;
        }
    }

    public function recordSalaryPayment(EmployeeSalary $salary, string $paymentDate, ?int $paidFromAccountId = null): ?Journal
    {
        try {
            $amount = (float) $salary->net_salary;
            if ($amount <= 0) return null;

            Journal::where('ref_type', 'salary_payment')->where('ref_id', $salary->id)->delete();
            Journal::where('ref_type', 'salary_payment_debit')->where('ref_id', $salary->id)->delete();

            $period = PayrollPeriod::find($salary->period_id);
            $description = "پرداخت معاش - " . ($salary->employee_name ?? '—')
                . ($period ? " - {$period->period_month} {$period->period_year}" : "")
                . ($salary->receipt_number ? " - رسید: {$salary->receipt_number}" : "");

            $hasSourceType = Schema::hasColumn('journals', 'source_type');

            $debitData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (تسویه معاش)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payment_debit',
                'ref_id'       => $salary->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary';
            Journal::create($debitData);

            $creditData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (پرداخت از صندوق/بانک)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_payment',
                'ref_id'       => $salary->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary';
            return Journal::create($creditData);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordSalaryPayment error', [
                'message' => $e->getMessage(), 'salary_id' => $salary->id ?? null,
            ]);
            return null;
        }
    }

    public function recordAdvancePayment(SalaryAdvance $advance, ?string $paymentDate = null): ?Journal
    {
        try {
            $amount = (float) $advance->amount;
            if ($amount <= 0) return null;
            $paymentDate = $paymentDate ?? now()->toDateString();

            Journal::where('ref_type', 'salary_advance')->where('ref_id', $advance->id)->delete();
            Journal::where('ref_type', 'salary_advance_debit')->where('ref_id', $advance->id)->delete();

            $employeeName = $advance->user->name ?? $advance->account->account_name ?? '—';
            $description  = "پیش‌پرداخت معاش - {$employeeName}";
            $hasSourceType = Schema::hasColumn('journals', 'source_type');

            $debitData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (پیش‌پرداخت)',
                'entry_type'   => 'debit',
                'amount'       => $amount,
                'ref_type'     => 'salary_advance_debit',
                'ref_id'       => $advance->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $debitData['source_type'] = 'salary_advance';
            Journal::create($debitData);

            $creditData = [
                'journal_date' => $paymentDate,
                'description'  => $description . ' (پرداخت از صندوق/بانک)',
                'entry_type'   => 'credit',
                'amount'       => $amount,
                'ref_type'     => 'salary_advance',
                'ref_id'       => $advance->id,
                'user_id'      => auth()->id(),
            ];
            if ($hasSourceType) $creditData['source_type'] = 'salary_advance';
            return Journal::create($creditData);
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::recordAdvancePayment error', [
                'message' => $e->getMessage(), 'advance_id' => $advance->id ?? null,
            ]);
            return null;
        }
    }

    public function deleteSalaryJournals(int $salaryId): void
    {
        try {
            Journal::whereIn('ref_type', [
                'salary_generation', 'salary_payable',
                'salary_payment', 'salary_payment_debit',
            ])->where('ref_id', $salaryId)->delete();
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::deleteSalaryJournals error', [
                'message' => $e->getMessage(), 'salary_id' => $salaryId,
            ]);
        }
    }

    public function deleteAdvanceJournals(int $advanceId): void
    {
        try {
            Journal::whereIn('ref_type', ['salary_advance', 'salary_advance_debit'])
                ->where('ref_id', $advanceId)->delete();
        } catch (\Throwable $e) {
            Log::error('PayrollJournalService::deleteAdvanceJournals error', [
                'message' => $e->getMessage(), 'advance_id' => $advanceId,
            ]);
        }
    }
}