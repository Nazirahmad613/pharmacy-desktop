<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionFee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'admission_request_id',
        'patient_id',
        'fee_date',
        'fee_time',
        'amount',
        'fee_type',
        'description',
        'receipt_number',
        'payment_method',
        'status',
        'collected_by',
        'collected_at'
    ];

    protected $casts = [
        'fee_date' => 'date',
        'fee_time' => 'datetime:H:i:s',
        'amount' => 'decimal:2',
        'collected_at' => 'datetime'
    ];

    public function admissionRequest()
    {
        return $this->belongsTo(AdmissionRequest::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByAdmission($query, $admissionId)
    {
        return $query->where('admission_request_id', $admissionId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('fee_date', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('fee_date', [now()->startOfWeek(), now()->endOfWeek()]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('fee_date', now()->month)
                     ->whereYear('fee_date', now()->year);
    }

    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 2);
    }

    public function getIsPaidAttribute()
    {
        return $this->status === 'paid';
    }

    public function getCanBeCollectedAttribute()
    {
        return $this->status === 'pending' && $this->admissionRequest->status === 'admitted';
    }
}