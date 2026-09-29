<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalPrescriptionItem extends Model
{
    use HasFactory;

    protected $table = 'external_prescription_items';

    protected $fillable = [
        'external_pres_id',
        'med_id',
        'category_id',
        'supplier_id',
        'stock_id',
        'medication_name',
        'medication_type',
        'supplier_name',
        'barcode',
        'batch_number',
        'dosage',
        'quantity',
        'unit_price',
        'total_price',
        'remarks',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function prescription()
    {
        return $this->belongsTo(ExternalPrescription::class, 'external_pres_id');
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Account::class, 'supplier_id');
    }

    public function stock()
    {
        return $this->belongsTo(Stock::class, 'stock_id', 'stock_id');
    }

    /**
     * محاسبه مجدد قیمت کل این قلم
     */
    public function recalculate()
    {
        $this->total_price = $this->quantity * $this->unit_price;
        $this->save();
        return $this->total_price;
    }
}