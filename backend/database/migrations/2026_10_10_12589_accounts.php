<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {

            $table->id();

            $table->string('account_code', 50)->unique();
            $table->string('account_name', 200);

            /*
            |--------------------------------------------------------------------------
            | account_type
            |--------------------------------------------------------------------------
            | مقادیر مجاز:
            | - asset, liability, equity, income, expense, receivable, payable,
            | - employee  → ✅ کارمندان (نوع مستقل، شامل رسمی/قراردادی/کارگر)
            */
            $table->string('account_type', 30);

            /*
            |--------------------------------------------------------------------------
            | account_category
            |--------------------------------------------------------------------------
            | ==================== Asset ====================
            | cash, bank, medicine_inventory, laboratory_inventory,
            | consumable_inventory, medical_equipment, office_equipment,
            | tools_and_supplies, building, land, vehicle, furniture,
            | prepayments, deposits, other_assets
            |
            | ==================== Liability ====================
            | suppliers, medicine_purchase_payable, equipment_purchase_payable,
            | laboratory_material_payable, salary_payable, tax_payable,
            | loans, bank_loans, contractual_liabilities, other_liabilities
            |
            | ==================== Equity ====================
            | initial_capital, owner_capital, partners_capital,
            | retained_earnings, retained_losses, owner_drawings, other_equity
            |
            | ==================== Income ====================
            | medical_services_income, consultation_income, laboratory_income,
            | radiology_income, operation_income, admission_income, pharmacy_income,
            | goods_sales_income, operation_room_income, other_services_income,
            | non_operating_income, rent_income, customers_income, other_income
            |
            | ==================== Expense ====================
            | salary_expense, rent_expense, electricity_expense, water_expense,
            | internet_expense, telephone_expense, transportation_expense,
            | consumable_material_expense, medical_material_expense,
            | laboratory_material_expense, cleaning_material_expense,
            | repair_expense, medical_equipment_repair_expense,
            | building_repair_expense, fuel_expense, stationery_expense,
            | administrative_expense, marketing_expense, legal_expense,
            | tax_and_duty_expense, insurance_expense, bank_charge_expense,
            | depreciation_expense, other_expense
            |
            | ==================== Receivable ====================
            | insurance_companies, contracting_institutions, companies,
            | corporate_customers, customers, miscellaneous_receivables,
            | other_receivables
            |
            | ==================== Payable ====================
            | medicine_suppliers, medical_equipment_suppliers,
            | laboratory_material_suppliers, consumable_material_suppliers,
            | vendors, contractors, salary_payables, tax_payables,
            | bank_payables, other_creditors
            |
            | ==================== ✅ Employee - کارمندان ====================
            | -- کارمندان رسمی:
            | employee_doctor, employee_nurse, employee_radiology,
            | employee_laboratory, employee_pharmacy, employee_reception,
            | employee_administration, employee_finance, employee_cleaning,
            | employee_security, employee_kitchen, employee_other
            |
            | -- کارمندان قراردادی:
            | contract_doctor, contract_nurse, contract_radiology,
            | contract_laboratory, contract_pharmacy, contract_reception,
            | contract_administration, contract_finance, contract_cleaning,
            | contract_security, contract_kitchen, contract_other
            |
            | -- کارگرها:
            | worker_construction, worker_cleaning, worker_loading,
            | worker_gardening, worker_kitchen, worker_laundry,
            | worker_maintenance, worker_security, worker_other
            */
            $table->string('account_category', 60);

            $table->unsignedBigInteger('parent_id')->nullable();
            $table->foreign('parent_id')
                ->references('id')
                ->on('accounts')
                ->nullOnDelete();

            $table->string('normal_balance', 10);

            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->string('opening_balance_type', 10)->nullable();

            $table->string('currency', 10)->default('AFN');

            $table->string('contact_person')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('mobile', 30)->nullable();
            $table->string('email')->nullable();

            $table->string('tazkira_number', 30)->nullable();
            $table->string('tax_number', 50)->nullable();

            $table->string('country')->default('Afghanistan');
            $table->string('province')->nullable();
            $table->string('district')->nullable();
            $table->text('address')->nullable();

            $table->decimal('credit_limit', 15, 2)->default(0);

            $table->text('description')->nullable();

            $table->boolean('is_system')->default(false);
            $table->boolean('allow_transactions')->default(true);
            $table->boolean('is_control_account')->default(false);
            $table->boolean('is_active')->default(true);

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // Indexes
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

            $table->index(
                ['account_type', 'account_category', 'is_active'],
                'idx_accounts_type_category_active'
            );
            $table->index(['account_type', 'is_active'], 'idx_accounts_type_active');
            $table->index(['account_category', 'is_active'], 'idx_accounts_category_active');
            $table->index(['parent_id', 'is_active'], 'idx_accounts_parent_active');
            $table->index(
                ['account_type', 'account_category', 'parent_id'],
                'idx_accounts_type_category_parent'
            );
            $table->index(['account_type', 'parent_id'], 'idx_accounts_type_parent');

            $table->index(
                ['account_category', 'account_type', 'is_active'],
                'idx_accounts_customers_filter'
            );
            $table->index(
                ['account_category', 'is_active'],
                'idx_accounts_suppliers_filter'
            );

            // ✅ فیلتر کارمندان (نوع مستقل + دسته + فعال + قابل تراکنش)
            $table->index(
                ['account_type', 'account_category', 'is_active', 'allow_transactions'],
                'idx_accounts_employees_filter'
            );

            $table->index(['is_system', 'account_type'], 'idx_accounts_system_type');
            $table->index(
                ['is_active', 'allow_transactions'],
                'idx_accounts_transaction_accounts'
            );
            $table->index(
                ['is_control_account', 'is_active'],
                'idx_accounts_control_active'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};