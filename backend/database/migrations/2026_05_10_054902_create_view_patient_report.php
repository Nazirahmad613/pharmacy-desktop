<?php
 use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW view_patient_report AS
            SELECT 
                DATE(created_at) AS report_date,
                COUNT(*) AS total_patients
            FROM registrations
            GROUP BY DATE(created_at)
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_patient_report");
    }
};