<?php
// app/Http/Controllers/FollowUpController.php

namespace App\Http\Controllers;

use App\Models\Followup;
use App\Models\Registrations;
use App\Services\FollowUpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FollowUpController extends Controller
{
    protected FollowUpService $service;

    public function __construct(FollowUpService $service)
    {
        $this->service = $service;
    }

    /**
     * ============================================================
     * لیست مراجعات بعدی — با فیلتر و جستجو
     * GET /doctor/follow-up
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
            $query = Followup::with(['patient', 'doctor', 'registration'])
                ->orderByDesc('follow_up_date')
                ->orderByDesc('id');

            // فیلترها
            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }
            if ($request->filled('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }
            if ($request->filled('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('priority')) {
                $query->where('priority', $request->priority);
            }
            if ($request->filled('from_date')) {
                $query->whereDate('follow_up_date', '>=', $request->from_date);
            }
            if ($request->filled('to_date')) {
                $query->whereDate('follow_up_date', '<=', $request->to_date);
            }

            // فیلترهای زمانی
            if ($request->boolean('today')) {
                $query->whereDate('follow_up_date', now()->toDateString());
            }
            if ($request->boolean('upcoming')) {
                $query->where('follow_up_date', '>=', now()->toDateString())
                      ->whereIn('status', ['pending', 'confirmed']);
            }
            if ($request->boolean('overdue')) {
                $query->where('follow_up_date', '<', now()->toDateString())
                      ->whereIn('status', ['pending', 'confirmed']);
            }

            // جستجو
            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('reason', 'LIKE', "%{$search}%")
                      ->orWhere('instructions', 'LIKE', "%{$search}%")
                      ->orWhere('barcode', 'LIKE', "%{$search}%")
                      ->orWhereHas('patient', function ($pq) use ($search) {
                          $pq->where('first_name', 'LIKE', "%{$search}%")
                             ->orWhere('last_name', 'LIKE', "%{$search}%")
                             ->orWhere('national_id', 'LIKE', "%{$search}%")
                             ->orWhere('mobile', 'LIKE', "%{$search}%");
                      });
                });
            }

            // صفحه‌بندی
            $perPage = (int) ($request->per_page ?? 15);
            if ($perPage < 1) $perPage = 15;
            if ($perPage > 100) $perPage = 100;

            $followups = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $followups,
                'message' => 'لیست مراجعات بعدی',
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::index error', [
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * نمایش یک مراجعه بعدی
     * GET /doctor/follow-up/{id}
     * ============================================================
     */
    public function show($id)
    {
        try {
            $followup = Followup::with(['patient', 'doctor', 'registration'])
                ->find($id);

            if (!$followup) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه بعدی یافت نشد',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $followup,
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::show error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت مراجعه بعدی برای یک reg_id
     * GET /doctor/follow-up/registration/{regId}
     * ============================================================
     */
    public function byRegistration($regId)
    {
        try {
            $followups = Followup::with(['patient', 'doctor'])
                ->where('reg_id', $regId)
                ->orderByDesc('created_at')
                ->get();

            $active = $followups->firstWhere('status', 'pending')
                ?? $followups->firstWhere('status', 'confirmed')
                ?? $followups->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'follow_up' => $active,
                    'all_followups' => $followups,
                    'has_active' => $active && in_array($active->status, ['pending', 'confirmed']),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::byRegistration error', [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * ثبت مراجعه بعدی
     * POST /doctor/follow-up
     * ============================================================
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reg_id' => 'required|integer|exists:registrations,reg_id',
            'follow_up_date' => 'required|date|after_or_equal:today',
            'follow_up_time' => 'nullable|date_format:H:i',
            'reason' => 'required|string|max:2000',
            'instructions' => 'nullable|string|max:2000',
            'priority' => 'nullable|in:normal,urgent,emergency',
            'patient_id' => 'nullable|integer',
            'doctor_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'اطلاعات ناقص یا نامعتبر',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // ✅ بررسی وجود registration
            $registration = Registrations::where('reg_id', $request->reg_id)->first();
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد',
                ], 404);
            }

            $followup = $this->service->create($request->all());

            if (!$followup) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در ثبت مراجعه بعدی',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $followup,
                'message' => '✅ مراجعه بعدی با موفقیت ثبت شد',
            ], 201);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::store error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * بروزرسانی مراجعه بعدی
     * PUT /doctor/follow-up/{id}
     * ============================================================
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'follow_up_date' => 'nullable|date',
            'follow_up_time' => 'nullable|date_format:H:i',
            'reason' => 'nullable|string|max:2000',
            'instructions' => 'nullable|string|max:2000',
            'priority' => 'nullable|in:normal,urgent,emergency',
            'status' => 'nullable|in:pending,confirmed,completed,cancelled,no_show',
            'doctor_notes' => 'nullable|string',
            'patient_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'اطلاعات نامعتبر',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $followup = $this->service->update((int) $id, $request->all());

            if (!$followup) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه بعدی یافت نشد یا خطا در بروزرسانی',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $followup,
                'message' => '✅ مراجعه بعدی بروزرسانی شد',
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::update error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * حذف مراجعه بعدی (Soft Delete)
     * DELETE /doctor/follow-up/{id}
     * ============================================================
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->service->delete((int) $id);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه بعدی یافت نشد',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => '🗑️ مراجعه بعدی حذف شد',
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::destroy error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * تغییر وضعیت
     * PATCH /doctor/follow-up/{id}/status
     * ============================================================
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,confirmed,completed,cancelled,no_show',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'وضعیت نامعتبر',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $followup = $this->service->updateStatus((int) $id, $request->status);

            if (!$followup) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در تغییر وضعیت',
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $followup,
                'message' => '✅ وضعیت تغییر کرد',
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::updateStatus error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * آمار
     * GET /doctor/follow-up/stats
     * ============================================================
     */
    public function stats(Request $request)
    {
        try {
            $baseQuery = Followup::query();

            if ($request->filled('doctor_id')) {
                $baseQuery->where('doctor_id', $request->doctor_id);
            }

            $stats = [
                'total'      => (clone $baseQuery)->count(),
                'pending'    => (clone $baseQuery)->where('status', 'pending')->count(),
                'confirmed'  => (clone $baseQuery)->where('status', 'confirmed')->count(),
                'completed'  => (clone $baseQuery)->where('status', 'completed')->count(),
                'cancelled'  => (clone $baseQuery)->where('status', 'cancelled')->count(),
                'today'      => (clone $baseQuery)->whereDate('follow_up_date', now()->toDateString())->count(),
                'upcoming'   => (clone $baseQuery)->where('follow_up_date', '>=', now()->toDateString())
                                    ->whereIn('status', ['pending', 'confirmed'])->count(),
                'overdue'    => (clone $baseQuery)->where('follow_up_date', '<', now()->toDateString())
                                    ->whereIn('status', ['pending', 'confirmed'])->count(),
                'urgent'     => (clone $baseQuery)->where('priority', 'urgent')
                                    ->whereIn('status', ['pending', 'confirmed'])->count(),
                'emergency'  => (clone $baseQuery)->where('priority', 'emergency')
                                    ->whereIn('status', ['pending', 'confirmed'])->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Throwable $e) {
            Log::error('FollowUpController::stats error', [
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}