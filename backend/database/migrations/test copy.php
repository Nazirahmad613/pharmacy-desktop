<?php
// database/migrations/2026_02_01_000002_create_treatment_history_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('treatment_history_items');

        Schema::create('treatment_history_items', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('history_id')
                ->comment('FK → treatment_history.history_id');

            $table->unsignedBigInteger('reg_id')->nullable()
                ->comment('FK → registrations.reg_id');

            $table->string('step_key', 50);
            $table->string('step_label', 100)->nullable();
            $table->string('step_icon', 20)->nullable();
            $table->string('action_type', 50)->default('create');
            $table->integer('step_order')->default(0);

            $table->unsignedBigInteger('ref_id')->nullable();
            $table->string('ref_table', 100)->nullable();

            $table->json('data')->nullable();

            $table->string('summary', 500)->nullable();

            $table->decimal('amount', 12, 2)->nullable();
            $table->decimal('paid_amount', 12, 2)->nullable();
            $table->string('payment_status', 30)->nullable();

            $table->string('status', 50)->nullable();
            $table->string('status_label', 100)->nullable();

            $table->string('pdf_file')->nullable();
            $table->string('barcode', 100)->nullable();

            $table->timestamp('step_at')->nullable();

            $table->unsignedBigInteger('performed_by')->nullable();
            $table->string('performed_by_name')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('history_id');
            $table->index('reg_id');
            $table->index('step_key');
            $table->index('ref_id');
            $table->index('ref_table');
            $table->index('status');
            $table->index('step_at');
            $table->index(['history_id', 'step_key']);
            $table->index(['reg_id', 'step_key']);
            $table->index(['step_key', 'step_at']);

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