<?php

// app/Services/StockService.php

namespace App\Services;

use App\Models\Stock;
use App\Models\Medication;
use Illuminate\Support\Facades\DB;
use Exception;

class StockService
{
    /**
     * ============================================================
     * افزایش موجودی
     * ============================================================
     *
     * هنگام ثبت خرید استفاده می‌شود.
     *
     * هر موجودی بر اساس موارد زیر از هم تفکیک می‌شود:
     * - med_id
     * - supplier_id
     * - exp_date
     * - batch_number
     * - type
     *
     * بنابراین دو Batch مختلف یک دارو با هم مخلوط نمی‌شوند.
     */
    public static function increase(
        $medId,
        $supplierId,
        $expDate,
        $quantity,
        $type = null,
        $batchNumber = null,
        $purchasePrice = null,
        $sellingPrice = null
    ) {
        return DB::transaction(function () use (
            $medId,
            $supplierId,
            $expDate,
            $quantity,
            $type,
            $batchNumber,
            $purchasePrice,
            $sellingPrice
        ) {

            $query = Stock::where('med_id', $medId)
                ->where('supplier_id', $supplierId)
                ->where('exp_date', $expDate);

            // type
            if ($type === null) {
                $query->whereNull('type');
            } else {
                $query->where('type', $type);
            }

            // batch_number
            if ($batchNumber === null) {
                $query->whereNull('batch_number');
            } else {
                $query->where('batch_number', $batchNumber);
            }

            $stock = $query->lockForUpdate()->first();

            if ($stock) {

                $stock->quantity += $quantity;

                // اگر قیمت جدید ارسال شده باشد، قیمت همان Batch به‌روز شود
                if ($purchasePrice !== null) {
                    $stock->purchase_price = $purchasePrice;
                }

                if ($sellingPrice !== null) {
                    $stock->selling_price = $sellingPrice;
                }

                $stock->save();

            } else {

                $stock = Stock::create([
                    'med_id'        => $medId,
                    'supplier_id'   => $supplierId,
                    'type'          => $type,
                    'exp_date'      => $expDate,
                    'quantity'      => $quantity,
                    'batch_number'  => $batchNumber,
                    'purchase_price'=> $purchasePrice,
                    'selling_price' => $sellingPrice,
                ]);
            }

            return $stock;
        });
    }


    /**
     * ============================================================
     * بررسی موجودی کافی
     * ============================================================
     *
     * فقط موجودی معتبر و غیرمنقضی محاسبه می‌شود.
     */
    public static function check(
        $medId,
        $supplierId,
        $requiredQty,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        $total = $query->sum('quantity');

        return $total >= $requiredQty;
    }


    /**
     * ============================================================
     * بررسی موجودی دارو بدون توجه به Supplier
     * ============================================================
     *
     * برای فروش/نسخه زمانی مفید است که دارو با Barcode پیدا شده
     * و لازم نیست کاربر Supplier را انتخاب کند.
     */
    public static function checkByMedication(
        $medId,
        $requiredQty,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        return $query->sum('quantity') >= $requiredQty;
    }


    /**
     * ============================================================
     * کاهش موجودی FEFO
     * ============================================================
     *
     * FEFO = First Expired, First Out
     *
     * یعنی:
     * نزدیک‌ترین تاریخ انقضا اول مصرف می‌شود.
     *
     * اگر Batch اول مقدار کافی نداشته باشد،
     * از Batch بعدی نیز برداشت می‌شود.
     *
     * فقط موجودی غیرمنقضی قابل مصرف است.
     */
    public static function decrease(
        $medId,
        $supplierId,
        $requiredQty,
        $type = null
    ) {
        if ($requiredQty <= 0) {
            throw new Exception('Quantity must be greater than zero.');
        }

        return DB::transaction(function () use (
            $medId,
            $supplierId,
            $requiredQty,
            $type
        ) {

            $query = Stock::where('med_id', $medId)
                ->where('supplier_id', $supplierId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString())
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate();

            if ($type === null) {
                $query->whereNull('type');
            } else {
                $query->where('type', $type);
            }

            $stocks = $query->get();

            $available = $stocks->sum('quantity');

            if ($available < $requiredQty) {
                throw new Exception(
                    "Stock not enough for med_id={$medId}, supplier_id={$supplierId}. " .
                    "Available={$available}, Required={$requiredQty}"
                );
            }

            $remaining = $requiredQty;

            /**
             * لیست Batchهایی که واقعاً مصرف شدند.
             *
             * برای ثبت سابقه فروش/نسخه در آینده بسیار مهم است.
             */
            $allocations = [];

            foreach ($stocks as $stock) {

                if ($remaining <= 0) {
                    break;
                }

                $take = min($stock->quantity, $remaining);

                $stock->quantity -= $take;
                $stock->save();

                $allocations[] = [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,
                    'exp_date'       => $stock->exp_date,
                    'quantity'       => $take,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price'  => $stock->selling_price,
                ];

                $remaining -= $take;
            }

            return $allocations;
        });
    }


