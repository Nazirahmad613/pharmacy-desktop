<?php

namespace App\Services;

use App\Models\Stock;
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
}