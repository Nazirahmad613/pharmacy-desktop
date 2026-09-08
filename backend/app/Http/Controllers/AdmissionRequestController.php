<?php
// app/Http/Controllers/AdmissionRequestController.php

namespace App\Http\Controllers;

use App\Models\AdmissionRequest;
use App\Models\AdmissionFee;
use App\Models\Patient;
use App\Models\Registrations;
use App\Models\Ward;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdmissionRequestController extends Controller
{

    /**
     * دریافت تمام درخواست‌های بستری با اطلاعات کامل
     * این متد برای تب مدیریت فیس‌های بستری استفاده می‌شود
     */
    public function getAllRequests(Request $request)
    {
        try {
            // دریافت تمام درخواست‌های بستری با اطلاعات مرتبط
            $query = AdmissionRequest::with([
                'patient',
                'doctor',
                'ward',
                'fees' => function($q) {
                    $q->select('id', 'admission_request_id', 'amount', 'status', 'paid_amount', 'payment_method', 'created_at')
                      ->orderBy('created_at', 'desc');
                }
            ])
            ->whereIn('status', ['admitted', 'pending'])
            ->orderBy('created_at', 'desc');

            // فیلتر بر اساس بخش
            if ($request->has('ward_id') && $request->ward_id) {
                $query->where('ward_id', $request->ward_id);
            }

            // فیلتر بر اساس پزشک
            if ($request->has('doctor_id') && $request->doctor_id) {
                $query->where('doctor_id', $request->doctor_id);
            }

            // فیلتر بر اساس جستجو
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->whereHas('patient', function($p) use ($search) {
                        $p->where('first_name', 'like', "%{$search}%")
                          ->orWhere('last_name', 'like', "%{$search}%")
                          ->orWhere('mobile', 'like', "%{$search}%");
                    })
                    ->orWhere('reg_id', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
                });
            }

            $requests = $query->get();

            // پردازش هر درخواست برای اضافه کردن اطلاعات فیس
            $allRequests = [];
            $unpaidRequests = [];
            $paidRequests = [];

            foreach ($requests as $requestItem) {
                // بررسی وجود فیس
                $hasFee = $requestItem->fees->count() > 0;
                $lastFee = $requestItem->fees->first();

                // ساخت داده‌های درخواست
                $requestData = [
                    'id' => $requestItem->id,
                    'reg_id' => $requestItem->reg_id,
                    'patient_id' => $requestItem->patient_id,
                    'doctor_id' => $requestItem->doctor_id,
                    'ward_id' => $requestItem->ward_id,
                    'ward_name' => $requestItem->ward?->name,
                    'admission_date' => $requestItem->admission_date,
                    'discharged_at' => $requestItem->discharged_at,
                    'cancelled_at' => $requestItem->cancelled_at,
                    'diagnosis' => $requestItem->diagnosis,
                    'admission_instructions' => $requestItem->admission_instructions,
                    'special_notes' => $requestItem->special_notes,
                    'status' => $requestItem->status,
                    'status_label' => $requestItem->status_label,
                    'priority' => $requestItem->priority,
                    'priority_label' => $requestItem->priority_label,
                    'last_fee_alert_at' => $requestItem->last_fee_alert_at,
                    'fee_alert_count' => $requestItem->fee_alert_count,
                    'completed_at' => $requestItem->completed_at,
                    'created_at' => $requestItem->created_at,
                    'updated_at' => $requestItem->updated_at,
                    
                    // اطلاعات بیمار
                    'patient' => [
                        'id' => $requestItem->patient?->id,
                        'first_name' => $requestItem->patient?->first_name,
                        'last_name' => $requestItem->patient?->last_name,
                        'full_name' => $requestItem->patient?->full_name,
                        'mobile' => $requestItem->patient?->mobile,
                        'phone' => $requestItem->patient?->phone,
                        'national_id' => $requestItem->patient?->national_id,
                        'gender' => $requestItem->patient?->gender,
                        'age' => $requestItem->patient?->age,
                        'address' => $requestItem->patient?->address,
                    ],
                    
                    // اطلاعات پزشک
                    'doctor' => $requestItem->doctor ? [
                        'id' => $requestItem->doctor->id,
                        'name' => $requestItem->doctor->name,
                        'email' => $requestItem->doctor->email,
                    ] : null,
                    
                    // اطلاعات بخش
                    'ward' => $requestItem->ward ? [
                        'id' => $requestItem->ward->id,
                        'name' => $requestItem->ward->name,
                        'type' => $requestItem->ward->type,
                    ] : null,
                    
                    // اطلاعات فیس
                    'has_fee' => $hasFee,
                    'fee_id' => $lastFee?->id,
                    'fee_amount' => $lastFee?->amount,
                    'fee_status' => $lastFee?->status,
                    'fee_paid_amount' => $lastFee?->paid_amount,
                    'fee_payment_method' => $lastFee?->payment_method,
                    'fee_created_at' => $lastFee?->created_at,
                    
                    // تعداد فیس‌ها
                    'total_fees_count' => $requestItem->fees->count(),
                    'paid_fees_count' => $requestItem->fees->where('status', 'paid')->count(),
                    'pending_fees_count' => $requestItem->fees->where('status', 'pending')->count(),
                    
                    // مجموع مبالغ
                    'total_fees_amount' => $requestItem->fees->sum('amount'),
                    'paid_fees_amount' => $requestItem->fees->where('status', 'paid')->sum('amount'),
                    'pending_fees_amount' => $requestItem->fees->where('status', 'pending')->sum('amount'),
                ];

                $allRequests[] = $requestData;

                if ($hasFee) {
                    $paidRequests[] = $requestData;
                } else {
                    $unpaidRequests[] = $requestData;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $allRequests,
                    'unpaid_requests' => $unpaidRequests,
                    'paid_requests' => $paidRequests,
                    'total_count' => count($allRequests),
                    'unpaid_count' => count($unpaidRequests),
                    'paid_count' => count($paidRequests),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAllRequests: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌های بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش لیست تمام درخواست‌های بستری
     */
    public function index(Request $request)
    {
        $query = AdmissionRequest::with(['patient', 'ward', 'doctor', 'fees', 'registration']);

        // فیلتر بر اساس وضعیت
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // فیلتر بر اساس بیمار
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        // فیلتر بر اساس بخش
        if ($request->has('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        // فیلتر بر اساس تاریخ
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // جستجو
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('patient', function($p) use ($search) {
                    $p->where('full_name', 'like', "%{$search}%")
                      ->orWhere('national_id', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                })->orWhere('id', 'like', "%{$search}%");
            });
        }

        $admissions = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $admissions
        ]);
    }

    /**
     * ذخیره درخواست بستری جدید (از تب معالجه)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reg_id' => 'required|exists:registrations,reg_id',
            'ward_id' => 'required|exists:wards,id',
            'admission_date' => 'required|date',
            'diagnosis' => 'nullable|string|max:500',
            'admission_instructions' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'priority' => 'sometimes|in:high,medium,normal,low'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // ============ دریافت اطلاعات از رجیستریشن ============
            $registration = Registrations::with(['patient', 'doctor'])
                ->where('reg_id', $request->reg_id)
                ->first();

            if (!$registration) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            // ============ دریافت patient_id از رجیستریشن ============
            $patientId = $registration->patient_id ?? $registration->patient?->id;
            
            if (!$patientId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار یافت نشد'
                ], 404);
            }

            // ============ دریافت doctor_id از رجیستریشن یا کاربر فعلی ============
            $doctorId = $request->user()?->id ?? $registration->doctor_id ?? $registration->doctor?->id;

            if (!$doctorId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'پزشک یافت نشد'
                ], 404);
            }

            // ============ دریافت تشخیص ============
            $diagnosis = $request->diagnosis ?? ($registration->diagnosis ?? null);

            // ============ کاهش تعداد تخت‌های موجود در بخش ============
            $ward = Ward::find($request->ward_id);
            if (!$ward) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'بخش یافت نشد'
                ], 404);
            }

            if ($ward->available_beds <= 0) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'در این بخش تخت خالی وجود ندارد'
                ], 400);
            }
            $ward->decrement('available_beds');

            // ============ ایجاد درخواست بستری ============
            $admission = AdmissionRequest::create([
                'reg_id' => $request->reg_id,
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'ward_id' => $request->ward_id,
                'admission_date' => $request->admission_date,
                'diagnosis' => $diagnosis,
                'admission_instructions' => $request->admission_instructions,
                'special_notes' => $request->special_notes,
                'status' => 'admitted',
                'priority' => $request->priority ?? 'normal'
            ]);

            // ============ به‌روزرسانی وضعیت مراجعه ============
            if ($registration) {
                $registration->update(['visit_status' => 'Admission']);
            }

            DB::commit();

            // ============ بارگذاری روابط ============
            $admission->load(['patient', 'ward', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت ثبت شد',
                'data' => $admission
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ثبت درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست بستری: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک درخواست بستری
     */
    public function show($id)
    {
        $admission = AdmissionRequest::with([
            'patient', 
            'ward', 
            'doctor', 
            'registration',
            'fees.collector'
        ])->find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $admission
        ]);
    }

    /**
     * به‌روزرسانی درخواست بستری
     */
    public function update(Request $request, $id)
    {
        $admission = AdmissionRequest::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'ward_id' => 'sometimes|exists:wards,id',
            'admission_instructions' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'priority' => 'sometimes|in:high,medium,normal,low'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // ============ اگر بخش تغییر کرد ============
            if ($request->has('ward_id') && $request->ward_id != $admission->ward_id) {
                // افزایش تخت‌های بخش قبلی
                Ward::find($admission->ward_id)->increment('available_beds');
                
                // کاهش تخت‌های بخش جدید
                $newWard = Ward::find($request->ward_id);
                if ($newWard->available_beds <= 0) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'در بخش جدید تخت خالی وجود ندارد'
                    ], 400);
                }
                $newWard->decrement('available_beds');
            }

            // ============ به‌روزرسانی ============
            $admission->update($request->only([
                'ward_id', 
                'admission_instructions', 
                'special_notes',
                'priority'
            ]));

            DB::commit();

            $admission->load(['patient', 'ward', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'اطلاعات بستری با موفقیت به‌روزرسانی شد',
                'data' => $admission
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در به‌روزرسانی درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی اطلاعات بستری: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ترخیص بیمار (توسط بخش فیس)
     */
    public function discharge($id)
    {
        $admission = AdmissionRequest::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        if ($admission->status === 'discharged') {
            return response()->json([
                'success' => false,
                'message' => 'این بیمار قبلاً ترخیص شده است'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // ترخیص بیمار
            $admission->update([
                'status' => 'discharged',
                'discharged_at' => now()
            ]);

            // افزایش تخت‌های موجود در بخش
            Ward::find($admission->ward_id)->increment('available_beds');

            // به‌روزرسانی وضعیت مراجعه
            if ($admission->reg_id) {
                Registrations::where('reg_id', $admission->reg_id)
                    ->update(['visit_status' => 'Discharged']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'بیمار با موفقیت ترخیص شد',
                'data' => [
                    'admission' => $admission,
                    'can_complete_treatment' => true
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ترخیص بیمار:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ترخیص بیمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * لغو درخواست بستری
     */
    public function cancel($id)
    {
        $admission = AdmissionRequest::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        if ($admission->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'این درخواست قبلاً لغو شده است'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // اگر بیمار بستری است، تخت را آزاد کن
            if ($admission->status === 'admitted') {
                Ward::find($admission->ward_id)->increment('available_beds');
            }

            $admission->update([
                'status' => 'cancelled',
                'cancelled_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت لغو شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در لغو درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در لغو درخواست بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف درخواست بستری
     */
    public function destroy($id)
    {
        $admission = AdmissionRequest::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        try {
            DB::beginTransaction();

            // اگر بیمار بستری است، تخت را آزاد کن
            if ($admission->status === 'admitted') {
                Ward::find($admission->ward_id)->increment('available_beds');
            }

            $admission->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در حذف درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف درخواست بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست بیماران بستری فعال
     */
    public function getActiveAdmissions()
    {
        $admissions = AdmissionRequest::with(['patient', 'ward', 'doctor', 'registration'])
            ->where('status', 'admitted')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $admissions
        ]);
    }

    /**
     * دریافت وضعیت بستری برای یک مراجعه خاص
     */
    public function getAdmissionStatus($regId)
    {
        $admission = AdmissionRequest::with(['ward'])
            ->where('reg_id', $regId)
            ->whereIn('status', ['pending', 'admitted'])
            ->first();

        if (!$admission) {
            return response()->json([
                'success' => true,
                'data' => [
                    'is_admitted' => false,
                    'admission_id' => null,
                    'status' => 'none'
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'is_admitted' => $admission->status === 'admitted',
                'admission_id' => $admission->id,
                'status' => $admission->status,
                'ward_id' => $admission->ward_id,
                'ward_name' => $admission->ward->name ?? null,
                'admission_date' => $admission->admission_date,
                'diagnosis' => $admission->diagnosis,
                'admission_instructions' => $admission->admission_instructions,
                'special_notes' => $admission->special_notes,
                'priority' => $admission->priority
            ]
        ]);
    }

    /**
     * دریافت آمار بستری
     */
    public function getStatistics()
    {
        $statistics = [
            'total_admissions' => AdmissionRequest::count(),
            'active_admissions' => AdmissionRequest::where('status', 'admitted')->count(),
            'pending_admissions' => AdmissionRequest::where('status', 'pending')->count(),
            'discharged_today' => AdmissionRequest::whereDate('discharged_at', today())
                ->where('status', 'discharged')
                ->count(),
            'total_wards' => Ward::count(),
            'total_beds' => Bed::count(),
            'available_beds' => Bed::where('status', 'available')->count(),
            'occupied_beds' => Bed::where('status', 'occupied')->count()
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    /**
     * پرینت رسید بستری
     */
    public function printReceipt($id)
    {
        $admission = AdmissionRequest::with(['patient', 'ward', 'doctor', 'fees'])
            ->find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری یافت نشد'
            ], 404);
        }

        $receiptData = [
            'admission' => $admission,
            'patient' => $admission->patient,
            'ward' => $admission->ward,
            'doctor' => $admission->doctor,
            'fees' => $admission->fees,
            'hospital_name' => config('app.name', 'بیمارستان'),
            'hospital_address' => config('app.address', ''),
            'hospital_phone' => config('app.phone', ''),
            'print_date' => now()->format('Y/m/d H:i')
        ];

        return response()->json([
            'success' => true,
            'data' => $receiptData
        ]);
    }

    /**
     * دریافت درخواست‌های بستری یک بیمار خاص
     */
    public function getPatientAdmissions($patientId)
    {
        $patient = Patient::find($patientId);
        if (!$patient) {
            return response()->json([
                'success' => false,
                'message' => 'بیمار یافت نشد'
            ], 404);
        }

        $admissions = AdmissionRequest::with(['ward', 'doctor', 'fees'])
            ->where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'patient' => $patient,
                'admissions' => $admissions,
                'total' => $admissions->count(),
                'active' => $admissions->where('status', 'admitted')->count(),
                'discharged' => $admissions->where('status', 'discharged')->count()
            ]
        ]);
    }

    /**
     * تکمیل معالجه (برای داکتر)
     */
    public function completeTreatment($regId)
    {
        // پیدا کردن درخواست بستری برای این مراجعه
        $admission = AdmissionRequest::where('reg_id', $regId)
            ->where('status', 'admitted')
            ->first();

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست بستری فعالی برای این بیمار یافت نشد'
            ], 404);
        }

        // بررسی اینکه آیا بیمار ترخیص شده است
        if ($admission->status !== 'discharged') {
            return response()->json([
                'success' => false,
                'message' => 'بیمار هنوز ترخیص نشده است. لطفاً ابتدا ترخیص را انجام دهید.'
            ], 400);
        }

        $admission->update([
            'completed_at' => now()
        ]);

        // به‌روزرسانی وضعیت مراجعه
        Registrations::where('reg_id', $regId)
            ->update(['visit_status' => 'Completed']);

        return response()->json([
            'success' => true,
            'message' => 'معالجه با موفقیت تکمیل شد',
            'data' => $admission
        ]);
    }

    /**
     * به‌روزرسانی اطلاعات فیس در درخواست
     */
    public function updateFeeInfo(Request $request, $id)
    {
        try {
            $admission = AdmissionRequest::find($id);
            
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'total_amount' => 'nullable|numeric|min:0',
                'paid_amount' => 'nullable|numeric|min:0',
                'payment_status' => 'nullable|in:pending,partial,paid',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $admission->update($request->only(['total_amount', 'paid_amount', 'payment_status']));

            return response()->json([
                'success' => true,
                'message' => 'اطلاعات فیس با موفقیت به‌روزرسانی شد',
                'data' => $admission
            ]);

        } catch (\Exception $e) {
            Log::error('Error in updateFeeInfo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی اطلاعات فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}