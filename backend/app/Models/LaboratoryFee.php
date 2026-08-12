<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaboratoryFee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reg_id',           // ← اینجا reg_id است نه registration_id
        'patient_id',
        'laboratory_request_id',
        'amount',
        'paid_amount',
        'discount',
        'payment_method',
        'payment_status',
        'description',
        'note',
        'barcode',
        'remaining_amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    // ✅ Relationship با Registrations با استفاده از reg_id
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
        //                          مدل مقصد      , کلید خارجی  , کلید محلی
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function laboratoryRequest()
    {
        return $this->belongsTo(LaboratoryRequest::class);
    }

    public function qrCode()
    {
        return $this->hasOne(QRCode::class, 'laboratory_fee_id');
    }

    // Accessors
    public function getPaymentStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار پرداخت',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت کامل',
            'refunded' => 'برگشت داده شده',
            'cancelled' => 'لغو شده',
        ];

        return $labels[$this->payment_status] ?? $this->payment_status;
    }

    public function getPaymentMethodLabelAttribute()
    {
        $methods = [
            'cash' => 'نقدی',
            'card' => 'کارت بانکی',
            'online' => 'آنلاین',
            'insurance' => 'بیمه',
        ];

        return $methods[$this->payment_method] ?? $this->payment_method;
    }

    // ✅ محاسبه مبلغ باقیمانده
    public function getRemainingAmountAttribute()
    {
        $discountAmount = $this->amount * ($this->discount / 100);
        return $this->amount - $this->paid_amount - $discountAmount;
    }
}