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
            
            // ===== کلیدهای خارجی =====
            $table->unsignedBigInteger('reg_id'); // ✅ استفاده از reg_id
            $table->unsignedBigInteger('patient_id')->nullable();
            $table->unsignedBigInteger('doctor_id')->nullable();
            
            // ===== فیلدهای درخواست =====
            $table->string('radiology_type');
            $table->string('radiology_type_label')->nullable(); // ✅ اضافه شد
            $table->string('body_part');
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->text('clinical_indication')->nullable(); // ✅ اضافه شد
            $table->text('special_notes')->nullable(); // ✅ اضافه شد
            
            $table->enum('priority', ['normal', 'urgent', 'emergency'])->default('normal');
            $table->enum('status', [
                'pending', 
                'scheduled', 
                'in_progress', 
                'completed', 
                'cancelled', 
                'rejected', 
                'sent_to_radiology'
            ])->default('pending');
            
            // ===== تاریخ‌ها =====
            $table->date('request_date')->nullable();
            $table->date('scheduled_date')->nullable(); // ✅ تغییر به date
            $table->date('completed_date')->nullable(); // ✅ اضافه شد
            
            // ===== بارکد و شماره =====
            $table->string('barcode')->nullable()->unique();
            $table->string('request_number')->nullable()->unique();
            
            // ===== وضعیت‌ها =====
            $table->boolean('has_fee')->default(false);
            $table->boolean('has_result')->default(false);
            $table->text('report_summary')->nullable();
            
            // ===== افراد =====
            $table->unsignedBigInteger('technician_id')->nullable();
            $table->unsignedBigInteger('radiologist_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable(); // ✅ اضافه شد
            $table->unsignedBigInteger('updated_by')->nullable(); // ✅ اضافه شد
            
            // ===== Soft Delete =====
            $table->softDeletes();
            $table->timestamps();
            
            // ===== ایندکس‌ها =====
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('status');
            $table->index('barcode');
            $table->index('request_number');
            $table->index('has_fee');
            $table->index('has_result');
            
            // ===== کلیدهای خارجی =====
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
                  
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
                  
            $table->foreign('updated_by')
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