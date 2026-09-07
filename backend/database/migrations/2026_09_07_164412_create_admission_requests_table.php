// database/migrations/2026_01_01_000000_create_admission_requests_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('ward_id')->constrained()->onDelete('cascade');
            $table->foreignId('bed_id')->constrained()->onDelete('cascade');
            $table->foreignId('doctor_id')->constrained('users')->onDelete('cascade');
            $table->date('admission_date');
            $table->date('expected_discharge_date')->nullable();
            $table->string('diagnosis');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'admitted', 'discharged', 'cancelled'])->default('pending');
            $table->enum('payment_status', ['pending', 'partial', 'paid'])->default('pending');
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_requests');
    }
};