<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesItem extends Model
{
    use HasFactory;

    protected $table = 'sales_items';
    protected $primaryKey = 'sales_it_id';

    protected $fillable = [
        'sales_id',
        'med_id',
        'supplier_id',
        'category_id',
        'type',
        'quantity',
        'unit_sales',
        'total_sales',
        'exp_date' // اگر این فیلد را دارید
    ];

    /**
     * ارتباط با فروش
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sales::class, 'sales_id', 'sales_id');
    }

    /**
     * ارتباط با دوا
     */
    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    /**
     * ✅ ارتباط با حمایت‌کننده از جدول registrations
     * supplier_id همان reg_id از جدول registrations است
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Registrations::class, 'supplier_id', 'reg_id')
                    ->where('reg_type', 'supplier'); // فقط supplierها
    }

    /**
     * ارتباط با کتگوری
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }
}