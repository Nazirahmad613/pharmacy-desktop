<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryAdvance extends Model
{
    protected $table = 'salary_advances';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
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
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    /**
     * خروجی مطابق SalaryAdvances.jsx
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

        return [
            'id'         => $this->id,
            'employee'   => $user->full_name ?? $user->name ?? '',
            'employeeId' => $this->user_id,
            'department' => $user->department->name ?? '',
            'amount'     => (float) $this->amount,
            'reason'     => $this->reason,
            'date'       => $this->request_date,
            'status'     => $statusMap[$this->status] ?? $this->status,
            'statusRaw'  => $this->status,
            'repaid'     => (float) $this->repaid_amount,
            'remaining'  => (float) $this->remaining_amount,
        ];
    }
}