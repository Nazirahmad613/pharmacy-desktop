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
        // 1) اطلاعات معاش هر کاربر (1:1 با users)
        // ============================================================
        Schema::create('employee_salary_info', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->unique();
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->cascadeOnDelete();

            $table->string('employee_code', 50)->nullable()->unique();
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->decimal('deductions', 15, 2)->default(0);

            $table->unsignedBigInteger('bank_account_id')->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->string('hire_date', 20)->nullable();

            $table->string('salary_status', 20)->default('active');
            // active | suspended | terminated

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('salary_status', 'idx_salary_info_status');
            $table->index('bank_account_id', 'idx_salary_info_bank');
        });

        // ============================================================
        // 2) دوره‌های معاش
        // ============================================================
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();

            $table->string('period_month', 20);
            $table->string('period_year', 10);

            $table->string('status', 20)->default('open');
            // open | processing | closed | paid

            $table->decimal('total_amount', 18, 2)->default(0);
            $table->decimal('paid_amount', 18, 2)->default(0);
            $table->timestamps();

            $table->unique(['period_month', 'period_year'], 'uk_period');
        });

        // ============================================================
        // 3) معاشات ماهانه کارمندان (users + accounts)
        // ============================================================
        Schema::create('employee_salaries', function (Blueprint $table) {
            $table->id();

            // ✅ کارمند از users
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->nullOnDelete();

            // ✅ کارمند از accounts
            $table->unsignedBigInteger('account_id')->nullable();
            $table->foreign('account_id')
                  ->references('id')->on('accounts')
                  ->nullOnDelete();

            // دوره معاش
            $table->unsignedBigInteger('period_id');
            $table->foreign('period_id')
                  ->references('id')->on('payroll_periods')
                  ->cascadeOnDelete();

            // اطلاعات معاش کاربر
            $table->unsignedBigInteger('salary_info_id')->nullable();
            $table->foreign('salary_info_id')
                  ->references('id')->on('employee_salary_info')
                  ->nullOnDelete();

            // اجزای معاش
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->decimal('allowances', 15, 2)->default(0);
            $table->decimal('deductions', 15, 2)->default(0);
            $table->decimal('advance_deduction', 15, 2)->default(0);
            $table->decimal('net_salary', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);

            // وضعیت پرداخت
            $table->string('payment_status', 20)->default('pending');
            // pending | partial | paid | cancelled

            $table->date('payment_date')->nullable();
            $table->string('payment_method', 30)->default('bank_transfer');
            // cash | bank_transfer | cheque

            $table->unsignedBigInteger('payment_account_id')->nullable();
            $table->unsignedBigInteger('paid_from_account_id')->nullable();
            $table->foreign('paid_from_account_id')
                  ->references('id')->on('accounts')
                  ->nullOnDelete();

            $table->string('receipt_number', 80)->nullable();
            $table->text('notes')->nullable();

            // ثبت کننده
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('payment_status', 'idx_salaries_status');
            $table->index('period_id', 'idx_salaries_period');
            $table->index('user_id', 'idx_salaries_user');
            $table->index('account_id', 'idx_salaries_account_id');
            $table->index('payment_account_id', 'idx_salaries_account');
            $table->index('paid_from_account_id', 'idx_salaries_paid_from');

            // Unique
            $table->unique(['user_id', 'period_id'], 'uk_user_period');
        });

        // ============================================================
        // 4) پیش‌پرداخت معاش
        // ============================================================
        Schema::create('salary_advances', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->cascadeOnDelete();

            $table->decimal('amount', 15, 2)->default(0);
            $table->text('reason')->nullable();
            $table->string('request_date', 20)->nullable();
            $table->date('approval_date')->nullable();

            $table->unsignedBigInteger('approved_by')->nullable();
            $table->unsignedBigInteger('payment_account_id')->nullable();

            $table->string('status', 30)->default('pending');
            // pending | approved | rejected | repaid | partially_repaid

            $table->decimal('repaid_amount', 15, 2)->default(0);
            $table->decimal('remaining_amount', 15, 2)->default(0);
            $table->integer('repayment_months')->default(1);
            $table->decimal('monthly_deduction', 15, 2)->default(0);

            $table->timestamps();

            $table->index('status', 'idx_advances_status');
            $table->index('user_id', 'idx_advances_user');
            $table->index('payment_account_id', 'idx_advances_account');
        });

        // ============================================================
        // 5) تنظیمات معاشات
        // ============================================================
        Schema::create('payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 100)->unique();
            $table->text('setting_value')->nullable();
            $table->string('setting_type', 20)->default('string');
            // string | number | boolean | json
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
        // 7) درج تنظیمات پیش‌فرض
        // ============================================================
        $this->seedDefaultSettings();
    }

    public function down(): void
    {
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