<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_items', function (Blueprint $table) {

            $table->bigIncrements('pres_it_id');

            $table->unsignedBigInteger('pres_id');
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('med_id');
            $table->unsignedBigInteger('supplier_id');

            $table->string('type')->nullable();
            $table->string('dosage')->nullable();

            $table->integer('quantity');

            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2);

            $table->text('remarks')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('pres_id');
            $table->index('category_id');
            $table->index('med_id');
            $table->index('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};