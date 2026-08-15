<?php
// app/Models/QRCode.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QRCode extends Model
{
    

    use HasFactory;
protected $table = 'qr_codes';
    protected $fillable = [
        'laboratory_fee_id',
        'laboratory_request_id',
        'patient_id',
        'registration_id',
        'qr_code_path',
        'qr_code_data',
        'qr_code_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'qr_code_data' => 'array',
    ];

    public function laboratoryFee()
    {
        return $this->belongsTo(LaboratoryFee::class);
    }

    public function laboratoryRequest()
    {
        return $this->belongsTo(LaboratoryRequest::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class);
    }
}