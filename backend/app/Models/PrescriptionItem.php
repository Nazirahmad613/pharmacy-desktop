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
        'stock_id',        // ✅ جدید
        'is_custom',
        'med_name',
        'supplier_name',
        'type',
        'barcode',         // ✅ جدید
        'batch_number',    // ✅ جدید
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

    /**
     * ✅ جدید: رابطه با بچ ستاک (FEFO)
     * ------------------------------------------------------------
     * stock_id → stock.stock_id
     */
    public function stock()
    {
        return $this->belongsTo(Stock::class, 'stock_id', 'stock_id');
    }

    /**
     * ✅ جدید: رابطه با سابقه فروش
     * ------------------------------------------------------------
     * یک قلم نسخه می‌تواند یک رکورد فروش داشته باشد
     */
    public function sales()
    {
        return $this->hasMany(StockSale::class, 'pres_it_id', 'pres_it_id');
    }

    /**
     * ✅ جدید: رابطه با آخرین رکورد فروش
     */
    public function lastSale()
    {
        return $this->hasOne(StockSale::class, 'pres_it_id', 'pres_it_id')
            ->latest('sold_at');
    }

    // ============================================================
    // Scope ها
    // ============================================================

    /**
     * ✅ فقط اقلام سیستمی (غیر دستی)
     */
    public function scopeSystemItems($query)
    {
        return $query->where('is_custom', false);
    }

    /**
     * ✅ فقط اقلام دستی
     */
    public function scopeCustomItems($query)
    {
        return $query->where('is_custom', true);
    }

    /**
     * ✅ فقط اقلامی که به stock متصل هستند
     */
    public function scopeWithStock($query)
    {
        return $query->whereNotNull('stock_id');
    }

    /**
     * ✅ جستجو با بارکد
     */
    public function scopeByBarcode($query, string $barcode)
    {
        return $query->where('barcode', $barcode);
    }

    /**
     * ✅ جستجو با شماره بچ
     */
    public function scopeByBatchNumber($query, string $batchNumber)
    {
        return $query->where('batch_number', $batchNumber);
    }

    // ============================================================
    // Accessors
    // ============================================================

    /**
     * ✅ نام نمایشی دارو
     * - برای دستی: med_name
     * - برای سیستمی: از medications.gen_name
     */
    public function getDisplayMedNameAttribute(): string
    {
        if ($this->is_custom) {
            return $this->med_name ?? 'نامشخص';
        }

        return $this->medication->gen_name ?? $this->med_name ?? 'نامشخص';
    }

    /**
     * ✅ نام نمایشی تأمین‌کننده
     */
    public function getDisplaySupplierNameAttribute(): string
    {
        if ($this->is_custom) {
            return $this->supplier_name ?? 'نامشخص';
        }

        return $this->supplier->account_name ?? $this->supplier_name ?? 'نامشخص';
    }

    /**
     * ✅ تاریخ انقضای بچ (در صورت وجود)
     */
    public function getExpDateAttribute()
    {
        return $this->stock->exp_date ?? null;
    }
}