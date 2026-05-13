<?php
 use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW view_dashboard_summary AS
            SELECT 
                (SELECT COUNT(*) FROM registrations) AS total_patients,
                (SELECT COUNT(*) FROM doctors) AS total_doctors,
                (SELECT COUNT(*) FROM prescriptions) AS total_prescriptions,
                COALESCE((SELECT SUM(net_sales) FROM sales), 0) AS total_sales
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_dashboard_summary");
    }
};