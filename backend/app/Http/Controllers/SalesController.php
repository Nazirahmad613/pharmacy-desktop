<?php

namespace App\Http\Controllers;

use App\Models\Sales;
use App\Models\SalesView;
use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService;
use App\Services\StockService;

class SalesController extends Controller
{

    public function index()
    {
        $sales = Sales::with([
            'customer',
            'items.supplier',
            'items.medication',
            'items.category',
        ])->get()->map(function ($sale) {

            return [
                'id'            => $sale->sales_id,
                'sales_date'    => $sale->sales_date,
                'cust_id'       => $sale->cust_id,
                'tazkira_number'=> $sale->tazkira_number,
                'customer_name' => $sale->customer->full_name ?? '-',
                'total_sales'   => $sale->total_sales,
                'discount'      => $sale->discount,
                'net_sales'     => $sale->net_sales,
                'total_paid'    => $sale->total_paid,
                'remaining'     => $sale->remaining_amount,
                'payment_status'=> $sale->payment_status,
                'items' => $sale->items->map(function ($item) {
                    return [
                        'sales_it_id'  => $item->sales_it_id,
                        'med_id'       => $item->med_id,
                        'category_id'  => $item->category_id,
                        'supplier_id'  => $item->supplier_id,
                        'med_name'     => $item->medication->gen_name ?? '-',
                        'category_name'=> $item->category->category_name ?? '-',
                        'supplier_name'=> $item->supplier->full_name ?? $item->supplier->reg_name ?? '-',
                        'type'         => $item->type,
                        'quantity'     => $item->quantity,
                        'unit_sales'   => $item->unit_sales,
                        'total_sales'  => $item->total_sales,
                    ];
                }),
            ];
        });

        return response()->json($sales);
    }

