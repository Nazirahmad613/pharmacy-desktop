<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratory_fees', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Registration
            |--------------------------------------------------------------------------
            | کلید اصلی registrations = reg_id
            */
            $table->foreignId('reg_id')
                ->constrained('registrations', 'reg_id')
                ->onDelete('cascade');


            /*
            |--------------------------------------------------------------------------
            | Patient
            |--------------------------------------------------------------------------
            | کلید اصلی patients = id
            */
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');


            /*
            |--------------------------------------------------------------------------
            | Laboratory Request
            |--------------------------------------------------------------------------
            | این ID مربوط به رکورد laboratory_requests است،
            | بنابراین همان id باقی می‌ماند.
            */
            $table->foreignId('laboratory_request_id')
                ->nullable()
                ->constrained('laboratory_requests', 'id')
                ->onDelete('set null');


            /*
            |--------------------------------------------------------------------------
            | Amounts
            |--------------------------------------------------------------------------
            */
            $table->decimal('amount', 12, 2);

            $table->decimal('paid_amount', 12, 2)
                ->default(0);

            $table->decimal('discount', 5, 2)
                ->default(0);

            $table->decimal('remaining_amount', 12, 2)
                ->default(0);


            /*
            |--------------------------------------------------------------------------
            | Payment
            |--------------------------------------------------------------------------
            */
            $table->enum('payment_method', [
                'cash',
                'card',
                'online',
                'insurance'
            ])->default('cash');

            $table->enum('payment_status', [
                'pending',
                'partial',
                'paid',
                'refunded',
                'cancelled'
            ])->default('pending');


            /*
            |--------------------------------------------------------------------------
            | Description
            |--------------------------------------------------------------------------
            */
            $table->text('description')
                ->nullable();

            $table->text('note')
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
            | QR Code
            |--------------------------------------------------------------------------
            */
            $table->string('qr_code_path')
                ->nullable();

            $table->text('qr_code_data')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | Tracking
            |--------------------------------------------------------------------------
            */
            $table->timestamp('confirmed_at')
                ->nullable();

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
            $table->index([
                'reg_id',
                'payment_status'
            ]);

            $table->index([
                'patient_id',
                'payment_status'
            ]);

            $table->index('barcode');

            $table->index('laboratory_request_id');

            $table->index([
                'payment_status',
                'created_at'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_fees');
    }
};