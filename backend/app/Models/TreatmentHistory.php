<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TreatmentHistory extends Model
{
    protected $table = 'treatment_history';
    protected $primaryKey = 'history_id';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'visit_number',
        'queue_number',
        'visit_status',
        'registration_fee',
        'diagnosis',
        'weight',
        'blood_pressure',
        'temperature',
        'oxygen',
        'note',
        'sent_to_doctor_at',
        'treatment_started_at',
        'treatment_completed_at',
        'sent_to_laboratory_at',
    ];

    protected $casts = [
        'sent_to_doctor_at' => 'datetime',
        'treatment_started_at' => 'datetime',
        'treatment_completed_at' => 'datetime',
        'sent_to_laboratory_at' => 'datetime',
        'registration_fee' => 'decimal:2',
    ];

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
}