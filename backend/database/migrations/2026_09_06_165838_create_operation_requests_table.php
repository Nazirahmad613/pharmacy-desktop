<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('operation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registration_id')->constrained()->onDelete('cascade');
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            
            $table->string('surgery_type');
            $table->string('surgeon');
            $table->string('anesthesiologist')->nullable();
            $table->string('room_number')->nullable();
            $table->datetime('scheduled_date')->nullable();
            $table->string('estimated_duration')->nullable();
            $table->text('notes')->nullable();
            
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->enum('priority', ['high', 'medium', 'normal', 'low'])->default('normal');
            
            $table->foreignId('fee_id')->nullable()->constrained('operation_fees')->nullOnDelete();
            $table->decimal('fee_amount', 12, 2)->nullable();
            $table->decimal('fee_paid', 12, 2)->nullable();
            $table->enum('fee_status', ['pending', 'partial', 'paid', 'refunded', 'cancelled'])->nullable();
            
            $table->datetime('completed_at')->nullable();
            $table->datetime('cancelled_at')->nullable();
            
            $table->timestamps();
            
            // ایندکس‌ها
            $table->index(['status', 'doctor_id']);
            $table->index(['priority', 'status']);
            $table->index('scheduled_date');
            $table->index('fee_status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('operation_requests');
    }
};