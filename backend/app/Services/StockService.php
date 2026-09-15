<?php

namespace App\Services;

use App\Models\Stock;
use App\Models\Medication;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;

class StockService
{
    // ============================================================
    // ابزارهای کمکی داخلی
    // ============================================================

    /**
     * نرمال‌سازی رشته‌ها (type / batch_number)
     */
    private static function normalizeString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '' || strtolower($value) === 'null') {
            return null;
        }

        return $value;
    }

    /**
     * نرمال‌سازی تاریخ به فرمت Y-m-d
     */
    private static function normalizeDate($date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }

        if ($date instanceof \DateTimeInterface) {
            return $date->format('Y-m-d');
        }

        $ts = strtotime((string) $date);

        return $ts ? date('Y-m-d', $ts) : null;
    }

    /**
     * تشخیص خطای Unique
     */
    private static function isUniqueViolation(QueryException $e): bool
    {
        $sqlState   = $e->errorInfo[0] ?? null;
        $driverCode = $e->errorInfo[1] ?? null;

        return $sqlState === '23000'
            || $sqlState === '23505'
            || $driverCode === 19
            || $driverCode === 1062;
    }

    /**
     * ساخت کوئری پایه بر اساس کلید Unique واقعی
     * (بدون batch_number چون در unique نیست)
     */
    private static function baseUniqueQuery($medId, $supplierId, $expDate, $type)
    {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->whereDate('exp_date', $expDate);

        if ($type === null) {
            $query->whereNull('type');
        } else {
            $query->where('type', $type);
        }

        return $query;
    }


    // ============================================================
    // افزایش موجودی
    // ============================================================
    public static function increase(
        $medId,
        $supplierId,
        $expDate,
        $quantity,
        $type = null,
        $batchNumber = null,
        $purchasePrice = null,
        $sellingPrice = null,
        $purchaseItemId = null
    ) {
        $normalizedType    = self::normalizeString($type);
        $normalizedBatch   = self::normalizeString($batchNumber);
        $normalizedExpDate = self::normalizeDate($expDate);

        return DB::transaction(function () use (
            $medId, $supplierId, $normalizedExpDate, $quantity,
            $normalizedType, $normalizedBatch,
            $purchasePrice, $sellingPrice, $purchaseItemId
        ) {
            $stock = self::baseUniqueQuery(
                $medId, $supplierId, $normalizedExpDate, $normalizedType
            )->lockForUpdate()->first();

            if ($stock) {
                $stock->increment('quantity', $quantity);

                $updateData = [];

                if ($purchasePrice !== null)   $updateData['purchase_price']   = $purchasePrice;
                if ($sellingPrice !== null)    $updateData['selling_price']    = $sellingPrice;
                if ($normalizedBatch !== null) $updateData['batch_number']     = $normalizedBatch;
                if ($purchaseItemId !== null)  $updateData['purchase_item_id'] = $purchaseItemId;

                if (!empty($updateData)) {
                    $stock->update($updateData);
                }

                Log::info('Stock increased (updated)', [
                    'stock_id'     => $stock->stock_id,
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'batch_number' => $normalizedBatch,
                    'exp_date'     => $normalizedExpDate,
                    'type'         => $normalizedType,
                    'quantity'     => $quantity,
                ]);

                return true;
            }

            try {
                Stock::create([
                    'med_id'           => $medId,
                    'supplier_id'      => $supplierId,
                    'exp_date'         => $normalizedExpDate,
                    'quantity'         => $quantity,
                    'type'             => $normalizedType,
                    'batch_number'     => $normalizedBatch,
                    'purchase_price'   => $purchasePrice,
                    'selling_price'    => $sellingPrice,
                    'purchase_item_id' => $purchaseItemId,
                ]);

                Log::info('Stock increased (created)', [
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'batch_number' => $normalizedBatch,
                    'exp_date'     => $normalizedExpDate,
                    'type'         => $normalizedType,
                    'quantity'     => $quantity,
                ]);
            } catch (QueryException $e) {
                if (self::isUniqueViolation($e)) {
                    $existing = self::baseUniqueQuery(
                        $medId, $supplierId, $normalizedExpDate, $normalizedType
                    )->lockForUpdate()->first();

                    if ($existing) {
                        $existing->increment('quantity', $quantity);

                        if ($normalizedBatch !== null) {
                            $existing->update(['batch_number' => $normalizedBatch]);
                        }

                        Log::info('Stock increased (race condition caught)', [
                            'stock_id'    => $existing->stock_id,
                            'med_id'      => $medId,
                            'supplier_id' => $supplierId,
                            'quantity'    => $quantity,
                        ]);

                        return true;
                    }
                }

                throw $e;
            }

            return true;
        });
    }


    // ============================================================
    // کاهش موجودی (با Supplier - سازگاری با کد قدیمی)
    // ============================================================
    public static function decrease(
        $medId,
        $supplierId,
        $quantity,
        $type = null
    ) {
        if ($quantity <= 0) {
            return false;
        }

        $normalizedType = self::normalizeString($type);

        return DB::transaction(function () use (
            $medId, $supplierId, $quantity, $normalizedType
        ) {
            $query = Stock::where('med_id', $medId)
                ->where('supplier_id', $supplierId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString());

            if ($normalizedType === null) {
                $query->whereNull('type');
            } else {
                $query->where('type', $normalizedType);
            }

            $stocks = $query
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {
                Log::warning('Stock decrease failed', [
                    'med_id'      => $medId,
                    'supplier_id' => $supplierId,
                    'type'        => $normalizedType,
                    'requested'   => $quantity,
                    'available'   => $totalAvailable,
                ]);

                return false;
            }

            $remaining = $quantity;

            foreach ($stocks as $stock) {
                if ($remaining <= 0) break;

                $used = min((int) $stock->quantity, $remaining);
                $stock->decrement('quantity', $used);
                $remaining -= $used;
            }

            Log::info('Stock decreased using FEFO', [
                'med_id'      => $medId,
                'supplier_id' => $supplierId,
                'type'        => $normalizedType,
                'quantity'    => $quantity,
            ]);

            return true;
        });
    }


    // ============================================================
    // کاهش موجودی بر اساس Medication (FEFO چند بچی)
    // ============================================================
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

        $normalizedType = self::normalizeString($type);

        return DB::transaction(function () use (
            $medId, $quantity, $normalizedType
        ) {
            $medication = Medication::find($medId);
            $barcode = $medication->barcode ?? null;

            $query = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', now()->toDateString());

            if ($normalizedType !== null) {
                $query->where('type', $normalizedType);
            }

            $stocks = $query
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {
                Log::warning('FEFO stock decrease failed', [
                    'med_id'    => $medId,
                    'type'      => $normalizedType,
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
                if ($remaining <= 0) break;

                $availableInBatch = (int) $stock->quantity;
                $usedQuantity     = min($availableInBatch, $remaining);

                $stock->decrement('quantity', $usedQuantity);

                $usedBatches[] = [
                    'stock_id'       => $stock->stock_id,
                    'med_id'         => $stock->med_id,
                    'med_name'       => $medication->gen_name ?? null,
                    'barcode'        => $barcode,
                    'supplier_id'    => $stock->supplier_id,
                    'batch_number'   => $stock->batch_number,
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
                'type'               => $normalizedType,
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
    // دریافت اطلاعات بچ بعدی (FEFO) برای فرم تجویز
    // ============================================================
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
    // برگرداندن موجودی به بچ مشخص (با stock_id)
    // ============================================================
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

        $normalizedType    = self::normalizeString($type);
        $normalizedBatch   = self::normalizeString($batchNumber);
        $normalizedExpDate = self::normalizeDate($expDate);

        return DB::transaction(function () use (
            $medId, $supplierId, $normalizedExpDate, $quantity,
            $normalizedType, $normalizedBatch
        ) {
            $stock = self::baseUniqueQuery(
                $medId, $supplierId, $normalizedExpDate, $normalizedType
            )->lockForUpdate()->first();

            if ($stock) {
                $stock->increment('quantity', $quantity);

                if ($normalizedBatch !== null) {
                    $stock->update(['batch_number' => $normalizedBatch]);
                }

                Log::info('Stock reversed (updated)', [
                    'stock_id'     => $stock->stock_id,
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'batch_number' => $normalizedBatch,
                    'exp_date'     => $normalizedExpDate,
                    'type'         => $normalizedType,
                    'quantity'     => $quantity,
                ]);

                return true;
            }

            try {
                Stock::create([
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'exp_date'     => $normalizedExpDate,
                    'quantity'     => $quantity,
                    'type'         => $normalizedType,
                    'batch_number' => $normalizedBatch,
                ]);

                Log::info('Stock reversed (created)', [
                    'med_id'       => $medId,
                    'supplier_id'  => $supplierId,
                    'batch_number' => $normalizedBatch,
                    'exp_date'     => $normalizedExpDate,
                    'type'         => $normalizedType,
                    'quantity'     => $quantity,
                ]);
            } catch (QueryException $e) {
                if (self::isUniqueViolation($e)) {
                    $existing = self::baseUniqueQuery(
                        $medId, $supplierId, $normalizedExpDate, $normalizedType
                    )->lockForUpdate()->first();

                    if ($existing) {
                        $existing->increment('quantity', $quantity);

                        if ($normalizedBatch !== null) {
                            $existing->update(['batch_number' => $normalizedBatch]);
                        }

                        Log::info('Stock reversed (race condition caught)', [
                            'stock_id'    => $existing->stock_id,
                            'med_id'      => $medId,
                            'supplier_id' => $supplierId,
                            'quantity'    => $quantity,
                        ]);

                        return true;
                    }
                }

                throw $e;
            }

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
        $total = self::getAvailableQuantity($medId, $supplierId, $type);
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
        $normalizedType = self::normalizeString($type);

        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($normalizedType !== null) {
            $query->where('type', $normalizedType);
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
        $normalizedType = self::normalizeString($type);

        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);

        if ($normalizedType !== null) {
            $query->where('type', $normalizedType);
        }

        $total = (int) $query->sum('quantity');

        Log::info('Get available quantity', [
            'med_id'         => $medId,
            'supplier_id'    => $supplierId,
            'type'           => $normalizedType,
            'total_quantity' => $total,
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
        $normalizedType = self::normalizeString($type);

        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId);

        if ($normalizedType !== null) {
            $query->where('type', $normalizedType);
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
        $normalizedType = self::normalizeString($type);

        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($supplierId !== null && $supplierId !== '') {
            $query->where('supplier_id', $supplierId);
        }

        if ($normalizedType !== null) {
            $query->where('type', $normalizedType);
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
        $normalizedType = self::normalizeString($type);

        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate('exp_date', '>=', now()->toDateString());

        if ($normalizedType !== null) {
            $query->where('type', $normalizedType);
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
                    $medication->stocks->sum('total_quantity') ?? 0
                );

                $minQuantity = (int) ($medication->minimum_quantity ?? 10);

                if ($totalQuantity <= $minQuantity) {
                    $status = $totalQuantity <= 0 ? 'ناموجود' : 'موجودی کم';
                    $color  = $totalQuantity <= 0 ? 'red' : 'orange';

                    $lowStockItems[] = [
                        'med_id'           => $medication->med_id,
                        'med_name'         => $medication->gen_name,
                        'current_stock'    => $totalQuantity,
                        'minimum_quantity' => $minQuantity,
                        'status'           => $status,
                        'color'            => $color,
                        'need_order'       => max(0, $minQuantity - $totalQuantity),
                        'percentage'       => $totalQuantity > 0
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


    public static function checkLowStockByMedication($medId)
    {
        try {
            $medication = Medication::find($medId);

            if (!$medication) {
                return null;
            }

            $totalQuantity = (int) Stock::where('med_id', $medId)->sum('quantity');
            $minQuantity   = (int) ($medication->minimum_quantity ?? 10);

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


    public static function getCriticalWarnings()
    {
        $lowStockItems = self::getLowStockMedications();

        return array_filter($lowStockItems, function ($item) {
            return $item['current_stock'] <= 0 || $item['current_stock'] <= 5;
        });
    }


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
                    $medication->stocks->sum('total_quantity') ?? 0
                );

                $minQuantity = (int) ($medication->minimum_quantity ?? 10);

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