<?php
// app/Models/TreatmentHistory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TreatmentHistory extends Model
{
    use SoftDeletes;

    protected $table = 'treatment_history';
    protected $primaryKey = 'history_id';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'visit_number',
        'queue_number',
        // Snapshot بیمار
        'patient_name',
        'tazkira_number',
        'patient_age',
        'patient_gender',
        'patient_phone',
        'patient_blood_group',
        // Snapshot داکتر
        'doctor_name',
        'doctor_specialty',
        // وضعیت
        'visit_status',
        'current_step',
        'current_step_index',
        'completed_steps',
        // شمارش‌ها
        'examinations_count',
        'laboratory_tests_count',
        'radiology_requests_count',
        'operations_count',
        'prescriptions_count',
        'admissions_count',
        'followups_count',
        // بالینی
        'diagnosis',
        'weight',
        'blood_pressure',
        'temperature',
        'oxygen',
        // مالی
        'registration_fee',
        'total_amount',
        'total_paid',
        'total_remaining',
        // زمان‌ها
        'sent_to_doctor_at',
        'treatment_started_at',
        'treatment_completed_at',
        'sent_to_laboratory_at',
        'sent_to_pharmacy_at',
        // خلاصه
        'summary',
        'activity_log',
        'note',
        // متادیتا
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'completed_steps' => 'array',
        'activity_log' => 'array',
        'sent_to_doctor_at' => 'datetime',
        'treatment_started_at' => 'datetime',
        'treatment_completed_at' => 'datetime',
        'sent_to_laboratory_at' => 'datetime',
        'sent_to_pharmacy_at' => 'datetime',
        'registration_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'total_paid' => 'decimal:2',
        'total_remaining' => 'decimal:2',
        'patient_age' => 'integer',
        'queue_number' => 'integer',
        'current_step_index' => 'integer',
    ];

    // ============================================================
    // روابط
    // ============================================================

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'id');
    }

    public function items()
    {
        return $this->hasMany(TreatmentHistoryItem::class, 'history_id', 'history_id')
            ->orderBy('step_order')
            ->orderBy('step_at');
    }

    // ============================================================
    // Scopes
    // ============================================================

    public function scopeByPatient($q, $patientId)
    {
        return $q->where('patient_id', $patientId);
    }

    public function scopeByDoctor($q, $doctorId)
    {
        return $q->where('doctor_id', $doctorId);
    }

    public function scopeByReg($q, $regId)
    {
        return $q->where('reg_id', $regId);
    }

    public function scopeCompleted($q)
    {
        return $q->where('visit_status', 'Completed');
    }

    public function scopeInProgress($q)
    {
        return $q->where('visit_status', 'InProgress');
    }

    // ============================================================
    // Accessors
    // ============================================================

    public function getIsCompletedAttribute(): bool
    {
        return $this->visit_status === 'Completed';
    }

    public function getTotalStagesAttribute(): int
    {
        return (int) ($this->examinations_count
            + $this->laboratory_tests_count
            + $this->radiology_requests_count
            + $this->operations_count
            + $this->prescriptions_count
            + $this->admissions_count
            + $this->followups_count);
    }
}