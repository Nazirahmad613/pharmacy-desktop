<?php
// app/Http/Controllers/JournalController.php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Sales;
use App\Models\Parchase;
use App\Models\Prescription;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Services\LogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class JournalController extends Controller
{
    /* ============================================================
     *  نمایش لیست ژورنال‌ها
     * ============================================================ */
    public function index(Request $request)
    {
        $query = Journal::query();

        if ($request->filled('type'))     $query->where('entry_type', $request->type);
        if ($request->filled('from'))     $query->whereDate('journal_date', '>=', $request->from);
        if ($request->filled('to'))       $query->whereDate('journal_date', '<=', $request->to);
        if ($request->filled('ref_type')) $query->where('ref_type', $request->ref_type);
        if ($request->filled('ref_id'))   $query->where('ref_id', $request->ref_id);
        if ($request->filled('reg_id'))   $query->where('reg_id', $request->reg_id);

        $journals = $query->orderBy('journal_date', 'desc')->get();

        $journals->transform(function ($j) {
            $j->full_name    = null;
            $j->display_name = null;
            $j->total_amount = null;
            $j->paid_amount  = null;
            $j->due_amount   = null;
            $j->source_name  = null;

            /* ====================================================
             * 1) sale
             * ==================================================== */
            if ($j->ref_type === 'sale') {
                $sale = Sales::with('customer')->find($j->ref_id);
                if ($sale) {
                    $name = $sale->customer->account_name
                        ?? $sale->customer->full_name
                        ?? $sale->customer->name
                        ?? "فروش شماره {$j->ref_id}";
                    $j->full_name      = $name;
                    $j->display_name   = $name;
                    $j->source_name    = $name;
                    $j->tazkira_number = $sale->customer->tazkira_number ?? $j->tazkira_number;
                    $j->total_amount   = $sale->net_sales;
                    $j->paid_amount    = $sale->total_paid;
                    $j->due_amount     = $sale->remaining_amount;
                } else {
                    $j->source_name = "فروش شماره {$j->ref_id}";
                }
                return $j;
            }

            /* ====================================================
             * 2) parchase
             * ==================================================== */
            if ($j->ref_type === 'parchase') {
                $p = Parchase::with('supplier')->find($j->ref_id);
                if ($p) {
                    $name = $p->supplier->account_name
                        ?? $p->supplier->full_name
                        ?? $p->supplier->name
                        ?? "خرید شماره {$j->ref_id}";
                    $j->full_name      = $name;
                    $j->display_name   = $name;
                    $j->source_name    = $name;
                    $j->tazkira_number = $p->supplier->tazkira_number ?? $j->tazkira_number;
                    $j->total_amount   = $p->total_parchase;
                    $j->paid_amount    = $p->par_paid;
                    $j->due_amount     = $p->due_par;
                } else {
                    $j->source_name = "خرید شماره {$j->ref_id}";
                }
                return $j;
            }

            /* ====================================================
             * 3) patient → نام کامل از patients
             * ==================================================== */
            if ($j->ref_type === 'patient') {
                $patient = $this->findPatientForJournal($j);

                if ($patient) {
                    $patientName = trim(
                        ($patient->first_name ?? '') . ' ' .
                        ($patient->last_name ?? '')
                    );

                    if ($patientName !== '') {
                        $j->full_name    = $patientName;
                        $j->display_name = $patientName;
                        $j->source_name  = $patientName;
                    } else {
                        $j->source_name = "مریض #{$patient->id}";
                    }

                    if (!empty($patient->national_id)) {
                        $j->tazkira_number = $patient->national_id;
                    }
                }

                // Fallback: از registrations
                if (empty($j->source_name)) {
                    $regIdToUse = $j->reg_id ?: $j->ref_id;
                    if ($regIdToUse) {
                        $reg = Registrations::where('reg_id', $regIdToUse)->first();
                        if ($reg) {
                            $j->full_name    = $reg->full_name ?? null;
                            $j->display_name = $reg->full_name ?? null;
                            $j->source_name  = $reg->full_name ?? null;

                            if (empty($j->tazkira_number)) {
                                $j->tazkira_number = $reg->tazkira_number ?? null;
                            }
                            $j->reg_type = $reg->reg_type;
                        }
                    }
                }

                // اطلاعات نسخه
                if ($j->pres_id) {
                    $prescription = Prescription::find($j->pres_id);
                    if ($prescription) {
                        $j->display_name = "نسخه شماره {$prescription->pres_num}";
                        if (empty($j->source_name) && !empty($prescription->patient_name)) {
                            $j->source_name = $prescription->patient_name;
                        }
                        $j->total_amount = $prescription->net_amount;
                        $j->paid_amount  = $prescription->net_amount;
                        $j->due_amount   = 0;
                    }
                }

                // Fallback: از description
                if (empty($j->source_name) && !empty($j->description)) {
                    $j->source_name = $this->extractNameFromDescription($j->description);
                }

                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "مریض #{$j->ref_id}";
                }

                return $j;
            }

            /* ====================================================
             * 4) سایر انواع (doctor, nurse, supplier, ...)
             * ==================================================== */
            if (method_exists($j, 'resolveSourceName')) {
                try {
                    $name = $j->resolveSourceName();
                    if (!empty($name) && $name !== '-') {
                        $j->source_name = $name;
                    }
                } catch (\Throwable $e) {
                    Log::warning('resolveSourceName failed for Journal #' . $j->id . ': ' . $e->getMessage());
                }
            }

            if ($j->reg_id) {
                $reg = Registrations::where('reg_id', $j->reg_id)->first();
                if ($reg) {
                    $j->full_name    = $reg->full_name ?? $j->full_name;
                    $j->display_name = $reg->full_name ?? $j->display_name;
                    if (empty($j->tazkira_number)) {
                        $j->tazkira_number = $reg->tazkira_number ?? null;
                    }
                    $j->reg_type = $reg->reg_type;

                    if (empty($j->source_name) && !empty($reg->full_name)) {
                        $j->source_name = $reg->full_name;
                    }
                }
            }

            if (empty($j->source_name)) {
                $j->source_name = $j->description ?: "منبع #{$j->ref_id}";
            }

            return $j;
        });

        return response()->json($journals);
    }

    /* ============================================================
     *  پیدا کردن مریض از چند مسیر
     * ============================================================ */
    private function findPatientForJournal(Journal $journal): ?Patient
    {
        try {
            // 1) patient_id مستقیم
            if (!empty($journal->patient_id)) {
                $p = Patient::find($journal->patient_id);
                if ($p) return $p;
            }

            // 2) reg_id → registrations.patient_id
            if (!empty($journal->reg_id)) {
                $reg = Registrations::where('reg_id', $journal->reg_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
            }

            // 3) ref_id به‌عنوان reg_id
            if (!empty($journal->ref_id)) {
                $reg = Registrations::where('reg_id', $journal->ref_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
            }

            // 4) ref_id مستقیم به‌عنوان patient_id
            if (!empty($journal->ref_id)) {
                $p = Patient::find($journal->ref_id);
                if ($p) return $p;
            }

            // 5) از parent_journal
            if (!empty($journal->parent_journal_id)) {
                $parent = Journal::find($journal->parent_journal_id);
                if ($parent) {
                    if (!empty($parent->patient_id)) {
                        $p = Patient::find($parent->patient_id);
                        if ($p) return $p;
                    }
                    if (!empty($parent->reg_id)) {
                        $reg = Registrations::where('reg_id', $parent->reg_id)->first();
                        if ($reg && !empty($reg->patient_id)) {
                            $p = Patient::find($reg->patient_id);
                            if ($p) return $p;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('findPatientForJournal failed for Journal #' . $journal->id . ': ' . $e->getMessage());
        }

        return null;
    }

    /* ============================================================
     *  استخراج نام از description
     * ============================================================ */
    private function extractNameFromDescription(?string $description): ?string
    {
        if (empty($description)) return null;

        $patterns = [
            '/بیمار\s+(.+?)(?:\s*-\s*رسید|$)/u',
            '/مریض\s+(.+?)(?:\s*-\s*رسید|$)/u',
            '/بیمار\s*:\s*(.+?)(?:\s*-\s*|$)/u',
            '/مریض\s*:\s*(.+?)(?:\s*-\s*|$)/u',
            '/patient\s*:\s*(.+?)(?:\s*-\s*|$)/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $description, $m)) {
                $name = trim($m[1]);
                if ($name !== '') return $name;
            }
        }

        return null;
    }

    /* ============================================================
     *  ✅ دریافت لیست منابع
     * ============================================================ */
    public function getRefSources(Request $request)
    {
        $request->validate([
            'type'   => 'required|string',
            'search' => 'nullable|string|max:255',
        ]);

        try {
            $sources = Journal::getRefSources(
                $request->type,
                $request->search,
                min((int) $request->get('limit', 100), 500)
            );

            return response()->json([
                'success' => true,
                'data'    => $sources,
                'count'   => count($sources),
                'type'    => $request->type,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت منابع',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /* ============================================================
     *  store
     * ============================================================ */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'journal_date'      => 'required|date',
            'description'       => 'nullable|string|max:1000',
            'entry_type'        => ['required', Rule::in(['debit', 'credit'])],
            'amount'            => 'required|numeric|min:0.01',
            'ref_type'          => 'required|string',
            'ref_id'            => 'required|integer',
            'pres_id'           => 'nullable|integer',
            'reg_id'            => 'nullable|integer',
            'tazkira_number'    => 'nullable|string|max:255',
            'parent_journal_id' => 'nullable|exists:journals,id',
        ]);

        DB::beginTransaction();

        try {
            $reg = $this->resolveRegistration($validated);
            $patientId = $this->resolvePatientIdFromValidated($validated);

            $data = [
                'journal_date'      => $validated['journal_date'],
                'description'       => $validated['description'] ?? null,
                'entry_type'        => $validated['entry_type'],
                'amount'            => $validated['amount'],
                'ref_type'          => $validated['ref_type'],
                'ref_id'            => $validated['ref_id'],
                'pres_id'           => $validated['pres_id'] ?? null,
                'reg_id'            => $validated['reg_id'] ?? null,
                'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                'tazkira_number'    => $validated['tazkira_number']
                    ?? $reg->tazkira_number
                    ?? null,
                'user_id'           => Auth::id(),
            ];

            if ($patientId && $this->journalHasPatientIdColumn()) {
                $data['patient_id'] = $patientId;
            }

            $journal = Journal::create($data);

            if (!empty($validated['reg_id'])) {
                $this->updateParentJournal($validated['reg_id']);
            }

            LogService::create('create', 'journals', $journal->id, 'Journal created', $journal->toArray());

            DB::commit();

            return response()->json([
                'message' => 'ژورنال با موفقیت ذخیره شد.',
                'journal' => $journal
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', null, 'Error creating journal', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در ذخیره ژورنال', 'error' => $e->getMessage()], 500);
        }
    }

    /* ============================================================
     *  updateParentJournal
     * ============================================================ */
    private function updateParentJournal($regId)
    {
        if (!$regId) return;

        $parentJournal = Journal::where('reg_id', $regId)
            ->whereNull('parent_journal_id')
            ->first();

        if ($parentJournal) {
            $totalDebit = Journal::where('reg_id', $regId)
                ->whereNull('parent_journal_id')
                ->where('entry_type', 'debit')
                ->sum('amount');

            $totalCredit = Journal::where('reg_id', $regId)
                ->whereNull('parent_journal_id')
                ->where('entry_type', 'credit')
                ->sum('amount');

            $netAmount = $totalDebit - $totalCredit;

            $parentJournal->update([
                'amount'      => $netAmount,
                'description' => "مجموع فیس‌های مریض - مجموع: {$netAmount}"
            ]);
        }
    }

    /* ============================================================
     *  destroy
     * ============================================================ */
    public function destroy($id)
    {
        $journal = Journal::find($id);
        if (!$journal) return response()->json(['message' => 'ژورنال یافت نشد.'], 404);

        DB::beginTransaction();

        try {
            $journalData = $journal->toArray();
            $regId = $journal->reg_id;

            if (is_null($journal->parent_journal_id)) {
                Journal::where('parent_journal_id', $journal->id)->delete();
            }

            $journal->delete();

            if ($regId) $this->updateParentJournal($regId);

            LogService::create('delete', 'journals', $journalData['id'], 'Journal deleted', $journalData);
            DB::commit();

            return response()->json(['message' => 'ژورنال با موفقیت حذف شد.']);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', $id, 'Error deleting journal', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در حذف ژورنال.'], 500);
        }
    }

    /* ============================================================
     *  upsert
     * ============================================================ */
    public function upsert(Request $request, $id = null)
    {
        $validated = $request->validate([
            'journal_date'      => 'required|date',
            'description'       => 'nullable|string|max:1000',
            'entry_type'        => ['required', Rule::in(['debit', 'credit'])],
            'amount'            => 'required|numeric|min:0.01',
            'ref_type'          => 'required|string',
            'ref_id'            => 'required|integer',
            'pres_id'           => 'nullable|integer',
            'reg_id'            => 'nullable|integer',
            'tazkira_number'    => 'nullable|string|max:255',
            'parent_journal_id' => 'nullable|exists:journals,id',
        ]);

        DB::beginTransaction();

        try {
            $reg = $this->resolveRegistration($validated);
            $patientId = $this->resolvePatientIdFromValidated($validated);
            $hasPatientIdCol = $this->journalHasPatientIdColumn();

            if ($id) {
                $journal = Journal::find($id);
                if (!$journal) {
                    DB::rollBack();
                    return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
                }

                $oldData  = $journal->toArray();
                $oldRegId = $journal->reg_id;
                $newRegId = $validated['reg_id'] ?? null;

                $data = [
                    'journal_date'      => $validated['journal_date'],
                    'description'       => $validated['description'] ?? null,
                    'entry_type'        => $validated['entry_type'],
                    'amount'            => $validated['amount'],
                    'ref_type'          => $validated['ref_type'],
                    'ref_id'            => $validated['ref_id'],
                    'pres_id'           => $validated['pres_id'] ?? null,
                    'reg_id'            => $newRegId,
                    'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                    'tazkira_number'    => $validated['tazkira_number']
                        ?? $reg->tazkira_number
                        ?? $journal->tazkira_number,
                    'user_id'           => Auth::id(),
                ];

                if ($hasPatientIdCol && $patientId) {
                    $data['patient_id'] = $patientId;
                }

                $journal->update($data);

                if ($oldRegId && $oldRegId != $newRegId) $this->updateParentJournal($oldRegId);
                if ($newRegId) $this->updateParentJournal($newRegId);

                LogService::create('update', 'journals', $journal->id, 'Journal updated', ['old' => $oldData, 'new' => $journal->toArray()]);
                $message = 'ژورنال با موفقیت آپدیت شد.';
            } else {
                $data = [
                    'journal_date'      => $validated['journal_date'],
                    'description'       => $validated['description'] ?? null,
                    'entry_type'        => $validated['entry_type'],
                    'amount'            => $validated['amount'],
                    'ref_type'          => $validated['ref_type'],
                    'ref_id'            => $validated['ref_id'],
                    'pres_id'           => $validated['pres_id'] ?? null,
                    'reg_id'            => $validated['reg_id'] ?? null,
                    'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                    'tazkira_number'    => $validated['tazkira_number']
                        ?? $reg->tazkira_number
                        ?? null,
                    'user_id'           => Auth::id(),
                ];

                if ($hasPatientIdCol && $patientId) {
                    $data['patient_id'] = $patientId;
                }

                $journal = Journal::create($data);

                if (!empty($validated['reg_id'])) $this->updateParentJournal($validated['reg_id']);

                LogService::create('create', 'journals', $journal->id, 'Journal created', $journal->toArray());
                $message = 'ژورنال با موفقیت ذخیره شد.';
            }

            DB::commit();

            return response()->json(['message' => $message, 'journal' => $journal], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', $id, 'Error in journal upsert', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در عملیات ژورنال', 'error' => $e->getMessage()], 500);
        }
    }

    /* ============================================================
     *  getPatientJournalSummary
     * ============================================================ */
    public function getPatientJournalSummary($regId)
    {
        $registration = Registrations::where('reg_id', $regId)->first();
        if (!$registration) return response()->json(['message' => 'رجستریشن یافت نشد'], 404);

        $journals = Journal::where('reg_id', $regId)->get();
        $childJournals = $journals->whereNotNull('parent_journal_id');

        $totalDebit  = $childJournals->where('entry_type', 'debit')->sum('amount');
        $totalCredit = $childJournals->where('entry_type', 'credit')->sum('amount');
        $balance = $totalDebit - $totalCredit;

        return response()->json([
            'registration'    => $registration,
            'total_fees'      => $totalDebit,
            'total_payments'  => $totalCredit,
            'balance'         => $balance,
            'journals'        => $journals
        ]);
    }

    /* ============================================================
     *  resolveRegistration
     * ============================================================ */
    private function resolveRegistration(array $validated): ?Registrations
    {
        if (!empty($validated['reg_id'])) {
            return Registrations::where('reg_id', $validated['reg_id'])->first();
        }

        if (in_array($validated['ref_type'], ['sale', 'parchase', 'patient'])) {
            return null;
        }

        return Registrations::where('reg_type', $validated['ref_type'])
            ->where('reg_id', $validated['ref_id'])
            ->first();
    }

    /* ============================================================
     *  استخراج patient_id
     * ============================================================ */
    private function resolvePatientIdFromValidated(array $validated): ?int
    {
        try {
            if (!empty($validated['reg_id'])) {
                $reg = Registrations::where('reg_id', $validated['reg_id'])->first();
                if ($reg && !empty($reg->patient_id)) {
                    return (int) $reg->patient_id;
                }
            }

            if (!empty($validated['ref_id'])) {
                $reg = Registrations::where('reg_id', $validated['ref_id'])->first();
                if ($reg && !empty($reg->patient_id)) {
                    return (int) $reg->patient_id;
                }

                $patient = Patient::find($validated['ref_id']);
                if ($patient) {
                    return (int) $patient->id;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('resolvePatientIdFromValidated failed: ' . $e->getMessage());
        }

        return null;
    }

    /* ============================================================
     *  بررسی وجود ستون patient_id
     * ============================================================ */
    private function journalHasPatientIdColumn(): bool
    {
        static $hasColumn = null;

        if ($hasColumn === null) {
            try {
                $hasColumn = \Schema::hasColumn('journals', 'patient_id');
            } catch (\Throwable $e) {
                $hasColumn = false;
            }
        }

        return $hasColumn;
    }
}