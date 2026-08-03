<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PrescriptionFee extends Model
{
    use SoftDeletes;

    protected $table = 'prescription_fees';

    protected $fillable = [
        'registration_id',
        'patient_id',
        'prescription_id',
        'total_amount',
        'paid_amount',
        'discount',
        'remaining_amount',
        'payment_status',
        'payment_method',
        'transaction_id',
        'payment_date',
        'description',
        'note',
        'medication_items',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'medication_items' => 'array',
        'payment_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    // ============ Relations ============
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ============ Accessors ============
    public function getPaymentStatusLabelAttribute()
    {
        $statuses = [
            'pending' => 'در انتظار پرداخت',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت کامل',
            'refunded' => 'برگشت داده شده',
            'cancelled' => 'لغو شده'
        ];
        return $statuses[$this->payment_status] ?? $this->payment_status;
    }

    public function getPaymentStatusColorAttribute()
    {
        $colors = [
            'pending' => '#f59e0b',
            'partial' => '#f97316',
            'paid' => '#22c55e',
            'refunded' => '#8b5cf6',
            'cancelled' => '#ef4444'
        ];
        return $colors[$this->payment_status] ?? '#6b7280';
    }

    // ============ Scopes ============
    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByRegistration($query, $registrationId)
    {
        return $query->where('registration_id', $registrationId);
    }
}