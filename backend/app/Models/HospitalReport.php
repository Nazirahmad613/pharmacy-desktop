<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HospitalReport extends Model
{
    protected $table = 'vw_hospital_reports';

    protected $primaryKey = 'id';

    public $timestamps = false;

    protected $guarded = [];
}
