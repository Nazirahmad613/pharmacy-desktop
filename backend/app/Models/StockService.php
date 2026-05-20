<?php
// app/Services/StockService.php

namespace App\Services;

use App\Models\Stock;
use Illuminate\Support\Facades\DB;
use Exception;

class StockService
{
    /**
     * افزایش موجودی (در هنگام خرید)
     */
    public static function increase($medId, $supplierId, $expDate, $quantity)
    {
        $stock = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('exp_date', $expDate)
            ->first();

        if ($stock) {
            $stock->quantity += $quantity;
            $stock->save();
        } else {
            Stock::create([
                'med_id'      => $medId,
                'supplier_id' => $supplierId,
                'exp_date'    => $expDate,
                'quantity'    => $quantity,
            ]);
        }
    }

    /**
     * بررسی موجودی کافی (مجموع تمام تاریخ‌های انقضا)
     */
    public static function check($medId, $supplierId, $requiredQty)
    {
        $total = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->sum('quantity');

        return $total >= $requiredQty;
    }

    /**
     * کاهش موجودی به روش FIFO (نخستین انقضا، نخستین خروج)
     * @throws Exception اگر موجودی کافی نباشد
     */
    public static function decrease($medId, $supplierId, $requiredQty)
    {
        $stocks = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('quantity', '>', 0)
            ->orderBy('exp_date', 'asc')
            ->get();

        $remaining = $requiredQty;

        foreach ($stocks as $stock) {
            if ($remaining <= 0) break;

            $take = min($stock->quantity, $remaining);
            $stock->quantity -= $take;
            $stock->save();
            $remaining -= $take;
        }

        if ($remaining > 0) {
            throw new Exception("Stock not enough for med_id=$medId, supplier_id=$supplierId");
        }

        // حذف رکوردهایی که مقدارشان صفر شده (اختیاری)
        Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('quantity', 0)
            ->delete();
    }

    /**
     * خنثی‌سازی کاهش موجودی (برای ویرایش یا حذف سند)
     * دقیقاً معکوس decrease عمل می‌کند - ولی برای سادگی از increase استفاده می‌کنیم
     */
    public static function reverseDecrease($medId, $supplierId, $expDate, $quantity)
    {
        self::increase($medId, $supplierId, $expDate, $quantity);
    }
}