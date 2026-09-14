<?php
// database/migrations/2025_01_15_000001_create_stock_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock', function (Blueprint $table) {
            $table->id('stock_id');

            // اطلاعات دارو
            $table->unsignedBigInteger('med_id');

            // ✅ تأمین‌کننده (از جدول accounts می‌آید)
            $table->unsignedBigInteger('supplier_id');

            // ✅ آیتم خرید (از جدول parchaseitems می‌آید)
            $table->unsignedBigInteger('purchase_item_id')->nullable();

            // ✅ نوعیت (از جدول parchaseitems گرفته می‌شود)
            $table->string('type')->nullable()->comment('نوعیت دارو یا محصول');

            // تاریخ انقضا
            $table->date('exp_date');

            // موجودی
            $table->integer('quantity')->default(0);

            // شماره بچ (اختیاری)
            $table->string('batch_number')->nullable();

            // قیمت خرید (اختیاری برای محاسبه سود)
            $table->decimal('purchase_price', 15, 2)->nullable();

            // قیمت فروش (اختیاری)
            $table->decimal('selling_price', 15, 2)->nullable();

            $table->timestamps();

            // ایندکس‌ها
            $table->index('med_id');
            $table->index('supplier_id');
            $table->index('purchase_item_id');
            $table->index('exp_date');
            $table->index('type');

            // کلیدهای خارجی
            $table->foreign('med_id')
                  ->references('med_id')
                  ->on('medications')
                  ->onDelete('cascade');

            // ✅ ارجاع به accounts.id مثل parchases و parchaseitems
            $table->foreign('supplier_id')
                  ->references('id')
                  ->on('accounts')
                  ->onDelete('cascade');

            // ✅ ارجاع به parchaseitems (اصلاح شد: parchase_it_id به جای id)
            $table->foreign('purchase_item_id')
                  ->references('parchase_it_id')
                  ->on('parchaseitems')
                  ->onDelete('cascade');

            // ترکیب یکتا (هر دارو + هر تأمین‌کننده + هر تاریخ انقضا + نوعیت = یک رکورد)
            $table->unique(['med_id', 'supplier_id', 'exp_date', 'type'], 'stock_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock');
    }
};