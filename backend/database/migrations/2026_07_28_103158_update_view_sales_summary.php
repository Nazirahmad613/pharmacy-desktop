<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    DB::statement("DROP VIEW IF EXISTS view_sales_summary");

    DB::statement("
        CREATE VIEW view_sales_summary AS
        SELECT 
            j.id,
            j.journal_date,
            j.entry_type,
            j.description,
            j.amount,
            j.ref_type,
            j.ref_id,

            j.patient_id,
            (p.first_name || ' ' || p.last_name) AS patient_name,

            j.doc_id,
            (d.first_name || ' ' || d.last_name) AS doctor_name,

            j.cust_id,
            (c.first_name || ' ' || c.last_name) AS customer_name,

            j.supplier_id,
            (s.first_name || ' ' || s.last_name) AS supplier_name,

            j.med_id,
            m.gen_name,

            j.pres_id,
            pr.pres_num,

            j.user_id,
            u.name AS user_name,

            j.created_at

        FROM journals j

        LEFT JOIN registrations p ON j.patient_id = p.reg_id
        LEFT JOIN registrations d ON j.doc_id = d.reg_id
        LEFT JOIN registrations c ON j.cust_id = c.reg_id
        LEFT JOIN registrations s ON j.supplier_id = s.reg_id

        LEFT JOIN medications m ON j.med_id = m.med_id
        LEFT JOIN prescriptions pr ON j.pres_id = pr.pres_id
        LEFT JOIN users u ON j.user_id = u.id

        WHERE j.entry_type = 'credit'
        AND j.ref_type = 'sale'
    ");
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
