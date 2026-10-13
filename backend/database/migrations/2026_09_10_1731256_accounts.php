<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ایجاد جدول حساب‌ها / طرف حساب‌ها
     *
     * نکته مهم:
     * supplier_id در جدول parchases باید به accounts.id
     * متصل شود، نه به registrations.reg_id.
     *
     * ✅ تغییرات جدید:
     * - اضافه شدن دسته‌های کارمندان (employees, employees_salary_payable,
     *   daily_wage_workers, external_employees) به account_category
     * - استفاده از string به جای enum برای سازگاری کامل با SQLite
     *   (SQLite از ENUM پشتیبانی نمی‌کند و Laravel آن را به VARCHAR تبدیل می‌کند)
     */
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات اصلی حساب
            |--------------------------------------------------------------------------
            */

            // کد حساب
            $table->string('account_code', 50)->unique();

            // نام حساب / طرف حساب
            $table->string('account_name', 200);

            /*
            |--------------------------------------------------------------------------
            | طبقه‌بندی حسابداری
            |--------------------------------------------------------------------------
            |
            | Supplier در اینجا دیگر account_type نیست.
            | تأمین‌کننده دارو به صورت یک حساب Payable ثبت می‌شود:
            |
            | account_type     = payable
            | account_category = medicine_suppliers
            |
            | ⚠️ نکته: از string استفاده شده به جای enum چون SQLite
            | از ENUM پشتیبانی نمی‌کند. مقادیر مجاز در کامنت مشخص شده‌اند.
            |
            */

            $table->string('account_type', 30);
            /*
            مقادیر مجاز:
            - asset        → دارایی
            - liability    → بدهی
            - equity       → سرمایه / حقوق مالکانه
            - income       → درآمد
            - expense      → مصارف / هزینه
            - receivable   → حساب‌های دریافتنی
            - payable      → حساب‌های پرداختنی
            */

            $table->string('account_category', 60);
            /*
            مقادیر مجاز:

            ==================== Asset - دارایی‌ها ====================
            cash, bank, medicine_inventory, laboratory_inventory,
            consumable_inventory, medical_equipment, office_equipment,
            tools_and_supplies, building, land, vehicle, furniture,
            prepayments, deposits, other_assets

            ==================== Liability - بدهی‌ها ====================
            suppliers, medicine_purchase_payable, equipment_purchase_payable,
            laboratory_material_payable, salary_payable, tax_payable,
            loans, bank_loans, contractual_liabilities, other_liabilities

            ==================== Equity - سرمایه ====================
            initial_capital, owner_capital, partners_capital,
            retained_earnings, retained_losses, owner_drawings, other_equity

            ==================== Income - درآمدها ====================
            medical_services_income, consultation_income, laboratory_income,
            radiology_income, operation_income, admission_income, pharmacy_income,
            goods_sales_income, operation_room_income, other_services_income,
            non_operating_income, rent_income, customers_income, other_income

            ==================== Expense - مصارف ====================
            salary_expense, rent_expense, electricity_expense, water_expense,
            internet_expense, telephone_expense, transportation_expense,
            consumable_material_expense, medical_material_expense,
            laboratory_material_expense, cleaning_material_expense,
            repair_expense, medical_equipment_repair_expense,
            building_repair_expense, fuel_expense, stationery_expense,
            administrative_expense, marketing_expense, legal_expense,
            tax_and_duty_expense, insurance_expense, bank_charge_expense,
            depreciation_expense, other_expense

            ==================== Receivable - دریافتنی ====================
            insurance_companies, contracting_institutions, companies,
            corporate_customers, customers, miscellaneous_receivables,
            other_receivables

            ==================== Payable - پرداختنی ====================
            medicine_suppliers, medical_equipment_suppliers,
            laboratory_material_suppliers, consumable_material_suppliers,
            vendors, contractors, salary_payables, tax_payables,
            bank_payables, other_creditors

            ==================== ✅ NEW: Employees - کارمندان ====================
            employees,                  → کارمندان (برای معاش)
            employees_salary_payable,   → معاش پرداختنی کارمندان
            daily_wage_workers,         → کارگران روزمزد
            external_employees          → کارمندان خارجی / قراردادی
            */

            /*
            |--------------------------------------------------------------------------
            | حساب والد
            |--------------------------------------------------------------------------
            |
            | مثال:
            |
            | Suppliers - تأمین‌کنندگان
            |    ├── ABC Pharmaceutical - شرکت دارویی ABC
            |    ├── XYZ Medical - شرکت طبی XYZ
            |    └── Kabul Medicine - دواخانه / شرکت طبی کابل
            |
            */

            $table->unsignedBigInteger('parent_id')->nullable();

            $table->foreign('parent_id')
                ->references('id')
                ->on('accounts')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | مانده طبیعی حساب
            |--------------------------------------------------------------------------
            */

            $table->string('normal_balance', 10);
            /*
            مقادیر مجاز:
            - debit    → بدهکار
            - credit   → بستانکار
            */

            /*
            |--------------------------------------------------------------------------
            | موجودی ابتدایی
            |--------------------------------------------------------------------------
            */

            $table->decimal('opening_balance', 15, 2)->default(0);

            $table->string('opening_balance_type', 10)->nullable();
            /*
            مقادیر مجاز:
            - debit    → بدهکار
            - credit   → بستانکار
            - null     → بدون موجودی ابتدایی
            */

            /*
            |--------------------------------------------------------------------------
            | واحد پول
            |--------------------------------------------------------------------------
            */

            $table->string('currency', 10)->default('AFN');
            /*
            مقادیر مجاز:
            - AFN  → افغانی
            - USD  → دالر امریکایی
            - EUR  → یورو
            - PKR  → روپیه پاکستان
            - IRR  → ریال ایران
            - AED  → درهم امارات
            */

            /*
            |--------------------------------------------------------------------------
            | اطلاعات تماس طرف حساب
            |--------------------------------------------------------------------------
            */

            $table->string('contact_person')->nullable(); // شخص تماس
            $table->string('phone', 30)->nullable();       // شماره تلفن
            $table->string('mobile', 30)->nullable();      // شماره موبایل
            $table->string('email')->nullable();           // ایمیل

            /*
            |--------------------------------------------------------------------------
            | اطلاعات هویتی
            |--------------------------------------------------------------------------
            */

            $table->string('tazkira_number', 30)->nullable(); // شماره تذکره
            $table->string('tax_number', 50)->nullable();     // شماره مالیاتی

            /*
            |--------------------------------------------------------------------------
            | آدرس
            |--------------------------------------------------------------------------
            */

            $table->string('country')->default('Afghanistan'); // کشور
            $table->string('province')->nullable();             // ولایت
            $table->string('district')->nullable();             // ولسوالی / ناحیه
            $table->text('address')->nullable();                // آدرس کامل

            /*
            |--------------------------------------------------------------------------
            | شرایط مالی
            |--------------------------------------------------------------------------
            */

            // سقف اعتبار طرف حساب
            $table->decimal('credit_limit', 15, 2)->default(0);

            /*
            |--------------------------------------------------------------------------
            | توضیحات
            |--------------------------------------------------------------------------
            */

            $table->text('description')->nullable(); // توضیحات حساب

            /*
            |--------------------------------------------------------------------------
            | تنظیمات حساب
            |--------------------------------------------------------------------------
            */

            // حساب سیستمی است یا حسابی که کاربر ایجاد کرده؟
            $table->boolean('is_system')->default(false);

            // آیا اجازه ثبت تراکنش دارد؟
            $table->boolean('allow_transactions')->default(true);

            // آیا حساب کنترلی است؟
            $table->boolean('is_control_account')->default(false);

            // فعال / غیرفعال
            $table->boolean('is_active')->default(true);

            /*
            |--------------------------------------------------------------------------
            | ثبت کننده
            |--------------------------------------------------------------------------
            */

            // کاربری که حساب را ایجاد کرده است
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // کاربری که آخرین بار حساب را ویرایش کرده است
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | زمان‌ها
            |--------------------------------------------------------------------------
            */

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Indexes - ایندکس‌ها (بهینه‌شده برای فیلتر)
            |--------------------------------------------------------------------------
            */

            /*
            |--------------------------------------------------------------------------
            | 1) ایندکس‌های تک‌ستونی
            |--------------------------------------------------------------------------
            */

            $table->index('account_type', 'idx_accounts_type');
            $table->index('account_category', 'idx_accounts_category');
            $table->index('parent_id', 'idx_accounts_parent');
            $table->index('is_active', 'idx_accounts_active');
            $table->index('is_system', 'idx_accounts_system');
            $table->index('normal_balance', 'idx_accounts_normal_balance');
            $table->index('currency', 'idx_accounts_currency');
            $table->index('account_name', 'idx_accounts_name');
            $table->index('account_code', 'idx_accounts_code');
            $table->index('phone', 'idx_accounts_phone');
            $table->index('mobile', 'idx_accounts_mobile');
            $table->index('email', 'idx_accounts_email');
            $table->index('created_by', 'idx_accounts_created_by');
            $table->index('updated_by', 'idx_accounts_updated_by');
            $table->index('created_at', 'idx_accounts_created_at');

            /*
            |--------------------------------------------------------------------------
            | 2) ایندکس‌های ترکیبی (Composite Indexes)
            |--------------------------------------------------------------------------
            */

            // فیلتر ترکیبی: نوع + دسته‌بندی + فعال
            $table->index(
                ['account_type', 'account_category', 'is_active'],
                'idx_accounts_type_category_active'
            );

            // فیلتر ترکیبی: نوع + فعال
            $table->index(
                ['account_type', 'is_active'],
                'idx_accounts_type_active'
            );

            // فیلتر ترکیبی: دسته‌بندی + فعال
            $table->index(
                ['account_category', 'is_active'],
                'idx_accounts_category_active'
            );

            // فیلتر ترکیبی: والد + فعال
            $table->index(
                ['parent_id', 'is_active'],
                'idx_accounts_parent_active'
            );

            // فیلتر ترکیبی: نوع + دسته‌بندی + والد
            $table->index(
                ['account_type', 'account_category', 'parent_id'],
                'idx_accounts_type_category_parent'
            );

            // فیلتر ترکیبی: نوع + والد
            $table->index(
                ['account_type', 'parent_id'],
                'idx_accounts_type_parent'
            );

            /*
            |--------------------------------------------------------------------------
            | 3) ایندکس‌های ویژه (Special Filter Indexes)
            |--------------------------------------------------------------------------
            */

            // فیلتر مشتریان: (category + type + active)
            $table->index(
                ['account_category', 'account_type', 'is_active'],
                'idx_accounts_customers_filter'
            );

            // فیلتر تأمین‌کنندگان: (category + active)
            $table->index(
                ['account_category', 'is_active'],
                'idx_accounts_suppliers_filter'
            );

            // ✅ فیلتر کارمندان: (category + active)
            // برای پیدا کردن سریع کارمندانی که باید معاش بگیرند
            $table->index(
                ['account_category', 'is_active', 'allow_transactions'],
                'idx_accounts_employees_filter'
            );

            // فیلتر حساب‌های سیستمی بر اساس نوع
            $table->index(
                ['is_system', 'account_type'],
                'idx_accounts_system_type'
            );

            // فیلتر حساب‌های قابل تراکنش
            $table->index(
                ['is_active', 'allow_transactions'],
                'idx_accounts_transaction_accounts'
            );

            // فیلتر حساب‌های کنترلی
            $table->index(
                ['is_control_account', 'is_active'],
                'idx_accounts_control_active'
            );
        });
    }

    /**
     * حذف جدول هنگام rollback
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};