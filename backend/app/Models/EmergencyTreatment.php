<?php
// app/Models/EmergencyTreatment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;

class EmergencyTreatment extends Model
{
    use HasFactory;

    protected $table = 'emergency_treatments';
    protected $primaryKey = 'treatment_id';

    protected $fillable = [
        'emergency_id', 'doc_id', 'nurse_id',
        'treatment_type', 'title', 'description',
        'med_id', 'medication_name', 'dosage', 'frequency', 'route',
        'quantity', 'unit_price', 'total_price',
        'performed_at', 'is_billable',
    ];

    protected $casts = [
        'emergency_id' => 'integer',
        'doc_id'       => 'integer',
        'nurse_id'     => 'integer',
        'med_id'       => 'integer',
        'quantity'     => 'integer',
        'unit_price'   => 'decimal:2',
        'total_price'  => 'decimal:2',
        'is_billable'  => 'boolean',
        'performed_at' => 'datetime',
    ];

    protected $appends = [
        'treatment_type_label',
        'is_medication',
    ];

    /* ============================================================
     *  ثابت‌ها
     * ============================================================ */

    public const TYPE_MEDICATION  = 'medication';
    public const TYPE_PROCEDURE   = 'procedure';
    public const TYPE_SURGERY     = 'surgery';
    public const TYPE_OBSERVATION = 'observation';
    public const TYPE_REFERRAL    = 'referral';
    public const TYPE_LAB         = 'lab';
    public const TYPE_IMAGING     = 'imaging';
    public const TYPE_OTHER       = 'other';

    /* ============================================================
     *  Boot — محاسبه خودکار total_price
     * ============================================================ */

    protected static function booted(): void
    {
        static::saving(function (self $treatment) {
            /* محاسبه total_price = quantity × unit_price */
            if ($treatment->quantity !== null && $treatment->unit_price !== null) {
                $treatment->total_price = round(
                    (float) $treatment->quantity * (float) $treatment->unit_price,
                    2
                );
            }
        });

        static::saved(function (self $treatment) {
            /* بازتاب روی مجموع پرونده */
            $treatment->emergencyCase?->recalcTotal();
        });

        static::deleted(function (self $treatment) {
            $treatment->emergencyCase?->recalcTotal();
        });
    }

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function emergencyCase()
    {
        return $this->belongsTo(EmergencyCase::class, 'emergency_id', 'emergency_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doc_id', 'id');
    }

    public function nurse()
    {
        return $this->belongsTo(User::class, 'nurse_id', 'id');
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    /* ============================================================
     *  Scopes
     * ============================================================ */

    public function scopeMedications(Builder $q): Builder
    {
        return $q->where('treatment_type', self::TYPE_MEDICATION);
    }

    public function scopeBillable(Builder $q): Builder
    {
        return $q->where('is_billable', true);
    }

    public function scopeForDoctor(Builder $q, int $docId): Builder
    {
        return $q->where('doc_id', $docId);
    }

    public function scopeBetween(Builder $q, string $from, string $to): Builder
    {
        return $q->whereBetween('performed_at', ["{$from} 00:00:00", "{$to} 23:59:59"]);
    }

    public function scopeOrderByPerformed(Builder $q): Builder
    {
        return $q->orderBy('performed_at', 'desc');
    }

    /* ============================================================
     *  Accessors
     * ============================================================ */

    public function getTreatmentTypeLabelAttribute(): string
    {
        return [
            self::TYPE_MEDICATION  => 'تجویز دوا',
            self::TYPE_PROCEDURE   => 'پروسیجر',
            self::TYPE_SURGERY     => 'جراحی',
            self::TYPE_OBSERVATION => 'مراقبت',
            self::TYPE_REFERRAL    => 'ارجاع',
            self::TYPE_LAB         => 'لابراتوار',
            self::TYPE_IMAGING     => 'تصویربرداری',
            self::TYPE_OTHER       => 'سایر',
        ][$this->treatment_type] ?? ($this->treatment_type ?? '—');
    }

    public function getIsMedicationAttribute(): bool
    {
        return $this->treatment_type === self::TYPE_MEDICATION;
    }

    /* ============================================================
     *  Helpers
     * ============================================================ */

    public function recalcTotal(): void
    {
        $this->total_price = round((float) $this->quantity * (float) $this->unit_price, 2);
        $this->saveQuietly();
    }
}