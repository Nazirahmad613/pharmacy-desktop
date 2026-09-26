<?php
// app/Models/Followup.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Followup extends Model
{
    use SoftDeletes;

    protected $table = 'followups';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'follow_up_date',
        'follow_up_time',
        'reason',
        'instructions',
        'priority',
        'status',
        'doctor_notes',
        'patient_notes',
        'reminder_sent',
        'reminder_sent_at',
        'actual_visit_at',
        'actual_reg_id',
        'pdf_file',
        'barcode',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'follow_up_date'    => 'date',
        'follow_up_time'    => 'string',
        'reminder_sent'     => 'boolean',
        'reminder_sent_at'  => 'datetime',
        'actual_visit_at'   => 'datetime',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];

    protected $appends = [
        'priority_label',
        'priority_color',
        'status_label',
        'status_color',
        'is_today',
        'is_past',
        'days_until',
    ];

    // ============================================================
    // روابط
    // ============================================================

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'id');
    }

    public function actualRegistration()
    {
        return $this->belongsTo(Registrations::class, 'actual_reg_id', 'reg_id');
    }

    // ============================================================
    // Scopes
    // ============================================================

    public function scopeByPatient($q, $patientId)
    {
        return $q->where('patient_id', $patientId);
    }

    public function scopeByDoctor($q, $doctorId)
    {
        return $q->where('doctor_id', $doctorId);
    }

    public function scopeByReg($q, $regId)
    {
        return $q->where('reg_id', $regId);
    }

    public function scopeUpcoming($q)
    {
        return $q->where('follow_up_date', '>=', now()->toDateString())
                 ->whereIn('status', ['pending', 'confirmed'])
                 ->orderBy('follow_up_date');
    }

    public function scopeToday($q)
    {
        return $q->whereDate('follow_up_date', now()->toDateString());
    }

    public function scopeOverdue($q)
    {
        return $q->where('follow_up_date', '<', now()->toDateString())
                 ->whereIn('status', ['pending', 'confirmed']);
    }

    public function scopePending($q)
    {
        return $q->where('status', 'pending');
    }

    // ============================================================
    // Accessors
    // ============================================================

    public function getPriorityLabelAttribute(): string
    {
        return match ($this->priority) {
            'urgent'    => '🟡 فوری',
            'emergency' => '🔴 اورژانسی',
            default     => '🟢 عادی',
        };
    }

    public function getPriorityColorAttribute(): string
    {
        return match ($this->priority) {
            'urgent'    => '#f59e0b',
            'emergency' => '#ef4444',
            default     => '#10b981',
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'confirmed'  => '✅ تأیید شده',
            'completed'  => '✅ انجام شده',
            'cancelled'  => '❌ لغو شده',
            'no_show'    => '🚫 نیامده',
            default      => '⏳ در انتظار',
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'confirmed'  => '#3b82f6',
            'completed'  => '#10b981',
            'cancelled'  => '#ef4444',
            'no_show'    => '#6b7280',
            default      => '#f59e0b',
        };
    }

    public function getIsTodayAttribute(): bool
    {
        if (!$this->follow_up_date) return false;
        return Carbon::parse($this->follow_up_date)->isToday();
    }

    public function getIsPastAttribute(): bool
    {
        if (!$this->follow_up_date) return false;
        return Carbon::parse($this->follow_up_date)->isPast()
            && !Carbon::parse($this->follow_up_date)->isToday();
    }

    public function getDaysUntilAttribute(): ?int
    {
        if (!$this->follow_up_date) return null;
        return (int) now()->startOfDay()->diffInDays(
            Carbon::parse($this->follow_up_date)->startOfDay(),
            false
        );
    }
}