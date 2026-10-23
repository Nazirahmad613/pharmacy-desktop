<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmployeeSalary extends Model
{
    use HasFactory;

    protected $table = 'employee_salaries';
    public $timestamps = true;

    /**
     * ✅ tax_amount و insurance_amount اضافه شدند
     * بدون این دو، create() آن‌ها را نادیده می‌گیرد
     */
    protected $fillable = [
        'user_id',
        'account_id',
        'period_id',
        'salary_info_id',
        'base_salary',
        'allowances',
        'deductions',
        'gross_salary',         // ✅ اضافه شد
        'tax_amount',           // ✅ اضافه شد
        'insurance_amount',     // ✅ اضافه شد
        'advance_deduction',
        'net_salary',
        'paid_amount',
        'payment_status',
        'payment_date',
        'payment_method',
        'payment_account_id',
        'paid_from_account_id',
        'receipt_number',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'base_salary'       => 'float',
        'allowances'        => 'float',
        'deductions'        => 'float',
        'gross_salary'      => 'float',   // ✅ اضافه شد
        'tax_amount'        => 'float',   // ✅ اضافه شد
        'insurance_amount'  => 'float',   // ✅ اضافه شد
        'advance_deduction' => 'float',
        'net_salary'        => 'float',
        'paid_amount'       => 'float',
        'payment_date'      => 'date',
    ];

    // ============================================================
    // Relationships
    // ============================================================

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function account()
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id');
    }

    public function period()
    {
        return $this->belongsTo(PayrollPeriod::class, 'period_id');
    }

    public function salaryInfo()
    {
        return $this->belongsTo(EmployeeSalaryInfo::class, 'salary_info_id');
    }

    public function paidFromAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'paid_from_account_id');
    }

    // ============================================================
    // Accessors
    // ============================================================

    public function getEmployeeNameAttribute(): string
    {
        if ($this->user_id) {
            return $this->user->name ?? '—';
        }
        return $this->account->account_name ?? '—';
    }

    public function getEmployeeSourceAttribute(): string
    {
        return $this->user_id ? 'user' : 'account';
    }

    public function getRemainingAmountAttribute(): float
    {
        return (float) $this->net_salary - (float) $this->paid_amount;
    }

    /**
     * ✅ خروجی مطابق SalaryPayment.jsx — با tax و insurance
     */
    public function toFrontendArray(): array
    {
        $sourceLabel = '—';
        if ($this->user_id && $this->user) {
            $sourceLabel = $this->user->role ?? 'کاربر';
        } elseif ($this->account_id) {
            $sourceLabel = 'طرف‌حساب';
        }

        $gross = (float) ($this->gross_salary
            ?? ((float) $this->base_salary + (float) $this->allowances));

        return [
            'id'               => $this->id,
            'source'           => $this->employee_source,
            'sourceLabel'      => $sourceLabel,
            'userId'           => $this->user_id,
            'accountId'        => $this->account_id,
            'fullName'         => $this->employee_name,
            'department'       => $this->user->department->name
                                  ?? $this->account->account_code
                                  ?? '—',
            'employeeCode'     => $this->salaryInfo->employee_code
                                  ?? $this->account->account_code
                                  ?? null,
            'baseSalary'       => (float) $this->base_salary,
            'allowances'       => (float) $this->allowances,
            'deductions'       => (float) $this->deductions,

            // ✅ فیلدهای کلیدی برای نمایش
            'tax'              => (float) ($this->tax_amount ?? 0),
            'insurance'        => (float) ($this->insurance_amount ?? 0),
            'advanceDeduction' => (float) $this->advance_deduction,

            'grossSalary'      => $gross,
            'netSalary'        => (float) $this->net_salary,
            'paidAmount'       => (float) $this->paid_amount,
            'remaining'        => $this->remaining_amount,
            'paymentStatus'    => $this->payment_status,
            'paymentDate'      => $this->payment_date?->format('Y-m-d'),
            'paymentMethod'    => $this->payment_method,
            'receiptNumber'    => $this->receipt_number,
            'notes'            => $this->notes,
            'paid'             => $this->payment_status === 'paid',
        ];
    }
}