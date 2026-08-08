<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LaboratoryRequest;
use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LaboratoryRequestController extends Controller
{
    /**
     * دریافت لیست درخواست‌های لابراتوار
     */
    public function index(Request $request)
    {
        try {
            $query = LaboratoryRequest::with(['patient', 'doctor', 'fee']);

            if ($request->has('registration_id')) {
                $query->where('registration_id', $request->registration_id);
            }

            if ($request->has('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('from_date')) {
                $query->whereDate('request_date', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('request_date', '<=', $request->to_date);
            }

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

        } catch (\Exception $e) {
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت درخواست‌های لابراتوار یک مراجعه خاص
     */
    public function getByRegistration($registrationId)
    {
        try {
            $registration = Registrations::find($registrationId);
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $tests = LaboratoryRequest::where('registration_id', $registrationId)
                ->with(['fee'])
                ->orderBy('created_at', 'desc')
                ->get();

            $testsWithFee = $tests->map(function($test) {
                return [
                    'id' => $test->id,
                    'registration_id' => $test->registration_id,
                    'patient_id' => $test->patient_id,
                    'doctor_id' => $test->doctor_id,
                    'test_type' => $test->test_type,
                    'test_type_label' => $test->test_type_label,
                    'test_name' => $test->test_name,
                    'test_description' => $test->test_description,
                    'clinical_indication' => $test->clinical_indication,
                    'special_notes' => $test->special_notes,
                    'request_date' => $test->request_date,
                    'sample_collection_date' => $test->sample_collection_date,
                    'status' => $test->status,
                    'status_label' => $test->status_label,
                    'barcode' => $test->barcode,
                    'fee_id' => $test->fee_id,
                    'has_fee' => $test->fee_id !== null,
                    'created_at' => $test->created_at,
                    'updated_at' => $test->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'registration' => $registration,
                    'tests' => $testsWithFee,
                    'has_tests' => $tests->count() > 0,
                    'total_tests' => $tests->count()
                ],
                'message' => 'درخواست‌های لابراتوار مراجعه'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getByRegistration: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ایجاد درخواست جدید لابراتوار
     */
    public function store(Request $request, $registrationId)
    {
        // لاگ برای دیباگ

    dd('LABORATORY STORE REACHED', $registrationId, $request->all());

    Log::info('=== START LaboratoryRequest Store ===');
        dd('LABORATORY STORE REACHED', $registrationId, $request->all());
        Log::info('=== START LaboratoryRequest Store ===');
        Log::info('Registration ID: ' . $registrationId);
        Log::info('Request Data: ' . json_encode($request->all()));
        Log::info('User ID: ' . (auth()->id() ?? 'null'));

        try {
            $registration = Registrations::find($registrationId);
            if (!$registration) {
                Log::error('Registration not found: ' . $registrationId);
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            Log::info('Registration found: ' . $registration->id);

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
                Log::error('Validation failed: ' . json_encode($validator->errors()));
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            $barcode = $this->generateBarcode();
            Log::info('Generated barcode: ' . $barcode);

            $doctorId = auth()->id();
            if (!$doctorId) {
                Log::warning('User not authenticated, using default doctor_id: 1');
                $doctorId = 1;
            }

            // ایجاد رکورد جدید
            $laboratoryRequest = LaboratoryRequest::create([
                'registration_id' => $registration->id,
                'patient_id' => $registration->patient_id,
                'doctor_id' => $doctorId,
                'test_type' => $request->test_type,
                'test_name' => $request->test_name,
                'test_description' => $request->test_description,
                'clinical_indication' => $request->clinical_indication,
                'special_notes' => $request->special_notes,
                'request_date' => $request->request_date ?? Carbon::now()->toDateString(),
                'sample_collection_date' => $request->sample_collection_date,
                'status' => 'pending',
                'barcode' => $barcode,
                'fee_id' => null,
            ]);

            if (!$laboratoryRequest || !$laboratoryRequest->id) {
                throw new \Exception('رکورد در دیتابیس ذخیره نشد');
            }

            Log::info('Laboratory request saved with ID: ' . $laboratoryRequest->id);

            $laboratoryRequest->load(['patient', 'doctor']);

            $allTests = LaboratoryRequest::where('registration_id', $registrationId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($test) {
                    return [
                        'id' => $test->id,
                        'test_type' => $test->test_type,
                        'test_type_label' => $test->test_type_label,
                        'test_name' => $test->test_name,
                        'test_description' => $test->test_description,
                        'clinical_indication' => $test->clinical_indication,
                        'special_notes' => $test->special_notes,
                        'request_date' => $test->request_date,
                        'sample_collection_date' => $test->sample_collection_date,
                        'status' => $test->status,
                        'barcode' => $test->barcode,
                        'fee_id' => $test->fee_id,
                        'has_fee' => $test->fee_id !== null,
                        'created_at' => $test->created_at,
                    ];
                });

            Log::info('=== END LaboratoryRequest Store SUCCESS ===');

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

        } catch (\Exception $e) {
            Log::error('=== ERROR in LaboratoryRequest store ===');
            Log::error('Error message: ' . $e->getMessage());
            Log::error('Error trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'خطا در ذخیره‌سازی: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش یک درخواست خاص
     */
    public function show($id)
    {
        try {
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

        } catch (\Exception $e) {
            Log::error('Error in show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ویرایش درخواست لابراتوار
     */
    public function update(Request $request, $id)
    {
        try {
            $laboratoryRequest = LaboratoryRequest::find($id);
            
            if (!$laboratoryRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست لابراتوار یافت نشد'
                ], 404);
            }

            if (in_array($laboratoryRequest->status, ['completed', 'cancelled', 'sent_to_lab'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست تکمیل، لغو یا ارسال شده قابل ویرایش نیست'
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
                'fee_id' => 'nullable|exists:laboratory_fees,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            $laboratoryRequest->update($request->all());

            if ($request->has('status') && $request->status === 'completed' && !$request->has('result_date')) {
                $laboratoryRequest->update(['result_date' => Carbon::now()->toDateString()]);
            }

            $laboratoryRequest->load(['patient', 'doctor']);

            $allTests = LaboratoryRequest::where('registration_id', $laboratoryRequest->registration_id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($test) {
                    return [
                        'id' => $test->id,
                        'test_type' => $test->test_type,
                        'test_type_label' => $test->test_type_label,
                        'test_name' => $test->test_name,
                        'test_description' => $test->test_description,
                        'clinical_indication' => $test->clinical_indication,
                        'special_notes' => $test->special_notes,
                        'request_date' => $test->request_date,
                        'sample_collection_date' => $test->sample_collection_date,
                        'status' => $test->status,
                        'barcode' => $test->barcode,
                        'fee_id' => $test->fee_id,
                        'has_fee' => $test->fee_id !== null,
                        'created_at' => $test->created_at,
                    ];
                });

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

        } catch (\Exception $e) {
            Log::error('Error in update: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ویرایش: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف درخواست لابراتوار
     */
    public function destroy($id)
    {
        try {
            $laboratoryRequest = LaboratoryRequest::find($id);
            
            if (!$laboratoryRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست لابراتوار یافت نشد'
                ], 404);
            }

            if (in_array($laboratoryRequest->status, ['completed', 'in_progress', 'sample_taken', 'sent_to_lab'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست در حال انجام، نمونه گرفته شده، ارسال به لابراتوار یا تکمیل شده قابل حذف نیست'
                ], 400);
            }

            if ($laboratoryRequest->fee_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست دارای فیس ثبت شده است، ابتدا فیس را حذف کنید'
                ], 400);
            }

            $registrationId = $laboratoryRequest->registration_id;
            $laboratoryRequest->delete();

            $remainingTests = LaboratoryRequest::where('registration_id', $registrationId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($test) {
                    return [
                        'id' => $test->id,
                        'test_type' => $test->test_type,
                        'test_type_label' => $test->test_type_label,
                        'test_name' => $test->test_name,
                        'test_description' => $test->test_description,
                        'clinical_indication' => $test->clinical_indication,
                        'special_notes' => $test->special_notes,
                        'request_date' => $test->request_date,
                        'sample_collection_date' => $test->sample_collection_date,
                        'status' => $test->status,
                        'barcode' => $test->barcode,
                        'fee_id' => $test->fee_id,
                        'has_fee' => $test->fee_id !== null,
                        'created_at' => $test->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $remainingTests,
                'message' => 'درخواست لابراتوار با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in destroy: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * آپلود نتیجه آزمایش
     */
    public function uploadResult(Request $request, $id)
    {
        try {
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

        } catch (\Exception $e) {
            Log::error('Error in uploadResult: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در آپلود: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ارسال به لابراتوار
     */
    public function sendToLab(Request $request, $id)
    {
        try {
            $laboratoryRequest = LaboratoryRequest::find($id);
            
            if (!$laboratoryRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست لابراتوار یافت نشد'
                ], 404);
            }

            if (!$laboratoryRequest->fee_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'ابتدا باید فیس این درخواست ثبت شود'
                ], 400);
            }

            if ($laboratoryRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست قبلاً ارسال شده است'
                ], 400);
            }

            $laboratoryRequest->update([
                'status' => 'sent_to_lab',
                'sent_to_lab_at' => Carbon::now()
            ]);

            $laboratoryRequest->load(['patient', 'doctor', 'fee']);

            return response()->json([
                'success' => true,
                'data' => $laboratoryRequest,
                'message' => 'درخواست با موفقیت به لابراتوار ارسال شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in sendToLab: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ارسال: ' . $e->getMessage()
            ], 500);
        }
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

        while (LaboratoryRequest::where('barcode', $barcode)->exists()) {
            $random = Str::random(6);
            $barcode = $prefix . $date . $random;
        }

        return $barcode;
    }
}