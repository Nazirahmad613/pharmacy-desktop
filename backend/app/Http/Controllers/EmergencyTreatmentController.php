<?php
// app/Http/Controllers/EmergencyTreatmentController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmergencyCase;
use App\Models\EmergencyTreatment;

class EmergencyTreatmentController extends Controller
{
    /**
     * پیدا کردن پرونده اضطراری بر اساس id یا emergency_id
     */
    private function resolveCase($caseId): ?EmergencyCase
    {
        if ($caseId === null || $caseId === '') return null;
        return EmergencyCase::where('id', $caseId)
            ->orWhere('emergency_id', $caseId)
            ->first();
    }

    /**
     * GET /emergency/treatments?case_id=... یا ?emergency_id=...
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'case_id'      => ['nullable'],
            'emergency_id' => ['nullable'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = EmergencyTreatment::with(['doctor', 'nurse', 'medication'])
            ->orderByDesc('performed_at');

        if ($request->filled('case_id')) {
            $case = $this->resolveCase($request->case_id);
            if (!$case) {
                return response()->json(['data' => []]);
            }
            $query->where('emergency_id', $case->emergency_id ?? $case->id);
        } elseif ($request->filled('emergency_id')) {
            $query->where('emergency_id', $request->emergency_id);
        } else {
            return response()->json([
                'errors' => ['case_id' => ['case_id یا emergency_id الزامی است.']],
            ], 422);
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * GET /emergency/treatments/{id}
     */
    public function show($id)
    {
        return response()->json([
            'data' => EmergencyTreatment::with(['doctor', 'nurse', 'medication'])->findOrFail($id),
        ]);
    }

    /**
     * POST /emergency/treatments
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'case_id'         => ['required', 'integer'],
            'treatment_type'  => ['required', 'in:medication,procedure,surgery,observation,referral,lab,imaging,other'],
            'title'           => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string', 'max:2000'],
            'performed_at'    => ['required', 'date'],
            'is_billable'     => ['nullable', 'boolean'],
            'med_id'          => ['nullable', 'integer'],
            'medication_name' => ['nullable', 'string', 'max:255'],
            'dosage'          => ['nullable', 'string', 'max:100'],
            'frequency'       => ['nullable', 'string', 'max:100'],
            'route'           => ['nullable', 'string', 'max:100'],
            'quantity'        => ['nullable', 'integer', 'min:0'],
            'unit_price'      => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // ✅ پرونده را با id یا emergency_id پیدا کن
        $case = $this->resolveCase($request->case_id);
        if (!$case) {
            return response()->json([
                'errors' => ['case_id' => ['پرونده اضطراری با این شناسه یافت نشد.']],
            ], 422);
        }

        $data = $validator->validated();
        unset($data['case_id']);

        // ✅ ستون رابطه — هماهنگ با مدل
        $data['emergency_id'] = $case->emergency_id ?? $case->id;

        // ✅ پزشک و پرستار از کاربر جاری
        $userId = $request->user()?->id;
        if (!$userId) {
            return response()->json([
                'errors' => ['auth' => ['کاربر احراز هویت نشده است.']],
            ], 401);
        }
        $data['doc_id'] = $data['doc_id'] ?? $userId;

        try {
            $treatment = EmergencyTreatment::create($data);
            return response()->json([
                'message' => 'معالجه با موفقیت ثبت شد.',
                'data'    => $treatment->load(['doctor', 'nurse', 'medication']),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Treatment store failed: ' . $e->getMessage(), [
                'payload' => $data,
            ]);
            return response()->json([
                'message' => 'خطا در ثبت معالجه: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT/PATCH /emergency/treatments/{id}
     */
    public function update(Request $request, $id)
    {
        $treatment = EmergencyTreatment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'treatment_type'  => ['sometimes', 'in:medication,procedure,surgery,observation,referral,lab,imaging,other'],
            'title'           => ['sometimes', 'string', 'max:255'],
            'description'     => ['sometimes', 'nullable', 'string', 'max:2000'],
            'performed_at'    => ['sometimes', 'date'],
            'is_billable'     => ['sometimes', 'boolean'],
            'med_id'          => ['sometimes', 'nullable', 'integer'],
            'medication_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'dosage'          => ['sometimes', 'nullable', 'string', 'max:100'],
            'frequency'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'route'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'quantity'        => ['sometimes', 'nullable', 'integer', 'min:0'],
            'unit_price'      => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $treatment->update($validator->validated());
            return response()->json([
                'message' => 'معالجه به‌روزرسانی شد.',
                'data'    => $treatment->fresh(['doctor', 'nurse', 'medication']),
            ]);
        } catch (\Throwable $e) {
            Log::error('Treatment update failed: ' . $e->getMessage());
            return response()->json(['message' => 'خطا: ' . $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /emergency/treatments/{id}
     */
    public function destroy($id)
    {
        EmergencyTreatment::findOrFail($id)->delete();
        return response()->json(['message' => 'معالجه حذف شد.']);
    }
}