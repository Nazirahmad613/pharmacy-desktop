<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Stock_Report;
use Illuminate\Support\Facades\DB;


class StockReportController extends Controller
{
   public function index(){

        $rows = DB::table('stock_Report')->get();
        return response()->json($rows);

   }


  public function medicationStock()
    {
        try {
            $data = DB::table('vw_medication_status')->get();
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => 'خطا در دریافت داده‌ها: ' . $e->getMessage()], 500);
        }
    }

    // متدهای دیگر مانند index که قبلاً وجود دارد را می‌توانید نگه دارید
}



