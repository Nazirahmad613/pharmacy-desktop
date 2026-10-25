<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $table = 'accounts';

    /*
    |--------------------------------------------------------------------------
    | Mass Assignment
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        // مشخصات اصلی حساب
        'account_code',
        'account_name',

        // نوع و دسته‌بندی
        'account_type',
        'account_category',

        // ساختار حساب
        'parent_id',

        // ماهیت حساب
        'normal_balance',

        // موجودی افتتاحیه
        'opening_balance',
        'opening_balance_type',

        // واحد پول
        'currency',

        // اطلاعات تماس
        'contact_person',
        'phone',
        'mobile',
        'email',

        // اطلاعات هویتی
        'tazkira_number',
        'tax_number',

        // آدرس
        'country',
        'province',
        'district',
        'address',

        // شرایط مالی
        'credit_limit',

        // توضیحات
        'description',

        // تنظیمات حساب
        'is_system',
        'allow_transactions',
        'is_control_account',
        'is_active',
    ];

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'opening_balance' => 'decimal:2',
            'credit_limit' => 'decimal:2',
            'is_system' => 'boolean',
            'allow_transactions' => 'boolean',
            'is_control_account' => 'boolean',
            'is_active' => 'boolean',
            'parent_id' => 'integer',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ دسته‌بندی‌های مجاز بر اساس نوع حساب
    |--------------------------------------------------------------------------
    */

    public const CATEGORIES = [
        'asset' => [
            'cash', 'bank', 'medicine_inventory', 'laboratory_inventory',
            'consumable_inventory', 'medical_equipment', 'office_equipment',
            'tools_and_supplies', 'building', 'land', 'vehicle', 'furniture',
            'prepayments', 'deposits', 'other_assets',
        ],

        'liability' => [
            'suppliers', 'medicine_purchase_payable', 'equipment_purchase_payable',
            'laboratory_material_payable', 'salary_payable', 'tax_payable',
            'loans', 'bank_loans', 'contractual_liabilities', 'other_liabilities',
        ],

        'equity' => [
            'initial_capital', 'owner_capital', 'partners_capital',
            'retained_earnings', 'retained_losses', 'owner_drawings', 'other_equity',
        ],

        'income' => [
            'medical_services_income', 'consultation_income', 'laboratory_income',
            'radiology_income', 'operation_income', 'admission_income', 'pharmacy_income',
            'goods_sales_income', 'operation_room_income', 'other_services_income',
            'non_operating_income', 'rent_income', 'customers_income', 'other_income',
        ],

        'expense' => [
            'salary_expense', 'rent_expense', 'electricity_expense', 'water_expense',
            'internet_expense', 'telephone_expense', 'transportation_expense',
            'consumable_material_expense', 'medical_material_expense',
            'laboratory_material_expense', 'cleaning_material_expense',
            'repair_expense', 'medical_equipment_repair_expense',
            'building_repair_expense', 'fuel_expense', 'stationery_expense',
            'administrative_expense', 'marketing_expense', 'legal_expense',
            'tax_and_duty_expense', 'insurance_expense', 'bank_charge_expense',
            'depreciation_expense', 'other_expense',
        ],

        'receivable' => [
            'insurance_companies', 'contracting_institutions', 'companies',
            'corporate_customers', 'customers', 'miscellaneous_receivables',
            'other_receivables',
        ],

        'payable' => [
            'medicine_suppliers',
            'medical_equipment_suppliers',
            'laboratory_material_suppliers',
            'consumable_material_suppliers',
            'vendors',
            'contractors',
            'salary_payables',
            'tax_payables',
            'bank_payables',
            'other_creditors',
        ],

        // ✅ Employee - کارمندان (نوع مستقل، سه گروه)
        'employee' => [
            // کارمندان رسمی
            'employee_doctor', 'employee_nurse', 'employee_radiology',
            'employee_laboratory', 'employee_pharmacy', 'employee_reception',
            'employee_administration', 'employee_finance', 'employee_cleaning',
            'employee_security', 'employee_kitchen', 'employee_other',
            // کارمندان قراردادی
            'contract_doctor', 'contract_nurse', 'contract_radiology',
            'contract_laboratory', 'contract_pharmacy', 'contract_reception',
            'contract_administration', 'contract_finance', 'contract_cleaning',
            'contract_security', 'contract_kitchen', 'contract_other',
            // کارگرها
            'worker_construction', 'worker_cleaning', 'worker_loading',
            'worker_gardening', 'worker_kitchen', 'worker_laundry',
            'worker_maintenance', 'worker_security', 'worker_other',
        ],
    ];

    /*
    |--------------------------------------------------------------------------
    | ✅ انواع حساب‌های مجاز
    |--------------------------------------------------------------------------
    */

    public const TYPES = [
        'asset',
        'liability',
        'equity',
        'income',
        'expense',
        'receivable',
        'payable',
        'employee',
    ];

    /*
    |--------------------------------------------------------------------------
    | ✅ دسته‌های کارمندی (شامل سه گروه)
    |--------------------------------------------------------------------------
    */

    public const EMPLOYEE_CATEGORIES = [
        // رسمی
        'employee_doctor', 'employee_nurse', 'employee_radiology',
        'employee_laboratory', 'employee_pharmacy', 'employee_reception',
        'employee_administration', 'employee_finance', 'employee_cleaning',
        'employee_security', 'employee_kitchen', 'employee_other',
        // قراردادی
        'contract_doctor', 'contract_nurse', 'contract_radiology',
        'contract_laboratory', 'contract_pharmacy', 'contract_reception',
        'contract_administration', 'contract_finance', 'contract_cleaning',
        'contract_security', 'contract_kitchen', 'contract_other',
        // کارگرها
        'worker_construction', 'worker_cleaning', 'worker_loading',
        'worker_gardening', 'worker_kitchen', 'worker_laundry',
        'worker_maintenance', 'worker_security', 'worker_other',
    ];

    // ================= Relations =================

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id')->orderBy('account_code');
    }

    public function journals(): HasMany
    {
        return $this->hasMany(Journal::class, 'account_id', 'id');
    }

    public function prescriptionItems(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class, 'supplier_id', 'id');
    }

    // ================= Scopes =================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    public function scopeTransactionAccounts($query)
    {
        return $query->where('is_active', true)->where('allow_transactions', true);
    }

    public function scopeControlAccounts($query)
    {
        return $query->where('is_control_account', true);
    }

    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    public function scopeNonSystem($query)
    {
        return $query->where('is_system', false);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('account_type', $type);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('account_category', $category);
    }

    public function scopeCustomers($query)
    {
        return $query->where('account_category', 'customers');
    }

    // ✅ Scope: کارمندان (کل)
    public function scopeEmployees($query)
    {
        return $query->where('account_type', 'employee');
    }

    // ✅ Scope: کارمندان رسمی
    public function scopeOfficialEmployees($query)
    {
        return $query->where('account_type', 'employee')
            ->where('account_category', 'like', 'employee_%');
    }

    // ✅ Scope: کارمندان قراردادی
    public function scopeContractEmployees($query)
    {
        return $query->where('account_type', 'employee')
            ->where('account_category', 'like', 'contract_%');
    }

    // ✅ Scope: کارگرها
    public function scopeWorkers($query)
    {
        return $query->where('account_type', 'employee')
            ->where('account_category', 'like', 'worker_%');
    }

    public function scopeByTypeAndCategory($query, string $type, string $category)
    {
        return $query->where('account_type', $type)->where('account_category', $category);
    }

    public function scopeParentAccounts($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeChildAccounts($query)
    {
        return $query->whereNotNull('parent_id');
    }

    // ================= Helpers =================

    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    public function isInactive(): bool
    {
        return !$this->is_active;
    }

    public function canTransact(): bool
    {
        return $this->is_active && $this->allow_transactions;
    }

    public function isParent(): bool
    {
        return $this->children()->exists();
    }

    public function isChild(): bool
    {
        return !is_null($this->parent_id);
    }

    public function hasTransactions(): bool
    {
        return $this->journals()->exists();
    }

    public function hasActiveChildren(): bool
    {
        return $this->children()->where('is_active', true)->exists();
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    public function isCustomer(): bool
    {
        return $this->account_category === 'customers';
    }

    // ✅ بررسی کارمند بودن
    public function isEmployee(): bool
    {
        return $this->account_type === 'employee'
            || in_array($this->account_category, self::EMPLOYEE_CATEGORIES, true);
    }

    public function isOfficialEmployee(): bool
    {
        return str_starts_with((string) $this->account_category, 'employee_');
    }

    public function isContractEmployee(): bool
    {
        return str_starts_with((string) $this->account_category, 'contract_');
    }

    public function isWorker(): bool
    {
        return str_starts_with((string) $this->account_category, 'worker_');
    }

    public static function getCategoriesByType(string $type): array
    {
        return self::CATEGORIES[$type] ?? [];
    }

    public static function isValidCategoryForType(string $type, string $category): bool
    {
        return in_array($category, self::getCategoriesByType($type), true);
    }

    public function canBeDeleted(): bool
    {
        if ($this->is_system) return false;
        if ($this->hasChildren()) return false;
        if ($this->hasTransactions()) return false;
        return true;
    }

    public function canBeDeactivated(): bool
    {
        if ($this->is_system) return false;
        if ($this->hasActiveChildren()) return false;
        return true;
    }

    public function canBeActivated(): bool
    {
        if ($this->is_active) return true;
        if (!$this->parent_id) return true;
        return $this->parent && $this->parent->is_active;
    }

    public function activate(): bool
    {
        if (!$this->canBeActivated()) return false;
        $this->is_active = true;
        return $this->save();
    }

    public function deactivate(): bool
    {
        if (!$this->canBeDeactivated()) return false;
        $this->is_active = false;
        return $this->save();
    }

    public function toggleStatus(): bool
    {
        return $this->is_active ? $this->deactivate() : $this->activate();
    }

    public function getAccountPathAttribute(): string
    {
        $path = [];
        $account = $this;
        $visited = [];
        while ($account) {
            if (in_array($account->id, $visited)) break;
            $visited[] = $account->id;
            array_unshift($path, $account->account_name);
            $account = $account->parent;
        }
        return implode(' > ', $path);
    }

    public function getAccountLevelAttribute(): int
    {
        $level = 0;
        $account = $this;
        $visited = [];
        while ($account && $account->parent_id) {
            if (in_array($account->id, $visited)) break;
            $visited[] = $account->id;
            $level++;
            $account = $account->parent;
        }
        return $level;
    }

    public function getJournalBalanceAttribute()
    {
        $debit = $this->journals()->where('entry_type', 'debit')->sum('amount');
        $credit = $this->journals()->where('entry_type', 'credit')->sum('amount');
        if ($this->normal_balance === 'debit') {
            return round($debit - $credit, 2);
        }
        return round($credit - $debit, 2);
    }

    public function getAccountTypeLabelAttribute(): string
    {
        return match ($this->account_type) {
            'asset' => 'دارایی',
            'liability' => 'بدهی',
            'equity' => 'سرمایه / حقوق مالکانه',
            'income' => 'درآمد',
            'expense' => 'مصارف',
            'receivable' => 'مطالبات',
            'payable' => 'پرداختنی',
            'employee' => 'کارمندان',
            default => $this->account_type,
        };
    }

    public function getAccountCategoryLabelAttribute(): string
    {
        return match ($this->account_category) {
            // Assets
            'cash' => 'نقدی',
            'bank' => 'بانکی',
            'medicine_inventory' => 'موجودی ادویه',
            'laboratory_inventory' => 'موجودی لابراتوار',
            'consumable_inventory' => 'موجودی مصرفی',
            'medical_equipment' => 'تجهیزات طبی',
            'office_equipment' => 'تجهیزات دفتری',
            'tools_and_supplies' => 'ابزار و لوازم',
            'building' => 'ساختمان',
            'land' => 'زمین',
            'vehicle' => 'وسیله نقلیه',
            'furniture' => 'فرنیچر',
            'prepayments' => 'پیش‌پرداخت‌ها',
            'deposits' => 'سپرده‌ها',
            'other_assets' => 'سایر دارایی‌ها',

            // Liabilities
            'suppliers' => 'تأمین‌کنندگان',
            'medicine_purchase_payable' => 'بدهی خرید ادویه',
            'equipment_purchase_payable' => 'بدهی خرید تجهیزات',
            'laboratory_material_payable' => 'بدهی مواد لابراتوار',
            'salary_payable' => 'بدهی معاشات',
            'tax_payable' => 'بدهی مالیه',
            'loans' => 'قرض‌ها',
            'bank_loans' => 'قرض بانکی',
            'contractual_liabilities' => 'تعهدات قراردادی',
            'other_liabilities' => 'سایر بدهی‌ها',

            // Equity
            'initial_capital' => 'سرمایه اولیه',
            'owner_capital' => 'سرمایه مالک',
            'partners_capital' => 'سرمایه شرکا',
            'retained_earnings' => 'سود انباشته',
            'retained_losses' => 'ضرر انباشته',
            'owner_drawings' => 'برداشت مالک',
            'other_equity' => 'سایر سرمایه',

            // Income
            'medical_services_income' => 'درآمد خدمات طبی',
            'consultation_income' => 'درآمد مشاوره',
            'laboratory_income' => 'درآمد لابراتوار',
            'radiology_income' => 'درآمد رادیولوژی',
            'operation_income' => 'درآمد عملیات',
            'admission_income' => 'درآمد بستر',
            'pharmacy_income' => 'درآمد دواخانه',
            'goods_sales_income' => 'درآمد فروش اجناس',
            'operation_room_income' => 'درآمد اتاق عملیات',
            'other_services_income' => 'درآمد سایر خدمات',
            'non_operating_income' => 'درآمد غیرعملیاتی',
            'rent_income' => 'درآمد کرایه',
            'customers_income' => 'درآمد از مشتریان',
            'other_income' => 'سایر درآمدها',

            // Expense
            'salary_expense' => 'مصرف معاشات',
            'rent_expense' => 'مصرف کرایه',
            'electricity_expense' => 'مصرف برق',
            'water_expense' => 'مصرف آب',
            'internet_expense' => 'مصرف انترنت',
            'telephone_expense' => 'مصرف تلیفون',
            'transportation_expense' => 'مصرف ترانسپورت',
            'consumable_material_expense' => 'مصرف مواد مصرفی',
            'medical_material_expense' => 'مصرف مواد طبی',
            'laboratory_material_expense' => 'مصرف مواد لابراتوار',
            'cleaning_material_expense' => 'مصرف مواد پاک‌کاری',
            'repair_expense' => 'مصرف تعمیرات',
            'medical_equipment_repair_expense' => 'مصرف تعمیر تجهیزات طبی',
            'building_repair_expense' => 'مصرف تعمیر ساختمان',
            'fuel_expense' => 'مصرف سوخت',
            'stationery_expense' => 'مصرف قرطاسیه',
            'administrative_expense' => 'مصرف اداری',
            'marketing_expense' => 'مصرف بازاریابی',
            'legal_expense' => 'مصرف حقوقی',
            'tax_and_duty_expense' => 'مصرف مالیه و عوارض',
            'insurance_expense' => 'مصرف بیمه',
            'bank_charge_expense' => 'مصرف کمیشن بانکی',
            'depreciation_expense' => 'مصرف استهلاک',
            'other_expense' => 'سایر مصارف',

            // Receivable
            'insurance_companies' => 'شرکت‌های بیمه',
            'contracting_institutions' => 'مؤسسات قراردادی',
            'companies' => 'شرکت‌ها',
            'corporate_customers' => 'مشتریان شرکتی',
            'customers' => 'مشتریان',
            'miscellaneous_receivables' => 'مطالبات متفرقه',
            'other_receivables' => 'سایر مطالبات',

            // Payable
            'medicine_suppliers' => 'تأمین‌کنندگان ادویه',
            'medical_equipment_suppliers' => 'تأمین‌کنندگان تجهیزات طبی',
            'laboratory_material_suppliers' => 'تأمین‌کنندگان مواد لابراتوار',
            'consumable_material_suppliers' => 'تأمین‌کنندگان مواد مصرفی',
            'vendors' => 'فروشندگان',
            'contractors' => 'پیمانکاران',
            'salary_payables' => 'معاشات قابل پرداخت',
            'tax_payables' => 'مالیات قابل پرداخت',
            'bank_payables' => 'بدهی بانکی',
            'other_creditors' => 'سایر طلبکاران',

            // ✅ Employee - رسمی
            'employee_doctor' => 'داکتر',
            'employee_nurse' => 'نرس',
            'employee_radiology' => 'کارمند رادیولوژی',
            'employee_laboratory' => 'کارمند لابراتوار',
            'employee_pharmacy' => 'کارمند دواخانه',
            'employee_reception' => 'کارمند پذیرش',
            'employee_administration' => 'کارمند اداری',
            'employee_finance' => 'کارمند مالی / حسابداری',
            'employee_cleaning' => 'کارمند نظافت',
            'employee_security' => 'کارمند امنیت',
            'employee_kitchen' => 'کارمند آشپزخانه',
            'employee_other' => 'سایر کارمندان رسمی',

            // ✅ Employee - قراردادی
            'contract_doctor' => 'داکتر قراردادی',
            'contract_nurse' => 'نرس قراردادی',
            'contract_radiology' => 'کارمند رادیولوژی قراردادی',
            'contract_laboratory' => 'کارمند لابراتوار قراردادی',
            'contract_pharmacy' => 'کارمند دواخانه قراردادی',
            'contract_reception' => 'کارمند پذیرش قراردادی',
            'contract_administration' => 'کارمند اداری قراردادی',
            'contract_finance' => 'کارمند مالی قراردادی',
            'contract_cleaning' => 'کارمند نظافت قراردادی',
            'contract_security' => 'کارمند امنیت قراردادی',
            'contract_kitchen' => 'کارمند آشپزخانه قراردادی',
            'contract_other' => 'سایر کارمندان قراردادی',

            // ✅ Employee - کارگرها
            'worker_construction' => 'کارگر ساختمانی',
            'worker_cleaning' => 'کارگر نظافت',
            'worker_loading' => 'کارگر بارگیری',
            'worker_gardening' => 'کارگر باغبانی',
            'worker_kitchen' => 'کارگر آشپزخانه',
            'worker_laundry' => 'کارگر لباس‌شویی',
            'worker_maintenance' => 'کارگر تعمیرات',
            'worker_security' => 'کارگر نگهبانی',
            'worker_other' => 'سایر کارگرها',

            default => $this->account_category,
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active ? 'فعال' : 'غیرفعال';
    }

    public function getNormalBalanceLabelAttribute(): string
    {
        return $this->normal_balance === 'debit' ? 'بدهکار' : 'بستانکار';
    }
}