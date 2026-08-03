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
        Schema::create('laboratory_results', function (Blueprint $table) {

            $table->id();

            // ارتباطات
            $table->unsignedBigInteger('laboratory_test_id');
            $table->unsignedBigInteger('registration_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id')->nullable();      // داکتر درخواست‌کننده
            $table->unsignedBigInteger('technician_id')->nullable();  // کارمند لابراتوار
            $table->unsignedBigInteger('verified_by')->nullable();    // مسئول تایید نتیجه

            // اطلاعات نتیجه
            $table->string('report_no')->unique();
            $table->enum('result_status', [
                'Draft',
                'Completed',
                'Verified',
                'Delivered',
                'Cancelled',
            ])->default('Draft');

            // تاریخ‌ها
            $table->dateTime('sample_received_at')->nullable();
            $table->dateTime('analysis_started_at')->nullable();
            $table->dateTime('analysis_completed_at')->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->dateTime('delivered_at')->nullable();

            // خلاصه نتیجه
            $table->text('summary')->nullable();
            $table->longText('interpretation')->nullable();
            $table->longText('remarks')->nullable();
            $table->longText('recommendation')->nullable();

            // فایل گزارش
            $table->string('pdf_file')->nullable();
            $table->string('attachment')->nullable();

            // چاپ
            $table->boolean('is_printed')->default(false);
            $table->integer('print_count')->default(0);
            $table->timestamp('last_printed_at')->nullable();

            // تحویل
            $table->boolean('is_delivered')->default(false);
            $table->string('delivery_method')->nullable(); // Print, PDF, Email, WhatsApp
            $table->string('delivered_to')->nullable();

            // وضعیت
            $table->boolean('is_abnormal')->default(false);
            $table->boolean('is_critical')->default(false);

            $table->timestamps();
            $table->softDeletes();

            // Foreign Keys
            $table->foreign('laboratory_test_id')
                ->references('id')
                ->on('laboratory_tests')
                ->cascadeOnDelete();

            $table->foreign('registration_id')
                ->references('reg_id')
                ->on('registrations')
                ->cascadeOnDelete();

            $table->foreign('patient_id')
                ->references('id')
                ->on('patients')
                ->cascadeOnDelete();

            $table->foreign('doctor_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('technician_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('verified_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            // Indexes
            $table->index('laboratory_test_id');
            $table->index('registration_id');
            $table->index('patient_id');
            $table->index('report_no');
            $table->index('result_status');
            $table->index('analysis_completed_at');
            $table->index('verified_at');
            $table->index('is_abnormal');
            $table->index('is_critical');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laboratory_results');
    }
};