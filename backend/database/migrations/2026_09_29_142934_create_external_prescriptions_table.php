<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_prescriptions', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات بیمار (دستی - بدون ثبت‌نام)
            |--------------------------------------------------------------------------
            */
            $table->string('patient_name');
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender', 20)->nullable()
                ->comment('male | female');
            $table->string('patient_phone', 30)->nullable();
            $table->string('tazkira_number', 50)->nullable();
            $table->text('patient_address')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات داکتر (از نسخه کاغذی)
            |--------------------------------------------------------------------------
            */
            $table->string('doctor_name')->nullable();
            $table->text('diagnosis')->nullable();

            /*
            |--------------------------------------------------------------------------
            | مالی
            |--------------------------------------------------------------------------
            */
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);

            /*
            |--------------------------------------------------------------------------
            | وضعیت — برای ارتباط با بخش رسپشن (اخذ فیس)
            |--------------------------------------------------------------------------
            | pending                : ثبت شده، در انتظار پرداخت
            | sent_to_registration   : ارسال شده به رسپشن
            | paid                   : فیس اخذ شده
            | cancelled              : لغو شده
            |--------------------------------------------------------------------------
            */
            $table->string('status', 30)->default('sent_to_registration')
                ->comment('pending | sent_to_registration | paid | cancelled');

            /*
            |--------------------------------------------------------------------------
            | ارتباط با کاربران
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('created_by')->nullable()
                ->comment('شناسه کاربر دواخانه — FK → users.id');
            $table->unsignedBigInteger('paid_by')->nullable()
                ->comment('شناسه کاربر رسپشن که فیس را اخذ کرد — FK → users.id');
            $table->timestamp('paid_at')->nullable()
                ->comment('زمان اخذ فیس توسط رسپشن');

            /*
            |--------------------------------------------------------------------------
            | متفرقه
            |--------------------------------------------------------------------------
            */
            $table->text('notes')->nullable();
            $table->string('receipt_number', 50)->nullable()
                ->comment('شماره رسید تولید شده');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('paid_by')->references('id')->on('users')->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('patient_name');
            $table->index('tazkira_number');
            $table->index('patient_phone');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_prescriptions');
    }
};