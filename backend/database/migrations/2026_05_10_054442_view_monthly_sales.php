<?php
 use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement("
                CREATE VIEW view_monthly_sales AS
                SELECT 
                    strftime('%Y-%m', created_at) AS month,
                    SUM(net_sales) AS total_sales,
                    COUNT(*) AS total_orders
                FROM sales
                GROUP BY strftime('%Y-%m', created_at)
            ");
        } else {
            DB::statement("
                CREATE VIEW view_monthly_sales AS
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') AS month,
                    SUM(net_sales) AS total_sales,
                    COUNT(*) AS total_orders
                FROM sales
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ");
        }
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS view_monthly_sales");
    }
};