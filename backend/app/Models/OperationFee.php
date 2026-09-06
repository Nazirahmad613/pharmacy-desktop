<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperationFee extends Model
{
    use HasFactory;

    protected $table = 'operation_fees';

    protected $fillable = [
        'operation_request_id',
        'registration_id',
        'patient_id',
        'doctor_id',
        'total_amount',
        'paid_amount',
        'discount',
        'discount_percent',
        'remaining_amount',
        'payment_method',
        'payment_status',
        'payment_date',
        'transaction_id',
        'description',
        'note',
        'collected_by'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'payment_date' => 'datetime'
    ];

    // Relationships
    public function operationRequest(): BelongsTo
    {
        return $this->belongsTo(OperationRequest::class);
    }

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

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopePartial($query)
    {
        return $query->where('payment_status', 'partial');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    // Accessors
    public function getPaymentStatusLabelAttribute(): string
    {
        return [
            'pending' => 'در انتظار پرداخت',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت کامل',
            'refunded' => 'برگشت داده شده',
            'cancelled' => 'لغو شده'
        ][$this->payment_status] ?? $this->payment_status;
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return [
            'cash' => 'نقدی',
            'card' => 'کارت بانکی',
            'online' => 'آنلاین',
            'insurance' => 'بیمه'
        ][$this->payment_method] ?? $this->payment_method;
    }

    // Methods
    public function calculateRemaining(): float
    {
        $discounted = $this->total_amount - $this->discount;
        $this->remaining_amount = max(0, $discounted - $this->paid_amount);
        return $this->remaining_amount;
    }

    public function updatePaymentStatus(): void
    {
        $this->calculateRemaining();
        
        if ($this->remaining_amount <= 0) {
            $this->payment_status = 'paid';
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }
        $this->save();
    }
}