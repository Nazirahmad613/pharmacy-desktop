<?php
// app/Models/AdmissionRequest.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class AdmissionRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'admission_requests';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'ward_id',
        'admission_date',
        'discharged_at',
        'cancelled_at',
        'diagnosis',
        'admission_instructions',
        'special_notes',
        'status',
        'priority',
        'last_fee_alert_at',
        'fee_alert_count',
        'completed_at'
    ];

    protected $casts = [
        'admission_date' => 'date',
        'discharged_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_fee_alert_at' => 'datetime',
        'fee_alert_count' => 'integer'
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

    public function fees()
    {
        return $this->hasMany(AdmissionFee::class, 'admission_request_id');
    }

    public function alerts()
    {
        return $this->hasMany(AdmissionFeeAlert::class);
    }

    // ============ اسکوپ‌ها ============
    
    public function scopeActive($query)
    {
        return $query->where('status', 'admitted');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeDischarged($query)
    {
        return $query->where('status', 'discharged');
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

    public function scopeHighPriority($query)
    {
        return $query->where('priority', 'high');
    }

    public function scopeNeedsFeeAlert($query)
    {
        return $query->where('status', 'admitted')
            ->where(function($q) {
                $q->whereNull('last_fee_alert_at')
                  ->orWhere('last_fee_alert_at', '<=', now()->subHours(24));
            });
    }

    // ============ متدهای کمکی ============
    
    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'admitted' => 'بستری',
            'discharged' => 'ترخیص شده',
            'cancelled' => 'لغو شده'
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getPriorityLabelAttribute()
    {
        $labels = [
            'high' => 'بالا',
            'medium' => 'متوسط',
            'normal' => 'معمولی',
            'low' => 'پایین'
        ];
        return $labels[$this->priority] ?? $this->priority;
    }

    public function getDaysAdmittedAttribute()
    {
        if (!$this->admission_date) return 0;
        $endDate = $this->discharged_at ?? now();
        return $this->admission_date->diffInDays($endDate);
    }

    public function getWardNameAttribute()
    {
        return $this->ward?->name ?? null;
    }

    // ============ متدهای عملیاتی ============
    
    public function admit()
    {
        $this->update([
            'status' => 'admitted',
            'admission_date' => now()->toDateString()
        ]);
    }

    public function discharge()
    {
        $this->update([
            'status' => 'discharged',
            'discharged_at' => now()
        ]);
        
        // افزایش تخت‌های موجود در بخش
        if ($this->ward) {
            $this->ward->increment('available_beds');
        }
    }

    public function cancel()
    {
        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now()
        ]);
        
        // افزایش تخت‌های موجود در بخش
        if ($this->ward) {
            $this->ward->increment('available_beds');
        }
    }

    public function complete()
    {
        $this->update([
            'completed_at' => now()
        ]);
    }

    public function markFeeAlertSent()
    {
        $this->update([
            'last_fee_alert_at' => now(),
            'fee_alert_count' => $this->fee_alert_count + 1
        ]);
    }

    public function resetFeeAlert()
    {
        $this->update([
            'last_fee_alert_at' => null,
            'fee_alert_count' => 0
        ]);
    }
}