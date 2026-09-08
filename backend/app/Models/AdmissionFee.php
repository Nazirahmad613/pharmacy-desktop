<?php
// app/Models/AdmissionFee.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionFee extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'admission_fees';

    protected $fillable = [
        'admission_request_id',
        'reg_id',
        'patient_id',
        'doctor_id',
        'fee_date',
        'fee_time',
        'amount',
        'paid_amount',
        'discount',
        'remaining_amount',
        'fee_type',
        'period',
        'day_number',
        'description',
        'notes',
        'receipt_number',
        'payment_method',
        'status',
        'collected_by',
        'collected_at',
        'print_count',
        'last_printed_at'
    ];

    protected $casts = [
        'fee_date' => 'date',
        'fee_time' => 'datetime:H:i:s',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'day_number' => 'integer',
        'collected_at' => 'datetime',
        'last_printed_at' => 'datetime',
        'print_count' => 'integer'
    ];

    // ============ روابط ============
    
    public function admissionRequest()
    {
        return $this->belongsTo(AdmissionRequest::class);
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    // ============ اسکوپ‌ها ============
    
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByAdmission($query, $admissionId)
    {
        return $query->where('admission_request_id', $admissionId);
    }

    public function scopeByRegId($query, $regId)
    {
        return $query->where('reg_id', $regId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('fee_date', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('fee_date', [now()->startOfWeek(), now()->endOfWeek()]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('fee_date', now()->month)
                     ->whereYear('fee_date', now()->year);
    }

    // ============ متدهای کمکی ============
    
    public function getRemainingAmountAttribute()
    {
        $discountAmount = ($this->amount ?? 0) * (($this->discount ?? 0) / 100);
        return ($this->amount ?? 0) - ($this->paid_amount ?? 0) - $discountAmount;
    }

    public function getIsPaidAttribute()
    {
        return $this->status === 'paid';
    }

    public function getCanBeCollectedAttribute()
    {
        return $this->status === 'pending' && 
               $this->admissionRequest && 
               $this->admissionRequest->status === 'admitted';
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'paid' => 'پرداخت شده',
            'cancelled' => 'لغو شده',
            'refunded' => 'بازگشت داده شده'
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getPaymentMethodLabelAttribute()
    {
        $labels = [
            'cash' => 'نقدی',
            'card' => 'کارت بانکی',
            'bank_transfer' => 'انتقال بانکی',
            'insurance' => 'بیمه',
            'online' => 'آنلاین'
        ];
        return $labels[$this->payment_method] ?? $this->payment_method;
    }

    public function getPeriodLabelAttribute()
    {
        $labels = [
            'morning' => 'صبح',
            'evening' => 'عصر',
            'night' => 'شب',
            'full_day' => 'کامل'
        ];
        return $labels[$this->period] ?? $this->period;
    }

    public function getFeeTypeLabelAttribute()
    {
        $labels = [
            'daily' => 'روزانه',
            'weekly' => 'هفتگی',
            'monthly' => 'ماهانه',
            'custom' => 'سفارشی'
        ];
        return $labels[$this->fee_type] ?? $this->fee_type;
    }

    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 2);
    }

    // ============ متدهای عملیاتی ============
    
    public function markAsPaid($collectedBy = null)
    {
        $this->update([
            'status' => 'paid',
            'collected_by' => $collectedBy ?? auth()->id(),
            'collected_at' => now()
        ]);

        // به‌روزرسانی admission_request
        if ($this->admissionRequest) {
            $this->admissionRequest->increment('fee_paid', $this->amount);
            
            $remaining = $this->admissionRequest->fee_amount - $this->admissionRequest->fee_paid;
            if ($remaining <= 0) {
                $this->admissionRequest->update(['fee_status' => 'paid']);
            } else {
                $this->admissionRequest->update(['fee_status' => 'partial']);
            }
        }
    }

    public function markAsCollected($collectorId = null)
    {
        $this->update([
            'collected_by' => $collectorId ?? auth()->id(),
            'collected_at' => now()
        ]);
    }

    public function incrementPrintCount()
    {
        $this->increment('print_count');
        $this->update(['last_printed_at' => now()]);
    }

    public function refund()
    {
        $this->update(['status' => 'refunded']);
        
        // برگرداندن مبلغ به admission_request
        if ($this->admissionRequest) {
            $this->admissionRequest->decrement('fee_paid', $this->amount);
            $this->admissionRequest->update(['fee_status' => 'pending']);
        }
    }

    public function cancel()
    {
        $this->update(['status' => 'cancelled']);
    }
}