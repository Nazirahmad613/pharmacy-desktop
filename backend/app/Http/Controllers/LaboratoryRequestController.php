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
            $query = LaboratoryRequest::with(['patient', 'doctor', 'fee', 'registration']);

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
     * دریافت درخواست‌های لابراتوار یک مراجعه با جزئیات کامل
     * ✅ این متد برای فرانت‌اند استفاده می‌شود
     */
    public function getByRegistrationFull($registrationId)
    {
        try {
            Log::info('🔬 getByRegistrationFull called for registration: ' . $registrationId);
            
            // ✅ دریافت اطلاعات مراجعه با reg_id
            $registration = Registrations::with(['patient', 'department', 'doctor'])
                ->where('reg_id', $registrationId)
                ->first();
            
            if (!$registration) {
                Log::error('Registration not found with reg_id: ' . $registrationId);
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            Log::info('Registration found with reg_id: ' . $registration->reg_id);

            // ✅ دریافت درخواست‌های این مراجعه با reg_id
            $currentTests = LaboratoryRequest::where('registration_id', $registration->reg_id)
                ->with(['patient', 'doctor', 'fee'])
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Found ' . $currentTests->count() . ' tests for registration_id: ' . $registration->reg_id);

            // دریافت تمام درخواست‌های قبلی این مریض (تاریخچه)
            $historyTests = LaboratoryRequest::where('patient_id', $registration->patient_id)
                ->where('registration_id', '!=', $registration->reg_id)
                ->with(['patient', 'doctor', 'fee', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            // فرمت کردن اطلاعات برای فرانت‌اند
            $formattedCurrent = $currentTests->map(function($test) {
                return $this->formatForFrontend($test);
            });

            $formattedHistory = $historyTests->map(function($test) {
                return $this->formatForFrontend($test);
            });

            // اطلاعات کامل مریض
            $patient = $registration->patient;
            $patientInfo = $patient ? [
                'id' => $patient->id,
                'first_name' => $patient->first_name,
                'last_name' => $patient->last_name,
                'father_name' => $patient->father_name,
                'mobile' => $patient->mobile,
                'national_id' => $patient->national_id,
                'gender' => $patient->gender,
                'age' => $patient->age,
                'blood_group' => $patient->blood_group,
                'address' => $patient->address,
            ] : null;

            Log::info('✅ Found ' . $currentTests->count() . ' current tests and ' . $historyTests->count() . ' history tests');

            // پاسخ با ساختار مورد انتظار فرانت‌اند
            return response()->json([
                'success' => true,
                'data' => [
                    'registration' => [
                        'id' => $registration->id,
                        'reg_id' => $registration->reg_id,
                        'visit_number' => $registration->visit_number,
                        'visit_date' => $registration->visit_date,
                        'visit_status' => $registration->visit_status,
                        'visit_type' => $registration->visit_type,
                        'department' => $registration->department ? [
                            'id' => $registration->department->id,
                            'name' => $registration->department->name,
                        ] : null,
                        'doctor' => $registration->doctor ? [
                            'id' => $registration->doctor->id,
                            'name' => $registration->doctor->name,
                        ] : null,
                    ],
                    'patient' => $patientInfo,
                    'tests' => $formattedCurrent,
                    'all_tests' => $formattedCurrent,
                    'history_tests' => $formattedHistory,
                    'has_tests' => $currentTests->count() > 0,
                    'has_history' => $historyTests->count() > 0,
                    'total_tests' => $currentTests->count(),
                    'total_history' => $historyTests->count(),
                    'can_edit' => true,
                    'can_delete' => true,
                    'can_print' => true,
                    'barcode' => $currentTests->first()?->barcode ?? null,
                ],
                'message' => 'درخواست‌های لابراتوار مراجعه با جزئیات کامل'
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Error in getByRegistrationFull: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت درخواست‌های لابراتوار یک مراجعه خاص
     */
    public function getByRegistration($registrationId)
    {
        try {
            // ✅ دریافت با reg_id
            $registration = Registrations::with(['patient'])
                ->where('reg_id', $registrationId)
                ->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            // ✅ استفاده از reg_id
            $tests = LaboratoryRequest::where('registration_id', $registration->reg_id)
                ->with(['fee', 'doctor'])
                ->orderBy('created_at', 'desc')
                ->get();

            $testsWithFee = $tests->map(function($test) {
                return $this->formatForFrontend($test);
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
        Log::info('=== START LaboratoryRequest Store ===');
        Log::info('Registration ID (reg_id): ' . $registrationId);
        Log::info('Request Data: ' . json_encode($request->all()));
        
        try {
            // ✅ دریافت با reg_id
            $registration = Registrations::with(['patient'])
                ->where('reg_id', $registrationId)
                ->first();
            
            if (!$registration) {
                Log::error('Registration not found with reg_id: ' . $registrationId);
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            Log::info('Registration found with reg_id: ' . $registration->reg_id);

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

            DB::beginTransaction();

            // ✅ ذخیره با reg_id (چون foreign key به reg_id اشاره میکنه)
            $laboratoryRequest = LaboratoryRequest::create([
                'registration_id' => $registration->reg_id,  // ← این reg_id هست (string)
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

            DB::commit();

            Log::info('Laboratory request saved with ID: ' . $laboratoryRequest->id);
            Log::info('Saved with registration_id: ' . $laboratoryRequest->registration_id);

            // ✅ دریافت درخواست‌های جاری این مراجعه با reg_id
            $currentTests = LaboratoryRequest::where('registration_id', $registration->reg_id)
                ->with(['doctor', 'fee'])
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('Current tests count after store: ' . $currentTests->count());

            // دریافت تمام درخواست‌های قبلی این مریض (تاریخچه)
            $historyTests = LaboratoryRequest::where('patient_id', $registration->patient_id)
                ->where('registration_id', '!=', $registration->reg_id)
                ->with(['doctor', 'fee', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedCurrent = $currentTests->map(function($test) {
                return $this->formatForFrontend($test);
            });

            $formattedHistory = $historyTests->map(function($test) {
                return $this->formatForFrontend($test);
            });

            Log::info('=== END LaboratoryRequest Store SUCCESS ===');

            return response()->json([
                'success' => true,
                'data' => [
                    'laboratory_request' => $this->formatForFrontend($laboratoryRequest),
                    'tests' => $formattedCurrent,
                    'all_tests' => $formattedCurrent,
                    'history_tests' => $formattedHistory,
                    'has_tests' => $currentTests->count() > 0,
                    'has_history' => $historyTests->count() > 0,
                    'total_tests' => $currentTests->count(),
                    'total_history' => $historyTests->count(),
                    'barcode' => $barcode,
                    'patient_info' => [
                        'id' => $registration->patient->id ?? null,
                        'first_name' => $registration->patient->first_name ?? null,
                        'last_name' => $registration->patient->last_name ?? null,
                        'mobile' => $registration->patient->mobile ?? null,
                        'national_id' => $registration->patient->national_id ?? null,
                        'gender' => $registration->patient->gender ?? null,
                        'age' => $registration->patient->age ?? null,
                        'blood_group' => $registration->patient->blood_group ?? null,
                    ]
                ],
                'message' => 'درخواست لابراتوار با موفقیت ثبت شد'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
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
            $laboratoryRequest = LaboratoryRequest::with(['patient', 'doctor', 'fee', 'registration'])
                ->find($id);
            
            if (!$laboratoryRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست لابراتوار یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $this->formatForFrontend($laboratoryRequest)
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
            $laboratoryRequest = LaboratoryRequest::with(['patient', 'registration'])->find($id);
            
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

            $laboratoryRequest->fresh();

            // ✅ دریافت لیست بروز شده با registration_id (که همان reg_id هست)
            $currentTests = LaboratoryRequest::where('registration_id', $laboratoryRequest->registration_id)
                ->with(['doctor', 'fee'])
                ->orderBy('created_at', 'desc')
                ->get();

            $historyTests = LaboratoryRequest::where('patient_id', $laboratoryRequest->patient_id)
                ->where('registration_id', '!=', $laboratoryRequest->registration_id)
                ->with(['doctor', 'fee', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'laboratory_request' => $this->formatForFrontend($laboratoryRequest),
                    'tests' => $currentTests->map(function($test) {
                        return $this->formatForFrontend($test);
                    }),
                    'all_tests' => $currentTests->map(function($test) {
                        return $this->formatForFrontend($test);
                    }),
                    'history_tests' => $historyTests->map(function($test) {
                        return $this->formatForFrontend($test);
                    }),
                    'has_tests' => $currentTests->count() > 0,
                    'has_history' => $historyTests->count() > 0,
                    'total_tests' => $currentTests->count(),
                    'total_history' => $historyTests->count(),
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
            $laboratoryRequest = LaboratoryRequest::with(['patient', 'registration'])->find($id);
            
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
            $patientId = $laboratoryRequest->patient_id;
            
            $laboratoryRequest->delete();

            // ✅ دریافت لیست بروز شده
            $currentTests = LaboratoryRequest::where('registration_id', $registrationId)
                ->with(['doctor', 'fee'])
                ->orderBy('created_at', 'desc')
                ->get();

            $historyTests = LaboratoryRequest::where('patient_id', $patientId)
                ->where('registration_id', '!=', $registrationId)
                ->with(['doctor', 'fee', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $currentTests->map(function($test) {
                    return $this->formatForFrontend($test);
                }),
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
     * چاپ درخواست لابراتوار
     */
    public function print($id)
    {
        try {
            $laboratoryRequest = LaboratoryRequest::with(['patient', 'doctor', 'fee', 'registration'])
                ->find($id);
            
            if (!$laboratoryRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست لابراتوار یافت نشد'
                ], 404);
            }

            $printData = [
                'laboratory_request' => $this->formatForFrontend($laboratoryRequest),
                'patient' => $laboratoryRequest->patient,
                'doctor' => $laboratoryRequest->doctor,
                'registration' => $laboratoryRequest->registration,
                'fee' => $laboratoryRequest->fee,
                'print_date' => Carbon::now()->format('Y-m-d H:i:s'),
                'barcode_url' => route('barcode.generate', ['barcode' => $laboratoryRequest->barcode]),
            ];

            return response()->json([
                'success' => true,
                'data' => $printData,
                'message' => 'اطلاعات برای چاپ آماده شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in print: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در آماده‌سازی چاپ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تاریخچه کامل یک مریض
     */
    public function getPatientHistory($patientId)
    {
        try {
            $patient = Patient::find($patientId);
            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض یافت نشد'
                ], 404);
            }

            $tests = LaboratoryRequest::where('patient_id', $patientId)
                ->with(['doctor', 'fee', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedTests = $tests->map(function($test) {
                return $this->formatForFrontend($test);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'patient' => $patient,
                    'tests' => $formattedTests,
                    'total' => $tests->count(),
                    'stats' => [
                        'pending' => $tests->where('status', 'pending')->count(),
                        'completed' => $tests->where('status', 'completed')->count(),
                        'in_progress' => $tests->where('status', 'in_progress')->count(),
                        'cancelled' => $tests->where('status', 'cancelled')->count(),
                    ]
                ],
                'message' => 'تاریخچه درخواست‌های لابراتوار مریض'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getPatientHistory: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه: ' . $e->getMessage()
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
                'data' => $this->formatForFrontend($laboratoryRequest->fresh()),
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

            return response()->json([
                'success' => true,
                'data' => $this->formatForFrontend($laboratoryRequest->fresh()),
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
     * فرمت کردن یک درخواست لابراتوار برای فرانت‌اند
     */
    private function formatForFrontend($test)
    {
        if (!$test) return null;

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
            'status_badge_color' => $this->getStatusBadgeColor($test->status),
            'barcode' => $test->barcode,
            'fee_id' => $test->fee_id,
            'has_fee' => $test->fee_id !== null,
            'results' => $test->results,
            'result_date' => $test->result_date,
            'result_file_path' => $test->result_file_path,
            'created_at' => $test->created_at,
            'updated_at' => $test->updated_at,
            'doctor' => $test->doctor ? [
                'id' => $test->doctor->id,
                'name' => $test->doctor->name ?? $test->doctor->full_name ?? null,
            ] : null,
            'fee' => $test->fee ? [
                'id' => $test->fee->id,
                'amount' => $test->fee->amount,
                'status' => $test->fee->status,
            ] : null,
            'registration' => $test->registration ? [
                'id' => $test->registration->id,
                'reg_id' => $test->registration->reg_id,
                'visit_number' => $test->registration->visit_number,
            ] : null,
            'patient' => $test->patient ? [
                'id' => $test->patient->id,
                'first_name' => $test->patient->first_name,
                'last_name' => $test->patient->last_name,
                'national_id' => $test->patient->national_id,
                'mobile' => $test->patient->mobile,
                'gender' => $test->patient->gender,
                'age' => $test->patient->age,
                'blood_group' => $test->patient->blood_group,
            ] : null,
            'can_edit' => !in_array($test->status, ['completed', 'cancelled', 'sent_to_lab']),
            'can_delete' => !in_array($test->status, ['completed', 'in_progress', 'sample_taken', 'sent_to_lab']) && !$test->fee_id,
            'can_print' => true,
            'can_send_to_lab' => $test->status === 'pending' && $test->fee_id !== null,
        ];
    }

    /**
     * دریافت رنگ وضعیت
     */
    private function getStatusBadgeColor($status)
    {
        $colors = [
            'pending' => 'warning',
            'sample_taken' => 'info',
            'in_progress' => 'primary',
            'sent_to_lab' => 'secondary',
            'completed' => 'success',
            'cancelled' => 'danger',
            'rejected' => 'dark',
        ];
        
        return $colors[$status] ?? 'secondary';
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