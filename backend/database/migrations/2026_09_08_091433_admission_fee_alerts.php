<?php
// database/migrations/2026_01_01_000004_create_admission_fee_alerts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_fee_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admission_request_id')->constrained('admission_requests')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            
            $table->date('alert_date');
            $table->time('alert_time');
            $table->enum('alert_type', ['daily', 'weekly', 'custom'])->default('daily');
            $table->text('message')->nullable();
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['alert_date', 'is_sent']);
            $table->index(['admission_request_id', 'is_resolved']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_fee_alerts');
    }
};