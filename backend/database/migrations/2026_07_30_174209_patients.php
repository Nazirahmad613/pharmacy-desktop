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
        Schema::create('patients', function (Blueprint $table) {

            $table->id();

            // شناسه دائمی بیمار
            $table->uuid('uuid')->unique();
            $table->string('patient_code', 30)->unique();

            // مشخصات فردی
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('father_name')->nullable();
            $table->string('grandfather_name')->nullable();

            // اطلاعات شخصی
            $table->enum('gender', ['Male', 'Female']);
            $table->date('date_of_birth')->nullable();
            $table->unsignedSmallInteger('age')->nullable();

            $table->enum('blood_group', [
                'A+',
                'A-',
                'B+',
                'B-',
                'AB+',
                'AB-',
                'O+',
                'O-'
            ])->nullable();

            $table->enum('marital_status', [
                'Single',
                'Married',
                'Divorced',
                'Widowed'
            ])->nullable();

            // هویت
            $table->string('nationality')->default('Afghanistan');
            $table->string('national_id')->nullable()->index();
            $table->string('passport_no')->nullable();

            // تماس
            $table->string('mobile', 30)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();

            // آدرس
            $table->string('country')->default('Afghanistan');
            $table->string('province')->nullable();
            $table->string('district')->nullable();
            $table->string('village')->nullable();
            $table->text('address')->nullable();

            // اطلاعات اجتماعی
            $table->string('occupation')->nullable();
            $table->string('education')->nullable();

            // تماس اضطراری
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone', 30)->nullable();
            $table->string('emergency_contact_relation')->nullable();

            // اطلاعات طبی
            $table->text('allergies')->nullable();
            $table->text('chronic_diseases')->nullable();
            $table->text('disability')->nullable();
            $table->text('remarks')->nullable();

            // عکس
            $table->string('photo')->nullable();

            // وضعیت
            $table->enum('status', [
                'Active',
                'Inactive',
                'Deceased'
            ])->default('Active');

            // کاربران ثبت کننده
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // ایندکس ها
            $table->index('first_name');
            $table->index('father_name');
            $table->index(['first_name', 'father_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};