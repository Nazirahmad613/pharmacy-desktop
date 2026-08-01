<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\Patient;
use App\Models\Examination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // اضافه کردن این خط

class DoctorTreatmentController extends Controller
{
    /**
     * دریافت صف انتظار داکتر
     * 
     * @return \Illuminate\Http\JsonResponse
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
            ->whereNotNull('sent_to_doctor_at')
            ->whereDate('queue_date', now()->toDateString())
            ->orderBy('sent_to_doctor_at', 'asc')
            ->orderBy('queue_number', 'asc')
            ->get();

            // تبدیل داده‌ها به فرمت مناسب برای فرانت‌اند
            $formattedData = $registrations->map(function($registration) {
                return [
                    'reg_id' => $registration->reg_id,
                    'queue_number' => $registration->queue_number,
                    'queue_date' => $registration->queue_date,
                    'visit_date' => $registration->visit_date,
                    'visit_status' => $registration->visit_status,
                    'registration_fee' => $registration->registration_fee,
                    'sent_to_doctor_at' => $registration->sent_to_doctor_at,
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

    /**
     * دریافت اطلاعات کامل مریض برای معاینه
     * 
     * @param int $reg_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($reg_id)
    {
        try {
            $registration = Registrations::with([
                'patient',
                'department'
            ])->where('reg_id', $reg_id)->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            $patient = $registration->patient;
            
            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'اطلاعات مریض پیدا نشد'
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
                    'status' => $registration->visit_status,
                    'department' => $registration->department ? [
                        'id' => $registration->department->id,
                        'name' => $registration->department->name,
                        'code' => $registration->department->code
                    ] : null,
                ],
                'patient' => [
                    'id' => $patient->id,
                    'first_name' => $patient->first_name,
                    'last_name' => $patient->last_name,
                    'full_name' => $patient->first_name . ' ' . $patient->last_name,
                    'father_name' => $patient->father_name,
                    'age' => $patient->age,
                    'gender' => $patient->gender,
                    'blood_group' => $patient->blood_group,
                    'mobile' => $patient->mobile,
                    'phone' => $patient->phone ?? null,
                    'address' => $patient->address,
                    'email' => $patient->email ?? null,
                    'national_id' => $patient->national_id,
                ],
                'previous_examination' => $examination ? [
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
            Log::error('Error fetching patient info: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات مریض: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت معاینه
     * 
     * @param Request $request
     * @param int $reg_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function treatment(Request $request, $reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            // بررسی اینکه کاربر جاری داکتر است
            

            DB::beginTransaction();

            // ایجاد معاینه جدید
            $examination = Examination::create([
                'registration_id' => $reg_id,
                'user_id' => Auth::id(),
                'patient_id' => $registration->patient_id,
                'chief_complaint' => $request->chief_complaint,
                'diagnosis' => $request->diagnosis,
                'weight' => $request->weight,
                'height' => $request->height,
                'bmi' => $request->bmi,
                'blood_pressure' => $request->blood_pressure,
                'temperature' => $request->temperature,
                'pulse' => $request->pulse,
                'respiratory_rate' => $request->respiratory_rate,
                'oxygen' => $request->oxygen,
                'history_of_present_illness' => $request->history_of_present_illness,
                'past_medical_history' => $request->past_medical_history,
                'physical_examination' => $request->physical_examination,
                'note' => $request->note,
                'examination_date' => now()
            ]);

            // بروزرسانی وضعیت ثبت
          $registration->update([
    'visit_status' => 'Examining',
    'examined_at' => now()
]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'معاینه با موفقیت ثبت شد',
                'data' => $examination
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in treatment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت معاینه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ختم معالجه
     * 
     * @param int $reg_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function complete($reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
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

         $registration->update([
    'visit_status' => 'Completed',
    'completed_at' => now()
]);

            return response()->json([
                'success' => true,
                'message' => 'معالجه با موفقیت ختم شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Error completing treatment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ختم معالجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * شروع معالجه
     * 
     * @param int $reg_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function startTreatment($reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            $registration->update([
                'visit_status' => 'Doctor',
                'sent_to_doctor_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'معالجه شروع شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Error starting treatment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در شروع معالجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ارسال به لابراتوار
     * 
     * @param Request $request
     * @param int $reg_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendToLaboratory(Request $request, $reg_id)
    {
        try {
            $registration = Registrations::where('reg_id', $reg_id)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            $registration->update([
                'visit_status' => 'Laboratory',
                'sent_to_laboratory_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'مریض به لابراتوار ارسال شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Error sending to laboratory: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ارسال به لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بازگشت به معالجه
     * 
     * @param int $history_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function returnToTreatment($history_id)
    {
        try {
            $registration = Registrations::where('reg_id', $history_id)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            $registration->update([
                'visit_status' => 'Doctor',
                'returned_to_doctor_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'مریض به معالجه بازگشت',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('Error returning to treatment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در بازگشت به معالجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تاریخچه معالجه
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function treatmentHistory(Request $request)
    {
        try {
            $doctorId = Auth::id();
            
            $history = Registrations::with([
                'patient',
                'department'
            ])
            ->where('doctor_id', $doctorId)
            ->whereIn('visit_status', ['completed', 'examined'])
            ->orderBy('updated_at', 'desc')
            ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $history
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching treatment history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه معالجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ذخیره درخواست رادیولوژی
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeRadiologyRequest(Request $request)
    {
        try {
            $validated = $request->validate([
                'registration_id' => 'required|exists:registrations,reg_id',
                'radiology_type' => 'required|string|max:100',
                'description' => 'nullable|string',
            ]);

            // ایجاد درخواست رادیولوژی
            // اینجا می‌توانید مدل RadiologyRequest را ایجاد کنید
            
            return response()->json([
                'success' => true,
                'message' => 'درخواست رادیولوژی با موفقیت ثبت شد',
                'data' => $validated
            ]);

        } catch (\Exception $e) {
            Log::error('Error storing radiology request: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست رادیولوژی: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ذخیره Follow Up
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeFollowUp(Request $request)
    {
        try {
            $validated = $request->validate([
                'registration_id' => 'required|exists:registrations,reg_id',
                'follow_up_date' => 'required|date|after:today',
                'description' => 'nullable|string',
            ]);

            // ایجاد Follow Up
            // اینجا می‌توانید مدل FollowUp را ایجاد کنید

            return response()->json([
                'success' => true,
                'message' => 'ملاقات بعدی با موفقیت ثبت شد',
                'data' => $validated
            ]);

        } catch (\Exception $e) {
            Log::error('Error storing follow up: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت ملاقات بعدی: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت بخش‌های بستری
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getWards()
    {
        try {
            // فرض کنید مدل Ward وجود دارد
            // $wards = Ward::where('status', 'active')->get();
            
            // برای تست، یک آرایه خالی برمی‌گردانیم
            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching wards: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت بخش‌های بستری: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ذخیره درخواست بستری
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeAdmission(Request $request)
    {
        try {
            $validated = $request->validate([
                'registration_id' => 'required|exists:registrations,reg_id',
                'ward_id' => 'required|integer',
                'admission_date' => 'required|date',
                'reason' => 'required|string',
            ]);

            // ایجاد درخواست بستری
            // اینجا می‌توانید مدل Admission را ایجاد کنید

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت ثبت شد',
                'data' => $validated
            ]);

        } catch (\Exception $e) {
            Log::error('Error storing admission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست بستری: ' . $e->getMessage()
            ], 500);
        }
    }
}