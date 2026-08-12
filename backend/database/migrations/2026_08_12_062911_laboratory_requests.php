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

            /*
            |--------------------------------------------------------------------------
            | Registration
            |--------------------------------------------------------------------------
            | کلید اصلی جدول registrations برابر reg_id است.
            | بنابراین در این جدول نیز فقط reg_id استفاده می‌شود.
            */
            $table->foreignId('reg_id')
                ->nullable()
                ->constrained('registrations', 'reg_id')
                ->onDelete('cascade');


            /*
            |--------------------------------------------------------------------------
            | Patient
            |--------------------------------------------------------------------------
            */
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');


            /*
            |--------------------------------------------------------------------------
            | Doctor
            |--------------------------------------------------------------------------
            */
            $table->foreignId('doctor_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');


            /*
            |--------------------------------------------------------------------------
            | Test Information
            |--------------------------------------------------------------------------
            */
            $table->string('test_type');

            $table->string('test_name')
                ->nullable();

            $table->text('test_description')
                ->nullable();

            $table->text('clinical_indication')
                ->nullable();

            $table->text('special_notes')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Dates
            |--------------------------------------------------------------------------
            */
            $table->date('request_date');

            $table->date('sample_collection_date')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            */
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


            /*
            |--------------------------------------------------------------------------
            | Results
            |--------------------------------------------------------------------------
            */
            $table->text('results')
                ->nullable();

            $table->string('result_file_path')
                ->nullable();

            $table->date('result_date')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Barcode
            |--------------------------------------------------------------------------
            */
            $table->string('barcode')
                ->unique()
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Laboratory Fee
            |--------------------------------------------------------------------------
            */
            $table->foreignId('fee_id')
                ->nullable()
                ->constrained('laboratory_fees')
                ->onDelete('set null');


            /*
            |--------------------------------------------------------------------------
            | Laboratory Dates
            |--------------------------------------------------------------------------
            */
            $table->timestamp('sent_to_lab_at')
                ->nullable();

            $table->timestamp('result_received_at')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Timestamps
            |--------------------------------------------------------------------------
            */
            $table->timestamps();

            $table->softDeletes();


            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index(['reg_id', 'status']);

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