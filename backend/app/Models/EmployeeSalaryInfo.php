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
        'account_id',
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

    /**
     * ✅ استفاده از decimal برای دقت مالی (اختیاری ولی بهتر)
     */
    protected $casts = [
        'base_salary' => 'decimal:2',
        'allowances'  => 'decimal:2',
        'deductions'  => 'decimal:2',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
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

    public function bankAccount()
    {
        return $this->belongsTo(\App\Models\Account::class, 'bank_account_id');
    }

    /**
     * ✅ معاشات ماهانه این کارمند (شامل tax/insurance چون در مدل Salary اضافه شدند)
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

    public function getFullNameAttribute(): string
    {
        if ($this->user_id && $this->user) {
            return $this->user->name ?? '—';
        }
        if ($this->account_id && $this->account) {
            return $this->account->account_name ?? '—';
        }
        return '—';
    }

    public function getSourceAttribute(): string
    {
        return $this->user_id ? 'user' : 'account';
    }

    public function getSourceLabelAttribute(): string
    {
        return $this->user_id ? 'کاربر سیستم' : 'کارمند طرف‌حساب';
    }

    public function getDepartmentNameAttribute(): string
    {
        if ($this->user_id && $this->user) {
            return $this->user->department->name ?? '—';
        }
        if ($this->account_id && $this->account) {
            return $this->account->account_code ?? '—';
        }
        return '—';
    }
}