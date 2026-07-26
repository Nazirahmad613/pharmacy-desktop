<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

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
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function registrations()
    {
        return $this->hasMany(Registrations::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}