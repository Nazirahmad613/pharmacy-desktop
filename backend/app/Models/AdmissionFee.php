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
        // ارتباطات
        'admission_request_id',
        'reg_id',
        'patient_id',
        'doctor_id',
        
        // اطلاعات فیس
        'fee_date',
        'fee_time',
        'amount',
        'paid_amount',
        'discount',
        'discount_percent',
        'remaining_amount',
        
        // نوع و دوره
        'fee_type',
        'period',
        'day_number',
        
        // توضیحات
        'description',
        'notes',
        
        // شماره رسید و روش پرداخت
        'receipt_number',
        'payment_method',
        
        // وضعیت و دریافت کننده
        'status',
        'collected_by',
        'collected_at',
        
        // اطلاعات پرینت
        'print_count',
        'last_printed_at'
    ];

    protected $casts = [
        'fee_date' => 'date',
        'fee_time' => 'datetime:H:i:s',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'day_number' => 'integer',
        'collected_at' => 'datetime',
        'last_printed_at' => 'datetime',
        'print_count' => 'integer'
    ];

    // ============ روابط ============
    
    /**
     * ارتباط با درخواست بستری
     */
    public function admissionRequest()
    {
        return $this->belongsTo(AdmissionRequest::class, 'admission_request_id');
    }

    /**
     * ارتباط با مراجعه (از طریق reg_id)
     */
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    /**
     * ارتباط با بیمار
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * ✅ ارتباط با پزشک (دکتر)
     * این رابطه برای دریافت اطلاعات پزشک معالج استفاده می‌شود
     */
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * ارتباط با دریافت کننده (کاربر)
     */
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

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeRefunded($query)
    {
        return $query->where('status', 'refunded');
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

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
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

    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    public function scopeNeedsAlert($query)
    {
        return $query->where('status', 'pending')
                     ->where('created_at', '<=', now()->subHours(24));
    }

    // ============ متدهای کمکی (Accessors) ============
    
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

    /**
     * محاسبه مبلغ باقی‌مانده
     */
    public function getRemainingAmountAttribute()
    {
        $discountAmount = ($this->amount ?? 0) * (($this->discount_percent ?? 0) / 100);
        return max(0, ($this->amount ?? 0) - ($this->paid_amount ?? 0) - $discountAmount);
    }

    /**
     * محاسبه مبلغ پس از تخفیف
     */
    public function getAmountAfterDiscountAttribute()
    {
        $discountAmount = ($this->amount ?? 0) * (($this->discount_percent ?? 0) / 100);
        return max(0, ($this->amount ?? 0) - $discountAmount);
    }

    /**
     * آیا فیس پرداخت شده است؟
     */
    public function getIsPaidAttribute()
    {
        return $this->status === 'paid';
    }

    /**
     * آیا فیس قابل دریافت است؟
     */
    public function getCanBeCollectedAttribute()
    {
        return $this->status === 'pending' && 
               $this->admissionRequest && 
               $this->admissionRequest->status === 'admitted';
    }

    /**
     * مبلغ فرمت شده
     */
    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 2);
    }

    public function getFormattedPaidAmountAttribute()
    {
        return number_format($this->paid_amount, 2);
    }

    public function getFormattedRemainingAttribute()
    {
        return number_format($this->remaining_amount, 2);
    }

    public function getFormattedDiscountAttribute()
    {
        return number_format($this->discount, 2);
    }

    // ============ متدهای عملیاتی ============
    
    /**
     * علامت‌گذاری به عنوان پرداخت شده
     */
    public function markAsPaid($collectedBy = null)
    {
        $this->update([
            'status' => 'paid',
            'collected_by' => $collectedBy ?? auth()->id(),
            'collected_at' => now(),
            'remaining_amount' => 0
        ]);

        if ($this->admissionRequest) {
            $this->admissionRequest->increment('paid_amount', $this->amount);
            
            $remaining = $this->admissionRequest->amount - $this->admissionRequest->paid_amount;
            if ($remaining <= 0) {
                $this->admissionRequest->update(['payment_status' => 'paid']);
            } else {
                $this->admissionRequest->update(['payment_status' => 'partial']);
            }
        }
    }

    /**
     * علامت‌گذاری به عنوان دریافت شده
     */
    public function markAsCollected($collectorId = null)
    {
        $this->update([
            'collected_by' => $collectorId ?? auth()->id(),
            'collected_at' => now()
        ]);
    }

    /**
     * افزایش تعداد پرینت
     */
    public function incrementPrintCount()
    {
        $this->increment('print_count');
        $this->update(['last_printed_at' => now()]);
    }

    /**
     * برگشت فیس
     */
    public function refund()
    {
        $this->update(['status' => 'refunded']);
        
        if ($this->admissionRequest) {
            $this->admissionRequest->decrement('paid_amount', $this->amount);
            $this->admissionRequest->update(['payment_status' => 'pending']);
        }
    }

    /**
     * لغو فیس
     */
    public function cancel()
    {
        $this->update(['status' => 'cancelled']);
    }

    /**
     * محاسبه و به‌روزرسانی مبلغ باقی‌مانده
     */
    public function calculateAndUpdateRemaining()
    {
        $discountAmount = ($this->amount ?? 0) * (($this->discount_percent ?? 0) / 100);
        $remaining = max(0, ($this->amount ?? 0) - ($this->paid_amount ?? 0) - $discountAmount);
        $this->update(['remaining_amount' => $remaining]);
        return $remaining;
    }
}