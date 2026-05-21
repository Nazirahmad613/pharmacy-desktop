<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ابتدا بررسی کنید جدول وجود دارد یا نه
        if (!Schema::hasTable('medications')) {
            // اگر جدول وجود ندارد، آن را ایجاد کن
            Schema::create('medications', function (Blueprint $table) {
                $table->bigIncrements('med_id');

                $table->string('gen_name');
                $table->string('dosage');
              
                $table->unsignedBigInteger('category_id');

                $table->string('type');

                $table->unsignedBigInteger('added_med')->nullable();

                // ✅ ستون جدید: حداقل موجودی برای هشدار
                $table->integer('minimum_quantity')->default(10)->comment('حداقل موجودی برای نمایش هشدار');

                $table->timestamps();

                // Indexes
                $table->index('added_med');
                $table->index('minimum_quantity');
                
                $table->foreign('category_id')->references('category_id')->on('categories')->onDelete('cascade');
            });
        } else {
            // اگر جدول وجود دارد، فقط ستون را اضافه کن
            Schema::table('medications', function (Blueprint $table) {
                if (!Schema::hasColumn('medications', 'minimum_quantity')) {
                    $table->integer('minimum_quantity')->default(10)->after('type');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('medications');
    }
};