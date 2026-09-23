<?php
// app/Models/Journal.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class Journal extends Model
{
    use HasFactory;

    protected $table = 'journals';

    protected $fillable = [
        'journal_date', 'description', 'entry_type', 'amount',
        'tazkira_number', 'ref_type', 'ref_id', 'user_id',
        'pres_num', 'pres_id', 'doc_id', 'cust_id', 'supplier_id',
        'med_id', 'parchase_id', 'reg_id', 'parent_journal_id',
        'patient_id', // ✅ اگر در جدول journals دارید
    ];

    protected $casts = [
        'journal_date'      => 'date',
        'amount'            => 'decimal:2',
        'reg_id'            => 'integer',
        'parent_journal_id' => 'integer',
        'ref_id'            => 'integer',
    ];

    protected $attributes = [
        'entry_type' => self::ENTRY_DEBIT,
    ];

    protected $appends = ['balance'];

    public const ENTRY_DEBIT  = 'debit';
    public const ENTRY_CREDIT = 'credit';

    /* ============================================================
     *  نگاشت ref_type
     * ============================================================ */

    public const USER_ROLE_MAP = [
        'doctor'         => ['doctor', 'Doctor', 'داکتر', 'doctors'],
        'nurse'          => ['nurse', 'Nurse', 'نرس', 'nurses'],
        'receptionist'   => ['receptionist', 'Receptionist', 'منشی'],
        'accountant'     => ['accountant', 'Accountant', 'محاسب'],
        'pharmacist'     => ['pharmacist', 'Pharmacist', 'دواساز'],
        'laboratorist'   => ['laboratorist', 'Laboratorist', 'لابراتوار'],
        'radiologist'    => ['radiologist', 'Radiologist', 'رادیولوژیست'],
        'staff'          => ['staff', 'Staff', 'کارمند'],
        'admin'          => ['admin', 'Admin', 'ادمین'],
    ];

    public const ACCOUNT_CATEGORY_MAP = [
        'supplier' => [
            'medicine_suppliers',
            'medical_equipment_suppliers',
            'laboratory_material_suppliers',
            'consumable_material_suppliers',
            'suppliers',
        ],
        'customer' => [
            'corporate_customers',
            'companies',
            'insurance_companies',
            'contracting_institutions',
            'miscellaneous_receivables',
        ],
        'company' => [
            'companies',
            'corporate_customers',
        ],
        'vendor' => [
            'vendors',
            'contractors',
        ],
        'drug_company' => [
            'medicine_suppliers',
        ],
    ];

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'id');
    }

    public function parent()
    {
        return $this->belongsTo(Journal::class, 'parent_journal_id');
    }

    public function children()
    {
        return $this->hasMany(Journal::class, 'parent_journal_id');
    }

    /* ============================================================
     *  Scopes
     * ============================================================ */

    public function scopeDebit($query)   { return $query->where('entry_type', self::ENTRY_DEBIT); }
    public function scopeCredit($query)  { return $query->where('entry_type', self::ENTRY_CREDIT); }
    public function scopeParentOnly($query) { return $query->whereNull('parent_journal_id'); }
    public function scopeChildOnly($query)  { return $query->whereNotNull('parent_journal_id'); }
    public function scopeForRegistration($query, $regId) { return $query->where('reg_id', $regId); }

    /* ============================================================
     *  Accessors
     * ============================================================ */

    public function getBalanceAttribute(): float
    {
        return $this->entry_type === self::ENTRY_CREDIT
            ? -(float) $this->amount
            :  (float) $this->amount;
    }

    public function getEntryTypeLabelAttribute(): string
    {
        return $this->entry_type === self::ENTRY_DEBIT ? 'بدهکار' : 'بستانکار';
    }

    public function isParent(): bool { return is_null($this->parent_journal_id); }
    public function isChild(): bool  { return !is_null($this->parent_journal_id); }

    /* ============================================================
     *  ✅ حل نام منبع (اصلاح‌شده برای patient با reg_id)
     * ============================================================ */

    public function resolveSourceName(): string
    {
        $refType = $this->ref_type;
        $refId   = $this->ref_id;

        if (!$refType || !$refId) {
            return $this->description ?: '-';
        }

        try {
            /* ====================================================
             *  patient → patients (با پشتیبانی از reg_id و patient_id)
             * ==================================================== */
            if ($refType === 'patient') {
                $patient = $this->resolvePatient();

                if ($patient) {
                    $name = trim(
                        ($patient->first_name ?? '') . ' ' .
                        ($patient->last_name ?? '')
                    );
                    return $name !== '' ? $name : "مریض #{$patient->id}";
                }

                return "مریض #{$refId}";
            }

            /* ====================================================
             *  doctor, nurse, ... → users
             * ==================================================== */
            if (array_key_exists($refType, self::USER_ROLE_MAP)) {
                $u = \App\Models\User::find($refId);
                if ($u) {
                    return $u->name ?? "کاربر #{$refId}";
                }
                return "کاربر #{$refId}";
            }

            /* ====================================================
             *  supplier, customer, ... → accounts
             * ==================================================== */
            if (array_key_exists($refType, self::ACCOUNT_CATEGORY_MAP)) {
                $a = \App\Models\Account::find($refId);
                if ($a) {
                    return $a->account_name ?? "حساب #{$refId}";
                }
                return "حساب #{$refId}";
            }

            /* ====================================================
             *  sale → sales → customer
             * ==================================================== */
            if ($refType === 'sale') {
                $sale = \App\Models\Sales::with('customer')->find($refId);
                if ($sale && $sale->customer) {
                    return $sale->customer->full_name
                        ?? $sale->customer->account_name
                        ?? $sale->customer->name
                        ?? "فروش #{$refId}";
                }
                return "فروش #{$refId}";
            }

            /* ====================================================
             *  parchase → parchases → supplier
             * ==================================================== */
            if ($refType === 'parchase') {
                $p = \App\Models\Parchase::with('supplier')->find($refId);
                if ($p && $p->supplier) {
                    return $p->supplier->account_name
                        ?? $p->supplier->full_name
                        ?? $p->supplier->name
                        ?? "خرید #{$refId}";
                }
                return "خرید #{$refId}";
            }

            return "منبع #{$refId}";

        } catch (\Throwable $e) {
            Log::warning('resolveSourceName failed for Journal #' . $this->id . ': ' . $e->getMessage());
            return $this->description ?: '-';
        }
    }

    /* ============================================================
     *  ✅ حل Patient از چند مسیر ممکن
     * ============================================================ */
    protected function resolvePatient(): ?\App\Models\Patient
    {
        /* ---- 1) اگر patient_id مستقیم در ژورنال هست ---- */
        if (!empty($this->patient_id)) {
            $p = \App\Models\Patient::find($this->patient_id);
            if ($p) return $p;
        }

        /* ---- 2) اگر reg_id در ژورنال هست، از Registrations استفاده کن ---- */
        if (!empty($this->reg_id)) {
            $reg = \App\Models\Registrations::where('reg_id', $this->reg_id)->first();
            if ($reg && !empty($reg->patient_id)) {
                $p = \App\Models\Patient::find($reg->patient_id);
                if ($p) return $p;
            }
        }

        /* ---- 3) ref_id ممکن است reg_id باشد (نه patient_id) ---- */
        // ابتدا تلاش کن به‌عنوان reg_id تفسیر کنی
        $reg = \App\Models\Registrations::where('reg_id', $this->ref_id)->first();
        if ($reg && !empty($reg->patient_id)) {
            $p = \App\Models\Patient::find($reg->patient_id);
            if ($p) return $p;
        }

        /* ---- 4) ref_id ممکن است patient_id باشد ---- */
        $p = \App\Models\Patient::find($this->ref_id);
        if ($p) return $p;

        return null;
    }
}