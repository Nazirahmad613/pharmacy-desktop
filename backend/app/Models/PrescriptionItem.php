<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PrescriptionItem extends Model
{
    use HasFactory;

    protected $primaryKey = 'pres_it_id';

    protected $fillable = [
        'pres_id',
        'category_id',
        'med_id',
        'supplier_id',
        'type',
        'dosage',
        'quantity',
        'unit_price',
        'total_price',
        'remarks',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'pres_id', 'pres_id');
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Registrations::class, 'supplier_id', 'reg_id');
    }

    // ← اضافه شد
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }
}