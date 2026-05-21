<?php

namespace App\Services;

use App\Models\Stock;
use App\Models\Medication;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * افزایش موجودی (ورود کالا به انبار)
     */
    public static function increase($medId, $supplierId, $expDate, $quantity, $type = null)
    {
        $stock = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('exp_date', $expDate)
            ->where('type', $type)
            ->first();

        if ($stock) {
            $stock->increment('quantity', $quantity);
        } else {
            Stock::create([
                'med_id' => $medId,
                'supplier_id' => $supplierId,
                'exp_date' => $expDate,
                'quantity' => $quantity,
                'type' => $type,
            ]);
        }
        
        Log::info("Stock increased", [
            'med_id' => $medId,
            'supplier_id' => $supplierId,
            'type' => $type,
            'quantity' => $quantity
        ]);
    }

    /**
     * کاهش موجودی (خروج کالا از انبار) - FIFO
     */
    public static function decrease($medId, $supplierId, $quantity, $type = null)
    {
        $stocks = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('type', $type)
            ->where('quantity', '>', 0)
            ->orderBy('exp_date', 'asc')
            ->get();

        $totalAvailable = $stocks->sum('quantity');
        
        if ($totalAvailable < $quantity) {
            Log::warning("Stock decrease failed", [
                'med_id' => $medId,
                'supplier_id' => $supplierId,
                'type' => $type,
                'requested' => $quantity,
                'available' => $totalAvailable
            ]);
            return false;
        }

        $remainingToDecrease = $quantity;
        
        foreach ($stocks as $stock) {
            if ($remainingToDecrease <= 0) break;
            
            $decreaseAmount = min($stock->quantity, $remainingToDecrease);
            $stock->decrement('quantity', $decreaseAmount);
            $remainingToDecrease -= $decreaseAmount;
        }
        
        return true;
    }

    /**
     * برگرداندن موجودی (برای ویرایش یا حذف)
     */
    public static function reverseDecrease($medId, $supplierId, $quantity, $type = null)
    {
        $stocks = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('type', $type)
            ->orderBy('exp_date', 'desc')
            ->get();
            
        $remainingToAdd = $quantity;
        foreach ($stocks as $stock) {
            if ($remainingToAdd <= 0) break;
            $stock->increment('quantity', $remainingToAdd);
            $remainingToAdd = 0;
        }
        
        if ($remainingToAdd > 0) {
            Stock::create([
                'med_id' => $medId,
                'supplier_id' => $supplierId,
                'exp_date' => now(),
                'quantity' => $remainingToAdd,
                'type' => $type,
            ]);
        }
    }

    /**
     * بررسی موجودی کافی
     */
    public static function check($medId, $supplierId, $quantity, $type = null)
    {
        $total = self::getAvailableQuantity($medId, $supplierId, $type);
        
        $isAvailable = $total >= $quantity;
        
        Log::info("Stock check", [
            'med_id' => $medId,
            'supplier_id' => $supplierId,
            'type' => $type,
            'requested' => $quantity,
            'available' => $total,
            'is_available' => $isAvailable
        ]);
        
        return $isAvailable;
    }

    /**
     * دریافت مقدار موجودی یک دارو از یک تأمین‌کننده (با در نظر گرفتن type)
     */
    public static function getAvailableQuantity($medId, $supplierId, $type = null)
    {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);
        
        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }
        
        $total = (int) $query->sum('quantity');
        
        Log::info("Get available quantity", [
            'med_id' => $medId,
            'supplier_id' => $supplierId,
            'type' => $type,
            'total_quantity' => $total
        ]);
        
        return $total;
    }

    /**
     * دریافت موجودی یک دارو از یک تأمین‌کننده (با جزئیات)
     */
    public static function getStock($medId, $supplierId, $type = null)
    {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);
        
        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }
        
        return $query->orderBy('exp_date', 'asc')->get();
    }

    /**
     * دریافت موجودی کامل برای فروش (با جزئیات)
     */
    public static function getAvailableStockForSales($medId, $supplierId, $type = null)
    {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('quantity', '>', 0);
        
        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }
        
        $stocks = $query->orderBy('exp_date', 'asc')->get();
        
        return [
            'total_quantity' => $stocks->sum('quantity'),
            'batches' => $stocks->map(function($stock) {
                return [
                    'stock_id' => $stock->stock_id,
                    'exp_date' => $stock->exp_date,
                    'quantity' => $stock->quantity
                ];
            })
        ];
    }

    // ==================== متدهای جدید برای هشدار موجودی ====================

    /**
     * دریافت داروهای با موجودی کم (بر اساس minimum_quantity از جدول medications)
     */
    public static function getLowStockMedications()
    {
        try {
            // دریافت همه داروها به همراه مجموع موجودی از جدول stock
            $medications = Medication::with(['stocks' => function($q) {
                $q->select('med_id', DB::raw('SUM(quantity) as total_quantity'))
                  ->groupBy('med_id');
            }])->get();
            
            $lowStockItems = [];
            
            foreach ($medications as $medication) {
                // جمع کل موجودی دارو از همه تأمین‌کننده‌ها و همه نوع‌ها
                $totalQuantity = (int) ($medication->stocks->sum('total_quantity') ?? 0);
                $minQuantity = (int) ($medication->minimum_quantity ?? 10);
                
                if ($totalQuantity <= $minQuantity) {
                    $status = $totalQuantity <= 0 ? 'ناموجود' : 'موجودی کم';
                    $color = $totalQuantity <= 0 ? 'red' : 'orange';
                    
                    $lowStockItems[] = [
                        'med_id' => $medication->med_id,
                        'med_name' => $medication->gen_name,
                        'current_stock' => $totalQuantity,
                        'minimum_quantity' => $minQuantity,
                        'status' => $status,
                        'color' => $color,
                        'need_order' => max(0, $minQuantity - $totalQuantity),
                        'percentage' => $totalQuantity > 0 ? round(($totalQuantity / $minQuantity) * 100) : 0
                    ];
                }
            }
            
            // مرتب‌سازی بر اساس کمترین موجودی
            usort($lowStockItems, function($a, $b) {
                return $a['current_stock'] - $b['current_stock'];
            });
            
            Log::info("Low stock medications found", ['count' => count($lowStockItems)]);
            
            return $lowStockItems;
            
        } catch (\Exception $e) {
            Log::error("Error getting low stock medications", ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * بررسی موجودی یک داروی خاص (با در نظر گرفتن minimum_quantity)
     */
    public static function checkLowStockByMedication($medId)
    {
        try {
            $medication = Medication::find($medId);
            if (!$medication) {
                return null;
            }
            
            $totalQuantity = (int) Stock::where('med_id', $medId)->sum('quantity');
            $minQuantity = (int) ($medication->minimum_quantity ?? 10);
            
            return [
                'is_low' => $totalQuantity <= $minQuantity,
                'current_stock' => $totalQuantity,
                'minimum_quantity' => $minQuantity,
                'need_order' => max(0, $minQuantity - $totalQuantity),
                'percentage' => $totalQuantity > 0 ? round(($totalQuantity / $minQuantity) * 100) : 0
            ];
            
        } catch (\Exception $e) {
            Log::error("Error checking low stock for medication", [
                'med_id' => $medId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * دریافت آمار کلی موجودی کم
     */
    public static function getLowStockSummary()
    {
        $lowStockItems = self::getLowStockMedications();
        
        return [
            'total_low_stock_items' => count($lowStockItems),
            'total_out_of_stock' => count(array_filter($lowStockItems, function($item) {
                return $item['status'] === 'ناموجود';
            })),
            'total_low_stock' => count(array_filter($lowStockItems, function($item) {
                return $item['status'] === 'موجودی کم';
            })),
            'items' => $lowStockItems
        ];
    }

    /**
     * دریافت هشدارهای فوری (موجودی صفر یا بسیار کم)
     */
    public static function getCriticalWarnings()
    {
        $lowStockItems = self::getLowStockMedications();
        
        return array_filter($lowStockItems, function($item) {
            return $item['current_stock'] <= 0 || $item['current_stock'] <= 5;
        });
    }

    /**
     * دریافت همه داروها به همراه وضعیت موجودی (برای گزارش کامل)
     */
    public static function getAllMedicationsStockStatus()
    {
        try {
            $medications = Medication::with(['stocks' => function($q) {
                $q->select('med_id', DB::raw('SUM(quantity) as total_quantity'))
                  ->groupBy('med_id');
            }])->get();
            
            $allItems = [];
            
            foreach ($medications as $medication) {
                $totalQuantity = (int) ($medication->stocks->sum('total_quantity') ?? 0);
                $minQuantity = (int) ($medication->minimum_quantity ?? 10);
                
                $allItems[] = [
                    'med_id' => $medication->med_id,
                    'med_name' => $medication->gen_name,
                    'current_stock' => $totalQuantity,
                    'minimum_quantity' => $minQuantity,
                    'status' => $totalQuantity <= 0 ? 'ناموجود' : ($totalQuantity <= $minQuantity ? 'موجودی کم' : 'موجود'),
                    'color' => $totalQuantity <= 0 ? 'red' : ($totalQuantity <= $minQuantity ? 'orange' : 'green'),
                    'need_order' => max(0, $minQuantity - $totalQuantity),
                    'percentage' => $totalQuantity > 0 ? round(($totalQuantity / $minQuantity) * 100) : 0
                ];
            }
            
            return $allItems;
            
        } catch (\Exception $e) {
            Log::error("Error getting all medications stock status", ['error' => $e->getMessage()]);
            return [];
        }
    }
}