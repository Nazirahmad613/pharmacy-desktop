<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmergencyCase;
use App\Models\EmergencyTreatment;

class EmergencyTreatmentController extends Controller
{
    /* GET /emergency/treatments?emergency_id=X   یا   ?case_id=Y */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'emergency_id' => ['nullable', 'string'],
            'case_id'      => ['nullable', 'integer'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = EmergencyTreatment::with(['doctor', 'nurse', 'medication'])
            ->orderByDesc('performed_at');

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

    /* GET /emergency/treatments/by-registration/{regId} */
    public function byRegistration($regId)
    {
        $case = EmergencyCase::where('registration_id', $regId)->firstOrFail();
        $items = EmergencyTreatment::with(['doctor', 'nurse', 'medication'])
            ->where('emergency_id', $case->emergency_id)
            ->orderByDesc('performed_at')
            ->get();
        return response()->json(['data' => $items]);
    }

    /* POST /emergency/treatments   با body شامل case_id */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'case_id'        => ['required', 'integer', 'exists:emergency_cases,id'],
            'treatment_type' => ['required', 'in:medication,procedure,surgery,observation,referral,lab,imaging,other'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:5000'],
            'med_id'         => ['nullable', 'integer', 'exists:medications,med_id'],
            'medication_name'=> ['nullable', 'string', 'max:255'],
            'dosage'         => ['nullable', 'string', 'max:100'],
            'frequency'      => ['nullable', 'string', 'max:100'],
            'route'          => ['nullable', 'string', 'max:50'],
            'quantity'       => ['nullable', 'integer', 'min:0'],
            'unit_price'     => ['nullable', 'numeric', 'min:0'],
            'performed_at'   => ['required', 'date'],
            'is_billable'    => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $case = EmergencyCase::findOrFail($request->case_id);
        $data = $validator->validated();
        unset($data['case_id']);
        $data['emergency_id'] = $case->emergency_id;
        $data['doc_id']       = $request->user()->id;

        try {
            $treatment = EmergencyTreatment::create($data);

            if (in_array($case->status, [
                EmergencyCase::STATUS_WAITING,
                EmergencyCase::STATUS_IN_TRIAGE,
            ], true)) {
                $case->update(['status' => EmergencyCase::STATUS_IN_TREATMENT]);
            }
            if (method_exists($case, 'recalcTotal')) {
                $case->recalcTotal();
            }

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

    public function show($id)
    {
        return response()->json(['data' => EmergencyTreatment::with(['doctor','medication'])->findOrFail($id)]);
    }

    public function update(Request $request, $id)
    {
        $treatment = EmergencyTreatment::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'title'       => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'dosage'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'frequency'   => ['sometimes', 'nullable', 'string', 'max:100'],
            'route'       => ['sometimes', 'nullable', 'string', 'max:50'],
            'performed_at'=> ['sometimes', 'date'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $treatment->update($validator->validated());
        return response()->json(['message' => 'به‌روزرسانی شد.', 'data' => $treatment->fresh()]);
    }

    public function destroy($id)
    {
        EmergencyTreatment::findOrFail($id)->delete();
        return response()->json(['message' => 'معالجه حذف شد.']);
    }
}