<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\TreatmentHistory;
use App\Models\Patient;
use App\Models\Examination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // اضافه کردن این خط برای رفع خطا

class DoctorTreatmentController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | صف مریضان داکتر
    |--------------------------------------------------------------------------
    */

    public function doctorQueue()
    {
        try {
            $doctorId = Auth::id();

            $registrations = Registrations::with([
                'patient',
                'department'
            ])
            ->where('doctor_id', $doctorId)
            ->where('visit_status', 'Doctor')
            ->orderBy('sent_to_doctor_at', 'asc')
            ->orderBy('queue_number', 'asc')
            ->get();

            $formattedData = $registrations->map(function($registration) {
                return [
                    'reg_id' => $registration->reg_id,
                    'visit_number' => $registration->visit_number,
                    'queue_number' => $registration->queue_number,
                    'visit_date' => $registration->visit_date,
                    'visit_status' => $registration->visit_status,
                    'sent_to_doctor_at' => $registration->sent_to_doctor_at,
                    'registration_fee' => $registration->registration_fee,
                    'diagnosis' => $registration->diagnosis,
                    'weight' => $registration->weight,
                    'blood_pressure' => $registration->blood_pressure,
                    'temperature' => $registration->temperature,
                    'oxygen' => $registration->oxygen,
                    'note' => $registration->note,
                    'patient' => $registration->patient ? [
                        'id' => $registration->patient->id,
                        'first_name' => $registration->patient->first_name,
                        'last_name' => $registration->patient->last_name,
                        'father_name' => $registration->patient->father_name,
                        'mobile' => $registration->patient->mobile,
                        'national_id' => $registration->patient->national_id,
                        'gender' => $registration->patient->gender,
                        'age' => $registration->patient->age,
                        'blood_group' => $registration->patient->blood_group,
                        'address' => $registration->patient->address,
                    ] : null,
                    'department' => $registration->department ? [
                        'id' => $registration->department->id,
                        'name' => $registration->department->name,
                        'code' => $registration->department->code,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedData,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Doctor queue error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت صف داکتر',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | دریافت معلومات کامل مریض برای معاینه
    |--------------------------------------------------------------------------
    */

    public function show($reg_id)
    {
        try {
            $registration = Registrations::with([
                'patient',
                'department',
                'doctor'
            ])
            ->where('reg_id', $reg_id)
            ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه مریض یافت نشد'
                ], 404);
            }

            // دریافت آخرین معاینه
            $examination = Examination::where('registration_id', $reg_id)->latest()->first();

            $data = [
                'registration' => [
                    'reg_id' => $registration->reg_id,
                    'visit_number' => $registration->visit_number,
                    'queue_number' => $registration->queue_number,
                    'visit_date' => $registration->visit_date,
                    'visit_status' => $registration->visit_status,
                    'registration_fee' => $registration->registration_fee,
                    'sent_to_doctor_at' => $registration->sent_to_doctor_at,
                    'treatment_started_at' => $registration->treatment_started_at,
                    'treatment_completed_at' => $registration->treatment_completed_at,
                    'department' => $registration->department ? [
                        'id' => $registration->department->id,
                        'name' => $registration->department->name,
                        'code' => $registration->department->code,
                    ] : null,
                ],
                'patient' => $registration->patient ? [
                    'id' => $registration->patient->id,
                    'first_name' => $registration->patient->first_name,
                    'last_name' => $registration->patient->last_name,
                    'full_name' => $registration->patient->first_name . ' ' . $registration->patient->last_name,
                    'father_name' => $registration->patient->father_name,
                    'mobile' => $registration->patient->mobile,
                    'phone' => $registration->patient->phone ?? null,
                    'national_id' => $registration->patient->national_id,
                    'gender' => $registration->patient->gender,
                    'age' => $registration->patient->age,
                    'blood_group' => $registration->patient->blood_group,
                    'address' => $registration->patient->address,
                    'email' => $registration->patient->email ?? null,
                ] : null,
                'examination' => $examination ? [
                    'diagnosis' => $examination->diagnosis,
                    'weight' => $examination->weight,
                    'blood_pressure' => $examination->blood_pressure,
                    'temperature' => $examination->temperature,
                    'oxygen' => $examination->oxygen,
                    'pulse' => $examination->pulse,
                    'respiratory_rate' => $examination->respiratory_rate,
                    'height' => $examination->height,
                    'bmi' => $examination->bmi,
                    'chief_complaint' => $examination->chief_complaint,
                    'history_of_present_illness' => $examination->history_of_present_illness,
                    'past_medical_history' => $examination->past_medical_history,
                    'physical_examination' => $examination->physical_examination,
                    'note' => $examination->note,
                ] : null
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (\Exception $e) {
            Log::error('Doctor show error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | شروع معالجه - ثبت زمان شروع
    |--------------------------------------------------------------------------
    */

    public function startTreatment($reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            $registration->update([
                'treatment_started_at' => now(),
                'visit_status' => 'Doctor'
            ]);

            Log::info('Treatment started for registration: ' . $reg_id);

            return response()->json([
                'success' => true,
                'message' => 'معالجه شروع شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Start treatment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در شروع معالجه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ثبت تشخیص و معلومات معالجه
    |--------------------------------------------------------------------------
    */

    public function treatment(Request $request, $reg_id)
    {
        try {
            $validated = $request->validate([
                'diagnosis' => 'nullable|string',
                'note' => 'nullable|string',
                'weight' => 'nullable|numeric',
                'blood_pressure' => 'nullable|string',
                'temperature' => 'nullable|numeric',
                'oxygen' => 'nullable|integer',
                'pulse' => 'nullable|integer',
                'respiratory_rate' => 'nullable|integer',
                'height' => 'nullable|numeric',
                'bmi' => 'nullable|numeric',
                'chief_complaint' => 'nullable|string',
                'history_of_present_illness' => 'nullable|string',
                'past_medical_history' => 'nullable|string',
                'physical_examination' => 'nullable|string',
            ]);

            $registration = Registrations::where('reg_id', $reg_id)->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            // اگر زمان شروع ثبت نشده، ثبت کن
            if (!$registration->treatment_started_at) {
                $registration->treatment_started_at = now();
            }

            // بررسی اینکه آیا معاینه قبلاً ثبت شده است
            $existingExamination = Examination::where('registration_id', $reg_id)->first();

            DB::beginTransaction();

            if ($existingExamination) {
                // بروزرسانی معاینه موجود
                $existingExamination->update([
                    'diagnosis' => $validated['diagnosis'] ?? $existingExamination->diagnosis,
                    'note' => $validated['note'] ?? $existingExamination->note,
                    'weight' => $validated['weight'] ?? $existingExamination->weight,
                    'blood_pressure' => $validated['blood_pressure'] ?? $existingExamination->blood_pressure,
                    'temperature' => $validated['temperature'] ?? $existingExamination->temperature,
                    'oxygen' => $validated['oxygen'] ?? $existingExamination->oxygen,
                    'pulse' => $validated['pulse'] ?? $existingExamination->pulse,
                    'respiratory_rate' => $validated['respiratory_rate'] ?? $existingExamination->respiratory_rate,
                    'height' => $validated['height'] ?? $existingExamination->height,
                    'bmi' => $validated['bmi'] ?? $existingExamination->bmi,
                    'chief_complaint' => $validated['chief_complaint'] ?? $existingExamination->chief_complaint,
                    'history_of_present_illness' => $validated['history_of_present_illness'] ?? $existingExamination->history_of_present_illness,
                    'past_medical_history' => $validated['past_medical_history'] ?? $existingExamination->past_medical_history,
                    'physical_examination' => $validated['physical_examination'] ?? $existingExamination->physical_examination,
                ]);
                $examination = $existingExamination;
            } else {
                // ایجاد معاینه جدید
                $examination = Examination::create([
                    'registration_id' => $reg_id,
                    'user_id' => Auth::id(),
                    'patient_id' => $registration->patient_id,
                    'diagnosis' => $validated['diagnosis'] ?? null,
                    'note' => $validated['note'] ?? null,
                    'weight' => $validated['weight'] ?? null,
                    'blood_pressure' => $validated['blood_pressure'] ?? null,
                    'temperature' => $validated['temperature'] ?? null,
                    'oxygen' => $validated['oxygen'] ?? null,
                    'pulse' => $validated['pulse'] ?? null,
                    'respiratory_rate' => $validated['respiratory_rate'] ?? null,
                    'height' => $validated['height'] ?? null,
                    'bmi' => $validated['bmi'] ?? null,
                    'chief_complaint' => $validated['chief_complaint'] ?? null,
                    'history_of_present_illness' => $validated['history_of_present_illness'] ?? null,
                    'past_medical_history' => $validated['past_medical_history'] ?? null,
                    'physical_examination' => $validated['physical_examination'] ?? null,
                    'examination_date' => now()
                ]);
            }

            // بروزرسانی رجیستریشن
            $registration->update([
                'diagnosis' => $validated['diagnosis'] ?? $registration->diagnosis,
                'note' => $validated['note'] ?? $registration->note,
                'weight' => $validated['weight'] ?? $registration->weight,
                'blood_pressure' => $validated['blood_pressure'] ?? $registration->blood_pressure,
                'temperature' => $validated['temperature'] ?? $registration->temperature,
                'oxygen' => $validated['oxygen'] ?? $registration->oxygen,
                'visit_status' => 'examined'
            ]);

            DB::commit();

            Log::info('Treatment recorded for registration: ' . $reg_id);

            return response()->json([
                'success' => true,
                'message' => 'معلومات معالجه با موفقیت ثبت شد',
                'data' => [
                    'registration' => $registration,
                    'examination' => $examination
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Doctor treatment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت معلومات معالجه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ارسال به لابراتوار
    |--------------------------------------------------------------------------
    */

    public function sendToLaboratory(Request $request, $reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            $registration->update([
                'visit_status' => 'Laboratory',
                'sent_to_laboratory_at' => now()
            ]);

            Log::info('Patient sent to laboratory: ' . $reg_id);

            return response()->json([
                'success' => true,
                'message' => 'مریض به لابراتوار ارسال شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Send to laboratory error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ارسال به لابراتوار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ختم معالجه و ذخیره در تاریخچه
    |--------------------------------------------------------------------------
    */

    public function complete($reg_id)
    {
        DB::beginTransaction();

        try {
            $registration = Registrations::with(['patient', 'department', 'doctor'])
                ->where('reg_id', $reg_id)
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            // بررسی اینکه آیا معاینه ثبت شده است
            $examination = Examination::where('registration_id', $reg_id)->first();
            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'قبل از ختم معالجه، معاینه باید ثبت شود'
                ], 400);
            }

            // ذخیره در تاریخچه
            $history = TreatmentHistory::create([
                'reg_id' => $registration->reg_id,
                'patient_id' => $registration->patient_id,
                'doctor_id' => $registration->doctor_id,
                'visit_number' => $registration->visit_number,
                'queue_number' => $registration->queue_number,
                'visit_status' => 'Completed',
                'registration_fee' => $registration->registration_fee,
                'diagnosis' => $examination->diagnosis,
                'weight' => $examination->weight,
                'blood_pressure' => $examination->blood_pressure,
                'temperature' => $examination->temperature,
                'oxygen' => $examination->oxygen,
                'pulse' => $examination->pulse,
                'respiratory_rate' => $examination->respiratory_rate,
                'height' => $examination->height,
                'bmi' => $examination->bmi,
                'chief_complaint' => $examination->chief_complaint,
                'history_of_present_illness' => $examination->history_of_present_illness,
                'past_medical_history' => $examination->past_medical_history,
                'physical_examination' => $examination->physical_examination,
                'note' => $examination->note,
                'sent_to_doctor_at' => $registration->sent_to_doctor_at,
                'treatment_started_at' => $registration->treatment_started_at ?? now(),
                'treatment_completed_at' => now(),
                'sent_to_laboratory_at' => $registration->sent_to_laboratory_at,
            ]);

            // بروزرسانی وضعیت مراجعه
            $registration->update([
                'visit_status' => 'Completed',
                'treatment_completed_at' => now()
            ]);

            // بروزرسانی وضعیت معاینه
            $examination->update([
                'is_completed' => true
            ]);

            DB::commit();

            Log::info('Treatment completed and saved to history: ' . $reg_id);

            return response()->json([
                'success' => true,
                'message' => 'معالجه با موفقیت ختم شد و در تاریخچه ذخیره گردید',
                'data' => [
                    'registration' => $registration,
                    'examination' => $examination,
                    'history' => $history
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Complete treatment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ختم معالجه: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | برگشت به معاینه از تاریخچه
    |--------------------------------------------------------------------------
    */

    public function returnToTreatment($history_id)
    {
        try {
            $history = TreatmentHistory::find($history_id);

            if (!$history) {
                return response()->json([
                    'success' => false,
                    'message' => 'سابقه معالجه یافت نشد'
                ], 404);
            }

            // پیدا کردن رجستریشن اصلی
            $registration = Registrations::where('reg_id', $history->reg_id)->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه اصلی یافت نشد'
                ], 404);
            }

            // بروزرسانی رجستریشن با اطلاعات تاریخچه
            $registration->update([
                'visit_status' => 'Doctor',
                'diagnosis' => $history->diagnosis,
                'weight' => $history->weight,
                'blood_pressure' => $history->blood_pressure,
                'temperature' => $history->temperature,
                'oxygen' => $history->oxygen,
                'note' => $history->note,
                'sent_to_doctor_at' => $history->sent_to_doctor_at ?? now(),
                'treatment_started_at' => $history->treatment_started_at ?? now(),
            ]);

            // حذف از تاریخچه
            $history->delete();

            Log::info('Patient returned to treatment from history: ' . $history_id);

            return response()->json([
                'success' => true,
                'message' => 'مریض به معاینه برگشت داده شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Return to treatment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در برگشت به معاینه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | دریافت لیست تاریخچه معالجات
    |--------------------------------------------------------------------------
    */

    public function treatmentHistory()
    {
        try {
            $doctorId = Auth::id();

            $history = TreatmentHistory::with([
                'patient',
                'doctor'
            ])
            ->where('doctor_id', $doctorId)
            ->orderBy('treatment_completed_at', 'desc')
            ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $history,
                'total' => $history->total(),
                'count' => $history->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Treatment history error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه معالجات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | دریافت تاریخچه یک مریض خاص
    |--------------------------------------------------------------------------
    */

    public function patientHistory($patient_id)
    {
        try {
            $history = TreatmentHistory::with([
                'patient',
                'doctor',
                'registration'
            ])
            ->where('patient_id', $patient_id)
            ->orderBy('treatment_completed_at', 'desc')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $history,
                'count' => $history->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Patient history error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | دریافت آمار معالجات داکتر
    |--------------------------------------------------------------------------
    */

    public function getStatistics()
    {
        try {
            $doctorId = Auth::id();

            $stats = [
                'total_treatments' => TreatmentHistory::where('doctor_id', $doctorId)->count(),
                'today_treatments' => TreatmentHistory::where('doctor_id', $doctorId)
                    ->whereDate('treatment_completed_at', today())
                    ->count(),
                'weekly_treatments' => TreatmentHistory::where('doctor_id', $doctorId)
                    ->whereBetween('treatment_completed_at', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
                'monthly_treatments' => TreatmentHistory::where('doctor_id', $doctorId)
                    ->whereMonth('treatment_completed_at', now()->month)
                    ->count(),
                'pending_patients' => Registrations::where('doctor_id', $doctorId)
                    ->where('visit_status', 'Doctor')
                    ->count(),
                'laboratory_patients' => Registrations::where('doctor_id', $doctorId)
                    ->where('visit_status', 'Laboratory')
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Statistics error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}