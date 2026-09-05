<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('radiology_requests', function (Blueprint $table) {
            $table->id();
            
            // کلیدهای خارجی
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('patient_id')->nullable();
            $table->unsignedBigInteger('doctor_id')->nullable();
            
            // اطلاعات اصلی
            $table->string('radiology_type');
            $table->string('body_part');
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->enum('priority', ['normal', 'urgent', 'emergency'])->default('normal');
            
            // تاریخ‌ها
            $table->date('request_date')->nullable();
            $table->timestamp('scheduled_date')->nullable();
            $table->timestamp('performed_date')->nullable();
            
            // اطلاعات اضافی
            $table->text('clinical_indication')->nullable();
            $table->text('special_notes')->nullable();
            
            // بارکد و شماره
            $table->string('barcode')->nullable()->unique();
            $table->string('request_number')->nullable()->unique();
            
            // وضعیت
            $table->enum('status', [
                'pending', 
                'scheduled', 
                'in_progress', 
                'completed', 
                'cancelled', 
                'rejected', 
                'sent_to_radiology'
            ])->default('pending');
            
            // ✅ ستون has_fee (اضافه شد)
            $table->boolean('has_fee')->default(false);
            
            // نتیجه
            $table->boolean('has_result')->default(false);
            $table->text('report_summary')->nullable();
            
            // افراد
            $table->unsignedBigInteger('technician_id')->nullable();
            $table->unsignedBigInteger('radiologist_id')->nullable();
            
            // Soft Delete
            $table->softDeletes();
            $table->timestamps();
            
            // ایندکس‌ها
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('status');
            $table->index('barcode');
            $table->index('request_number');
            
            // کلیدهای خارجی
            $table->foreign('reg_id')
                  ->references('reg_id')
                  ->on('registrations')
                  ->onDelete('cascade');
                  
            $table->foreign('patient_id')
                  ->references('id')
                  ->on('patients')
                  ->onDelete('set null');
                  
            $table->foreign('doctor_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
                  
            $table->foreign('technician_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
                  
            $table->foreign('radiologist_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('radiology_requests');
    }
};