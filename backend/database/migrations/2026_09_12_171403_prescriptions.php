<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id('pres_id');

            // روابط اصلی
            $table->unsignedBigInteger('patient_id')
                ->comment('شناسه اصلی مریض — FK → patients.id');
            $table->unsignedBigInteger('reg_id')
                ->comment('شناسه مراجعه فعلی — FK → registrations.reg_id');
            $table->unsignedBigInteger('doc_id')
                ->comment('شناسه داکتر = users.id');

            // اطلاعات هویتی مریض
            $table->string('patient_name')->nullable();
            $table->string('tazkira_number')->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender')->nullable();
            $table->string('patient_phone')->nullable();
            $table->string('patient_blood_group')->nullable();
            $table->string('doc_name')->nullable();

            // اطلاعات بالینی
            $table->text('diagnosis')->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->string('blood_pressure', 20)->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->tinyInteger('oxygen')->nullable();

            // اطلاعات نسخه
            $table->unsignedBigInteger('pres_num')->nullable()->unique()
                ->comment('شماره نسخه = pres_id');
            $table->date('pres_date')->comment('تاریخ نسخه');

            /*
            |--------------------------------------------------------------------------
            | ✅ وضعیت نسخه (برای آگاهی داکتر از روند اجراآت)
            |--------------------------------------------------------------------------
            */
            $table->string('status', 30)
                ->default('pending')
                ->comment('pending | sent_to_pharmacy | pharmacy_registered | paid | cancelled');

            $table->timestamp('sent_to_pharmacy_at')->nullable()
                ->comment('زمان ارسال به دواخانه');
            $table->timestamp('pharmacy_registered_at')->nullable()
                ->comment('زمان ثبت در دواخانه');
            $table->timestamp('paid_at')->nullable()
                ->comment('زمان اخذ پول توسط رجستریشن');

            $table->unsignedBigInteger('pharmacy_id')->nullable()
                ->comment('شناسه دواخانه‌ای که نسخه را ثبت کرد — FK → users.id');

            $table->text('status_note')->nullable()
                ->comment('یادداشت وضعیت (مثلاً دلیل لغو)');

            $table->timestamps();

            // Foreign Keys
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('reg_id')->references('reg_id')->on('registrations')->restrictOnDelete();
            $table->foreign('doc_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('pharmacy_id')->references('id')->on('users')->nullOnDelete();

            // Indexes
            $table->index('patient_id');
            $table->index('reg_id');
            $table->index('doc_id');
            $table->index('pres_date');
            $table->index('status');       // ✅ برای فیلتر سریع وضعیت
            $table->index('pharmacy_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};