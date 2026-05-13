<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW view_dashboard_daily AS
            SELECT 
                d.report_date AS report_date,
                COUNT(DISTINCT r.reg_id) AS total_patients,
                COUNT(DISTINCT p.doc_id) AS total_doctors,
                COUNT(DISTINCT p.pres_id) AS total_prescriptions,
                COALESCE(SUM(s.net_sales), 0) AS total_sales
            FROM (

                SELECT DATE(created_at) AS report_date FROM registrations
                UNION
                SELECT DATE(created_at) FROM prescriptions
                UNION
                SELECT DATE(created_at) FROM sales

            ) d

            LEFT JOIN registrations r 
                ON DATE(r.created_at) = d.report_date

            LEFT JOIN prescriptions p 
                ON DATE(p.created_at) = d.report_date

            LEFT JOIN sales s 
                ON DATE(s.created_at) = d.report_date

            GROUP BY d.report_date
            ORDER BY d.report_date DESC
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_dashboard_daily");
    }
};