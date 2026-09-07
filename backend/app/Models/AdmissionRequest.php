<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdmissionRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'ward_id',
        'bed_id',
        'doctor_id',
        'admission_date',
        'expected_discharge_date',
        'diagnosis',
        'notes',
        'status',
        'payment_status',
        'total_amount',
        'paid_amount'
    ];

    protected $casts = [
        'admission_date' => 'date',
        'expected_discharge_date' => 'date',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2'
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function bed()
    {
        return $this->belongsTo(Bed::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function fees()
    {
        return $this->hasMany(AdmissionFee::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'admitted');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function getRemainingAmountAttribute()
    {
        return $this->total_amount - $this->paid_amount;
    }

    public function getIsFullyPaidAttribute()
    {
        return $this->remaining_amount <= 0;
    }
}