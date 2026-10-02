<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * گزارش روزانه — از ویو view_dashboard_daily
     * GET /api/dashboard-daily
     */
    public function index(Request $request)
    {
        try {
            $rows = DB::table('view_dashboard_daily')
                ->orderBy('report_date', 'desc')
                ->get();

            $data = $rows->map(function ($row) {
                return [
                    'report_date'          => $this->toJalali($row->report_date),
                    'report_date_gregorian'=> $row->report_date,
                    'total_patients'       => (int) $row->total_patients,
                    'total_doctors'        => (int) $row->total_doctors,
                    'total_prescriptions'  => (int) $row->total_prescriptions,
                    'total_sales'          => (float) $row->total_sales,
                    'total_paid'           => (float) $row->total_paid,
                    'total_due'            => (float) $row->total_due,
                ];
            });

            return response()->json($data);
        } catch (\Throwable $e) {
            Log::error('DashboardController@index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت گزارش روزانه',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * گزارش فروش از جدول sales و journals
     * GET /api/dashboard-sales
     */
    public function sales(Request $request)
    {
        try {
            $from = $request->get('from');
            $to   = $request->get('to');

            // فروش از جدول sales
            $salesQuery = DB::table('sales');
            if ($from) $salesQuery->whereDate('created_at', '>=', $from);
            if ($to)   $salesQuery->whereDate('created_at', '<=', $to);

            $sales = $salesQuery
                ->selectRaw('DATE(created_at) as report_date,
                             COUNT(*) as total_invoices,
                             COALESCE(SUM(net_sales),0) as total_sales,
                             COALESCE(SUM(total_paid),0) as total_paid,
                             COALESCE(SUM(remaining_amount),0) as total_due')
                ->groupBy('report_date')
                ->orderBy('report_date', 'desc')
                ->get();

            // پرداخت‌ها از journals
            $journalsQuery = DB::table('journals')
                ->where('ref_type', 'sale');
            if ($from) $journalsQuery->whereDate('journal_date', '>=', $from);
            if ($to)   $journalsQuery->whereDate('journal_date', '<=', $to);

            $journals = $journalsQuery
                ->selectRaw("DATE(journal_date) as report_date,
                             SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as total_credit,
                             SUM(CASE WHEN entry_type='debit'  THEN amount ELSE 0 END) as total_debit")
                ->groupBy('report_date')
                ->orderBy('report_date', 'desc')
                ->get();

            $data = [
                'sales'    => $sales->map(fn($r) => [
                    'report_date'    => $this->toJalali($r->report_date),
                    'total_invoices' => (int) $r->total_invoices,
                    'total_sales'    => (float) $r->total_sales,
                    'total_paid'     => (float) $r->total_paid,
                    'total_due'      => (float) $r->total_due,
                ]),
                'journals' => $journals->map(fn($r) => [
                    'report_date'  => $this->toJalali($r->report_date),
                    'total_credit' => (float) $r->total_credit,
                    'total_debit'  => (float) $r->total_debit,
                ]),
            ];

            return response()->json($data);
        } catch (\Throwable $e) {
            Log::error('DashboardController@sales error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت گزارش فروش',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * تبدیل تاریخ میلادی به شمسی
     */
    private function toJalali(?string $gregorianDate): ?string
    {
        if (!$gregorianDate) return null;

        try {
            $date = Carbon::parse($gregorianDate);

            // اگر پکیج morilog/jalali نصب است:
            if (class_exists(\Morilog\Jalali\Jalalian::class)) {
                return \Morilog\Jalali\Jalalian::fromCarbon($date)->format('Y/m/d');
            }

            // اگر hekmatinasser/verta نصب است:
            if (function_exists('verta')) {
                return verta($date)->format('Y/m/d');
            }

            // Fallback: تاریخ میلادی
            return $date->format('Y-m-d');
        } catch (\Throwable $e) {
            return $gregorianDate;
        }
    }
}