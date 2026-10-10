<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * جدول فیس‌های نسخه (داخلی + بیرونی)
     *
     * نکات مهم:
     * 1) تمام ستون‌های مربوط به نسخه بیرونی (ref_type, ref_id, source_type, ...)
     *    به‌صورت nullable هستند تا نسخه داخلی بدون پر کردن آن‌ها ذخیره شود.
     * 2) ستون receipt_number اجباری نیست تا اگر پر نشد خطا ندهد.
     * 3) هیچ CHECK constraint سخت‌گیرانه‌ای وجود ندارد.
     */
    public function up(): void
    {
        Schema::create('prescription_fees', function (Blueprint $table) {
            $table->id();

            // ============================================================
            // ارتباطات اصلی (برای نسخه‌های بیرونی nullable هستند)
            // ============================================================
            $table->unsignedBigInteger('registration_id')->nullable()
                ->comment('شماره مراجعه (reg_id) - برای نسخه بیرونی null');

            $table->unsignedBigInteger('patient_id')->nullable()
                ->comment('شناسه بیمار - برای نسخه بیرونی null');

            // ============================================================
            // ارتباط چندریختی با منبع (نسخه داخلی/بیرونی)
            // ============================================================
            $table->string('ref_type', 50)->nullable()
                ->comment('prescription_fee (داخلی) | external_prescription (بیرونی)');

            $table->unsignedBigInteger('ref_id')->nullable()
                ->comment('شناسه رکورد مرجع (PharmacyExecution.id یا ExternalPrescription.id)');

            $table->string('source_type', 20)->nullable()
                ->comment('internal | external');

            // ============================================================
            // فیلدهای Denormalized برای نمایش سریع
            // ============================================================
            $table->string('patient_name', 200)->nullable()
                ->comment('نام کامل بیمار (cache)');

            $table->string('patient_phone', 30)->nullable()
                ->comment('شماره تماس بیمار (cache)');

            $table->string('tazkira_number', 50)->nullable()
                ->comment('شماره تذکره (cache)');

            $table->string('doctor_name', 200)->nullable()
                ->comment('نام داکتر (cache)');

            $table->string('receipt_number', 50)->nullable()
                ->comment('شماره رسید (اختیاری - ممکن است خالی باشد)');

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
            $table->string('payment_status', 20)->default('pending')
                ->comment('pending | partial | paid | refunded | cancelled');

            $table->string('payment_method', 30)->nullable()
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
            // ایندکس‌های تک‌ستونی
            // ============================================================
            $table->index('registration_id', 'pf_registration_idx');
            $table->index('patient_id',      'pf_patient_idx');
            $table->index('payment_status',  'pf_status_idx');
            $table->index('payment_method',  'pf_method_idx');
            $table->index('payment_date',    'pf_payment_date_idx');
            $table->index('created_at',      'pf_created_at_idx');
            $table->index('receipt_number',  'pf_receipt_idx');

            // ============================================================
            // ایندکس‌های مرجع پویا
            // ============================================================
            $table->index(['ref_type', 'ref_id'], 'pf_ref_idx');
            $table->index('source_type',          'pf_source_idx');

            // ============================================================
            // ایندکس‌های ترکیبی
            // ============================================================
            $table->index(
                ['payment_status', 'created_at'],
                'pf_status_created_idx'
            );

            $table->index(
                ['patient_id', 'payment_status'],
                'pf_patient_status_idx'
            );

            $table->index(
                ['ref_type', 'ref_id', 'source_type'],
                'pf_ref_source_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_fees');
    }
};