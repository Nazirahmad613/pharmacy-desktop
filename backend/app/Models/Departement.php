<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Departement extends Model
{
    // مشخص کردن جدول واقعی
    protected $table = 'departments';

    // ستون‌هایی که می‌توان mass assign کرد
    protected $fillable = ['name', 'location', 'head_doctor_id'];
}