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
        // ⭐ جدید
        'ref_type',
        'ref_id',
        'source_type',
        'patient_name',
        'patient_phone',
        'tazkira_number',
        'doctor_name',
        'receipt_number',
        // مالی
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

    /* ============================================================
     * روابط مستقیم
     * ============================================================ */

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

    /* ============================================================
     * ⭐ روابط چندریختی (بر اساس ref_type)
     * ============================================================ */

    /**
     * رکورد مرجع (PharmacyExecution برای داخلی | ExternalPrescription برای بیرونی)
     * استفاده: $fee->reference
     */
    public function reference()
    {
        return $this->morphTo(__FUNCTION__, 'ref_type', 'ref_id');
    }

    /**
     * رابطه صریح با PharmacyExecution (نسخه داخلی)
     */
    public function pharmacyExecution()
    {
        return $this->belongsTo(PharmacyExecution::class, 'ref_id', 'id');
    }

    /**
     * رابطه صریح با ExternalPrescription (نسخه بیرونی)
     */
    public function externalPrescription()
    {
        return $this->belongsTo(ExternalPrescription::class, 'ref_id', 'id');
    }

    /* ============================================================
     * ⭐ Accessors هوشمند برای نام‌ها (fallback زنجیره‌ای)
     * ============================================================ */

    /**
     * نام بیمار — اولویت:
     * 1. patient_name مستقیم روی fee
     * 2. patient.first_name + last_name (از patient_id)
     * 3. registration.full_name
     * 4. PharmacyExecution.patient_name (نسخه داخلی)
     * 5. ExternalPrescription.patient_name (نسخه بیرونی)
     */
    public function getDisplayPatientNameAttribute(): ?string
    {
        if (!empty($this->patient_name)) {
            return $this->patient_name;
        }

        if ($this->relationLoaded('patient') && $this->patient) {
            $name = trim(($this->patient->first_name ?? '') . ' ' . ($this->patient->last_name ?? ''));
            if ($name !== '') return $name;
        } elseif (!empty($this->patient_id)) {
            $p = Patient::find($this->patient_id);
            if ($p) {
                $name = trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? ''));
                if ($name !== '') return $name;
            }
        }

        if ($this->relationLoaded('registration') && $this->registration && !empty($this->registration->full_name)) {
            return $this->registration->full_name;
        }

        // Fallback به منبع
        if ($this->ref_type === 'prescription_fee' && $this->ref_id) {
            $ex = PharmacyExecution::find($this->ref_id);
            if ($ex && !empty($ex->patient_name)) return $ex->patient_name;
        }
        if ($this->ref_type === 'external_prescription' && $this->ref_id) {
            $ex = ExternalPrescription::find($this->ref_id);
            if ($ex && !empty($ex->patient_name)) return $ex->patient_name;
        }

        return null;
    }

    /**
     * نام داکتر — اولویت:
     * 1. doctor_name مستقیم روی fee
     * 2. PharmacyExecution.doctor_name
     * 3. ExternalPrescription.doctor_name
     * 4. Registration.doctor_id → User.name
     * 5. Registration.doc_id → User.name
     * 6. Registration.doctor_name
     */
    public function getDisplayDoctorNameAttribute(): ?string
    {
        if (!empty($this->doctor_name)) {
            return $this->doctor_name;
        }

        // از منبع
        if ($this->ref_type === 'prescription_fee' && $this->ref_id) {
            $ex = PharmacyExecution::find($this->ref_id);
            if ($ex) {
                if (!empty($ex->doctor_name)) return $ex->doctor_name;
                if (!empty($ex->doctor_id)) {
                    $doc = User::find($ex->doctor_id);
                    if ($doc) {
                        $n = !empty($doc->name) ? $doc->name : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                        if ($n !== '') return $n;
                    }
                }
            }
        }
        if ($this->ref_type === 'external_prescription' && $this->ref_id) {
            $ex = ExternalPrescription::find($this->ref_id);
            if ($ex && !empty($ex->doctor_name)) return $ex->doctor_name;
        }

        // از registration
        $reg = $this->relationLoaded('registration')
            ? $this->registration
            : ($this->registration_id ? Registrations::where('reg_id', $this->registration_id)->first() : null);

        if ($reg) {
            foreach (['doctor_id', 'doc_id'] as $field) {
                if (!empty($reg->{$field})) {
                    $doc = User::find($reg->{$field});
                    if ($doc) {
                        $n = !empty($doc->name) ? $doc->name : trim(($doc->first_name ?? '') . ' ' . ($doc->last_name ?? ''));
                        if ($n !== '') return $n;
                    }
                }
            }
            if (!empty($reg->doctor_name)) return $reg->doctor_name;
        }

        return null;
    }

    /**
     * شماره تذکره
     */
    public function getDisplayTazkiraAttribute(): ?string
    {
        if (!empty($this->tazkira_number)) return $this->tazkira_number;

        if (!empty($this->patient_id)) {
            $p = Patient::find($this->patient_id);
            if ($p && !empty($p->national_id)) return $p->national_id;
        }

        $reg = $this->relationLoaded('registration')
            ? $this->registration
            : ($this->registration_id ? Registrations::where('reg_id', $this->registration_id)->first() : null);

        if ($reg && !empty($reg->tazkira_number)) return $reg->tazkira_number;

        return null;
    }

    /**
     * شماره تماس بیمار
     */
    public function getDisplayPatientPhoneAttribute(): ?string
    {
        if (!empty($this->patient_phone)) return $this->patient_phone;

        if (!empty($this->patient_id)) {
            $p = Patient::find($this->patient_id);
            if ($p) {
                if (!empty($p->phone)) return $p->phone;
                if (!empty($p->mobile)) return $p->mobile;
            }
        }

        return null;
    }

    /**
     * برچسب منبع
     */
    public function getSourceLabelAttribute(): string
    {
        if ($this->source_type === 'external' || $this->ref_type === 'external_prescription') {
            return 'نسخه بیرونی';
        }
        return 'نسخه داخلی';
    }

    /**
     * آیا فیس پرداخت شده؟
     */
    public function getIsPaidAttribute(): bool
    {
        return $this->payment_status === 'paid';
    }
}