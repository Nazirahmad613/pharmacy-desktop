<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperationRequest extends Model
{
    use HasFactory;

    protected $table = 'operation_requests';

    protected $fillable = [
        'registration_id',
        'patient_id',
        'doctor_id',
        'surgery_type',
        'surgeon',
        'anesthesiologist',
        'room_number',
        'scheduled_date',
        'estimated_duration',
        'notes',
        'status',
        'priority',
        'fee_id',
        'fee_amount',
        'fee_paid',
        'fee_status',
        'completed_at',
        'cancelled_at'
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'fee_amount' => 'decimal:2',
        'fee_paid' => 'decimal:2'
    ];

    // Relationships
    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registrations::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function fee(): BelongsTo
    {
        return $this->belongsTo(OperationFee::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    // Accessors
    public function getStatusLabelAttribute(): string
    {
        return [
            'pending' => 'در انتظار',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده'
        ][$this->status] ?? $this->status;
    }

    public function getPriorityLabelAttribute(): string
    {
        return [
            'high' => 'بالا',
            'medium' => 'متوسط',
            'normal' => 'عادی',
            'low' => 'پایین'
        ][$this->priority] ?? $this->priority;
    }

    public function getFeeStatusLabelAttribute(): string
    {
        return [
            'pending' => 'در انتظار پرداخت',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت کامل',
            'refunded' => 'برگشت داده شده',
            'cancelled' => 'لغو شده'
        ][$this->fee_status] ?? $this->fee_status;
    }
}