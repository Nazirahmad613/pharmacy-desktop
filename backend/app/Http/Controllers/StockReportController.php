<?php
// app/Http/Controllers/StockReportController.php

namespace App\Http\Controllers;

use App\Models\Stock;
use App\Models\Medication;
use App\Models\Registrations;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StockReportController extends Controller
{
    /**
     * دریافت گزارش موجودی داروها (برای StockShortageReport و PieChart)
     * فرمت خروجی مورد نیاز فرانت‌اند:
     * {
     *   medication_name: string,
     *   available_stock: number,
     *   nearest_expiry_date: date,
     *   expiry_status: "EXPIRED" | "NEAR_EXPIRY" | "VALID",
     *   supplier_name: string
     * }
     */
    public function medicationStock()
    {
        try {
            // ✅ دریافت همه داروها به همراه stocks و supplier
            $medications = Medication::with(['stocks' => function($query) {
                $query->select('med_id', 'supplier_id', 'exp_date', 'quantity')
                      ->orderBy('exp_date', 'asc');
            }, 'stocks.supplier'])->get();

            $result = [];
            
            foreach ($medications as $medication) {
                // محاسبه مجموع موجودی از همه تأمین‌کننده‌ها
                $totalStock = $medication->stocks->sum('quantity');
                
                // پیدا کردن نزدیک‌ترین تاریخ انقضا
                $nearestExpiry = $medication->stocks
                    ->where('exp_date', '>=', Carbon::today())
                    ->sortBy('exp_date')
                    ->first();
                
                $nearestExpiryDate = $nearestExpiry ? $nearestExpiry->exp_date : null;
                
                // تعیین وضعیت انقضا
                $expiryStatus = $this->getExpiryStatus($nearestExpiryDate);
                
                // ✅ دریافت نام تأمین‌کننده (از طریق رابطه supplier)
                $supplierName = null;
                $firstStock = $medication->stocks->where('quantity', '>', 0)->first();
                
                if ($firstStock && $firstStock->relationLoaded('supplier') && $firstStock->supplier) {
                    $supplierName = $firstStock->supplier->full_name ?? $firstStock->supplier->reg_name ?? null;
                }
                
                // ✅ اگر از طریق رابطه کار نکرد، مستقیم از دیتابیس بگیریم
                if (!$supplierName && $firstStock && $firstStock->supplier_id) {
                    $supplier = Registrations::find($firstStock->supplier_id);
                    if ($supplier) {
                        $supplierName = $supplier->full_name ?? $supplier->reg_name ?? null;
                    }
                }
                
                $result[] = [
                    'medication_name' => $medication->gen_name ?? 'نامشخص',
                    'available_stock' => (int) $totalStock,
                    'nearest_expiry_date' => $nearestExpiryDate,
                    'expiry_status' => $expiryStatus,
                    'supplier_name' => $supplierName ?? '—',
                    'minimum_quantity' => (int) ($medication->minimum_quantity ?? 10),
                    'status' => $totalStock <= ($medication->minimum_quantity ?? 10) ? 'LOW_STOCK' : 'OK'
                ];
            }
            
            // مرتب‌سازی بر اساس موجودی (کمترین اولویت)
            usort($result, function($a, $b) {
                return $a['available_stock'] - $b['available_stock'];
            });
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('StockReport Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'خطا در دریافت گزارش موجودی',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * تعیین وضعیت انقضا
     */
    private function getExpiryStatus($expiryDate)
    {
        if (!$expiryDate) {
            return 'VALID';
        }
        
        $today = Carbon::today();
        $expiry = Carbon::parse($expiryDate);
        
        if ($expiry->lt($today)) {
            return 'EXPIRED';
        }
        
        $daysLeft = $today->diffInDays($expiry);
        
        if ($daysLeft <= 30) {
            return 'NEAR_EXPIRY';
        }
        
        return 'VALID';
    }
}