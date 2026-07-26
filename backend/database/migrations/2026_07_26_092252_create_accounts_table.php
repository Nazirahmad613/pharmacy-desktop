<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات اصلی حساب
            |--------------------------------------------------------------------------
            */

            $table->string('account_code',30)->unique();

            $table->enum('account_type',[
                'Supplier',
                'Customer',
                'Insurance',
                'Company',
                'NGO',
                'Bank',
                'Laboratory',
                'Radiology',
                'Donor',
                'Other',
            ]);

            $table->string('name');

            $table->string('contact_person')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات تماس
            |--------------------------------------------------------------------------
            */

            $table->string('phone',30)->nullable();

            $table->string('mobile',30)->nullable();

            $table->string('email')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات هویتی
            |--------------------------------------------------------------------------
            */

            $table->string('tazkira_number',30)->nullable();

            $table->string('tax_number',50)->nullable();

            /*
            |--------------------------------------------------------------------------
            | آدرس
            |--------------------------------------------------------------------------
            */

            $table->string('country')->default('Afghanistan');

            $table->string('province')->nullable();

            $table->string('district')->nullable();

            $table->text('address')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات مالی
            |--------------------------------------------------------------------------
            */

            $table->decimal('opening_balance',15,2)->default(0);

            $table->decimal('credit_limit',15,2)->default(0);

            /*
            |--------------------------------------------------------------------------
            | وضعیت
            |--------------------------------------------------------------------------
            */

            $table->boolean('status')->default(true);

            $table->text('note')->nullable();

            /*
            |--------------------------------------------------------------------------
            | ثبت کننده
            |--------------------------------------------------------------------------
            */

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */

            $table->index('account_code');
            $table->index('account_type');
            $table->index('name');
            $table->index('phone');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};