<?php

namespace App\Http\Controllers;

use App\Models\Sales;
use App\Models\SalesView;
use App\Models\Journal;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService;

class SalesController extends Controller
{

    public function index()
    {
        $sales = Sales::with([
            'customer',
            'items.supplier',  // ✅ این ارتباط الان به registrations اشاره می‌کند
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
                        // ✅ supplier_name از registrations گرفته می‌شود
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

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            // ✅ اعتبارسنجی supplier_id
            $validated = $request->validate([
                'sales_date' => 'required|date',
                'cust_id' => 'required|exists:registrations,reg_id',
                'tazkira_number' => 'nullable|string',
                'discount' => 'nullable|numeric|min:0',
                'total_paid' => 'nullable|numeric|min:0',
                'items' => 'required|array|min:1',
                'items.*.med_id' => 'required|exists:medications,med_id',
                'items.*.supplier_id' => 'required|exists:registrations,reg_id', // ✅ اعتبارسنجی supplier
                'items.*.category_id' => 'required|exists:categories,category_id',
                'items.*.type' => 'nullable|string',
                'items.*.quantity' => 'required|numeric|min:1',
                'items.*.unit_sales' => 'required|numeric|min:0',
            ]);

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
                // ✅ بررسی اینکه supplier_id واقعاً از نوع supplier باشد
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("Hamiat Konande mo'tabar nist");
                }

                $sale->items()->create([
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_sales'  => $item['unit_sales'],
                    'total_sales' => $item['quantity'] * $item['unit_sales'],
                ]);
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
                'message' => 'Sale saved successfully',
                'sale_id' => $sale->sales_id
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $sales_id)
    {
        DB::beginTransaction();

        try {
            // ✅ اعتبارسنجی مشابه store
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

            $totalSales = collect($request->items)
                ->sum(fn($i) => $i['quantity'] * $i['unit_sales']);

            $discount = $request->discount ?? 0;
            $netSales = $totalSales - $discount;
            $totalPaid = min($request->total_paid ?? 0, $netSales);

            $sale->items()->delete();

            foreach ($request->items as $item) {
                // ✅ بررسی supplier
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("Hamiat Konande mo'tabar nist");
                }

                $sale->items()->create([
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_sales'  => $item['unit_sales'],
                    'total_sales' => $item['quantity'] * $item['unit_sales'],
                ]);
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

            return response()->json(['message' => 'Sale updated successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Server Error',
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

            return response()->json(['message' => 'Sale deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Server Error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function saveJournal($saleId, $custId, $netSales, $totalPaid, $date)
    {
        Journal::create([
            'journal_date' => $date,
            'description' => 'ثبت فروش',
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
                'description' => 'دریافت وجه فروش',
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