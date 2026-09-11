<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id('pres_id');

            /*
            |--------------------------------------------------------------------------
            | روابط اصلی
            |--------------------------------------------------------------------------
            | patient_id : شناسه اصلی مریض (از جدول patients) — هویتی، یک بار ثبت
            | reg_id     : شناسه مراجعه فعلی (از جدول registrations) — هر مراجعه جدید
            | doc_id     : شناسه داکتر = users.id (کاربر لاگین‌شده با رول doctor)
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('patient_id')
                ->comment('شناسه اصلی مریض — از جدول patients');

            $table->unsignedBigInteger('reg_id')
                ->comment('شناسه مراجعه فعلی — از جدول registrations');

            $table->unsignedBigInteger('doc_id')
                ->comment('شناسه داکتر = users.id (کاربر لاگین‌شده)');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات هویتی مریض (snapshot در زمان تجویز)
            |--------------------------------------------------------------------------
            */
            $table->string('patient_name')->nullable();
            $table->string('tazkira_number')->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender')->nullable();
            $table->string('patient_phone')->nullable();
            $table->string('patient_blood_group')->nullable();
            $table->string('doc_name')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات بالینی (خاص همین نسخه)
            |--------------------------------------------------------------------------
            */
            $table->text('diagnosis')->nullable()->comment('تشخیص برای این نسخه');
            $table->decimal('weight', 5, 2)->nullable()->comment('وزن (kg)');
            $table->string('blood_pressure', 20)->nullable()->comment('فشار خون');
            $table->decimal('temperature', 4, 1)->nullable()->comment('دما (°C)');
            $table->tinyInteger('oxygen')->nullable()->comment('اکسیژن خون (%)');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات نسخه
            |--------------------------------------------------------------------------
            | pres_num بعد از insert توسط Controller = pres_id قرار می‌گیرد
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('pres_num')->nullable()->unique()
                ->comment('شماره نسخه = pres_id (بعد از insert پر می‌شود)');

            $table->date('pres_date')->comment('تاریخ نسخه (از فرانت)');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('patient_id')
                ->references('patient_id')
                ->on('patients')
                ->restrictOnDelete();

            $table->foreign('reg_id')
                ->references('reg_id')
                ->on('registrations')
                ->restrictOnDelete();

            $table->foreign('doc_id')
                ->references('id')
                ->on('users')
                ->restrictOnDelete();

            /*
            |--------------------------------------------------------------------------
            | ایندکس‌ها
            |--------------------------------------------------------------------------
            */
            $table->index('patient_id');
            $table->index('reg_id');
            $table->index('doc_id');
            $table->index('pres_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};