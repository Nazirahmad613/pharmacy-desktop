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
        | اطلاعات عمومی مراجعه
        |--------------------------------------------------------------------------
        */

        'full_name',

        'father_name',

        'phone',

        'gender',

        'age',

        'blood_group',

        'address',




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
        | گردش مریض
        |--------------------------------------------------------------------------
        */


        'visit_number',

        'visit_type',

        'queue_number',

        'visit_status',




        /*
        |--------------------------------------------------------------------------
        | زمان مراجعه
        |--------------------------------------------------------------------------
        */


        'visit_date',

        'note',




        /*
        |--------------------------------------------------------------------------
        | اطلاعات طبی اولیه برای ارسال به داکتر
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





    /*
    |--------------------------------------------------------------------------
    | روابط HIS
    |--------------------------------------------------------------------------
    */


    // مریض
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
    // User دارای Role Doctor
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
            'ref_id',
            'reg_id'
        )
        ->whereColumn(
            'journals.ref_type',
            'registrations.reg_type'
        );
    }





    /*
    |--------------------------------------------------------------------------
    | Accessor
    |--------------------------------------------------------------------------
    */


    public function getRegNameAttribute(): string
    {
        return trim(
            $this->full_name .
            (
                $this->father_name
                ? ' / '.$this->father_name
                : ''
            )
        );
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



    public function scopeByType($query,string $type)
    {
        return $query->where(
            'reg_type',
            $type
        );
    }

}