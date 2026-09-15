<?php
// database/migrations/2026_01_01_000001_create_admission_fees_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // اگر جدول قبلاً وجود دارد، نادیده بگیر
        if (Schema::hasTable('admission_fees')) {
            return;
        }

        // بررسی وجود جداول مرجع
        if (!Schema::hasTable('admission_requests')) {
            throw new \Exception('جدول admission_requests باید قبل از این migration ساخته شود');
        }
        if (!Schema::hasTable('patients')) {
            throw new \Exception('جدول patients باید قبل از این migration ساخته شود');
        }
        if (!Schema::hasTable('registrations')) {
            throw new \Exception('جدول registrations باید قبل از این migration ساخته شود');
        }
        if (!Schema::hasTable('users')) {
            throw new \Exception('جدول users باید قبل از این migration ساخته شود');
        }

        Schema::create('admission_fees', function (Blueprint $table) {
            $table->id();
            
            // ============ ارتباطات اصلی ============
            $table->unsignedBigInteger('admission_request_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id')->nullable();
            
            // ============ اطلاعات فیس ============
            $table->date('fee_date');
            $table->time('fee_time');
            
            // مبالغ اصلی
            $table->decimal('amount', 12, 2)->comment('مبلغ کل');
            $table->decimal('paid_amount', 12, 2)->default(0)->comment('مبلغ پرداخت شده');
            
            // تخفیف - هر دو حالت در همین دو فیلد
            $table->decimal('discount', 12, 2)->default(0)->comment('مبلغ تخفیف (محاسبه شده یا دستی)');
            $table->decimal('discount_percent', 5, 2)->default(0)->comment('درصد تخفیف (اختیاری)');
            
            // باقی‌مانده - به صورت خودکار محاسبه می‌شود
            $table->decimal('remaining_amount', 12, 2)->default(0)->comment('مبلغ باقی‌مانده = amount - paid_amount - discount');
            
            // ============ نوع و دوره ============
            // در SQLite از string استفاده می‌کنیم نه enum
            $table->string('fee_type', 50)->default('daily')->comment('daily, weekly, monthly, custom');
            $table->string('period', 50)->default('full_day')->comment('morning, evening, night, full_day');
            $table->integer('day_number')->nullable()->comment('شماره روز بستری');
            
            // ============ توضیحات ============
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            
            // ============ شماره رسید ============
            $table->string('receipt_number', 100)->unique();
            
            // ============ روش پرداخت ============
            $table->string('payment_method', 50)->default('cash')->comment('cash, card, bank_transfer, insurance, online');
            
            // ============ وضعیت ============
            $table->string('status', 50)->default('pending')->comment('pending, paid, cancelled, refunded');
            
            // ============ دریافت کننده ============
            $table->unsignedBigInteger('collected_by')->nullable();
            $table->timestamp('collected_at')->nullable();
            
            // ============ اطلاعات پرینت ============
            $table->integer('print_count')->default(0);
            $table->timestamp('last_printed_at')->nullable();
            
            // ============ تایم‌استمپ‌ها ============
            $table->timestamps();
            $table->softDeletes();
            
            // ============ ایندکس‌ها ============
            $table->index('admission_request_id');
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('fee_date');
            $table->index('status');
            $table->index('receipt_number');
            $table->index('payment_method');
            $table->index('fee_type');
            $table->index('period');
            $table->index(['status', 'fee_date']);
            $table->index(['patient_id', 'status']);
            $table->index(['doctor_id', 'status']);
            $table->index(['admission_request_id', 'status']);
            $table->index(['reg_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_fees');
    }
};