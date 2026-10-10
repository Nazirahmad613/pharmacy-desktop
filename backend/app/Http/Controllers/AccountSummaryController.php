<?php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Sales;
use App\Models\Parchase;
use App\Models\Prescription;
use App\Models\ExternalPrescription;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountSummaryController extends Controller
{
    /**
     * GET /api/account-summary
     */
    public function index(Request $request)
    {
        $type   = $request->query('type');
        $search = $request->query('search');
        $page   = max(1, (int) $request->query('page', 1));
        $limit  = min(100, max(1, (int) $request->query('limit', 10)));
        $offset = ($page - 1) * $limit;

        $journals = Journal::orderBy('journal_date', 'desc')->get();

        // ✅ همان transform JournalController@index
        $journals->transform(function ($j) {
            $j->total_amount = null;
            $j->paid_amount  = null;
            $j->due_amount   = null;
            $j->source_name  = null;

            // external_prescription
            if ($j->ref_type === 'external_prescription') {
                $external = ExternalPrescription::find($j->ref_id);
                if ($external) {
                    $j->source_name  = $external->patient_name ?: "نسخه بیرونی #{$j->ref_id}";
                    $j->total_amount = (float) $external->total_amount;
                    $j->paid_amount  = (float) $j->amount;
                    $j->due_amount   = max(0,
                        (float) $external->total_amount
                        - (float) ($external->discount ?? 0)
                        - (float) $j->amount
                    );
                    $j->tazkira_number = $external->tazkira_number ?? $j->tazkira_number;
                } else {
                    $j->source_name = "نسخه بیرونی #{$j->ref_id}";
                }
                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "نسخه بیرونی #{$j->ref_id}";
                }
                return $j;
            }

            // sale
            if ($j->ref_type === 'sale') {
                $sale = Sales::with('customer')->find($j->ref_id);
                if ($sale) {
                    $j->source_name    = $sale->customer->account_name ?? "فروش #{$j->ref_id}";
                    $j->total_amount   = (float) $sale->net_sales;
                    $j->paid_amount    = (float) $sale->total_paid;
                    $j->due_amount     = (float) $sale->remaining_amount;
                    $j->tazkira_number = $sale->customer->tazkira_number ?? $j->tazkira_number;
                } else {
                    $j->source_name = "فروش #{$j->ref_id}";
                }
                return $j;
            }

            // parchase
            if ($j->ref_type === 'parchase') {
                $p = Parchase::with('supplier')->find($j->ref_id);
                if ($p) {
                    $j->source_name    = $p->supplier->account_name ?? "خرید #{$j->ref_id}";
                    $j->total_amount   = (float) $p->total_parchase;
                    $j->paid_amount    = (float) $p->par_paid;
                    $j->due_amount     = (float) $p->due_par;
                    $j->tazkira_number = $p->supplier->tazkira_number ?? $j->tazkira_number;
                } else {
                    $j->source_name = "خرید #{$j->ref_id}";
                }
                return $j;
            }

            // patient
            if ($j->ref_type === 'patient') {
                $patient = $this->findPatientForJournal($j);
                if ($patient) {
                    $name = trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? ''));
                    $j->source_name = $name ?: "مریض #{$patient->id}";
                    if (!empty($patient->national_id)) {
                        $j->tazkira_number = $patient->national_id;
                    }
                }

                if ($j->pres_id) {
                    $prescription = Prescription::find($j->pres_id);
                    if ($prescription) {
                        $j->total_amount = (float) $prescription->net_amount;
                        $j->paid_amount  = (float) $prescription->net_amount;
                        $j->due_amount   = 0;
                    }
                }

                // ✅ اینجا خیلی مهم است: اگر total_amount مقدار نگرفت،
                // یعنی این فیس مراجعه است (نه نسخه). پس:
                if ($j->total_amount === null) {
                    // فیس مراجعه — amount ژورنال همان مبلغ پرداخت‌شده
                    $j->total_amount = (float) $j->amount;
                    $j->paid_amount  = (float) $j->amount;
                    $j->due_amount   = 0;
                }

                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "مریض #{$j->ref_id}";
                }
                return $j;
            }

            // سایر
            if (method_exists($j, 'resolveSourceName')) {
                try {
                    $name = $j->resolveSourceName();
                    if (!empty($name) && $name !== '-') $j->source_name = $name;
                } catch (\Throwable $e) {
                    Log::warning('resolveSourceName: ' . $e->getMessage());
                }
            }

            if (empty($j->source_name)) {
                $j->source_name = $j->description ?: "منبع #{$j->ref_id}";
            }

            // ✅ برای انواع ناشناخته، total = paid = amount ژورنال
            if ($j->total_amount === null) {
                $j->total_amount = (float) $j->amount;
                $j->paid_amount  = (float) $j->amount;
                $j->due_amount   = 0;
            }

            return $j;
        });

        // ✅ گروه‌بندی بر اساس account_key
        $grouped = [];

        foreach ($journals as $j) {
            $key = $j->account_id
                ? "acc_{$j->account_id}"
                : "{$j->ref_type}_{$j->ref_id}";

            if (!isset($grouped[$key])) {
                $grouped[$key] = (object) [
                    'account_key'    => $key,
                    'account_id'     => $j->account_id ?? $j->ref_id,
                    'account_type'   => $j->ref_type,
                    'account_name'   => $j->source_name ?: "منبع #{$j->ref_id}",
                    'tazkira_number' => $j->tazkira_number,
                    'journal_count'  => 0,
                    'total_amount'   => 0,
                    'paid_amount'    => 0,
                ];
            }

            $grouped[$key]->journal_count += 1;
            $grouped[$key]->total_amount  += (float) ($j->total_amount ?? 0);
            $grouped[$key]->paid_amount   += (float) ($j->paid_amount ?? 0);
        }

        // ✅ محاسبه balance
        $rows = collect($grouped)->map(function ($g) {
            $g->balance      = $g->total_amount - $g->paid_amount;
            $g->due_amount   = $g->balance;
            $g->total_credit = $g->paid_amount;
            $g->total_debit  = $g->total_amount;
            $g->amount       = $g->paid_amount;
            return $g;
        });

        // ✅ فیلتر
        if (!empty($type)) {
            $rows = $rows->filter(fn($r) => $r->account_type === $type);
        }
        if (!empty($search)) {
            $term = mb_strtolower($search);
            $rows = $rows->filter(fn($r) =>
                mb_strpos(mb_strtolower($r->account_name ?? ''), $term) !== false
            );
        }

        $rows = $rows->sortBy([
            ['account_type', 'asc'],
            ['account_name', 'asc'],
        ])->values();

        $total     = $rows->count();
        $pagedRows = $rows->slice($offset, $limit)->values();

        return response()->json([
            'success' => true,
            'data'    => $pagedRows,
            'meta'    => [
                'total'      => $total,
                'page'       => $page,
                'limit'      => $limit,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    /**
     * GET /api/account-summary/{accountKey}/journals
     */
    public function journals(string $accountKey)
    {
        $parts = explode('_', $accountKey, 2);
        $prefix = $parts[0] ?? '';
        $suffix = $parts[1] ?? '';

        if ($prefix === 'acc') {
            $rows = DB::table('journals')
                ->where('account_id', (int) $suffix)
                ->orderBy('journal_date', 'desc')
                ->get();
        } else {
            $rows = DB::table('journals')
                ->where('ref_type', $prefix)
                ->where('ref_id', (int) $suffix)
                ->orderBy('journal_date', 'desc')
                ->get();
        }

        return response()->json([
            'success' => true,
            'data'    => $rows,
            'count'   => $rows->count(),
        ]);
    }

    /**
     * GET /api/account-summary/types
     */
    public function types()
    {
        $types = DB::table('journals')
            ->select('ref_type')
            ->distinct()
            ->orderBy('ref_type')
            ->pluck('ref_type');

        return response()->json(['success' => true, 'data' => $types]);
    }

    /**
     * پیدا کردن مریض
     */
    private function findPatientForJournal(Journal $journal): ?Patient
    {
        try {
            if (!empty($journal->patient_id)) {
                $p = Patient::find($journal->patient_id);
                if ($p) return $p;
            }
            if (!empty($journal->reg_id)) {
                $reg = Registrations::where('reg_id', $journal->reg_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
            }
            if (!empty($journal->ref_id)) {
                $reg = Registrations::where('reg_id', $journal->ref_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
                $p = Patient::find($journal->ref_id);
                if ($p) return $p;
            }
        } catch (\Throwable $e) {
            Log::warning('findPatientForJournal: ' . $e->getMessage());
        }
        return null;
    }
}