<?php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Sales;
use App\Models\Parchase;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Services\LogService; // ✅ اضافه شد

class JournalController extends Controller
{
    /**
     * نمایش لیست ژورنال‌ها
     */
    public function index(Request $request)
    {
        $query = Journal::query();

        if ($request->filled('type')) $query->where('entry_type', $request->type);
        if ($request->filled('from')) $query->whereDate('journal_date', '>=', $request->from);
        if ($request->filled('to')) $query->whereDate('journal_date', '<=', $request->to);
        if ($request->filled('ref_type')) $query->where('ref_type', $request->ref_type);
        if ($request->filled('ref_id')) $query->where('ref_id', $request->ref_id);

        $journals = $query->orderBy('journal_date', 'desc')->get();

        $journals->transform(function ($j) {

            $j->full_name = null;
            $j->display_name = null;
            $j->total_amount = null;
            $j->paid_amount = null;
            $j->due_amount = null;
            $j->tazkira_number = $j->tazkira_number; // ✅ نمایش مستقیم

            if (in_array($j->ref_type, ['doctor', 'patient', 'customer', 'supplier'])) {
                $reg = Registrations::where('reg_type', $j->ref_type)
                    ->where('reg_id', $j->ref_id)
                    ->first();

                if ($reg) {
                    $j->full_name = $reg->full_name;
                    $j->display_name = $reg->full_name;
                    $j->tazkira_number = $reg->tazkira_number; // ✅ گرفتن از ثبت‌نام
                }
            }

            if ($j->ref_type === 'sale') {
                $sale = Sales::with('customer')->find($j->ref_id);

                if ($sale) {
                    $j->full_name = $sale->customer->full_name ?? null;
                    $j->display_name = $sale->customer->full_name ?? "فروش شماره {$j->ref_id}";
                    $j->tazkira_number = $sale->customer->tazkira_number ?? null;

                    $j->total_amount = $sale->net_sales;
                    $j->paid_amount  = $sale->total_paid;
                    $j->due_amount   = $sale->remaining_amount;
                } else {
                    $j->display_name = "فروش شماره {$j->ref_id}";
                }
            }

            if ($j->ref_type === 'parchase') {
                $parchase = Parchase::with('supplier')->find($j->ref_id);

                if ($parchase) {
                    $j->full_name = $parchase->supplier->full_name ?? null;
                    $j->display_name = $parchase->supplier->full_name ?? "خرید شماره {$j->ref_id}";
                    $j->tazkira_number = $parchase->supplier->tazkira_number ?? null;

                    $j->total_amount = $parchase->total_parchase;
                    $j->paid_amount  = $parchase->par_paid;
                    $j->due_amount   = $parchase->due_par;
                } else {
                    $j->display_name = "خرید شماره {$j->ref_id}";
                }
            }

            if ($j->ref_type === 'patient' && $j->pres_id) {
                $prescription = Prescription::find($j->pres_id);

                if ($prescription) {
                    $j->full_name    = $prescription->patient_name;
                    $j->display_name = "نسخه شماره {$prescription->pres_num}";
                    $j->total_amount = $prescription->net_amount;
                    $j->paid_amount  = $prescription->net_amount;
                    $j->due_amount   = 0;
                }
            }

            return $j;
        });

        return response()->json($journals);
    }

    /**
     * ذخیره ژورنال جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'journal_date' => 'required|date',
            'description'  => 'nullable|string|max:1000',
            'entry_type'   => ['required', Rule::in(['debit','credit'])],
            'amount'       => 'required|numeric|min:0.01',
            'ref_type'     => 'required|string',
            'ref_id'       => 'required|integer',
            'pres_id'      => 'nullable|integer',
        ]);

        $reg = Registrations::where('reg_type', $validated['ref_type'])
            ->where('reg_id', $validated['ref_id'])
            ->first();

        if (! $reg && !in_array($validated['ref_type'], ['sale','parchase'])) {
            return response()->json(['message' => 'رویداد انتخاب‌شده معتبر نیست.'], 422);
        }

        $journal = Journal::create([
            ...$validated,
            'tazkira_number' => $reg->tazkira_number ?? null,
            'user_id' => Auth::id(),
        ]);

        // ✅ لاگ با LogService
        LogService::create(
            'create',
            'journals',
            $journal->id,
            'Journal created',
            $journal->toArray()
        );

        return response()->json([
            'message' => 'ژورنال با موفقیت ذخیره شد.',
            'journal' => $journal
        ], 201);
    }

    public function destroy($id)
    {
        $journal = Journal::find($id);

        if (!$journal) {
            return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
        }

        // ✅ ذخیره اطلاعات قبل از حذف برای لاگ
        $journalData = $journal->toArray();

        try {
            $journal->delete();

            // ✅ لاگ با LogService
            LogService::create(
                'delete',
                'journals',
                $journalData['id'],
                'Journal deleted',
                $journalData
            );

            return response()->json(['message' => 'ژورنال با موفقیت حذف شد.']);
        } catch (\Exception $e) {
            LogService::create(
                'error',
                'journals',
                $id,
                'Error deleting journal',
                ['error' => $e->getMessage()]
            );
            return response()->json(['message' => 'خطا در حذف ژورنال.'], 500);
        }
    }

    public function upsert(Request $request, $id = null)
    {
        $validated = $request->validate([
            'journal_date' => 'required|date',
            'description'  => 'nullable|string|max:1000',
            'entry_type'   => ['required', Rule::in(['debit','credit'])],
            'amount'       => 'required|numeric|min:0.01',
            'ref_type'     => 'required|string',
            'ref_id'       => 'required|integer',
            'pres_id'      => 'nullable|integer',
        ]);

        $reg = Registrations::where('reg_type', $validated['ref_type'])
            ->where('reg_id', $validated['ref_id'])
            ->first();

        if (! $reg && !in_array($validated['ref_type'], ['sale','parchase'])) {
            return response()->json(['message' => 'رویداد انتخاب‌شده معتبر نیست.'], 422);
        }

        if ($id) {
            // ⚡ آپدیت رکورد موجود
            $journal = Journal::find($id);
            if (!$journal) {
                return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
            }

            $oldData = $journal->toArray(); // ✅ ذخیره داده‌های قبلی برای لاگ

            $journal->update([
                ...$validated,
                'tazkira_number' => $reg->tazkira_number ?? $journal->tazkira_number,
                'user_id' => Auth::id(),
            ]);

            // ✅ لاگ آپدیت با LogService
            LogService::create(
                'update',
                'journals',
                $journal->id,
                'Journal updated',
                [
                    'old' => $oldData,
                    'new' => $journal->toArray()
                ]
            );

            $message = 'ژورنال با موفقیت آپدیت شد.';
        } else {
            // ⚡ ایجاد ژورنال جدید
            $journal = Journal::create([
                ...$validated,
                'tazkira_number' => $reg->tazkira_number ?? null,
                'user_id' => Auth::id(),
            ]);

            // ✅ لاگ با LogService
            LogService::create(
                'create',
                'journals',
                $journal->id,
                'Journal created',
                $journal->toArray()
            );

            $message = 'ژورنال با موفقیت ذخیره شد.';
        }

        return response()->json([
            'message' => $message,
            'journal' => $journal
        ], 200);
    }
}