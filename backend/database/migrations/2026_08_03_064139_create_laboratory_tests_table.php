<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('laboratory_tests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('registration_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id')->nullable();
            $table->unsignedBigInteger('user_id'); // کاربری که ثبت کرده
            
            // اطلاعات درخواست
            $table->string('test_type'); // نوع تست: خون، ادرار، مدفوع، بیوشیمی، هورمونی، میکروبی، پاتولوژی، ژنتیک، تصویربرداری
            $table->string('test_name')->nullable(); // نام تست
            $table->text('test_description')->nullable(); // شرح تست
            $table->text('clinical_indication')->nullable(); // اندیکاسیون بالینی
            $table->text('special_notes')->nullable(); // نکات ویژه
            
            // تاریخ‌ها
            $table->date('request_date')->nullable();
            $table->date('sample_collection_date')->nullable();
            $table->date('test_date')->nullable();
            $table->date('result_date')->nullable();
            
            // وضعیت‌ها
            $table->enum('status', [
                'pending',      // در انتظار
                'sample_taken', // نمونه گرفته شده
                'in_progress',  // در حال انجام
                'completed',    // تکمیل شده
                'cancelled',    // لغو شده
                'rejected'      // رد شده
            ])->default('pending');
            
            // نتایج
            $table->text('result_summary')->nullable(); // خلاصه نتیجه
            $table->text('result_details')->nullable(); // جزئیات نتیجه
            $table->text('interpretation')->nullable(); // تفسیر نتیجه
            $table->text('doctor_comment')->nullable(); // نظر پزشک
            $table->string('result_file')->nullable(); // فایل نتیجه
            
            // فیلدهای اضافی برای تست‌های مختلف
            $table->json('test_parameters')->nullable(); // پارامترهای تست
            $table->json('result_values')->nullable(); // مقادیر نتیجه
            
            $table->timestamps();
            $table->softDeletes();
            
            // کلیدهای خارجی
            $table->foreign('registration_id')->references('reg_id')->on('registrations')->onDelete('cascade');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('doctor_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // ایندکس‌ها
            $table->index(['registration_id', 'status']);
            $table->index(['patient_id', 'status']);
            $table->index(['test_type', 'status']);
            $table->index(['request_date']);
            $table->index(['result_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('laboratory_tests');
    }
};