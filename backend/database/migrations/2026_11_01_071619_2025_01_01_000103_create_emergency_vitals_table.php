<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('emergency_vitals', function (Blueprint $table) {
            $table->id('vital_id');

            $table->unsignedBigInteger('emergency_id')
                ->comment('پرونده اضطراری — الزامی');

            $table->unsignedBigInteger('recorded_by')->nullable()
                ->comment('ثبت‌کننده — users.id');

            $table->dateTime('recorded_at')
                ->comment('زمان ثبت — می‌تواند مکرر باشد');

            /* ===== علائم حیاتی (ثبت مکرر در جریان مراقبت) ===== */
            $table->decimal('temperature', 4, 1)->nullable();
            $table->smallInteger('heart_rate')->unsigned()->nullable();
            $table->string('blood_pressure', 20)->nullable();
            $table->tinyInteger('respiratory_rate')->unsigned()->nullable();
            $table->tinyInteger('oxygen_saturation')->unsigned()->nullable();
            $table->decimal('blood_sugar', 5, 2)->nullable();
            $table->tinyInteger('pain_scale')->unsigned()->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            /* ===== Foreign Keys ===== */
            $table->foreign('emergency_id')
                ->references('emergency_id')->on('emergency_cases')
                ->restrictOnDelete()   // ✅ حفظ سوابق
                ->cascadeOnUpdate();

            $table->foreign('recorded_by')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            /* ===== Indexes ===== */
            $table->index('emergency_id');
            $table->index('recorded_at');
            $table->index(['emergency_id', 'recorded_at'], 'idx_emergency_vital_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_vitals');
    }
};