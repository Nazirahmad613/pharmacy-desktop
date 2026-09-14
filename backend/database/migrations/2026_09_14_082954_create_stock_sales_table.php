<?php
// database/migrations/xxxx_xx_xx_xxxxxx_create_stock_sales_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * جدول سابقه فروش مطابق شماره بچ
     * ------------------------------------------------------------
     * هر بار که یک بچ در نسخه مصرف می‌شود، یک رکورد
     * در این جدول ثبت می‌شود تا سابقه فروش کامل باشد.
     *
     * ⚠️ نکات:
     *   - جدول خرید شما: parchaseitems (با a)
     *   - کلید اصلی خرید: parchase_it_id
     *   - فیلد بچ در خرید: batch_no
     */
    public function up(): void
    {
        Schema::create('stock_sales', function (Blueprint $table) {

            $table->id('sale_id');

            /*
            |--------------------------------------------------------------------------
            | روابط اصلی
            |--------------------------------------------------------------------------
            */
            $table->unsignedBigInteger('stock_id')
                ->comment('FK → stock.stock_id');

            $table->unsignedBigInteger('pres_it_id')
                ->comment('FK → prescription_items.pres_it_id');

            $table->unsignedBigInteger('pres_id')
                ->comment('FK → prescriptions.pres_id');

            $table->unsignedBigInteger('med_id')
                ->comment('FK → medications.med_id');

            $table->unsignedBigInteger('supplier_id')->nullable()
                ->comment('FK → accounts.id');

            // ✅ جدید: اتصال به ردیف خرید (منبع شماره بچ)
            $table->unsignedBigInteger('purchase_item_id')->nullable()
                ->comment('FK → parchaseitems.parchase_it_id');

            /*
            |--------------------------------------------------------------------------
            | اطلاعات Snapshot (کپی در زمان فروش)
            |--------------------------------------------------------------------------
            */
            $table->string('barcode')->nullable()
                ->comment('بارکد دوا — Snapshot از medications');

            $table->string('batch_number')->nullable()
                ->comment('شماره بچ فروخته شده — Snapshot از parchaseitems.batch_no');

            $table->date('exp_date')->nullable()
                ->comment('تاریخ انقضای بچ');

            /*
            |--------------------------------------------------------------------------
            | مقدار فروش
            |--------------------------------------------------------------------------
            */
            $table->integer('quantity_sold')
                ->comment('تعداد فروخته شده از این بچ');

            $table->decimal('unit_price', 15, 2)->nullable()
                ->comment('قیمت واحد');

            $table->decimal('total_price', 15, 2)->nullable()
                ->comment('قیمت کل = unit_price × quantity_sold');

            /*
            |--------------------------------------------------------------------------
            | زمان فروش
            |--------------------------------------------------------------------------
            */
            $table->timestamp('sold_at')->useCurrent()
                ->comment('زمان فروش');

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Foreign Keys
            |--------------------------------------------------------------------------
            */
            $table->foreign('stock_id')
                ->references('stock_id')
                ->on('stock')
                ->cascadeOnDelete();

            $table->foreign('pres_it_id')
                ->references('pres_it_id')
                ->on('prescription_items')
                ->cascadeOnDelete();

            $table->foreign('pres_id')
                ->references('pres_id')
                ->on('prescriptions')
                ->cascadeOnDelete();

            $table->foreign('med_id')
                ->references('med_id')
                ->on('medications')
                ->cascadeOnDelete();

            $table->foreign('supplier_id')
                ->references('id')
                ->on('accounts')
                ->nullOnDelete();

            // ✅ FK به parchaseitems
            $table->foreign('purchase_item_id')
                ->references('parchase_it_id')
                ->on('parchaseitems')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */
            $table->index('stock_id');
            $table->index('pres_it_id');
            $table->index('pres_id');
            $table->index('med_id');
            $table->index('supplier_id');
            $table->index('purchase_item_id');
            $table->index('barcode');
            $table->index('batch_number');
            $table->index('sold_at');

            // ✅ ایندکس ترکیبی برای گزارش فروش بر اساس بچ
            $table->index(
                ['med_id', 'batch_number', 'sold_at'],
                'sales_batch_report_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_sales');
    }
};