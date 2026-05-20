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
     * نمایش لیست کامل موجودی با جزئیات (با type از جدول آیتم‌های خرید)
     */
    public function index()
    {
        try {
            $stocks = Stock::with(['medication', 'supplier'])
                ->orderBy('exp_date', 'asc')
                ->get()
                ->map(function ($stock) {
                    $expDate = Carbon::parse($stock->exp_date);
                    $today = Carbon::today();
                    $daysLeft = (int) $today->diffInDays($expDate, false);
                    
                    // دریافت نام دارو از medication
                    $medication = $stock->medication;
                    $medName = $medication->gen_name ?? $medication->brand_name ?? $medication->name ?? 'نامشخص';
                    
                    // دریافت نام تأمین‌کننده از supplier
                    $supplier = $stock->supplier;
                    $supplierName = $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص';
                    
                    return [
                        'stock_id' => $stock->stock_id,
                        'med_id' => $stock->med_id,
                        'med_name' => $medName,
                        'supplier_id' => $stock->supplier_id,
                        'supplier_name' => $supplierName,
                        'type' => $stock->type, // ✅ type از جدول stock (که از parchaseitems آمده)
                        'type_name' => $this->getTypeName($stock->type), // ✅ نام فارسی type
                        'exp_date' => $stock->exp_date,
                        'exp_date_fa' => $this->convertToJalali($stock->exp_date),
                        'days_left' => $daysLeft >= 0 ? $daysLeft : 0,
                        'quantity' => (int) $stock->quantity,
                        'batch_number' => $stock->batch_number ?? null,
                        'purchase_price' => $stock->purchase_price ?? null,
                        'status' => $this->getStockStatus($stock->exp_date, $stock->quantity),
                        'status_color' => $this->getStatusColor($stock->exp_date, $stock->quantity),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $stocks,
                'total_items' => $stocks->count(),
                'total_quantity' => $stocks->sum('quantity'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات موجودی: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * گزارش جامع موجودی (گروه‌بندی شده بر اساس دارو، تأمین‌کننده و نوع)
     */
    public function report()
    {
        try {
            $report = Stock::with(['medication', 'supplier'])
                ->selectRaw('med_id, supplier_id, type, SUM(quantity) as total_quantity, COUNT(*) as batch_count')
                ->groupBy('med_id', 'supplier_id', 'type')
                ->get()
                ->map(function ($item) {
                    $batches = Stock::where('med_id', $item->med_id)
                        ->where('supplier_id', $item->supplier_id)
                        ->where('type', $item->type)
                        ->orderBy('exp_date', 'asc')
                        ->get(['stock_id', 'exp_date', 'quantity'])
                        ->map(function ($batch) {
                            return [
                                'stock_id' => $batch->stock_id,
                                'exp_date' => $batch->exp_date,
                                'exp_date_fa' => $this->convertToJalali($batch->exp_date),
                                'quantity' => $batch->quantity,
                            ];
                        });

                    return [
                        'med_id' => $item->med_id,
                        'med_name' => $item->medication->gen_name ?? 'نامشخص',
                        'supplier_id' => $item->supplier_id,
                        'supplier_name' => $item->supplier->full_name ?? $item->supplier->reg_name ?? 'نامشخص',
                        'type' => $item->type,
                        'type_name' => $this->getTypeName($item->type),
                        'total_quantity' => $item->total_quantity,
                        'batch_count' => $item->batch_count,
                        'batches' => $batches,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $report,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت گزارش موجودی',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * بررسی موجودی یک دارو خاص (با در نظر گرفتن type)
     */
    public function check(Request $request)
    {
        $request->validate([
            'med_id' => 'required|exists:medications,med_id',
            'supplier_id' => 'nullable|exists:registrations,reg_id',
            'type' => 'nullable|string',
            'quantity' => 'nullable|integer|min:1',
        ]);

        try {
            $query = Stock::where('med_id', $request->med_id);
            
            if ($request->supplier_id) {
                $query->where('supplier_id', $request->supplier_id);
            }
            
            if ($request->type) {
                $query->where('type', $request->type);
            }
            
            $totalQuantity = $query->sum('quantity');
            
            $details = Stock::with('supplier')
                ->where('med_id', $request->med_id)
                ->when($request->supplier_id, function($q) use ($request) {
                    return $q->where('supplier_id', $request->supplier_id);
                })
                ->when($request->type, function($q) use ($request) {
                    return $q->where('type', $request->type);
                })
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'asc')
                ->get(['supplier_id', 'type', 'exp_date', 'quantity'])
                ->map(function ($stock) {
                    return [
                        'supplier_name' => $stock->supplier->full_name ?? 'نامشخص',
                        'type' => $stock->type,
                        'type_name' => $this->getTypeName($stock->type),
                        'exp_date' => $stock->exp_date,
                        'exp_date_fa' => $this->convertToJalali($stock->exp_date),
                        'quantity' => $stock->quantity,
                    ];
                });

            $isAvailable = $request->quantity ? $totalQuantity >= $request->quantity : true;

            return response()->json([
                'success' => true,
                'data' => [
                    'med_id' => $request->med_id,
                    'total_quantity' => $totalQuantity,
                    'is_available' => $isAvailable,
                    'details' => $details,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بررسی موجودی',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * داروهای در حال انقضا (۳۰ روز آینده) با نوع
     */
    public function expiring()
    {
        try {
            $threshold = Carbon::now()->addDays(30);
            
            $expiringStocks = Stock::with(['medication', 'supplier'])
                ->where('exp_date', '<=', $threshold)
                ->where('exp_date', '>=', Carbon::now())
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'asc')
                ->get()
                ->map(function ($stock) {
                    $daysLeft = (int) Carbon::now()->diffInDays($stock->exp_date, false);
                    
                    $medication = $stock->medication;
                    $medName = $medication->gen_name ?? $medication->brand_name ?? $medication->name ?? 'نامشخص';
                    
                    $supplier = $stock->supplier;
                    $supplierName = $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص';
                    
                    return [
                        'stock_id' => $stock->stock_id,
                        'med_id' => $stock->med_id,
                        'med_name' => $medName,
                        'supplier_name' => $supplierName,
                        'type' => $stock->type,
                        'type_name' => $this->getTypeName($stock->type),
                        'exp_date' => $stock->exp_date,
                        'exp_date_fa' => $this->convertToJalali($stock->exp_date),
                        'quantity' => (int) $stock->quantity,
                        'days_left' => $daysLeft >= 0 ? $daysLeft : 0,
                        'status' => $this->getStockStatus($stock->exp_date, $stock->quantity),
                        'status_color' => $this->getStatusColor($stock->exp_date, $stock->quantity),
                        'alert_level' => $daysLeft <= 7 ? 'danger' : ($daysLeft <= 15 ? 'warning' : 'info'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $expiringStocks,
                'total_items' => $expiringStocks->count(),
                'total_quantity' => $expiringStocks->sum('quantity'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داروهای در حال انقضا',
                'data' => []
            ], 500);
        }
    }

    /**
     * داروهای منقضی شده
     */
    public function expired()
    {
        try {
            $expiredStocks = Stock::with(['medication', 'supplier'])
                ->where('exp_date', '<', Carbon::now())
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'desc')
                ->get()
                ->map(function ($stock) {
                    $daysOverdue = Carbon::now()->diffInDays($stock->exp_date);
                    
                    return [
                        'stock_id' => $stock->stock_id,
                        'med_id' => $stock->med_id,
                        'med_name' => $stock->medication->gen_name ?? 'نامشخص',
                        'supplier_name' => $stock->supplier->full_name ?? 'نامشخص',
                        'type' => $stock->type,
                        'type_name' => $this->getTypeName($stock->type),
                        'exp_date' => $stock->exp_date,
                        'exp_date_fa' => $this->convertToJalali($stock->exp_date),
                        'quantity' => $stock->quantity,
                        'days_overdue' => $daysOverdue,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $expiredStocks,
                'total_items' => $expiredStocks->count(),
                'total_quantity' => $expiredStocks->sum('quantity'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داروهای منقضی شده',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * خلاصه اطلاعات استاک برای داشبورد
     */
    public function summary()
    {
        try {
            $totalItems = (int) Stock::sum('quantity');
            $totalMedicines = (int) Stock::distinct('med_id')->count('med_id');
            $totalTypes = (int) Stock::distinct('type')->count('type');
            
            $expiringSoon = (int) Stock::where('exp_date', '<=', Carbon::now()->addDays(30))
                ->where('exp_date', '>=', Carbon::now())
                ->where('quantity', '>', 0)
                ->count();
            
            $expired = (int) Stock::where('exp_date', '<', Carbon::now())
                ->where('quantity', '>', 0)
                ->count();
            
            $lowStock = (int) Stock::where('quantity', '<=', 10)
                ->where('quantity', '>', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_items' => $totalItems,
                    'total_medicines' => $totalMedicines,
                    'total_types' => $totalTypes,
                    'expiring_soon' => $expiringSoon,
                    'expired' => $expired,
                    'low_stock' => $lowStock,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت خلاصه موجودی',
                'data' => [
                    'total_items' => 0,
                    'total_medicines' => 0,
                    'total_types' => 0,
                    'expiring_soon' => 0,
                    'expired' => 0,
                    'low_stock' => 0,
                ]
            ], 500);
        }
    }

    /**
     * دریافت لیست نوعیت‌های موجود برای یک دارو (از استاک)
     */
    public function getTypesByMedication($medId)
    {
        try {
            $types = Stock::where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->distinct()
                ->pluck('type')
                ->map(function($type) {
                    return [
                        'type' => $type,
                        'type_name' => $this->getTypeName($type)
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => $types
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست تأمین‌کنندگان موجود برای یک دارو (از استاک)
     */
    public function getSuppliersByMedication($medId)
    {
        try {
            $suppliers = Stock::where('med_id', $medId)
                ->with('supplier')
                ->where('quantity', '>', 0)
                ->distinct()
                ->get()
                ->map(function($stock) {
                    return [
                        'supplier_id' => $stock->supplier_id,
                        'supplier_name' => $stock->supplier->full_name ?? 'نامشخص',
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => $suppliers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت موجودی کامل یک دارو با جزئیات (برای نمایش در فرانت)
     */
    public function getStockDetails($medId)
    {
        try {
            $stockDetails = Stock::with(['medication', 'supplier'])
                ->where('med_id', $medId)
                ->where('quantity', '>', 0)
                ->orderBy('exp_date', 'asc')
                ->get()
                ->map(function($stock) {
                    return [
                        'stock_id' => $stock->stock_id,
                        'type' => $stock->type,
                        'type_name' => $this->getTypeName($stock->type),
                        'supplier_name' => $stock->supplier->full_name ?? 'نامشخص',
                        'exp_date' => $stock->exp_date,
                        'exp_date_fa' => $this->convertToJalali($stock->exp_date),
                        'quantity' => $stock->quantity,
                        'batch_number' => $stock->batch_number,
                        'purchase_price' => $stock->purchase_price,
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => $stockDetails
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * تبدیل تاریخ میلادی به شمسی
     */
    private function convertToJalali($date)
    {
        if (!$date) return null;
        
        try {
            $carbon = Carbon::parse($date);
            return $carbon->locale('fa')->isoFormat('jYYYY/jMM/jDD');
        } catch (\Exception $e) {
            return $date;
        }
    }

    /**
     * تعیین وضعیت موجودی
     */
    private function getStockStatus($expDate, $quantity)
    {
        if ($quantity <= 0) return 'ناموجود';
        if (Carbon::now()->greaterThan($expDate)) return 'منقضی شده';
        if (Carbon::now()->diffInDays($expDate) <= 7) return 'در حال انقضا (فوری)';
        if (Carbon::now()->diffInDays($expDate) <= 30) return 'در حال انقضا';
        if ($quantity <= 5) return 'موجودی کم';
        return 'موجود';
    }

    /**
     * تعیین رنگ وضعیت
     */
    private function getStatusColor($expDate, $quantity)
    {
        if ($quantity <= 0) return 'gray';
        if (Carbon::now()->greaterThan($expDate)) return 'red';
        if (Carbon::now()->diffInDays($expDate) <= 7) return 'orange';
        if (Carbon::now()->diffInDays($expDate) <= 30) return 'yellow';
        if ($quantity <= 5) return 'orange';
        return 'green';
    }

    /**
     * دریافت نام فارسی نوعیت
     */
    private function getTypeName($type)
    {
        $types = [
            'tablet' => 'قرص',
            'capsule' => 'کپسول',
            'syrup' => 'شربت',
            'injection' => 'آمپول',
            'ointment' => 'پماد',
            'drop' => 'قطره',
            'inhaler' => 'اسپری',
            'cream' => 'کرم',
            'gel' => 'ژل',
            'suppository' => 'شیاف',
            'solution' => 'محلول',
            'suspension' => 'سوسپانسیون',
            'powder' => 'پودر',
            'medical_device' => 'تجهیزات پزشکی',
            'consumable' => 'مصرفی',
            'equipment' => 'دستگاه',
            'other' => 'سایر',
        ];
        
        return $types[$type] ?? $type ?? 'نامشخص';
    }
}