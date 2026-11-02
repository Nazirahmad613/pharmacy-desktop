<?php
// app/Http/Controllers/EmergencyController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Patient;

use App\Models\EmergencyCase;

class EmergencyController extends Controller
{
    /* ============================================================
     |  لیست / جستجو
     ============================================================ */
    public function index(Request $request)
    {
        $query = EmergencyCase::with(['patient', 'doctor', 'triage'])
            ->orderByDesc('arrival_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('triage_level')) {
            $query->where('triage_level', $request->triage_level);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('emergency_id', 'like', "%{$s}%")
                  ->orWhereHas('patient', function ($p) use ($s) {
                      $p->where('name', 'like', "%{$s}%")
                        ->orWhere('phone', 'like', "%{$s}%");
                  });
            });
        }
        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('arrival_at', [$request->from, $request->to]);
        }

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    /* ============================================================
     |  ثبت مورد اضطراری جدید
     ============================================================ */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id'    => ['required', 'integer', 'exists:patients,id'],
            'chief_complaint' => ['required', 'string', 'max:1000'],
            'triage_level'  => ['nullable', 'in:1,2,3,4,5'],
            'arrival_at'    => ['nullable', 'date'],
            'notes'         => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['emergency_id'] = 'EMG-' . strtoupper(uniqid());
        $data['arrival_at']   = $data['arrival_at'] ?? now();
        $data['status']       = EmergencyCase::STATUS_WAITING ?? 'waiting';
        $data['doc_id']       = $request->user()->id;

        $case = EmergencyCase::create($data);

        return response()->json([
            'message' => 'مورد اضطراری ثبت شد.',
            'data'    => $case->load(['patient']),
        ], 201);
    }

    /* ============================================================
     |  نمایش یک مورد
     ============================================================ */
    public function show($id)
    {
        $case = EmergencyCase::with([
            'patient', 'doctor', 'triage', 'treatments', 'vitals',
        ])->findOrFail($id);

        return response()->json(['data' => $case]);
    }

    /* ============================================================
     |  به‌روزرسانی
     ============================================================ */
    public function update(Request $request, $id)
    {
        $case = EmergencyCase::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'chief_complaint' => ['sometimes', 'string', 'max:1000'],
            'triage_level'    => ['sometimes', 'in:1,2,3,4,5'],
            'status'          => ['sometimes', 'string', 'max:50'],
            'notes'           => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $case->update($validator->validated());

        return response()->json([
            'message' => 'به‌روزرسانی شد.',
            'data'    => $case->fresh(),
        ]);
    }

    /* ============================================================
     |  حذف
     ============================================================ */
    public function destroy($id)
    {
        EmergencyCase::findOrFail($id)->delete();
        return response()->json(['message' => 'حذف شد.']);
    }

    /* ============================================================
     |  آمار
     ============================================================ */
    public function statistics()
    {
        return response()->json([
            'total'       => EmergencyCase::count(),
            'waiting'     => EmergencyCase::where('status', 'waiting')->count(),
            'in_triage'   => EmergencyCase::where('status', 'in_triage')->count(),
            'in_treatment'=> EmergencyCase::where('status', 'in_treatment')->count(),
            'discharged'  => EmergencyCase::where('status', 'discharged')->count(),
            'admitted'    => EmergencyCase::where('status', 'admitted')->count(),
            'today'       => EmergencyCase::whereDate('arrival_at', today())->count(),
        ]);
    }

    /* ============================================================
     |  موارد فعال
     ============================================================ */
    public function active()
    {
        $items = EmergencyCase::with(['patient', 'doctor'])
            ->whereIn('status', ['waiting', 'in_triage', 'in_treatment'])
            ->orderBy('triage_level')
            ->orderByDesc('arrival_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    /* ============================================================
     |  ترخیص
     ============================================================ */
    public function discharge(Request $request, $id)
    {
        $case = EmergencyCase::findOrFail($id);

        $case->update([
            'status'        => 'discharged',
            'discharged_at' => now(),
            'discharge_notes' => $request->input('discharge_notes'),
        ]);

        return response()->json([
            'message' => 'مریض ترخیص شد.',
            'data'    => $case->fresh(),
        ]);
    }

    /* ============================================================
     |  بستری کردن
     ============================================================ */
    public function admit(Request $request, $id)
    {
        $case = EmergencyCase::findOrFail($id);

        $case->update([
            'status'      => 'admitted',
            'admitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'مریض بستری شد.',
            'data'    => $case->fresh(),
        ]);
    }

    /* ============================================================
     |  ✅ تاریخچه — همان چیزی که فرانت صدا می‌زند
     ============================================================ */
    public function history(Request $request)
    {
        $query = EmergencyCase::with(['patient', 'doctor', 'triage'])
            ->whereIn('status', ['discharged', 'admitted', 'completed', 'closed'])
            ->orderByDesc('arrival_at');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('emergency_id', 'like', "%{$s}%")
                  ->orWhereHas('patient', function ($p) use ($s) {
                      $p->where('name', 'like', "%{$s}%")
                        ->orWhere('phone', 'like', "%{$s}%");
                  });
            });
        }
        if ($request->filled('triage_level')) {
            $query->where('triage_level', $request->triage_level);
        }
        if ($request->filled('from')) {
            $query->whereDate('arrival_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('arrival_at', '<=', $request->to);
        }

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    /* ============================================================
     |  ✅ آمار تاریخچه
     ============================================================ */
    public function historyStatistics()
    {
        return response()->json([
            'total_discharged' => EmergencyCase::where('status', 'discharged')->count(),
            'total_admitted'   => EmergencyCase::where('status', 'admitted')->count(),
            'total_completed'  => EmergencyCase::whereIn('status', ['completed', 'closed'])->count(),
            'today'            => EmergencyCase::whereDate('arrival_at', today())->count(),
            'this_week'        => EmergencyCase::whereBetween('arrival_at', [
                now()->startOfWeek(), now()->endOfWeek(),
            ])->count(),
            'this_month'       => EmergencyCase::whereMonth('arrival_at', now()->month)
                ->whereYear('arrival_at', now()->year)->count(),
        ]);
    }

    /* ============================================================
     |  ✅ خروجی CSV از تاریخچه
     ============================================================ */
    public function exportHistory(Request $request)
    {
        $rows = EmergencyCase::with(['patient', 'doctor'])
            ->whereIn('status', ['discharged', 'admitted', 'completed', 'closed'])
            ->orderByDesc('arrival_at')
            ->get();

        $filename = 'emergency_history_' . now()->format('Ymd_His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($rows) {
            $out = fopen('php://output', 'w');
            // BOM برای Excel فارسی
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Emergency ID', 'Patient', 'Doctor', 'Triage', 'Status', 'Arrival', 'Discharged']);

            foreach ($rows as $r) {
                fputcsv($out, [
                    $r->emergency_id,
                    $r->patient?->name ?? '-',
                    $r->doctor?->name ?? '-',
                    $r->triage_level,
                    $r->status,
                    $r->arrival_at,
                    $r->discharged_at,
                ]);
            }
            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }

/* ============================================================
 |  ✅ پذیرش یکپارچه اضطراری (ساخت بیمار + پرونده در یک درخواست)
 ============================================================ */
 /* ============================================================
 |  ✅ پذیرش یکپارچه اضطراری (ساخت بیمار + پرونده در یک درخواست)
 ============================================================ */
public function admitNew(Request $request)
{
    $validator = Validator::make($request->all(), [
        'patient_id'      => ['nullable', 'integer', 'exists:patients,id'],
        'first_name'      => ['required_without:patient_id', 'string', 'max:100'],
        'last_name'       => ['nullable', 'string', 'max:100'],
        'phone'           => ['nullable', 'string', 'max:30'],
        'gender'          => ['nullable', 'in:male,female,Male,Female'],
        'age'             => ['nullable', 'integer', 'between:0,150'],

        'chief_complaint' => ['required', 'string', 'max:500'],
        'triage_score'    => ['required', 'in:1,2,3,4,5'],
        'arrival_time'    => ['nullable', 'date'],
        'notes'           => ['nullable', 'string', 'max:2000'],
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    $data = $validator->validated();

    // نگاشت gender
    $genderMap = [
        'male'   => 'Male',
        'female' => 'Female',
        'Male'   => 'Male',
        'Female' => 'Female',
    ];
    $genderValue = $genderMap[$data['gender'] ?? ''] ?? null;

    // نگاشت triage_score → triage_level
    $triageScore = (int) $data['triage_score'];
    $triageMap = [
        1 => 'critical',
        2 => 'severe',
        3 => 'moderate',
        4 => 'mild',
        5 => 'non_urgent',
    ];
    $triageLevel = $triageMap[$triageScore] ?? 'moderate';

    try {
        $result = DB::transaction(function () use ($data, $request, $genderValue, $triageScore, $triageLevel) {

            // ── ۱) بیمار: موجود یا جدید ──
            if (!empty($data['patient_id'])) {
                $patient = Patient::findOrFail($data['patient_id']);
            } else {
                $patient = Patient::create([
                    'first_name' => $data['first_name'],
                    'last_name'  => $data['last_name'] ?? null,
                    'phone'      => $data['phone'] ?? null,
                    'gender'     => $genderValue,
                    'age'        => $data['age'] ?? null,
                    'status'     => 'Active',
                    'created_by' => $request->user()->id,
                ]);
            }

            // ── ۲) پیدا کردن رجیستریشن فعال امروز (اختیاری) ──
            $activeRegistration = \App\Models\Registrations::where('patient_id', $patient->id)
                ->whereIn('visit_status', ['Waiting', 'Doctor', 'Examining'])
                ->whereDate('visit_date', today())
                ->orderByDesc('reg_id')
                ->first();

            // ── ۳) تولید شماره پرونده یکتا ──
            $emergencyNo = $this->generateEmergencyNo();

            // ── ۴) ساخت پرونده اضطراری ──
            $case = EmergencyCase::create([
                'patient_id'      => $patient->id,
                'reg_id'          => $activeRegistration?->reg_id,
                'doc_id'          => $request->user()->id,
                'admitted_by'     => $request->user()->id,

                'emergency_no'    => $emergencyNo,

                // Snapshot مریض
                'patient_name'    => trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? '')),
                'patient_age'     => $patient->age,
                'patient_gender'  => $patient->gender,
                'patient_phone'   => $patient->phone,

                'arrival_time'    => $data['arrival_time'] ?? now(),
                'arrival_mode'    => 'walk_in',
                'chief_complaint' => $data['chief_complaint'],

                'triage_level'    => $triageLevel,
                'triage_score'    => $triageScore,

                'status'          => 'waiting',
                'total_amount'    => 0,
                'is_paid'         => false,
            ]);

            return ['patient' => $patient, 'case' => $case];
        });

        return response()->json([
            'message' => 'مریض اضطراری با موفقیت پذیرش شد.',
            'data'    => [
                'patient' => $result['patient'],
                'case'    => $result['case']->load(['patient', 'doctor']),
            ],
        ], 201);

    } catch (\Throwable $e) {
        Log::error('Emergency admitNew failed: ' . $e->getMessage());
        return response()->json([
            'message' => 'خطا در پذیرش اضطراری: ' . $e->getMessage(),
        ], 500);
    }
}

/**
 * تولید شماره پرونده یکتا: EMG-YYYYMMDD-XXXX
 */
private function generateEmergencyNo(): string
{
    $prefix = 'EMG-' . now()->format('Ymd') . '-';
    do {
        $no = $prefix . strtoupper(\Illuminate\Support\Str::random(4));
    } while (EmergencyCase::withTrashed()->where('emergency_no', $no)->exists());

    return $no;
}
}