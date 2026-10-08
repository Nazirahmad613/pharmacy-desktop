<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountSummaryController extends Controller
{
    /**
     * GET /api/account-summary
     * Query: type, search, page, limit
     */
    public function index(Request $request)
    {
        $type   = $request->query('type');
        $search = $request->query('search');
        $page   = max(1, (int) $request->query('page', 1));
        $limit  = min(100, max(1, (int) $request->query('limit', 10)));
        $offset = ($page - 1) * $limit;

        $query = DB::table('v_account_summary');

        if (!empty($type)) {
            $query->where('account_type', $type);
        }

        if (!empty($search)) {
            $query->where('account_name', 'like', "%{$search}%");
        }

        $total = (clone $query)->count();

        $rows = $query
            ->orderBy('account_type')
            ->orderBy('account_name')
            ->offset($offset)
            ->limit($limit)
            ->get();

        // نرمال‌سازی اعداد به float
        $rows->transform(function ($row) {
            $row->total_credit = (float) $row->total_credit;
            $row->total_debit  = (float) $row->total_debit;
            $row->balance      = (float) $row->balance;
            $row->journal_count = (int) $row->journal_count;
            return $row;
        });

        return response()->json([
            'success' => true,
            'data'    => $rows,
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
     * مثال: /api/account-summary/patient_5/journals
     */
    public function journals(string $accountKey)
    {
        $rows = DB::table('v_account_journal_detail')
            ->where('account_key', $accountKey)
            ->orderBy('journal_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $rows,
            'count'   => $rows->count(),
        ]);
    }

    /**
     * GET /api/account-summary/types
     * لیست انواع حساب موجود (برای فیلتر)
     */
    public function types()
    {
        $types = DB::table('v_account_summary')
            ->select('account_type')
            ->distinct()
            ->orderBy('account_type')
            ->pluck('account_type');

        return response()->json([
            'success' => true,
            'data'    => $types,
        ]);
    }
}