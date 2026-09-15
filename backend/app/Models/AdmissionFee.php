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
        // ============ ارتباطات ============
        'admission_request_id',
        'reg_id',
        'patient_id',
        'doctor_id',
        
        // ============ اطلاعات فیس ============
        'fee_date',
        'fee_time',
        'amount',
        'paid_amount',
        'discount',           // ⭐ مبلغ تخفیف (محاسبه‌شده یا دستی)
        'discount_percent',   // ⭐ درصد تخفیف
        'remaining_amount',
        
        // ============ نوع و دوره ============
        'fee_type',
        'period',
        'day_number',
        
        // ============ توضیحات ============
        'description',
        'notes',
        
        // ============ رسید و پرداخت ============
        'receipt_number',
        'payment_method',
        
        // ============ وضعیت و دریافت ============
        'status',
        'collected_by',
        'collected_at',
        
        // ============ پرینت ============
        'print_count',
        'last_printed_at',
    ];

    protected $casts = [
        'fee_date' => 'date',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'day_number' => 'integer',
        'collected_at' => 'datetime',
        'last_printed_at' => 'datetime',
        'print_count' => 'integer',
    ];

    protected $appends = [
        'status_label',
        'payment_method_label',
        'period_label',
        'fee_type_label',
        'is_paid',
        'is_pending',
        'is_cancelled',
        'is_refunded',
        'is_fully_paid',
        'discount_percent_value',
    ];

    // ============ Boot: محاسبه خودکار در هر save ============
    
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($fee) {
            // ⭐ اگر discount_percent وارد شده، discount را محاسبه کن
            if ($fee->discount_percent > 0) {
                $fee->discount = ($fee->amount * $fee->discount_percent) / 100;
            }
            // اگر discount_percent صفر است، discount دستی نگه داشته می‌شود

            // ⭐ محاسبه remaining_amount
            $remaining = $fee->amount - $fee->paid_amount - $fee->discount;
            $fee->remaining_amount = max(0, $remaining);

            // ⭐ تولید شماره رسید اگر وجود ندارد
            if (empty($fee->receipt_number)) {
                $fee->receipt_number = self::generateReceiptNumber();
            }
        });
    }

    /**
     * تولید شماره رسید یکتا
     */
    public static function generateReceiptNumber()
    {
        $prefix = 'FEE';
        $date = now()->format('Ymd');
        
        $lastFee = self::whereDate('created_at', today())
            ->latest('id')
            ->first();
        
        $sequence = 1;
        if ($lastFee && $lastFee->receipt_number) {
            $parts = explode('-', $lastFee->receipt_number);
            $lastSequence = intval(end($parts));
            $sequence = $lastSequence + 1;
        }
        
        return $prefix . '-' . $date . '-' . str_pad($sequence, 6, '0', STR_PAD_LEFT);
    }

    // ============ روابط ============

    public function admissionRequest()
    {
        return $this->belongsTo(AdmissionRequest::class, 'admission_request_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
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
        return $query->whereBetween('fee_date', [
            now()->startOfWeek(), 
            now()->endOfWeek()
        ]);
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

    public function scopeWithRemaining($query)
    {
        return $query->where('remaining_amount', '>', 0);
    }

    public function scopeNeedsAlert($query)
    {
        return $query->where('status', 'pending')
                     ->where('remaining_amount', '>', 0)
                     ->where('created_at', '<=', now()->subHours(24));
    }

    // ============ Accessors ============

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'paid' => 'پرداخت شده',
            'cancelled' => 'لغو شده',
            'refunded' => 'بازگشت داده شده',
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
            'online' => 'آنلاین',
        ];
        return $labels[$this->payment_method] ?? $this->payment_method;
    }

    public function getPeriodLabelAttribute()
    {
        $labels = [
            'morning' => 'صبح',
            'evening' => 'عصر',
            'night' => 'شب',
            'full_day' => 'کامل',
        ];
        return $labels[$this->period] ?? $this->period;
    }

    public function getFeeTypeLabelAttribute()
    {
        $labels = [
            'daily' => 'روزانه',
            'weekly' => 'هفتگی',
            'monthly' => 'ماهانه',
            'custom' => 'سفارشی',
        ];
        return $labels[$this->fee_type] ?? $this->fee_type;
    }

    /**
     * ⭐ درصد تخفیف - اگر discount_percent صفر باشد اما discount مقدار داشته باشد، محاسبه می‌کند
     */
    public function getDiscountPercentValueAttribute()
    {
        if ($this->discount_percent > 0) {
            return (float) $this->discount_percent;
        }
        
        if ($this->amount > 0 && $this->discount > 0) {
            return round(($this->discount / $this->amount) * 100, 2);
        }
        
        return 0;
    }

    /**
     * مبلغ پس از تخفیف
     */
    public function getAmountAfterDiscountAttribute()
    {
        return max(0, ($this->amount ?? 0) - ($this->discount ?? 0));
    }

    public function getIsPaidAttribute()
    {
        return $this->status === 'paid';
    }

    public function getIsPendingAttribute()
    {
        return $this->status === 'pending';
    }

    public function getIsCancelledAttribute()
    {
        return $this->status === 'cancelled';
    }

    public function getIsRefundedAttribute()
    {
        return $this->status === 'refunded';
    }

    /**
     * آیا فیس کامل پرداخت شده؟
     */
    public function getIsFullyPaidAttribute()
    {
        return $this->remaining_amount <= 0;
    }

    /**
     * آیا فیس قابل دریافت است؟
     * ⭐ حالا برای بیمار ترخیص شده هم قابل دریافت است (فقط لغو شده ممنوع)
     */
    public function getCanBeCollectedAttribute()
    {
        if ($this->status !== 'pending') {
            return false;
        }
        
        if (!$this->admissionRequest) {
            return false;
        }
        
        // فقط برای درخواست‌های لغو شده ممنوع است
        return $this->admissionRequest->status !== 'cancelled';
    }

    // ============ Formatted Accessors ============

    public function getFormattedAmountAttribute()
    {
        return number_format((float) $this->amount, 2);
    }

    public function getFormattedPaidAmountAttribute()
    {
        return number_format((float) $this->paid_amount, 2);
    }

    public function getFormattedRemainingAttribute()
    {
        return number_format((float) $this->remaining_amount, 2);
    }

    public function getFormattedDiscountAttribute()
    {
        return number_format((float) $this->discount, 2);
    }

    // ============ متدهای عملیاتی ============

    /**
     * دریافت فیس - تغییر وضعیت به paid
     * 
     * @param int|null $collectedBy
     */
    public function collect($collectedBy = null)
    {
        $remainingAmount = $this->remaining_amount;
        
        $this->update([
            'status' => 'paid',
            'paid_amount' => (float) $this->amount - (float) $this->discount,
            'remaining_amount' => 0,
            'collected_by' => $collectedBy ?? auth()->id(),
            'collected_at' => now(),
        ]);
        
        return $this;
    }

    /**
     * علامت‌گذاری به عنوان پرداخت شده (نام قدیمی برای سازگاری)
     */
    public function markAsPaid($collectedBy = null)
    {
        return $this->collect($collectedBy);
    }

    /**
     * علامت‌گذاری به عنوان دریافت شده
     */
    public function markAsCollected($collectorId = null)
    {
        $this->update([
            'collected_by' => $collectorId ?? auth()->id(),
            'collected_at' => now(),
        ]);
        
        return $this;
    }

    /**
     * افزایش تعداد پرینت
     */
    public function incrementPrintCount()
    {
        $this->increment('print_count');
        $this->update(['last_printed_at' => now()]);
        
        return $this;
    }

    /**
     * نام مستعار برای incrementPrintCount
     */
    public function incrementPrint()
    {
        return $this->incrementPrintCount();
    }

    /**
     * بازگشت فیس
     */
    public function refund()
    {
        $this->update(['status' => 'refunded']);
        
        return $this;
    }

    /**
     * لغو فیس
     */
    public function cancel()
    {
        $this->update(['status' => 'cancelled']);
        
        return $this;
    }

    /**
     * محاسبه و به‌روزرسانی مبلغ باقی‌مانده
     */
    public function calculateAndUpdateRemaining()
    {
        $discountAmount = $this->discount;
        $remaining = max(0, ($this->amount ?? 0) - ($this->paid_amount ?? 0) - $discountAmount);
        $this->update(['remaining_amount' => $remaining]);
        
        return $remaining;
    }

    /**
     * محاسبه مبلغ باقی‌مانده بدون ذخیره
     */
    public function calculateRemaining()
    {
        return max(0, ($this->amount ?? 0) - ($this->paid_amount ?? 0) - ($this->discount ?? 0));
    }
}