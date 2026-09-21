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
        'patient_name',
        'tazkira_number',
        'patient_age',
        'patient_gender',
        'patient_phone',
        'patient_blood_group',
        'doctor_name',
        'doctor_specialty',
        'visit_status',
        'current_step',
        'current_step_index',
        'completed_steps',
        'examinations_count',
        'laboratory_tests_count',
        'radiology_requests_count',
        'operations_count',
        'prescriptions_count',
        'admissions_count',
        'followups_count',
        'diagnosis',
        'weight',
        'blood_pressure',
        'temperature',
        'oxygen',
        'registration_fee',
        'total_amount',
        'total_paid',
        'total_remaining',
        'sent_to_doctor_at',
        'treatment_started_at',
        'treatment_completed_at',
        'sent_to_laboratory_at',
        'sent_to_pharmacy_at',
        'summary',
        'activity_log',
        'note',
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
    ];

    // ============ روابط ============
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function items()
    {
        return $this->hasMany(TreatmentHistoryItem::class, 'history_id', 'history_id')
            ->orderBy('step_order');
    }

    // ============ Scopes ============
    public function scopeByPatient($q, $patientId)
    {
        return $q->where('patient_id', $patientId);
    }

    public function scopeByDoctor($q, $doctorId)
    {
        return $q->where('doctor_id', $doctorId);
    }

    public function scopeCompleted($q)
    {
        return $q->where('visit_status', 'Completed');
    }
}