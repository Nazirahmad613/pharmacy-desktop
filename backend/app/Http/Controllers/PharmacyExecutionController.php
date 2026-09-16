<?php
// app/Http/Controllers/PharmacyExecutionController.php

namespace App\Http\Controllers;

use App\Models\PharmacyExecution;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class PharmacyExecutionController extends Controller
{
    // ═══════════════════════════════════════════════════════
    // لیست همه اجراآت
    // GET /pharmacy-executions
    // ═══════════════════════════════════════════════════════
    public function index(Request $request)
    {
        try {
            $query = PharmacyExecution::with([
                'patient', 'doctor', 'registration', 'executor', 'collector',
            ]);

            if ($request->filled('status')) $query->where('status', $request->status);
            if ($request->filled('reg_id')) $query->where('reg_id', $request->reg_id);
            if ($request->filled('pres_id')) $query->where('pres_id', $request->pres_id);
            if ($request->filled('from_date')) $query->whereDate('created_at', '>=', $request->from_date);
            if ($request->filled('to_date')) $query->whereDate('created_at', '<=', $request->to_date);

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('patient_name', 'like', "%{$s}%")
                      ->orWhere('receipt_number', 'like', "%{$s}%")
                      ->orWhere('tazkira_number', 'like', "%{$s}%")
                      ->orWhere('patient_phone', 'like', "%{$s}%");
                });
            }

            $executions = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($e) => $this->formatExecution($e));

            return response()->json([
                'success' => true,
                'data' => $executions,
                'count' => $executions->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('executions index: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'خطا در دریافت اجراآت'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    // ✅ لیست فیس‌های دواخانه برای Registration
    // GET /pharmacy-executions/pending-for-registration
    // ═══════════════════════════════════════════════════════
    public function getPendingForRegistration(Request $request)
    {
        try {
            $query = PharmacyExecution::with([
                'patient', 'doctor', 'registration',
            ])->whereIn('status', ['pending', 'sent_to_registration']);

            if ($request->filled('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('patient_name', 'like', "%{$s}%")
                      ->orWhere('receipt_number', 'like', "%{$s}%")
                      ->orWhere('tazkira_number', 'like', "%{$s}%")
                      ->orWhere('patient_phone', 'like', "%{$s}%");
                });
            }

            $executions = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($e) => $this->formatExecution($e));

            return response()->json([
                'success' => true,
                'data' => $executions,
                'count' => $executions->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('getPendingForRegistration error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌ها',
            ], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    // ثبت اجراآت جدید — همه چیز از Frontend دریافت می‌شود
    // POST /pharmacy-executions
    // ═══════════════════════════════════════════════════════
    public function store(Request $request)
    {
        // ⭐ لاگ برای دیباگ
        Log::info('PharmacyExecution store request:', $request->all());

        $validator = Validator::make($request->all(), [
            'pres_id' => 'required|exists:prescriptions,pres_id',
            'patient_id' => 'required|exists:patients,id',
            'reg_id' => 'required|exists:registrations,reg_id',
            'doc_id' => 'nullable|exists:users,id',

            // معلومات بیمار
            'patient_name' => 'nullable|string|max:255',
            'tazkira_number' => 'nullable|string|max:100',
            'patient_age' => 'nullable|integer|min:0',
            'patient_gender' => 'nullable|string|max:20',
            'patient_phone' => 'nullable|string|max:30',
            'patient_address' => 'nullable|string',

            // معلومات داکتر
            'doctor_name' => 'nullable|string|max:255',
            'doctor_specialty' => 'nullable|string|max:255',
            'doctor_department' => 'nullable|string|max:255',

            // مبالغ
            'total_amount' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',

            // اقلام
            'items' => 'required|array|min:1',
            'items.*.medication_name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total_price' => 'required|numeric|min:0',

            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // جلوگیری از ثبت تکراری
            $existing = PharmacyExecution::where('pres_id', $request->pres_id)
                ->whereIn('status', ['pending', 'sent_to_registration', 'paid'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'برای این نسخه قبلاً اجراآت ثبت شده است',
                    'existing_id' => $existing->id,
                ], 422);
            }

            // ⭐ ثبت کامل تمام داده‌ها
            $execution = PharmacyExecution::create([
                'pres_id' => $request->pres_id,
                'patient_id' => $request->patient_id,
                'reg_id' => $request->reg_id,
                'doc_id' => $request->doc_id,
                'executed_by' => Auth::id(),

                'patient_name' => $request->patient_name,
                'tazkira_number' => $request->tazkira_number,
                'patient_age' => $request->patient_age,
                'patient_gender' => $request->patient_gender,
                'patient_phone' => $request->patient_phone,
                'patient_address' => $request->patient_address,

                'doctor_name' => $request->doctor_name,
                'doctor_specialty' => $request->doctor_specialty,
                'doctor_department' => $request->doctor_department,

                'total_amount' => $request->total_amount,
                'paid_amount' => 0,
                'discount' => $request->discount ?? 0,

                'items' => $request->items,
                'status' => PharmacyExecution::STATUS_PENDING,
                'executed_at' => now(),
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'اجراآت با موفقیت ثبت شد',
                'data' => $this->formatExecution($execution->fresh([
                    'patient', 'doctor', 'registration',
                ])),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('PharmacyExecution store: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function show($id)
    {
        try {
            $execution = PharmacyExecution::with([
                'patient', 'doctor', 'registration', 'prescription', 'executor', 'collector',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $this->formatExecution($execution),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'اجراآت یافت نشد'], 404);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function update(Request $request, $id)
    {
        try {
            $execution = PharmacyExecution::findOrFail($id);

            if ($execution->status === 'paid') {
                return response()->json(['success' => false, 'message' => 'قابل ویرایش نیست'], 422);
            }

            $execution->update($request->only([
                'items', 'total_amount', 'discount', 'notes',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'ویرایش شد',
                'data' => $this->formatExecution($execution->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در ویرایش'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function destroy($id)
    {
        try {
            $execution = PharmacyExecution::findOrFail($id);
            if ($execution->status === 'paid') {
                return response()->json(['success' => false, 'message' => 'قابل حذف نیست'], 422);
            }
            $execution->delete();
            return response()->json(['success' => true, 'message' => 'حذف شد']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در حذف'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function sendToRegistration($id)
    {
        try {
            $execution = PharmacyExecution::findOrFail($id);

            if ($execution->status === 'sent_to_registration') {
                return response()->json(['success' => false, 'message' => 'قبلاً ارسال شده'], 422);
            }
            if ($execution->status === 'paid') {
                return response()->json(['success' => false, 'message' => 'قبلاً پرداخت شده'], 422);
            }

            $execution->sendToRegistration();

            return response()->json([
                'success' => true,
                'message' => 'به رسپشن ارسال شد',
                'data' => $this->formatExecution($execution->fresh()),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در ارسال'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function collectFee(Request $request, $id)
    {
        try {
            $execution = PharmacyExecution::findOrFail($id);

            if ($execution->status === 'paid') {
                return response()->json(['success' => false, 'message' => 'قبلاً دریافت شده'], 422);
            }

            if ($request->filled('discount')) {
                $execution->update(['discount' => $request->discount]);
            }

            $execution->markPaid(Auth::id());

            return response()->json([
                'success' => true,
                'message' => 'فیس با موفقیت دریافت شد',
                'data' => $this->formatExecution($execution->fresh(['collector'])),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در دریافت'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function getByRegId($regId)
    {
        try {
            $executions = PharmacyExecution::with(['patient', 'doctor', 'collector'])
                ->where('reg_id', $regId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($e) => $this->formatExecution($e));

            return response()->json(['success' => true, 'data' => $executions]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در دریافت'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    public function printReceipt($id)
    {
        try {
            $execution = PharmacyExecution::with([
                'patient', 'doctor', 'registration', 'executor', 'collector', 'prescription',
            ])->findOrFail($id);

            $execution->incrementPrint();

            return response()->json([
                'success' => true,
                'data' => [
                    'hospital_name' => config('app.name', 'بیمارستان'),
                    'hospital_address' => config('app.address', ''),
                    'hospital_phone' => config('app.phone', ''),
                    'execution' => $this->formatExecution($execution),
                    'print_date' => now()->format('Y/m/d H:i'),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'خطا در پرینت'], 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    private function formatExecution(PharmacyExecution $e): array
    {
        return [
            'id' => $e->id,
            'pres_id' => $e->pres_id,
            'patient_id' => $e->patient_id,
            'reg_id' => $e->reg_id,
            'doc_id' => $e->doc_id,
            'receipt_number' => $e->receipt_number,

            // معلومات بیمار
            'patient_name' => $e->patient_name,
            'tazkira_number' => $e->tazkira_number,
            'patient_age' => $e->patient_age,
            'patient_gender' => $e->patient_gender,
            'patient_phone' => $e->patient_phone,
            'patient_address' => $e->patient_address,

            // معلومات داکتر
            'doctor_name' => $e->doctor_name,
            'doctor_specialty' => $e->doctor_specialty,
            'doctor_department' => $e->doctor_department,

            // اقلام
            'items' => $e->items ?? [],

            // مبالغ
            'total_amount' => (float) $e->total_amount,
            'paid_amount' => (float) $e->paid_amount,
            'discount' => (float) $e->discount,
            'remaining_amount' => (float) $e->remaining_amount,

            // وضعیت
            'status' => $e->status,
            'status_label' => $e->status_label,

            // تاریخ‌ها
            'executed_at' => $e->executed_at,
            'sent_to_registration_at' => $e->sent_to_registration_at,
            'paid_at' => $e->paid_at,
            'cancelled_at' => $e->cancelled_at,
            'created_at' => $e->created_at,

            // پرینت و یادداشت
            'print_count' => $e->print_count,
            'notes' => $e->notes,

            // Relations
            'patient' => $e->patient ? [
                'id' => $e->patient->id,
                'full_name' => $e->patient->full_name,
                'national_id' => $e->patient->national_id,
                'mobile' => $e->patient->mobile,
            ] : null,

            'doctor' => $e->doctor ? [
                'id' => $e->doctor->id,
                'name' => $e->doctor->name,
            ] : null,

            'executor' => $e->executor ? [
                'id' => $e->executor->id,
                'name' => $e->executor->name,
            ] : null,

            'collector' => $e->collector ? [
                'id' => $e->collector->id,
                'name' => $e->collector->name,
            ] : null,
        ];
    }
}