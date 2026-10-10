<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * ساخت View گزارش سود و زیان (v_benefits)
     *
     * این View سه نوع گزارش را برمی‌گرداند:
     *   - daily   : روزانه
     *   - monthly : ماهانه
     *   - yearly  : سالانه
     *
     * منطق محاسبه:
     *   - entry_type = 'credit' → درآمد (total_credit)
     *   - entry_type = 'debit'  → مصارف (total_debit)
     *   - net_benefit = total_credit - total_debit
     *
     * نکته مهم:
     *   چون ستون account_id در جدول journals ممکن است NULL باشد،
     *   این View مستقیماً بر اساس entry_type کار می‌کند و به accounts وابسته نیست.
     */
    public function up(): void
    {
        // حذف View قدیمی
        DB::statement("DROP VIEW IF EXISTS v_benefits");

        // ساخت View جدید
        DB::statement("
            CREATE VIEW v_benefits AS

            -- ============================================================
            -- 1) گزارش روزانه (Daily)
            -- ============================================================
            SELECT
                'daily'                                                   AS report_type,
                DATE(j.journal_date)                                      AS journal_date,
                CAST(strftime('%Y', j.journal_date) AS INTEGER)          AS year,
                CAST(strftime('%m', j.journal_date) AS INTEGER)          AS month,
                CAST(strftime('%d', j.journal_date) AS INTEGER)          AS day,
                strftime('%Y-%m-%d', j.journal_date)                     AS period_key,

                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS net_benefit

            FROM journals j
            WHERE j.journal_date IS NOT NULL
            GROUP BY strftime('%Y-%m-%d', j.journal_date)

            UNION ALL

            -- ============================================================
            -- 2) گزارش ماهانه (Monthly)
            -- ============================================================
            SELECT
                'monthly'                                                 AS report_type,
                DATE(j.journal_date, 'start of month')                    AS journal_date,
                CAST(strftime('%Y', j.journal_date) AS INTEGER)          AS year,
                CAST(strftime('%m', j.journal_date) AS INTEGER)          AS month,
                NULL                                                      AS day,
                strftime('%Y-%m', j.journal_date)                         AS period_key,

                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS net_benefit

            FROM journals j
            WHERE j.journal_date IS NOT NULL
            GROUP BY strftime('%Y-%m', j.journal_date)

            UNION ALL

            -- ============================================================
            -- 3) گزارش سالانه (Yearly)
            -- ============================================================
            SELECT
                'yearly'                                                  AS report_type,
                DATE(j.journal_date, 'start of year')                     AS journal_date,
                CAST(strftime('%Y', j.journal_date) AS INTEGER)          AS year,
                NULL                                                      AS month,
                NULL                                                      AS day,
                strftime('%Y', j.journal_date)                            AS period_key,

                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS net_benefit

            FROM journals j
            WHERE j.journal_date IS NOT NULL
            GROUP BY strftime('%Y', j.journal_date)

            ORDER BY
                CASE report_type
                    WHEN 'daily'   THEN 1
                    WHEN 'monthly' THEN 2
                    WHEN 'yearly'  THEN 3
                END,
                journal_date DESC
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_benefits");
    }
};