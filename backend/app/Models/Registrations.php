<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Models\Journal;
use App\Models\Patient;
use App\Models\User;
use App\Models\Department;


class Registrations extends Model
{
    use HasFactory;


    protected $table = 'registrations';


    protected $primaryKey = 'reg_id';


    public $incrementing = true;


    protected $keyType = 'int';



    protected $fillable = [

        /*
        |--------------------------------------------------------------------------
        | نوع ثبت مراجعه
        |--------------------------------------------------------------------------
        */

        'reg_type',



        /*
        |--------------------------------------------------------------------------
        | ارتباطات HIS
        |--------------------------------------------------------------------------
        */


        'patient_id',

        'department_id',

        'doctor_id',




        /*
        |--------------------------------------------------------------------------
        | معلومات مراجعه
        |--------------------------------------------------------------------------
        */


        'visit_number',

        'visit_type',

        'queue_number',




        /*
        |--------------------------------------------------------------------------
        | فیس مراجعه
        |--------------------------------------------------------------------------
        */


        'registration_fee',




        /*
        |--------------------------------------------------------------------------
        | گردش مریض
        |--------------------------------------------------------------------------
        */


        'visit_status',




        /*
        |--------------------------------------------------------------------------
        | تاریخ و یادداشت
        |--------------------------------------------------------------------------
        */


        'visit_date',

        'note',




        /*
        |--------------------------------------------------------------------------
        | معلومات طبی اولیه
        |--------------------------------------------------------------------------
        */


        'diagnosis',

        'weight',

        'blood_pressure',

        'temperature',

        'oxygen',




        /*
        |--------------------------------------------------------------------------
        | وضعیت سیستم
        |--------------------------------------------------------------------------
        */


        'status',

    ];




    protected $casts = [

        'visit_date' => 'date',

        'registration_fee' => 'decimal:2',

        'weight' => 'decimal:2',

        'temperature' => 'decimal:1',

    ];





    /*
    |--------------------------------------------------------------------------
    | روابط HIS
    |--------------------------------------------------------------------------
    */



    // اطلاعات کامل مریض از جدول patients
    public function patient()
    {
        return $this->belongsTo(
            Patient::class,
            'patient_id'
        );
    }





    // بخش شفاخانه
    public function department()
    {
        return $this->belongsTo(
            Department::class,
            'department_id'
        );
    }





    // داکتر معالج
    public function doctor()
    {
        return $this->belongsTo(
            User::class,
            'doctor_id'
        );
    }







    /*
    |--------------------------------------------------------------------------
    | Journal
    |--------------------------------------------------------------------------
    */


    public function journals()
    {
        return $this->hasMany(
            Journal::class,
            'registration_id',
            'reg_id'
        );
    }






    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */


    public function getRegNameAttribute(): string
    {

        if ($this->patient) {

            return trim(
                $this->patient->first_name .
                ' ' .
                $this->patient->last_name
            );

        }


        return '';

    }






    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */


    public function scopePatients($query)
    {
        return $query->where(
            'reg_type',
            'patient'
        );
    }





    public function scopeByType($query, string $type)
    {
        return $query->where(
            'reg_type',
            $type
        );
    }

}