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
        'patient_id',
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
     *  ✅ نگاشت ref_type → نام نقش‌ها در Spatie
     *  (مطابق UserController که از assignRole استفاده می‌کند)
     * ============================================================ */
    public const USER_ROLE_MAP = [
        'doctor'         => ['doctor', 'Doctor', 'داکتر'],
        'nurse'          => ['nurse', 'Nurse', 'نرس'],
        'receptionist'   => ['receptionist', 'Receptionist', 'منشی'],
        'accountant'     => ['accountant', 'Accountant', 'محاسب'],
        'pharmacist'     => ['pharmacist', 'Pharmacist', 'دواساز'],
        'laboratorist'   => ['laboratorist', 'Laboratorist', 'لابراتوار'],
        'radiologist'    => ['radiologist', 'Radiologist', 'رادیولوژیست'],
        'staff'          => ['staff', 'Staff', 'کارمند'],
        'admin'          => ['admin', 'Admin', 'ادمین'],
    ];

    /* ============================================================
     *  ✅ نگاشت ref_type → (account_type + account_category)
     *  مطابق جدول accounts و migration شما
     * ============================================================ */
    public const ACCOUNT_MAP = [
        // ============ طرف‌های حساب (Receivable / Payable) ============
        'supplier' => [
            'account_type'       => 'payable',
            'account_categories' => [
                'medicine_suppliers',
                'medical_equipment_suppliers',
                'laboratory_material_suppliers',
                'consumable_material_suppliers',
                'vendors',
                'contractors',
                'other_creditors',
            ],
        ],
        'customer' => [
            'account_type'       => 'receivable',
            'account_categories' => [
                'insurance_companies',
                'contracting_institutions',
                'companies',
                'corporate_customers',
                'miscellaneous_receivables',
                'other_receivables',
            ],
        ],
        'company' => [
            'account_type'       => 'receivable',
            'account_categories' => ['companies', 'corporate_customers'],
        ],
        'vendor' => [
            'account_type'       => 'payable',
            'account_categories' => ['vendors', 'contractors'],
        ],
        'drug_company' => [
            'account_type'       => 'payable',
            'account_categories' => ['medicine_suppliers'],
        ],

        // ============ مصارف (Expense) ============
        'rent' => [
            'account_type'       => 'expense',
            'account_categories' => ['rent_expense'],
        ],
        'electricity' => [
            'account_type'       => 'expense',
            'account_categories' => ['electricity_expense'],
        ],
        'water' => [
            'account_type'       => 'expense',
            'account_categories' => ['water_expense'],
        ],
        'internet' => [
            'account_type'       => 'expense',
            'account_categories' => ['internet_expense'],
        ],
        'salary' => [
            'account_type'       => 'expense',
            'account_categories' => ['salary_expense'],
        ],
        'fuel' => [
            'account_type'       => 'expense',
            'account_categories' => ['fuel_expense'],
        ],
        'maintenance' => [
            'account_type'       => 'expense',
            'account_categories' => [
                'repair_expense',
                'medical_equipment_repair_expense',
                'building_repair_expense',
            ],
        ],
        'transport' => [
            'account_type'       => 'expense',
            'account_categories' => ['transportation_expense'],
        ],
        'consultation' => [
            'account_type'       => 'expense',
            'account_categories' => ['administrative_expense', 'other_expense'],
        ],
        'laboratory' => [
            'account_type'       => 'expense',
            'account_categories' => ['laboratory_material_expense'],
        ],
        'expense' => [
            'account_type'       => 'expense',
            'account_categories' => [], // همه مصارف
        ],

        // ============ درآمد ============
        'income' => [
            'account_type'       => 'income',
            'account_categories' => [],
        ],
    ];

    /* ============================================================
     *  روابط
     * ============================================================ */

    public function user()         { return $this->belongsTo(User::class); }
    public function registration() { return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id'); }
    public function patient()      { return $this->belongsTo(Patient::class, 'patient_id', 'id'); }
    public function parent()       { return $this->belongsTo(Journal::class, 'parent_journal_id'); }
    public function children()     { return $this->hasMany(Journal::class, 'parent_journal_id'); }

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
     *  ✅ حل نام منبع (برای نمایش در جدول)
     * ============================================================ */
    public function resolveSourceName(): string
    {
        $refType = $this->ref_type;
        $refId   = $this->ref_id;

        if (!$refType || !$refId) {
            return $this->description ?: '-';
        }

        try {
            /* 1) مریض → registrations → patients */
            if ($refType === 'patient') {
                return $this->resolvePatientName()
                    ?? "مریض #{$refId}";
            }

            /* 2) کارمندان → users (Spatie) */
            if (array_key_exists($refType, self::USER_ROLE_MAP)) {
                $u = User::find($refId);
                return $u->name ?? "کاربر #{$refId}";
            }

            /* 3) حساب‌ها → accounts */
            if (array_key_exists($refType, self::ACCOUNT_MAP)) {
                $a = Account::find($refId);
                if ($a) {
                    return $a->account_name ?? "حساب #{$refId}";
                }
                return "حساب #{$refId}";
            }

            /* 4) فروش */
            if ($refType === 'sale') {
                $sale = Sales::with('customer')->find($refId);
                if ($sale && $sale->customer) {
                    return $sale->customer->full_name
                        ?? $sale->customer->account_name
                        ?? $sale->customer->name
                        ?? "فروش #{$refId}";
                }
                return "فروش #{$refId}";
            }

            /* 5) خرید */
            if ($refType === 'parchase') {
                $p = Parchase::with('supplier')->find($refId);
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
     *  ✅ استخراج نام مریض (first_name + last_name از patients)
     * ============================================================ */
    protected function resolvePatientName(): ?string
    {
        // 1) patient_id مستقیم
        if (!empty($this->patient_id)) {
            $p = Patient::find($this->patient_id);
            if ($p) {
                $name = trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? ''));
                if ($name !== '') return $name;
            }
        }

        // 2) reg_id → registrations.patient_id → patients
        $regId = $this->reg_id ?: $this->ref_id;
        if ($regId) {
            $reg = Registrations::where('reg_id', $regId)->first();
            if ($reg && !empty($reg->patient_id)) {
                $p = Patient::find($reg->patient_id);
                if ($p) {
                    $name = trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? ''));
                    if ($name !== '') return $name;
                }
            }
            // اگر patients پیدا نشد، از registrations.full_name استفاده کن
            if ($reg && !empty($reg->full_name)) {
                return $reg->full_name;
            }
        }

        // 3) ref_id مستقیم به‌عنوان patient_id
        if (!empty($this->ref_id)) {
            $p = Patient::find($this->ref_id);
            if ($p) {
                $name = trim(($p->first_name ?? '') . ' ' . ($p->last_name ?? ''));
                if ($name !== '') return $name;
            }
        }

        return null;
    }

    /* ============================================================
     *  ✅✅✅  دریافت لیست منابع (سه منبع)
     *
     *  1) patient    → registrations + patients
     *  2) employees  → users (Spatie roles)
     *  3) accounts   → accounts (type + category)
     * ============================================================ */
        public static function getRefSources(string $type, ?string $search = null, int $limit = 100): array
    {
        $search = trim((string) $search);

        try {
            /* ====================================================
             *  1) مریض → شروع از جدول patients (نه registrations)
             * ==================================================== */
            if ($type === 'patient') {

                // ✅ مستقیماً از patients شروع می‌کنیم
                $query = Patient::query()
                    ->select([
                        'patients.id as patient_id',
                        'patients.first_name',
                        'patients.last_name',
                        'patients.national_id',
                        'patients.mobile',
                        'patients.patient_code',
                        'patients.status',
                    ]);

                // ✅ آخرین reg_id را به‌عنوان زیرکوئری بگیر
                // (اگر مریض چند مراجعه دارد، آخرین مراجعه انتخاب می‌شود)
                $query->addSelect([
                    'last_reg_id' => Registrations::select('reg_id')
                        ->whereColumn('registrations.patient_id', 'patients.id')
                        ->orderByDesc('reg_id')
                        ->limit(1),
                ]);

                // ✅ فقط مریضان فعال
                if (Schema::hasColumn('patients', 'status')) {
                    $query->where(function ($q) {
                        $q->where('patients.status', 'Active')
                          ->orWhereNull('patients.status');
                    });
                }

                // ✅ جستجو
                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('patients.first_name', 'like', "%{$search}%")
                          ->orWhere('patients.last_name', 'like', "%{$search}%")
                          ->orWhere('patients.national_id', 'like', "%{$search}%")
                          ->orWhere('patients.mobile', 'like', "%{$search}%")
                          ->orWhere('patients.patient_code', 'like', "%{$search}%")
                          ->orWhereRaw(
                              "CONCAT(COALESCE(patients.first_name,''), ' ', COALESCE(patients.last_name,'')) LIKE ?",
                              ["%{$search}%"]
                          );
                    });
                }

                $rows = $query->orderBy('patients.first_name')
                    ->orderBy('patients.last_name')
                    ->limit($limit)
                    ->get();

                $results = [];
                foreach ($rows as $r) {
                    $patientName = trim(
                        ($r->first_name ?? '') . ' ' . ($r->last_name ?? '')
                    );

                    $displayName = $patientName !== ''
                        ? $patientName
                        : "مریض #{$r->patient_id}";

                    // ✅ اگر patient_code دارد، در نام نمایش بده (کمک به تشخیص)
                    if (!empty($r->patient_code)) {
                        $displayName .= " ({$r->patient_code})";
                    }

                    $results[] = [
                        'id'          => $r->last_reg_id ?? $r->patient_id, // ref_id
                        'name'        => $displayName,
                        'code'        => $r->patient_code ?? $r->last_reg_id,
                        'national_id' => $r->national_id ?? null,
                        'mobile'      => $r->mobile ?? null,
                        'reg_id'      => $r->last_reg_id ?? null,   // ← برای ذخیره در ژورنال
                        'patient_id'  => $r->patient_id,             // ← برای پشتیبان
                    ];
                }

                return $results;
            }

            /* ====================================================
             *  2) کارمندان → users (با Spatie Permission)
             * ==================================================== */
            if (array_key_exists($type, self::USER_ROLE_MAP)) {
                $roles = self::USER_ROLE_MAP[$type];

                $query = User::query();

                if (method_exists(User::class, 'roles')) {
                    $query->whereHas('roles', function ($q) use ($roles) {
                        $q->whereIn('name', $roles);
                    });
                } elseif (Schema::hasColumn('users', 'role')) {
                    $query->whereIn('role', $roles);
                }

                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                        if (Schema::hasColumn('users', 'phone')) {
                            $q->orWhere('phone', 'like', "%{$search}%");
                        }
                    });
                }

                return $query->orderBy('name')
                    ->limit($limit)
                    ->get()
                    ->map(function ($u) {
                        return [
                            'id'          => $u->id,
                            'name'        => $u->name ?? "کاربر #{$u->id}",
                            'code'        => $u->code ?? null,
                            'national_id' => $u->national_id ?? null,
                            'mobile'      => $u->phone ?? null,
                            'reg_id'      => null,
                        ];
                    })
                    ->toArray();
            }

            /* ====================================================
             *  3) حساب‌ها → accounts
             * ==================================================== */
            if (array_key_exists($type, self::ACCOUNT_MAP)) {
                $config = self::ACCOUNT_MAP[$type];
                $accountType       = $config['account_type'] ?? null;
                $accountCategories = $config['account_categories'] ?? [];

                $query = Account::query()
                    ->where('is_active', true)
                    ->where('allow_transactions', true);

                if ($accountType) {
                    $query->where('account_type', $accountType);
                }

                if (!empty($accountCategories)) {
                    $query->whereIn('account_category', $accountCategories);
                }

                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('account_name', 'like', "%{$search}%")
                          ->orWhere('account_code', 'like', "%{$search}%");
                    });
                }

                return $query->orderBy('account_name')
                    ->limit($limit)
                    ->get()
                    ->map(function ($a) {
                        return [
                            'id'          => $a->id,
                            'name'        => $a->account_name ?? "حساب #{$a->id}",
                            'code'        => $a->account_code ?? null,
                            'national_id' => null,
                            'mobile'      => null,
                            'reg_id'      => null,
                        ];
                    })
                    ->toArray();
            }

            /* ====================================================
             *  4) فروش → Sales
             * ==================================================== */
            if ($type === 'sale') {
                return Sales::with('customer')
                    ->orderByDesc('id')
                    ->limit($limit)
                    ->get()
                    ->map(function ($s) {
                        $name = $s->customer->full_name
                            ?? $s->customer->account_name
                            ?? $s->customer->name
                            ?? "فروش #{$s->id}";
                        return [
                            'id'          => $s->id,
                            'name'        => $name . " (فروش #{$s->id})",
                            'code'        => $s->invoice_number ?? null,
                            'national_id' => $s->customer->tazkira_number ?? null,
                            'mobile'      => null,
                            'reg_id'      => null,
                        ];
                    })
                    ->toArray();
            }

            /* ====================================================
             *  5) خرید → Parchase
             * ==================================================== */
            if ($type === 'parchase') {
                return Parchase::with('supplier')
                    ->orderByDesc('id')
                    ->limit($limit)
                    ->get()
                    ->map(function ($p) {
                        $name = $p->supplier->account_name
                            ?? $p->supplier->full_name
                            ?? $p->supplier->name
                            ?? "خرید #{$p->id}";
                        return [
                            'id'          => $p->id,
                            'name'        => $name . " (خرید #{$p->id})",
                            'code'        => $p->invoice_number ?? null,
                            'national_id' => $p->supplier->tazkira_number ?? null,
                            'mobile'      => null,
                            'reg_id'      => null,
                        ];
                    })
                    ->toArray();
            }

            return [];

        } catch (\Throwable $e) {
            Log::error("getRefSources failed for type={$type}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return [];
        }
    }
}