    /**
     * ✅ بررسی موجودی یک قلم خاص قبل از ثبت فروش (API برای فرانت‌اند)
     * این متد برای بررسی لحظه‌ای موجودی هنگام وارد کردن تعداد استفاده می‌شود
     */
    public function checkStockBeforeSale(Request $request)
    {
        $request->validate([
            'med_id' => 'required|exists:medications,med_id',
            'supplier_id' => 'required|exists:registrations,reg_id',
            'type' => 'nullable|string',
            'quantity' => 'required|numeric|min:1',
        ]);

        try {
            // دریافت موجودی فعلی با در نظر گرفتن type
            $typeValue = $request->type && $request->type !== '' ? $request->type : null;
            
            $availableStock = StockService::getAvailableQuantity(
                $request->med_id,
                $request->supplier_id,
                $typeValue
            );
            
            $requestedQuantity = (int) $request->quantity;
            $isAvailable = $availableStock >= $requestedQuantity;
            
            // دریافت اطلاعات دارو برای نمایش بهتر
            $medication = \App\Models\Medication::find($request->med_id);
            $supplier = Registrations::find($request->supplier_id);
            
            $medName = $medication->gen_name ?? $medication->brand_name ?? 'نامشخص';
            $supplierName = $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص';
            
            return response()->json([
                'success' => true,
                'available' => $isAvailable,
                'total_quantity' => $availableStock,
                'requested_quantity' => $requestedQuantity,
                'med_id' => $request->med_id,
                'med_name' => $medName,
                'supplier_id' => $request->supplier_id,
                'supplier_name' => $supplierName,
                'type' => $request->type,
                'message' => $isAvailable 
                    ? "✅ موجودی کافی است (موجودی انبار: {$availableStock})" 
                    : "❌ موجودی کافی نیست! موجودی انبار: {$availableStock} - درخواستی: {$requestedQuantity}"
            ]);
            
        } catch (\Exception $e) {
            Log::error('Check stock error', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'available' => false,
                'total_quantity' => 0,
                'message' => 'خطا در بررسی موجودی: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ بررسی موجودی چند قلم همزمان (برای ثبت نهایی فروش)
     */
    public function checkMultipleStockBeforeSale(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.med_id' => 'required|exists:medications,med_id',
            'items.*.supplier_id' => 'required|exists:registrations,reg_id',
            'items.*.type' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:1',
        ]);

        try {
            $unavailableItems = [];
            
            foreach ($request->items as $index => $item) {
                $typeValue = isset($item['type']) && $item['type'] !== '' ? $item['type'] : null;
                
                $availableStock = StockService::getAvailableQuantity(
                    $item['med_id'],
                    $item['supplier_id'],
                    $typeValue
                );
                
                if ($availableStock < $item['quantity']) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    $supplier = Registrations::find($item['supplier_id']);
                    
                    $unavailableItems[] = [
                        'index' => $index,
                        'med_id' => $item['med_id'],
                        'med_name' => $medication->gen_name ?? $medication->brand_name ?? 'نامشخص',
                        'supplier_id' => $item['supplier_id'],
                        'supplier_name' => $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص',
                        'type' => $item['type'] ?? 'بدون نوع',
                        'requested_quantity' => $item['quantity'],
                        'available_quantity' => $availableStock
                    ];
                }
            }
            
            if (count($unavailableItems) > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'برخی از اقلام موجودی کافی ندارند',
                    'unavailable_items' => $unavailableItems
                ], 422);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'همه اقلام موجودی کافی دارند'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بررسی موجودی',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $validated = $request->validate([
                'sales_date' => 'required|date',
                'cust_id' => 'required|exists:registrations,reg_id',
                'tazkira_number' => 'nullable|string',
                'discount' => 'nullable|numeric|min:0',
                'total_paid' => 'nullable|numeric|min:0',
                'items' => 'required|array|min:1',
                'items.*.med_id' => 'required|exists:medications,med_id',
                'items.*.supplier_id' => 'required|exists:registrations,reg_id',
                'items.*.category_id' => 'required|exists:categories,category_id',
                'items.*.type' => 'nullable|string',
                'items.*.quantity' => 'required|numeric|min:1',
                'items.*.unit_sales' => 'required|numeric|min:0',
            ]);

            $stockErrors = [];
            
            foreach ($request->items as $index => $item) {
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("تأمین‌کننده با شناسه {$item['supplier_id']} معتبر نیست");
                }

                $typeValue = isset($item['type']) && $item['type'] !== '' ? $item['type'] : null;
                
                $availableStock = StockService::getAvailableQuantity(
                    $item['med_id'],
                    $item['supplier_id'],
                    $typeValue
                );
                
                if ($availableStock < $item['quantity']) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    $medName = $medication->gen_name ?? $medication->brand_name ?? 'نامشخص';
                    
                    $stockErrors[] = [
                        'index' => $index,
                        'med_id' => $item['med_id'],
                        'med_name' => $medName,
                        'supplier_id' => $item['supplier_id'],
                        'supplier_name' => $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص',
                        'type' => $item['type'] ?? 'بدون نوع',
                        'requested' => $item['quantity'],
                        'available' => $availableStock
                    ];
                }
            }
            
            if (!empty($stockErrors)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'موجودی برخی اقلام کافی نیست',
                    'errors' => $stockErrors
                ], 422);
            }

            $totalSales = collect($request->items)
                ->sum(fn($i) => $i['quantity'] * $i['unit_sales']);

            $discount = $request->discount ?? 0;
            $netSales = $totalSales - $discount;
            $totalPaid = min($request->total_paid ?? 0, $netSales);

            $sale = Sales::create([
                'sales_date'  => $request->sales_date,
                'cust_id'     => $request->cust_id,
                'tazkira_number'=> $request->tazkira_number,
                'total_sales' => $totalSales,
                'discount'    => $discount,
                'net_sales'   => $netSales,
                'total_paid'  => $totalPaid,
                'sales_user'  => Auth::id(),
            ]);

            foreach ($request->items as $item) {
                $sale->items()->create([
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_sales'  => $item['unit_sales'],
                    'total_sales' => $item['quantity'] * $item['unit_sales'],
                ]);

                StockService::decrease(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity'],
                    $item['type'] ?? null
                );
            }

            $this->saveJournal($sale->sales_id, $request->cust_id, $netSales, $totalPaid, $request->sales_date);

            DB::commit();

            LogService::create(
                'create',
                'sales',
                $sale->sales_id,
                'Sale created',
                $sale->load('items')->toArray()
            );

            return response()->json([
                'success' => true,
                'message' => 'فروش با موفقیت ثبت شد',
                'sale_id' => $sale->sales_id,
                'data' => $sale->load(['items.medication', 'items.supplier', 'customer'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sales Store Error', ['error' => $e->getMessage(), 'request' => $request->all()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فروش: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $sales_id)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'sales_date' => 'required|date',
                'cust_id' => 'required|exists:registrations,reg_id',
                'tazkira_number' => 'nullable|string',
                'discount' => 'nullable|numeric|min:0',
                'total_paid' => 'nullable|numeric|min:0',
                'items' => 'required|array|min:1',
                'items.*.med_id' => 'required|exists:medications,med_id',
                'items.*.supplier_id' => 'required|exists:registrations,reg_id',
                'items.*.category_id' => 'required|exists:categories,category_id',
                'items.*.type' => 'nullable|string',
                'items.*.quantity' => 'required|numeric|min:1',
                'items.*.unit_sales' => 'required|numeric|min:0',
            ]);

            $sale = Sales::with('items')
                ->where('sales_id', $sales_id)
                ->firstOrFail();

            $oldData = $sale->load('items')->toArray();

            foreach ($sale->items as $oldItem) {
                StockService::reverseDecrease(
                    $oldItem->med_id,
                    $oldItem->supplier_id,
                    $oldItem->quantity,
                    $oldItem->type
                );
            }

            $stockErrors = [];
            
            foreach ($request->items as $index => $item) {
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("تأمین‌کننده با شناسه {$item['supplier_id']} معتبر نیست");
                }

                $typeValue = isset($item['type']) && $item['type'] !== '' ? $item['type'] : null;
                
                $availableStock = StockService::getAvailableQuantity(
                    $item['med_id'],
                    $item['supplier_id'],
                    $typeValue
                );
                
                if ($availableStock < $item['quantity']) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    $medName = $medication->gen_name ?? $medication->brand_name ?? 'نامشخص';
                    
                    $stockErrors[] = [
                        'index' => $index,
                        'med_id' => $item['med_id'],
                        'med_name' => $medName,
                        'supplier_id' => $item['supplier_id'],
                        'supplier_name' => $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص',
                        'type' => $item['type'] ?? 'بدون نوع',
                        'requested' => $item['quantity'],
                        'available' => $availableStock
                    ];
                }
            }
            
            if (!empty($stockErrors)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'موجودی برخی اقلام کافی نیست',
                    'errors' => $stockErrors
                ], 422);
            }

            $totalSales = collect($request->items)
                ->sum(fn($i) => $i['quantity'] * $i['unit_sales']);

            $discount = $request->discount ?? 0;
            $netSales = $totalSales - $discount;
            $totalPaid = min($request->total_paid ?? 0, $netSales);

            $sale->items()->delete();

            foreach ($request->items as $item) {
                $sale->items()->create([
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_sales'  => $item['unit_sales'],
                    'total_sales' => $item['quantity'] * $item['unit_sales'],
                ]);

                StockService::decrease(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity'],
                    $item['type'] ?? null
                );
            }

            $sale->update([
                'sales_date'    => $request->sales_date,
                'cust_id'       => $request->cust_id,
                'tazkira_number'=> $request->tazkira_number,
                'total_sales'   => $totalSales,
                'discount'      => $discount,
                'net_sales'     => $netSales,
                'total_paid'    => $totalPaid,
            ]);

            Journal::where('ref_type', 'sale')
                ->where('ref_id', $sales_id)
                ->delete();

            $this->saveJournal($sales_id, $request->cust_id, $netSales, $totalPaid, $request->sales_date);

            DB::commit();

            LogService::create(
                'update',
                'sales',
                $sale->sales_id,
                'Sale updated',
                [
                    'old' => $oldData,
                    'new' => $sale->load('items')->toArray()
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'فروش با موفقیت بروزرسانی شد'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sales Update Error', ['error' => $e->getMessage(), 'request' => $request->all()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی فروش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($sales_id)
    {
        DB::beginTransaction();

        try {
            $sale = Sales::with('items')
                ->where('sales_id', $sales_id)
                ->firstOrFail();

            $data = $sale->load('items')->toArray();

            foreach ($sale->items as $item) {
                StockService::reverseDecrease(
                    $item->med_id,
                    $item->supplier_id,
                    $item->quantity,
                    $item->type
                );
            }

            $sale->items()->delete();

            Journal::where('ref_type', 'sale')
                ->where('ref_id', $sales_id)
                ->delete();

            $sale->delete();

            DB::commit();

            LogService::create(
                'delete',
                'sales',
                $sales_id,
                'Sale deleted',
                $data
            );

            return response()->json([
                'success' => true,
                'message' => 'فروش با موفقیت حذف شد'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sales Delete Error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فروش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function saveJournal($saleId, $custId, $netSales, $totalPaid, $date)
    {
        Journal::create([
            'journal_date' => $date,
            'description' => 'ثبت فروش شماره ' . $saleId,
            'entry_type' => 'credit',
            'amount' => $netSales,
            'ref_type' => 'sale',
            'ref_id' => $saleId,
            'cust_id' => $custId,
            'user_id' => Auth::id(),
        ]);

        if ($totalPaid > 0) {
            Journal::create([
                'journal_date' => $date,
                'description' => 'دریافت وجه فروش شماره ' . $saleId,
                'entry_type' => 'debit',
                'amount' => $totalPaid,
                'ref_type' => 'sale',
                'ref_id' => $saleId,
                'cust_id' => $custId,
                'user_id' => Auth::id(),
            ]);
        }
    }

    public function view()
    {
        return SalesView::orderBy('journal_date', 'desc')->get();
    }

    public function chart()
    {
        return SalesView::selectRaw("
                DATE(journal_date) as date,
                SUM(amount) as total
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }
}