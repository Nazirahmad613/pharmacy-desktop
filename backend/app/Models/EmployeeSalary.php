<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmployeeSalary extends Model
{
    use HasFactory;

    protected $table = 'employee_salaries';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'period_id',
        'salary_info_id',
        'base_salary',
        'allowances',
        'deductions',
        'advance_deduction',
        'net_salary',
        'payment_status',
        'payment_date',
        'payment_method',
        'payment_account_id',
        'receipt_number',
        'notes',
    ];

    protected $casts = [
        'base_salary'       => 'float',
        'allowances'        => 'float',
        'deductions'        => 'float',
        'advance_deduction' => 'float',
        'net_salary'        => 'float',
        'payment_date'      => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function period()
    {
        return $this->belongsTo(PayrollPeriod::class, 'period_id');
    }

    public function salaryInfo()
    {
        return $this->belongsTo(PayrollModel::class, 'salary_info_id');
    }

    /**
     * خروجی مطابق SalaryPayment.jsx
     */
    public function toFrontendArray(): array
    {
        $user = $this->user;

        return [
            'id'            => $this->id,
            'employeeId'    => $this->user_id,
            'fullName'      => $user->full_name ?? $user->name ?? '',
            'department'    => $user->department->name ?? '',
            'baseSalary'    => (float) $this->base_salary,
            'allowances'    => (float) $this->allowances,
            'deductions'    => (float) $this->deductions,
            'advance'       => (float) $this->advance_deduction,
            'netSalary'     => (float) $this->net_salary,
            'paid'          => $this->payment_status === 'paid',
            'status'        => $this->payment_status,
            'paymentDate'   => $this->payment_date?->format('Y-m-d'),
            'receiptNumber' => $this->receipt_number,
        ];
    }
}