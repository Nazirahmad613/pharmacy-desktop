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
            */

            $table->enum('account_type', [
                // دارایی
                'asset',

                // بدهی
                'liability',

                // سرمایه / حقوق مالکانه
                'equity',

                // درآمد
                'income',

                // مصارف / هزینه
                'expense',

                // حساب‌های دریافتنی
                'receivable',

                // حساب‌های پرداختنی
                'payable',
            ]);

            $table->enum('account_category', [

                // Asset - دارایی‌ها
                'cash',                         // نقد / پول نقد
                'bank',                         // بانک
                'medicine_inventory',          // موجودی دارو
                'laboratory_inventory',        // موجودی مواد لابراتوار
                'consumable_inventory',        // موجودی مواد مصرفی
                'medical_equipment',           // تجهیزات طبی
                'office_equipment',            // تجهیزات اداری
                'tools_and_supplies',          // ابزار و لوازم
                'building',                    // ساختمان
                'land',                        // زمین
                'vehicle',                     // وسایط نقلیه
                'furniture',                   // اثاثیه و مبلمان
                'prepayments',                 // پیش‌پرداخت‌ها
                'deposits',                    // سپرده‌ها
                'other_assets',               // سایر دارایی‌ها

                // Liability - بدهی‌ها
                'suppliers',                         // تأمین‌کنندگان
                'medicine_purchase_payable',         // بدهی خرید دارو
                'equipment_purchase_payable',        // بدهی خرید تجهیزات
                'laboratory_material_payable',      // بدهی مواد لابراتواری
                'salary_payable',                    // حقوق پرداختنی
                'tax_payable',                       // مالیات پرداختنی
                'loans',                             // قرض‌ها
                'bank_loans',                        // قرض‌های بانکی
                'contractual_liabilities',           // تعهدات قراردادی
                'other_liabilities',                 // سایر بدهی‌ها

                // Equity - سرمایه / حقوق مالکانه
                'initial_capital',             // سرمایه اولیه
                'owner_capital',               // سرمایه مالک
                'partners_capital',            // سرمایه شرکا
                'retained_earnings',           // سود انباشته
                'retained_losses',             // زیان انباشته
                'owner_drawings',              // برداشت مالک
                'other_equity',                // سایر حقوق مالکانه

                // Income - درآمدها
                'medical_services_income',    // درآمد خدمات طبی
                'consultation_income',        // درآمد معاینه / مشاوره
                'laboratory_income',          // درآمد لابراتوار
                'radiology_income',           // درآمد رادیولوژی
                'operation_income',           // درآمد عملیات
                'admission_income',           // درآمد بستری
                'pharmacy_income',            // درآمد دواخانه
                'goods_sales_income',        // درآمد فروش کالا
                'operation_room_income',      // درآمد اتاق عملیات
                'other_services_income',      // درآمد سایر خدمات
                'non_operating_income',      // درآمد غیرعملیاتی
                'rent_income',               // درآمد کرایه
                'customers_income',          // ✅ درآمد از مشتریان (جدید)
                'other_income',              // سایر درآمدها

                // Expense - مصارف / هزینه‌ها
                'salary_expense',                    // هزینه معاش / حقوق
                'rent_expense',                      // هزینه کرایه
                'electricity_expense',               // هزینه برق
                'water_expense',                     // هزینه آب
                'internet_expense',                  // هزینه اینترنت
                'telephone_expense',                 // هزینه تلفن
                'transportation_expense',            // هزینه ترانسپورت
                'consumable_material_expense',       // هزینه مواد مصرفی
                'medical_material_expense',          // هزینه مواد طبی
                'laboratory_material_expense',       // هزینه مواد لابراتواری
                'cleaning_material_expense',         // هزینه مواد تنظیف
                'repair_expense',                    // هزینه ترمیم
                'medical_equipment_repair_expense',  // هزینه ترمیم تجهیزات طبی
                'building_repair_expense',           // هزینه ترمیم ساختمان
                'fuel_expense',                      // هزینه سوخت
                'stationery_expense',                // هزینه قرطاسیه
                'administrative_expense',            // هزینه اداری
                'marketing_expense',                 // هزینه بازاریابی
                'legal_expense',                     // هزینه حقوقی
                'tax_and_duty_expense',              // هزینه مالیات و گمرک
                'insurance_expense',                 // هزینه بیمه
                'bank_charge_expense',               // هزینه کارمزد بانکی
                'depreciation_expense',              // هزینه استهلاک
                'other_expense',                     // سایر هزینه‌ها

                // Receivable - حساب‌های دریافتنی
                'insurance_companies',              // شرکت‌های بیمه
                'contracting_institutions',         // مؤسسات قراردادی
                'companies',                        // شرکت‌ها
                'corporate_customers',              // مشتریان حقوقی / سازمانی
                'customers',                        // ✅ مشتریان (جدید)
                'miscellaneous_receivables',        // سایر دریافتنی‌ها
                'other_receivables',                // سایر حساب‌های دریافتنی

                // Payable - حساب‌های پرداختنی
                'medicine_suppliers',               // تأمین‌کنندگان دارو
                'medical_equipment_suppliers',      // تأمین‌کنندگان تجهیزات طبی
                'laboratory_material_suppliers',    // تأمین‌کنندگان مواد لابراتواری
                'consumable_material_suppliers',    // تأمین‌کنندگان مواد مصرفی
                'vendors',                           // فروشندگان
                'contractors',                      // قراردادی‌ها / پیمانکاران
                'salary_payables',                  // معاش‌های پرداختنی
                'tax_payables',                     // مالیات‌های پرداختنی
                'bank_payables',                    // بدهی‌های بانکی
                'other_creditors',                  // سایر بستانکاران
            ]);

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

            $table->enum('normal_balance', [
                'debit',   // بدهکار
                'credit',  // بستانکار
            ]);

            /*
            |--------------------------------------------------------------------------
            | موجودی ابتدایی
            |--------------------------------------------------------------------------
            */

            $table->decimal('opening_balance', 15, 2)->default(0);

            $table->enum('opening_balance_type', [
                'debit',   // بدهکار
                'credit',  // بستانکار
            ])->nullable();

            /*
            |--------------------------------------------------------------------------
            | واحد پول
            |--------------------------------------------------------------------------
            */

            $table->enum('currency', [
                'AFN', // افغانی
                'USD', // دالر امریکایی
                'EUR', // یورو
                'PKR', // روپیه پاکستان
                'IRR', // ریال ایران
                'AED', // درهم امارات
            ])->default('AFN');

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
            |
            | این ایندکس‌ها برای سرعت بخشیدن به فیلتر در بخش‌های مختلف سیستم
            | طراحی شده‌اند:
            |
            | - فیلتر بر اساس نوع حساب
            | - فیلتر بر اساس دسته‌بندی
            | - فیلتر بر اساس نام حساب
            | - فیلتر بر اساس کد حساب
            | - فیلتر بر اساس ترکیب (نوع + دسته‌بندی)
            | - فیلتر بر اساس ترکیب (نوع + فعال)
            | - فیلتر بر اساس ترکیب (دسته‌بندی + فعال)
            | - جستجو در نام و کد
            | - فیلتر مشتریان
            | - فیلتر تأمین‌کنندگان
            |
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
            |
            | این ایندکس‌ها برای فیلترهای ترکیبی بسیار مؤثرتر هستند.
            | مثلاً فیلتر «درآمد از مشتریان فعال» → (type + category + active)
            |
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
            // چون همیشه مشتریان با این ترکیب فیلتر می‌شوند
            $table->index(
                ['account_category', 'account_type', 'is_active'],
                'idx_accounts_customers_filter'
            );

            // فیلتر تأمین‌کنندگان: (category + active)
            $table->index(
                ['account_category', 'is_active'],
                'idx_accounts_suppliers_filter'
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