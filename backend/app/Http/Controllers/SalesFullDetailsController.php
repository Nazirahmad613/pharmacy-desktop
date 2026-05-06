<?php
namespace App\Http\Controllers;

use App\Models\SalesFullDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SalesFullDetailsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = SalesFullDetail::query();

            // ===== فیلترها =====
            if ($request->filled('cust_name')) {
                $query->where('cust_name', 'like', "%{$request->cust_name}%");
            }
            if ($request->filled('gen_name')) {
                $query->where('gen_name', 'like', "%{$request->gen_name}%");
            }
            if ($request->filled('category_name')) {
                $query->where('category_name', 'like', "%{$request->category_name}%");
            }
            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }
            if ($request->filled('from_date') && $request->filled('to_date')) {
                $query->whereBetween('sales_date', [$request->from_date, $request->to_date]);
            }

            // ===== مرتب‌سازی =====
            switch ($request->sort_by) {
                case 'highest_sales':
                    $query->orderByDesc('total_sales');
                    break;
                case 'highest_paid':
                    $query->orderByDesc('total_paid');
                    break;
                case 'latest':
                    $query->orderByDesc('sales_date');
                    break;
                default:
                    $query->orderBy('sales_date', 'asc');
            }

            // ===== دریافت داده‌ها =====
            $sales = $query->limit(10)->get(); // فقط ۱۰ ردیف برای تست

            // ===== خلاصه فروش =====
            $totalSales = $sales->sum('total_sales');
            $totalPaid  = $sales->sum('total_paid');
            $summary = [
                'total_sales' => $totalSales,
                'total_paid'  => $totalPaid,
                'remaining'   => $totalSales - $totalPaid,
            ];

            return response()->json([
                'data'    => $sales,
                'summary' => $summary,
            ]);

        } catch (\Exception $e) {
            Log::error("Sales fetch error: ".$e->getMessage());
            return response()->json([
                'error' => 'خطا در دریافت گزارش فروش',
                'message' => $e->getMessage() // خطای واقعی برای دیباگ
            ], 500);
        }
    }
}
