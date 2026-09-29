<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_prescription_items', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('external_pres_id')
                ->comment('FK → external_prescriptions.id');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات دارو (از گدام - بدون داروی دستی)
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('med_id')->nullable()
                ->comment('FK → medications.med_id');

            $table->unsignedBigInteger('category_id')->nullable()
                ->comment('FK → categories.category_id');

            $table->unsignedBigInteger('supplier_id')->nullable()
                ->comment('FK → accounts.id');

            $table->unsignedBigInteger('stock_id')->nullable()
                ->comment('FK → stock.stock_id — بچ FEFO');

            // Snapshot
            $table->string('medication_name');
            $table->string('medication_type')->nullable();
            $table->string('supplier_name')->nullable();
            $table->string('barcode')->nullable();
            $table->string('batch_number')->nullable();

            /*
            |--------------------------------------------------------------------------
            | مقدار و قیمت
            |--------------------------------------------------------------------------
            */
            $table->string('dosage')->comment('مقدار مصرف مثلاً 1×3');
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_price', 12, 2)->default(0);

            $table->text('remarks')->nullable();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('external_pres_id')
                ->references('id')
                ->on('external_prescriptions')
                ->cascadeOnDelete();

            $table->foreign('med_id')
                ->references('med_id')
                ->on('medications')
                ->nullOnDelete();

            $table->foreign('category_id')
                ->references('category_id')
                ->on('categories')
                ->nullOnDelete();

            $table->foreign('supplier_id')
                ->references('id')
                ->on('accounts')
                ->nullOnDelete();

            $table->foreign('stock_id')
                ->references('stock_id')
                ->on('stock')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('external_pres_id');
            $table->index('med_id');
            $table->index('stock_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_prescription_items');
    }
};