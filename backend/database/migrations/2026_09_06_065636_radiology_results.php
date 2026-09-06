<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('radiology_results', function (Blueprint $table) {
            $table->id();
            
            // ===== ارتباطات =====
            $table->unsignedBigInteger('radiology_request_id'); // ✅ کلید خارجی به درخواست
            $table->unsignedBigInteger('reg_id'); // ✅ استفاده از reg_id
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id')->nullable();
            
            // ===== فیلدهای نتیجه =====
            $table->text('result')->nullable();
            $table->text('findings')->nullable();
            $table->text('interpretation')->nullable();
            $table->text('remarks')->nullable();
            $table->string('normal_range')->nullable();
            
            $table->enum('result_status', ['Draft', 'Completed', 'Verified', 'Cancelled'])->nullable();
            
            $table->string('pdf_file')->nullable();
            $table->string('pdf_file_name')->nullable();
            $table->string('pdf_url')->nullable();
            $table->string('report_no')->unique()->nullable();
            
            $table->timestamp('analysis_completed_at')->nullable();
            
            // ===== فیلدهای مدیریتی =====
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // ===== ایندکس‌ها =====
            $table->index('radiology_request_id');
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('report_no');
            $table->index('result_status');
            
            // ===== کلیدهای خارجی =====
            $table->foreign('radiology_request_id')
                  ->references('id')
                  ->on('radiology_requests')
                  ->onDelete('cascade');
                  
            $table->foreign('reg_id')
                  ->references('reg_id')
                  ->on('registrations')
                  ->onDelete('cascade');
                  
            $table->foreign('patient_id')
                  ->references('id')
                  ->on('patients')
                  ->onDelete('cascade');
                  
            $table->foreign('doctor_id')
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
        Schema::dropIfExists('radiology_results');
    }
};