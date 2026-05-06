<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BenefitController extends Controller
{
    public function index(Request $request)
{
    $type = $request->type;

    $query = DB::table('benefits_report');

    if ($type == 'daily' && $request->date) {
        $query->whereDate('journal_date', $request->date);
    }

    if ($type == 'monthly' && $request->year && $request->month) {
        $query->where('year', $request->year)
              ->where('month', $request->month);
    }

    if ($type == 'yearly' && $request->year) {
        $query->where('year', $request->year);
    }

    return response()->json($query->get());
}


public function chart(Request $request)
{
    $type = $request->type;

    if ($type == 'daily') {
        $data = DB::table('journals')
            ->select(
                'journal_date',
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as total_credit"),
                DB::raw("SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as total_debit"),
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) -
                         SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as net_benefit")
            )
            ->groupBy('journal_date')
            ->orderBy('journal_date')
            ->get();
    }

    elseif ($type == 'monthly') {
        $data = DB::table('journals')
            ->select(
                DB::raw('YEAR(journal_date) as year'),
                DB::raw('MONTH(journal_date) as month'),
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as total_credit"),
                DB::raw("SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as total_debit"),
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) -
                         SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as net_benefit")
            )
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get();
    }

    elseif ($type == 'yearly') {
        $data = DB::table('journals')
            ->select(
                DB::raw('YEAR(journal_date) as year'),
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) as total_credit"),
                DB::raw("SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as total_debit"),
                DB::raw("SUM(CASE WHEN entry_type='credit' THEN amount ELSE 0 END) -
                         SUM(CASE WHEN entry_type='debit' THEN amount ELSE 0 END) as net_benefit")
            )
            ->groupBy('year')
            ->orderBy('year')
            ->get();
    }

    else {
        return response()->json(['error' => 'type is required'], 400);
    }

    return response()->json($data);
}




}