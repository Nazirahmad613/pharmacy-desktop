<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratory_requests', function (Blueprint $table) {
            $table->id();
            
            // ============ اصلاح کلیدهای خارجی ============
            // برای registration_id که به reg_id اشاره می‌کند
            $table->foreignId('registration_id')
                  ->nullable()
                  ->constrained('registrations', 'reg_id')  // ← نام ستون صحیح
                  ->onDelete('cascade');
            
            // patient_id به id در جدول patients اشاره می‌کند (صحیح است)
            $table->foreignId('patient_id')
                  ->constrained('patients')
                  ->onDelete('cascade');
            
            // doctor_id به id در جدول users اشاره می‌کند (صحیح است)
            $table->foreignId('doctor_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            
            // Test information
            $table->string('test_type');
            $table->string('test_name')->nullable();
            $table->text('test_description')->nullable();
            $table->text('clinical_indication')->nullable();
            $table->text('special_notes')->nullable();
            
            // Dates
            $table->date('request_date');
            $table->date('sample_collection_date')->nullable();
            
            // Status
            $table->enum('status', [
                'pending',
                'sample_taken',
                'in_progress',
                'completed',
                'cancelled',
                'rejected',
                'sent_to_lab',
                'waiting_for_result',
                'result_ready'
            ])->default('pending');
            
            // Results
            $table->text('results')->nullable();
            $table->string('result_file_path')->nullable();
            $table->date('result_date')->nullable();
            
            // Barcode
            $table->string('barcode')->unique()->nullable();
            
            // Fee
            $table->foreignId('fee_id')
                  ->nullable()
                  ->constrained('laboratory_fees')
                  ->onDelete('set null');
            
            $table->timestamp('sent_to_lab_at')->nullable();
            $table->timestamp('result_received_at')->nullable();
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['registration_id', 'status']);
            $table->index(['patient_id', 'status']);
            $table->index('barcode');
            $table->index('fee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_requests');
    }
};