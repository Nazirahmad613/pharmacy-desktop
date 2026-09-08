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

class AdmissionRequestController extends Controller
{
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
     * دریافت تمام درخواست‌های بستری (برای تب مدیریت فیس)
     */
    public function getAllRequests()
    {
        try {
            $allRequests = AdmissionRequest::with(['patient', 'ward', 'doctor', 'fees', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            // گروه‌بندی بر اساس reg_id
            $grouped = $allRequests->groupBy('reg_id')->map(function($group) {
                $first = $group->first();
                return [
                    'reg_id' => $first->reg_id,
                    'patient' => $first->patient,
                    'requests' => $group,
                    'total_requests' => $group->count(),
                    'has_fee' => $group->whereHas('fees')->count() > 0,
                    'latest_status' => $group->last()->status
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $allRequests,
                    'unpaid_requests' => $allRequests->filter(function($item) {
                        return $item->status === 'admitted' && $item->fees->where('status', 'pending')->count() > 0;
                    })->values(),
                    'paid_requests' => $allRequests->filter(function($item) {
                        return $item->status === 'admitted' && $item->fees->where('status', 'paid')->count() > 0;
                    })->values(),
                    'grouped_by_reg_id' => $grouped,
                    'total_requests' => $allRequests->count(),
                    'total_unpaid' => $allRequests->filter(function($item) {
                        return $item->status === 'admitted' && $item->fees->where('status', 'pending')->count() > 0;
                    })->count(),
                    'total_paid' => $allRequests->filter(function($item) {
                        return $item->status === 'admitted' && $item->fees->where('status', 'paid')->count() > 0;
                    })->count(),
                    'total_registrations' => $grouped->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ذخیره درخواست بستری جدید (از تب معالجه)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reg_id' => 'required|exists:registrations,reg_id',
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:users,id',
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

            // دریافت تشخیص از رجیستریشن
            $registration = Registrations::where('reg_id', $request->reg_id)->first();
            $diagnosis = $request->diagnosis ?? ($registration->initial_diagnosis ?? null);

            // کاهش تعداد تخت‌های موجود در بخش
            $ward = Ward::find($request->ward_id);
            if ($ward->available_beds <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'در این بخش تخت خالی وجود ندارد'
                ], 400);
            }
            $ward->decrement('available_beds');

            // ایجاد درخواست بستری
            $admission = AdmissionRequest::create([
                'reg_id' => $request->reg_id,
                'patient_id' => $request->patient_id,
                'doctor_id' => $request->doctor_id,
                'ward_id' => $request->ward_id,
                'admission_date' => $request->admission_date,
                'diagnosis' => $diagnosis,
                'admission_instructions' => $request->admission_instructions,
                'special_notes' => $request->special_notes,
                'status' => 'admitted',
                'priority' => $request->priority ?? 'normal'
            ]);

            // به‌روزرسانی وضعیت مراجعه
            if ($registration) {
                $registration->update(['visit_status' => 'Admitted']);
            }

            DB::commit();

            // بارگذاری روابط
            $admission->load(['patient', 'ward', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت ثبت شد',
                'data' => $admission
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست بستری',
                'error' => $e->getMessage()
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
            'doctor_id' => 'sometimes|exists:users,id',
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

            // اگر بخش تغییر کرد
            if ($request->has('ward_id') && $request->ward_id != $admission->ward_id) {
                Ward::find($admission->ward_id)->increment('available_beds');
                Ward::find($request->ward_id)->decrement('available_beds');
            }

            $admission->update($request->only([
                'ward_id', 
                'doctor_id', 
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
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی اطلاعات بستری',
                'error' => $e->getMessage()
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
}