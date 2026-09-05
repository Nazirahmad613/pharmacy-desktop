<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('radiology_fees', function (Blueprint $table) {
            $table->id();
            
            // کلیدهای خارجی
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('patient_id')->nullable();
            $table->unsignedBigInteger('doctor_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            
            // ارتباط با درخواست رادیولوژی
            $table->unsignedBigInteger('radiology_request_id');
            
            // اطلاعات فیس
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->string('payment_method')->default('cash');
            $table->text('description')->nullable();
            $table->text('note')->nullable();
            
            // وضعیت پرداخت - استفاده از string به جای enum برای سازگاری با SQLite
            $table->string('payment_status')->default('pending');
            
            // بارکد و شماره رسید
            $table->string('barcode')->nullable();
            $table->string('receipt_number')->nullable();
            
            // تاریخ پرداخت
            $table->timestamp('paid_date')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ایندکس‌ها
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('radiology_request_id');
            $table->index('barcode');
            $table->index('payment_status');
            $table->index('receipt_number');
            
            // ============ کلیدهای خارجی (مشابه radiology_requests) ============
            
            // ✅ reg_id به reg_id در registrations اشاره دارد (نه به id)
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
                  
            $table->foreign('created_by')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
                  
            $table->foreign('radiology_request_id')
                  ->references('id')
                  ->on('radiology_requests')
                  ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('radiology_fees');
    }
};