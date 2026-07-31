<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('examinations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('registration_id');
            $table->unsignedBigInteger('user_id'); // تغییر از doctor_id به user_id
            $table->unsignedBigInteger('patient_id');
            
            // علایم حیاتی
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('bmi', 5, 2)->nullable();
            $table->string('blood_pressure', 20)->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->integer('pulse')->nullable();
            $table->integer('respiratory_rate')->nullable();
            $table->integer('oxygen')->nullable();
            
            // ارزیابی بالینی
            $table->text('chief_complaint')->nullable();
            $table->text('history_of_present_illness')->nullable();
            $table->text('past_medical_history')->nullable();
            $table->text('physical_examination')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('note')->nullable();
            
            $table->timestamp('examination_date')->useCurrent();
            $table->timestamps();
            
            // ایندکس‌ها
            $table->foreign('registration_id')->references('reg_id')->on('registrations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            
            $table->index(['registration_id', 'user_id']);
            $table->index('examination_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('examinations');
    }
};