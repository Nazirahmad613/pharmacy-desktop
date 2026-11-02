<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmergencyCase;
use App\Models\EmergencyVital;

class EmergencyVitalController extends Controller
{
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'emergency_id' => ['nullable', 'string'],
            'case_id'      => ['nullable', 'integer'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = EmergencyVital::with('recordedBy')->orderByDesc('recorded_at');

        if ($request->filled('case_id')) {
            $case = EmergencyCase::findOrFail($request->case_id);
            $query->where('emergency_id', $case->emergency_id);
        } elseif ($request->filled('emergency_id')) {
            $query->where('emergency_id', $request->emergency_id);
        } else {
            return response()->json([
                'errors' => ['case_id' => ['case_id یا emergency_id الزامی است.']],
            ], 422);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function byRegistration($regId)
    {
        $case = EmergencyCase::where('registration_id', $regId)->firstOrFail();
        $items = EmergencyVital::with('recordedBy')
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('recorded_at')
            ->get();
        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'case_id'           => ['required', 'integer', 'exists:emergency_cases,id'],
            'recorded_at'       => ['required', 'date'],
            'temperature'       => ['nullable', 'numeric', 'between:25,50'],
            'heart_rate'        => ['nullable', 'integer', 'between:20,300'],
            'blood_pressure'    => ['nullable', 'string', 'max:20'],
            'respiratory_rate'  => ['nullable', 'integer', 'between:5,80'],
            'oxygen_saturation' => ['nullable', 'integer', 'between:0,100'],
            'blood_sugar'       => ['nullable', 'numeric', 'between:0,900'],
            'pain_scale'        => ['nullable', 'integer', 'between:0,10'],
            'notes'             => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $case = EmergencyCase::findOrFail($request->case_id);
        $data = $validator->validated();
        unset($data['case_id']);
        $data['emergency_id'] = $case->emergency_id;
        $data['recorded_by']  = $request->user()->id;

        try {
            $vital = EmergencyVital::create($data);
            return response()->json([
                'message' => 'علائم حیاتی ثبت شد.',
                'data'    => $vital->load('recordedBy'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Vital store failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ثبت علائم: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        return response()->json(['data' => EmergencyVital::with('recordedBy')->findOrFail($id)]);
    }

    public function update(Request $request, $id)
    {
        $vital = EmergencyVital::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'recorded_at'       => ['sometimes', 'date'],
            'temperature'       => ['sometimes', 'nullable', 'numeric', 'between:25,50'],
            'heart_rate'        => ['sometimes', 'nullable', 'integer', 'between:20,300'],
            'blood_pressure'    => ['sometimes', 'nullable', 'string', 'max:20'],
            'respiratory_rate'  => ['sometimes', 'nullable', 'integer', 'between:5,80'],
            'oxygen_saturation' => ['sometimes', 'nullable', 'integer', 'between:0,100'],
            'blood_sugar'       => ['sometimes', 'nullable', 'numeric', 'between:0,900'],
            'pain_scale'        => ['sometimes', 'nullable', 'integer', 'between:0,10'],
            'notes'             => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $vital->update($validator->validated());
        return response()->json(['message' => 'به‌روزرسانی شد.', 'data' => $vital->fresh()]);
    }

    public function destroy($id)
    {
        EmergencyVital::findOrFail($id)->delete();
        return response()->json(['message' => 'حذف شد.']);
    }
}