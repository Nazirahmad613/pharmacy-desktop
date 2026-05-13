<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            CREATE VIEW view_daily_sales AS
            SELECT 
                DATE(created_at) AS sale_date,
                SUM(net_sales) AS total_sales,
                COUNT(*) AS total_orders
            FROM sales
            GROUP BY DATE(created_at)
        ");
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_daily_sales");
    }
};