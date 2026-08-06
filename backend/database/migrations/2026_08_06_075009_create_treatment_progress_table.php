<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('treatment_progress', function (Blueprint $table) {
            $table->id();
            
            // ارتباط با جدول registrations
            $table->unsignedBigInteger('registration_id');
            
            // وضعیت مراحل
            $table->integer('current_step_index')->default(0)->comment('شاخص مرحله جاری');
            $table->string('current_step')->nullable()->comment('نام مرحله جاری');
            $table->json('completed_steps')->nullable()->comment('مراحل تکمیل شده');
            $table->json('saved_data')->nullable()->comment('داده‌های ذخیره شده هر مرحله');
            
            // وضعیت کلی درمان
            $table->boolean('is_complete')->default(false)->comment('آیا درمان کامل شده؟');
            
            // زمان‌ها
            $table->timestamp('start_time')->nullable()->comment('زمان شروع درمان');
            $table->timestamp('end_time')->nullable()->comment('زمان پایان درمان');
            $table->timestamp('last_activity_at')->nullable()->comment('آخرین فعالیت');
            
            // وضعیت فعال/غیرفعال
            $table->boolean('is_active')->default(true)->comment('وضعیت فعال بودن');
            
            // توضیحات و یادداشت
            $table->text('note')->nullable()->comment('یادداشت');
            
            // فیلدهای زمان‌دار
            $table->timestamps();
            
            // ایندکس‌ها
            $table->index('registration_id');
            $table->index('current_step');
            $table->index('is_complete');
            $table->index('is_active');
            $table->index(['registration_id', 'is_active']);
            
            // کلید خارجی
            $table->foreign('registration_id')
                  ->references('reg_id')
                  ->on('registrations')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
                  
            // محدودیت یکتایی برای registration_id
            $table->unique('registration_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treatment_progress');
    }
};