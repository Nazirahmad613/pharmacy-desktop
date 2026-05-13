<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BenefitController extends Controller
{
    public function index(Request $request)
    {
        try {
            // بررسی وجود جدول benefits_report
            if (!\Schema::hasTable('benefits_report')) {
                return response()->json([
                    'error' => 'جدول benefits_report وجود ندارد',
                    'data' => []
                ]);
            }
            
            $query = DB::table('benefits_report');
            
            if ($request->type == 'daily' && $request->date) {
                $query->whereDate('journal_date', $request->date);
            }
            
            if ($request->type == 'monthly' && $request->year && $request->month) {
                $query->where('year', $request->year)
                      ->where('month', $request->month);
            }
            
            if ($request->type == 'yearly' && $request->year) {
                $query->where('year', $request->year);
            }
            
            $result = $query->orderBy('journal_date', 'desc')->get();
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            \Log::error('BenefitController index error: ' . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
                'data' => []
            ]);
        }
    }
    
    public function chart(Request $request)
    {
        try {
            if (!\Schema::hasTable('benefits_report')) {
                return response()->json([]);
            }
            
            $type = $request->type;
            $query = DB::table('benefits_report');
            
            if ($type == 'daily') {
                $data = $query->select('journal_date as date', 'net_benefit')
                              ->orderBy('journal_date', 'desc')
                              ->limit(30)
                              ->get();
            } elseif ($type == 'monthly') {
                $data = $query->select('year', 'month', 
                                   DB::raw('SUM(net_benefit) as net_benefit'))
                              ->groupBy('year', 'month')
                              ->orderBy('year', 'desc')
                              ->orderBy('month', 'desc')
                              ->get();
            } elseif ($type == 'yearly') {
                $data = $query->select('year', 
                                   DB::raw('SUM(net_benefit) as net_benefit'))
                              ->groupBy('year')
                              ->orderBy('year', 'desc')
                              ->get();
            } else {
                // پیش‌فرض: ماه جاری
                $data = $query->select('year', 'month', 
                                   DB::raw('SUM(net_benefit) as net_benefit'))
                              ->where('year', date('Y'))
                              ->where('month', date('m'))
                              ->groupBy('year', 'month')
                              ->get();
            }
            
            return response()->json($data);
            
        } catch (\Exception $e) {
            \Log::error('BenefitController chart error: ' . $e->getMessage());
            return response()->json([]);
        }
    }
}