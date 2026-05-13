<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Medication extends Model
{
    use HasFactory;

    protected $primaryKey = 'med_id';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'gen_name',
        'dosage',
        'category_id',
        'type',
        'added_med'
    ];

    // ارتباط با دسته‌بندی (Category)
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    // ارتباط با موجودی انبار
    public function inventory()
    {
        return $this->hasMany(Inventory::class, 'med_id', 'med_id');
    }

    // ارتباط با جزئیات فروش
    public function salesDetails()
    {
        return $this->hasMany(SalesItem::class, 'med_id', 'med_id');
    }

    // ارتباط با نسخه‌ها
    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'med_id', 'med_id');
    }
}