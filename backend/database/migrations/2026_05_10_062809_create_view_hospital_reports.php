<?php
 use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW vw_hospital_reports AS
            SELECT 
                p.pres_id,
                p.pres_num,
                p.pres_date,
                p.patient_name,
                p.doc_name,
                p.total_amount,
                p.discount,
                p.net_amount
            FROM prescriptions p
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS vw_hospital_reports");
    }
};