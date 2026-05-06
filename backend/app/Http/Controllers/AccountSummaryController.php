<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountSummaryController extends Controller
{
    public function index(Request $request)
    {
        // استفاده از جدول view account_summary
        $query = DB::table('account_summary');

        // 🔎 جستجو بر اساس نام یا نوع حساب
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('account_name', 'like', "%{$search}%")
                  ->orWhere('account_type', 'like', "%{$search}%");
            });
        }

        // 🎯 فیلتر نوع حساب
        if ($request->filled('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        // 📄 مرتب‌سازی
        $query->orderBy('account_type', 'asc')->orderBy('account_name', 'asc');

        // 🔄 صفحه‌بندی (اختیاری)
        $perPage = $request->get('per_page', 1000); // اگر می‌خوای همه رو بگیری، بزرگ بگیر
        $results = $query->paginate($perPage);

        return response()->json($results);
    }
}