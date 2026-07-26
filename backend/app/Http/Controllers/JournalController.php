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
use App\Services\LogService;
use Illuminate\Support\Facades\DB;

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
        
        // فیلتر بر اساس registration_id
        if ($request->filled('registration_id')) {
            $query->where('registration_id', $request->registration_id);
        }

        $journals = $query->orderBy('journal_date', 'desc')->get();

        $journals->transform(function ($j) {
            $j->full_name = null;
            $j->display_name = null;
            $j->total_amount = null;
            $j->paid_amount = null;
            $j->due_amount = null;
            $j->tazkira_number = $j->tazkira_number;

            // اگر registration_id وجود دارد، اطلاعات را از رجستریشن بگیر
            if ($j->registration_id) {
                $reg = Registrations::find($j->registration_id);
                if ($reg) {
                    $j->full_name = $reg->full_name;
                    $j->display_name = $reg->full_name;
                    $j->tazkira_number = $reg->tazkira_number;
                    $j->reg_type = $reg->reg_type;
                }
            }

            if (in_array($j->ref_type, ['doctor', 'patient', 'customer', 'supplier'])) {
                $reg = Registrations::where('reg_type', $j->ref_type)
                    ->where('reg_id', $j->ref_id)
                    ->first();

                if ($reg) {
                    $j->full_name = $reg->full_name;
                    $j->display_name = $reg->full_name;
                    $j->tazkira_number = $reg->tazkira_number;
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
            'entry_type'   => ['required', Rule::in(['debit', 'credit'])],
            'amount'       => 'required|numeric|min:0.01',
            'ref_type'     => 'required|string',
            'ref_id'       => 'required|integer',
            'pres_id'      => 'nullable|integer',
            'registration_id' => 'nullable|exists:registrations,reg_id', // اضافه شد
            'parent_journal_id' => 'nullable|exists:journals,id', // اضافه شد
        ]);

        DB::beginTransaction();

        try {
            $reg = null;
            if ($validated['registration_id']) {
                $reg = Registrations::find($validated['registration_id']);
            } elseif (!in_array($validated['ref_type'], ['sale', 'parchase'])) {
                $reg = Registrations::where('reg_type', $validated['ref_type'])
                    ->where('reg_id', $validated['ref_id'])
                    ->first();
            }

            if (!$reg && !in_array($validated['ref_type'], ['sale', 'parchase'])) {
                return response()->json(['message' => 'رویداد انتخاب‌شده معتبر نیست.'], 422);
            }

            $journal = Journal::create([
                ...$validated,
                'tazkira_number' => $reg->tazkira_number ?? null,
                'user_id' => Auth::id(),
            ]);

            // اگر registration_id وجود دارد، ژورنال اصلی را بروزرسانی کن
            if ($validated['registration_id']) {
                $this->updateParentJournal($validated['registration_id']);
            }

            LogService::create(
                'create',
                'journals',
                $journal->id,
                'Journal created',
                $journal->toArray()
            );

            DB::commit();

            return response()->json([
                'message' => 'ژورنال با موفقیت ذخیره شد.',
                'journal' => $journal
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'journals',
                null,
                'Error creating journal',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در ذخیره ژورنال',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی ژورنال والد
     */
    private function updateParentJournal($registrationId)
    {
        $parentJournal = Journal::where('registration_id', $registrationId)
            ->whereNull('parent_journal_id')
            ->first();

        if ($parentJournal) {
            $totalDebit = Journal::where('registration_id', $registrationId)
                ->where('entry_type', 'debit')
                ->sum('amount');
            
            $totalCredit = Journal::where('registration_id', $registrationId)
                ->where('entry_type', 'credit')
                ->sum('amount');

            $netAmount = $totalDebit - $totalCredit;

            $parentJournal->update([
                'amount' => $netAmount,
                'description' => "مجموع فیس‌های مریض - مجموع: {$netAmount}"
            ]);
        }
    }

    /**
     * حذف ژورنال
     */
    public function destroy($id)
    {
        $journal = Journal::find($id);

        if (!$journal) {
            return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
        }

        DB::beginTransaction();

        try {
            $journalData = $journal->toArray();
            $registrationId = $journal->registration_id;

            $journal->delete();

            // اگر registration_id وجود دارد، ژورنال والد را بروزرسانی کن
            if ($registrationId) {
                $this->updateParentJournal($registrationId);
            }

            LogService::create(
                'delete',
                'journals',
                $journalData['id'],
                'Journal deleted',
                $journalData
            );

            DB::commit();

            return response()->json(['message' => 'ژورنال با موفقیت حذف شد.']);

        } catch (\Exception $e) {
            DB::rollBack();
            
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

    /**
     * آپدیت یا ایجاد ژورنال
     */
    public function upsert(Request $request, $id = null)
    {
        $validated = $request->validate([
            'journal_date' => 'required|date',
            'description'  => 'nullable|string|max:1000',
            'entry_type'   => ['required', Rule::in(['debit', 'credit'])],
            'amount'       => 'required|numeric|min:0.01',
            'ref_type'     => 'required|string',
            'ref_id'       => 'required|integer',
            'pres_id'      => 'nullable|integer',
            'registration_id' => 'nullable|exists:registrations,reg_id',
            'parent_journal_id' => 'nullable|exists:journals,id',
        ]);

        DB::beginTransaction();

        try {
            $reg = null;
            if ($validated['registration_id']) {
                $reg = Registrations::find($validated['registration_id']);
            } elseif (!in_array($validated['ref_type'], ['sale', 'parchase'])) {
                $reg = Registrations::where('reg_type', $validated['ref_type'])
                    ->where('reg_id', $validated['ref_id'])
                    ->first();
            }

            if (!$reg && !in_array($validated['ref_type'], ['sale', 'parchase'])) {
                return response()->json(['message' => 'رویداد انتخاب‌شده معتبر نیست.'], 422);
            }

            if ($id) {
                // آپدیت رکورد موجود
                $journal = Journal::find($id);
                if (!$journal) {
                    return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
                }

                $oldData = $journal->toArray();
                $registrationId = $journal->registration_id;

                $journal->update([
                    ...$validated,
                    'tazkira_number' => $reg->tazkira_number ?? $journal->tazkira_number,
                    'user_id' => Auth::id(),
                ]);

                // بروزرسانی ژورنال والد
                if ($registrationId) {
                    $this->updateParentJournal($registrationId);
                }

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
                // ایجاد ژورنال جدید
                $journal = Journal::create([
                    ...$validated,
                    'tazkira_number' => $reg->tazkira_number ?? null,
                    'user_id' => Auth::id(),
                ]);

                // بروزرسانی ژورنال والد
                if ($validated['registration_id']) {
                    $this->updateParentJournal($validated['registration_id']);
                }

                LogService::create(
                    'create',
                    'journals',
                    $journal->id,
                    'Journal created',
                    $journal->toArray()
                );

                $message = 'ژورنال با موفقیت ذخیره شد.';
            }

            DB::commit();

            return response()->json([
                'message' => $message,
                'journal' => $journal
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'journals',
                $id,
                'Error in journal upsert',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در عملیات ژورنال',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت خلاصه ژورنال برای یک مریض خاص
     */
    public function getPatientJournalSummary($registrationId)
    {
        $registration = Registrations::find($registrationId);

        if (!$registration) {
            return response()->json(['message' => 'رجستریشن یافت نشد'], 404);
        }

        $journals = Journal::where('registration_id', $registrationId)->get();

        $totalDebit = $journals->where('entry_type', 'debit')->sum('amount');
        $totalCredit = $journals->where('entry_type', 'credit')->sum('amount');
        $balance = $totalDebit - $totalCredit;

        return response()->json([
            'registration' => $registration,
            'total_fees' => $totalDebit,
            'total_payments' => $totalCredit,
            'balance' => $balance,
            'journals' => $journals
        ]);
    }
}