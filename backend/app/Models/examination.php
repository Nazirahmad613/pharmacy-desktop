<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Examination extends Model
{
    protected $table = 'examinations';
    
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'registration_id',
        'user_id', // تغییر از doctor_id به user_id
        'patient_id',
        'weight',
        'height',
        'bmi',
        'blood_pressure',
        'temperature',
        'pulse',
        'respiratory_rate',
        'oxygen',
        'chief_complaint',
        'history_of_present_illness',
        'past_medical_history',
        'physical_examination',
        'diagnosis',
        'note',
        'examination_date'
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'height' => 'decimal:2',
        'bmi' => 'decimal:2',
        'temperature' => 'decimal:1',
        'pulse' => 'integer',
        'respiratory_rate' => 'integer',
        'oxygen' => 'integer',
        'examination_date' => 'datetime',
    ];

    // روابط
    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    // رابطه با کاربر (داکتر)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // رابطه با مریض
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}