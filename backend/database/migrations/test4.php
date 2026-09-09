<?php
// database/migrations/2026_01_01_000001_create_admission_fees_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_fees', function (Blueprint $table) {
            $table->id();
            
            // ============ ارتباطات اصلی ============
            $table->foreignId('admission_request_id')
                ->constrained('admission_requests')
                ->onDelete('cascade');
            
            $table->unsignedBigInteger('reg_id');
            $table->foreign('reg_id')
                ->references('reg_id')
                ->on('registrations')
                ->onDelete('cascade');
            
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');
            
            // ============ اطلاعات فیس ============
            $table->date('fee_date');
            $table->time('fee_time');
            $table->decimal('amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('remaining_amount', 12, 2)->default(0);
            
            // ============ نوع و دوره ============
            $table->enum('fee_type', ['daily', 'weekly', 'monthly', 'custom'])->default('daily');
            $table->enum('period', ['morning', 'evening', 'night', 'full_day'])->default('full_day');
            $table->integer('day_number')->nullable()->comment('شماره روز بستری');
            
            // ============ توضیحات ============
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            
            // ============ شماره رسید ============
            $table->string('receipt_number')->unique();
            
            // ============ روش پرداخت ============
            $table->enum('payment_method', ['cash', 'card', 'bank_transfer', 'insurance', 'online'])->default('cash');
            
            // ============ وضعیت ============
            $table->enum('status', ['pending', 'paid', 'cancelled', 'refunded'])->default('pending');
            
            // ============ دریافت کننده ============
            $table->foreignId('collected_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('collected_at')->nullable();
            
            // ============ اطلاعات پرینت ============
            $table->integer('print_count')->default(0);
            $table->timestamp('last_printed_at')->nullable();
            
            // ============ تایم‌استمپ‌ها ============
            $table->timestamps();
            $table->softDeletes();
            
            // ============ ایندکس‌ها ============
            $table->index('admission_request_id');
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('fee_date');
            $table->index('status');
            $table->index('receipt_number');
            $table->index('payment_method');
            $table->index(['status', 'fee_date']);
            $table->index(['patient_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_fees');
    }
};