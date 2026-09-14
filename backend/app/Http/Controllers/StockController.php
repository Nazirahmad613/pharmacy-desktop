<?php

// app/Http/Controllers/StockController.php

namespace App\Http\Controllers;

use App\Models\Stock;
use App\Models\Medication;
use App\Models\Parchaseitem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StockController extends Controller
{
    /**
     * ============================================================
     * نمایش لیست کامل موجودی
     * ============================================================
     *
     * نام تأمین‌کننده از جدول accounts
     * شماره Batch و قیمت خرید از جدول parchaseitems (آخرین خرید)
     */
    public function index()
    {
        try {

            $stocks = Stock::with([
                    'medication',
                    'supplier'
                ])
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->get()
                ->map(function ($stock) {

                    $expDate = Carbon::parse($stock->exp_date);
                    $today = Carbon::today();

                    $daysLeft = (int) $today->diffInDays(
                        $expDate,
                        false
                    );

                    // ---------------------------------------------
                    // اطلاعات دارو
                    // ---------------------------------------------
                    $medication = $stock->medication;

                    $medName =
                        $medication->gen_name
                        ?? $medication->brand_name
                        ?? $medication->name
                        ?? 'نامشخص';

                    $medBarcode =
                        $medication->barcode
                        ?? $medication->barcode_no
                        ?? $medication->med_barcode
                        ?? null;

                    // ---------------------------------------------
                    // اطلاعات تأمین‌کننده (accounts)
                    // ---------------------------------------------
                    $supplier = $stock->supplier;

                    $supplierName =
                        $supplier->account_name
                        ?? $supplier->full_name
                        ?? $supplier->reg_name
                        ?? $supplier->name
                        ?? 'نامشخص';

                    // ---------------------------------------------
                    // ✅ شماره Batch و قیمت خرید از جدول خرید
                    // ---------------------------------------------
                    //
                    // منطق:
                    //   آخرین parchaseitem که با med_id، supplier_id
                    //   و exp_date مطابقت دارد پیدا می‌شود.
                    //

                    $purchaseItem = Parchaseitem::where(
                            'med_id',
                            $stock->med_id
                        )
                        ->where(
                            'supplier_id',
                            $stock->supplier_id
                        )
                        ->whereDate(
                            'exp_date',
                            $stock->exp_date
                        )
                        ->orderBy(
                            'parchase_it_id',
                            'desc'
                        )
                        ->first();

                    // اگر در stock خودش batch_number دارد، اولویت با آن
                    $batchNumber =
                        $stock->batch_number
                        ?? $purchaseItem->batch_no
                        ?? null;

                    $purchasePrice =
                        $stock->purchase_price
                        ?? $purchaseItem->unit_price
                        ?? null;

                    $sellingPrice =
                        $stock->selling_price
                        ?? $medication->unit_price
                        ?? null;

                    return [

                        'stock_id' =>
                            $stock->stock_id,

                        'med_id' =>
                            $stock->med_id,

                        'med_name' =>
                            $medName,

                        'barcode' =>
                            $medBarcode,

                        'supplier_id' =>
                            $stock->supplier_id,

                        'supplier_name' =>
                            $supplierName,

                        'type' =>
                            $stock->type,

                        'type_name' =>
                            $this->getTypeName(
                                $stock->type
                            ),

                        // ✅ Batch از خرید
                        'batch_number' =>
                            $batchNumber,

                        'exp_date' =>
                            $stock->exp_date,

                        'exp_date_fa' =>
                            $this->convertToJalali(
                                $stock->exp_date
                            ),

                        'days_left' =>
                            $daysLeft >= 0
                                ? $daysLeft
                                : 0,

                        'quantity' =>
                            (int) $stock->quantity,

                        // ✅ قیمت خرید از خرید
                        'purchase_price' =>
                            $purchasePrice,

                        'selling_price' =>
                            $sellingPrice,

                        'status' =>
                            $this->getStockStatus(
                                $stock->exp_date,
                                $stock->quantity
                            ),

                        'status_color' =>
                            $this->getStatusColor(
                                $stock->exp_date,
                                $stock->quantity
                            ),
                    ];
                });

            return response()->json([

                'success' => true,

                'data' => $stocks,

                'total_items' =>
                    $stocks->count(),

                'total_quantity' =>
                    (int) $stocks->sum('quantity'),
            ]);

        } catch (\Exception $e) {

            return response()->json([

                'success' => false,

                'message' =>
                    'خطا در دریافت اطلاعات موجودی: '
                    . $e->getMessage(),

                'data' => [],

            ], 500);
        }
    }


    /**
     * ============================================================
     * گزارش جامع موجودی
     * ============================================================
     */
    public function report()
    {
        try {

            $report = Stock::with([
                    'medication',
                    'supplier'
                ])
                ->selectRaw(
                    'med_id,
                     supplier_id,
                     type,
                     SUM(quantity) as total_quantity,
                     COUNT(*) as batch_count'
                )
                ->groupBy(
                    'med_id',
                    'supplier_id',
                    'type'
                )
                ->get()
                ->map(function ($item) {

                    $batchQuery = Stock::where(
                            'med_id',
                            $item->med_id
                        )
                        ->where(
                            'supplier_id',
                            $item->supplier_id
                        );

                    if (
                        $item->type === null
                        || $item->type === ''
                    ) {

                        $batchQuery->whereNull('type');

                    } else {

                        $batchQuery->where(
                            'type',
                            $item->type
                        );
                    }

                    $batches = $batchQuery
                        ->orderBy('exp_date', 'asc')
                        ->orderBy('stock_id', 'asc')
                        ->get([
                            'stock_id',
                            'batch_number',
                            'exp_date',
                            'quantity',
                            'purchase_price',
                            'selling_price',
                            'med_id',
                            'supplier_id'
                        ])
                        ->map(function ($batch) {

                            // ✅ Batch و قیمت خرید از جدول خرید
                            $purchaseItem = Parchaseitem::where(
                                    'med_id',
                                    $batch->med_id
                                )
                                ->where(
                                    'supplier_id',
                                    $batch->supplier_id
                                )
                                ->whereDate(
                                    'exp_date',
                                    $batch->exp_date
                                )
                                ->orderBy(
                                    'parchase_it_id',
                                    'desc'
                                )
                                ->first();

                            $batchNumber =
                                $batch->batch_number
                                ?? $purchaseItem->batch_no
                                ?? null;

                            $purchasePrice =
                                $batch->purchase_price
                                ?? $purchaseItem->unit_price
                                ?? null;

                            return [

                                'stock_id' =>
                                    $batch->stock_id,

                                'batch_number' =>
                                    $batchNumber,

                                'exp_date' =>
                                    $batch->exp_date,

                                'exp_date_fa' =>
                                    $this->convertToJalali(
                                        $batch->exp_date
                                    ),

                                'quantity' =>
                                    (int) $batch->quantity,

                                'purchase_price' =>
                                    $purchasePrice,

                                'selling_price' =>
                                    $batch->selling_price,
                            ];
                        })
                        ->values();

                    $medication =
                        $item->medication;

                    $supplier =
                        $item->supplier;

                    return [

                        'med_id' =>
                            $item->med_id,

                        'med_name' =>
                            $medication->gen_name
                            ?? $medication->brand_name
                            ?? $medication->name
                            ?? 'نامشخص',

                        'barcode' =>
                            $medication->barcode
                            ?? $medication->barcode_no
                            ?? $medication->med_barcode
                            ?? null,

                        'supplier_id' =>
                            $item->supplier_id,

                        'supplier_name' =>
                            $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',

                        'type' =>
                            $item->type,

                        'type_name' =>
                            $this->getTypeName(
                                $item->type
                            ),

                        'total_quantity' =>
                            (int) $item->total_quantity,

                        'batch_count' =>
                            (int) $item->batch_count,

                        'batches' =>
                            $batches,
                    ];
                });

            return response()->json([

                'success' => true,

                'data' => $report,
            ]);

        } catch (\Exception $e) {

            return response()->json([

                'success' => false,

                'message' =>
                    'خطا در دریافت گزارش موجودی',

                'error' =>
                    $e->getMessage(),

            ], 500);
        }
    }


    // ============================================================
    // بقیه متدها بدون تغییر (check, fefo, findByBarcode, ...)
    // ============================================================

    public function check(Request $request)
    {
        $request->validate([
            'med_id'      => 'required|exists:medications,med_id',
            'supplier_id' => 'nullable|exists:accounts,id',
            'type'        => 'nullable|string',
            'quantity'    => 'nullable|integer|min:1',
        ]);

        try {

            $query = Stock::where('med_id', $request->med_id);

            if ($request->filled('supplier_id')) {
                $query->where('supplier_id', $request->supplier_id);
            }

            if ($request->filled('type') && $request->type !== 'null') {
                $query->where('type', $request->type);
            }

            $query->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', Carbon::today());

            $totalQuantity = (int) $query->sum('quantity');

            $detailsQuery = Stock::with('supplier')
                ->where('med_id', $request->med_id)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', Carbon::today());

            if ($request->filled('supplier_id')) {
                $detailsQuery->where('supplier_id', $request->supplier_id);
            }

            if ($request->filled('type') && $request->type !== 'null') {
                $detailsQuery->where('type', $request->type);
            }

            $details = $detailsQuery
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->get()
                ->map(function ($stock) {

                    $supplier = $stock->supplier;

                    return [
                        'stock_id'      => $stock->stock_id,
                        'supplier_id'   => $stock->supplier_id,
                        'supplier_name' => $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',
                        'type'          => $stock->type,
                        'type_name'     => $this->getTypeName($stock->type),
                        'batch_number'  => $stock->batch_number,
                        'exp_date'      => $stock->exp_date,
                        'exp_date_fa'   => $this->convertToJalali($stock->exp_date),
                        'quantity'      => (int) $stock->quantity,
                        'purchase_price' => $stock->purchase_price,
                        'selling_price'  => $stock->selling_price,
                    ];
                })
                ->values();

            $isAvailable = $request->filled('quantity')
                ? $totalQuantity >= (int) $request->quantity
                : true;

            return response()->json([
                'success' => true,
                'data' => [
                    'med_id'         => $request->med_id,
                    'total_quantity' => $totalQuantity,
                    'is_available'   => $isAvailable,
                    'details'        => $details,
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در بررسی موجودی',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function fefo($medId)
    {
        try {

            $requestType = request()->query('type');

            $stocks = StockService::getFEFOStock($medId, $requestType);

            $totalQuantity = collect($stocks)->sum('quantity');

            return response()->json([
                'success' => true,
                'data' => [
                    'med_id'         => (int) $medId,
                    'total_quantity' => (int) $totalQuantity,
                    'batches'        => $stocks,
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت موجودی FEFO',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function findByBarcode(Request $request)
    {
        $request->validate([
            'barcode' => 'required|string|max:255',
        ]);

        try {

            $medication = StockService::findMedicationByBarcode($request->barcode);

            if (!$medication) {
                return response()->json([
                    'success' => false,
                    'message' => 'دارویی با این بارکود پیدا نشد.',
                ], 404);
            }

            $type = $request->input('type');
            $stocks = StockService::getFEFOStock($medication->med_id, $type);
            $totalQuantity = collect($stocks)->sum('quantity');

            return response()->json([
                'success' => true,
                'data' => [
                    'med_id'         => $medication->med_id,
                    'barcode'        => $request->barcode,
                    'med_name'       => $medication->gen_name
                        ?? $medication->brand_name
                        ?? $medication->name
                        ?? 'نامشخص',
                    'total_quantity' => (int) $totalQuantity,
                    'batches'        => $stocks,
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در جستجوی دارو با بارکود',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function decreaseByBarcode(Request $request)
    {
        $request->validate([
            'barcode'  => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'type'     => 'nullable|string',
        ]);

        try {

            $result = StockService::decreaseByBarcode(
                $request->barcode,
                $request->quantity,
                $request->input('type')
            );

            if (!isset($result['success']) || !$result['success']) {
                return response()->json($result, 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'دارو با موفقیت از موجودی خارج شد.',
                'data'    => $result,
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در خروج دارو از موجودی',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function decreaseByMedication(Request $request)
    {
        $request->validate([
            'med_id'   => 'required|exists:medications,med_id',
            'quantity' => 'required|integer|min:1',
            'type'     => 'nullable|string',
        ]);

        try {

            $result = StockService::decreaseByMedication(
                $request->med_id,
                $request->quantity,
                $request->input('type')
            );

            if (!isset($result['success']) || !$result['success']) {
                return response()->json($result, 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'موجودی با موفقیت کاهش یافت.',
                'data'    => $result,
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در کاهش موجودی',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function expiring()
    {
        try {

            $today     = Carbon::today();
            $threshold = Carbon::today()->addDays(30);

            $expiringStocks = Stock::with([
                    'medication',
                    'supplier'
                ])
                ->whereDate('exp_date', '<=', $threshold)
                ->whereDate('exp_date', '>=', $today)
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->get()
                ->map(function ($stock) {

                    $daysLeft = (int) Carbon::today()->diffInDays(
                        Carbon::parse($stock->exp_date),
                        false
                    );

                    $medication = $stock->medication;
                    $supplier   = $stock->supplier;

                    $purchaseItem = Parchaseitem::where('med_id', $stock->med_id)
                        ->where('supplier_id', $stock->supplier_id)
                        ->whereDate('exp_date', $stock->exp_date)
                        ->orderBy('parchase_it_id', 'desc')
                        ->first();

                    return [
                        'stock_id'      => $stock->stock_id,
                        'med_id'        => $stock->med_id,
                        'med_name'      => $medication->gen_name
                            ?? $medication->brand_name
                            ?? $medication->name
                            ?? 'نامشخص',
                        'barcode'       => $medication->barcode
                            ?? $medication->barcode_no
                            ?? $medication->med_barcode
                            ?? null,
                        'supplier_id'   => $stock->supplier_id,
                        'supplier_name' => $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',
                        'type'          => $stock->type,
                        'type_name'     => $this->getTypeName($stock->type),
                        'batch_number'  => $stock->batch_number
                            ?? $purchaseItem->batch_no
                            ?? null,
                        'exp_date'      => $stock->exp_date,
                        'exp_date_fa'   => $this->convertToJalali($stock->exp_date),
                        'quantity'      => (int) $stock->quantity,
                        'purchase_price' => $stock->purchase_price
                            ?? $purchaseItem->unit_price
                            ?? null,
                        'selling_price' => $stock->selling_price,
                        'days_left'     => $daysLeft >= 0 ? $daysLeft : 0,
                        'status'        => $this->getStockStatus($stock->exp_date, $stock->quantity),
                        'status_color'  => $this->getStatusColor($stock->exp_date, $stock->quantity),
                        'alert_level'   => $daysLeft <= 7 ? 'danger' : ($daysLeft <= 15 ? 'warning' : 'info'),
                    ];
                });

            return response()->json([
                'success'        => true,
                'data'           => $expiringStocks,
                'total_items'    => $expiringStocks->count(),
                'total_quantity' => (int) $expiringStocks->sum('quantity'),
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داروهای در حال انقضا',
                'data'    => [],
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function expired()
    {
        try {

            $expiredStocks = Stock::with(['medication', 'supplier'])
                ->whereDate('exp_date', '<', Carbon::today())
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'desc')
                ->get()
                ->map(function ($stock) {

                    $daysOverdue = Carbon::parse($stock->exp_date)->diffInDays(Carbon::today());

                    $medication = $stock->medication;
                    $supplier   = $stock->supplier;

                    $purchaseItem = Parchaseitem::where('med_id', $stock->med_id)
                        ->where('supplier_id', $stock->supplier_id)
                        ->whereDate('exp_date', $stock->exp_date)
                        ->orderBy('parchase_it_id', 'desc')
                        ->first();

                    return [
                        'stock_id'      => $stock->stock_id,
                        'med_id'        => $stock->med_id,
                        'med_name'      => $medication->gen_name
                            ?? $medication->brand_name
                            ?? $medication->name
                            ?? 'نامشخص',
                        'barcode'       => $medication->barcode
                            ?? $medication->barcode_no
                            ?? $medication->med_barcode
                            ?? null,
                        'supplier_id'   => $stock->supplier_id,
                        'supplier_name' => $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',
                        'type'          => $stock->type,
                        'type_name'     => $this->getTypeName($stock->type),
                        'batch_number'  => $stock->batch_number
                            ?? $purchaseItem->batch_no
                            ?? null,
                        'exp_date'      => $stock->exp_date,
                        'exp_date_fa'   => $this->convertToJalali($stock->exp_date),
                        'quantity'      => (int) $stock->quantity,
                        'purchase_price' => $stock->purchase_price
                            ?? $purchaseItem->unit_price
                            ?? null,
                        'selling_price' => $stock->selling_price,
                        'days_overdue'  => $daysOverdue,
                    ];
                });

            return response()->json([
                'success'        => true,
                'data'           => $expiredStocks,
                'total_items'    => $expiredStocks->count(),
                'total_quantity' => (int) $expiredStocks->sum('quantity'),
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داروهای منقضی شده',
                'data'    => [],
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function summary()
    {
        try {

            $today = Carbon::today();

            $totalItems     = (int) Stock::sum('quantity');
            $totalMedicines = (int) Stock::distinct('med_id')->count('med_id');
            $totalTypes     = (int) Stock::whereNotNull('type')->distinct('type')->count('type');

            $expiringSoon = (int) Stock::whereDate('exp_date', '<=', Carbon::today()->addDays(30))
                ->whereDate('exp_date', '>=', $today)
                ->where('quantity', '>', 0)
                ->count();

            $expired = (int) Stock::whereDate('exp_date', '<', $today)
                ->where('quantity', '>', 0)
                ->count();

            $lowStock = (int) Stock::where('quantity', '<=', 10)
                ->where('quantity', '>', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_items'     => $totalItems,
                    'total_medicines' => $totalMedicines,
                    'total_types'     => $totalTypes,
                    'expiring_soon'   => $expiringSoon,
                    'expired'         => $expired,
                    'low_stock'       => $lowStock,
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت خلاصه موجودی',
                'data' => [
                    'total_items'     => 0,
                    'total_medicines' => 0,
                    'total_types'     => 0,
                    'expiring_soon'   => 0,
                    'expired'         => 0,
                    'low_stock'       => 0,
                ],
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    public function getTypesByMedication($medId)
    {
        try {

            $types = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', Carbon::today())
                ->whereNotNull('type')
                ->distinct()
                ->pluck('type')
                ->map(function ($type) {
                    return [
                        'type'      => $type,
                        'type_name' => $this->getTypeName($type),
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data'    => $types,
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function getSuppliersByMedication($medId)
    {
        try {

            $stocks = Stock::with('supplier')
                ->where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->whereDate('exp_date', '>=', Carbon::today())
                ->get();

            $suppliers = $stocks
                ->filter(function ($stock) {
                    return $stock->supplier !== null;
                })
                ->unique('supplier_id')
                ->map(function ($stock) {

                    $supplier = $stock->supplier;

                    return [
                        'supplier_id'   => $stock->supplier_id,
                        'supplier_name' => $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'data'    => $suppliers,
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function getStockDetails($medId)
    {
        try {

            $stockDetails = Stock::with(['medication', 'supplier'])
                ->where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'asc')
                ->orderBy('stock_id', 'asc')
                ->get()
                ->map(function ($stock) {

                    $supplier = $stock->supplier;

                    $purchaseItem = Parchaseitem::where('med_id', $stock->med_id)
                        ->where('supplier_id', $stock->supplier_id)
                        ->whereDate('exp_date', $stock->exp_date)
                        ->orderBy('parchase_it_id', 'desc')
                        ->first();

                    return [
                        'stock_id'      => $stock->stock_id,
                        'med_id'        => $stock->med_id,
                        'type'          => $stock->type,
                        'type_name'     => $this->getTypeName($stock->type),
                        'supplier_id'   => $stock->supplier_id,
                        'supplier_name' => $supplier->account_name
                            ?? $supplier->full_name
                            ?? $supplier->reg_name
                            ?? $supplier->name
                            ?? 'نامشخص',
                        'batch_number'  => $stock->batch_number
                            ?? $purchaseItem->batch_no
                            ?? null,
                        'exp_date'      => $stock->exp_date,
                        'exp_date_fa'   => $this->convertToJalali($stock->exp_date),
                        'quantity'      => (int) $stock->quantity,
                        'purchase_price' => $stock->purchase_price
                            ?? $purchaseItem->unit_price
                            ?? null,
                        'selling_price' => $stock->selling_price,
                    ];
                });

            return response()->json([
                'success' => true,
                'data'    => $stockDetails,
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    private function convertToJalali($date)
    {
        if (!$date) return null;

        try {
            return Carbon::parse($date)
                ->locale('fa')
                ->isoFormat('jYYYY/jMM/jDD');
        } catch (\Exception $e) {
            return $date;
        }
    }


    private function getStockStatus($expDate, $quantity)
    {
        if ($quantity <= 0) return 'ناموجود';

        if (Carbon::today()->greaterThan(Carbon::parse($expDate))) {
            return 'منقضی شده';
        }

        $days = Carbon::today()->diffInDays(Carbon::parse($expDate), false);

        if ($days <= 7)  return 'در حال انقضا (فوری)';
        if ($days <= 30) return 'در حال انقضا';
        if ($quantity <= 5) return 'موجودی کم';

        return 'موجود';
    }


    private function getStatusColor($expDate, $quantity)
    {
        if ($quantity <= 0) return 'gray';

        if (Carbon::today()->greaterThan(Carbon::parse($expDate))) {
            return 'red';
        }

        $days = Carbon::today()->diffInDays(Carbon::parse($expDate), false);

        if ($days <= 7)  return 'orange';
        if ($days <= 30) return 'yellow';
        if ($quantity <= 5) return 'orange';

        return 'green';
    }


    private function getTypeName($type)
    {
        $types = [
            'tablet'         => 'قرص',
            'capsule'        => 'کپسول',
            'syrup'          => 'شربت',
            'injection'      => 'آمپول',
            'ointment'       => 'پماد',
            'drop'           => 'قطره',
            'inhaler'        => 'اسپری',
            'cream'          => 'کرم',
            'gel'            => 'ژل',
            'suppository'    => 'شیاف',
            'solution'       => 'محلول',
            'suspension'     => 'سوسپانسیون',
            'powder'         => 'پودر',
            'medical_device' => 'تجهیزات پزشکی',
            'consumable'     => 'مصرفی',
            'equipment'      => 'دستگاه',
            'other'          => 'سایر',
        ];

        return $types[$type] ?? $type ?? 'نامشخص';
    }


    public function lowStock()
    {
        try {

            $lowStockSummary = StockService::getLowStockSummary();

            return response()->json([
                'success' => true,
                'data'    => $lowStockSummary['items'],
                'summary' => [
                    'total_low_stock' => $lowStockSummary['total_low_stock_items'],
                    'out_of_stock'    => $lowStockSummary['total_out_of_stock'],
                    'low_stock'       => $lowStockSummary['total_low_stock'],
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داروهای با موجودی کم',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function stockWarnings()
    {
        try {

            $lowStockItems = StockService::getLowStockMedications();

            $criticalWarnings = array_filter($lowStockItems, function ($item) {
                return $item['current_stock'] <= 0 || $item['current_stock'] <= 5;
            });

            $normalWarnings = array_filter($lowStockItems, function ($item) {
                return $item['current_stock'] > 0
                    && $item['current_stock'] <= $item['minimum_quantity'];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'critical' => array_values($criticalWarnings),
                    'normal'   => array_values($normalWarnings),
                    'all'      => $lowStockItems,
                ],
                'counts' => [
                    'critical' => count($criticalWarnings),
                    'normal'   => count($normalWarnings),
                    'total'    => count($lowStockItems),
                ],
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت هشدارهای موجودی',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}