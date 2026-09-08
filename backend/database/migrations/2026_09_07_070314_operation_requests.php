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
            
            // ارتباط با رجیستریشن (مشابه عملیات)
            $table->foreignId('reg_id')
                ->constrained('registrations', 'reg_id')
                ->onDelete('cascade');
            
            // ارتباط با بیمار و دکتر (مشابه عملیات)
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            
            // بخش و تخت (ویژه بستری)
            $table->foreignId('ward_id')->constrained('wards')->onDelete('cascade');
            $table->foreignId('bed_id')->constrained('beds')->onDelete('cascade');
            
            // تاریخ‌های بستری
            $table->date('admission_date');
            $table->date('expected_discharge_date')->nullable();
            $table->datetime('discharged_at')->nullable();
            $table->datetime('cancelled_at')->nullable();
            
            // تشخیص (از رجیستریشن گرفته می‌شود، اینجا فقط برای نمایش است)
            $table->string('diagnosis')->nullable()->comment('تشخیص اولیه از رجیستریشن');
            
            // دستورالعمل‌های بستری (ویژه بستری)
            $table->text('admission_instructions')->nullable()->comment('دستورالعمل‌های داکتر برای بستری');
            $table->text('special_notes')->nullable()->comment('یادداشت‌های ویژه');
            
            // وضعیت‌ها (مشابه عملیات)
            $table->enum('status', ['pending', 'admitted', 'discharged', 'cancelled'])->default('pending');
            $table->enum('priority', ['high', 'medium', 'normal', 'low'])->default('normal');
            
            // فیلدهای فیس (مشابه عملیات)
            $table->foreignId('fee_id')->nullable()->constrained('admission_fees')->nullOnDelete();
            $table->decimal('fee_amount', 12, 2)->nullable();
            $table->decimal('fee_paid', 12, 2)->nullable();
            $table->enum('fee_status', ['pending', 'partial', 'paid', 'refunded', 'cancelled'])->nullable();
            
            // زمان‌های تکمیل و لغو (مشابه عملیات)
            $table->datetime('completed_at')->nullable();
            $table->datetime('cancelled_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ایندکس‌ها (مشابه عملیات)
            $table->index(['status', 'doctor_id']);
            $table->index(['priority', 'status']);
            $table->index('admission_date');
            $table->index('fee_status');
            $table->index('reg_id');
            $table->index('ward_id');
            $table->index('bed_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_requests');
    }
};