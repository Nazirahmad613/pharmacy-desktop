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
    public function index($caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $items = EmergencyTreatment::with(['doctor', 'nurse', 'medication'])
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('performed_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, $caseId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $validator = Validator::make($request->all(), [
            'treatment_type' => ['required', 'in:medication,procedure,surgery,observation,referral,lab,imaging,other'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:5000'],

            'med_id'          => ['nullable', 'integer', 'exists:medications,med_id'],
            'medication_name' => ['nullable', 'string', 'max:255'],
            'dosage'          => ['nullable', 'string', 'max:100'],
            'frequency'       => ['nullable', 'string', 'max:100'],
            'route'           => ['nullable', 'string', 'max:50'],

            'quantity'   => ['nullable', 'integer', 'min:0'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],

            'performed_at' => ['required', 'date'],
            'is_billable'  => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['emergency_id'] = $case->emergency_id;
        $data['doc_id']       = $request->user()->id;

        try {
            $treatment = EmergencyTreatment::create($data);

            /* انتقال به وضعیت معالجه */
            if (in_array($case->status, [
                EmergencyCase::STATUS_WAITING,
                EmergencyCase::STATUS_IN_TRIAGE,
            ], true)) {
                $case->update(['status' => EmergencyCase::STATUS_IN_TREATMENT]);
            }

            /* بازتاب مجموع قیمت */
            $case->recalcTotal();

            return response()->json([
                'message' => 'معالجه ثبت شد.',
                'data'    => $treatment->load(['doctor', 'medication']),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Treatment store failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ثبت معالجه: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($caseId, $treatmentId)
    {
        $case = EmergencyCase::findOrFail($caseId);

        $treatment = EmergencyTreatment::where('emergency_id', $case->emergency_id)
            ->findOrFail($treatmentId);

        $treatment->delete();

        return response()->json(['message' => 'معالجه حذف شد.']);
    }
}