<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * جدول فیس‌های نسخه (داخلی + بیرونی)
     *
     * این جدول برای ذخیره فیس‌های اخذ شده از دواخانه استفاده می‌شود:
     * - نسخه‌های داخلی (pharmacy_executions)
     * - نسخه‌های بیرونی (external_prescriptions)
     *
     * فیلدهای registration_id و patient_id برای نسخه‌های بیرونی null هستند
     * چون بیمار در سیستم ثبت‌نام نشده است.
     */
    public function up(): void
    {
        Schema::create('prescription_fees', function (Blueprint $table) {
            $table->id();

            // ============================================================
            // ارتباطات (برای نسخه‌های بیرونی nullable هستند)
            // ============================================================
            $table->unsignedBigInteger('registration_id')->nullable()
                ->comment('شماره مراجعه (reg_id) - برای نسخه بیرونی null');
            $table->unsignedBigInteger('patient_id')->nullable()
                ->comment('شناسه بیمار - برای نسخه بیرونی null');

            // ============================================================
            // مبالغ مالی
            // ============================================================
            $table->decimal('total_amount', 15, 2)->default(0)
                ->comment('مبلغ کل فیس');
            $table->decimal('paid_amount', 15, 2)->default(0)
                ->comment('مبلغ پرداخت شده');
            $table->decimal('discount', 15, 2)->default(0)
                ->comment('تخفیف');
            $table->decimal('remaining_amount', 15, 2)->default(0)
                ->comment('باقی‌مانده قابل پرداخت');

            // ============================================================
            // وضعیت و روش پرداخت
            // ============================================================
            $table->string('payment_status')->default('pending')
                ->comment('pending | partial | paid | refunded | cancelled');
            $table->string('payment_method')->nullable()
                ->comment('cash | card | online | insurance');
            $table->timestamp('payment_date')->nullable()
                ->comment('تاریخ پرداخت');

            // ============================================================
            // جزئیات
            // ============================================================
            $table->json('medication_items')->nullable()
                ->comment('اقلام دارویی (JSON)');
            $table->text('description')->nullable()
                ->comment('توضیحات');
            $table->text('note')->nullable()
                ->comment('یادداشت');

            // ============================================================
            // کاربران (Audit)
            // ============================================================
            $table->unsignedBigInteger('created_by')->nullable()
                ->comment('کاربر ایجادکننده');
            $table->unsignedBigInteger('updated_by')->nullable()
                ->comment('کاربر ویرایش‌کننده');

            // ============================================================
            // زمان‌ها
            // ============================================================
            $table->timestamps();

            // ============================================================
            // ایندکس‌ها (برای جستجوی سریع)
            // ============================================================
            $table->index('registration_id', 'pf_registration_idx');
            $table->index('patient_id', 'pf_patient_idx');
            $table->index('payment_status', 'pf_status_idx');
            $table->index('payment_method', 'pf_method_idx');
            $table->index('payment_date', 'pf_payment_date_idx');
            $table->index('created_at', 'pf_created_at_idx');

            // ایندکس ترکیبی برای فیلترهای رایج
            $table->index(['payment_status', 'created_at'], 'pf_status_created_idx');
            $table->index(['patient_id', 'payment_status'], 'pf_patient_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_fees');
    }
};