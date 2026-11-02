<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_cases', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | کلید اصلی
            |--------------------------------------------------------------------------
            */
            $table->id('emergency_id');

            /*
            |--------------------------------------------------------------------------
            | روابط اصلی
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('patient_id')
                ->comment('مریض اصلی — الزامی از patients.id');

            $table->unsignedBigInteger('reg_id')->nullable()
                ->comment('مراجعه — اختیاری از registrations.reg_id');

            $table->unsignedBigInteger('doc_id')->nullable()
                ->comment('داکتر معالج — users.id');

            $table->unsignedBigInteger('admitted_by')->nullable()
                ->comment('پذیرش‌کننده — users.id');

            /*
            |--------------------------------------------------------------------------
            | شماره پرونده اضطراری
            |--------------------------------------------------------------------------
            */
            $table->string('emergency_no', 30)->unique()
                ->comment('شماره پرونده اضطراری قابل خواندن');

            /*
            |--------------------------------------------------------------------------
            | Snapshot مریض
            |--------------------------------------------------------------------------
            */
            $table->string('patient_name')->nullable();
            $table->string('tazkira_number', 50)->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender', 10)->nullable();
            $table->string('patient_phone', 30)->nullable();
            $table->string('patient_blood_group', 10)->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 30)->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات ورود
            |--------------------------------------------------------------------------
            */
            $table->dateTime('arrival_time')
                ->comment('زمان ورود به بخش اضطراری');

            $table->string('arrival_mode', 50)->nullable()
                ->comment('ambulance, walk_in, referral, police, other');

            $table->string('chief_complaint', 500)->nullable();
            $table->text('history_of_present_illness')->nullable();
            $table->text('past_medical_history')->nullable();
            $table->text('allergies')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Triage
            |--------------------------------------------------------------------------
            */
            $table->string('triage_level', 20)->nullable()
                ->comment('critical, severe, moderate, mild, non_urgent');

            $table->tinyInteger('triage_score')->unsigned()->nullable()
                ->comment('1=critical ... 5=non_urgent — هماهنگ با triage_level');

            /*
            |--------------------------------------------------------------------------
            | وضعیت
            |--------------------------------------------------------------------------
            */
            $table->string('status', 30)->default('waiting')
                ->comment('وضعیت فعلی پرونده اضطراری');

            $table->dateTime('discharged_at')->nullable();
            $table->text('discharge_summary')->nullable();

            $table->string('discharge_type', 30)->nullable()
                ->comment('recovered, improved, referred, deceased, left_against_advice');

            $table->dateTime('admitted_at')->nullable()
                ->comment('زمان بستری شدن');

            /*
            |--------------------------------------------------------------------------
            | مالی
            |--------------------------------------------------------------------------
            */
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->boolean('is_paid')->default(false);

            $table->timestamps();
            $table->softDeletes();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */

            // ✅ FK به patients.id
            $table->foreign('patient_id')
                ->references('id')->on('patients')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // ✅ FK به registrations.reg_id
            // restrictOnDelete — از قطع ارتباط بدون اطلاع جلوگیری می‌کند
            $table->foreign('reg_id')
                ->references('reg_id')->on('registrations')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // ✅ FK به users.id برای داکتر معالج
            $table->foreign('doc_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // ✅ FK به users.id برای پذیرش‌کننده
            $table->foreign('admitted_by')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('patient_id');
            $table->index('reg_id');
            $table->index('doc_id');
            $table->index('admitted_by');
            $table->index('status');
            $table->index('triage_level');
            $table->index('triage_score');
            $table->index('arrival_time');
            $table->index(['status', 'triage_score'], 'idx_emergency_status_triage');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_cases');
    }
};