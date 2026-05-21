<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Medication extends Model
{
    use HasFactory;

    protected $table = 'medications'; // ✅ نام درست جدول
    protected $primaryKey = 'med_id';

    protected $fillable = [
        'gen_name',
        'dosage',
        'category_id',
        'type',
        'added_med',
        'minimum_quantity' // ✅ اضافه شد
    ];

    protected $casts = [
        'minimum_quantity' => 'integer',
        'added_med' => 'integer'
    ];

    // رابطه با کتگوری
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    // رابطه با استاک
    public function stocks()
    {
        return $this->hasMany(Stock::class, 'med_id', 'med_id');
    }

    // ✅ متد کمکی برای بررسی موجودی کم
    public function isLowStock($currentQuantity)
    {
        $minQty = $this->minimum_quantity ?? 10;
        return $currentQuantity <= $minQty;
    }

    // ✅ متد کمکی برای گرفتن وضعیت موجودی
    public function getStockStatusAttribute($currentQuantity)
    {
        $minQty = $this->minimum_quantity ?? 10;
        
        if ($currentQuantity <= 0) {
            return ['status' => 'ناموجود', 'color' => 'red', 'icon' => '❌'];
        }
        if ($currentQuantity <= $minQty) {
            return ['status' => 'موجودی کم', 'color' => 'orange', 'icon' => '⚠️'];
        }
        return ['status' => 'موجود', 'color' => 'green', 'icon' => '✅'];
    }
}