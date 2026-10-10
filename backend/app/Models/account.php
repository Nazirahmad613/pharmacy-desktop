<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    /*
    |--------------------------------------------------------------------------
    | نام جدول
    |--------------------------------------------------------------------------
    */

    protected $table = 'accounts';


    /*
    |--------------------------------------------------------------------------
    | Mass Assignment
    |--------------------------------------------------------------------------
    |
    | این فیلدها اجازه دارند از طریق:
    |
    | Account::create()
    | Account::update()
    |
    | مقداردهی شوند.
    |
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
    |
    | SQLite ممکن است boolean را به شکل 0/1 ذخیره کند.
    | این Cast باعث می‌شود در PHP به صورت true/false دریافت شود.
    |
    */

    protected function casts(): array
    {
        return [

            // موجودی افتتاحیه
            'opening_balance' => 'decimal:2',

            // وضعیت‌ها
            'is_system' => 'boolean',
            'allow_transactions' => 'boolean',
            'is_control_account' => 'boolean',
            'is_active' => 'boolean',

            // شناسه حساب مادر
            'parent_id' => 'integer',
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ دسته‌بندی‌های مجاز بر اساس نوع حساب
    |--------------------------------------------------------------------------
    |
    | این ثابت باید با STATIC_CATEGORIES در Frontend مطابقت داشته باشد.
    | همچنین در Validation نیز از همین لیست استفاده کنید.
    |
    */

    public const CATEGORIES = [
        'asset' => [
            'cash',
            'bank',
            'medicine_inventory',
            'laboratory_inventory',
            'consumable_inventory',
            'medical_equipment',
            'office_equipment',
            'tools_and_supplies',
            'building',
            'land',
            'vehicle',
            'furniture',
            'prepayments',
            'deposits',
            'other_assets',
        ],

        'liability' => [
            'suppliers',
            'medicine_purchase_payable',
            'equipment_purchase_payable',
            'laboratory_material_payable',
            'salary_payable',
            'tax_payable',
            'loans',
            'bank_loans',
            'contractual_liabilities',
            'other_liabilities',
        ],

        'equity' => [
            'initial_capital',
            'owner_capital',
            'partners_capital',
            'retained_earnings',
            'retained_losses',
            'owner_drawings',
            'other_equity',
        ],

        'income' => [
            'medical_services_income',
            'consultation_income',
            'laboratory_income',
            'radiology_income',
            'operation_income',
            'admission_income',
            'pharmacy_income',
            'goods_sales_income',
            'operation_room_income',
            'other_services_income',
            'non_operating_income',
            'rent_income',
            'customers_income',        // ✅ جدید
            'other_income',
        ],

        'expense' => [
            'salary_expense',
            'rent_expense',
            'electricity_expense',
            'water_expense',
            'internet_expense',
            'telephone_expense',
            'transportation_expense',
            'consumable_material_expense',
            'medical_material_expense',
            'laboratory_material_expense',
            'cleaning_material_expense',
            'repair_expense',
            'medical_equipment_repair_expense',
            'building_repair_expense',
            'fuel_expense',
            'stationery_expense',
            'administrative_expense',
            'marketing_expense',
            'legal_expense',
            'tax_and_duty_expense',
            'insurance_expense',
            'bank_charge_expense',
            'depreciation_expense',
            'other_expense',
        ],

        'receivable' => [
            'insurance_companies',
            'contracting_institutions',
            'companies',
            'corporate_customers',
            'customers',               // ✅ جدید
            'miscellaneous_receivables',
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
    ];


    /*
    |--------------------------------------------------------------------------
    | Parent Account
    |--------------------------------------------------------------------------
    |
    | هر حساب می‌تواند یک حساب مادر داشته باشد.
    |
    | مثال:
    |
    | دارایی‌ها
    |    ├── صندوق
    |    ├── بانک
    |    └── موجودی دوا
    |
    */

    public function parent(): BelongsTo
    {
        return $this->belongsTo(
            Account::class,
            'parent_id'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Child Accounts
    |--------------------------------------------------------------------------
    |
    | یک حساب می‌تواند چند حساب فرزند داشته باشد.
    |
    */

    public function children(): HasMany
    {
        return $this->hasMany(
            Account::class,
            'parent_id'
        )->orderBy(
            'account_code'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Journals
    |--------------------------------------------------------------------------
    |
    | هر حساب می‌تواند چندین تراکنش مالی در Journal داشته باشد.
    |
    | journals.account_id
    |        ↓
    | accounts.id
    |
    */

    public function journals(): HasMany
    {
        return $this->hasMany(
            Journal::class,
            'account_id',
            'id'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Prescription Items (تأمین‌کننده)
    |--------------------------------------------------------------------------
    |
    | این رابطه برای حساب‌های دسته‌بندی «تأمین‌کنندگان ادویه» کاربرد دارد.
    |
    */

    public function prescriptionItems(): HasMany
    {
        return $this->hasMany(
            PrescriptionItem::class,
            'supplier_id',
            'id'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Active
    |--------------------------------------------------------------------------
    |
    | فقط حساب‌های فعال
    |
    | Account::active()->get();
    |
    */

    public function scopeActive($query)
    {
        return $query->where(
            'is_active',
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Inactive
    |--------------------------------------------------------------------------
    |
    | فقط حساب‌های غیرفعال
    |
    */

    public function scopeInactive($query)
    {
        return $query->where(
            'is_active',
            false
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Transaction Accounts
    |--------------------------------------------------------------------------
    |
    | حساب‌هایی که اجازه ثبت تراکنش دارند.
    |
    */

    public function scopeTransactionAccounts($query)
    {
        return $query
            ->where('is_active', true)
            ->where('allow_transactions', true);
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Control Accounts
    |--------------------------------------------------------------------------
    |
    | حساب‌های کنترلی
    |
    */

    public function scopeControlAccounts($query)
    {
        return $query->where(
            'is_control_account',
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: System Accounts
    |--------------------------------------------------------------------------
    |
    | حساب‌های سیستمی
    |
    */

    public function scopeSystem($query)
    {
        return $query->where(
            'is_system',
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Non System Accounts
    |--------------------------------------------------------------------------
    */

    public function scopeNonSystem($query)
    {
        return $query->where(
            'is_system',
            false
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: By Type
    |--------------------------------------------------------------------------
    |
    | مثال:
    |
    | Account::byType('asset')->get();
    |
    */

    public function scopeByType(
        $query,
        string $type
    ) {
        return $query->where(
            'account_type',
            $type
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: By Category
    |--------------------------------------------------------------------------
    |
    | مثال:
    |
    | Account::byCategory('cash')->get();
    | Account::byCategory('customers')->get();  // ✅ مشتریان
    |
    */

    public function scopeByCategory(
        $query,
        string $category
    ) {
        return $query->where(
            'account_category',
            $category
        );
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ Scope: Customers (مشتریان)
    |--------------------------------------------------------------------------
    |
    | حساب‌های مربوط به مشتریان (در نوع receivable)
    |
    | Account::customers()->get();
    |
    */

    public function scopeCustomers($query)
    {
        return $query->where(
            'account_category',
            'customers'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ Scope: By Type And Category
    |--------------------------------------------------------------------------
    |
    | مثال:
    |
    | Account::byTypeAndCategory('receivable', 'customers')->get();
    |
    */

    public function scopeByTypeAndCategory(
        $query,
        string $type,
        string $category
    ) {
        return $query
            ->where('account_type', $type)
            ->where('account_category', $category);
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Parent Accounts
    |--------------------------------------------------------------------------
    |
    | فقط حساب‌هایی که حساب مادر ندارند.
    |
    */

    public function scopeParentAccounts($query)
    {
        return $query->whereNull(
            'parent_id'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Scope: Children Accounts
    |--------------------------------------------------------------------------
    |
    | فقط حساب‌هایی که حساب مادر دارند.
    |
    */

    public function scopeChildAccounts($query)
    {
        return $query->whereNotNull(
            'parent_id'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Is Active
    |--------------------------------------------------------------------------
    */

    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Is Inactive
    |--------------------------------------------------------------------------
    */

    public function isInactive(): bool
    {
        return !$this->is_active;
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Can Transact
    |--------------------------------------------------------------------------
    |
    | آیا حساب اجازه ثبت Journal دارد؟
    |
    */

    public function canTransact(): bool
    {
        return
            $this->is_active
            &&
            $this->allow_transactions;
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Is Parent
    |--------------------------------------------------------------------------
    |
    | آیا حساب دارای حساب فرزند است؟
    |
    */

    public function isParent(): bool
    {
        return $this->children()->exists();
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Is Child
    |--------------------------------------------------------------------------
    */

    public function isChild(): bool
    {
        return !is_null(
            $this->parent_id
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Has Transactions
    |--------------------------------------------------------------------------
    |
    | آیا حساب در Journal استفاده شده؟
    |
    */

    public function hasTransactions(): bool
    {
        return $this->journals()->exists();
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Has Active Children
    |--------------------------------------------------------------------------
    |
    | برای جلوگیری از غیرفعال کردن حساب مادر در حالی که
    | حساب‌های فرزند آن هنوز فعال هستند.
    |
    */

    public function hasActiveChildren(): bool
    {
        return $this->children()
            ->where(
                'is_active',
                true
            )
            ->exists();
    }


    /*
    |--------------------------------------------------------------------------
    | Helper: Has Children
    |--------------------------------------------------------------------------
    */

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ Helper: Is Customer
    |--------------------------------------------------------------------------
    |
    | آیا این حساب مربوط به مشتریان است؟
    |
    */

    public function isCustomer(): bool
    {
        return $this->account_category === 'customers';
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ Helper: Get Categories By Type
    |--------------------------------------------------------------------------
    |
    | دریافت دسته‌بندی‌های مجاز برای یک نوع حساب مشخص.
    |
    | مثال:
    |
    | Account::getCategoriesByType('receivable');
    | // ['insurance_companies', ..., 'customers', ...]
    |
    */

    public static function getCategoriesByType(string $type): array
    {
        return self::CATEGORIES[$type] ?? [];
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ Helper: Is Valid Category For Type
    |--------------------------------------------------------------------------
    |
    | بررسی اینکه آیا یک دسته‌بندی برای نوع حساب مشخص مجاز است؟
    |
    */

    public static function isValidCategoryForType(
        string $type,
        string $category
    ): bool {
        return in_array(
            $category,
            self::getCategoriesByType($type),
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | حساب قابل حذف است؟
    |--------------------------------------------------------------------------
    |
    | حسابی که:
    | - System باشد
    | - Child داشته باشد
    | - Journal داشته باشد
    |
    | نباید حذف شود.
    |
    */

    public function canBeDeleted(): bool
    {
        if ($this->is_system) {
            return false;
        }

        if ($this->hasChildren()) {
            return false;
        }

        if ($this->hasTransactions()) {
            return false;
        }

        return true;
    }


    /*
    |--------------------------------------------------------------------------
    | حساب قابل غیرفعال شدن است؟
    |--------------------------------------------------------------------------
    */

    public function canBeDeactivated(): bool
    {
        if ($this->is_system) {
            return false;
        }

        if ($this->hasActiveChildren()) {
            return false;
        }

        return true;
    }


    /*
    |--------------------------------------------------------------------------
    | حساب قابل فعال شدن است؟
    |--------------------------------------------------------------------------
    |
    | اگر Parent وجود داشته باشد باید Parent فعال باشد.
    |
    */

    public function canBeActivated(): bool
    {
        if ($this->is_active) {
            return true;
        }

        if (!$this->parent_id) {
            return true;
        }

        return
            $this->parent
            &&
            $this->parent->is_active;
    }


    /*
    |--------------------------------------------------------------------------
    | فعال کردن حساب
    |--------------------------------------------------------------------------
    */

    public function activate(): bool
    {
        if (!$this->canBeActivated()) {
            return false;
        }

        $this->is_active = true;

        return $this->save();
    }


    /*
    |--------------------------------------------------------------------------
    | غیرفعال کردن حساب
    |--------------------------------------------------------------------------
    */

    public function deactivate(): bool
    {
        if (!$this->canBeDeactivated()) {
            return false;
        }

        $this->is_active = false;

        return $this->save();
    }


    /*
    |--------------------------------------------------------------------------
    | Toggle Status
    |--------------------------------------------------------------------------
    |
    | فعال ↔ غیرفعال
    |
    */

    public function toggleStatus(): bool
    {
        if ($this->is_active) {

            return $this->deactivate();

        }

        return $this->activate();
    }


    /*
    |--------------------------------------------------------------------------
    | دریافت مسیر حساب
    |--------------------------------------------------------------------------
    |
    | مثال:
    |
    | دارایی‌ها > دارایی‌های جاری > صندوق
    |
    */

    public function getAccountPathAttribute(): string
    {
        $path = [];

        $account = $this;

        $visited = [];

        while ($account) {

            /*
            |--------------------------------------------------------------------------
            | جلوگیری از Loop
            |--------------------------------------------------------------------------
            */

            if (
                in_array(
                    $account->id,
                    $visited
                )
            ) {
                break;
            }

            $visited[] =
                $account->id;


            array_unshift(
                $path,
                $account->account_name
            );


            $account =
                $account->parent;
        }


        return implode(
            ' > ',
            $path
        );
    }


    /*
    |--------------------------------------------------------------------------
    | دریافت سطح حساب
    |--------------------------------------------------------------------------
    |
    | حساب اصلی = Level 0
    | فرزند = Level 1
    | فرزند فرزند = Level 2
    |
    */

    public function getAccountLevelAttribute(): int
    {
        $level = 0;

        $account = $this;

        $visited = [];

        while (
            $account
            &&
            $account->parent_id
        ) {

            if (
                in_array(
                    $account->id,
                    $visited
                )
            ) {
                break;
            }

            $visited[] =
                $account->id;

            $level++;

            $account =
                $account->parent;
        }


        return $level;
    }


    /*
    |--------------------------------------------------------------------------
    | دریافت مانده تقریبی حساب از Journal
    |--------------------------------------------------------------------------
    |
    | این متد بر اساس:
    |
    | Debit - Credit
    |
    | مانده را محاسبه می‌کند.
    |
    | توجه:
    | برای گزارش‌های مالی سنگین بهتر است این محاسبه در Query
    | یا سرویس حسابداری انجام شود.
    |
    */

    public function getJournalBalanceAttribute()
    {
        $debit =
            $this->journals()
                ->where(
                    'entry_type',
                    'debit'
                )
                ->sum('amount');


        $credit =
            $this->journals()
                ->where(
                    'entry_type',
                    'credit'
                )
                ->sum('amount');


        /*
        |--------------------------------------------------------------------------
        | حساب با ماهیت بدهکار
        |--------------------------------------------------------------------------
        */

        if (
            $this->normal_balance
            ===
            'debit'
        ) {

            return
                round(
                    $debit - $credit,
                    2
                );
        }


        /*
        |--------------------------------------------------------------------------
        | حساب با ماهیت بستانکار
        |--------------------------------------------------------------------------
        */

        return
            round(
                $credit - $debit,
                2
            );
    }


    /*
    |--------------------------------------------------------------------------
    | دریافت نوع حساب به شکل قابل فهم
    |--------------------------------------------------------------------------
    |
    | برای Frontend
    |
    */

    public function getAccountTypeLabelAttribute(): string
    {
        return match (
            $this->account_type
        ) {

            'asset'
                => 'دارایی',

            'liability'
                => 'بدهی',

            'equity'
                => 'سرمایه / حقوق مالکانه',

            'income'
                => 'درآمد',

            'expense'
                => 'مصارف',

            'receivable'
                => 'مطالبات',

            'payable'
                => 'پرداختنی',

            default
                => $this->account_type,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | ✅ دریافت دسته‌بندی به شکل قابل فهم
    |--------------------------------------------------------------------------
    |
    | برای Frontend
    |
    */

    public function getAccountCategoryLabelAttribute(): string
    {
        return match (
            $this->account_category
        ) {

            // Assets
            'cash'                          => 'نقدی',
            'bank'                          => 'بانکی',
            'medicine_inventory'            => 'موجودی ادویه',
            'laboratory_inventory'          => 'موجودی لابراتوار',
            'consumable_inventory'          => 'موجودی مصرفی',
            'medical_equipment'             => 'تجهیزات طبی',
            'office_equipment'              => 'تجهیزات دفتری',
            'tools_and_supplies'            => 'ابزار و لوازم',
            'building'                      => 'ساختمان',
            'land'                          => 'زمین',
            'vehicle'                       => 'وسیله نقلیه',
            'furniture'                     => 'فرنیچر',
            'prepayments'                   => 'پیش‌پرداخت‌ها',
            'deposits'                      => 'سپرده‌ها',
            'other_assets'                  => 'سایر دارایی‌ها',

            // Liabilities
            'suppliers'                     => 'تأمین‌کنندگان',
            'medicine_purchase_payable'     => 'بدهی خرید ادویه',
            'equipment_purchase_payable'    => 'بدهی خرید تجهیزات',
            'laboratory_material_payable'   => 'بدهی مواد لابراتوار',
            'salary_payable'                => 'بدهی معاشات',
            'tax_payable'                   => 'بدهی مالیه',
            'loans'                         => 'قرض‌ها',
            'bank_loans'                    => 'قرض بانکی',
            'contractual_liabilities'       => 'تعهدات قراردادی',
            'other_liabilities'             => 'سایر بدهی‌ها',

            // Equity
            'initial_capital'               => 'سرمایه اولیه',
            'owner_capital'                 => 'سرمایه مالک',
            'partners_capital'              => 'سرمایه شرکا',
            'retained_earnings'             => 'سود انباشته',
            'retained_losses'               => 'ضرر انباشته',
            'owner_drawings'                => 'برداشت مالک',
            'other_equity'                  => 'سایر سرمایه',

            // Income
            'medical_services_income'       => 'درآمد خدمات طبی',
            'consultation_income'           => 'درآمد مشاوره',
            'laboratory_income'             => 'درآمد لابراتوار',
            'radiology_income'              => 'درآمد رادیولوژی',
            'operation_income'              => 'درآمد عملیات',
            'admission_income'              => 'درآمد بستر',
            'pharmacy_income'               => 'درآمد دواخانه',
            'goods_sales_income'            => 'درآمد فروش اجناس',
            'operation_room_income'         => 'درآمد اتاق عملیات',
            'other_services_income'         => 'درآمد سایر خدمات',
            'non_operating_income'          => 'درآمد غیرعملیاتی',
            'rent_income'                   => 'درآمد کرایه',
            'customers_income'              => 'درآمد از مشتریان',  // ✅ جدید
            'other_income'                  => 'سایر درآمدها',

            // Expense
            'salary_expense'                => 'مصرف معاشات',
            'rent_expense'                  => 'مصرف کرایه',
            'electricity_expense'           => 'مصرف برق',
            'water_expense'                 => 'مصرف آب',
            'internet_expense'              => 'مصرف انترنت',
            'telephone_expense'             => 'مصرف تلیفون',
            'transportation_expense'        => 'مصرف ترانسپورت',
            'consumable_material_expense'   => 'مصرف مواد مصرفی',
            'medical_material_expense'      => 'مصرف مواد طبی',
            'laboratory_material_expense'   => 'مصرف مواد لابراتوار',
            'cleaning_material_expense'     => 'مصرف مواد پاک‌کاری',
            'repair_expense'                => 'مصرف تعمیرات',
            'medical_equipment_repair_expense' => 'مصرف تعمیر تجهیزات طبی',
            'building_repair_expense'       => 'مصرف تعمیر ساختمان',
            'fuel_expense'                  => 'مصرف سوخت',
            'stationery_expense'            => 'مصرف قرطاسیه',
            'administrative_expense'        => 'مصرف اداری',
            'marketing_expense'             => 'مصرف بازاریابی',
            'legal_expense'                 => 'مصرف حقوقی',
            'tax_and_duty_expense'          => 'مصرف مالیه و عوارض',
            'insurance_expense'             => 'مصرف بیمه',
            'bank_charge_expense'           => 'مصرف کمیشن بانکی',
            'depreciation_expense'          => 'مصرف استهلاک',
            'other_expense'                 => 'سایر مصارف',

            // Receivable
            'insurance_companies'           => 'شرکت‌های بیمه',
            'contracting_institutions'      => 'مؤسسات قراردادی',
            'companies'                     => 'شرکت‌ها',
            'corporate_customers'           => 'مشتریان شرکتی',
            'customers'                     => 'مشتریان',          // ✅ جدید
            'miscellaneous_receivables'     => 'مطالبات متفرقه',
            'other_receivables'             => 'سایر مطالبات',

            // Payable
            'medicine_suppliers'            => 'تأمین‌کنندگان ادویه',
            'medical_equipment_suppliers'   => 'تأمین‌کنندگان تجهیزات طبی',
            'laboratory_material_suppliers' => 'تأمین‌کنندگان مواد لابراتوار',
            'consumable_material_suppliers' => 'تأمین‌کنندگان مواد مصرفی',
            'vendors'                       => 'فروشندگان',
            'contractors'                   => 'پیمانکاران',
            'salary_payables'               => 'معاشات قابل پرداخت',
            'tax_payables'                  => 'مالیات قابل پرداخت',
            'bank_payables'                 => 'بدهی بانکی',
            'other_creditors'               => 'سایر طلبکاران',

            default                         => $this->account_category,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | وضعیت حساب به شکل قابل فهم
    |--------------------------------------------------------------------------
    */

    public function getStatusLabelAttribute(): string
    {
        return $this->is_active
            ? 'فعال'
            : 'غیرفعال';
    }


    /*
    |--------------------------------------------------------------------------
    | نوع ماهیت به شکل قابل فهم
    |--------------------------------------------------------------------------
    */

    public function getNormalBalanceLabelAttribute(): string
    {
        return $this->normal_balance === 'debit'
            ? 'بدهکار'
            : 'بستانکار';
    }
}