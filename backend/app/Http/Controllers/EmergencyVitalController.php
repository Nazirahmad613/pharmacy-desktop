<?php
// app/Http/Controllers/EmergencyVitalController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmergencyCase;
use App\Models\EmergencyVital;

class EmergencyVitalController extends Controller
{
    public function index($caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $items = EmergencyVital::with('recordedBy')
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('recorded_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, $caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $validator = Validator::make($request->all(), [
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

        $data = $validator->validated();
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
}