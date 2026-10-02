<?php
// database/migrations/xxxx_xx_xx_xxxxxx_fix_medication_stock_report_view.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ✅ حذف ویوی خراب قبلی
        DB::statement("DROP VIEW IF EXISTS medication_stock_report_view;");

        // ✅ ساخت ویوی درست با نام واقعی جداول و ستون‌ها
        DB::statement("
            CREATE VIEW medication_stock_report_view AS
            SELECT
                m.med_id                                AS medication_id,
                m.gen_name                              AS medication_name,
                COALESCE(a.account_name, 'نامشخص')      AS supplier_name,

                COALESCE(SUM(s.quantity), 0)            AS available_stock,

                MIN(s.exp_date)                         AS nearest_expiry_date,

                CASE
                    WHEN MIN(s.exp_date) IS NULL                          THEN 'VALID'
                    WHEN DATE(MIN(s.exp_date)) <  DATE('now')             THEN 'EXPIRED'
                    WHEN DATE(MIN(s.exp_date)) <= DATE('now', '+30 days') THEN 'NEAR_EXPIRY'
                    ELSE 'VALID'
                END                                     AS expiry_status,

                CASE
                    WHEN COALESCE(SUM(s.quantity), 0) <= 10 THEN 'SEVERE_SHORTAGE'
                    WHEN COALESCE(SUM(s.quantity), 0) <= 50 THEN 'MEDIUM'
                    ELSE 'HIGH'
                END                                     AS stock_status,

                COALESCE(m.minimum_quantity, 10)        AS minimum_quantity

            FROM medications m
            LEFT JOIN stock s
                   ON s.med_id = m.med_id
                  AND s.quantity > 0
            LEFT JOIN accounts a
                   ON a.id = s.supplier_id
            GROUP BY
                m.med_id,
                m.gen_name,
                m.minimum_quantity,
                a.account_name;
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