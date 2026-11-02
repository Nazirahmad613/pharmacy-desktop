<?php
// app/Models/EmergencyCase.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class EmergencyCase extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'emergency_cases';
    protected $primaryKey = 'emergency_id';

    protected $fillable = [
        'patient_id', 'reg_id', 'doc_id', 'admitted_by',
        'emergency_no',
        'patient_name', 'tazkira_number', 'patient_age', 'patient_gender',
        'patient_phone', 'patient_blood_group',
        'emergency_contact_name', 'emergency_contact_phone',
        'arrival_time', 'arrival_mode', 'chief_complaint',
        'history_of_present_illness', 'past_medical_history', 'allergies',
        'triage_level', 'triage_score',
        'status', 'discharged_at', 'discharge_summary', 'discharge_type',
        'total_amount', 'is_paid',
    ];

    protected $casts = [
        'patient_id'    => 'integer',
        'reg_id'        => 'integer',
        'doc_id'        => 'integer',
        'admitted_by'   => 'integer',
        'patient_age'   => 'integer',
        'triage_score'  => 'integer',
        'total_amount'  => 'decimal:2',
        'is_paid'       => 'boolean',
        'arrival_time'  => 'datetime',
        'discharged_at' => 'datetime',
    ];

    protected $appends = [
        'triage_label',
        'status_label',
        'triage_color',
        'age_display',
        'duration_label',
    ];

    /* ============================================================
     *  ثابت‌ها
     * ============================================================ */

    public const STATUS_WAITING      = 'waiting';
    public const STATUS_IN_TRIAGE    = 'in_triage';
    public const STATUS_IN_TREATMENT = 'in_treatment';
    public const STATUS_ADMITTED     = 'admitted';
    public const STATUS_DISCHARGED   = 'discharged';
    public const STATUS_TRANSFERRED  = 'transferred';
    public const STATUS_DECEASED     = 'deceased';

    public const TRIAGE_CRITICAL   = 'critical';
    public const TRIAGE_SEVERE     = 'severe';
    public const TRIAGE_MODERATE   = 'moderate';
    public const TRIAGE_MILD       = 'mild';
    public const TRIAGE_NON_URGENT = 'non_urgent';

    /* ============================================================
     *  روابط
     * ============================================================ */

    // ✅ اصلاح شد: ownerKey = 'id' (نه 'patient_id')
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doc_id', 'id');
    }

    public function admittedBy()
    {
        return $this->belongsTo(User::class, 'admitted_by', 'id');
    }

    public function triages()
    {
        return $this->hasMany(EmergencyTriage::class, 'emergency_id', 'emergency_id');
    }

    public function latestTriage()
    {
        return $this->hasOne(EmergencyTriage::class, 'emergency_id', 'emergency_id')
            ->latestOfMany('triage_id');
    }

    public function treatments()
    {
        return $this->hasMany(EmergencyTreatment::class, 'emergency_id', 'emergency_id');
    }

    public function vitals()
    {
        return $this->hasMany(EmergencyVital::class, 'emergency_id', 'emergency_id');
    }

    public function latestVital()
    {
        return $this->hasOne(EmergencyVital::class, 'emergency_id', 'emergency_id')
            ->latestOfMany('vital_id');
    }

    public function journals()
    {
        return $this->hasMany(Journal::class, 'ref_id', 'emergency_id')
            ->where('ref_type', 'emergency');
    }

    /* ============================================================
     *  Scopes
     * ============================================================ */

    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNotIn('status', [
            self::STATUS_DISCHARGED,
            self::STATUS_TRANSFERRED,
            self::STATUS_DECEASED,
        ]);
    }

    public function scopeCritical(Builder $q): Builder
    {
        return $q->whereIn('triage_level', [
            self::TRIAGE_CRITICAL,
            self::TRIAGE_SEVERE,
        ]);
    }

    public function scopeForDoctor(Builder $q, int $docId): Builder
    {
        return $q->where('doc_id', $docId);
    }

    public function scopeForPatient(Builder $q, int $patientId): Builder
    {
        return $q->where('patient_id', $patientId);
    }

    public function scopeForRegistration(Builder $q, int $regId): Builder
    {
        return $q->where('reg_id', $regId);
    }

    public function scopeForDate(Builder $q, string $date): Builder
    {
        return $q->whereDate('arrival_time', $date);
    }

    public function scopeBetween(Builder $q, string $from, string $to): Builder
    {
        return $q->whereBetween('arrival_time', ["{$from} 00:00:00", "{$to} 23:59:59"]);
    }

    public function scopeByTriageLevel(Builder $q, string $level): Builder
    {
        return $q->where('triage_level', $level);
    }

    public function scopeByStatus(Builder $q, string $status): Builder
    {
        return $q->where('status', $status);
    }

    public function scopeSearch(Builder $q, string $term): Builder
    {
        return $q->where(function ($query) use ($term) {
            $query->where('patient_name', 'like', "%{$term}%")
                  ->orWhere('tazkira_number', 'like', "%{$term}%")
                  ->orWhere('emergency_no', 'like', "%{$term}%")
                  ->orWhere('patient_phone', 'like', "%{$term}%")
                  ->orWhere('chief_complaint', 'like', "%{$term}%");
        });
    }

    public function scopeOrderByPriority(Builder $q): Builder
    {
        return $q->orderByRaw("
            CASE triage_score
                WHEN 1 THEN 1
                WHEN 2 THEN 2
                WHEN 3 THEN 3
                WHEN 4 THEN 4
                WHEN 5 THEN 5
                ELSE 6
            END
        ")->orderBy('arrival_time', 'asc');
    }

    /* ============================================================
     *  Accessors
     * ============================================================ */

    public function getTriageLabelAttribute(): ?string
    {
        if (!$this->triage_level) return null;

        return [
            self::TRIAGE_CRITICAL   => 'بحرانی',
            self::TRIAGE_SEVERE     => 'بسیار عاجل',
            self::TRIAGE_MODERATE   => 'عاجل',
            self::TRIAGE_MILD       => 'کم‌خطر',
            self::TRIAGE_NON_URGENT => 'غیرعاجل',
        ][$this->triage_level] ?? $this->triage_level;
    }

    public function getTriageColorAttribute(): ?string
    {
        if (!$this->triage_level) return null;

        return [
            self::TRIAGE_CRITICAL   => 'error',
            self::TRIAGE_SEVERE     => 'warning',
            self::TRIAGE_MODERATE   => 'info',
            self::TRIAGE_MILD       => 'success',
            self::TRIAGE_NON_URGENT => 'default',
        ][$this->triage_level] ?? 'default';
    }

    public function getStatusLabelAttribute(): string
    {
        return [
            self::STATUS_WAITING      => 'در انتظار',
            self::STATUS_IN_TRIAGE    => 'در حال تریاژ',
            self::STATUS_IN_TREATMENT => 'در حال معالجه',
            self::STATUS_ADMITTED     => 'بستر',
            self::STATUS_DISCHARGED   => 'ترخیص‌شده',
            self::STATUS_TRANSFERRED  => 'منتقل‌شده',
            self::STATUS_DECEASED     => 'وفات‌یافته',
        ][$this->status] ?? $this->status;
    }

    public function getAgeDisplayAttribute(): ?string
    {
        if ($this->patient_age === null) return null;
        return $this->patient_age . ' سال';
    }

    public function getDurationLabelAttribute(): ?string
    {
        if (!$this->arrival_time) return null;

        $end = $this->discharged_at ?? now();
        $minutes = $this->arrival_time->diffInMinutes($end);

        if ($minutes < 60) {
            return "{$minutes} دقیقه";
        }

        $hours = floor($minutes / 60);
        $rem   = $minutes % 60;

        return $rem > 0 ? "{$hours} ساعت و {$rem} دقیقه" : "{$hours} ساعت";
    }

    /* ============================================================
     *  Helpers
     * ============================================================ */

    public function isActive(): bool
    {
        return !in_array($this->status, [
            self::STATUS_DISCHARGED,
            self::STATUS_TRANSFERRED,
            self::STATUS_DECEASED,
        ], true);
    }

    public function isCritical(): bool
    {
        return in_array($this->triage_level, [
            self::TRIAGE_CRITICAL,
            self::TRIAGE_SEVERE,
        ], true);
    }

    public function isDischarged(): bool
    {
        return in_array($this->status, [
            self::STATUS_DISCHARGED,
            self::STATUS_TRANSFERRED,
            self::STATUS_DECEASED,
        ], true);
    }

    public function recalcTotal(): void
    {
        $this->total_amount = (float) $this->treatments()
            ->where('is_billable', true)
            ->sum('total_price');
        $this->save();
    }

    public function syncTriageScore(): void
    {
        if (!$this->triage_level) return;

        $this->triage_score = self::scoreForLevel($this->triage_level);
        $this->save();
    }

    public static function scoreForLevel(string $level): int
    {
        return [
            self::TRIAGE_CRITICAL   => 1,
            self::TRIAGE_SEVERE     => 2,
            self::TRIAGE_MODERATE   => 3,
            self::TRIAGE_MILD       => 4,
            self::TRIAGE_NON_URGENT => 5,
        ][$level] ?? 3;
    }

    public static function levelForScore(int $score): string
    {
        return [
            1 => self::TRIAGE_CRITICAL,
            2 => self::TRIAGE_SEVERE,
            3 => self::TRIAGE_MODERATE,
            4 => self::TRIAGE_MILD,
            5 => self::TRIAGE_NON_URGENT,
        ][$score] ?? self::TRIAGE_MODERATE;
    }

    public static function generateEmergencyNo(): string
    {
        $date = now()->format('Ymd');

        $lastNo = static::withTrashed()
            ->whereDate('created_at', today())
            ->orderByDesc('emergency_id')
            ->value('emergency_no');

        $seq = 1;
        if ($lastNo && preg_match('/-(\d+)$/', $lastNo, $m)) {
            $seq = (int) $m[1] + 1;
        }

        return sprintf('EMG-%s-%04d', $date, $seq);
    }

    public function canBeDeleted(): bool
    {
        return !$this->triages()->exists()
            && !$this->treatments()->exists()
            && !$this->vitals()->exists();
    }
}