<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ============================================================
        // 0) حذف View قدیمی (اگر وجود دارد)
        // ============================================================
        DB::statement('DROP VIEW IF EXISTS v_active_employees');

        // ============================================================
        // 1) اطلاعات معاش کارمندان (users + accounts)
        // ============================================================
        Schema::create('employee_salary_info', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->cascadeOnDelete();

            $table->unsignedBigInteger('account_id')->nullable();
            $table->foreign('account_id')
                  ->references('id')->on('accounts')
                  ->cascadeOnDelete();

            $table->string('employee_code', 50)->nullable()->unique();
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->decimal('deductions', 15, 2)->default(0);

            $table->unsignedBigInteger('bank_account_id')->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->string('hire_date', 20)->nullable();

            $table->string('salary_status', 20)->default('active');

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('user_id', 'uk_salary_info_user');
            $table->unique('account_id', 'uk_salary_info_account');

            $table->index('salary_status', 'idx_salary_info_status');
            $table->index('bank_account_id', 'idx_salary_info_bank');
            $table->index('account_id', 'idx_salary_info_account_id');
        });

        // ============================================================
        // 2) دوره‌های معاش
        // ============================================================
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();

            $table->string('period_month', 20);
            $table->string('period_year', 10);

            $table->string('status', 20)->default('open');

            $table->decimal('total_amount', 18, 2)->default(0);
            $table->decimal('paid_amount', 18, 2)->default(0);
            $table->timestamps();

            $table->unique(['period_month', 'period_year'], 'uk_period');
        });

        // ============================================================
        // 3) معاشات ماهانه کارمندان
        // ============================================================
        Schema::create('employee_salaries', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->nullOnDelete();

            $table->unsignedBigInteger('account_id')->nullable();
            $table->foreign('account_id')
                  ->references('id')->on('accounts')
                  ->nullOnDelete();

            $table->unsignedBigInteger('period_id');
            $table->foreign('period_id')
                  ->references('id')->on('payroll_periods')
                  ->cascadeOnDelete();

            $table->unsignedBigInteger('salary_info_id')->nullable();
            $table->foreign('salary_info_id')
                  ->references('id')->on('employee_salary_info')
                  ->nullOnDelete();

            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->decimal('deductions', 15, 2)->default(0);

            $table->decimal('gross_salary', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('insurance_amount', 15, 2)->default(0);

            $table->decimal('advance_deduction', 15, 2)->default(0);
            $table->decimal('net_salary', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);

            $table->string('payment_status', 20)->default('pending');

            $table->date('payment_date')->nullable();
            $table->string('payment_method', 30)->default('bank_transfer');

            $table->unsignedBigInteger('payment_account_id')->nullable();
            $table->unsignedBigInteger('paid_from_account_id')->nullable();
            $table->foreign('paid_from_account_id')
                  ->references('id')->on('accounts')
                  ->nullOnDelete();

            $table->string('receipt_number', 80)->nullable();
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();

            $table->index('payment_status', 'idx_salaries_status');
            $table->index('period_id', 'idx_salaries_period');
            $table->index('user_id', 'idx_salaries_user');
            $table->index('account_id', 'idx_salaries_account_id');
            $table->index('payment_account_id', 'idx_salaries_account');
            $table->index('paid_from_account_id', 'idx_salaries_paid_from');

            $table->unique(['user_id', 'period_id'], 'uk_user_period');
            $table->unique(['account_id', 'period_id'], 'uk_account_period');
        });

        // ============================================================
        // 4) پیش‌پرداخت معاش
        // ============================================================
        Schema::create('salary_advances', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->cascadeOnDelete();

            $table->unsignedBigInteger('account_id')->nullable();
            $table->foreign('account_id')
                  ->references('id')->on('accounts')
                  ->cascadeOnDelete();

            $table->decimal('amount', 15, 2)->default(0);
            $table->text('reason')->nullable();
            $table->string('request_date', 20)->nullable();

            $table->string('target_month', 20)->nullable()->after('request_date');
            $table->string('target_year', 10)->nullable()->after('target_month');

            $table->date('approval_date')->nullable();

            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('payment_account_id')->nullable();

            $table->string('status', 30)->default('pending');

            $table->decimal('repaid_amount', 15, 2)->default(0);
            $table->decimal('remaining_amount', 15, 2)->default(0);
            $table->integer('repayment_months')->default(1);
            $table->decimal('monthly_deduction', 15, 2)->default(0);

            $table->timestamps();

            $table->index('status', 'idx_advances_status');
            $table->index('user_id', 'idx_advances_user');
            $table->index('account_id', 'idx_advances_account_id');
            $table->index('payment_account_id', 'idx_advances_account');
            $table->index(['target_month', 'target_year'], 'idx_advances_target_period');
        });

        // ============================================================
        // 5) تنظیمات معاشات
        // ============================================================
        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 100)->unique();
            $table->text('setting_value')->nullable();
            $table->string('setting_type', 20)->default('string');
            $table->string('description', 255)->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        // ============================================================
        // 6) لاگ تغییرات
        // ============================================================
        Schema::create('payroll_audit_log', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 50);
            $table->string('entity_type', 50)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->timestamp('created_at')->nullable();

            $table->index('user_id', 'idx_audit_user');
            $table->index(['entity_type', 'entity_id'], 'idx_audit_entity');
            $table->index('created_at', 'idx_audit_created');
        });

        // ============================================================
        // 7) ساخت View کامل: ترکیب users + accounts
        // ✅ شامل: tazkira_number, account_type, account_category
        // ✅ سازگار با migration جدید accounts (نوع مستقل employee)
        // ============================================================
        DB::statement("
            CREATE VIEW v_active_employees AS
            -- بخش اول: کاربران سیستم (users)
            SELECT
                u.id                                 AS employee_id,
                u.id                                 AS user_id,
                NULL                                 AS account_id,
                'user'                               AS source,
                u.name                               AS full_name,
                u.email                              AS email,
                u.avatar                             AS avatar,
                u.department_id                      AS department_id,
                d.name                               AS department_name,
                u.role                               AS role,
                u.is_active                          AS is_active,
                si.id                                AS salary_info_id,
                COALESCE(si.salary_status, 'active') AS salary_status,
                COALESCE(si.base_salary, 0)          AS base_salary,
                COALESCE(si.allowances, 0)           AS allowances,
                COALESCE(si.deductions, 0)           AS deductions,
                si.employee_code                     AS employee_code,
                NULL                                 AS account_code,
                si.bank_account_number               AS bank_account_number,
                si.hire_date                         AS hire_date,
                si.notes                             AS notes,
                NULL                                 AS tazkira_number,
                NULL                                 AS account_type,
                NULL                                 AS account_category,
                u.created_at                         AS created_at,
                u.updated_at                         AS updated_at
            FROM users u
            LEFT JOIN employee_salary_info si ON si.user_id = u.id
            LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
            WHERE u.is_active = 1

            UNION ALL

            -- بخش دوم: کارمندان از accounts
            -- ✅ فقط نوع employee (شامل رسمی، قراردادی، کارگر)
            SELECT
                a.id                                 AS employee_id,
                NULL                                 AS user_id,
                a.id                                 AS account_id,
                'account'                            AS source,
                a.account_name                       AS full_name,
                a.email                              AS email,
                NULL                                 AS avatar,
                NULL                                 AS department_id,
                NULL                                 AS department_name,
                NULL                                 AS role,
                a.is_active                          AS is_active,
                si.id                                AS salary_info_id,
                COALESCE(si.salary_status, 'active') AS salary_status,
                COALESCE(si.base_salary, 0)          AS base_salary,
                COALESCE(si.allowances, 0)           AS allowances,
                COALESCE(si.deductions, 0)           AS deductions,
                si.employee_code                     AS employee_code,
                a.account_code                       AS account_code,
                si.bank_account_number               AS bank_account_number,
                si.hire_date                         AS hire_date,
                si.notes                             AS notes,
                a.tazkira_number                     AS tazkira_number,
                a.account_type                       AS account_type,
                a.account_category                   AS account_category,
                a.created_at                         AS created_at,
                a.updated_at                         AS updated_at
            FROM accounts a
            LEFT JOIN employee_salary_info si ON si.account_id = a.id
            WHERE a.is_active = 1
              AND a.account_type = 'employee'
        ");

        // ============================================================
        // 8) درج تنظیمات پیش‌فرض
        // ============================================================
        $this->seedDefaultSettings();
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS v_active_employees');

        Schema::dropIfExists('payroll_audit_log');
        Schema::dropIfExists('payroll_settings');
        Schema::dropIfExists('salary_advances');
        Schema::dropIfExists('employee_salaries');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('employee_salary_info');
    }

    private function seedDefaultSettings(): void
    {
        $defaults = [
            ['setting_key' => 'currency',          'setting_value' => 'AFN',   'setting_type' => 'string',  'description' => 'واحد پول'],
            ['setting_key' => 'payDay',            'setting_value' => '25',    'setting_type' => 'number',  'description' => 'روز پرداخت معاش'],
            ['setting_key' => 'taxRate',           'setting_value' => '5',     'setting_type' => 'number',  'description' => 'نرخ مالیات (%)'],
            ['setting_key' => 'insuranceRate',     'setting_value' => '3',     'setting_type' => 'number',  'description' => 'نرخ بیمه (%)'],
            ['setting_key' => 'overtimeRate',      'setting_value' => '150',   'setting_type' => 'number',  'description' => 'نرخ اضافه کاری (%)'],
            ['setting_key' => 'lateDeduction',     'setting_value' => '500',   'setting_type' => 'number',  'description' => 'کسر تأخیر روزانه'],
            ['setting_key' => 'absenceDeduction',  'setting_value' => '2000',  'setting_type' => 'number',  'description' => 'کسر غیابت روزانه'],
            ['setting_key' => 'enableTax',         'setting_value' => 'true',  'setting_type' => 'boolean', 'description' => 'فعال‌سازی مالیات'],
            ['setting_key' => 'enableInsurance',   'setting_value' => 'true',  'setting_type' => 'boolean', 'description' => 'فعال‌سازی بیمه'],
            ['setting_key' => 'enableOvertime',    'setting_value' => 'true',  'setting_type' => 'boolean', 'description' => 'فعال‌سازی اضافه کاری'],
            ['setting_key' => 'autoPayroll',       'setting_value' => 'false', 'setting_type' => 'boolean', 'description' => 'پرداخت خودکار'],
            ['setting_key' => 'minSalary',         'setting_value' => '15000', 'setting_type' => 'number',  'description' => 'حداقل معاش'],
            ['setting_key' => 'maxAdvancePercent', 'setting_value' => '50',    'setting_type' => 'number',  'description' => 'حداکثر پیش‌پرداخت (%)'],
        ];

        foreach ($defaults as $item) {
            DB::table('payroll_settings')->insert(array_merge($item, [
                'updated_at' => now(),
            ]));
        }
    }
};