<?php
// app/Services/StockService.php

namespace App\Services;

use App\Models\Stock;
use Illuminate\Support\Facades\DB;

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
    }

    /**
     * کاهش موجودی (خروج کالا از انبار)
     */
    public static function decrease($medId, $supplierId, $expDate, $quantity, $type = null)
    {
        $stock = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('exp_date', $expDate)
            ->where('type', $type)
            ->first();

        if ($stock) {
            if ($stock->quantity >= $quantity) {
                $stock->decrement('quantity', $quantity);
                return true;
            }
            return false;
        }
        return false;
    }

    /**
     * برگرداندن موجودی (برای ویرایش یا حذف)
     */
    public static function reverseDecrease($medId, $supplierId, $expDate, $quantity, $type = null)
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
    }

    /**
     * بررسی موجودی کافی
     */
    public static function check($medId, $supplierId, $quantity, $type = null)
    {
        $total = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('type', $type)
            ->sum('quantity');
        
        return $total >= $quantity;
    }

    /**
     * دریافت موجودی یک دارو از یک تأمین‌کننده
     */
    public static function getStock($medId, $supplierId, $type = null)
    {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);
        
        if ($type) {
            $query->where('type', $type);
        }
        
        return $query->orderBy('exp_date', 'asc')->get();
    }
}