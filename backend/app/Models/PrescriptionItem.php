<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    protected $table = 'prescription_items';
    protected $primaryKey = 'pres_it_id';

    protected $fillable = [
        'pres_id',
        'category_id',
        'med_id',
        'supplier_id',
        'is_custom',
        'med_name',
        'supplier_name',
        'type',
        'dosage',
        'quantity',
        'remarks',
    ];

    protected $casts = [
        'is_custom' => 'boolean',
        'quantity'  => 'integer',
    ];

    // ============================================================
    // روابط
    // ============================================================

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'pres_id', 'pres_id');
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    /**
     * ✅ رابطه تأمین‌کننده — متصل به جدول accounts
     * ------------------------------------------------------------
     * supplier_id → accounts.id
     */
    public function supplier()
    {
        return $this->belongsTo(Account::class, 'supplier_id', 'id');
    }
}