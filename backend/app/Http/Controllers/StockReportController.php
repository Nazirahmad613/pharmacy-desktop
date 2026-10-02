<?php
// app/Http/Controllers/StockReportController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockReportController extends Controller
{
    /**
     * GET /reports/medication-stock
     * لیست کامل داروها با موجودی، انقضا و تأمین‌کننده
     */
    public function medicationStock(Request $request)
    {
        try {
            $query = DB::table('medication_stock_report_view');

            // فیلتر محدوده موجودی (مطابق فرانت‌اند)
            if ($range = $request->query('stockRange')) {
                switch ($range) {
                    case '0-10':  $query->whereBetween('available_stock', [0, 10]);   break;
                    case '11-20': $query->whereBetween('available_stock', [11, 20]);  break;
                    case '21-50': $query->whereBetween('available_stock', [21, 50]);  break;
                    case '51+':   $query->where('available_stock', '>=', 51);         break;
                    case '0-20':  $query->whereBetween('available_stock', [0, 20]);   break;
                    // 'all' → بدون فیلتر
                }
            }

            // فیلتر وضعیت انقضا
            if (($expiry = $request->query('expiryStatus')) && $expiry !== 'all') {
                $query->where('expiry_status', $expiry);
            }

            // فیلتر تأمین‌کننده
            if (($supplier = $request->query('supplier')) && $supplier !== 'all') {
                $query->where('supplier_name', $supplier);
            }

            // جستجوی نام دارو
            if ($search = $request->query('search')) {
                $query->where('medication_name', 'like', '%' . $search . '%');
            }

            $data = $query
                ->orderBy('available_stock', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'medication_name'     => $item->medication_name ?? 'نامشخص',
                        'available_stock'     => (int) $item->available_stock,
                        'nearest_expiry_date' => $item->nearest_expiry_date,
                        'expiry_status'       => $item->expiry_status,
                        'supplier_name'       => $item->supplier_name ?: '—',
                    ];
                });

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('StockReport Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error'   => 'خطا در دریافت گزارش موجودی',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /reports/medication-stock/summary
     * خلاصه آمار برای چارت‌ها و کارت‌های هشدار
     */
    public function summary()
    {
        try {
            // آمار موجودی (برای کارت کمبود شدید و چارت اول)
            $stockStats = DB::table('medication_stock_report_view')
                ->selectRaw("
                    SUM(CASE WHEN available_stock <= 10 THEN 1 ELSE 0 END) AS low,
                    SUM(CASE WHEN available_stock > 10 AND available_stock <= 50 THEN 1 ELSE 0 END) AS medium,
                    SUM(CASE WHEN available_stock > 50 THEN 1 ELSE 0 END) AS high
                ")
                ->first();

            // آمار انقضا (برای کارت نارنجی و چارت دوم)
            $expiryStats = DB::table('medication_stock_report_view')
                ->selectRaw("
                    SUM(CASE WHEN expiry_status = 'EXPIRED' THEN 1 ELSE 0 END)     AS expired,
                    SUM(CASE WHEN expiry_status = 'NEAR_EXPIRY' THEN 1 ELSE 0 END) AS near_expiry,
                    SUM(CASE WHEN expiry_status = 'VALID' THEN 1 ELSE 0 END)       AS valid
                ")
                ->first();

            // آمار تأمین‌کنندگان (چارت سوم، چهارم و لیست)
            $supplierStats = DB::table('medication_stock_report_view')
                ->selectRaw("
                    supplier_name,
                    SUM(available_stock) AS total_stock,
                    COUNT(*)             AS medication_count
                ")
                ->groupBy('supplier_name')
                ->orderByDesc('total_stock')
                ->limit(8)
                ->get();

            return response()->json([
                'stock_stats' => [
                    'low'    => (int) ($stockStats->low    ?? 0),
                    'medium' => (int) ($stockStats->medium ?? 0),
                    'high'   => (int) ($stockStats->high   ?? 0),
                ],
                'expiry_stats' => [
                    'expired'     => (int) ($expiryStats->expired     ?? 0),
                    'near_expiry' => (int) ($expiryStats->near_expiry ?? 0),
                    'valid'       => (int) ($expiryStats->valid       ?? 0),
                ],
                'supplier_stats' => $supplierStats,
            ]);

        } catch (\Exception $e) {
            Log::error('StockSummary Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error'   => 'خطا در دریافت خلاصه گزارش',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}