<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | کلید اصلی
            |--------------------------------------------------------------------------
            */
            $table->id('reg_id');

            /*
            |--------------------------------------------------------------------------
            | نوع ثبت‌نام
            |--------------------------------------------------------------------------
            | فعلاً 'patient' — در کنترلر hardcode شده
            */
            $table->string('reg_type', 20)
                ->default('patient')
                ->comment('نوع ثبت‌نام: patient');

            /*
            |--------------------------------------------------------------------------
            | روابط اصلی
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('patient_id')
                ->comment('مریض — FK به patients.id');

            $table->unsignedBigInteger('department_id')->nullable()
                ->comment('بخش — FK به departments.id');

            $table->unsignedBigInteger('doctor_id')->nullable()
                ->comment('داکتر — FK به users.id');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات مراجعه
            |--------------------------------------------------------------------------
            | visit_number در کنترلر با max('visit_number') + 1 ساخته می‌شود
            */
            $table->string('visit_number', 30)->nullable()
                ->comment('شماره مراجعه (تولید خودکار)');

            $table->string('visit_type', 20)->nullable()
                ->comment('OPD, IPD, Emergency, Laboratory, Radiology, Pharmacy');

            $table->dateTime('sent_to_doctor_at')->nullable()
                ->comment('زمان ارسال به داکتر');

            $table->dateTime('doctor_started_at')->nullable()
                ->comment('زمان شروع معاینه (رزرو برای آینده)');

            /*
            |--------------------------------------------------------------------------
            | صف (Queue)
            |--------------------------------------------------------------------------
            | queue_number و queue_date فقط هنگام ارسال به داکتر set می‌شوند
            | queue_status nullable است — تا ارسال به داکتر null می‌ماند
            | (این اصلاح باگ default 'Waiting' است)
            */
            $table->integer('queue_number')->nullable()
                ->comment('شماره در صف (فقط بعد از ارسال به داکتر)');

            $table->date('queue_date')->nullable()
                ->comment('تاریخ صف');

            $table->string('queue_status', 20)->nullable()
                ->comment('Waiting, Called, Expired, Removed — فقط اگر صف ساخته شده باشد');

            $table->dateTime('queue_expired_at')->nullable()
                ->comment('زمان انقضای نوبت در صف');

            /*
            |--------------------------------------------------------------------------
            | مالی
            |--------------------------------------------------------------------------
            */
            $table->decimal('registration_fee', 12, 2)
                ->default(0)
                ->comment('فیس ثبت‌نام');

            /*
            |--------------------------------------------------------------------------
            | وضعیت مراجعه
            |--------------------------------------------------------------------------
            */
            $table->string('visit_status', 20)
                ->default('Waiting')
                ->comment('Waiting, Doctor, Examining, Laboratory, Radiology, Admission, Ward, Operation, Pharmacy, Billing, Completed, Cancelled, Discharged');

            $table->date('visit_date')->nullable()
                ->comment('تاریخ مراجعه');

            $table->text('note')->nullable()
                ->comment('یادداشت');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات بالینی اولیه
            |--------------------------------------------------------------------------
            */
            $table->text('diagnosis')->nullable()
                ->comment('تشخیص اولیه');

            $table->decimal('weight', 5, 2)->nullable()
                ->comment('وزن (kg)');

            $table->string('blood_pressure', 20)->nullable()
                ->comment('فشار خون');

            $table->decimal('temperature', 4, 1)->nullable()
                ->comment('دما (°C)');

            $table->tinyInteger('oxygen')->unsigned()->nullable()
                ->comment('اکسیژن خون (%)');

            /*
            |--------------------------------------------------------------------------
            | وضعیت رکورد
            |--------------------------------------------------------------------------
            | در کنترلر و فرانت فعلی استفاده نمی‌شود
            | ولی برای آینده (soft-disable) نگه داشته می‌شود
            */
            $table->integer('status')
                ->default(1)
                ->comment('1=فعال، 0=غیرفعال');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('patient_id')
                ->references('id')->on('patients')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('department_id')
                ->references('id')->on('departments')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('doctor_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('patient_id');
            $table->index('department_id');
            $table->index('doctor_id');
            $table->index('queue_date');
            $table->index('visit_date');
            $table->index('visit_status');
            $table->index('queue_status');
            $table->index('status');
            $table->index('visit_number');
            $table->index(['doctor_id', 'queue_date', 'queue_number'], 'idx_doctor_queue');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};