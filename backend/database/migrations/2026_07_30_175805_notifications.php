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
        Schema::create('notifications', function (Blueprint $table) {

            $table->id();

            // دریافت کننده اعلان
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // فرستنده (اختیاری)
            $table->foreignId('sender_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // عنوان
            $table->string('title');

            // متن اعلان
            $table->text('message');

            // نوع اعلان
            $table->string('type')->index();
            /*
                patient
                registration
                appointment
                prescription
                laboratory
                radiology
                pharmacy
                billing
                admission
                discharge
                inventory
                system
                message
            */

            // رکورد مرتبط
            $table->string('reference_type')->nullable();

            $table->unsignedBigInteger('reference_id')->nullable();

            // اولویت
            $table->enum('priority', [
                'Low',
                'Normal',
                'High',
                'Urgent'
            ])->default('Normal');

            // وضعیت خواندن
            $table->boolean('is_read')->default(false);

            $table->timestamp('read_at')->nullable();

            // لینک برای باز شدن صفحه
            $table->string('action_url')->nullable();

            // اطلاعات اضافی
            $table->json('data')->nullable();

            // انقضا
            $table->timestamp('expires_at')->nullable();

            // وضعیت
            $table->enum('status', [
                'Active',
                'Archived'
            ])->default('Active');

            // Audit
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

            // Indexes
            $table->index(['user_id', 'is_read']);
            $table->index(['priority']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};