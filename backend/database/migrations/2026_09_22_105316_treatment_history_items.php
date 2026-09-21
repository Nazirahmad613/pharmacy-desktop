<?php
// database/migrations/2026_02_01_000001_create_treatment_history_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('treatment_history')) {
            return;
        }

        Schema::create('treatment_history', function (Blueprint $table) {
            $table->id('history_id');

            // ============ ارتباطات اصلی ============
            $table->unsignedBigInteger('reg_id')
                ->comment('FK → registrations.reg_id — هر مراجعه یک رکورد');

            $table->unsignedBigInteger('patient_id')
                ->comment('FK → patients.id');

            $table->unsignedBigInteger('doctor_id')->nullable()
                ->comment('FK → users.id — داکتر معالج');

            // ============ شماره‌های شناسایی ============
            $table->string('visit_number', 50)->nullable()
                ->comment('شماره مراجعه — از registrations.visit_number');

            $table->integer('queue_number')->nullable()
                ->comment('شماره صف');

            // ============ اطلاعات Snapshot بیمار (برای جستجوی سریع) ============
            $table->string('patient_name')->nullable()
                ->comment('نام کامل بیمار — snapshot برای جستجو');

            $table->string('tazkira_number', 100)->nullable()
                ->comment('شماره تذکره — snapshot');

            $table->integer('patient_age')->nullable()
                ->comment('سن بیمار');

            $table->string('patient_gender', 20)->nullable()
                ->comment('جنسیت');

            $table->string('patient_phone', 30)->nullable()
                ->comment('شماره تماس');

            $table->string('patient_blood_group', 10)->nullable()
                ->comment('گروپ خون');

            // ============ اطلاعات داکتر Snapshot ============
            $table->string('doctor_name')->nullable()
                ->comment('نام داکتر — snapshot برای جستجو');

            $table->string('doctor_specialty')->nullable()
                ->comment('تخصص داکتر');

            // ============ وضعیت کلی مراجعه ============
            $table->string('visit_status', 50)->default('InProgress')
                ->comment('InProgress | Completed | Cancelled');

            $table->string('current_step', 50)->nullable()
                ->comment('مرحله فعلی: examination, laboratory, radiology, ...');

            $table->integer('current_step_index')->default(0)
                ->comment('شماره مرحله فعلی');

            $table->json('completed_steps')->nullable()
                ->comment('مراحل تکمیل شده — آرایه از کلیدها');

            // ============ شمارش‌های کلیدی (برای فیلتر سریع) ============
            $table->integer('examinations_count')->default(0)
                ->comment('تعداد معاینات');

            $table->integer('laboratory_tests_count')->default(0)
                ->comment('تعداد تست‌های لابراتوار');

            $table->integer('radiology_requests_count')->default(0)
                ->comment('تعداد درخواست‌های رادیولوژی');

            $table->integer('operations_count')->default(0)
                ->comment('تعداد عملیات‌ها');

            $table->integer('prescriptions_count')->default(0)
                ->comment('تعداد نسخه‌ها');

            $table->integer('admissions_count')->default(0)
                ->comment('تعداد بستری‌ها');

            $table->integer('followups_count')->default(0)
                ->comment('تعداد ملاقات‌های بعدی');

            // ============ اطلاعات بالینی کلیدی ============
            $table->text('diagnosis')->nullable()
                ->comment('تشخیص اصلی');

            $table->string('weight', 20)->nullable()
                ->comment('وزن');

            $table->string('blood_pressure', 30)->nullable()
                ->comment('فشار خون');

            $table->string('temperature', 20)->nullable()
                ->comment('دما');

            $table->string('oxygen', 20)->nullable()
                ->comment('اکسیژن خون');

            // ============ مالی ============
            $table->decimal('registration_fee', 12, 2)->default(0)
                ->comment('فیس ثبت مراجعه');

            $table->decimal('total_amount', 12, 2)->default(0)
                ->comment('مجموع مبالغ تمام خدمات');

            $table->decimal('total_paid', 12, 2)->default(0)
                ->comment('مجموع پرداخت شده');

            $table->decimal('total_remaining', 12, 2)->default(0)
                ->comment('مجموع باقی‌مانده');

            // ============ زمان‌های کلیدی ============
            $table->timestamp('sent_to_doctor_at')->nullable()
                ->comment('زمان ارسال به داکتر');

            $table->timestamp('treatment_started_at')->nullable()
                ->comment('زمان شروع معالجه');

            $table->timestamp('treatment_completed_at')->nullable()
                ->comment('زمان ختم معالجه');

            $table->timestamp('sent_to_laboratory_at')->nullable()
                ->comment('زمان ارسال به لابراتوار');

            $table->timestamp('sent_to_pharmacy_at')->nullable()
                ->comment('زمان ارسال به دواخانه');

            // ============ خلاصه فعالیت‌ها (JSON سبک برای نمایش سریع) ============
            $table->text('summary')->nullable()
                ->comment('خلاصه متنی فعالیت‌های این مراجعه');

            $table->json('activity_log')->nullable()
                ->comment('لیست تمام فعالیت‌ها: [{step, action, time, ref_id, status}]');

            // ============ یادداشت ============
            $table->text('note')->nullable();

            // ============ متادیتا ============
            $table->unsignedBigInteger('created_by')->nullable()
                ->comment('کاربر سازنده');

            $table->unsignedBigInteger('updated_by')->nullable()
                ->comment('آخرین ویرایش‌کننده');

            $table->timestamps();
            $table->softDeletes();

            // ============ ایندکس‌های اصلی ============
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('visit_number');
            $table->index('visit_status');
            $table->index('current_step');
            $table->index('created_at');
            $table->index(['patient_id', 'created_at']);
            $table->index(['reg_id', 'visit_status']);
            $table->index(['doctor_id', 'visit_status']);
            $table->index('tazkira_number');
            $table->index('patient_name');

            // ============ کلیدهای خارجی ============
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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_history');
    }
};