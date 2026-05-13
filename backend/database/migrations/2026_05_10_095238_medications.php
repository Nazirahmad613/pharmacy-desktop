<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medications', function (Blueprint $table) {
            $table->bigIncrements('med_id');

            $table->string('gen_name');
            $table->string('dosage');

          
            $table->unsignedBigInteger('category_id');

            $table->string('type');

            $table->unsignedBigInteger('added_med')->nullable();

            $table->timestamps();

            // Indexes
            $table->index('added_med');

            
             $table->foreign('category_id')->references('category_id')->on('categories')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medications');
    }
};