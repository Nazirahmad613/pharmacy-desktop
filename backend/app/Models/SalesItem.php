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
        'supplier_id', // اینجا reg_id از جدول registrations ذخیره می‌شود
        'category_id',
        'type',
        'quantity',
        'unit_sales',
        'total_sales',
     
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
     * ارتباط با حمایت‌کننده از جدول registrations
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Registrations::class, 'supplier_id', 'reg_id');
    }

    /**
     * ارتباط با کتگوری
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }
}
