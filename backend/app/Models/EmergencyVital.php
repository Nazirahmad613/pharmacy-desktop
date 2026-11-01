<?php
// app/Models/EmergencyVital.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class EmergencyVital extends Model
{
    use HasFactory;

    protected $table = 'emergency_vitals';
    protected $primaryKey = 'vital_id';

    protected $fillable = [
        'emergency_id', 'recorded_by', 'recorded_at',
        'temperature', 'heart_rate', 'blood_pressure', 'respiratory_rate',
        'oxygen_saturation', 'blood_sugar', 'pain_scale', 'notes',
    ];

    protected $casts = [
        'emergency_id'      => 'integer',
        'recorded_by'       => 'integer',
        'heart_rate'        => 'integer',
        'respiratory_rate'  => 'integer',
        'oxygen_saturation' => 'integer',
        'pain_scale'        => 'integer',
        'temperature'       => 'decimal:1',
        'blood_sugar'       => 'decimal:2',
        'recorded_at'       => 'datetime',
    ];

    protected $appends = [
        'recorded_at_human',
        'is_abnormal',
    ];

    /* ============================================================
     *  Boot — اعتبارسنجی محدوده‌ها
     * ============================================================ */

    protected static function booted(): void
    {
        static::saving(function (self $vital) {
            $vital->validateRanges();
        });
    }

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function emergencyCase()
    {
        return $this->belongsTo(EmergencyCase::class, 'emergency_id', 'emergency_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by', 'id');
    }

    /* ============================================================
     *  Scopes
     * ============================================================ */

    public function scopeLatestFirst(Builder $q): Builder
    {
        return $q->orderByDesc('recorded_at');
    }

    public function scopeBetween(Builder $q, string $from, string $to): Builder
    {
        return $q->whereBetween('recorded_at', ["{$from} 00:00:00", "{$to} 23:59:59"]);
    }

    public function scopeForDate(Builder $q, string $date): Builder
    {
        return $q->whereDate('recorded_at', $date);
    }

    /* ============================================================
     *  Accessors
     * ============================================================ */

    public function getRecordedAtHumanAttribute(): ?string
    {
        return $this->recorded_at?->diffForHumans();
    }

    /**
     * آیا هر یک از علائم حیاتی خارج از محدوده طبیعی است؟
     */
    public function getIsAbnormalAttribute(): bool
    {
        if ($this->temperature !== null && ($this->temperature < 36 || $this->temperature > 37.5)) {
            return true;
        }

        if ($this->heart_rate !== null && ($this->heart_rate < 60 || $this->heart_rate > 100)) {
            return true;
        }

        if ($this->respiratory_rate !== null && ($this->respiratory_rate < 12 || $this->respiratory_rate > 20)) {
            return true;
        }

        if ($this->oxygen_saturation !== null && $this->oxygen_saturation < 95) {
            return true;
        }

        /* فشار خون — سیستولیک بین 90 تا 140 */
        if ($this->blood_pressure && preg_match('/^(\d+)\/(\d+)$/', $this->blood_pressure, $m)) {
            $sys = (int) $m[1];
            $dia = (int) $m[2];
            if ($sys < 90 || $sys > 140 || $dia < 60 || $dia > 90) {
                return true;
            }
        }

        return false;
    }

    /* ============================================================
     *  Helpers
     * ============================================================ */

    protected function validateRanges(): void
    {
        $rules = [
            'temperature'       => [25, 50, 'دما'],
            'heart_rate'        => [20, 300, 'ضربان قلب'],
            'respiratory_rate'  => [5, 80, 'تعداد تنفس'],
            'oxygen_saturation' => [0, 100, 'اکسیژن خون'],
            'blood_sugar'       => [0, 900, 'قند خون'],
            'pain_scale'        => [0, 10, 'مقیاس درد'],
        ];

        foreach ($rules as $field => [$min, $max, $label]) {
            $value = $this->{$field};
            if ($value === null) continue;

            if ($value < $min || $value > $max) {
                throw ValidationException::withMessages([
                    $field => "مقدار {$label} باید بین {$min} و {$max} باشد.",
                ]);
            }
        }

        if ($this->blood_pressure && !preg_match('/^\d{2,3}\/\d{2,3}$/', $this->blood_pressure)) {
            throw ValidationException::withMessages([
                'blood_pressure' => 'فرمت فشار خون باید مثل 120/80 باشد.',
            ]);
        }
    }
}