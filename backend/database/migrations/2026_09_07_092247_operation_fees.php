<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('operation_fees', function (Blueprint $table) {

            $table->id();

            // ارتباط با درخواست عملیات
            $table->foreignId('operation_request_id')
                ->constrained('operation_requests')
                ->onDelete('cascade');

            // ارتباط با مراجعه
            // registrations.reg_id کلید اصلی است
            $table->foreignId('reg_id')
                ->constrained('registrations', 'reg_id')
                ->onDelete('cascade');

            // ارتباط با بیمار
            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');

            // داکتر
            $table->foreignId('doctor_id')
                ->constrained('users')
                ->onDelete('cascade');

            // مبالغ
            $table->decimal('total_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('remaining_amount', 12, 2)->default(0);

            // روش پرداخت
            $table->enum('payment_method', [
                'cash',
                'card',
                'online',
                'insurance'
            ])->default('cash');

            // وضعیت پرداخت
            $table->enum('payment_status', [
                'pending',
                'partial',
                'paid',
                'refunded',
                'cancelled'
            ])->default('pending');

            $table->datetime('payment_date')->nullable();

            $table->string('transaction_id')->nullable();

            $table->text('description')->nullable();

            $table->text('note')->nullable();

            // شخص جمع‌کننده فیس
            $table->foreignId('collected_by')
                ->constrained('users')
                ->onDelete('cascade');

            $table->timestamps();

            // Index ها
            $table->index(['payment_status', 'doctor_id']);
            $table->index(['payment_method', 'payment_status']);
            $table->index('payment_date');
            $table->index('transaction_id');
            $table->index('created_at');
            $table->index('reg_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('operation_fees');
    }
};