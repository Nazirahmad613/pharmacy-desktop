<?php
// database/migrations/2026_01_01_000000_create_admission_requests_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_requests', function (Blueprint $table) {
            $table->id();
            
            // ارتباط با رجیستریشن (برای دریافت تشخیص اولیه)
            $table->foreignId('reg_id')
                ->constrained('registrations', 'reg_id')
                ->onDelete('cascade');
            
            // ارتباط با بیمار و دکتر
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            
            // فقط بخش (بدون تخت)
            $table->foreignId('ward_id')->constrained('wards')->onDelete('cascade');
            
            // تاریخ بستری
            $table->date('admission_date');
            $table->datetime('discharged_at')->nullable();
            $table->datetime('cancelled_at')->nullable();
            
            // تشخیص و دستورالعمل‌ها (مطابق فرانت)
            $table->string('diagnosis')->nullable()->comment('تشخیص اولیه از رجیستریشن');
            $table->text('admission_instructions')->nullable()->comment('دستورالعمل‌های داکتر برای بستری - شماره‌دار');
            $table->text('special_notes')->nullable()->comment('یادداشت‌های ویژه');
            
            // وضعیت‌ها (مطابق فرانت)
            $table->enum('status', ['pending', 'admitted', 'discharged', 'cancelled'])->default('pending');
            $table->enum('priority', ['high', 'medium', 'normal', 'low'])->default('normal');
            
            // هشدار فیس (برای فرانت)
            $table->timestamp('last_fee_alert_at')->nullable()->comment('آخرین زمان هشدار فیس');
            $table->integer('fee_alert_count')->default(0)->comment('تعداد هشدارهای فیس');
            
            // زمان تکمیل
            $table->datetime('completed_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ایندکس‌ها
            $table->index(['status', 'doctor_id']);
            $table->index(['priority', 'status']);
            $table->index('admission_date');
            $table->index('reg_id');
            $table->index('ward_id');
            $table->index('last_fee_alert_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_requests');
    }
};