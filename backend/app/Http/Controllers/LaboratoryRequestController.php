<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaboratoryRequest;
use App\Models\Registration;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LaboratoryRequestController extends Controller
{
    /**
     * دریافت لیست درخواست‌های لابراتوار
     */
    public function index(Request $request)
    {
        $query = LaboratoryRequest::with(['patient', 'doctor', 'fee']);

        // فیلتر بر اساس مراجعه
        if ($request->has('registration_id')) {
            $query->where('registration_id', $request->registration_id);
        }

        // فیلتر بر اساس مریض
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        // فیلتر بر اساس وضعیت
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // فیلتر بر اساس تاریخ
        if ($request->has('from_date')) {
            $query->whereDate('request_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('request_date', '<=', $request->to_date);
        }

        // جستجو
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('test_name', 'LIKE', "%{$search}%")
                  ->orWhere('test_type', 'LIKE', "%{$search}%")
                  ->orWhere('barcode', 'LIKE', "%{$search}%")
                  ->orWhereHas('patient', function ($p) use ($search) {
                      $p->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%");
                  });
            });
        }

        $perPage = $request->per_page ?? 15;
        $requests = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $requests,
            'message' => 'لیست درخواست‌های لابراتوار'
        ]);
    }

    /**
     * دریافت درخواست‌های لابراتوار یک مراجعه خاص
     */
    public function getByRegistration($registrationId)
    {
        $registration = Registration::find($registrationId);
        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $tests = LaboratoryRequest::where('registration_id', $registrationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'registration' => $registration,
                'tests' => $tests,
                'has_tests' => $tests->count() > 0,
                'total_tests' => $tests->count()
            ],
            'message' => 'درخواست‌های لابراتوار مراجعه'
        ]);
    }

    /**
     * ایجاد درخواست جدید لابراتوار
     */
    public function store(Request $request, $registrationId)
    {
        $registration = Registration::find($registrationId);
        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'test_type' => 'required|string|in:blood,urine,stool,biochemistry,hormonal,microbial,pathology,genetic,imaging,other',
            'test_name' => 'nullable|string|max:255',
            'test_description' => 'nullable|string',
            'clinical_indication' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'request_date' => 'nullable|date',
            'sample_collection_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        // تولید بارکد یکتا
        $barcode = $this->generateBarcode();

        $laboratoryRequest = LaboratoryRequest::create([
            'registration_id' => $registration->id,
            'patient_id' => $registration->patient_id,
            'doctor_id' => auth()->id(),
            'test_type' => $request->test_type,
            'test_name' => $request->test_name,
            'test_description' => $request->test_description,
            'clinical_indication' => $request->clinical_indication,
            'special_notes' => $request->special_notes,
            'request_date' => $request->request_date ?? Carbon::now()->toDateString(),
            'sample_collection_date' => $request->sample_collection_date,
            'status' => 'pending',
            'barcode' => $barcode,
        ]);

        // بارگذاری روابط
        $laboratoryRequest->load(['patient', 'doctor']);

        // دریافت همه تست‌های این مراجعه
        $allTests = LaboratoryRequest::where('registration_id', $registrationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'laboratory_request' => $laboratoryRequest,
                'all_tests' => $allTests,
                'has_tests' => $allTests->count() > 0,
                'total_tests' => $allTests->count()
            ],
            'message' => 'درخواست لابراتوار با موفقیت ثبت شد'
        ], 201);
    }

    /**
     * نمایش یک درخواست خاص
     */
    public function show($id)
    {
        $laboratoryRequest = LaboratoryRequest::with(['patient', 'doctor', 'fee'])->find($id);
        
        if (!$laboratoryRequest) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست لابراتوار یافت نشد'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $laboratoryRequest
        ]);
    }

    /**
     * ویرایش درخواست لابراتوار
     */
    public function update(Request $request, $id)
    {
        $laboratoryRequest = LaboratoryRequest::find($id);
        
        if (!$laboratoryRequest) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست لابراتوار یافت نشد'
            ], 404);
        }

        // بررسی اینکه آیا درخواست قابل ویرایش است
        if (in_array($laboratoryRequest->status, ['completed', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست تکمیل یا لغو شده قابل ویرایش نیست'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'test_type' => 'sometimes|string|in:blood,urine,stool,biochemistry,hormonal,microbial,pathology,genetic,imaging,other',
            'test_name' => 'nullable|string|max:255',
            'test_description' => 'nullable|string',
            'clinical_indication' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'request_date' => 'nullable|date',
            'sample_collection_date' => 'nullable|date',
            'status' => 'sometimes|in:pending,sample_taken,in_progress,completed,cancelled,rejected',
            'results' => 'nullable|string',
            'result_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $laboratoryRequest->update($request->all());

        // اگر وضعیت به completed تغییر کرد و نتیجه وارد شد
        if ($request->has('status') && $request->status === 'completed' && !$request->has('result_date')) {
            $laboratoryRequest->update(['result_date' => Carbon::now()->toDateString()]);
        }

        $laboratoryRequest->load(['patient', 'doctor']);

        // دریافت همه تست‌های این مراجعه
        $allTests = LaboratoryRequest::where('registration_id', $laboratoryRequest->registration_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'laboratory_request' => $laboratoryRequest,
                'all_tests' => $allTests,
                'has_tests' => $allTests->count() > 0,
                'total_tests' => $allTests->count()
            ],
            'message' => 'درخواست لابراتوار با موفقیت ویرایش شد'
        ]);
    }

    /**
     * حذف درخواست لابراتوار
     */
    public function destroy($id)
    {
        $laboratoryRequest = LaboratoryRequest::find($id);
        
        if (!$laboratoryRequest) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست لابراتوار یافت نشد'
            ], 404);
        }

        // بررسی اینکه آیا درخواست قابل حذف است
        if (in_array($laboratoryRequest->status, ['completed', 'in_progress'])) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست در حال انجام یا تکمیل شده قابل حذف نیست'
            ], 400);
        }

        $registrationId = $laboratoryRequest->registration_id;
        $laboratoryRequest->delete();

        // دریافت تست‌های باقی‌مانده
        $remainingTests = LaboratoryRequest::where('registration_id', $registrationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $remainingTests,
            'message' => 'درخواست لابراتوار با موفقیت حذف شد'
        ]);
    }

    /**
     * آپلود نتیجه آزمایش
     */
    public function uploadResult(Request $request, $id)
    {
        $laboratoryRequest = LaboratoryRequest::find($id);
        
        if (!$laboratoryRequest) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست لابراتوار یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'result_file' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'results' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->hasFile('result_file')) {
            $file = $request->file('result_file');
            $fileName = time() . '_' . $laboratoryRequest->barcode . '.' . $file->getClientOriginalExtension();
            $filePath = $file->storeAs('laboratory_results', $fileName, 'public');
            
            $laboratoryRequest->update([
                'result_file_path' => $filePath,
                'results' => $request->results,
                'status' => 'completed',
                'result_date' => Carbon::now()->toDateString(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $laboratoryRequest,
            'message' => 'نتیجه آزمایش با موفقیت آپلود شد'
        ]);
    }

    /**
     * تولید بارکد یکتا
     */
    private function generateBarcode()
    {
        $prefix = 'LAB';
        $date = Carbon::now()->format('Ymd');
        $random = Str::random(6);
        $barcode = $prefix . $date . $random;

        // اطمینان از یکتا بودن
        while (LaboratoryRequest::where('barcode', $barcode)->exists()) {
            $random = Str::random(6);
            $barcode = $prefix . $date . $random;
        }

        return $barcode;
    }
}