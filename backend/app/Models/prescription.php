<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    use HasFactory;

    protected $primaryKey = 'pres_id';

    protected $fillable = [
        'patient_id',
        'patient_name',
        'tazkira_number',
        'patient_age',
        'patient_gender',
        'patient_phone',
        'patient_blood_group',
        'doc_id',
        'doc_name',
        'pres_num',
        'pres_date',
        'supplier_id',
        'total_amount',
        'discount',
        'net_amount',
          'diagnosis',
         'weight',
         'blood_pressure',
         'temperature',
         'oxygen',
];
    

    public function items()
    {
        return $this->hasMany(PrescriptionItem::class, 'pres_id', 'pres_id');
    }
}