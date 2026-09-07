<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OperationFee extends Model
{
    use HasFactory;

    protected $table = 'operation_fees';

    protected $fillable = [
        'operation_request_id',
        'reg_id',        // ✅ اینجا reg_id است
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

    // ارتباط با مراجعه - کلید اصلی reg_id
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function operationRequest()
    {
        return $this->belongsTo(OperationRequest::class, 'operation_request_id');
    }

    // Scope ها
    public function scopePending($query)
    {
        return $query->where('payment_status', 'pending');
    }

    public function scopePartial($query)
    {
        return $query->where('payment_status', 'partial');
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }
}