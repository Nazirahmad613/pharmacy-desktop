<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('treatment_history', function (Blueprint $table) {
            $table->id('history_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('doctor_id');
            $table->string('visit_number')->nullable();
            $table->integer('queue_number')->nullable();
            $table->string('visit_status')->default('Completed');
            $table->decimal('registration_fee', 10, 2)->default(0);
            $table->text('diagnosis')->nullable();
            $table->string('weight')->nullable();
            $table->string('blood_pressure')->nullable();
            $table->string('temperature')->nullable();
            $table->string('oxygen')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('sent_to_doctor_at')->nullable();
            $table->timestamp('treatment_started_at')->nullable();
            $table->timestamp('treatment_completed_at')->nullable();
            $table->timestamp('sent_to_laboratory_at')->nullable();
            $table->timestamps();
            
            $table->foreign('reg_id')->references('reg_id')->on('registrations')->onDelete('cascade');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('doctor_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('treatment_history');
    }
};