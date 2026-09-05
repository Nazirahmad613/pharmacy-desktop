<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyFee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'created_by',
        'radiology_request_id',
        'amount',
        'paid_amount',
        'discount',
        'payment_method',
        'description',
        'note',
        'payment_status',
        'barcode',
        'receipt_number',
        'paid_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'paid_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============ روابط ============
    
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function radiologyRequest()
    {
        return $this->belongsTo(RadiologyRequest::class, 'radiology_request_id');
    }

    // ============ متدهای کمکی ============
    
    public function getRemainingAmountAttribute()
    {
        return $this->amount - $this->paid_amount - $this->discount;
    }

    public function getPaymentStatusLabelAttribute()
    {
        return [
            'pending' => 'در انتظار پرداخت',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت کامل',
        ][$this->payment_status] ?? $this->payment_status;
    }

    public function getPaymentStatusColorAttribute()
    {
        return [
            'pending' => '#f59e0b',
            'partial' => '#f97316',
            'paid' => '#22c55e',
        ][$this->payment_status] ?? '#6b7280';
    }

    public function getMethodLabelAttribute()
    {
        return [
            'cash' => 'نقدی',
            'card' => 'کارت بانکی',
            'online' => 'آنلاین',
            'insurance' => 'بیمه',
        ][$this->payment_method] ?? $this->payment_method;
    }

    public function generateBarcode()
    {
        return 'RADFEE' . now()->format('YmdHis') . strtoupper(substr(uniqid(), -6));
    }

    public function generateReceiptNumber()
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $count = self::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count() + 1;
        return 'RADFEE-' . $year . $month . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    public function updatePaymentStatus()
    {
        $remaining = $this->amount - $this->paid_amount - $this->discount;
        
        if ($remaining <= 0) {
            $this->payment_status = 'paid';
            $this->paid_date = now();
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }
        
        $this->save();
    }
}