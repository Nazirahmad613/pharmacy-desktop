<?php

namespace App\Services;

use App\Models\Stock;
use App\Models\Medication;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockService
{
    /**
     * ============================================================
     * افزایش موجودی
     * ============================================================
     *
     * ورود کالا به انبار.
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
        $sellingPrice = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('supplier_id', $supplierId)
            ->where('exp_date', $expDate)
            ->where('type', $type);

        /*
         * Batch Number
         *
         * اگر batch_number خالی باشد، فقط رکوردی که
         * batch_number آن NULL است انتخاب می‌شود.
         */
        if ($batchNumber === null || $batchNumber === '') {
            $query->whereNull('batch_number');
        } else {
            $query->where('batch_number', $batchNumber);
        }

        $stock = $query->first();

        if ($stock) {

            $stock->increment('quantity', $quantity);

            /*
             * اگر قیمت جدید ارسال شده باشد، قیمت Batch را
             * به‌روزرسانی می‌کنیم.
             */
            $updateData = [];

            if ($purchasePrice !== null) {
                $updateData['purchase_price'] = $purchasePrice;
            }

            if ($sellingPrice !== null) {
                $updateData['selling_price'] = $sellingPrice;
            }

            if (!empty($updateData)) {
                $stock->update($updateData);
            }

        } else {

            Stock::create([
                'med_id'         => $medId,
                'supplier_id'    => $supplierId,
                'exp_date'       => $expDate,
                'quantity'       => $quantity,
                'type'           => $type,
                'batch_number'   => $batchNumber,
                'purchase_price' => $purchasePrice,
                'selling_price'  => $sellingPrice,
            ]);
        }

        Log::info('Stock increased', [
            'med_id'         => $medId,
            'supplier_id'    => $supplierId,
            'batch_number'   => $batchNumber,
            'exp_date'       => $expDate,
            'type'           => $type,
            'quantity'       => $quantity,
            'purchase_price' => $purchasePrice,
            'selling_price'  => $sellingPrice,
        ]);

        return true;
    }


    /**
     * ============================================================
     * کاهش موجودی
     * ============================================================
     *
     * کاهش موجودی بر اساس FEFO:
     *
     * First Expired, First Out
     *
     * یعنی دارویی که تاریخ انقضای آن نزدیک‌تر است،
     * اول مصرف می‌شود.
     *
     * این متد برای سازگاری با ساختار فعلی نگهداری شده است
     * و خروج را بر اساس Supplier انجام می‌دهد.
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
                    'med_id'     => $medId,
                    'supplier_id'=> $supplierId,
                    'type'       => $type,
                    'requested'  => $quantity,
                    'available'  => $totalAvailable,
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

                $stock->decrement(
                    'quantity',
                    $decreaseAmount
                );

                $remainingToDecrease -= $decreaseAmount;
            }

            Log::info('Stock decreased using FEFO', [
                'med_id'    => $medId,
                'supplier_id' => $supplierId,
                'type'      => $type,
                'quantity'  => $quantity,
            ]);

            return true;
        });
    }


    /**
     * ============================================================
     * کاهش موجودی برای فروش / نسخه
     * ============================================================
     *
     * این متد Supplier را اجباری نمی‌کند.
     *
     * جریان:
     *
     * Barcode
     *    ↓
     * Medication
     *    ↓
     * med_id
     *    ↓
     * Stock Lots
     *    ↓
     * FEFO
     *
     * اگر یک Batch کافی نباشد، Batch بعدی مصرف می‌شود.
     *
     * مثال:
     *
     * Batch 1 = 10
     * Batch 2 = 25
     *
     * درخواست = 15
     *
     * نتیجه:
     * Batch 1 = 0
     * Batch 2 = 20
     *
     * خروجی متد، Batchهایی را که واقعاً مصرف شده‌اند
     * برمی‌گرداند تا بعداً بتوانیم برای Prescription/Sales
     * جدول واسط ثبت کنیم.
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

            /*
             * فقط Batchهای موجود و غیرمنقضی.
             */
            $query = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate(
                    'exp_date',
                    '>=',
                    now()->toDateString()
                );

            if ($type !== null && $type !== '' && $type !== 'null') {
                $query->where('type', $type);
            }

            /*
             * FEFO:
             * نزدیک‌ترین تاریخ انقضا اول.
             */
            $stocks = $query
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {

                Log::warning(
                    'FEFO stock decrease failed',
                    [
                        'med_id'    => $medId,
                        'type'      => $type,
                        'requested' => $quantity,
                        'available' => $totalAvailable,
                    ]
                );

                return [
                    'success' => false,
                    'message' => 'موجودی کافی نیست.',
                    'med_id' => $medId,
                    'requested_quantity' => $quantity,
                    'available_quantity' => $totalAvailable,
                    'batches' => [],
                ];
            }

            $remaining = $quantity;
            $usedBatches = [];

            foreach ($stocks as $stock) {

                if ($remaining <= 0) {
                    break;
                }

                $availableInBatch = (int) $stock->quantity;

                $usedQuantity = min(
                    $availableInBatch,
                    $remaining
                );

                $stock->decrement(
                    'quantity',
                    $usedQuantity
                );

                $usedBatches[] = [
                    'stock_id' => $stock->stock_id,
                    'med_id' => $stock->med_id,
                    'supplier_id' => $stock->supplier_id,
                    'batch_number' => $stock->batch_number,
                    'exp_date' => $stock->exp_date,
                    'type' => $stock->type,
                    'quantity' => $usedQuantity,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price' => $stock->selling_price,
                ];

                $remaining -= $usedQuantity;
            }

            Log::info(
                'Stock decreased by medication using FEFO',
                [
                    'med_id' => $medId,
                    'type' => $type,
                    'requested_quantity' => $quantity,
                    'batches_used' => $usedBatches,
                ]
            );

            return [
                'success' => true,
                'message' => 'موجودی با موفقیت از انبار خارج شد.',
                'med_id' => $medId,
                'requested_quantity' => $quantity,
                'dispensed_quantity' => $quantity,
                'batches' => $usedBatches,
            ];
        });
    }


    /**
     * ============================================================
     * کاهش موجودی بر اساس Barcode
     * ============================================================
     *
     * Barcode از جدول medications خوانده می‌شود.
     *
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

        $medication = Medication::where(
            'barcode',
            $barcode
        )->first();

        if (!$medication) {

            Log::warning(
                'Medication not found by barcode',
                [
                    'barcode' => $barcode,
                ]
            );

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

        $result['barcode'] = $barcode;
        $result['med_id'] = $medication->med_id;
        $result['med_name'] = $medication->gen_name;

        return $result;
    }


    /**
     * ============================================================
     * جستجوی دارو با Barcode
     * ============================================================
     */
    public static function findMedicationByBarcode($barcode)
    {
        if (!$barcode) {
            return null;
        }

        return Medication::where(
            'barcode',
            $barcode
        )->first();
    }


    /**
     * ============================================================
     * برگرداندن موجودی
     * ============================================================
     *
     * این متد برای ویرایش یا حذف خرید استفاده می‌شود.
     *
     * مهم:
     * موجودی باید به همان Batch و همان تاریخ انقضا
     * برگردد؛ نه به یک Batch تصادفی.
     *
     * ترتیب پارامترها مطابق فراخوانی فعلی ParchasesController
     * نگه داشته شده است:
     *
     * medId
     * supplierId
     * expDate
     * quantity
     * type
     * batchNumber
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

            /*
             * type را دقیقاً بررسی می‌کنیم.
             */
            if ($type === null || $type === '' || $type === 'null') {
                $query->whereNull('type');
            } else {
                $query->where('type', $type);
            }

            /*
             * Batch را نیز دقیقاً بررسی می‌کنیم.
             */
            if ($batchNumber === null || $batchNumber === '') {
                $query->whereNull('batch_number');
            } else {
                $query->where(
                    'batch_number',
                    $batchNumber
                );
            }

            $stock = $query
                ->lockForUpdate()
                ->first();

            if ($stock) {

                $stock->increment(
                    'quantity',
                    $quantity
                );

            } else {

                /*
                 * اگر رکورد اصلی دیگر وجود نداشت،
                 * همان Batch دوباره ساخته می‌شود.
                 */
                $stock = Stock::create([
                    'med_id' => $medId,
                    'supplier_id' => $supplierId,
                    'exp_date' => $expDate,
                    'quantity' => $quantity,
                    'type' => $type,
                    'batch_number' => $batchNumber,
                ]);
            }

            Log::info(
                'Stock reversed to exact batch',
                [
                    'med_id' => $medId,
                    'supplier_id' => $supplierId,
                    'batch_number' => $batchNumber,
                    'exp_date' => $expDate,
                    'type' => $type,
                    'quantity' => $quantity,
                ]
            );

            return true;
        });
    }


    /**
     * ============================================================
     * بررسی موجودی کافی
     * ============================================================
     */
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

        Log::info(
            'Stock check',
            [
                'med_id' => $medId,
                'supplier_id' => $supplierId,
                'type' => $type,
                'requested' => $quantity,
                'available' => $total,
                'is_available' => $isAvailable,
            ]
        );

        return $isAvailable;
    }


    /**
     * ============================================================
     * بررسی موجودی دارو بدون Supplier
     * ============================================================
     *
     * برای فروش و نسخه مناسب است.
     */
    public static function checkByMedication(
        $medId,
        $quantity,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate(
                'exp_date',
                '>=',
                now()->toDateString()
            );

        if ($type !== null && $type !== '' && $type !== 'null') {
            $query->where('type', $type);
        }

        $total = (int) $query->sum('quantity');

        return [
            'available' => $total >= $quantity,
            'requested_quantity' => (int) $quantity,
            'available_quantity' => $total,
        ];
    }


    /**
     * ============================================================
     * دریافت مقدار موجودی یک دارو از یک تأمین‌کننده
     * ============================================================
     */
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

        Log::info(
            'Get available quantity',
            [
                'med_id' => $medId,
                'supplier_id' => $supplierId,
                'type' => $type,
                'total_quantity' => $total,
            ]
        );

        return $total;
    }


    /**
     * ============================================================
     * دریافت موجودی یک دارو از یک تأمین‌کننده
     * ============================================================
     */
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


    /**
     * ============================================================
     * دریافت موجودی کامل برای فروش
     * ============================================================
     *
     * اگر supplierId ارسال شود، همان Supplier فیلتر می‌شود.
     * اگر null باشد، موجودی همه Supplierها بررسی می‌شود.
     *
     * فقط Batchهای غیرمنقضی و دارای موجودی نشان داده می‌شوند.
     */
    public static function getAvailableStockForSales(
        $medId,
        $supplierId = null,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate(
                'exp_date',
                '>=',
                now()->toDateString()
            );

        if ($supplierId !== null && $supplierId !== '') {
            $query->where(
                'supplier_id',
                $supplierId
            );
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

            'batches' => $stocks->map(
                function ($stock) {
                    return [
                        'stock_id' => $stock->stock_id,
                        'med_id' => $stock->med_id,
                        'supplier_id' => $stock->supplier_id,
                        'batch_number' => $stock->batch_number,
                        'exp_date' => $stock->exp_date,
                        'quantity' => (int) $stock->quantity,
                        'type' => $stock->type,
                        'purchase_price' => $stock->purchase_price,
                        'selling_price' => $stock->selling_price,
                    ];
                }
            )->values()->toArray(),
        ];
    }


    /**
     * ============================================================
     * دریافت Batchهای FEFO برای فروش
     * ============================================================
     *
     * برای نمایش در صفحه فروش/نسخه.
     */
    public static function getFEFOStock(
        $medId,
        $type = null
    ) {
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->whereDate(
                'exp_date',
                '>=',
                now()->toDateString()
            );

        if ($type !== null && $type !== '' && $type !== 'null') {
            $query->where('type', $type);
        }

        return $query
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc')
            ->get()
            ->map(function ($stock) {
                return [
                    'stock_id' => $stock->stock_id,
                    'med_id' => $stock->med_id,
                    'supplier_id' => $stock->supplier_id,
                    'batch_number' => $stock->batch_number,
                    'exp_date' => $stock->exp_date,
                    'quantity' => (int) $stock->quantity,
                    'type' => $stock->type,
                    'purchase_price' => $stock->purchase_price,
                    'selling_price' => $stock->selling_price,
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
                        DB::raw(
                            'SUM(quantity) as total_quantity'
                        )
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

                        'med_id' => $medication->med_id,

                        'med_name' => $medication->gen_name,

                        'current_stock' => $totalQuantity,

                        'minimum_quantity' => $minQuantity,

                        'status' => $status,

                        'color' => $color,

                        'need_order' => max(
                            0,
                            $minQuantity - $totalQuantity
                        ),

                        'percentage' => $totalQuantity > 0
                            ? round(
                                ($totalQuantity / $minQuantity) * 100
                            )
                            : 0,
                    ];
                }
            }

            usort(
                $lowStockItems,
                function ($a, $b) {
                    return $a['current_stock']
                        - $b['current_stock'];
                }
            );

            Log::info(
                'Low stock medications found',
                [
                    'count' => count($lowStockItems),
                ]
            );

            return $lowStockItems;

        } catch (\Exception $e) {

            Log::error(
                'Error getting low stock medications',
                [
                    'error' => $e->getMessage(),
                ]
            );

            return [];
        }
    }


    /**
     * بررسی موجودی یک داروی خاص
     */
    public static function checkLowStockByMedication(
        $medId
    ) {
        try {

            $medication = Medication::find($medId);

            if (!$medication) {
                return null;
            }

            $totalQuantity = (int) Stock::where(
                'med_id',
                $medId
            )->sum('quantity');

            $minQuantity = (int) (
                $medication->minimum_quantity ?? 10
            );

            return [

                'is_low' => $totalQuantity <= $minQuantity,

                'current_stock' => $totalQuantity,

                'minimum_quantity' => $minQuantity,

                'need_order' => max(
                    0,
                    $minQuantity - $totalQuantity
                ),

                'percentage' => $totalQuantity > 0
                    ? round(
                        ($totalQuantity / $minQuantity) * 100
                    )
                    : 0,
            ];

        } catch (\Exception $e) {

            Log::error(
                'Error checking low stock for medication',
                [
                    'med_id' => $medId,
                    'error' => $e->getMessage(),
                ]
            );

            return null;
        }
    }


    /**
     * دریافت آمار کلی موجودی کم
     */
    public static function getLowStockSummary()
    {
        $lowStockItems =
            self::getLowStockMedications();

        return [

            'total_low_stock_items' =>
                count($lowStockItems),

            'total_out_of_stock' =>
                count(
                    array_filter(
                        $lowStockItems,
                        function ($item) {
                            return $item['status'] === 'ناموجود';
                        }
                    )
                ),

            'total_low_stock' =>
                count(
                    array_filter(
                        $lowStockItems,
                        function ($item) {
                            return $item['status'] === 'موجودی کم';
                        }
                    )
                ),

            'items' => $lowStockItems,
        ];
    }


    /**
     * دریافت هشدارهای فوری
     */
    public static function getCriticalWarnings()
    {
        $lowStockItems =
            self::getLowStockMedications();

        return array_filter(
            $lowStockItems,
            function ($item) {
                return $item['current_stock'] <= 0
                    || $item['current_stock'] <= 5;
            }
        );
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
                        DB::raw(
                            'SUM(quantity) as total_quantity'
                        )
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

                    'med_id' =>
                        $medication->med_id,

                    'med_name' =>
                        $medication->gen_name,

                    'current_stock' =>
                        $totalQuantity,

                    'minimum_quantity' =>
                        $minQuantity,

                    'status' =>
                        $totalQuantity <= 0
                            ? 'ناموجود'
                            : (
                                $totalQuantity <= $minQuantity
                                    ? 'موجودی کم'
                                    : 'موجود'
                            ),

                    'color' =>
                        $totalQuantity <= 0
                            ? 'red'
                            : (
                                $totalQuantity <= $minQuantity
                                    ? 'orange'
                                    : 'green'
                            ),

                    'need_order' =>
                        max(
                            0,
                            $minQuantity - $totalQuantity
                        ),

                    'percentage' =>
                        $totalQuantity > 0
                            ? round(
                                ($totalQuantity / $minQuantity) * 100
                            )
                            : 0,
                ];
            }

            return $allItems;

        } catch (\Exception $e) {

            Log::error(
                'Error getting all medications stock status',
                [
                    'error' => $e->getMessage(),
                ]
            );

            return [];
        }
    }
}
