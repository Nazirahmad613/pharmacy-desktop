<?php
// app/Http/Controllers/EmergencyTriageController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

use App\Models\EmergencyCase;
use App\Models\EmergencyTriage;

class EmergencyTriageController extends Controller
{
    /**
     * GET /emergency/triages
     * لیست تریاژها با فیلترهای اختیاری
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'emergency_id' => ['nullable', 'integer'],
            'level'        => ['nullable', 'in:critical,severe,moderate,mild,non_urgent'],
            'critical'     => ['nullable', 'boolean'],
            'per_page'     => ['nullable', 'integer', 'between:1,200'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = EmergencyTriage::with(['emergencyCase', 'nurse'])
            ->latestFirst();

        if ($request->filled('emergency_id')) {
            $query->where('emergency_id', $request->emergency_id);
        }

        if ($request->filled('level')) {
            $query->byLevel($request->level);
        }

        if ($request->boolean('critical')) {
            $query->critical();
        }

        $perPage = (int) $request->input('per_page', 50);
        $items   = $query->paginate($perPage);

        return response()->json($items);
    }

    /**
     * GET /emergency/triages/{id}
     */
    public function show($id)
    {
        $triage = EmergencyTriage::with(['emergencyCase', 'nurse'])
            ->findOrFail($id);

        return response()->json(['data' => $triage]);
    }

    /**
     * POST /emergency/triages
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'emergency_id'      => ['required', 'integer'],
            'triage_level'      => ['nullable', 'in:critical,severe,moderate,mild,non_urgent'],
            'triage_score'      => ['nullable', 'integer', 'between:1,5'],
            'temperature'       => ['nullable', 'numeric', 'between:25,50'],
            'heart_rate'        => ['nullable', 'integer', 'between:20,300'],
            'blood_pressure'    => ['nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            'respiratory_rate'  => ['nullable', 'integer', 'between:5,80'],
            'oxygen_saturation' => ['nullable', 'integer', 'between:0,100'],
            'blood_sugar'       => ['nullable', 'numeric', 'between:0,900'],
            'pain_scale'        => ['nullable', 'integer', 'between:0,10'],
            'consciousness_level' => ['nullable', 'in:alert,verbal,painful,unresponsive'],
            'gcs_score'         => ['nullable', 'integer', 'between:3,15'],
            'notes'             => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // ✅ بررسی وجود پرونده اضطراری بر اساس emergency_id
        $case = EmergencyCase::where('emergency_id', $request->emergency_id)->first();
        if (!$case) {
            return response()->json([
                'errors' => ['emergency_id' => ['پرونده اضطراری با این شناسه یافت نشد.']],
            ], 422);
        }

        $data = $validator->validated();
        $data['nurse_id'] = $request->user()?->id;

        if (!$data['nurse_id']) {
            return response()->json([
                'errors' => ['nurse_id' => ['کاربر احراز هویت نشده است.']],
            ], 401);
        }

        // ✅ هماهنگی خودکار level و score اگر یکی خالی بود
        if (empty($data['triage_level']) && !empty($data['triage_score'])) {
            $data['triage_level'] = EmergencyTriage::levelForScore((int) $data['triage_score']);
        }
        if (empty($data['triage_score']) && !empty($data['triage_level'])) {
            $data['triage_score'] = EmergencyTriage::scoreForLevel($data['triage_level']);
        }

        try {
            $triage = EmergencyTriage::create($data);
            return response()->json([
                'message' => 'تریاز با موفقیت ثبت شد.',
                'data'    => $triage->load(['emergencyCase', 'nurse']),
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Triage store failed: ' . $e->getMessage(), [
                'payload' => $data,
            ]);
            return response()->json([
                'message' => 'خطا در ثبت تریاژ: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT/PATCH /emergency/triages/{id}
     */
    public function update(Request $request, $id)
    {
        $triage = EmergencyTriage::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'triage_level'      => ['sometimes', 'in:critical,severe,moderate,mild,non_urgent'],
            'triage_score'      => ['sometimes', 'integer', 'between:1,5'],
            'temperature'       => ['sometimes', 'nullable', 'numeric', 'between:25,50'],
            'heart_rate'        => ['sometimes', 'nullable', 'integer', 'between:20,300'],
            'blood_pressure'    => ['sometimes', 'nullable', 'string', 'regex:/^\d{2,3}\/\d{2,3}$/'],
            'respiratory_rate'  => ['sometimes', 'nullable', 'integer', 'between:5,80'],
            'oxygen_saturation' => ['sometimes', 'nullable', 'integer', 'between:0,100'],
            'blood_sugar'       => ['sometimes', 'nullable', 'numeric', 'between:0,900'],
            'pain_scale'        => ['sometimes', 'nullable', 'integer', 'between:0,10'],
            'consciousness_level' => ['sometimes', 'nullable', 'in:alert,verbal,painful,unresponsive'],
            'gcs_score'         => ['sometimes', 'nullable', 'integer', 'between:3,15'],
            'notes'             => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        // ✅ هماهنگی level/score در update
        if (isset($data['triage_level']) && !isset($data['triage_score'])) {
            $data['triage_score'] = EmergencyTriage::scoreForLevel($data['triage_level']);
        }
        if (isset($data['triage_score']) && !isset($data['triage_level'])) {
            $data['triage_level'] = EmergencyTriage::levelForScore((int) $data['triage_score']);
        }

        try {
            $triage->update($data);
            return response()->json([
                'message' => 'تریاز به‌روزرسانی شد.',
                'data'    => $triage->fresh(['emergencyCase', 'nurse']),
            ]);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Triage update failed: ' . $e->getMessage(), [
                'triage_id' => $id,
                'payload'   => $data,
            ]);
            return response()->json([
                'message' => 'خطا در به‌روزرسانی: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /emergency/triages/{id}
     */
    public function destroy($id)
    {
        $triage = EmergencyTriage::findOrFail($id);
        $triage->delete();

        return response()->json(['message' => 'تریاز حذف شد.']);
    }

    /**
     * GET /emergency/triages/by-case/{emergencyId}
     * آخرین تریاژ یک پرونده
     */
    public function byCase($emergencyId)
    {
        $triage = EmergencyTriage::with(['emergencyCase', 'nurse'])
            ->where('emergency_id', $emergencyId)
            ->latestFirst()
            ->first();

        if (!$triage) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => $triage]);
    }

    /**
     * GET /emergency/triages/queue
     * صف تریاژ — تریاژهای فعال/در انتظار
     */
    public function queue(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'level'    => ['nullable', 'in:critical,severe,moderate,mild,non_urgent'],
            'status'   => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'between:1,200'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // ✅ پرونده‌های فعالی که تریاژ شده‌اند
        $activeStatuses = [
            EmergencyCase::STATUS_WAITING,
            EmergencyCase::STATUS_IN_TRIAGE,
            EmergencyCase::STATUS_IN_TREATMENT,
        ];

        $query = EmergencyTriage::with(['emergencyCase', 'nurse'])
            ->whereHas('emergencyCase', function ($q) use ($activeStatuses) {
                $q->whereIn('status', $activeStatuses);
            })
            ->latestFirst();

        if ($request->filled('level')) {
            $query->byLevel($request->level);
        }

        if ($request->filled('status')) {
            $query->whereHas('emergencyCase', function ($q) use ($request) {
                $q->where('status', $request->status);
            });
        }

        $perPage = (int) $request->input('per_page', 50);
        $items   = $query->paginate($perPage);

        return response()->json($items);
    }




}