<?php
// app/Models/Journal.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Journal extends Model
{
    use HasFactory;

    protected $table = 'journals';

    protected $fillable = [
        'journal_date',
        'description',
        'entry_type',
        'amount',
        'tazkira_number',
        'ref_type',
        'ref_id',
        'user_id',
        'pres_num',
        'pres_id',
        'doc_id',
        'cust_id',
        'supplier_id',
        'med_id',
        'parchase_id',
        'reg_id',
        'parent_journal_id',
    ];

    protected $casts = [
        'journal_date'      => 'date',
        'amount'            => 'decimal:2',
        'reg_id'            => 'integer',
        'parent_journal_id' => 'integer',
        'ref_id'            => 'integer',
        'pres_id'           => 'integer',
        'doc_id'            => 'integer',
        'cust_id'           => 'integer',
        'supplier_id'       => 'integer',
        'med_id'            => 'integer',
        'parchase_id'       => 'integer',
        'user_id'           => 'integer',
    ];

    protected $attributes = [
        'entry_type' => self::ENTRY_DEBIT,
    ];

    protected $appends = [
        'balance',
    ];

    public const ENTRY_DEBIT  = 'debit';
    public const ENTRY_CREDIT = 'credit';

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function registration()
    {
        return $this->belongsTo(
            Registrations::class,
            'reg_id',
            'reg_id'
        );
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
     *  Scope ها
     * ============================================================ */

    public function scopeDebit($query)
    {
        return $query->where('entry_type', self::ENTRY_DEBIT);
    }

    public function scopeCredit($query)
    {
        return $query->where('entry_type', self::ENTRY_CREDIT);
    }

    public function scopeParentOnly($query)
    {
        return $query->whereNull('parent_journal_id');
    }

    public function scopeChildOnly($query)
    {
        return $query->whereNotNull('parent_journal_id');
    }

    public function scopeForRegistration($query, $regId)
    {
        return $query->where('reg_id', $regId);
    }

    /* ============================================================
     *  Accessor ها
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

    public function getAmountNumericAttribute(): float
    {
        return (float) $this->amount;
    }

    /* ============================================================
     *  متدهای کمکی
     * ============================================================ */

    public function isParent(): bool
    {
        return is_null($this->parent_journal_id);
    }

    public function isChild(): bool
    {
        return !is_null($this->parent_journal_id);
    }

    /* ============================================================
     *  ✅ حل نام منبع (Source Name Resolution)
     * ============================================================
     *
     * بر اساس ref_type، نام منبع را از جدول مربوطه برمی‌گرداند:
     *   - patient          → patients (first_name + last_name)
     *   - doctor, nurse,
     *     staff, ...       → users (name)
     *   - supplier,
     *     customer, ...    → accounts (account_name)
     *   - sale             → sales → customer
     *   - parchase         → parchases → supplier
     *   - سایر             → از description یا "-"
     *
     * @return string
     */
    public function resolveSourceName(): string
    {
        // لیست انواعی که از جدول users می‌آیند
        $userTypes = [
            'doctor', 'nurse', 'staff', 'employee',
            'admin', 'receptionist', 'accountant',
            'pharmacist', 'laboratorist', 'radiologist',
        ];

        // لیست انواعی که از جدول accounts می‌آیند
        $accountTypes = [
            'supplier', 'customer', 'company',
            'drug_company', 'vendor',
        ];

        try {
            /* ---------- patient → patients ---------- */
            if ($this->ref_type === 'patient' && $this->ref_id) {
                $patient = \App\Models\Patient::find($this->ref_id);
                if ($patient) {
                    return trim(
                        ($patient->first_name ?? '') . ' ' .
                        ($patient->last_name ?? '')
                    ) ?: "مریض #{$this->ref_id}";
                }
                return "مریض #{$this->ref_id}";
            }

            /* ---------- doctor, staff, ... → users ---------- */
            if (in_array($this->ref_type, $userTypes, true) && $this->ref_id) {
                $user = \App\Models\User::find($this->ref_id);
                if ($user) {
                    return $user->name ?? "کاربر #{$this->ref_id}";
                }
                return "کاربر #{$this->ref_id}";
            }

            /* ---------- supplier, customer, ... → accounts ---------- */
            if (in_array($this->ref_type, $accountTypes, true) && $this->ref_id) {
                $account = \App\Models\Account::find($this->ref_id);
                if ($account) {
                    return $account->account_name ?? "حساب #{$this->ref_id}";
                }
                return "حساب #{$this->ref_id}";
            }

            /* ---------- sale → sales → customer ---------- */
            if ($this->ref_type === 'sale' && $this->ref_id) {
                $sale = \App\Models\Sales::with('customer')->find($this->ref_id);
                if ($sale && $sale->customer) {
                    return $sale->customer->full_name
                        ?? $sale->customer->name
                        ?? "فروش #{$this->ref_id}";
                }
                return "فروش #{$this->ref_id}";
            }

            /* ---------- parchase → parchases → supplier ---------- */
            if ($this->ref_type === 'parchase' && $this->ref_id) {
                $parchase = \App\Models\Parchase::with('supplier')->find($this->ref_id);
                if ($parchase && $parchase->supplier) {
                    return $parchase->supplier->account_name
                        ?? $parchase->supplier->full_name
                        ?? "خرید #{$this->ref_id}";
                }
                return "خرید #{$this->ref_id}";
            }

            /* ---------- سایر انواع با ref_id ---------- */
            if ($this->ref_id) {
                return "منبع #{$this->ref_id}";
            }

            /* ---------- هیچ ref_id ---------- */
            return $this->description ?: '-';

        } catch (\Throwable $e) {
            \Log::warning('resolveSourceName failed for Journal #' . $this->id . ': ' . $e->getMessage());
            return $this->description ?: '-';
        }
    }
}