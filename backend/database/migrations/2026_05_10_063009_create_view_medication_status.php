<?php
 use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW vw_medication_status AS
            SELECT 
                m.med_id AS med_id,
                m.gen_name AS medication_name,

                COALESCE(SUM(pi.quantity), 0) AS total_purchased,
                COALESCE(SUM(si.quantity), 0) AS total_sold,

                (COALESCE(SUM(pi.quantity), 0) - COALESCE(SUM(si.quantity), 0)) AS available_stock,

                AVG(pi.unit_price) AS avg_purchase_price,

                (COALESCE(SUM(pi.quantity), 0) * AVG(pi.unit_price)) AS stock_value,

                MIN(pi.exp_date) AS nearest_expiry_date,

                CASE 
                    WHEN (COALESCE(SUM(pi.quantity), 0) - COALESCE(SUM(si.quantity), 0)) <= 10 THEN 'LOW'
                    WHEN (COALESCE(SUM(pi.quantity), 0) - COALESCE(SUM(si.quantity), 0)) BETWEEN 11 AND 50 THEN 'MEDIUM'
                    ELSE 'HIGH'
                END AS stock_status,

                CASE 
                    WHEN MIN(pi.exp_date) < DATE('now') THEN 'EXPIRED'
                    WHEN MIN(pi.exp_date) BETWEEN DATE('now') AND DATE('now', '+30 day') THEN 'NEAR_EXPIRY'
                    ELSE 'VALID'
                END AS expiry_status,

                r.full_name AS supplier_name

            FROM medications m

            LEFT JOIN parchaseitems pi ON pi.med_id = m.med_id
            LEFT JOIN parchases p ON p.parchase_id = pi.parchase_id
            LEFT JOIN registrations r ON r.reg_id = p.supplier_id
            LEFT JOIN sales_items si ON si.med_id = m.med_id

            GROUP BY m.med_id, m.gen_name, r.full_name
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS vw_medication_status");
    }
};