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
            
            // Foreign keys
            $table->foreignId('registration_id')->constrained('registrations')->onDelete('cascade');
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('laboratory_request_id')->nullable()->constrained('laboratory_requests')->onDelete('set null');
            
            // Amounts
            $table->decimal('amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('discount', 5, 2)->default(0);
            $table->decimal('remaining_amount', 12, 2)->virtualAs('amount - paid_amount - (amount * discount / 100)');
            
            // Payment
            $table->enum('payment_method', ['cash', 'card', 'online', 'insurance'])->default('cash');
            $table->enum('payment_status', ['pending', 'partial', 'paid', 'refunded', 'cancelled'])->default('pending');
            
            // Description
            $table->text('description')->nullable();
            $table->text('note')->nullable();
            
            // Barcode
            $table->string('barcode')->unique()->nullable();
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['registration_id', 'payment_status']);
            $table->index(['patient_id', 'payment_status']);
            $table->index('barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_fees');
    }
};