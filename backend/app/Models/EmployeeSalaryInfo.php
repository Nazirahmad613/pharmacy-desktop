<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmployeeSalaryInfo extends Model
{
    use HasFactory;

    protected $table = 'employee_salary_info';
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'employee_code',
        'base_salary',
        'allowances',
        'deductions',
        'bank_account_id',
        'bank_account_number',
        'hire_date',
        'salary_status',
        'notes',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'allowances'  => 'float',
        'deductions'  => 'float',
    ];

    // ============================================================
    // Relationships
    // ============================================================

    /**
     * کاربر (کارمند)
     */
    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    /**
     * حساب بانکی (طرف‌حساب)
     */
    public function bankAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'bank_account_id');
    }

    /**
     * معاشات ماهانه این کارمند
     */
    public function salaries()
    {
        return $this->hasMany(EmployeeSalary::class, 'salary_info_id');
    }

    // ============================================================
    // Accessors
    // ============================================================

    public function getStatusLabelAttribute(): string
    {
        return match ($this->salary_status) {
            'active'     => 'فعال',
            'suspended'  => 'معلق',
            'terminated' => 'خاتمه یافته',
            default      => '—',
        };
    }
}