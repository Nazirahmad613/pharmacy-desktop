<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HospitalSetting extends Model
{
    protected $fillable = [
        'hospital_name',
        'hospital_logo',
        'enabled_modules',
        'created_by',
    ];

    protected $casts = [
        'enabled_modules' => 'array',
    ];

    // همیشه فقط یک رکورد وجود دارد
    public static function current(): ?self
    {
        return static::first();
    }
}