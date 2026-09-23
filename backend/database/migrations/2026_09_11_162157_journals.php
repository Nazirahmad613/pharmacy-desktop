<?php
// database/migrations/2026_01_01_000001_create_journals_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // حذف جدول اگر وجود دارد (برای اطمینان)
        Schema::dropIfExists('journals');

        $isSqlite = DB::getDriverName() === 'sqlite';

        Schema::create('journals', function (Blueprint $table) use ($isSqlite) {

            $table->id();

            /* ============================================================
             * ستون‌های اصلی
             * ============================================================ */
            $table->unsignedBigInteger('account_id')->nullable();
            $table->date('journal_date');
            $table->enum('entry_type', ['debit', 'credit'])->default('debit');
            $table->string('description')->nullable();
            $table->decimal('amount', 15, 2)->nullable()->default(0);
            $table->string('tazkira_number')->nullable();

            /* ============================================================
             * ارتباط با منبع
             * ============================================================ */
            $table->string('ref_type');
            $table->unsignedBigInteger('ref_id');

            /* ============================================================
             * ✅ ارتباط با مراجعه و ساختار درختی
             * ============================================================ */
            $table->unsignedBigInteger('reg_id')->nullable();
            $table->unsignedBigInteger('parent_journal_id')->nullable();

            /* ============================================================
             * ستون‌های ارتباطی (nullable)
             * ============================================================ */
            $table->unsignedBigInteger('patient_id')->nullable();  // → patients.id
            $table->unsignedBigInteger('doc_id')->nullable();      // → users.id
            $table->unsignedBigInteger('cust_id')->nullable();     // → accounts.id
            $table->unsignedBigInteger('supplier_id')->nullable(); // → accounts.id
            $table->unsignedBigInteger('med_id')->nullable();      // → medications.med_id
            $table->unsignedBigInteger('pres_id')->nullable();     // → prescriptions.pres_id
            $table->unsignedBigInteger('pres_num')->nullable();    // فقط عدد، FK نیست
            $table->unsignedBigInteger('parchase_id')->nullable(); // → parchases.parchase_id
            $table->unsignedBigInteger('user_id')->nullable();     // → users.id

            $table->timestamps();

            /* ============================================================
             * ایندکس‌ها (برای همه درایورها)
             * ============================================================ */
            $table->index('journal_date', 'journals_journal_date_idx');
            $table->index('entry_type', 'journals_entry_type_idx');
            $table->index('ref_type', 'journals_ref_type_idx');
            $table->index('ref_id', 'journals_ref_id_idx');
            $table->index(['ref_type', 'ref_id'], 'journals_ref_type_ref_id_idx');
            $table->index('reg_id', 'journals_reg_id_idx');
            $table->index('parent_journal_id', 'journals_parent_idx');
            $table->index('patient_id', 'journals_patient_idx');

            /* ============================================================
             * Foreign Keys (فقط MySQL/PostgreSQL)
             * در SQLite نادیده گرفته می‌شوند
             * ============================================================ */
            if (!$isSqlite) {
                // حساب مالی
                $table->foreign('account_id', 'journals_account_fk')
                      ->references('id')->on('accounts')
                      ->nullOnDelete();

                // کاربر
                $table->foreign('user_id', 'journals_user_fk')
                      ->references('id')->on('users')
                      ->nullOnDelete();

                // مریض → patients.id
                $table->foreign('patient_id', 'journals_patient_fk')
                      ->references('id')->on('patients')
                      ->nullOnDelete();

                // داکتر → users.id
                $table->foreign('doc_id', 'journals_doc_fk')
                      ->references('id')->on('users')
                      ->nullOnDelete();

                // مشتری → accounts.id
                $table->foreign('cust_id', 'journals_cust_fk')
                      ->references('id')->on('accounts')
                      ->nullOnDelete();

                // تأمین‌کننده → accounts.id
                $table->foreign('supplier_id', 'journals_supplier_fk')
                      ->references('id')->on('accounts')
                      ->nullOnDelete();

                // مراجعه → registrations.reg_id
                $table->foreign('reg_id', 'journals_reg_fk')
                      ->references('reg_id')->on('registrations')
                      ->nullOnDelete();

                // والد → journals.id
                $table->foreign('parent_journal_id', 'journals_parent_fk')
                      ->references('id')->on('journals')
                      ->nullOnDelete();

                // دوا → medications.med_id
                $table->foreign('med_id', 'journals_med_fk')
                      ->references('med_id')->on('medications')
                      ->nullOnDelete();

                // نسخه → prescriptions.pres_id
                $table->foreign('pres_id', 'journals_pres_fk')
                      ->references('pres_id')->on('prescriptions')
                      ->nullOnDelete();

                // خرید → parchases.parchase_id
                $table->foreign('parchase_id', 'journals_parchase_fk')
                      ->references('parchase_id')->on('parchases')
                      ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};