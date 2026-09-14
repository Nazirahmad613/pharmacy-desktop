<?php

namespace App\Services;

use App\Models\Stock;
use App\Models\Medication;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockService
{
    // ============================================================
    // افزایش موجودی
    // ============================================================
    /**
     * ورود کالا به انبار
     *
     * موجودی بر اساس موارد زیر در یک Batch نگهداری می‌شود:
     * - med_id
     * - supplier_id
     * - batch_number
     * - exp_date
     * - type
     *
     * توجه:
     * Barcode مربوط به Medication است و در جدول Stock نگهداری نمی‌شود.
     */
    public static function increase(
        $medId,
        $supplierId,
        $expDate,
        $quantity,
        $type = null,
        $batchNumber = null,
        $purchasePrice = null,
        $sellingPrice = null,
        $purchaseItemId = null   // ✅ جدید
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('exp_date', $expDate)
            ->where('type', $type);

        if ($batchNumber === null || $batchNumber === '') {
            $query->whereNull('batch_number');
        } else {
            $query->where('batch_number', $batchNumber);
        }

        $stock = $query->first();

        if ($stock) {
            $stock->increment('quantity', $quantity);

            $updateData = [];

            if ($purchasePrice !== null) {
                $updateData['purchase_price'] = $purchasePrice;
            }

            if ($sellingPrice !== null) {
                $updateData['selling_price'] = $sellingPrice;
            }

            // ✅ اگر purchase_item_id جدید داده شده، به‌روز کن
            if ($purchaseItemId !== null) {
                $updateData['purchase_item_id'] = $purchaseItemId;
            }

            if (!empty($updateData)) {
                $stock->update($updateData);
            }
        } else {
            Stock::create([
                'med_id'           => $medId,
                'supplier_id'      => $supplierId,
                'exp_date'         => $expDate,
                'quantity'         => $quantity,
                'type'             => $type,
                'batch_number'     => $batchNumber,
                'purchase_price'   => $purchasePrice,
                'selling_price'    => $sellingPrice,
                'purchase_item_id' => $purchaseItemId,   // ✅ جدید
            ]);
        }

        Log::info('Stock increased', [
            'med_id'           => $medId,
            'supplier_id'      => $supplierId,
            'batch_number'     => $batchNumber,
            'exp_date'         => $expDate,
            'type'             => $type,
            'quantity'         => $quantity,
            'purchase_price'   => $purchasePrice,
            'selling_price'    => $sellingPrice,
            'purchase_item_id' => $purchaseItemId,
        ]);

        return true;
    }


    // ============================================================
    // کاهش موجودی (با Supplier - سازگاری با کد قدیمی)
    // ============================================================
    /**
     * کاهش موجودی بر اساس FEFO با فیلتر Supplier
     *
     * برای سازگاری با ساختار فعلی نگهداری شده است.
     */
    public static function decrease(
        $medId,
        $supplierId,
        $quantity,
        $type = null
    ) {
        if ($quantity <= 0) {
            return false;
        }

        return DB::transaction(function () use (
            $medId,
            $supplierId,
            $quantity,
            $type
        ) {

            $stocks = Stock::where('med_id', $medId)
                ->where('supplier_id', $supplierId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString())
                ->where(function ($query) use ($type) {
                    if ($type === null || $type === '' || $type === 'null') {
                        $query->whereNull('type');
                    } else {
                        $query->where('type', $type);
                    }
                })
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {
                Log::warning('Stock decrease failed', [
                    'med_id'      => $medId,
                    'supplier_id' => $supplierId,
                    'type'        => $type,
                    'requested'   => $quantity,
                    'available'   => $totalAvailable,
                ]);

                return false;
            }

            $remainingToDecrease = $quantity;

            foreach ($stocks as $stock) {
                if ($remainingToDecrease <= 0) {
                    break;
                }

                $decreaseAmount = min(
                    (int) $stock->quantity,
                    $remainingToDecrease
                );

                $stock->decrement('quantity', $decreaseAmount);
                $remainingToDecrease -= $decreaseAmount;
            }

            Log::info('Stock decreased using FEFO', [
                'med_id'      => $medId,
                'supplier_id' => $supplierId,
                'type'        => $type,
                'quantity'    => $quantity,
            ]);

            return true;
        });
    }


    // ============================================================
    // کاهش موجودی بر اساس Medication (FEFO چند بچی)
    // ============================================================
    /**
     * کاهش موجودی برای فروش / نسخه
     *
     * این متد Supplier را اجباری نمی‌کند.
     *
     * جریان:
     * Barcode → Medication → med_id → Stock Lots → FEFO
     *
     * اگر یک Batch کافی نباشد، Batch بعدی مصرف می‌شود.
     *
     * خروجی: batches مصرف‌شده را برمی‌گرداند تا در
     * prescription_items و stock_sales ثبت شود.
     */
    public static function decreaseByMedication(
        $medId,
        $quantity,
        $type = null
    ) {
        if ($quantity <= 0) {
            return [
                'success' => false,
                'message' => 'مقدار خروج باید بیشتر از صفر باشد.',
                'batches' => [],
            ];
        }

        return DB::transaction(function () use (
            $medId,
            $quantity,
            $type
        ) {

            // ✅ بارکد از medications خوانده می‌شود
            $medication = Medication::find($medId);
            $barcode = $medication->barcode ?? null;

            $query = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString());

            if ($type !== null && $type !== '' && $type !== 'null') {
                $query->where('type', $type);
            }

            // FEFO: نزدیک‌ترین تاریخ انقضا اول
            $stocks = $query
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {
                Log::warning('FEFO stock decrease failed', [
                    'med_id'    => $medId,
                    'type'      => $type,
                    'requested' => $quantity,
                    'available' => $totalAvailable,
                ]);

                return [
                    'success'            => false,
                    'message'            => 'موجودی کافی نیست.',
                    'med_id'             => $medId,
                    'requested_quantity' => $quantity,
                    'available_quantity' => $totalAvailable,
                    'batches'            => [],
                ];
            }

            $remaining = $quantity;
            $usedBatches = [];

            foreach ($stocks as $stock) {
                if ($remaining <= 0) {
                    break;
                }

                $availableInBatch = (int) $stock->quantity;
                $usedQuantity = min($availableInBatch, $remaining);

                $stock->decrement('quantity', $usedQuantity);

                // ✅ خروجی شامل stock_id و barcode (از medications)
                $usedBatches[] = [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'med_name'       => $medication->gen_name ?? null,
                    'barcode'        => $barcode,              // ✅ از medications
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,  // ✅ از stock
                    'exp_date'       => $stock->exp_date,
                    'type'           => $stock->type,
                    'quantity'       => $usedQuantity,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price'  => $stock->selling_price,
                ];

                $remaining -= $usedQuantity;
            }

            Log::info('Stock decreased by medication using FEFO', [
                'med_id'             => $medId,
                'type'               => $type,
                'requested_quantity' => $quantity,
                'batches_used'       => $usedBatches,
            ]);

            return [
                'success'            => true,
                'message'            => 'موجودی با موفقیت از انبار خارج شد.',
                'med_id'             => $medId,
                'barcode'            => $barcode,
                'requested_quantity' => $quantity,
                'dispensed_quantity' => $quantity,
                'batches'            => $usedBatches,
            ];
        });
    }


    // ============================================================
    // کاهش موجودی بر اساس Barcode
    // ============================================================
    /**
     * Barcode از جدول medications خوانده می‌شود.
     * Barcode در Stock ذخیره نمی‌شود.
     */
    public static function decreaseByBarcode(
        $barcode,
        $quantity,
        $type = null
    ) {
        if (!$barcode) {
            return [
                'success' => false,
                'message' => 'بارکود دارو وارد نشده است.',
                'batches' => [],
            ];
        }

        $medication = Medication::where('barcode', $barcode)->first();

        if (!$medication) {
            Log::warning('Medication not found by barcode', [
                'barcode' => $barcode,
            ]);

            return [
                'success' => false,
                'message' => 'دارویی با این بارکود پیدا نشد.',
                'barcode' => $barcode,
                'batches' => [],
            ];
        }

        $result = self::decreaseByMedication(
            $medication->med_id,
            $quantity,
            $type
        );

        $result['barcode']  = $barcode;
        $result['med_id']   = $medication->med_id;
        $result['med_name'] = $medication->gen_name;

        return $result;
    }


    // ============================================================
    // ✅ جدید: دریافت اطلاعات بچ بعدی (FEFO) برای فرم تجویز
    // ============================================================
    /**
     * نزدیک‌ترین بچ با موجودی کافی را برمی‌گرداند
     * (بدون کاهش موجودی — فقط برای نمایش در فرم)
     *
     * اگر quantity داده شود، بچی که حداقل این مقدار را دارد برمی‌گردد.
     * اگر بچ اول کافی نباشد، بچ بعدی و...
     * اگر هیچ بچی به‌تنهایی کافی نباشد، null برمی‌گرداند
     * (ولی معمولاً در این حالت از decreaseByMedication با چند بچ استفاده می‌شود).
     */
    public static function getNextBatch(
        $medId,
        $supplierId = null,
        $quantity = 1
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>=', $quantity)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        return $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->first();
    }


    // ============================================================
    // ✅ جدید: برگرداندن موجودی به بچ مشخص (با stock_id)
    // ============================================================
    /**
     * برگرداندن موجودی به همان بچ اصلی
     *
     * برای ویرایش یا حذف نسخه استفاده می‌شود.
     */
    public static function reverseDecreaseByStockId(
        $stockId,
        $quantity
    ) {
        if ($quantity <= 0 || !$stockId) {
            return false;
        }

        return DB::transaction(function () use ($stockId, $quantity) {

            $stock = Stock::lockForUpdate()->find($stockId);

            if (!$stock) {
                Log::warning('Reverse decrease failed: stock not found', [
                    'stock_id' => $stockId,
                ]);
                return false;
            }

            $stock->increment('quantity', $quantity);

            Log::info('Stock reversed to exact batch by stock_id', [
                'stock_id' => $stockId,
                'quantity' => $quantity,
            ]);

            return true;
        });
    }


    // ============================================================
    // جستجوی دارو با Barcode
    // ============================================================
    public static function findMedicationByBarcode($barcode)
    {
        if (!$barcode) {
            return null;
        }

        return Medication::where('barcode', $barcode)->first();
    }


    // ============================================================
    // برگرداندن موجودی (بر اساس پارامترهای بچ - سازگاری قدیمی)
    // ============================================================
    /**
     * این متد برای ویرایش یا حذف خرید استفاده می‌شود.
     *
     * موجودی باید به همان Batch و همان تاریخ انقضا برگردد.
     *
     * ترتیب پارامترها مطابق فراخوانی فعلی ParchasesController:
     * medId, supplierId, expDate, quantity, type, batchNumber
     */
    public static function reverseDecrease(
        $medId,
        $supplierId,
        $expDate,
        $quantity,
        $type = null,
        $batchNumber = null
    ) {
        if ($quantity <= 0) {
            return false;
        }

        return DB::transaction(function () use (
            $medId,
            $supplierId,
            $expDate,
            $quantity,
            $type,
            $batchNumber
        ) {

            $query = Stock::where('med_id', $medId)
                ->where('supplier_id', $supplierId)
                ->where('exp_date', $expDate);

            if ($type === null || $type === '' || $type === 'null') {
                $query->whereNull('type');
            } else {
                $query->where('type', $type);
            }

            if ($batchNumber === null || $batchNumber === '') {
                $query->whereNull('batch_number');
            } else {
                $query->where('batch_number', $batchNumber);
            }

            $stock = $query->lockForUpdate()->first();

            if ($stock) {
                $stock->increment('quantity', $quantity);
            } else {
                // اگر رکورد اصلی دیگر وجود نداشت، همان Batch دوباره ساخته می‌شود
                $stock = Stock::create([
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'exp_date'     => $expDate,
                    'quantity'     => $quantity,
                    'type'         => $type,
                    'batch_number' => $batchNumber,
                ]);
            }

            Log::info('Stock reversed to exact batch', [
                'med_id'       => $medId,
                'supplier_id'  => $supplierId,
                'batch_number' => $batchNumber,
                'exp_date'     => $expDate,
                'type'         => $type,
                'quantity'     => $quantity,
            ]);

            return true;
        });
    }


    // ============================================================
    // بررسی موجودی کافی
    // ============================================================
    public static function check(
        $medId,
        $supplierId,
        $quantity,
        $type = null
    ) {
        $total = self::getAvailableQuantity(
            $medId,
            $supplierId,
            $type
        );

        $isAvailable = $total >= $quantity;

        Log::info('Stock check', [
            'med_id'       => $medId,
            'supplier_id'  => $supplierId,
            'type'         => $type,
            'requested'    => $quantity,
            'available'    => $total,
            'is_available' => $isAvailable,
        ]);

        return $isAvailable;
    }


    // ============================================================
    // بررسی موجودی دارو بدون Supplier
    // ============================================================
    public static function checkByMedication(
        $medId,
        $quantity,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($type !== null && $type !== '' && $type !== 'null') {
            $query->where('type', $type);
        }

        $total = (int) $query->sum('quantity');

        return [
            'available'          => $total >= $quantity,
            'requested_quantity' => (int) $quantity,
            'available_quantity' => $total,
        ];
    }


    // ============================================================
    // دریافت مقدار موجودی یک دارو از یک تأمین‌کننده
    // ============================================================
    public static function getAvailableQuantity(
        $medId,
        $supplierId,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);

        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }

        $total = (int) $query->sum('quantity');

        Log::info('Get available quantity', [
            'med_id'        => $medId,
            'supplier_id'   => $supplierId,
            'type'          => $type,
            'total_quantity'=> $total,
        ]);

        return $total;
    }


    // ============================================================
    // دریافت موجودی یک دارو از یک تأمین‌کننده
    // ============================================================
    public static function getStock(
        $medId,
        $supplierId,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);

        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }

        return $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->get();
    }


    // ============================================================
    // دریافت موجودی کامل برای فروش
    // ============================================================
    public static function getAvailableStockForSales(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($supplierId !== null && $supplierId !== '') {
            $query->where('supplier_id', $supplierId);
        }

        if ($type && $type !== 'null' && $type !== '') {
            $query->where('type', $type);
        }

        $stocks = $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->get();

        return [
            'total_quantity' => (int) $stocks->sum('quantity'),
            'batches' => $stocks->map(function ($stock) {
                return [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,
                    'exp_date'       => $stock->exp_date,
                    'quantity'       => (int) $stock->quantity,
                    'type'           => $stock->type,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price'  => $stock->selling_price,
                ];
            })->values()->toArray(),
        ];
    }


    // ============================================================
    // دریافت Batchهای FEFO برای فروش
    // ============================================================
    public static function getFEFOStock(
        $medId,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($type !== null && $type !== '' && $type !== 'null') {
            $query->where('type', $type);
        }

        return $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->get()
            ->map(function ($stock) {
                return [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,
                    'exp_date'       => $stock->exp_date,
                    'quantity'       => (int) $stock->quantity,
                    'type'           => $stock->type,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price'  => $stock->selling_price,
                ];
            })
            ->values()
            ->toArray();
    }


    // ============================================================
    // متدهای هشدار موجودی
    // ============================================================

    /**
     * دریافت داروهای با موجودی کم
     * بر اساس minimum_quantity از جدول medications
     */
    public static function getLowStockMedications()
    {
        try {

            $medications = Medication::with([
                'stocks' => function ($q) {
                    $q->select(
                        'med_id',
                        DB::raw('SUM(quantity) as total_quantity')
                    )->groupBy('med_id');
                }
            ])->get();

            $lowStockItems = [];

            foreach ($medications as $medication) {

                $totalQuantity = (int) (
                    $medication->stocks
                        ->sum('total_quantity') ?? 0
                );

                $minQuantity = (int) (
                    $medication->minimum_quantity ?? 10
                );

                if ($totalQuantity <= $minQuantity) {

                    $status = $totalQuantity <= 0
                        ? 'ناموجود'
                        : 'موجودی کم';

                    $color = $totalQuantity <= 0
                        ? 'red'
                        : 'orange';

                    $lowStockItems[] = [
                        'med_id'            => $medication->med_id,
                        'med_name'          => $medication->gen_name,
                        'current_stock'     => $totalQuantity,
                        'minimum_quantity'  => $minQuantity,
                        'status'            => $status,
                        'color'             => $color,
                        'need_order'        => max(0, $minQuantity - $totalQuantity),
                        'percentage'        => $totalQuantity > 0
                            ? round(($totalQuantity / $minQuantity) * 100)
                            : 0,
                    ];
                }
            }

            usort($lowStockItems, function ($a, $b) {
                return $a['current_stock'] - $b['current_stock'];
            });

            Log::info('Low stock medications found', [
                'count' => count($lowStockItems),
            ]);

            return $lowStockItems;

        } catch (\Exception $e) {

            Log::error('Error getting low stock medications', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }


    /**
     * بررسی موجودی یک داروی خاص
     */
    public static function checkLowStockByMedication($medId)
    {
        try {

            $medication = Medication::find($medId);

            if (!$medication) {
                return null;
            }

            $totalQuantity = (int) Stock::where('med_id', $medId)->sum('quantity');

            $minQuantity = (int) (
                $medication->minimum_quantity ?? 10
            );

            return [
                'is_low'           => $totalQuantity <= $minQuantity,
                'current_stock'    => $totalQuantity,
                'minimum_quantity' => $minQuantity,
                'need_order'       => max(0, $minQuantity - $totalQuantity),
                'percentage'       => $totalQuantity > 0
                    ? round(($totalQuantity / $minQuantity) * 100)
                    : 0,
            ];

        } catch (\Exception $e) {

            Log::error('Error checking low stock for medication', [
                'med_id' => $medId,
                'error'  => $e->getMessage(),
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

            'total_out_of_stock' => count(
                array_filter($lowStockItems, function ($item) {
                    return $item['status'] === 'ناموجود';
                })
            ),

            'total_low_stock' => count(
                array_filter($lowStockItems, function ($item) {
                    return $item['status'] === 'موجودی کم';
                })
            ),

            'items' => $lowStockItems,
        ];
    }


    /**
     * دریافت هشدارهای فوری
     */
    public static function getCriticalWarnings()
    {
        $lowStockItems = self::getLowStockMedications();

        return array_filter($lowStockItems, function ($item) {
            return $item['current_stock'] <= 0
                || $item['current_stock'] <= 5;
        });
    }


    /**
     * دریافت همه داروها به همراه وضعیت موجودی
     */
    public static function getAllMedicationsStockStatus()
    {
        try {

            $medications = Medication::with([
                'stocks' => function ($q) {
                    $q->select(
                        'med_id',
                        DB::raw('SUM(quantity) as total_quantity')
                    )->groupBy('med_id');
                }
            ])->get();

            $allItems = [];

            foreach ($medications as $medication) {

                $totalQuantity = (int) (
                    $medication->stocks
                        ->sum('total_quantity') ?? 0
                );

                $minQuantity = (int) (
                    $medication->minimum_quantity ?? 10
                );

                $allItems[] = [
                    'med_id'           => $medication->med_id,
                    'med_name'         => $medication->gen_name,
                    'current_stock'    => $totalQuantity,
                    'minimum_quantity' => $minQuantity,
                    'status'           => $totalQuantity <= 0
                        ? 'ناموجود'
                        : ($totalQuantity <= $minQuantity ? 'موجودی کم' : 'موجود'),
                    'color'            => $totalQuantity <= 0
                        ? 'red'
                        : ($totalQuantity <= $minQuantity ? 'orange' : 'green'),
                    'need_order'       => max(0, $minQuantity - $totalQuantity),
                    'percentage'       => $totalQuantity > 0
                        ? round(($totalQuantity / $minQuantity) * 100)
                        : 0,
                ];
            }

            return $allItems;

        } catch (\Exception $e) {

            Log::error('Error getting all medications stock status', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}