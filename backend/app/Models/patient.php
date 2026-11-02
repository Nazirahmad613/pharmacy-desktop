<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Patient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'patient_code',

        'first_name',
        'last_name',
        'father_name',
        'grandfather_name',

        'gender',
        'date_of_birth',
        'age',
        'blood_group',
        'marital_status',

        'nationality',
        'national_id',
        'passport_no',

        'mobile',
        'phone',
        'email',

        'country',
        'province',
        'district',
        'village',
        'address',

        'occupation',
        'education',

        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',

        'allergies',
        'chronic_diseases',
        'disability',
        'remarks',

        'photo',

        'status',

        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    /*
    |--------------------------------------------------------------------------
    | ✅ Auto-fill UUID و Patient Code هنگام ایجاد
    |--------------------------------------------------------------------------
    */
    protected static function booted()
    {
        static::creating(function (Patient $patient) {
            if (empty($patient->uuid)) {
                $patient->uuid = (string) Str::uuid();
            }

            if (empty($patient->patient_code)) {
                $patient->patient_code = static::generatePatientCode();
            }
        });
    }

    /**
     * تولید کد یکتای مریض: PAT-YYYYMMDD-XXXXX
     */
    public static function generatePatientCode(): string
    {
        $prefix = 'PAT-' . now()->format('Ymd') . '-';
        do {
            $code = $prefix . strtoupper(Str::random(5));
        } while (static::withTrashed()->where('patient_code', $code)->exists());

        return $code;
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    // ✅ صریح شد — FK = patient_id، ownerKey = id
    public function registrations()
    {
        return $this->hasMany(Registrations::class, 'patient_id', 'id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function emergencyCases()
    {
        return $this->hasMany(EmergencyCase::class, 'patient_id', 'id');
    }

    // ✅ بر اساس created_at (نه emergency_id که PK است) — معنادارتر
    public function latestEmergencyCase()
    {
        return $this->hasOne(EmergencyCase::class, 'patient_id', 'id')
            ->latestOfMany();
    }
}