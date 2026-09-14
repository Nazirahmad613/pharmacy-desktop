<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Stock extends Model
{
    use HasFactory;

    protected $table = 'stock';
    protected $primaryKey = 'stock_id';

    // ✅ چون در مایگریشن از timestamps() استفاده شده
    public $timestamps = true;

    protected $fillable = [
        'purchase_item_id',   // ✅ اتصال به ردیف خرید
        'med_id',
        'supplier_id',
        'type',
        // 'barcode',         // ❌ حذف شد — در جدول stock وجود ندارد
        'batch_number',       // شماره بچ (کپی از parchaseitems.batch_no)
        'exp_date',
        'quantity',
        'purchase_price',     // قیمت خرید (کپی از parchaseitems.unit_price)
        'selling_price',
    ];

    protected $casts = [
        'exp_date'        => 'date',
        'quantity'        => 'integer',
        'purchase_price'  => 'float',
        'selling_price'   => 'float',
    ];

    // ============================================================
    // روابط
    // ============================================================

    /**
     * ✅ رابطه با دوا
     * med_id → medications.med_id
     */
    public function medication(): BelongsTo
    {
        return $this->belongsTo(
            Medication::class,
            'med_id',
            'med_id'
        );
    }

    /**
     * ✅ تأمین‌کننده از جدول accounts
     * supplier_id → accounts.id
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(
            Account::class,
            'supplier_id',
            'id'
        );
    }

    /**
     * ✅ رابطه با ردیف خرید
     * ------------------------------------------------------------
     * purchase_item_id → parchaseitems.parchase_it_id
     *
     * ⚠️ نام مدل شما Parchaseitem است (با a)
     * ⚠️ کلید اصلی parchase_it_id است
     */
    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(
            Parchaseitem::class,
            'purchase_item_id',
            'parchase_it_id'   // ✅ کلید اصلی parchaseitems
        );
    }

    /**
     * ✅ رابطه با اقلام نسخه (FEFO)
     */
    public function prescriptionItems(): HasMany
    {
        return $this->hasMany(
            PrescriptionItem::class,
            'stock_id',
            'stock_id'
        );
    }

    /**
     * ✅ رابطه با سابقه فروش
     */
    public function sales(): HasMany
    {
        return $this->hasMany(
            StockSale::class,
            'stock_id',
            'stock_id'
        );
    }

    // ============================================================
    // Scopes
    // ============================================================

    /**
     * ✅ Scope FEFO — نزدیک‌ترین تاریخ انقضا با موجودی کافی
     */
    public function scopeFefo(
        $query,
        int $medId,
        ?int $supplierId = null,
        int $quantity = 1
    ) {
        $query->where('med_id', $medId)
            ->where('quantity', '>=', $quantity)
            ->whereDate('exp_date', '>=', now())
            ->orderBy('exp_date', 'asc')      // نزدیک‌ترین انقضا
            ->orderBy('stock_id', 'asc');     // ترتیب ثانویه

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        return $query;
    }

    /**
     * ✅ Scope: فقط موجودی‌های قابل استفاده
     */
    public function scopeAvailable($query)
    {
        return $query->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now());
    }

    /**
     * ✅ Scope: موجودی‌های منقضی شده
     */
    public function scopeExpired($query)
    {
        return $query->whereDate('exp_date', '<', now());
    }

    /**
     * ✅ Scope: نزدیک به انقضا
     */
    public function scopeNearExpiry($query, int $days = 30)
    {
        return $query->whereDate('exp_date', '>=', now())
            ->whereDate('exp_date', '<=', now()->addDays($days));
    }

    /**
     * ✅ Scope: بر اساس دوا
     */
    public function scopeByMedication($query, int $medId)
    {
        return $query->where('med_id', $medId);
    }

    /**
     * ✅ Scope: بر اساس تأمین‌کننده
     */
    public function scopeBySupplier($query, int $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    /**
     * ✅ Scope: بر اساس شماره بچ
     */
    public function scopeByBatchNumber($query, string $batchNumber)
    {
        return $query->where('batch_number', $batchNumber);
    }

    // ============================================================
    // Accessors
    // ============================================================

    /**
     * ✅ وضعیت انقضا
     */
    public function getExpiryStatusAttribute(): string
    {
        if (!$this->exp_date) {
            return 'unknown';
        }

        $daysLeft = now()->diffInDays($this->exp_date, false);

        if ($daysLeft < 0) {
            return 'expired';        // منقضی شده
        }

        if ($daysLeft <= 30) {
            return 'near_expiry';    // نزدیک انقضا
        }

        return 'valid';              // معتبر
    }

    /**
     * ✅ روزهای باقی‌مانده تا انقضا
     */
    public function getDaysToExpiryAttribute(): ?int
    {
        if (!$this->exp_date) {
            return null;
        }

        return (int) now()->diffInDays($this->exp_date, false);
    }

    /**
     * ✅ آیا موجودی قابل استفاده است؟
     */
    public function getIsAvailableAttribute(): bool
    {
        return $this->quantity > 0
            && $this->exp_date
            && $this->exp_date->isFuture();
    }

    /**
     * ✅ بارکد نهایی — همیشه از medications می‌آید
     * ------------------------------------------------------------
     * چون بارکد در جدول stock ذخیره نمی‌شود.
     */
    public function getFinalBarcodeAttribute(): ?string
    {
        return $this->medication->barcode ?? null;
    }

    /**
     * ✅ شماره بچ نهایی — اگر در stock نبود، از parchaseitems می‌خواند
     * ------------------------------------------------------------
     * برای رکوردهای قدیمی که batch_number آنها null است.
     */
    public function getFinalBatchNumberAttribute(): ?string
    {
        if (!empty($this->batch_number)) {
            return $this->batch_number;
        }

        // fallback: از parchaseitems
        return $this->purchaseItem->batch_no ?? null;
    }

    /**
     * ✅ قیمت خرید نهایی — اگر در stock نبود، از parchaseitems می‌خواند
     */
    public function getFinalPurchasePriceAttribute(): ?float
    {
        if (!is_null($this->purchase_price)) {
            return (float) $this->purchase_price;
        }

        // fallback: از parchaseitems
        return $this->purchaseItem->unit_price ?? null;
    }
}