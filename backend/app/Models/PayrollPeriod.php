<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    protected $table = 'payroll_periods';

    public $timestamps = true;

    /*
    |--------------------------------------------------------------------------
    | Mass Assignment
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'period_month',
        'period_year',
        'status',
        'total_amount',
        'paid_amount',
    ];

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    |
    | ✅ استفاده از decimal:2 به جای float
    | دلیل: فیلدهای مالی باید دقیق باشند. float در محاسبات بزرگ
    | دچار خطای گردکردن می‌شود.
    |
    */

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount'  => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ معاش‌های این دوره
     */
    public function salaries(): HasMany
    {
        return $this->hasMany(EmployeeSalary::class, 'period_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Static Methods
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ پیدا کردن یا ساختن دوره
     */
    public static function findOrCreate(string $month, string $year): self
    {
        return static::firstOrCreate(
            [
                'period_month' => $month,
                'period_year'  => $year,
            ],
            [
                'status'       => 'open',
                'total_amount' => 0,
                'paid_amount'  => 0,
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Business Logic
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ بازمحاسبه مجموع‌ها
     *
     * - total_amount = مجموع معاش خالص همه کارمندان
     * - paid_amount  = مجموع مبالغ پرداخت‌شده (paid_amount در employee_salaries)
     *
     * نکته: حالا که پرداخت جزئی (partial) داریم، از sum('paid_amount')
     * استفاده می‌کنیم نه فقط وضعیت 'paid'.
     */
    public function recalcTotals(): void
    {
        $total = (float) $this->salaries()->sum('net_salary');
        $paid  = (float) $this->salaries()->sum('paid_amount');

        $this->update([
            'total_amount' => $total,
            'paid_amount'  => $paid,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeForYear($query, string $year)
    {
        return $query->where('period_year', $year);
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ نام کامل دوره (مثلاً: حمل 1404)
     */
    public function getNameAttribute(): string
    {
        return trim("{$this->period_month} {$this->period_year}");
    }

    /**
     * ✅ مبلغ باقی‌مانده
     */
    public function getRemainingAmountAttribute(): float
    {
        return max(0, (float) $this->total_amount - (float) $this->paid_amount);
    }

    /**
     * ✅ درصد پیشرفت پرداخت
     */
    public function getPaymentProgressAttribute(): int
    {
        $total = (float) $this->total_amount;
        if ($total <= 0) return 0;

        return (int) round(((float) $this->paid_amount / $total) * 100);
    }
}