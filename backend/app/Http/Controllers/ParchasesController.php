<?php
namespace App\Http\Controllers;

use App\Models\Parchase;
use App\Models\ParchaseItem;
use App\Models\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService; // ✅ اضافه شد

class ParchasesController extends Controller
{
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'parchase_date' => 'required|date',
            'par_paid'      => 'required|numeric|min:0',
            'supplier_id'   => 'required|exists:registrations,reg_id',
            'items'         => 'required|array|min:1',
            'items.*.med_id'      => 'required|exists:medications,med_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.type'        => 'nullable|string',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.exp_date'    => 'required|date',
        ]);

        DB::beginTransaction();
        try {
            $total_parchase = collect($validated['items'])->sum(fn($i) => $i['quantity'] * $i['unit_price']);
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
                $parchase->items()->create([
                    'med_id'      => $item['med_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'exp_date'    => $item['exp_date'],
                ]);
            }

            // ثبت ژورنال خرید و پرداخت
            $this->syncJournal($parchase);

            DB::commit();

            // ✅ لاگ ثبت خرید
            LogService::create(
                'create',
                'parchases',
                $parchase->parchase_id,
                'Parchase created',
                $parchase->load('items')->toArray()
            );

            return response()->json($parchase->load(['items.medication','items.category','items.supplier','supplier']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Parchase Store Error', ['error'=>$e->getMessage(),'request'=>$request->all()]);
            return response()->json(['message'=>'خطا در ثبت خرید','error'=>$e->getMessage()],500);
        }
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'parchase_date' => 'required|date',
            'par_paid'      => 'required|numeric|min:0',
            'supplier_id'   => 'required|exists:registrations,reg_id',
            'items'         => 'required|array|min:1',
            'items.*.med_id'      => 'required|exists:medications,med_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.type'        => 'nullable|string',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.exp_date'    => 'required|date',
        ]);

        DB::beginTransaction();
        try {
            $parchase = Parchase::findOrFail($id);
            $oldData = $parchase->load('items')->toArray(); // ✅ داده‌های قبلی

            // حذف آیتم‌ها و ژورنال قبلی
            $parchase->items()->delete();
            Journal::where('ref_type','parchase')->where('ref_id',$parchase->parchase_id)->delete();

            $total_parchase = collect($validated['items'])->sum(fn($i) => $i['quantity'] * $i['unit_price']);
            $due_par = $total_parchase - $validated['par_paid'];

            $parchase->update([
                'parchase_date'  => $validated['parchase_date'],
                'total_parchase' => $total_parchase,
                'par_paid'       => $validated['par_paid'],
                'due_par'        => $due_par,
                'supplier_id'    => $validated['supplier_id'],
            ]);

            foreach ($validated['items'] as $item) {
                $parchase->items()->create([
                    'med_id'      => $item['med_id'],
                    'category_id' => $item['category_id'],
                    'type'        => $item['type'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'exp_date'    => $item['exp_date'],
                ]);
            }

            $this->syncJournal($parchase);

            DB::commit();

            // ✅ لاگ بروزرسانی
            LogService::create(
                'update',
                'parchases',
                $parchase->parchase_id,
                'Parchase updated',
                [
                    'old' => $oldData,
                    'new' => $parchase->load('items')->toArray()
                ]
            );

            return response()->json($parchase->load(['items.medication','items.category','items.supplier','supplier']), 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Parchase Update Error', ['error'=>$e->getMessage(),'request'=>$request->all()]);
            return response()->json(['message'=>'خطا در بروزرسانی خرید','error'=>$e->getMessage()],500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $parchase = Parchase::findOrFail($id);
            $data = $parchase->load('items')->toArray(); // ✅ ذخیره اطلاعات قبل از حذف

            // حذف ژورنال و آیتم‌ها
            Journal::where('ref_type','parchase')->where('ref_id',$parchase->parchase_id)->delete();
            $parchase->items()->delete();
            $parchase->delete();

            DB::commit();

            // ✅ لاگ حذف
            LogService::create(
                'delete',
                'parchases',
                $id,
                'Parchase deleted',
                $data
            );

            return response()->json(['message'=>'خرید حذف شد'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Parchase Delete Error', ['error'=>$e->getMessage()]);
            return response()->json(['message'=>'خطا در حذف خرید','error'=>$e->getMessage()],500);
        }
    }

    private function syncJournal($parchase)
    {
        Journal::create([
            'journal_date' => $parchase->parchase_date,
            'description'  => "خرید دارو شماره {$parchase->parchase_id}",
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