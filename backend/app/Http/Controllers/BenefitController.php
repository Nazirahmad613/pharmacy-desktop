<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class BenefitController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | نام View در SQLite
    |--------------------------------------------------------------------------
    |
    | View ساخته‌شده: v_benefits
    | شامل سه نوع گزارش: daily، monthly، yearly
    |
    */

    private string $viewName = 'v_benefits';


    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    | لیست گزارش سود و زیان
    |
    | پارامترها:
    | - type   : daily | monthly | yearly
    | - date   : YYYY-MM-DD (برای daily)
    | - month  : 1..12    (برای monthly)
    | - year   : YYYY     (برای monthly و yearly)
    |
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        try {

            /*
            |--------------------------------------------------------------------------
            | بررسی وجود View
            |--------------------------------------------------------------------------
            */

            if (!$this->viewExists()) {
                return response()->json([
                    'success' => false,
                    'error' => "View '{$this->viewName}' وجود ندارد. ابتدا Migration را اجرا کنید.",
                    'data' => [],
                ], 500);
            }


            /*
            |--------------------------------------------------------------------------
            | اعتبارسنجی نوع گزارش
            |--------------------------------------------------------------------------
            */

            $type = $request->get('type', 'daily');

            if (!in_array($type, ['daily', 'monthly', 'yearly'], true)) {
                return response()->json([
                    'success' => false,
                    'error' => "نوع گزارش نامعتبر است. مقادیر مجاز: daily, monthly, yearly",
                    'data' => [],
                ], 422);
            }


            /*
            |--------------------------------------------------------------------------
            | Query پایه
            |--------------------------------------------------------------------------
            */

            $query = DB::table($this->viewName)
                ->where('report_type', $type);


            /*
            |--------------------------------------------------------------------------
            | فیلتر روزانه
            |--------------------------------------------------------------------------
            */

            if ($type === 'daily' && $request->filled('date')) {
                $query->where('journal_date', $request->date);
            }


            /*
            |--------------------------------------------------------------------------
            | فیلتر ماهانه
            |--------------------------------------------------------------------------
            */

            if ($type === 'monthly') {

                if ($request->filled('year')) {
                    $query->where('year', (int) $request->year);
                }

                if ($request->filled('month')) {
                    $query->where('month', (int) $request->month);
                }
            }


            /*
            |--------------------------------------------------------------------------
            | فیلتر سالانه
            |--------------------------------------------------------------------------
            */

            if ($type === 'yearly' && $request->filled('year')) {
                $query->where('year', (int) $request->year);
            }


            /*
            |--------------------------------------------------------------------------
            | مرتب‌سازی و نتیجه
            |--------------------------------------------------------------------------
            */

            $result = $query
                ->orderBy('journal_date', 'desc')
                ->get();


            Log::info('[BenefitController] گزارش دریافت شد', [
                'type'  => $type,
                'count' => $result->count(),
                'filters' => $request->only(['date', 'month', 'year']),
            ]);


            return response()->json($result);

        } catch (\Exception $e) {

            Log::error('[BenefitController] index error', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
                'data'    => [],
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CHART
    |--------------------------------------------------------------------------
    | داده‌های نمودار
    |
    | پارامترها:
    | - type : daily | monthly | yearly
    |
    |--------------------------------------------------------------------------
    */

    public function chart(Request $request)
    {
        try {

            /*
            |--------------------------------------------------------------------------
            | بررسی وجود View
            |--------------------------------------------------------------------------
            */

            if (!$this->viewExists()) {
                return response()->json([], 200);
            }


            $type = $request->get('type', 'monthly');


            /*
            |--------------------------------------------------------------------------
            | گزارش روزانه: 30 روز اخیر
            |--------------------------------------------------------------------------
            */

            if ($type === 'daily') {

                $data = DB::table($this->viewName)
                    ->where('report_type', 'daily')
                    ->select('journal_date as date', 'net_benefit')
                    ->orderBy('journal_date', 'desc')
                    ->limit(30)
                    ->get();

                return response()->json($data);
            }


            /*
            |--------------------------------------------------------------------------
            | گزارش ماهانه: همه ماه‌ها
            |--------------------------------------------------------------------------
            */

            if ($type === 'monthly') {

                $data = DB::table($this->viewName)
                    ->where('report_type', 'monthly')
                    ->select(
                        'year',
                        'month',
                        DB::raw('SUM(net_benefit) as net_benefit'),
                        DB::raw('SUM(total_credit) as total_credit'),
                        DB::raw('SUM(total_debit) as total_debit')
                    )
                    ->groupBy('year', 'month')
                    ->orderBy('year', 'desc')
                    ->orderBy('month', 'desc')
                    ->get();

                return response()->json($data);
            }


            /*
            |--------------------------------------------------------------------------
            | گزارش سالانه: همه سال‌ها
            |--------------------------------------------------------------------------
            */

            if ($type === 'yearly') {

                $data = DB::table($this->viewName)
                    ->where('report_type', 'yearly')
                    ->select(
                        'year',
                        DB::raw('SUM(net_benefit) as net_benefit'),
                        DB::raw('SUM(total_credit) as total_credit'),
                        DB::raw('SUM(total_debit) as total_debit')
                    )
                    ->groupBy('year')
                    ->orderBy('year', 'desc')
                    ->get();

                return response()->json($data);
            }


            /*
            |--------------------------------------------------------------------------
            | پیش‌فرض: ماه جاری
            |--------------------------------------------------------------------------
            */

            $data = DB::table($this->viewName)
                ->where('report_type', 'monthly')
                ->where('year', (int) date('Y'))
                ->where('month', (int) date('m'))
                ->select(
                    'year',
                    'month',
                    DB::raw('SUM(net_benefit) as net_benefit'),
                    DB::raw('SUM(total_credit) as total_credit'),
                    DB::raw('SUM(total_debit) as total_debit')
                )
                ->groupBy('year', 'month')
                ->get();

            return response()->json($data);

        } catch (\Exception $e) {

            Log::error('[BenefitController] chart error', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            return response()->json([], 200);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    | خلاصه گزارش سود و زیان
    |
    | برای نمایش کارت‌های بالای صفحه استفاده می‌شود.
    |
    |--------------------------------------------------------------------------
    */

    public function summary(Request $request)
    {
        try {

            if (!$this->viewExists()) {
                return response()->json([
                    'total_credit' => 0,
                    'total_debit'  => 0,
                    'net_benefit'  => 0,
                ]);
            }


            $type = $request->get('type', 'monthly');


            $query = DB::table($this->viewName)
                ->where('report_type', $type);


            /*
            |--------------------------------------------------------------------------
            | فیلترهای اختیاری
            |--------------------------------------------------------------------------
            */

            if ($type === 'daily' && $request->filled('date')) {
                $query->where('journal_date', $request->date);
            }

            if ($type === 'monthly') {
                if ($request->filled('year')) {
                    $query->where('year', (int) $request->year);
                }
                if ($request->filled('month')) {
                    $query->where('month', (int) $request->month);
                }
            }

            if ($type === 'yearly' && $request->filled('year')) {
                $query->where('year', (int) $request->year);
            }


            $summary = $query->select(
                DB::raw('COALESCE(SUM(total_credit), 0) as total_credit'),
                DB::raw('COALESCE(SUM(total_debit), 0) as total_debit'),
                DB::raw('COALESCE(SUM(net_benefit), 0) as net_benefit'),
                DB::raw('COUNT(*) as period_count')
            )->first();


            return response()->json([
                'type'          => $type,
                'total_credit'  => (float) $summary->total_credit,
                'total_debit'   => (float) $summary->total_debit,
                'net_benefit'   => (float) $summary->net_benefit,
                'period_count'  => (int)   $summary->period_count,
            ]);

        } catch (\Exception $e) {

            Log::error('[BenefitController] summary error', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            return response()->json([
                'total_credit' => 0,
                'total_debit'  => 0,
                'net_benefit'  => 0,
            ], 200);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | HELPER: بررسی وجود View
    |--------------------------------------------------------------------------
    */

    private function viewExists(): bool
    {
        try {

            /*
            |--------------------------------------------------------------------------
            | SQLite: بررسی از طریق sqlite_master
            |--------------------------------------------------------------------------
            */

            if (DB::getDriverName() === 'sqlite') {

                $result = DB::selectOne(
                    "SELECT name FROM sqlite_master WHERE type = 'view' AND name = ?",
                    [$this->viewName]
                );

                return !is_null($result);
            }

            /*
            |--------------------------------------------------------------------------
            | MySQL / PostgreSQL: بررسی از طریق information_schema
            |--------------------------------------------------------------------------
            */

            return Schema::hasTable($this->viewName);

        } catch (\Exception $e) {

            Log::warning('[BenefitController] viewExists check failed', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }
};