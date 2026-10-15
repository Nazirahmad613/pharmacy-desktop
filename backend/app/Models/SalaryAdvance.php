<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryAdvance extends Model
{
    protected $table = 'salary_advances';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'account_id',        // ✅ اضافه شد - پشتیبانی از طرف‌حساب
        'amount',
        'reason',
        'request_date',
        'approval_date',
        'approved_by',
        'payment_account_id',
        'status',
        'repaid_amount',
        'remaining_amount',
        'repayment_months',
        'monthly_deduction',
    ];

    protected $casts = [
        'amount'            => 'float',
        'repaid_amount'     => 'float',
        'remaining_amount'  => 'float',
        'monthly_deduction' => 'float',
        'approval_date'     => 'date',
        'request_date'      => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    // ✅ اضافه شد - relation طرف‌حساب
    public function account()
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    /**
     * ✅ خروجی مطابق SalaryAdvances.jsx (یکسان‌سازی کامل)
     */
    public function toFrontendArray(): array
    {
        $statusMap = [
            'pending'          => 'در انتظار',
            'approved'         => 'تأیید شده',
            'rejected'         => 'رد شده',
            'repaid'           => 'بازپرداخت شده',
            'partially_repaid' => 'تأیید شده',
        ];

        $user = $this->user;
        $account = $this->account;

        $employeeName = $user->full_name
            ?? $user->name
            ?? $account->account_name
            ?? '—';

        $department = $user->department->name
            ?? $account->account_code
            ?? '—';

        return [
            'id'               => $this->id,
            'employee'         => $employeeName,
            'employeeId'       => $this->user_id ?? $this->account_id,
            'userId'           => $this->user_id,
            'accountId'        => $this->account_id,
            'source'           => $this->user_id ? 'user' : 'account',
            'sourceLabel'      => $this->user_id ? 'کاربر سیستم' : 'کارمند طرف‌حساب',
            'department'       => $department,
            'amount'           => (float) $this->amount,
            'reason'           => $this->reason,
            'date'             => $this->request_date,
            'requestDate'      => $this->request_date,
            'approvalDate'     => $this->approval_date?->format('Y-m-d'),
            'status'           => $statusMap[$this->status] ?? $this->status,
            'statusRaw'        => $this->status,
            'repaid'           => (float) $this->repaid_amount,
            'repaidAmount'     => (float) $this->repaid_amount,
            'remaining'        => (float) $this->remaining_amount,
            'remainingAmount'  => (float) $this->remaining_amount,
            'repaymentMonths'  => (int) $this->repayment_months,
            'monthlyDeduction' => (float) $this->monthly_deduction,
        ];
    }
}