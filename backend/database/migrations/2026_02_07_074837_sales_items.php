<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sales_items', function (Blueprint $table) {

            $table->id('sales_it_id');

            $table->unsignedBigInteger('sales_id');
            $table->unsignedBigInteger('med_id');
            $table->unsignedBigInteger('supplier_id');
            $table->unsignedBigInteger('category_id');

            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('total_price', 15, 2);
            $table->date('exp_date');

            $table->timestamps();

            // ================= FOREIGN KEYS =================

            $table->foreign('sales_id')
                ->references('sales_id')
                ->on('sales')
                ->onDelete('cascade');

            $table->foreign('med_id')
                ->references('med_id')
                ->on('medications')
                ->onDelete('cascade');

            $table->foreign('supplier_id')
                ->references('supplier_id')
                ->on('suppliers')
                ->onDelete('cascade');

            $table->foreign('category_id')
                ->references('category_id')
                ->on('categories')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('sales_items');
    }
};