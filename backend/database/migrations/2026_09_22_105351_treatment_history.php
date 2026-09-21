<?php
// database/migrations/2026_02_01_000002_create_treatment_history_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('treatment_history_items')) {
            return;
        }

        Schema::create('treatment_history_items', function (Blueprint $table) {
            $table->id();

            // ============ ارتباط با History اصلی ============
            $table->unsignedBigInteger('history_id')
                ->comment('FK → treatment_history.history_id');

            // ============ اطلاعات مرحله ============
            $table->string('step_key', 50)
                ->comment('examination | laboratory | radiology | operation | pres_insert | followup | admission');

            $table->string('step_label', 100)->nullable()
                ->comment('نام فارسی مرحله');

            $table->string('action_type', 50)->default('create')
                ->comment('create | update | delete | complete');

            $table->integer('step_order')->default(0)
                ->comment('ترتیب مرحله در مسیر');

            // ============ ارتباط با رکورد اصلی مرحله ============
            $table->unsignedBigInteger('ref_id')->nullable()
                ->comment('ID رکورد اصلی (مثلاً laboratory_requests.id یا admissions.id)');

            $table->string('ref_table', 100)->nullable()
                ->comment('نام جدول اصلی (laboratory_requests، admission_requests، ...)');

            // ============ Snapshot کامل داده‌ها ============
            $table->json('data')->nullable()
                ->comment('داده کامل رکورد به صورت JSON — snapshot کامل');

            // ============ خلاصه برای نمایش در جدول ============
            $table->string('summary', 500)->nullable()
                ->comment('خلاصه یک خطی برای نمایش در جدول');

            // ============ اطلاعات مالی مرتبط ============
            $table->decimal('amount', 12, 2)->nullable()
                ->comment('مبلغ مرتبط با این مرحله');

            $table->decimal('paid_amount', 12, 2)->nullable();

            $table->string('payment_status', 30)->nullable()
                ->comment('pending | partial | paid | cancelled');

            // ============ وضعیت مرحله ============
            $table->string('status', 50)->nullable()
                ->comment('pending | in_progress | completed | cancelled | rejected');

            $table->string('status_label', 100)->nullable()
                ->comment('برچسب فارسی وضعیت');

            // ============ فایل‌ها / اسناد ============
            $table->string('pdf_file')->nullable()
                ->comment('مسیر PDF نتیجه (اگر وجود دارد)');

            $table->string('barcode', 100)->nullable()
                ->comment('بارکد این مرحله');

            // ============ زمان ============
            $table->timestamp('step_at')->nullable()
                ->comment('زمان دقیق انجام این مرحله');

            $table->unsignedBigInteger('performed_by')->nullable()
                ->comment('کاربر انجام‌دهنده (داکتر، لابراتوار، ...)');

            $table->string('performed_by_name')->nullable()
                ->comment('نام انجام‌دهنده — snapshot');

            // ============ متادیتا ============
            $table->timestamps();
            $table->softDeletes();

            // ============ ایندکس‌ها ============
            $table->index('history_id');
            $table->index('step_key');
            $table->index('ref_id');
            $table->index('ref_table');
            $table->index('status');
            $table->index('step_at');
            $table->index(['history_id', 'step_key']);
            $table->index(['step_key', 'step_at']);

            // ============ کلید خارجی ============
            $table->foreign('history_id')
                ->references('history_id')
                ->on('treatment_history')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_history_items');
    }
};