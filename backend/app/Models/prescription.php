<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    protected $table = 'prescriptions';
    protected $primaryKey = 'pres_id';

    protected $fillable = [
        'patient_id',
        'reg_id',
        'doc_id',
        'patient_name',
        'tazkira_number',
        'patient_age',
        'patient_gender',
        'patient_phone',
        'patient_blood_group',
        'doc_name',
        'diagnosis',
        'weight',
        'blood_pressure',
        'temperature',
        'oxygen',
        'pres_num',
        'pres_date',
    ];

    protected $casts = [
        'pres_date'   => 'date',
        'weight'      => 'decimal:2',
        'temperature' => 'decimal:1',
    ];

    // ========== روابط ==========
    public function items()
    {
        return $this->hasMany(PrescriptionItem::class, 'pres_id', 'pres_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doc_id', 'id');
    }
}