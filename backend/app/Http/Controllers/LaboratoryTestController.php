<?php

namespace App\Http\Controllers;

use App\Models\LaboratoryTest;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LaboratoryController extends Controller
{
    /**
     * ذخیره درخواست لابراتوار
     */
    public function store(Request $request)
    {
        $registrationId = $request->registration_id ?? $request->route('registrationId');
        
        if (!$registrationId) {
            return response()->json([
                'success' => false,
                'message' => 'شناسه ثبت مریض الزامی است'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'test_type' => 'required|string|in:blood,urine,stool,biochemistry,hormonal,microbial,pathology,genetic,imaging,other',
            'test_name' => 'nullable|string|max:255',
            'test_description' => 'nullable|string',
            'clinical_indication' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'request_date' => 'nullable|date',
            'sample_collection_date' => 'nullable|date',
            'test_parameters' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $registration = Registrations::with(['patient'])->where('reg_id', $registrationId)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            $laboratoryTest = LaboratoryTest::create([
                'registration_id' => $registrationId,
                'patient_id' => $registration->patient_id,
                'doctor_id' => Auth::id(),
                'user_id' => Auth::id(),
                'test_type' => $request->test_type,
                'test_name' => $request->test_name,
                'test_description' => $request->test_description,
                'clinical_indication' => $request->clinical_indication,
                'special_notes' => $request->special_notes,
                'request_date' => $request->request_date ?? now(),
                'sample_collection_date' => $request->sample_collection_date,
                'status' => 'pending',
                'test_parameters' => $request->test_parameters,
            ]);

            // بروزرسانی وضعیت مراجعه به 'Lab'
            $registration->update([
                'visit_status' => 'Lab'
            ]);

            DB::commit();

            // دریافت تمام تست‌های لابراتوار این مریض
            $allTests = LaboratoryTest::with(['doctor', 'patient'])
                ->where('patient_id', $registration->patient_id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'درخواست لابراتوار با موفقیت ثبت شد',
                'data' => [
                    'test' => $laboratoryTest->load(['doctor', 'patient']),
                    'all_tests' => $allTests,
                    'is_lab_requested' => true
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست لابراتوار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تست‌های لابراتوار یک مریض
     */
    public function show($registrationId)
    {
        try {
            $tests = LaboratoryTest::with(['doctor', 'patient'])
                ->where('registration_id', $registrationId)
                ->orderBy('created_at', 'desc')
                ->get();

            $registration = Registrations::with(['patient'])->where('reg_id', $registrationId)->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'tests' => $tests,
                    'registration' => $registration,
                    'has_tests' => $tests->count() > 0
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی تست لابراتوار (ویرایش)
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'test_type' => 'nullable|string|in:blood,urine,stool,biochemistry,hormonal,microbial,pathology,genetic,imaging,other',
            'test_name' => 'nullable|string|max:255',
            'test_description' => 'nullable|string',
            'clinical_indication' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'sample_collection_date' => 'nullable|date',
            'status' => 'nullable|string|in:pending,sample_taken,in_progress,completed,cancelled,rejected',
            'result_summary' => 'nullable|string',
            'result_details' => 'nullable|string',
            'interpretation' => 'nullable|string',
            'doctor_comment' => 'nullable|string',
            'result_values' => 'nullable|array',
            'test_date' => 'nullable|date',
            'result_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $laboratoryTest = LaboratoryTest::find($id);
            
            if (!$laboratoryTest) {
                return response()->json([
                    'success' => false,
                    'message' => 'تست لابراتوار پیدا نشد'
                ], 404);
            }

            $laboratoryTest->update($request->all());

            // اگر تست کامل شد، وضعیت مراجعه را به 'Doctor' برگردان
            if ($request->status === 'completed') {
                $registration = Registrations::where('reg_id', $laboratoryTest->registration_id)->first();
                if ($registration) {
                    $registration->update(['visit_status' => 'Doctor']);
                }
            }

            // دریافت تمام تست‌های این مریض
            $allTests = LaboratoryTest::with(['doctor', 'patient'])
                ->where('patient_id', $laboratoryTest->patient_id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'تست لابراتوار با موفقیت بروزرسانی شد',
                'data' => [
                    'test' => $laboratoryTest->fresh(['doctor', 'patient']),
                    'all_tests' => $allTests
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف تست لابراتوار
     */
    public function destroy($id)
    {
        try {
            $laboratoryTest = LaboratoryTest::find($id);
            
            if (!$laboratoryTest) {
                return response()->json([
                    'success' => false,
                    'message' => 'تست لابراتوار پیدا نشد'
                ], 404);
            }

            DB::beginTransaction();

            $laboratoryTest->delete();

            // دریافت تست‌های باقی‌مانده
            $allTests = LaboratoryTest::with(['doctor', 'patient'])
                ->where('patient_id', $laboratoryTest->patient_id)
                ->orderBy('created_at', 'desc')
                ->get();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تست لابراتوار با موفقیت حذف شد',
                'data' => $allTests
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست تست‌های لابراتوار برای یک مریض (با patientId)
     */
    public function getPatientTests($patientId)
    {
        try {
            $tests = LaboratoryTest::with(['doctor', 'patient'])
                ->where('patient_id', $patientId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $tests
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار تست‌های لابراتوار
     */
    public function getStatistics()
    {
        try {
            $userId = Auth::id();

            $stats = [
                'total' => LaboratoryTest::where('user_id', $userId)->count(),
                'pending' => LaboratoryTest::where('user_id', $userId)->where('status', 'pending')->count(),
                'in_progress' => LaboratoryTest::where('user_id', $userId)->where('status', 'in_progress')->count(),
                'completed' => LaboratoryTest::where('user_id', $userId)->where('status', 'completed')->count(),
                'today' => LaboratoryTest::where('user_id', $userId)
                    ->whereDate('created_at', today())
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار: ' . $e->getMessage()
            ], 500);
        }
    }
}