    /**
     * ============================================================
     * کاهش موجودی بدون Supplier
     * ============================================================
     *
     * برای Pharmacy Sale / Prescription مناسب است.
     *
     * ابتدا نزدیک‌ترین تاریخ انقضا را مصرف می‌کند.
     */
    public static function decreaseByMedication(
        $medId,
        $requiredQty,
        $type = null
    ) {
        if ($requiredQty <= 0) {
            throw new Exception('Quantity must be greater than zero.');
        }

        return DB::transaction(function () use (
            $medId,
            $requiredQty,
            $type
        ) {

            $query = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString())
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate();

            if ($type === null) {
                $query->whereNull('type');
            } else {
                $query->where('type', $type);
            }

            $stocks = $query->get();

            $available = $stocks->sum('quantity');

            if ($available < $requiredQty) {
                throw new Exception(
                    "Stock not enough for med_id={$medId}. " .
                    "Available={$available}, Required={$requiredQty}"
                );
            }

            $remaining = $requiredQty;

            $allocations = [];

            foreach ($stocks as $stock) {

                if ($remaining <= 0) {
                    break;
                }

                $take = min($stock->quantity, $remaining);

                $stock->quantity -= $take;
                $stock->save();

                $allocations[] = [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,
                    'exp_date'       => $stock->exp_date,
                    'quantity'       => $take,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price'  => $stock->selling_price,
                ];

                $remaining -= $take;
            }

            return $allocations;
        });
    }


    /**
     * ============================================================
     * پیدا کردن دارو توسط Barcode
     * ============================================================
     *
     * Barcode متعلق به جدول medications است،
     * نه جدول stock.
     */
    public static function findMedicationByBarcode($barcode)
    {
        return Medication::where('barcode', $barcode)->first();
    }


    /**
     * ============================================================
     * دریافت موجودی FEFO یک دارو
     * ============================================================
     *
     * برای نمایش موجودی قابل فروش/مصرف.
     */
    public static function getFEFOStock(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString())
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc');

        if ($supplierId !== null) {
            $query->where('supplier_id', $supplierId);
        }

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        return $query->get([
            'stock_id',
            'med_id',
            'supplier_id',
            'type',
            'batch_number',
            'exp_date',
            'quantity',
            'purchase_price',
            'selling_price',
        ]);
    }


    /**
     * ============================================================
     * موجودی قابل فروش
     * ============================================================
     */
    public static function getAvailableStockForSales(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        return self::getFEFOStock(
            $medId,
            $supplierId,
            $type
        );
    }


    /**
     * ============================================================
     * کاهش موجودی توسط Barcode
     * ============================================================
     *
     * Barcode → Medication → FEFO Stock
     */
    public static function decreaseByBarcode(
        $barcode,
        $requiredQty,
        $type = null
    ) {
        $medication = self::findMedicationByBarcode($barcode);

        if (!$medication) {
            throw new Exception(
                "Medication with barcode {$barcode} not found."
            );
        }

        $allocations = self::decreaseByMedication(
            $medication->med_id,
            $requiredQty,
            $type
        );

        return [
            'medication' => $medication,
            'allocations' => $allocations,
        ];
    }


    /**
     * ============================================================
     * خنثی‌سازی کاهش موجودی
     * ============================================================
     *
     * بسیار مهم:
     *
     * در صورت ویرایش/حذف فروش یا نسخه،
     * موجودی باید به همان Batch قبلی برگردد.
     *
     * بنابراین دیگر فقط exp_date کافی نیست؛
     * batch_number نیز استفاده می‌شود.
     */
    public static function reverseDecrease(
        $medId,
        $supplierId,
        $expDate,
        $quantity,
        $type = null,
        $batchNumber = null,
        $purchasePrice = null,
        $sellingPrice = null
    ) {
        if ($quantity <= 0) {
            throw new Exception('Quantity must be greater than zero.');
        }

        return self::increase(
            $medId,
            $supplierId,
            $expDate,
            $quantity,
            $type,
            $batchNumber,
            $purchasePrice,
            $sellingPrice
        );
    }


    /**
     * ============================================================
     * دریافت مجموع موجودی یک دارو
     * ============================================================
     */
    public static function getAvailableQuantity(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($supplierId !== null) {
            $query->where('supplier_id', $supplierId);
        }

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        return (int) $query->sum('quantity');
    }


    /**
     * ============================================================
     * دریافت موجودی خام یک دارو
     * ============================================================
     */
    public static function getStock(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId);

        if ($supplierId !== null) {
            $query->where('supplier_id', $supplierId);
        }

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        return $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->get();
    }
}
