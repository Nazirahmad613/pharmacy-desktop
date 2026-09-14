<?php

namespace App\Services;

use App\Models\Stock;
use App\Models\StockSale;
use App\Models\Medication;
use App\Models\PrescriptionItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PrescriptionService
{
    // ============================================================
    // تجویز داروی سیستمی با FEFO
    // ============================================================
    /**
     * تجویز یک قلم دارو از انبار با منطق FEFO
     *
     * @return array آرایه‌ای از PrescriptionItemهای ایجادشده
     */
    public function prescribeItem(
        int $presId,
        int $medId,
        ?int $supplierId,
        int $quantity,
        string $dosage,
        array $extra = []
    ): array {

        if ($quantity <= 0) {
            throw new \Exception('مقدار تجویز باید بیشتر از صفر باشد.');
        }

        return DB::transaction(function () use (
            $presId, $medId, $supplierId, $quantity, $dosage, $extra
        ) {

            // 1️⃣ بارکد از medications
            $medication = Medication::find($medId);
            if (!$medication) {
                throw new \Exception("داروی med_id={$medId} یافت نشد.");
            }
            $barcode = $medication->barcode;

            // ============================================================
            // 🔍 لاگ تشخیصی ۱ — همه stockهای این med_id
            // ============================================================
            $allStocksForMed = Stock::where('med_id', $medId)->get([
                'stock_id', 'supplier_id', 'quantity', 'exp_date', 'type', 'batch_number'
            ])->toArray();

            Log::info('🔍 PRESCRIBE_DEBUG_1', [
                'presId' => $presId,
                'medId' => $medId,
                'supplierId' => $supplierId,
                'quantity' => $quantity,
                'today' => now()->toDateString(),
                'today_format_Ymd' => now()->format('Y-m-d'),
                'all_stocks_for_med' => $allStocksForMed,
            ]);

            // ============================================================
            // 2️⃣ کوئری FEFO
            // ============================================================
            // ⚠️ تغییر مهم: whereDate به where ساده با فرمت Y-m-d
            // دلیل: whereDate توی SQLite گاهی با فرمت datetime کار نمی‌کنه
            // ============================================================
            $stockQuery = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->where('exp_date', '>=', now()->format('Y-m-d'))
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc');

            if ($supplierId) {
                $stockQuery->where('supplier_id', $supplierId);
            }

            $stocks = $stockQuery->lockForUpdate()->get();

            // ============================================================
            // 🔍 لاگ تشخیصی ۲ — نتیجه کوئری FEFO
            // ============================================================
            Log::info('🔍 PRESCRIBE_DEBUG_2', [
                'stocks_found' => $stocks->count(),
                'total_available' => (int) $stocks->sum('quantity'),
                'stocks_data' => $stocks->map(fn($s) => [
                    'stock_id' => $s->stock_id,
                    'supplier_id' => $s->supplier_id,
                    'quantity' => $s->quantity,
                    'exp_date' => $s->exp_date,
                    'type' => $s->type,
                ])->toArray(),
                'sql' => $stockQuery->toSql(),
                'bindings' => $stockQuery->getBindings(),
            ]);

            // 3️⃣ بررسی موجودی کل
            $totalAvailable = (int) $stocks->sum('quantity');

            if ($totalAvailable < $quantity) {
                // 🔍 لاگ تشخیصی ۳ — چرا موجودی کافی نیست
                $allStocksRaw = Stock::where('med_id', $medId)->get()->toArray();
                
                Log::warning('🔍 PRESCRIBE_DEBUG_3_STOCK_NOT_ENOUGH', [
                    'medId' => $medId,
                    'supplierId' => $supplierId,
                    'quantity_requested' => $quantity,
                    'total_available_in_query' => $totalAvailable,
                    'all_stocks_raw' => $allStocksRaw,
                    'query_sql' => $stockQuery->toSql(),
                    'query_bindings' => $stockQuery->getBindings(),
                ]);

                throw new \Exception(
                    "موجودی دوا '{$medication->gen_name}' کافی نیست. " .
                    "درخواستی: {$quantity}، موجود: {$totalAvailable} " .
                    "(medId={$medId}, supplierId=" . ($supplierId ?? 'null') . ")"
                );
            }

            // 4️⃣ کاهش موجودی + ثبت آیتم‌ها
            $remaining = $quantity;
            $createdItems = [];

            foreach ($stocks as $stock) {

                if ($remaining <= 0) {
                    break;
                }

                $availableInBatch = (int) $stock->quantity;
                $usedQuantity = min($availableInBatch, $remaining);

                $stock->decrement('quantity', $usedQuantity);

                $item = PrescriptionItem::create([
                    'pres_id'       => $presId,
                    'category_id'   => $extra['category_id'] ?? null,
                    'med_id'        => $medId,
                    'supplier_id'   => $stock->supplier_id,
                    'stock_id'      => $stock->stock_id,
                    'is_custom'     => false,
                    'med_name'      => null,
                    'supplier_name' => null,
                    'type'          => $stock->type ?? ($extra['type'] ?? null),
                    'barcode'       => $barcode,
                    'batch_number'  => $stock->batch_number,
                    'dosage'        => $dosage,
                    'quantity'      => $usedQuantity,
                    'remarks'       => $extra['remarks'] ?? null,
                ]);

                StockSale::create([
                    'stock_id'      => $stock->stock_id,
                    'pres_it_id'    => $item->pres_it_id,
                    'pres_id'       => $presId,
                    'med_id'        => $medId,
                    'supplier_id'   => $stock->supplier_id,
                    'barcode'       => $barcode,
                    'batch_number'  => $stock->batch_number,
                    'exp_date'      => $stock->exp_date,
                    'quantity_sold' => $usedQuantity,
                    'unit_price'    => $stock->selling_price,
                    'total_price'   => $stock->selling_price
                                        ? $stock->selling_price * $usedQuantity
                                        : null,
                    'sold_at'       => now(),
                ]);

                $createdItems[] = $item;
                $remaining -= $usedQuantity;

                Log::info('PrescriptionItem created from batch', [
                    'pres_id'      => $presId,
                    'pres_it_id'   => $item->pres_it_id,
                    'stock_id'     => $stock->stock_id,
                    'batch_number' => $stock->batch_number,
                    'exp_date'     => $stock->exp_date,
                    'quantity'     => $usedQuantity,
                ]);
            }

            return $createdItems;
        });
    }


    // ============================================================
    // تجویز داروی دستی (خارج از سیستم)
    // ============================================================
    public function prescribeCustomItem(
        int $presId,
        string $medName,
        string $supplierName,
        int $quantity,
        string $dosage,
        array $extra = []
    ): PrescriptionItem {

        if ($quantity <= 0) {
            throw new \Exception('مقدار تجویز باید بیشتر از صفر باشد.');
        }

        if (empty($medName)) {
            throw new \Exception('نام داروی دستی الزامی است.');
        }

        return PrescriptionItem::create([
            'pres_id'       => $presId,
            'category_id'   => $extra['category_id'] ?? null,
            'med_id'        => null,
            'supplier_id'   => null,
            'stock_id'      => null,
            'is_custom'     => true,
            'med_name'      => $medName,
            'supplier_name' => $supplierName,
            'type'          => $extra['type'] ?? null,
            'barcode'       => null,
            'batch_number'  => null,
            'dosage'        => $dosage,
            'quantity'      => $quantity,
            'remarks'       => $extra['remarks'] ?? null,
        ]);
    }


    // ============================================================
    // تجویز بر اساس بارکد
    // ============================================================
    public function prescribeByBarcode(
        int $presId,
        string $barcode,
        ?int $supplierId,
        int $quantity,
        string $dosage,
        array $extra = []
    ): array {

        $medication = Medication::where('barcode', $barcode)->first();

        if (!$medication) {
            throw new \Exception("دارویی با بارکد '{$barcode}' یافت نشد.");
        }

        return $this->prescribeItem(
            $presId,
            $medication->med_id,
            $supplierId,
            $quantity,
            $dosage,
            $extra
        );
    }


    // ============================================================
    // برگرداندن موجودی هنگام ویرایش/حذف نسخه
    // ============================================================
    public function restorePrescriptionItems(int $presId): int
    {
        return DB::transaction(function () use ($presId) {

            $items = PrescriptionItem::where('pres_id', $presId)
                ->where('is_custom', false)
                ->whereNotNull('stock_id')
                ->lockForUpdate()
                ->get();

            $restoredCount = 0;

            foreach ($items as $item) {

                $stock = Stock::lockForUpdate()->find($item->stock_id);

                if ($stock) {
                    $stock->increment('quantity', $item->quantity);

                    Log::info('Stock restored from prescription item', [
                        'pres_it_id' => $item->pres_it_id,
                        'stock_id'   => $stock->stock_id,
                        'quantity'   => $item->quantity,
                    ]);

                    $restoredCount++;
                } else {
                    Log::warning('Stock not found for restore', [
                        'pres_it_id' => $item->pres_it_id,
                        'stock_id'   => $item->stock_id,
                    ]);
                }

                StockSale::where('pres_it_id', $item->pres_it_id)->delete();
            }

            PrescriptionItem::where('pres_id', $presId)->delete();

            Log::info('Prescription items restored', [
                'pres_id'        => $presId,
                'restored_count' => $restoredCount,
            ]);

            return $restoredCount;
        });
    }


    // ============================================================
    // پیش‌نمایش بچ‌های مصرفی
    // ============================================================
    public function previewBatches(
        int $medId,
        ?int $supplierId,
        int $quantity,
        ?string $type = null
    ): array {

        $medication = Medication::find($medId);
        if (!$medication) {
            return [
                'success' => false,
                'message' => 'دارو یافت نشد.',
                'batches' => [],
            ];
        }

        // ⚠️ whereDate → where
        $query = Stock::where('med_id', $medId)
            ->where('quantity', '>', 0)
            ->where('exp_date', '>=', now()->format('Y-m-d'))
            ->orderBy('exp_date', 'asc')
            ->orderBy('stock_id', 'asc');

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        $stocks = $query->get();

        $totalAvailable = (int) $stocks->sum('quantity');

        if ($totalAvailable < $quantity) {
            return [
                'success'            => false,
                'message'            => 'موجودی کافی نیست.',
                'med_id'             => $medId,
                'med_name'           => $medication->gen_name,
                'barcode'            => $medication->barcode,
                'requested_quantity' => $quantity,
                'available_quantity' => $totalAvailable,
                'batches'            => [],
            ];
        }

        $remaining = $quantity;
        $previewBatches = [];

        foreach ($stocks as $stock) {
            if ($remaining <= 0) {
                break;
            }

            $usedQuantity = min((int) $stock->quantity, $remaining);

            $previewBatches[] = [
                'stock_id'       => $stock->stock_id,
                'barcode'        => $medication->barcode,
                'med_id'         => $stock->med_id,
                'med_name'       => $medication->gen_name,
                'supplier_id'    => $stock->supplier_id,
                'batch_number'   => $stock->batch_number,
                'exp_date'       => $stock->exp_date,
                'type'           => $stock->type,
                'quantity'       => $usedQuantity,
                'selling_price'  => $stock->selling_price,
            ];

            $remaining -= $usedQuantity;
        }

        return [
            'success'            => true,
            'med_id'             => $medId,
            'med_name'           => $medication->gen_name,
            'barcode'            => $medication->barcode,
            'requested_quantity' => $quantity,
            'available_quantity' => $totalAvailable,
            'batches'            => $previewBatches,
        ];
    }


    // ============================================================
    // پیش‌نمایش چند قلم
    // ============================================================
    public function previewItems(array $items): array
    {
        $results = [];
        $hasError = false;

        foreach ($items as $index => $item) {

            if (!empty($item['is_custom'])) {
                $results[] = [
                    'index'       => $index,
                    'is_custom'   => true,
                    'med_name'    => $item['med_name'] ?? null,
                    'success'     => true,
                    'batches'     => [],
                ];
                continue;
            }

            $preview = $this->previewBatches(
                $item['med_id'],
                $item['supplier_id'] ?? null,
                $item['quantity'],
                $item['type'] ?? null
            );

            $preview['index'] = $index;
            $preview['is_custom'] = false;

            if (!$preview['success']) {
                $hasError = true;
            }

            $results[] = $preview;
        }

        return [
            'success'   => !$hasError,
            'message'   => $hasError
                ? 'برخی از اقلام موجودی کافی ندارند.'
                : 'همه اقلام موجودی کافی دارند.',
            'items'     => $results,
        ];
    }


    // ============================================================
    // تجویز چند قلم
    // ============================================================
    public function prescribeItems(int $presId, array $items): array
    {
        return DB::transaction(function () use ($presId, $items) {

            $allCreatedItems = [];

            foreach ($items as $item) {

                $isCustom = !empty($item['is_custom']);

                if ($isCustom) {
                    $created = $this->prescribeCustomItem(
                        $presId,
                        $item['med_name'] ?? '',
                        $item['supplier_name'] ?? '',
                        $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'type'        => $item['type'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                    $allCreatedItems[] = $created;
                } else {
                    $created = $this->prescribeItem(
                        $presId,
                        $item['med_id'],
                        $item['supplier_id'] ?? null,
                        $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                    $allCreatedItems = array_merge($allCreatedItems, $created);
                }
            }

            return $allCreatedItems;
        });
    }
}