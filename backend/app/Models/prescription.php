<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    protected $table = 'prescriptions';
    protected $primaryKey = 'pres_id';

    // ✅ ثابت‌های وضعیت
    public const STATUS_PENDING              = 'pending';
    public const STATUS_SENT_TO_PHARMACY     = 'sent_to_pharmacy';
    public const STATUS_PHARMACY_REGISTERED  = 'pharmacy_registered';
    public const STATUS_PAID                 = 'paid';
    public const STATUS_CANCELLED            = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING             => 'در انتظار ارسال',
        self::STATUS_SENT_TO_PHARMACY    => 'ارسال شده به دواخانه',
        self::STATUS_PHARMACY_REGISTERED => 'ثبت شده در دواخانه',
        self::STATUS_PAID                => 'پول اخذ شده',
        self::STATUS_CANCELLED           => 'لغو شده',
    ];

    protected $fillable = [
        'patient_id', 'reg_id', 'doc_id',
        'patient_name', 'tazkira_number', 'patient_age', 'patient_gender',
        'patient_phone', 'patient_blood_group', 'doc_name',
        'diagnosis', 'weight', 'blood_pressure', 'temperature', 'oxygen',
        'pres_num', 'pres_date', 'status',
        'sent_to_pharmacy_at', 'pharmacy_registered_at', 'paid_at',
        'pharmacy_id', 'status_note',
    ];

    protected $casts = [
        'pres_date'              => 'date',
        'sent_to_pharmacy_at'    => 'datetime',
        'pharmacy_registered_at' => 'datetime',
        'paid_at'                => 'datetime',
    ];

    // ============================================================
    // ✅ رابطه items — این همان چیزی بود که خطا می‌داد
    // ============================================================
    public function items()
    {
        return $this->hasMany(PrescriptionItem::class, 'pres_id', 'pres_id');
    }

    // ============================================================
    // روابط اصلی
    // ============================================================
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doc_id', 'id');
    }

    public function pharmacy()
    {
        return $this->belongsTo(User::class, 'pharmacy_id', 'id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }
}