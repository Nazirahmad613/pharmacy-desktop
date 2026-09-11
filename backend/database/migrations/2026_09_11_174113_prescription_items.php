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

            /*
            |--------------------------------------------------------------------------
            | روابط اصلی
            |--------------------------------------------------------------------------
            | pres_id     : FK → prescriptions
            | category_id : FK → categories (nullable)
            | med_id      : FK → medications (nullable برای داروی دستی)
            | supplier_id : FK → registrations (nullable برای داروی دستی)
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('pres_id');
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('med_id')->nullable();
            $table->unsignedBigInteger('supplier_id')->nullable();

            /*
            |--------------------------------------------------------------------------
            | اطلاعات دارو
            |--------------------------------------------------------------------------
            | is_custom = true  →  med_id و supplier_id برابر null
            |                       med_name و supplier_name پر می‌شوند (تایپ‌شده)
            |
            | is_custom = false →  med_id و supplier_id پر هستند
            |                       med_name و supplier_name برابر null
            |--------------------------------------------------------------------------
            */
            $table->boolean('is_custom')->default(false)
                ->comment('true = داروی دستی خارج از سیستم');

            $table->string('med_name')->nullable()
                ->comment('نام دارو — برای داروی دستی');

            $table->string('supplier_name')->nullable()
                ->comment('نام حمایت‌کننده — برای داروی دستی');

            $table->string('type')->nullable()
                ->comment('نوع دارو (قرص، شربت، آمپول)');

            $table->string('dosage')
                ->comment('مقدار مصرف (مثلاً 1×3)');

            $table->integer('quantity')
                ->comment('تعداد');

            $table->text('remarks')->nullable();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('pres_id')
                ->references('pres_id')
                ->on('prescriptions')
                ->cascadeOnDelete();

            $table->foreign('category_id')
                ->references('category_id')
                ->on('categories')
                ->nullOnDelete();

            $table->foreign('med_id')
                ->references('med_id')
                ->on('medications')
                ->nullOnDelete();

            $table->foreign('supplier_id')
                ->references('reg_id')
                ->on('registrations')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('pres_id');
            $table->index('category_id');
            $table->index('med_id');
            $table->index('supplier_id');
            $table->index('is_custom');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};