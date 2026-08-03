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
            
            // ارتباط با مراجعه و مریض
            $table->unsignedBigInteger('registration_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('laboratory_request_id')->nullable();
            
            // اطلاعات مالی
            $table->decimal('amount', 10, 2)->default(0);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('remaining_amount', 10, 2)->default(0);
            
            // وضعیت پرداخت
            $table->enum('payment_status', [
                'pending',      // در انتظار پرداخت
                'partial',      // پرداخت ناقص
                'paid',         // پرداخت کامل
                'refunded',     // برگشت داده شده
                'cancelled'     // لغو شده
            ])->default('pending');
            
            // اطلاعات پرداخت
            $table->string('payment_method')->nullable(); // cash, card, online, insurance
            $table->string('transaction_id')->nullable();
            $table->timestamp('payment_date')->nullable();
            
            // توضیحات
            $table->text('description')->nullable();
            $table->text('note')->nullable();
            
            // فیلدهای اضافی
            $table->json('test_items')->nullable(); // لیست تست‌ها با قیمت
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // کلیدهای خارجی
            $table->foreign('registration_id')->references('reg_id')->on('registrations')->onDelete('cascade');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            
            // ایندکس‌ها
            $table->index(['registration_id', 'payment_status']);
            $table->index(['patient_id', 'payment_status']);
            $table->index(['payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratory_fees');
    }
};