<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('emergency_treatments', function (Blueprint $table) {
            $table->id('treatment_id');

            $table->unsignedBigInteger('emergency_id')
                ->comment('پرونده اضطراری — الزامی');

            $table->unsignedBigInteger('doc_id')->nullable()
                ->comment('داکتر معالج — users.id');

            $table->unsignedBigInteger('nurse_id')->nullable()
                ->comment('پرستار — users.id');

            $table->string('treatment_type', 50)->nullable()
                ->comment('medication, procedure, surgery, observation, referral, lab, imaging, other');

            $table->string('title', 255);
            $table->text('description')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات دارو — ارتباط دقیق با medications
            |--------------------------------------------------------------------------
            | med_id → medications.med_id (ForeignKey با nullOnDelete)
            | بقیه فیلدها snapshot — حتی اگر دارو تغییر کند، سابقه حفظ می‌شود
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('med_id')->nullable()
                ->comment('داروی اصلی — medications.med_id');

            $table->string('medication_name', 255)->nullable()
                ->comment('نام دوا (snapshot)');
            $table->string('dosage', 100)->nullable();
            $table->string('frequency', 100)->nullable();
            $table->string('route', 50)->nullable()
                ->comment('خوراکی، تزریقی، موضعی، ...');

            $table->integer('quantity')->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_price', 14, 2)->default(0)
                ->comment('quantity × unit_price');

            $table->dateTime('performed_at');
            $table->boolean('is_billable')->default(true);

            $table->timestamps();

            /* ===== Foreign Keys ===== */
            $table->foreign('emergency_id')
                ->references('emergency_id')->on('emergency_cases')
                ->restrictOnDelete()   // ✅ حفظ سوابق
                ->cascadeOnUpdate();

            $table->foreign('doc_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('nurse_id')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // ✅ ارتباط با جدول داروها
            $table->foreign('med_id')
                ->references('med_id')->on('medications')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            /* ===== Indexes ===== */
            $table->index('emergency_id');
            $table->index('doc_id');
            $table->index('med_id');
            $table->index('performed_at');
            $table->index('treatment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_treatments');
    }
};