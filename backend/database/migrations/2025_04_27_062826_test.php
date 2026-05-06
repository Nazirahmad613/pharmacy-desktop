<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salestest', function (Blueprint $table) {
            $table->id();
            $table->date('sale_date');
            $table->string('customer_name')->nullable();
            $table->decimal('total_amount', 12, 2);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            // اگر خواستی می توانی foreign key برای created_by هم اضافه کنی
            // $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->unsignedBigInteger('product_id');
            $table->integer('quantity');
            $table->decimal('price', 12, 2);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();

            // تعریف ارتباط ها
            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('salestest');
    }
};
