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
     * منطق محاسبه (بر اساس JournalSyncService):
     *   - entry_type = 'debit'  → درآمد (total_credit)  ← اخذ پول از مریض
     *   - entry_type = 'credit' → مصارف (total_debit)   ← پرداخت پول
     *   - net_benefit = total_credit - total_debit
     *
     * نکته مهم:
     *   - View نباید ORDER BY داشته باشد، چون SQLite با UNION ALL خطا می‌دهد.
     *   - مرتب‌سازی باید در کنترلر انجام شود.
     */
    public function up(): void
    {
        // حذف View قدیمی
        DB::statement("DROP VIEW IF EXISTS v_benefits");

        // ساخت View جدید (SQLite syntax)
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

                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS net_benefit

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

                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS net_benefit

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

                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount ELSE 0 END), 0)
                -
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount ELSE 0 END), 0) AS net_benefit

            FROM journals j
            WHERE j.journal_date IS NOT NULL
            GROUP BY strftime('%Y', j.journal_date)
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_benefits");
    }
};