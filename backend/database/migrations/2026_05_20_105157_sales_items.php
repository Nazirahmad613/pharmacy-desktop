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

            // ================= کلیدهای خارجی =================
            $table->unsignedBigInteger('sales_id');
            $table->unsignedBigInteger('med_id');
            $table->unsignedBigInteger('supplier_id');
            $table->unsignedBigInteger('category_id');

            // ================= ستون type - اصلاح شده =================
            // ✅ type به صورت string (نه integer) برای ذخیره نوع دارو (قرص، کپسول، شربت، ...)
            $table->string('type')->nullable()->after('med_id');

            // ================= ستون‌های مقادیر =================
            $table->integer('quantity');
            $table->decimal('unit_sales', 15, 2);
            $table->decimal('total_sales', 15, 2);

            // ================= ستون تاریخ انقضا (اختیاری) =================
            $table->date('exp_date')->nullable();

            $table->timestamps();

            // ================= ایندکس‌ها =================
            $table->index('type');
            $table->index('med_id');
            $table->index('supplier_id');
            $table->index('category_id');
            $table->index('sales_id');

            // ================= کلیدهای خارجی =================
            $table->foreign('sales_id')
                ->references('sales_id')
                ->on('sales')
                ->onDelete('cascade');

            $table->foreign('med_id')
                ->references('med_id')
                ->on('medications')
                ->onDelete('cascade');

            $table->foreign('supplier_id')
                ->references('reg_id')
                ->on('registrations')
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