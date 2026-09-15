<?php

namespace App\Http\Controllers;

use App\Models\Parchase;
use App\Models\ParchaseItem;
use App\Models\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService;
use App\Services\StockService;

class ParchasesController extends Controller
{
    // ============================================================
    // لیست خریدها
    // ============================================================
    public function index()
    {
        $parchases = Parchase::with([
            'items.medication',
            'items.category',
            'items.supplier',
            'supplier'
        ])->latest()->get();

        return response()->json($parchases);
    }


    // ============================================================
    // ثبت خرید جدید
    // ============================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'parchase_date' => 'required|date',
            'par_paid'      => 'required|numeric|min:0',
            'supplier_id'   => 'required|exists:accounts,id',
            'items'         => 'required|array|min:1',
            'items.*.med_id'      => 'required|exists:medications,med_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.type'        => 'nullable|string',
            'items.*.batch_no'    => 'nullable|string|max:255',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.exp_date'    => 'required|date',
        ]);

        DB::beginTransaction();

        try {
            $total_parchase = collect($validated['items'])
                ->sum(fn($i) => $i['quantity'] * $i['unit_price']);

            $due_par = $total_parchase - $validated['par_paid'];

            $parchase = Parchase::create([
                'parchase_date'  => $validated['parchase_date'],
                'total_parchase' => $total_parchase,
                'par_paid'       => $validated['par_paid'],
                'due_par'        => $due_par,
                'par_user'       => Auth::id(),
                'supplier_id'    => $validated['supplier_id'],
            ]);

            foreach ($validated['items'] as $item) {

                // ثبت آیتم خرید
                $parchase->items()->create([
                    'med_id'         => $item['med_id'],
                    'category_id'    => $item['category_id'],
                    'type'           => $item['type'] ?? null,
                    'batch_no'       => $item['batch_no'] ?? null,
                    'quantity'       => $item['quantity'],
                    'remaining_qty'  => $item['quantity'],
                    'unit_price'     => $item['unit_price'],
                    'total_price'    => $item['quantity'] * $item['unit_price'],
                    'exp_date'       => $item['exp_date'],
                    'supplier_id'    => $validated['supplier_id'],
                ]);

                // افزایش موجودی (استاک) با type و batch_number
                StockService::increase(
                    $item['med_id'],
                    $validated['supplier_id'],
                    $item['exp_date'],
                    $item['quantity'],
                    $item['type'] ?? null,
                    $item['batch_no'] ?? null
                );
            }

            // ثبت ژورنال خرید
            $this->syncJournal($parchase);

            DB::commit();

            LogService::create(
                'create',
                'parchases',
                $parchase->parchase_id,
                'Parchase created',
                $parchase->load('items')->toArray()
            );

            return response()->json([
                'success' => true,
                'message' => 'خرید با موفقیت ثبت شد',
                'data' => $parchase->load([
                    'items.medication',
                    'items.category',
                    'items.supplier',
                    'supplier'
                ])
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Parchase Store Error', [
                'error'   => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت خرید',
                'error'   => $e->getMessage()
            ], 500);
        }
    }


    // ============================================================
    // بروزرسانی خرید
    // ============================================================
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'parchase_date' => 'required|date',
            'par_paid'      => 'required|numeric|min:0',
            'supplier_id'   => 'required|exists:accounts,id',
            'items'         => 'required|array|min:1',
            'items.*.med_id'      => 'required|exists:medications,med_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.type'        => 'nullable|string',
            'items.*.batch_no'    => 'nullable|string|max:255',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.exp_date'    => 'required|date',
        ]);

        DB::beginTransaction();

        try {
            $parchase = Parchase::findOrFail($id);

            $oldData = $parchase->load('items')->toArray();

            // ✅ برگرداندن موجودی آیتم‌های قبلی
            // - از remaining_qty استفاده می‌کنیم نه quantity
            //   چون ممکن است بخشی از batch فروخته شده باشد
            // - batch_no را هم پاس می‌دهیم
            foreach ($parchase->items as $oldItem) {

                StockService::reverseDecrease(
                    $oldItem->med_id,
                    $parchase->supplier_id,
                    $oldItem->exp_date,
                    $oldItem->remaining_qty,      // ← مهم
                    $oldItem->type,
                    $oldItem->batch_no            // ← مهم
                );
            }

            // حذف آیتم‌ها و ژورنال قبلی
            $parchase->items()->delete();

            Journal::where('ref_type', 'parchase')
                ->where('ref_id', $parchase->parchase_id)
                ->delete();

            $total_parchase = collect($validated['items'])
                ->sum(fn($i) => $i['quantity'] * $i['unit_price']);

            $due_par = $total_parchase - $validated['par_paid'];

            $parchase->update([
                'parchase_date'  => $validated['parchase_date'],
                'total_parchase' => $total_parchase,
                'par_paid'       => $validated['par_paid'],
                'due_par'        => $due_par,
                'supplier_id'    => $validated['supplier_id'],
            ]);

            // ثبت آیتم‌های جدید و افزایش موجودی
            foreach ($validated['items'] as $item) {

                $parchase->items()->create([
                    'med_id'         => $item['med_id'],
                    'category_id'    => $item['category_id'],
                    'type'           => $item['type'] ?? null,
                    'batch_no'       => $item['batch_no'] ?? null,
                    'quantity'       => $item['quantity'],
                    'remaining_qty'  => $item['quantity'],
                    'unit_price'     => $item['unit_price'],
                    'total_price'    => $item['quantity'] * $item['unit_price'],
                    'exp_date'       => $item['exp_date'],
                    'supplier_id'    => $validated['supplier_id'],
                ]);

                StockService::increase(
                    $item['med_id'],
                    $validated['supplier_id'],
                    $item['exp_date'],
                    $item['quantity'],
                    $item['type'] ?? null,
                    $item['batch_no'] ?? null
                );
            }

            $this->syncJournal($parchase);

            DB::commit();

            LogService::create(
                'update',
                'parchases',
                $parchase->parchase_id,
                'Parchase updated',
                [
                    'old' => $oldData,
                    'new' => $parchase->load('items')->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'خرید با موفقیت بروزرسانی شد',
                'data' => $parchase->load([
                    'items.medication',
                    'items.category',
                    'items.supplier',
                    'supplier'
                ])
            ], 200);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Parchase Update Error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی خرید',
                'error'   => $e->getMessage()
            ], 500);
        }
    }


    // ============================================================
    // حذف خرید
    // ============================================================
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $parchase = Parchase::findOrFail($id);

            $data = $parchase->load('items')->toArray();

            // ✅ برگرداندن موجودی آیتم‌ها قبل از حذف
            foreach ($parchase->items as $item) {

                StockService::reverseDecrease(
                    $item->med_id,
                    $parchase->supplier_id,
                    $item->exp_date,
                    $item->remaining_qty,      // ← مهم
                    $item->type,
                    $item->batch_no            // ← مهم
                );
            }

            // حذف ژورنال و آیتم‌ها
            Journal::where('ref_type', 'parchase')
                ->where('ref_id', $parchase->parchase_id)
                ->delete();

            $parchase->items()->delete();
            $parchase->delete();

            DB::commit();

            LogService::create(
                'delete',
                'parchases',
                $id,
                'Parchase deleted',
                $data
            );

            return response()->json([
                'success' => true,
                'message' => 'خرید با موفقیت حذف شد'
            ], 200);

        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Parchase Delete Error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف خرید',
                'error'   => $e->getMessage()
            ], 500);
        }
    }


    // ============================================================
    // ژورنال
    // ============================================================
    private function syncJournal($parchase)
    {
        // جلوگیری از ژورنال تکراری
        Journal::where('ref_type', 'parchase')
            ->where('ref_id', $parchase->parchase_id)
            ->delete();

        Journal::create([
            'journal_date' => $parchase->parchase_date,
            'description'  => "خرید دوا شماره {$parchase->parchase_id} از تأمین‌کننده",
            'entry_type'   => Journal::ENTRY_DEBIT,
            'amount'       => $parchase->total_parchase,
            'parchase_id'  => $parchase->parchase_id,
            'ref_type'     => 'parchase',
            'ref_id'       => $parchase->parchase_id,
            'user_id'      => Auth::id(),
        ]);

        if ($parchase->par_paid > 0) {

            Journal::create([
                'journal_date' => $parchase->parchase_date,
                'description'  => "پرداخت خرید شماره {$parchase->parchase_id}",
                'entry_type'   => Journal::ENTRY_CREDIT,
                'amount'       => $parchase->par_paid,
                'parchase_id'  => $parchase->parchase_id,
                'ref_type'     => 'parchase',
                'ref_id'       => $parchase->parchase_id,
                'user_id'      => Auth::id(),
            ]);
        }
    }
}