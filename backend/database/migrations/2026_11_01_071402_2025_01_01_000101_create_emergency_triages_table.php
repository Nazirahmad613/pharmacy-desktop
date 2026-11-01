<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('emergency_triages', function (Blueprint $table) {
            $table->id('triage_id');

            $table->unsignedBigInteger('emergency_id')
                ->comment('پرونده اضطراری — الزامی');

            $table->unsignedBigInteger('nurse_id')->nullable()
                ->comment('پرستار تریاژ — users.id');

            /*
            |--------------------------------------------------------------------------
            | triage_level و triage_score — هماهنگ و بدون پیش‌فرض
            |--------------------------------------------------------------------------
            | الزاماً هنگام ثبت، Controller باید مقدار صحیح را ارسال کند:
            |   critical   → 1
            |   severe     → 2
            |   moderate   → 3
            |   mild       → 4
            |   non_urgent → 5
            |--------------------------------------------------------------------------
            */
            $table->string('triage_level', 20)
                ->comment('critical, severe, moderate, mild, non_urgent');

            $table->tinyInteger('triage_score')->unsigned()
                ->comment('1=critical ... 5=non_urgent — بدون پیش‌فرض');

            /* ===== علائم حیاتی هنگام تریاژ ===== */
            $table->decimal('temperature', 4, 1)->nullable()
                ->comment('دما °C — بین 25 تا 50');
            $table->smallInteger('heart_rate')->unsigned()->nullable()
                ->comment('ضربان قلب bpm — بین 20 تا 300');
            $table->string('blood_pressure', 20)->nullable()
                ->comment('مثال: 120/80');
            $table->tinyInteger('respiratory_rate')->unsigned()->nullable()
                ->comment('تعداد تنفس — بین 5 تا 80');
            $table->tinyInteger('oxygen_saturation')->unsigned()->nullable()
                ->comment('اکسیژن خون % — بین 0 تا 100');
            $table->decimal('blood_sugar', 5, 2)->nullable()
                ->comment('قند خون — بین 0 تا 900');
            $table->tinyInteger('pain_scale')->unsigned()->nullable()
                ->comment('مقیاس درد — بین 0 تا 10');

            /* ===== سطح هوشیاری ===== */
            $table->string('consciousness_level', 30)->nullable()
                ->comment('alert, verbal, painful, unresponsive');
            $table->tinyInteger('gcs_score')->unsigned()->nullable()
                ->comment('Glasgow Coma Scale — بین 3 تا 15');

            $table->text('notes')->nullable();
            $table->timestamps();

            /* ===== Foreign Keys ===== */
            $table->foreign('emergency_id')
                ->references('emergency_id')->on('emergency_cases')
                ->restrictOnDelete()   // ✅ حفظ سوابق
                ->cascadeOnUpdate();

            $table->foreign('nurse_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            /* ===== Indexes ===== */
            $table->index('emergency_id');
            $table->index('triage_level');
            $table->index('triage_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_triages');
    }
};