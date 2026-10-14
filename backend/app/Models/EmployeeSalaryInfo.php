<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmployeeSalaryInfo extends Model
{
    use HasFactory;

    protected $table = 'employee_salary_info';
    public $timestamps = true;

    // ✅ account_id اضافه شد
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

    protected $casts = [
        'base_salary' => 'float',
        'allowances'  => 'float',
        'deductions'  => 'float',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // ============================================================
    // Relationships
    // ============================================================

    /**
     * کاربر (کارمند از users)
     */
    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    /**
     * ✅ طرف‌حساب (کارمند از accounts)
     * این رابطه کلید حل خطای «Call to undefined relationship [account]» است
     */
    public function account()
    {
        return $this->belongsTo(\App\Models\Account::class, 'account_id');
    }

    /**
     * حساب بانکی (طرف‌حساب بانکی)
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

    /**
     * ✅ نام کامل (از user یا account)
     */
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

    /**
     * ✅ منبع (user | account)
     */
    public function getSourceAttribute(): string
    {
        return $this->user_id ? 'user' : 'account';
    }

    /**
     * ✅ برچسب منبع
     */
    public function getSourceLabelAttribute(): string
    {
        return $this->user_id ? 'کاربر سیستم' : 'کارمند طرف‌حساب';
    }

    /**
     * ✅ بخش / دیپارتمنت
     */
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