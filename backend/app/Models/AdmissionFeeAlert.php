<?php
// app/Models/AdmissionFeeAlert.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmissionFeeAlert extends Model
{
    use HasFactory;

    protected $table = 'admission_fee_alerts';

    protected $fillable = [
        'admission_request_id',
        'patient_id',
        'alert_date',
        'alert_time',
        'alert_type',
        'message',
        'is_sent',
        'sent_at',
        'is_resolved',
        'resolved_at'
    ];

    protected $casts = [
        'alert_date' => 'date',
        'alert_time' => 'datetime:H:i:s',
        'is_sent' => 'boolean',
        'sent_at' => 'datetime',
        'is_resolved' => 'boolean',
        'resolved_at' => 'datetime'
    ];

    // ============ روابط ============
    
    public function admissionRequest()
    {
        return $this->belongsTo(AdmissionRequest::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    // ============ اسکوپ‌ها ============
    
    public function scopeUnsent($query)
    {
        return $query->where('is_sent', false);
    }

    public function scopeUnresolved($query)
    {
        return $query->where('is_resolved', false);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('alert_date', today());
    }

    public function scopeByAdmission($query, $admissionId)
    {
        return $query->where('admission_request_id', $admissionId);
    }

    // ============ متدهای کمکی ============
    
    public function getAlertTypeLabelAttribute()
    {
        $labels = [
            'daily' => 'روزانه',
            'weekly' => 'هفتگی',
            'custom' => 'سفارشی'
        ];
        return $labels[$this->alert_type] ?? $this->alert_type;
    }

    public function getIsOverdueAttribute()
    {
        return !$this->is_resolved && $this->created_at->diffInHours(now()) > 24;
    }

    // ============ متدهای عملیاتی ============
    
    public function markAsSent()
    {
        $this->update([
            'is_sent' => true,
            'sent_at' => now()
        ]);
    }

    public function markAsResolved()
    {
        $this->update([
            'is_resolved' => true,
            'resolved_at' => now()
        ]);
    }

    public static function createForAdmission($admissionRequest)
    {
        return self::create([
            'admission_request_id' => $admissionRequest->id,
            'patient_id' => $admissionRequest->patient_id,
            'alert_date' => now()->toDateString(),
            'alert_time' => now()->toTimeString(),
            'alert_type' => 'daily',
            'message' => "هشدار فیس بستری برای بیمار {$admissionRequest->patient->full_name} - روز {$admissionRequest->days_admitted}",
            'is_sent' => false,
            'is_resolved' => false
        ]);
    }
}