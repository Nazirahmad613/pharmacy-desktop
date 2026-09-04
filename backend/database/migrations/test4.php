<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratory_results', function (Blueprint $table) {
            $table->id();

            // ===== ارتباطات =====
            $table->unsignedBigInteger('laboratory_request_id');
            $table->unsignedBigInteger('registration_id');
            $table->unsignedBigInteger('patient_id');

            // ===== اطلاعات نتیجه =====
            $table->string('report_no')->unique();
            
            $table->enum('result_status', [
                'Draft',
                'Completed',
                'Verified',
                'Delivered',
                'Cancelled',
            ])->default('Draft');

            // ===== نتیجه اصلی (متن) =====
            $table->text('result')->nullable();              // نتیجه آزمایش
            $table->string('normal_range')->nullable();      // محدوده نرمال
            $table->longText('interpretation')->nullable();  // تفسیر نتیجه
            $table->longText('remarks')->nullable();         // یادداشت‌ها
            $table->longText('recommendation')->nullable();  // توصیه‌ها

            // ===== فایل‌ها =====
            $table->string('pdf_file')->nullable();          // مسیر فایل PDF
            $table->string('pdf_file_name')->nullable();     // نام اصلی فایل

            // ===== تاریخ‌ها =====
            $table->dateTime('sample_received_at')->nullable();
            $table->dateTime('analysis_started_at')->nullable();
            $table->dateTime('analysis_completed_at')->nullable();

            // ===== چاپ =====
            $table->boolean('is_printed')->default(false);
            $table->integer('print_count')->default(0);
            $table->timestamp('last_printed_at')->nullable();

            // ===== تحویل =====
            $table->boolean('is_delivered')->default(false);
            $table->string('delivery_method')->nullable();
            $table->string('delivered_to')->nullable();

            // ===== وضعیت =====
            $table->boolean('is_abnormal')->default(false);
            $table->boolean('is_critical')->default(false);

            $table->timestamps();
            $table->softDeletes();

            // ===== کلیدهای خارجی =====
            $table->foreign('laboratory_request_id')
                ->references('id')
                ->on('laboratory_requests')
                ->cascadeOnDelete();

            $table->foreign('registration_id')
                ->references('reg_id')
                ->on('registrations')
                ->cascadeOnDelete();

            $table->foreign('patient_id')
                ->references('id')
                ->on('patients')
                ->cascadeOnDelete();

            // ===== ایندکس‌ها =====
            $table->index('laboratory_request_id');
            $table->index('registration_id');
            $table->index('patient_id');
            $table->index('report_no');
            $table->index('result_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_results');
    }
};