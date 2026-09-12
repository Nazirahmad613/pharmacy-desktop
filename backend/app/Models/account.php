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
public function prescriptionItems(): HasMany
    {
        return $this->hasMany(
            PrescriptionItem::class,
            'supplier_id',
            'id'
        );
        }

    public function getNormalBalanceLabelAttribute(): string
    {
        return $this->normal_balance === 'debit'
            ? 'بدهکار'
            : 'بستانکار';
    }
};