<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrescriptionFee extends Model
{
    use HasFactory;

    protected $table = 'prescription_fees';

    protected $fillable = [
        'registration_id',
        'patient_id',
        'total_amount',
        'paid_amount',
        'discount',
        'remaining_amount',
        'payment_status',
        'payment_method',
        'payment_date',
        'medication_items',
        'description',
        'note',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_amount'     => 'decimal:2',
        'paid_amount'      => 'decimal:2',
        'discount'         => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'medication_items' => 'array',
        'payment_date'     => 'datetime',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by', 'id');
    }
}