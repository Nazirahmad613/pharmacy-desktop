<?php
// app/Http/Controllers/TreatmentHistoryController.php

namespace App\Http\Controllers;

use App\Models\TreatmentHistory;
use App\Models\TreatmentHistoryItem;
use App\Services\TreatmentHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TreatmentHistoryController extends Controller
{
    protected TreatmentHistoryService $historyService;

    public function __construct(TreatmentHistoryService $historyService)
    {
        $this->historyService = $historyService;
    }

    /**
     * ============================================================
     * لیست تاریخچه‌ها با فیلتر و جستجو (پیشرفته)
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
            $query = TreatmentHistory::with(['patient', 'doctor', 'items'])
                ->orderByDesc('created_at');

            // ============ فیلترها ============
            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->filled('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }

            if ($request->filled('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            if ($request->filled('visit_status')) {
                $query->where('visit_status', $request->visit_status);
            }

            if ($request->filled('current_step')) {
                $query->where('current_step', $request->current_step);
            }

            if ($request->filled('from_date')) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->filled('to_date')) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // ============ فیلترهای پیشرفته ============
            if ($request->filled('has_laboratory') && $request->has_laboratory) {
                $query->where('laboratory_tests_count', '>', 0);
            }
            if ($request->filled('has_radiology') && $request->has_radiology) {
                $query->where('radiology_requests_count', '>', 0);
            }
            if ($request->filled('has_operation') && $request->has_operation) {
                $query->where('operations_count', '>', 0);
            }
            if ($request->filled('has_admission') && $request->has_admission) {
                $query->where('admissions_count', '>', 0);
            }

            // ============ جستجو ============
            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('patient_name', 'LIKE', "%{$search}%")
                      ->orWhere('tazkira_number', 'LIKE', "%{$search}%")
                      ->orWhere('visit_number', 'LIKE', "%{$search}%")
                      ->orWhere('patient_phone', 'LIKE', "%{$search}%")
                      ->orWhere('doctor_name', 'LIKE', "%{$search}%")
                      ->orWhere('diagnosis', 'LIKE', "%{$search}%");
                });
            }

            $perPage = (int) ($request->per_page ?? 15);
            $histories = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $histories,
                'message' => 'لیست تاریخچه مریضان',
            ]);

        } catch (\Throwable $e) {
            Log::error('TreatmentHistory::index error', ['message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * نمایش جزئیات یک تاریخچه
     * ============================================================
     */
    public function show($id)
    {
        try {
            $history = TreatmentHistory::with([
                'patient',
                'doctor',
                'registration',
                'items' => function ($q) {
                    $q->orderBy('step_order')->orderBy('step_at');
                }
            ])->find($id);

            if (!$history) {
                return response()->json([
                    'success' => false,
                    'message' => 'تاریخچه یافت نشد',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $history,
            ]);

        } catch (\Throwable $e) {
            Log::error('TreatmentHistory::show error', ['id' => $id, 'message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * دریافت تاریخچه‌های یک مریض خاص (تمام مراجعات)
     * ============================================================
     */
    public function byPatient($patientId)
    {
        try {
            $histories = TreatmentHistory::with(['items', 'doctor'])
                ->where('patient_id', $patientId)
                ->orderByDesc('created_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $histories,
            ]);

        } catch (\Throwable $e) {
            Log::error('TreatmentHistory::byPatient error', ['patient_id' => $patientId, 'message' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ============================================================
     * همگام‌سازی دستی از فرانت (اختیاری)
     * ============================================================
     */
    public function sync(Request $request)
    {
        $regId = $request->input('reg_id');
        $progressData = $request->input('progress', []);
        $stepKey = $request->input('step_key');
        $stepData = $request->input('step_data', []);
        $refId = $request->input('ref_id');
        $refTable = $request->input('ref_table');

        if (!$regId) {
            return response()->json(['success' => false, 'message' => 'reg_id لازم است'], 422);
        }

        $history = $this->historyService->syncMainHistory((int) $regId, $progressData);

        if ($stepKey) {
            $this->historyService->addItem(
                (int) $regId,
                $stepKey,
                $stepData,
                $refId,
                $refTable
            );
        }

        return response()->json([
            'success' => true,
            'data' => $history,
            'message' => 'تاریخچه با موفقیت همگام شد',
        ]);
    }
}