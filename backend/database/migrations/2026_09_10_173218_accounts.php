```php
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
            |
            | مشخص می‌کند که ماهیت طبیعی حساب بدهکار است یا بستانکار.
            |
            */

            $table->enum('normal_balance', [
                'debit',   // بدهکار
                'credit',  // بستانکار
            ]);

            /*
            |--------------------------------------------------------------------------
            | موجودی ابتدایی
            |--------------------------------------------------------------------------
            |
            | مانده حساب در زمان ایجاد حساب.
            |
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
            | Indexes - ایندکس‌ها
            |--------------------------------------------------------------------------
            */

            $table->index('account_type');

            $table->index('account_category');

            $table->index('parent_id');

            $table->index('is_active');

            $table->index('account_name');

            $table->index('phone');
        });
    }

    /**
     * حذف جدول هنگام rollback
     *
     * این متد زمانی اجرا می‌شود که Migration برگشت داده شود.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
