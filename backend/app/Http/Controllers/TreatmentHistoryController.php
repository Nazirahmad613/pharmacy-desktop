<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\TreatmentHistory;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;

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
                'data' => $formattedData,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Doctor queue error: ' . $e->getMessage());
            return response()->json([
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
                    'message' => 'مراجعه مریض یافت نشد'
                ], 404);
            }

            return response()->json([
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            \Log::error('Doctor show error: ' . $e->getMessage());
            return response()->json([
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
            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            $registration->update([
                'treatment_started_at' => now()
            ]);

            return response()->json([
                'message' => 'معالجه شروع شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            \Log::error('Start treatment error: ' . $e->getMessage());
            return response()->json([
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
            ]);

            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            // اگر زمان شروع ثبت نشده، ثبت کن
            if (!$registration->treatment_started_at) {
                $registration->treatment_started_at = now();
            }

            $old = $registration->toArray();

            $registration->update([
                'diagnosis' => $validated['diagnosis'] ?? null,
                'note' => $validated['note'] ?? null,
                'weight' => $validated['weight'] ?? null,
                'blood_pressure' => $validated['blood_pressure'] ?? null,
                'temperature' => $validated['temperature'] ?? null,
                'oxygen' => $validated['oxygen'] ?? null,
                'visit_status' => 'Doctor'
            ]);

            LogService::create(
                'update',
                'registrations',
                $registration->reg_id,
                'Doctor treatment updated',
                [
                    'old' => $old,
                    'new' => $registration->toArray()
                ]
            );

            return response()->json([
                'message' => 'معلومات معالجه ثبت شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            \Log::error('Doctor treatment error: ' . $e->getMessage());
            return response()->json([
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
            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            $registration->update([
                'visit_status' => 'Laboratory',
                'sent_to_laboratory_at' => now()
            ]);

            LogService::create(
                'update',
                'registrations',
                $registration->reg_id,
                'Patient sent to laboratory',
                $registration->toArray()
            );

            return response()->json([
                'message' => 'مریض به لابراتوار ارسال شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            \Log::error('Send to laboratory error: ' . $e->getMessage());
            return response()->json([
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
            $registration = Registrations::with(['patient', 'department', 'doctor'])->find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مریض یافت نشد'
                ], 404);
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
                'diagnosis' => $registration->diagnosis,
                'weight' => $registration->weight,
                'blood_pressure' => $registration->blood_pressure,
                'temperature' => $registration->temperature,
                'oxygen' => $registration->oxygen,
                'note' => $registration->note,
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

            LogService::create(
                'update',
                'registrations',
                $registration->reg_id,
                'Doctor treatment completed and saved to history',
                [
                    'registration' => $registration->toArray(),
                    'history' => $history->toArray()
                ]
            );

            DB::commit();

            return response()->json([
                'message' => 'معالجه ختم شد و در تاریخچه ذخیره گردید',
                'data' => $registration,
                'history' => $history
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Complete treatment error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ختم معالجه',
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
                    'message' => 'سابقه معالجه یافت نشد'
                ], 404);
            }

            // پیدا کردن رجستریشن اصلی
            $registration = Registrations::find($history->reg_id);

            if (!$registration) {
                return response()->json([
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

            return response()->json([
                'message' => 'مریض به معاینه برگشت داده شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            \Log::error('Return to treatment error: ' . $e->getMessage());
            return response()->json([
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
            ->get();

            return response()->json([
                'data' => $history,
                'count' => $history->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Treatment history error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت تاریخچه معالجات',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}