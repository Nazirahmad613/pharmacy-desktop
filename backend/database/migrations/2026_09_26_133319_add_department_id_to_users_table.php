<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ✅ حذف View قدیمی که به جدول ناموجود doctors وابسته است
        DB::statement('DROP VIEW IF EXISTS view_dashboard_summary');

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')
                ->nullable()
                ->after('avatar')
                ->constrained('departments')
                ->nullOnDelete()
                ->comment('بخش مربوطه کاربر — از جدول departments');

            $table->index('department_id');
        });

        // ✅ بازسازی View با ساختار جدید (بدون جدول doctors)
        DB::statement("
            CREATE VIEW view_dashboard_summary AS
            SELECT 
                (SELECT COUNT(*) FROM registrations) AS total_patients,
                (SELECT COUNT(DISTINCT model_id) FROM model_has_roles 
                 WHERE role_id = (SELECT id FROM roles WHERE name = 'doctor')
                ) AS total_doctors,
                (SELECT COUNT(*) FROM prescriptions) AS total_prescriptions,
                COALESCE((SELECT SUM(net_sales) FROM sales), 0) AS total_sales
        ");
    }

    public function down(): void
    {
        // حذف View قبل از rollback
        DB::statement('DROP VIEW IF EXISTS view_dashboard_summary');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropIndex(['department_id']);
            $table->dropColumn('department_id');
        });

        // بازگرداندن View به حالت قبل (اختیاری)
        DB::statement("
            CREATE VIEW view_dashboard_summary AS
            SELECT 
                (SELECT COUNT(*) FROM registrations) AS total_patients,
                (SELECT COUNT(*) FROM doctors) AS total_doctors,
                (SELECT COUNT(*) FROM prescriptions) AS total_prescriptions,
                COALESCE((SELECT SUM(net_sales) FROM sales), 0) AS total_sales
        ");
    }
};