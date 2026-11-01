<?php
// app/Models/EmergencyTriage.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class EmergencyTriage extends Model
{
    use HasFactory;

    protected $table = 'emergency_triages';
    protected $primaryKey = 'triage_id';

    protected $fillable = [
        'emergency_id', 'nurse_id',
        'triage_level', 'triage_score',
        'temperature', 'heart_rate', 'blood_pressure', 'respiratory_rate',
        'oxygen_saturation', 'blood_sugar', 'pain_scale',
        'consciousness_level', 'gcs_score', 'notes',
    ];

    protected $casts = [
        'emergency_id'      => 'integer',
        'nurse_id'          => 'integer',
        'triage_score'      => 'integer',
        'heart_rate'        => 'integer',
        'respiratory_rate'  => 'integer',
        'oxygen_saturation' => 'integer',
        'pain_scale'        => 'integer',
        'gcs_score'         => 'integer',
        'temperature'       => 'decimal:1',
        'blood_sugar'       => 'decimal:2',
    ];

    protected $appends = [
        'triage_label',
        'consciousness_label',
        'is_critical',
    ];

    /* ============================================================
     *  ثابت‌ها
     * ============================================================ */

    public const LEVEL_CRITICAL   = 'critical';
    public const LEVEL_SEVERE     = 'severe';
    public const LEVEL_MODERATE   = 'moderate';
    public const LEVEL_MILD       = 'mild';
    public const LEVEL_NON_URGENT = 'non_urgent';

    public const CONSCIOUSNESS_ALERT        = 'alert';
    public const CONSCIOUSNESS_VERBAL       = 'verbal';
    public const CONSCIOUSNESS_PAINFUL      = 'painful';
    public const CONSCIOUSNESS_UNRESPONSIVE = 'unresponsive';

    /* ============================================================
     *  Boot — هماهنگ‌سازی خودکار triage_score با triage_level
     * ============================================================ */

    protected static function booted(): void
    {
        static::saving(function (self $triage) {
            /* 1. هماهنگ‌سازی score */
            if ($triage->triage_level && !$triage->triage_score) {
                $triage->triage_score = self::scoreForLevel($triage->triage_level);
            }

            /* 2. اعتبارسنجی محدوده‌ها */
            $triage->validateRanges();
        });

        static::saved(function (self $triage) {
            /* بازتاب روی پرونده اصلی */
            $case = $triage->emergencyCase;
            if ($case) {
                $case->triage_level = $triage->triage_level;
                $case->triage_score = $triage->triage_score;

                if (in_array($case->status, [
                    EmergencyCase::STATUS_WAITING,
                    EmergencyCase::STATUS_IN_TRIAGE,
                ], true)) {
                    $case->status = EmergencyCase::STATUS_IN_TRIAGE;
                }

                $case->saveQuietly();
            }
        });
    }

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function emergencyCase()
    {
        return $this->belongsTo(EmergencyCase::class, 'emergency_id', 'emergency_id');
    }

    public function nurse()
    {
        return $this->belongsTo(User::class, 'nurse_id', 'id');
    }

    /* ============================================================
     *  Scopes
     * ============================================================ */

    public function scopeCritical(Builder $q): Builder
    {
        return $q->whereIn('triage_level', [self::LEVEL_CRITICAL, self::LEVEL_SEVERE]);
    }

    public function scopeByLevel(Builder $q, string $level): Builder
    {
        return $q->where('triage_level', $level);
    }

    public function scopeLatestFirst(Builder $q): Builder
    {
        return $q->orderByDesc('triage_id');
    }

    /* ============================================================
     *  Accessors
     * ============================================================ */

    public function getTriageLabelAttribute(): string
    {
        return [
            self::LEVEL_CRITICAL   => 'بحرانی',
            self::LEVEL_SEVERE     => 'بسیار عاجل',
            self::LEVEL_MODERATE   => 'عاجل',
            self::LEVEL_MILD       => 'کم‌خطر',
            self::LEVEL_NON_URGENT => 'غیرعاجل',
        ][$this->triage_level] ?? $this->triage_level;
    }

    public function getConsciousnessLabelAttribute(): ?string
    {
        if (!$this->consciousness_level) return null;

        return [
            self::CONSCIOUSNESS_ALERT        => 'هوشیار',
            self::CONSCIOUSNESS_VERBAL       => 'پاسخ کلامی',
            self::CONSCIOUSNESS_PAINFUL      => 'پاسخ به درد',
            self::CONSCIOUSNESS_UNRESPONSIVE => 'بی‌پاسخ',
        ][$this->consciousness_level] ?? $this->consciousness_level;
    }

    public function getIsCriticalAttribute(): bool
    {
        return in_array($this->triage_level, [self::LEVEL_CRITICAL, self::LEVEL_SEVERE], true);
    }

    /* ============================================================
     *  Helpers
     * ============================================================ */

    public static function scoreForLevel(string $level): int
    {
        return [
            self::LEVEL_CRITICAL   => 1,
            self::LEVEL_SEVERE     => 2,
            self::LEVEL_MODERATE   => 3,
            self::LEVEL_MILD       => 4,
            self::LEVEL_NON_URGENT => 5,
        ][$level] ?? 3;
    }

    public static function levelForScore(int $score): string
    {
        return [
            1 => self::LEVEL_CRITICAL,
            2 => self::LEVEL_SEVERE,
            3 => self::LEVEL_MODERATE,
            4 => self::LEVEL_MILD,
            5 => self::LEVEL_NON_URGENT,
        ][$score] ?? self::LEVEL_MODERATE;
    }

    /**
     * اعتبارسنجی محدوده‌های بالینی
     */
    protected function validateRanges(): void
    {
        $rules = [
            'temperature'       => [25, 50],
            'heart_rate'        => [20, 300],
            'respiratory_rate'  => [5, 80],
            'oxygen_saturation' => [0, 100],
            'blood_sugar'       => [0, 900],
            'pain_scale'        => [0, 10],
            'gcs_score'         => [3, 15],
        ];

        foreach ($rules as $field => [$min, $max]) {
            $value = $this->{$field};
            if ($value === null) continue;

            if ($value < $min || $value > $max) {
                throw ValidationException::withMessages([
                    $field => "مقدار {$field} باید بین {$min} و {$max} باشد.",
                ]);
            }
        }

        /* blood_pressure format: 120/80 */
        if ($this->blood_pressure && !preg_match('/^\d{2,3}\/\d{2,3}$/', $this->blood_pressure)) {
            throw ValidationException::withMessages([
                'blood_pressure' => 'فرمت فشار خون باید مثل 120/80 باشد.',
            ]);
        }

        /* هماهنگی score و level */
        if ($this->triage_level && $this->triage_score) {
            $expected = self::scoreForLevel($this->triage_level);
            if ($expected !== (int) $this->triage_score) {
                throw ValidationException::withMessages([
                    'triage_score' => "امتیاز تریاژ با سطح {$this->triage_level} هماهنگ نیست (باید {$expected} باشد).",
                ]);
            }
        }
    }
}