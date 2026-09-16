<?php
// app/Models/PharmacyExecution.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PharmacyExecution extends Model
{
    use SoftDeletes;

    protected $table = 'pharmacy_executions';

    protected $fillable = [
        'pres_id', 'patient_id', 'reg_id', 'doc_id', 'executed_by',
        'patient_name', 'tazkira_number', 'patient_age', 'patient_gender',
        'patient_phone', 'patient_address',
        'doctor_name', 'doctor_specialty', 'doctor_department',
        'items',
        'total_amount', 'paid_amount', 'discount', 'remaining_amount',
        'receipt_number', 'status',
        'executed_at', 'sent_to_registration_at', 'paid_at', 'cancelled_at',
        'collected_by', 'notes', 'print_count', 'last_printed_at',
    ];

    protected $casts = [
        'items' => 'array',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'patient_age' => 'integer',
        'print_count' => 'integer',
        'executed_at' => 'datetime',
        'sent_to_registration_at' => 'datetime',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'last_printed_at' => 'datetime',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_SENT = 'sent_to_registration';
    const STATUS_PAID = 'paid';
    const STATUS_CANCELLED = 'cancelled';

    const STATUSES = [
        'pending' => 'در انتظار پرداخت',
        'sent_to_registration' => 'ارسال شده به رسپشن',
        'paid' => 'پرداخت شده',
        'cancelled' => 'لغو شده',
    ];

    protected static function booted()
    {
        static::saving(function ($execution) {
            $remaining = ($execution->total_amount ?? 0)
                       - ($execution->paid_amount ?? 0)
                       - ($execution->discount ?? 0);
            $execution->remaining_amount = max(0, $remaining);

            if (empty($execution->receipt_number)) {
                $execution->receipt_number = self::generateReceiptNumber();
            }
        });
    }

    public static function generateReceiptNumber()
    {
        $prefix = 'PHARM';
        $date = now()->format('Ymd');
        $last = self::whereDate('created_at', today())
            ->whereNotNull('receipt_number')
            ->latest('id')
            ->first();
        $seq = 1;
        if ($last && $last->receipt_number) {
            $parts = explode('-', $last->receipt_number);
            $seq = intval(end($parts)) + 1;
        }
        return $prefix . '-' . $date . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'pres_id', 'pres_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doc_id');
    }

    public function executor()
    {
        return $this->belongsTo(User::class, 'executed_by');
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function getStatusLabelAttribute()
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function sendToRegistration()
    {
        $this->update([
            'status' => self::STATUS_SENT,
            'sent_to_registration_at' => now(),
        ]);
        return $this;
    }

    public function markPaid($collectedBy = null)
    {
        $this->update([
            'status' => self::STATUS_PAID,
            'paid_amount' => ($this->total_amount ?? 0) - ($this->discount ?? 0),
            'remaining_amount' => 0,
            'paid_at' => now(),
            'collected_by' => $collectedBy ?? auth()->id(),
        ]);
        return $this;
    }

    public function incrementPrint()
    {
        $this->increment('print_count');
        $this->update(['last_printed_at' => now()]);
        return $this;
    }
}