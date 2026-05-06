<?php

namespace App\Http\Controllers;

use App\Models\HospitalReport;
use Illuminate\Http\Request;

class HospitalReportController extends Controller
{
    public function index(Request $request)
    {
        $query = HospitalReport::query();

        // =========================
        // فیلتر نوع
        // =========================
        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        // =========================
        // فیلتر تاریخ
        // =========================
        if ($request->filled('from_date')) {
            $query->whereDate('date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('date', '<=', $request->to_date);
        }

        // =========================
        // جستجو عمومی
        // =========================
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('patient_name', 'like', "%$search%")
                  ->orWhere('doctor_name', 'like', "%$search%")
                  ->orWhere('medication_name', 'like', "%$search%")
                  ->orWhere('customer_name', 'like', "%$search%")
                  ->orWhere('supplier_name', 'like', "%$search%");
            });
        }

        // =========================
        // مرتب سازی
        // =========================
        $sortBy = $request->get('sort_by', 'date');
        $sortDir = $request->get('sort_dir', 'desc');

        $query->orderBy($sortBy, $sortDir);

        return response()->json(
            $query->paginate(20)
        );
    }
}
