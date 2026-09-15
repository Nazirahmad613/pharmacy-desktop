<?php
// app/Models/AdmissionRequest.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'admission_requests';

    protected $fillable = [
        // ============ ارتباطات ============
        'reg_id',
        'patient_id',
        'doctor_id',
        'ward_id',
        'bed_id',
        
        // ============ موقعیت ============
        'location',
        'room_number',
        'bed_number',
        
        // ============ تاریخ‌ها ============
        'admission_date',
        'admission_type',
        'request_date',
        
        // ============ ترخیص ============
        'discharge_date',
        'discharge_time',
        'discharge_type',
        'discharge_reason',
        'discharge_notes',
        'discharged_by_user_id',
        'discharged_at',
        'cancelled_at',
        
        // ============ اطلاعات بالینی ============
        'diagnosis',
        'admission_instructions',
        'special_notes',
        
        // ============ وضعیت ============
        'status',
        'priority',
        
        // ============ هشدار فیس ============
        'last_fee_alert_at',
        'fee_alert_count',
        
        // ============ تکمیل ============
        'completed_at',
    ];

    protected $casts = [
        'admission_date' => 'date',
        'request_date' => 'datetime',
        'discharge_date' => 'date',
        'discharged_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_fee_alert_at' => 'datetime',
        'fee_alert_count' => 'integer',
    ];

    protected $appends = [
        'status_label',
        'priority_label',
        'is_discharged',
        'is_admitted',
        'is_pending',
        'is_cancelled',
        'is_completed',
        'days_admitted',
        'ward_name',
        'doctor_name',
        'patient_name',
        'discharge_type_label',
        'admission_type_label',
    ];

    // ============ روابط ============

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

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function bed()
    {
        return $this->belongsTo(Bed::class);
    }

    public function dischargedBy()
    {
        return $this->belongsTo(User::class, 'discharged_by_user_id');
    }

    public function fees()
    {
        return $this->hasMany(AdmissionFee::class, 'admission_request_id');
    }

    public function paidFees()
    {
        return $this->hasMany(AdmissionFee::class, 'admission_request_id')
            ->where('status', 'paid');
    }

    public function pendingFees()
    {
        return $this->hasMany(AdmissionFee::class, 'admission_request_id')
            ->where('status', 'pending');
    }

    public function alerts()
    {
        return $this->hasMany(AdmissionFeeAlert::class, 'admission_request_id');
    }

    // ============ اسکوپ‌ها ============

    public function scopeActive($query)
    {
        return $query->where('status', 'admitted')
                     ->whereNull('discharge_date');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeDischarged($query)
    {
        return $query->where('status', 'discharged')
                     ->orWhereNotNull('discharge_date');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeByWard($query, $wardId)
    {
        return $query->where('ward_id', $wardId);
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByRegId($query, $regId)
    {
        return $query->where('reg_id', $regId);
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority', 'high');
    }

    public function scopeNeedsFeeAlert($query)
    {
        return $query->where('status', 'admitted')
            ->whereNull('discharge_date')
            ->where(function($q) {
                $q->whereNull('last_fee_alert_at')
                  ->orWhere('last_fee_alert_at', '<=', now()->subHours(24));
            });
    }

    public function scopeToday($query)
    {
        return $query->whereDate('admission_date', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('admission_date', [
            now()->startOfWeek(), 
            now()->endOfWeek()
        ]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('admission_date', now()->month)
                     ->whereYear('admission_date', now()->year);
    }

    // ============ Accessors (ویژگی‌های محاسبه‌شده) ============

    /**
     * برچسب وضعیت به فارسی
     */
    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'admitted' => 'بستری',
            'discharged' => 'ترخیص شده',
            'cancelled' => 'لغو شده',
            'completed' => 'معالجه ختم شده',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    /**
     * برچسب اولویت به فارسی
     */
    public function getPriorityLabelAttribute()
    {
        $labels = [
            'high' => 'بالا',
            'medium' => 'متوسط',
            'normal' => 'معمولی',
            'low' => 'پایین',
        ];
        return $labels[$this->priority] ?? $this->priority;
    }

    /**
     * برچسب نوع ترخیص
     */
    public function getDischargeTypeLabelAttribute()
    {
        $labels = [
            'regular' => 'ترخیص عادی',
            'against_advice' => 'ترخیص با رضایت شخصی',
            'transferred' => 'انتقال به مرکز دیگر',
            'deceased' => 'فوت',
            'escaped' => 'فرار از بیمارستان',
        ];
        return $labels[$this->discharge_type] ?? $this->discharge_type;
    }

    /**
     * برچسب نوع بستری
     */
    public function getAdmissionTypeLabelAttribute()
    {
        $labels = [
            'emergency' => 'اورژانسی',
            'planned' => 'برنامه‌ریزی شده',
            'elective' => 'اختیاری',
            'transfer' => 'انتقالی',
        ];
        return $labels[$this->admission_type] ?? $this->admission_type;
    }

    /**
     * آیا بیمار ترخیص شده است؟
     * ⭐ این accessor کلیدی است که Frontend از آن استفاده می‌کند
     */
    public function getIsDischargedAttribute()
    {
        return $this->status === 'discharged' 
               || $this->discharge_date !== null 
               || $this->discharged_at !== null;
    }

    /**
     * آیا بیمار بستری فعال است؟
     */
    public function getIsAdmittedAttribute()
    {
        return $this->status === 'admitted' && !$this->is_discharged;
    }

    /**
     * آیا بیمار در انتظار است؟
     */
    public function getIsPendingAttribute()
    {
        return $this->status === 'pending';
    }

    /**
     * آیا لغو شده است؟
     */
    public function getIsCancelledAttribute()
    {
        return $this->status === 'cancelled';
    }

    /**
     * آیا معالجه ختم شده است؟
     */
    public function getIsCompletedAttribute()
    {
        return $this->completed_at !== null;
    }

    /**
     * تعداد روزهای بستری
     */
    public function getDaysAdmittedAttribute()
    {
        if (!$this->admission_date) return 0;
        
        $endDate = $this->discharge_date 
                   ?? $this->discharged_at 
                   ?? now();
        
        return $this->admission_date->diffInDays($endDate) + 1;
    }

    /**
     * نام بخش
     */
    public function getWardNameAttribute()
    {
        return $this->ward?->name;
    }

    /**
     * نام پزشک
     */
    public function getDoctorNameAttribute()
    {
        return $this->doctor?->name;
    }

    /**
     * نام بیمار
     */
    public function getPatientNameAttribute()
    {
        if ($this->patient) {
            return $this->patient->full_name 
                   ?? (($this->patient->first_name ?? '') . ' ' . ($this->patient->last_name ?? ''));
        }
        return null;
    }

    /**
     * موقعیت کامل (location | room | bed)
     */
    public function getFullLocationAttribute()
    {
        $parts = [];
        if ($this->location) $parts[] = $this->location;
        if ($this->room_number) $parts[] = "اتاق: {$this->room_number}";
        if ($this->bed_number) $parts[] = "تخت: {$this->bed_number}";
        
        if (empty($parts) && $this->bed) {
            if ($this->bed->bed_number) {
                $parts[] = "تخت: {$this->bed->bed_number}";
            }
        }
        
        return empty($parts) ? null : implode(' | ', $parts);
    }

    /**
     * وضعیت فیس (paid / partial / unpaid)
     */
    public function getFeeStatusAttribute()
    {
        $fees = $this->fees;
        
        if ($fees->isEmpty()) {
            return 'unpaid';
        }
        
        $totalAmount = $fees->sum('amount');
        $paidAmount = $fees->where('status', 'paid')->sum('amount');
        
        if ($totalAmount > 0 && $paidAmount >= $totalAmount) {
            return 'paid';
        }
        
        if ($paidAmount > 0) {
            return 'partial';
        }
        
        return 'unpaid';
    }

    // ============ متدهای عملیاتی ============

    /**
     * بستری کردن بیمار
     */
    public function admit()
    {
        $this->update([
            'status' => 'admitted',
            'admission_date' => now()->toDateString(),
        ]);
        
        // کاهش تخت‌های موجود
        if ($this->ward) {
            $this->ward->decrement('available_beds');
        }
        
        return $this;
    }

    /**
     * ترخیص بیمار با تمام فیلدهای لازم
     * 
     * @param array $data آرایه‌ای شامل: discharge_date, discharge_time, discharge_type, discharge_reason, discharge_notes, discharged_by_user_id
     */
    public function dischargeWithData(array $data = [])
    {
        $dischargeDate = $data['discharge_date'] ?? now()->toDateString();
        $dischargeTime = $data['discharge_time'] ?? now()->format('H:i');
        
        $this->update([
            'status' => 'discharged',
            'discharge_date' => $dischargeDate,
            'discharge_time' => $dischargeTime,
            'discharge_type' => $data['discharge_type'] ?? 'regular',
            'discharge_reason' => $data['discharge_reason'] ?? null,
            'discharge_notes' => $data['discharge_notes'] ?? null,
            'discharged_by_user_id' => $data['discharged_by_user_id'] ?? auth()->id(),
            'discharged_at' => now(),
        ]);
        
        // افزایش تخت‌های موجود
        if ($this->ward) {
            $this->ward->increment('available_beds');
        }
        
        // آزاد کردن تخت
        if ($this->bed_id) {
            Bed::where('id', $this->bed_id)->update(['status' => 'available']);
        }
        
        return $this;
    }

    /**
     * ترخیص ساده (برای سازگاری با کدهای قدیمی)
     */
    public function discharge()
    {
        return $this->dischargeWithData([
            'discharge_type' => 'regular',
        ]);
    }

    /**
     * لغو درخواست
     */
    public function cancel()
    {
        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        
        if ($this->ward) {
            $this->ward->increment('available_beds');
        }
        
        if ($this->bed_id) {
            Bed::where('id', $this->bed_id)->update(['status' => 'available']);
        }
        
        return $this;
    }

    /**
     * ختم معالجه
     */
    public function complete()
    {
        $this->update([
            'completed_at' => now(),
            'status' => 'completed',
        ]);
        
        return $this;
    }

    /**
     * انتقال به بخش دیگر
     */
    public function transferTo($newWardId, $reason = null, $notes = null)
    {
        $oldWardId = $this->ward_id;
        
        // آزاد کردن تخت قبلی
        if ($this->bed_id) {
            Bed::where('id', $this->bed_id)->update(['status' => 'available']);
        }
        
        // افزایش تخت بخش قبلی
        Ward::find($oldWardId)?->increment('available_beds');
        
        // کاهش تخت بخش جدید
        $newWard = Ward::find($newWardId);
        if ($newWard) {
            $newWard->decrement('available_beds');
        }
        
        // ثبت یادداشت انتقال
        $transferNote = "\n\n=== انتقال به بخش " . ($newWard?->name ?? $newWardId) 
                        . " در " . now()->format('Y/m/d H:i') . " ===";
        if ($reason) {
            $transferNote .= "\nدلیل: {$reason}";
        }
        if ($notes) {
            $transferNote .= "\nیادداشت: {$notes}";
        }
        
        $this->update([
            'ward_id' => $newWardId,
            'bed_id' => null,
            'bed_number' => null,
            'room_number' => null,
            'location' => null,
            'special_notes' => ($this->special_notes ?? '') . $transferNote,
        ]);
        
        return $this;
    }

    /**
     * ثبت ارسال هشدار فیس
     */
    public function markFeeAlertSent()
    {
        $this->update([
            'last_fee_alert_at' => now(),
            'fee_alert_count' => ($this->fee_alert_count ?? 0) + 1,
        ]);
        
        return $this;
    }

    /**
     * بازنشانی هشدار فیس
     */
    public function resetFeeAlert()
    {
        $this->update([
            'last_fee_alert_at' => null,
            'fee_alert_count' => 0,
        ]);
        
        return $this;
    }

    /**
     * محاسبه مجموع فیس‌ها
     */
    public function getTotalFeesAmount()
    {
        return $this->fees()->sum('amount');
    }

    /**
     * محاسبه مجموع پرداختی
     */
    public function getTotalPaidAmount()
    {
        return $this->fees()->where('status', 'paid')->sum('amount');
    }

    /**
     * محاسبه مجموع باقی‌مانده
     */
    public function getTotalRemainingAmount()
    {
        return $this->fees()->sum('remaining_amount');
    }
}