<?php

namespace App\Http\Controllers;

use App\Models\AdmissionRequest;
use App\Models\Patient;
use App\Models\Ward;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdmissionRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmissionRequest::with(['patient', 'ward', 'bed', 'doctor', 'fees']);

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
            $query->whereDate('admission_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('admission_date', '<=', $request->to_date);
        }

        $admissions = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $admissions
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'ward_id' => 'required|exists:wards,id',
            'bed_id' => 'required|exists:beds,id',
            'doctor_id' => 'required|exists:users,id',
            'admission_date' => 'required|date',
            'expected_discharge_date' => 'nullable|date|after:admission_date',
            'diagnosis' => 'required|string|max:500',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // بررسی در دسترس بودن تخت
            $bed = Bed::find($request->bed_id);
            if ($bed->status !== 'available') {
                return response()->json([
                    'success' => false,
                    'message' => 'تخت مورد نظر در دسترس نمی‌باشد'
                ], 400);
            }

            // ایجاد درخواست بستری
            $admission = AdmissionRequest::create([
                'patient_id' => $request->patient_id,
                'ward_id' => $request->ward_id,
                'bed_id' => $request->bed_id,
                'doctor_id' => $request->doctor_id,
                'admission_date' => $request->admission_date,
                'expected_discharge_date' => $request->expected_discharge_date,
                'diagnosis' => $request->diagnosis,
                'notes' => $request->notes,
                'status' => 'admitted',
                'payment_status' => 'pending',
                'total_amount' => 0,
                'paid_amount' => 0
            ]);

            // آپدیت وضعیت تخت
            $bed->update(['status' => 'occupied']);

            // آپدیت تعداد تخت‌های موجود در بخش
            $ward = Ward::find($request->ward_id);
            $ward->decrement('available_beds');

            DB::commit();

            // بارگذاری روابط
            $admission->load(['patient', 'ward', 'bed', 'doctor']);

            return response()->json([
                'success' => true,
                'message' => 'بیمار با موفقیت بستری شد',
                'data' => $admission
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در بستری بیمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $admission = AdmissionRequest::with(['patient', 'ward', 'bed', 'doctor', 'fees.collector'])
            ->find($id);

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
            'bed_id' => 'sometimes|exists:beds,id',
            'doctor_id' => 'sometimes|exists:users,id',
            'expected_discharge_date' => 'nullable|date|after:admission_date',
            'diagnosis' => 'sometimes|string|max:500',
            'notes' => 'nullable|string',
            'total_amount' => 'sometimes|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // اگر تخت تغییر کرد
            if ($request->has('bed_id') && $request->bed_id != $admission->bed_id) {
                // آزاد کردن تخت قبلی
                Bed::find($admission->bed_id)->update(['status' => 'available']);
                
                // رزرو تخت جدید
                $newBed = Bed::find($request->bed_id);
                if ($newBed->status !== 'available') {
                    return response()->json([
                        'success' => false,
                        'message' => 'تخت جدید در دسترس نمی‌باشد'
                    ], 400);
                }
                $newBed->update(['status' => 'occupied']);
            }

            // اگر بخش تغییر کرد
            if ($request->has('ward_id') && $request->ward_id != $admission->ward_id) {
                Ward::find($admission->ward_id)->increment('available_beds');
                Ward::find($request->ward_id)->decrement('available_beds');
            }

            $admission->update($request->only([
                'ward_id', 'bed_id', 'doctor_id', 'expected_discharge_date',
                'diagnosis', 'notes', 'total_amount'
            ]));

            DB::commit();

            $admission->load(['patient', 'ward', 'bed', 'doctor']);

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
                'status' => 'discharged'
            ]);

            // آزاد کردن تخت
            Bed::find($admission->bed_id)->update(['status' => 'available']);
            
            // افزایش تخت‌های موجود در بخش
            Ward::find($admission->ward_id)->increment('available_beds');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'بیمار با موفقیت ترخیص شد'
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
                Bed::find($admission->bed_id)->update(['status' => 'available']);
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

    // دریافت لیست بیماران بستری
    public function getActiveAdmissions()
    {
        $admissions = AdmissionRequest::with(['patient', 'ward', 'bed', 'doctor'])
            ->where('status', 'admitted')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $admissions
        ]);
    }

    // دریافت آمار بستری
    public function getStatistics()
    {
        $statistics = [
            'total_admissions' => AdmissionRequest::count(),
            'active_admissions' => AdmissionRequest::where('status', 'admitted')->count(),
            'pending_admissions' => AdmissionRequest::where('status', 'pending')->count(),
            'discharged_today' => AdmissionRequest::whereDate('updated_at', today())
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
}