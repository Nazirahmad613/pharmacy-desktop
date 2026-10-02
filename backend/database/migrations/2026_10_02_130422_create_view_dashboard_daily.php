<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_dashboard_daily");

        DB::statement("
            CREATE VIEW view_dashboard_daily AS
            SELECT
                d.report_date AS report_date,
                COALESCE(r.total_patients, 0)        AS total_patients,
                COALESCE(doc.total_doctors, 0)       AS total_doctors,
                COALESCE(p.total_prescriptions, 0)   AS total_prescriptions,
                COALESCE(s.total_sales, 0)           AS total_sales,
                COALESCE(j.total_paid, 0)            AS total_paid,
                COALESCE(j.total_due, 0)             AS total_due
            FROM (
                SELECT DATE(created_at) AS report_date FROM registrations
                UNION
                SELECT DATE(created_at) FROM prescriptions
                UNION
                SELECT DATE(created_at) FROM sales
                UNION
                SELECT DATE(journal_date) FROM journals
            ) d

            LEFT JOIN (
                SELECT DATE(created_at) AS report_date,
                       COUNT(DISTINCT reg_id) AS total_patients
                FROM registrations
                GROUP BY DATE(created_at)
            ) r ON r.report_date = d.report_date

            LEFT JOIN (
                SELECT DATE(created_at) AS report_date,
                       COUNT(DISTINCT doc_id) AS total_doctors
                FROM prescriptions
                WHERE doc_id IS NOT NULL
                GROUP BY DATE(created_at)
            ) doc ON doc.report_date = d.report_date

            LEFT JOIN (
                SELECT DATE(created_at) AS report_date,
                       COUNT(DISTINCT pres_id) AS total_prescriptions
                FROM prescriptions
                GROUP BY DATE(created_at)
            ) p ON p.report_date = d.report_date

            LEFT JOIN (
                SELECT DATE(created_at) AS report_date,
                       SUM(net_sales) AS total_sales
                FROM sales
                GROUP BY DATE(created_at)
            ) s ON s.report_date = d.report_date

            LEFT JOIN (
                SELECT DATE(journal_date) AS report_date,
                       SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) AS total_paid,
                       SUM(CASE WHEN entry_type = 'debit'  THEN amount ELSE 0 END) AS total_due
                FROM journals
                GROUP BY DATE(journal_date)
            ) j ON j.report_date = d.report_date
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_dashboard_daily");
    }
};