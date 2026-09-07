// database/migrations/2026_01_01_000001_create_admission_fees_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admission_request_id')->constrained()->onDelete('cascade');
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->date('fee_date');
            $table->time('fee_time');
            $table->decimal('amount', 10, 2);
            $table->enum('fee_type', ['daily', 'weekly', 'monthly', 'custom'])->default('daily');
            $table->text('description')->nullable();
            $table->string('receipt_number')->unique();
            $table->enum('payment_method', ['cash', 'card', 'bank_transfer', 'insurance'])->default('cash');
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->foreignId('collected_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('collected_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_fees');
    }
};