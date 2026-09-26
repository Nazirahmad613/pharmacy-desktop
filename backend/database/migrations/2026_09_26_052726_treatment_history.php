<?php
// database/migrations/2026_02_01_000001_create_treatment_history_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('treatment_history_items');
        Schema::dropIfExists('treatment_history');

        Schema::create('treatment_history', function (Blueprint $table) {
            $table->id('history_id');

            $table->unsignedBigInteger('reg_id')
                ->comment('FK → registrations.reg_id');

            $table->unsignedBigInteger('patient_id')
                ->comment('FK → patients.id');

            $table->unsignedBigInteger('doctor_id')->nullable()
                ->comment('FK → users.id');

            $table->string('visit_number', 50)->nullable();
            $table->integer('queue_number')->nullable();

            $table->string('patient_name')->nullable();
            $table->string('tazkira_number', 100)->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender', 20)->nullable();
            $table->string('patient_phone', 30)->nullable();
            $table->string('patient_blood_group', 10)->nullable();

            $table->string('doctor_name')->nullable();
            $table->string('doctor_specialty')->nullable();

            $table->string('visit_status', 50)->default('InProgress');
            $table->string('current_step', 50)->nullable();
            $table->integer('current_step_index')->default(0);
            $table->json('completed_steps')->nullable();

            $table->integer('examinations_count')->default(0);
            $table->integer('laboratory_tests_count')->default(0);
            $table->integer('radiology_requests_count')->default(0);
            $table->integer('operations_count')->default(0);
            $table->integer('prescriptions_count')->default(0);
            $table->integer('admissions_count')->default(0);
            $table->integer('followups_count')->default(0);

            $table->text('diagnosis')->nullable();
            $table->string('weight', 20)->nullable();
            $table->string('blood_pressure', 30)->nullable();
            $table->string('temperature', 20)->nullable();
            $table->string('oxygen', 20)->nullable();

            $table->decimal('registration_fee', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('total_paid', 12, 2)->default(0);
            $table->decimal('total_remaining', 12, 2)->default(0);

            $table->timestamp('sent_to_doctor_at')->nullable();
            $table->timestamp('treatment_started_at')->nullable();
            $table->timestamp('treatment_completed_at')->nullable();
            $table->timestamp('sent_to_laboratory_at')->nullable();
            $table->timestamp('sent_to_pharmacy_at')->nullable();

            $table->text('summary')->nullable();
            $table->json('activity_log')->nullable();
            $table->text('note')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_history');
    }
};