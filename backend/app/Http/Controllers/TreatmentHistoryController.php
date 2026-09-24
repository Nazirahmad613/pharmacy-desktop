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
     * لیست تاریخچه‌ها با فیلتر و جستجو
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
            $withRelations = ['patient', 'doctor'];
            if ($request->boolean('with_items')) {
                $withRelations[] = 'items';
            }

            $query = TreatmentHistory::with($withRelations)->orderByDesc('created_at');

            // فیلترها
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

            // فیلترهای پیشرفته
            if ($request->boolean('has_laboratory')) {
                $query->where('laboratory_tests_count', '>', 0);
            }
            if ($request->boolean('has_radiology')) {
                $query->where('radiology_requests_count', '>', 0);
            }
            if ($request->boolean('has_operation')) {
                $query->where('operations_count', '>', 0);
            }
            if ($request->boolean('has_admission')) {
                $query->where('admissions_count', '>', 0);
            }
            if ($request->boolean('has_prescription')) {
                $query->where('prescriptions_count', '>', 0);
            }
            if ($request->boolean('has_examination')) {
                $query->where('examinations_count', '>', 0);
            }

            // جستجو
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
            if ($perPage < 1) $perPage = 15;
            if ($perPage > 100) $perPage = 100;

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
     * نمایش جزئیات یک تاریخچه (با تمام items)
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
     * تاریخچه‌های یک مریض
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
     * همگام‌سازی (ثبت هر مرحله) — نسخه بهبود یافته
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
        $finalize = $request->boolean('finalize');

        if (!$regId) {
            return response()->json(['success' => false, 'message' => 'reg_id لازم است'], 422);
        }

        try {
            // ✅ اگر finalize=true، از متد finalizeHistory استفاده کن
            if ($finalize) {
                $history = $this->historyService->finalizeHistory((int) $regId);
                return response()->json([
                    'success' => true,
                    'data' => $history,
                    'message' => 'تاریخچه نهایی شد',
                ]);
            }

            // ✅ اطمینان از آرایه بودن stepData
            if (!is_array($stepData)) {
                $stepData = [];
            }

            // همگام‌سازی اصلی
            $progressData['finalize'] = false;
            $history = $this->historyService->syncMainHistory((int) $regId, $progressData);

            if (!$history) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در همگام‌سازی تاریخچه',
                ], 500);
            }

            // ✅ افزودن آیتم (اگر stepKey داده شده)
            $item = null;
            if ($stepKey) {
                $item = $this->historyService->addItem(
                    (int) $regId,
                    (string) $stepKey,
                    $stepData,
                    $refId ? (int) $refId : null,
                    $refTable ? (string) $refTable : null
                );

                if (!$item) {
                    Log::warning('sync: addItem returned null', [
                        'reg_id' => $regId,
                        'step_key' => $stepKey,
                        'ref_id' => $refId,
                        'step_data_keys' => array_keys($stepData),
                    ]);
                    // ولی ادامه بده و history را برگردان
                }
            }

            // ✅ دوباره از DB بخوان تا شمارنده‌های به‌روز را داشته باشیم
            $history->refresh();
            $history->load(['items' => function ($q) {
                $q->orderBy('step_order')->orderBy('step_at');
            }]);

            return response()->json([
                'success' => true,
                'data' => $history,
                'item' => $item,
                'message' => 'تاریخچه با موفقیت همگام شد',
            ]);

        } catch (\Throwable $e) {
            Log::error('TreatmentHistory::sync error', [
                'reg_id' => $regId,
                'step_key' => $stepKey,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * نهایی‌سازی مستقیم
     * ============================================================
     */
    public function finalize(Request $request)
    {
        $regId = $request->input('reg_id');
        if (!$regId) {
            return response()->json(['success' => false, 'message' => 'reg_id لازم است'], 422);
        }

        try {
            $history = $this->historyService->finalizeHistory((int) $regId);

            return response()->json([
                'success' => (bool) $history,
                'data' => $history,
                'message' => $history ? 'تاریخچه نهایی شد' : 'خطا در نهایی‌سازی',
            ]);

        } catch (\Throwable $e) {
            Log::error('TreatmentHistory::finalize error', [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}