<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parchases', function (Blueprint $table) {

            $table->id('parchase_id');

            // تاریخ خرید
            $table->date('parchase_date');

            // مجموع خرید
            $table->bigInteger('total_parchase')->default(0);

            // مبلغ پرداخت‌شده
            $table->bigInteger('par_paid')->default(0);

            // مبلغ باقی‌مانده
            $table->bigInteger('due_par')->default(0);

            // کاربر ثبت‌کننده خرید
            $table->unsignedBigInteger('par_user')->nullable();

            // حساب تأمین‌کننده / شرکت فروشنده
            // ارتباط مستقیم با جدول accounts
            $table->unsignedBigInteger('supplier_id')->nullable();

            $table->foreign('supplier_id')
                ->references('id')
                ->on('accounts')
                ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('parchases', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        Schema::dropIfExists('parchases');
    }
};