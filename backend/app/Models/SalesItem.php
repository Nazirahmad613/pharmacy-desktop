<?php
// app/Models/SalesItem.php

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
        'exp_date'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_sales' => 'decimal:2',
        'total_sales' => 'decimal:2',
        'exp_date' => 'date'
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
     * ✅ ارتباط با تأمین‌کننده از جدول registrations
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Registrations::class, 'supplier_id', 'reg_id');
    }

    /**
     * ارتباط با کتگوری
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    /**
     * ✅ ارتباط با استاک برای دریافت type
     * این متد type را از جدول stock بر اساس med_id و supplier_id دریافت می‌کند
     */
    public function stock(): BelongsTo
    {
        return $this->belongsTo(Stock::class, 'med_id', 'med_id')
                    ->whereColumn('sales_items.supplier_id', 'stock.supplier_id');
    }

    /**
     * ✅ متد کمکی برای گرفتن type از stock
     */
    public function getTypeFromStockAttribute()
    {
        $stock = Stock::where('med_id', $this->med_id)
            ->where('supplier_id', $this->supplier_id)
            ->first();
        
        return $stock->type ?? $this->type;
    }
}