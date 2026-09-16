<?php
// database/migrations/2026_01_20_000001_create_pharmacy_executions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pharmacy_executions')) {
            return;
        }

        Schema::create('pharmacy_executions', function (Blueprint $table) {
            $table->id();

            // ارتباطات
            $table->unsignedBigInteger('pres_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('doc_id')->nullable();
            $table->unsignedBigInteger('executed_by')->nullable();

            // ⭐ معلومات کامل بیمار (کپی از prescription/patient)
            $table->string('patient_name')->nullable();
            $table->string('tazkira_number', 100)->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender', 20)->nullable();
            $table->string('patient_phone', 30)->nullable();
            $table->text('patient_address')->nullable();

            // ⭐ معلومات داکتر
            $table->string('doctor_name')->nullable();
            $table->string('doctor_specialty')->nullable();
            $table->string('doctor_department')->nullable();

            // ⭐ اقلام قیمت‌گذاری‌شده (JSON کامل)
            $table->text('items')->nullable();

            // ⭐ مبالغ
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('remaining_amount', 12, 2)->default(0);

            // ⭐ شماره رسید
            $table->string('receipt_number', 100)->nullable()->unique();

            // ⭐ وضعیت مستقل
            $table->string('status', 50)->default('pending');

            // ⭐ تاریخ‌ها
            $table->timestamp('executed_at')->nullable();
            $table->timestamp('sent_to_registration_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // ⭐ دریافت‌کننده
            $table->unsignedBigInteger('collected_by')->nullable();

            // ⭐ یادداشت
            $table->text('notes')->nullable();

            // ⭐ پرینت
            $table->integer('print_count')->default(0);
            $table->timestamp('last_printed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // ایندکس‌ها
            $table->index('pres_id');
            $table->index('patient_id');
            $table->index('reg_id');
            $table->index('status');
            $table->index('receipt_number');
            $table->index(['status', 'created_at']);
            $table->index(['reg_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacy_executions');
    }
};