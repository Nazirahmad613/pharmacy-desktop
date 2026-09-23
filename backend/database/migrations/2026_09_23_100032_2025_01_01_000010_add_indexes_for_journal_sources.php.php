<?php
// database/migrations/2025_01_01_000010_add_indexes_for_journal_sources.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ایندکس روی accounts.account_category برای فیلتر سریع
        Schema::table('accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('accounts', 'account_category')) {
                return;
            }
            // اگر ایندکس وجود ندارد اضافه کن
            try {
                $table->index('account_category', 'accounts_category_idx');
            } catch (\Throwable $e) {
                // نادیده بگیر اگر قبلاً وجود دارد
            }
        });

        // ایندکس روی users.email یا نام برای جستجو
        Schema::table('users', function (Blueprint $table) {
            try {
                $table->index('name', 'users_name_idx');
            } catch (\Throwable $e) {}
        });

        // ایندکس روی patients
        Schema::table('patients', function (Blueprint $table) {
            try {
                $table->index(['first_name', 'last_name'], 'patients_name_idx');
            } catch (\Throwable $e) {}
        });
    }

    public function down(): void
    {
        // در صورت نیاز حذف ایندکس‌ها
    }
};