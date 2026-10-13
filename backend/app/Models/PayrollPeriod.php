<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollPeriod extends Model
{
    protected $table = 'payroll_periods';
    public $timestamps = true;

    protected $fillable = [
        'period_month',
        'period_year',
        'status',
        'total_amount',
        'paid_amount',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'paid_amount'  => 'float',
    ];

    public function salaries()
    {
        return $this->hasMany(EmployeeSalary::class, 'period_id');
    }

    public static function findOrCreate(string $month, string $year): self
    {
        return static::firstOrCreate(
            ['period_month' => $month, 'period_year' => $year],
            ['status' => 'open']
        );
    }

    public function recalcTotals(): void
    {
        $total = (float) $this->salaries()->sum('net_salary');
        $paid  = (float) $this->salaries()
            ->where('payment_status', 'paid')
            ->sum('net_salary');

        $this->update([
            'total_amount' => $total,
            'paid_amount'  => $paid,
        ]);
    }
}