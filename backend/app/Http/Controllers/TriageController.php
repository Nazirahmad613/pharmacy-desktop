<?php
// app/Http/Controllers/EmergencyTriageController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmergencyCase;
use App\Models\EmergencyTriage;

class EmergencyTriageController extends Controller
{
    /**
     * ثبت تریاژ جدید برای یک پرونده
     */
    public function store(Request $request, $caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $validator = Validator::make($request->all(), [
            'triage_level' => ['required', 'in:critical,severe,moderate,mild,non_urgent'],
            'triage_score' => ['nullable', 'integer', 'between:1,5'],

            'temperature'       => ['nullable', 'numeric', 'between:25,50'],
            'heart_rate'        => ['nullable', 'integer', 'between:20,300'],
            'blood_pressure'    => ['nullable', 'string', 'max:20'],
            'respiratory_rate'  => ['nullable', 'integer', 'between:5,80'],
            'oxygen_saturation' => ['nullable', 'integer', 'between:0,100'],
            'blood_sugar'       => ['nullable', 'numeric', 'between:0,900'],
            'pain_scale'        => ['nullable', 'integer', 'between:0,10'],

            'consciousness_level' => ['nullable', 'in:alert,verbal,painful,unresponsive'],
            'gcs_score'           => ['nullable', 'integer', 'between:3,15'],

            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        try {
            $data['emergency_id'] = $case->emergency_id;
            $data['nurse_id']     = $request->user()->id;

            if (empty($data['triage_score'])) {
                $data['triage_score'] = EmergencyCase::scoreForLevel($data['triage_level']);
            }

            $triage = EmergencyTriage::create($data);

            return response()->json([
                'message' => 'تریاژ با موفقیت ثبت شد.',
                'data'    => $triage->load('nurse'),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Triage store failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ثبت تریاژ: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function index($caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $items = EmergencyTriage::with('nurse')
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('triage_id')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function latest($caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $item = EmergencyTriage::with('nurse')
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('triage_id')
            ->first();

        return response()->json(['data' => $item]);
    }
}