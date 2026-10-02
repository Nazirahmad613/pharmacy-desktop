<?php
// database/migrations/xxxx_xx_xx_xxxxxx_fix_medication_stock_report_view_use_accounts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ✅ حذف ویوی قدیمی که به جدول suppliers ارجاع می‌داد
        DB::statement("DROP VIEW IF EXISTS medication_stock_report_view;");

        // ✅ ساخت مجدد ویو با جدول accounts
        DB::statement("
            CREATE VIEW medication_stock_report_view AS
            SELECT
                m.id                            AS medication_id,
                m.gen_name                      AS medication_name,
                COALESCE(a.full_name, a.reg_name, 'نامشخص') AS supplier_name,

                COALESCE(SUM(s.quantity), 0)    AS available_stock,

                MIN(s.exp_date)                 AS nearest_expiry_date,

                CASE
                    WHEN MIN(s.exp_date) IS NULL                             THEN 'VALID'
                    WHEN DATE(MIN(s.exp_date)) <  DATE('now')                THEN 'EXPIRED'
                    WHEN DATE(MIN(s.exp_date)) <= DATE('now', '+30 days')    THEN 'NEAR_EXPIRY'
                    ELSE 'VALID'
                END                             AS expiry_status,

                CASE
                    WHEN COALESCE(SUM(s.quantity), 0) <= 10 THEN 'SEVERE_SHORTAGE'
                    WHEN COALESCE(SUM(s.quantity), 0) <= 50 THEN 'MEDIUM'
                    ELSE 'HIGH'
                END                             AS stock_status

            FROM medications m
            LEFT JOIN stocks s
                   ON s.med_id = m.id
                  AND s.quantity > 0
            LEFT JOIN accounts a
                   ON a.id = s.supplier_id
            GROUP BY
                m.id,
                m.gen_name,
                a.full_name,
                a.reg_name;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS medication_stock_report_view;");
    }
};