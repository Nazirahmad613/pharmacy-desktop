<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\RadiologyResult;
use App\Models\RadiologyRequest;
use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RadiologyResultController extends Controller
{
    /**
     * ============================================================
     * دریافت تمام درخواست‌های رادیولوژی دارای فیس
     * ============================================================
     */
    public function getAllRequests(Request $request)
    {
        try {
            Log::info('📡 دریافت تمام درخواست‌های رادیولوژی دارای فیس');

            $query = RadiologyRequest::with([
                'patient',
                'registration', // ✅ registration رابطه با reg_id
                'doctor',
                'result'
            ]);

            // فقط درخواست‌هایی که فیس پرداخت شده دارند
            $query->where('has_fee', true);

            // ✅ فیلتر بر اساس reg_id (نه registration_id)
            if ($request->filled('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }

            // فیلتر بر اساس patient_id
            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            // فیلتر بر اساس doctor_id
            if ($request->filled('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            // فیلتر بر اساس وضعیت
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // فیلتر بر اساس نوع رادیولوژی
            if ($request->filled('radiology_type')) {
                $query->where('radiology_type', $request->radiology_type);
            }

            $requests = $query
                ->orderBy('created_at', 'desc')
                ->get();

            Log::info('✅ تعداد درخواست‌های دریافت شده: ' . $requests->count());

            $formattedRequests = $requests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            $stats = [
                'total' => $requests->count(),
                'pending' => $requests->where('status', 'pending')->count(),
                'in_progress' => $requests->where('status', 'in_progress')->count(),
                'completed' => $requests->where('status', 'completed')->count(),
                'sent_to_radiology' => $requests->where('status', 'sent_to_radiology')->count(),
                'with_result' => $requests->where('has_result', true)->count(),
                'without_result' => $requests->where('has_result', false)->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
                'statistics' => $stats,
                'count' => $requests->count(),
                'message' => 'درخواست‌های رادیولوژی دارای فیس با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت درخواست‌های رادیولوژی دارای فیس', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت کامل اطلاعات رادیولوژی یک مراجعه
     * ============================================================
     */
    public function getFullByRegistration($regId)
    {
        try {
            $radiologyRequests = RadiologyRequest::with([
                'patient',
                'registration.patient',
                'doctor',
                'result'
            ])
            ->where('reg_id', $regId) // ✅ استفاده از reg_id
            ->where('has_fee', true)
            ->orderBy('created_at', 'desc')
            ->get();

            // ✅ استفاده از Registrations با reg_id
            $registration = Registrations::with('patient')->where('reg_id', $regId)->first();

            $formattedRequests = $radiologyRequests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'all_radiology' => $formattedRequests,
                    'registration' => $registration,
                    'barcode' => $registration?->barcode,
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات رادیولوژی: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت درخواست‌های رادیولوژی یک مراجعه (فقط دارای فیس)
     * ============================================================
     */
    public function getByRegistration($regId)
    {
        try {
            $radiologyRequests = RadiologyRequest::with([
                'patient',
                'registration',
                'doctor',
                'result'
            ])
            ->where('reg_id', $regId) // ✅ استفاده از reg_id
            ->where('has_fee', true)
            ->orderBy('created_at', 'desc')
            ->get();

            $formattedRequests = $radiologyRequests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌های رادیولوژی: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت نتیجه بر اساس شناسه درخواست
     * ============================================================
     */
    public function getResultByRequestId($requestId)
    {
        try {
            Log::info('🔍 دریافت نتیجه برای درخواست:', ['request_id' => $requestId]);

            $result = RadiologyResult::with([
                'patient',
                'registration', // ✅ registration با reg_id
                'doctor',
                'radiologyRequest'
            ])->where('radiology_request_id', $requestId)->first();

            if (!$result) {
                Log::warning('⚠️ نتیجه یافت نشد', ['request_id' => $requestId]);
                return response()->json([
                    'success' => false,
                    'message' => 'نتیجه‌ای برای این درخواست یافت نشد'
                ], 404);
            }

            $formattedData = $this->formatFullResultData($result);

            Log::info('✅ نتیجه دریافت شد', ['result_id' => $result->id]);

            return response()->json([
                'success' => true,
                'data' => $formattedData,
                'message' => 'نتیجه با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت نتیجه:', [
                'request_id' => $requestId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتیجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت تمام نتایج یک بیمار
     * ============================================================
     */
    public function getResultsByPatient($patientId)
    {
        try {
            Log::info('🔍 دریافت نتایج بیمار:', ['patient_id' => $patientId]);

            $results = RadiologyResult::with([
                'patient',
                'registration',
                'doctor',
                'radiologyRequest'
            ])->where('patient_id', $patientId)
              ->orderByDesc('created_at')
              ->get();

            $formattedResults = $results->map(function ($result) {
                return $this->formatFullResultData($result);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedResults,
                'count' => $results->count(),
                'message' => 'نتایج با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت نتایج بیمار:', [
                'patient_id' => $patientId,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتایج'
            ], 500);
        }
    }

    /**
     * ============================================================
     * دانلود فایل PDF
     * ============================================================
     */
    public function downloadPdf($id)
    {
        try {
            Log::info('📥 دانلود PDF', ['result_id' => $id]);

            $result = RadiologyResult::find($id);

            if (!$result) {
                Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'نتیجه یافت نشد'
                ], 404);
            }

            if (!$result->pdf_file) {
                Log::warning('⚠️ فایل PDF وجود ندارد', ['result_id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'فایل PDF وجود ندارد'
                ], 404);
            }

            // اصلاح مسیر فایل
            $pdfFile = $result->pdf_file;
            
            if (strpos($pdfFile, 'storage/') === 0) {
                $pdfFile = substr($pdfFile, 8);
            }
            
            if (strpos($pdfFile, '/') === 0) {
                $pdfFile = substr($pdfFile, 1);
            }
            
            if (strpos($pdfFile, 'radiology_results/') === false && 
                strpos($pdfFile, 'radiology_') !== false) {
                $pdfFile = 'radiology_results/' . $pdfFile;
            }
            
            $fullPath = storage_path('app/public/' . $pdfFile);
            
            if (!file_exists($fullPath)) {
                $fileName = basename($pdfFile);
                $alternativePath = storage_path('app/public/radiology_results/' . $fileName);
                
                if (file_exists($alternativePath)) {
                    $fullPath = $alternativePath;
                } else {
                    $secondAlternative = public_path('storage/radiology_results/' . $fileName);
                    if (file_exists($secondAlternative)) {
                        $fullPath = $secondAlternative;
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'فایل یافت نشد'
                        ], 404);
                    }
                }
            }

            Log::info('✅ دانلود PDF موفق', [
                'result_id' => $id,
                'file_name' => $result->pdf_file_name ?? 'result.pdf',
                'full_path' => $fullPath
            ]);

            return response()->download($fullPath, $result->pdf_file_name ?? 'result.pdf', [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . ($result->pdf_file_name ?? 'result.pdf') . '"',
            ]);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دانلود PDF', [
                'id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دانلود فایل: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * لیست نتایج رادیولوژی
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
            Log::info('📋 دریافت لیست نتایج رادیولوژی');

            $query = RadiologyResult::with([
                'patient',
                'registration',
                'doctor',
                'radiologyRequest'
            ]);

            if ($request->filled('result_status')) {
                $query->where('result_status', $request->result_status);
            }

            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->filled('reg_id')) { // ✅ استفاده از reg_id
                $query->where('reg_id', $request->reg_id);
            }

            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('report_no', 'LIKE', "%{$search}%")
                      ->orWhereHas('radiologyRequest', function ($r) use ($search) {
                          $r->where('radiology_type', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('patient', function ($p) use ($search) {
                          $p->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhere('mobile', 'LIKE', "%{$search}%");
                      });
                });
            }

            $perPage = (int) ($request->per_page ?? 15);

            $results = $query
                ->orderByDesc('created_at')
                ->paginate($perPage);

            $formattedResults = $results->map(function ($result) {
                return $this->formatResultData($result);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'results' => $formattedResults,
                    'pagination' => [
                        'current_page' => $results->currentPage(),
                        'last_page' => $results->lastPage(),
                        'per_page' => $results->perPage(),
                        'total' => $results->total(),
                    ]
                ],
                'message' => 'لیست نتایج رادیولوژی با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت نتایج رادیولوژی', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتایج رادیولوژی',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * ثبت نتیجه جدید در جدول radiology_results
     * ============================================================
     */
   /**
 * ============================================================
 * ثبت نتیجه جدید با آپلود فایل (ترکیبی) - مشابه لابراتوار
 * ============================================================
 */
public function store(Request $request)
{
    Log::info('📝 شروع ثبت نتیجه جدید (ترکیبی)', [
        'request_data' => $request->all(),
        'has_file' => $request->hasFile('pdf_file')
    ]);

    // ✅ اصلاح: پذیرش هر دو نام فیلد
    $validator = Validator::make($request->all(), [
        'radiology_request_id' => ['required', 'exists:radiology_requests,id'],
        'registration_id' => ['required_without:reg_id'], // ✅ پذیرش registration_id
        'reg_id' => ['required_without:registration_id'], // ✅ پذیرش reg_id
        'patient_id' => ['required', 'exists:patients,id'],
        'result_status' => ['required', 'in:Draft,Completed,Verified,Cancelled'],
        'result' => ['nullable', 'string'],
        'findings' => ['nullable', 'string'],
        'interpretation' => ['nullable', 'string'],
        'normal_range' => ['nullable', 'string'],
        'remarks' => ['nullable', 'string'],
        'pdf_file' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
    ]);

    if ($validator->fails()) {
        Log::error('❌ خطا در اعتبارسنجی ثبت نتیجه', [
            'errors' => $validator->errors()->toArray()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'خطا در اعتبارسنجی',
            'errors' => $validator->errors()
        ], 422);
    }

    DB::beginTransaction();

    try {
        // ✅ دریافت reg_id (از هر دو نام فیلد)
        $regId = $request->reg_id ?? $request->registration_id;

        // بررسی وجود رکورد در جدول registrations
        $registration = Registrations::where('reg_id', $regId)->first();
        if (!$registration) {
            Log::error('❌ مراجعه یافت نشد', ['reg_id' => $regId]);
            return response()->json([
                'success' => false,
                'message' => 'مراجعه مورد نظر یافت نشد'
            ], 404);
        }

        $pdfFile = null;
        $pdfFileName = null;
        
        if ($request->hasFile('pdf_file')) {
            $file = $request->file('pdf_file');
            $pdfFileName = $file->getClientOriginalName();
            $fileName = 'radiology_' . time() . '_' . Str::random(8) . '.pdf';
            $path = $file->storeAs('radiology_results', $fileName, 'public');
            $pdfFile = $path;
            
            Log::info('📄 فایل آپلود شد', [
                'path' => $path,
                'original_name' => $pdfFileName
            ]);
        }

        $reportNo = 'RAD' . Carbon::now()->format('Ymd') . strtoupper(Str::random(6));
        
        Log::info('📝 ایجاد نتیجه جدید', [
            'report_no' => $reportNo,
            'request_id' => $request->radiology_request_id,
            'reg_id' => $regId
        ]);

        // ✅ ایجاد نتیجه در جدول radiology_results
        $result = RadiologyResult::create([
            'radiology_request_id' => $request->radiology_request_id,
            'reg_id' => $regId, // ✅ ذخیره با reg_id
            'patient_id' => $request->patient_id,
            'doctor_id' => $request->doctor_id ?? null,
            'report_no' => $reportNo,
            'result_status' => $request->result_status ?? 'Completed',
            'result' => $request->result,
            'findings' => $request->findings,
            'interpretation' => $request->interpretation,
            'normal_range' => $request->normal_range,
            'remarks' => $request->remarks,
            'pdf_file' => $pdfFile,
            'pdf_file_name' => $pdfFileName,
            'analysis_completed_at' => $request->result_status === 'Completed' ? now() : null,
            'created_by' => $request->user()?->id,
        ]);

        Log::info('✅ نتیجه ایجاد شد', [
            'result_id' => $result->id,
            'report_no' => $result->report_no,
            'pdf_file' => $pdfFile
        ]);

        // ✅ به‌روزرسانی وضعیت درخواست
        $radiologyRequest = RadiologyRequest::find($request->radiology_request_id);
        if ($radiologyRequest) {
            $radiologyRequest->update([
                'status' => 'completed',
                'has_result' => true,
                'completed_date' => now(),
            ]);
            
            Log::info('✅ وضعیت درخواست به‌روزرسانی شد', [
                'request_id' => $radiologyRequest->id,
                'new_status' => 'completed'
            ]);
        }

        DB::commit();

        $result->load([
            'patient',
            'registration',
            'doctor',
            'radiologyRequest'
        ]);

        $responseData = $this->formatResultData($result);
        $responseData['pdf_url'] = $result->pdf_file ? asset('storage/' . $result->pdf_file) : null;

        return response()->json([
            'success' => true,
            'data' => $responseData,
            'message' => 'نتیجه رادیولوژی با موفقیت ثبت شد'
        ], 201);

    } catch (\Throwable $e) {
        DB::rollBack();
        
        Log::error('❌ خطا در ثبت نتیجه', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'خطا در ثبت نتیجه: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ], 500);
    }
}

    // ... بقیه متدها (show, update, destroy) مشابه قبل با اصلاح reg_id

    // ============ متدهای کمکی ============

    /**
     * فرمت کردن داده‌های نتیجه با جزئیات کامل
     */
    private function formatFullResultData($result)
    {
        $doctor = $result->doctor;
        $radiologyRequest = $result->radiologyRequest;
        $pdfUrl = null;
        
        if ($result->pdf_file) {
            if (strpos($result->pdf_file, 'http') === 0) {
                $pdfUrl = $result->pdf_file;
            } else {
                $pdfUrl = asset('storage/' . $result->pdf_file);
            }
        }
        
        return [
            'id' => $result->id,
            'radiology_request_id' => $result->radiology_request_id,
            'reg_id' => $result->reg_id, // ✅ استفاده از reg_id
            'patient_id' => $result->patient_id,
            'report_no' => $result->report_no,
            'result_status' => $result->result_status,
            'status_label' => $result->result_status_label ?? $this->getResultStatusLabel($result->result_status),
            
            'result' => $result->result,
            'findings' => $result->findings,
            'interpretation' => $result->interpretation,
            'normal_range' => $result->normal_range,
            'remarks' => $result->remarks,
            
            'pdf_file' => $result->pdf_file,
            'pdf_file_name' => $result->pdf_file_name,
            'pdf_url' => $pdfUrl,
            
            'patient' => $result->patient ? [
                'id' => $result->patient->id,
                'first_name' => $result->patient->first_name,
                'last_name' => $result->patient->last_name,
                'full_name' => trim($result->patient->first_name . ' ' . $result->patient->last_name),
                'mobile' => $result->patient->mobile,
                'email' => $result->patient->email,
                'age' => $result->patient->age,
                'gender' => $result->patient->gender,
                'gender_label' => $this->getGenderLabel($result->patient->gender),
                'national_id' => $result->patient->national_id,
            ] : null,
            
            'registration' => $result->registration ? [
                'reg_id' => $result->registration->reg_id,
                'visit_number' => $result->registration->visit_number,
                'visit_date' => $result->registration->visit_date,
            ] : null,
            
            'radiology_request' => $radiologyRequest ? [
                'id' => $radiologyRequest->id,
                'radiology_type' => $radiologyRequest->radiology_type,
                'radiology_type_label' => $radiologyRequest->radiology_type_label,
                'body_part' => $radiologyRequest->body_part,
                'reason' => $radiologyRequest->reason,
                'priority' => $radiologyRequest->priority,
                'priority_label' => $radiologyRequest->priority_label,
                'barcode' => $radiologyRequest->barcode,
                'request_date' => $radiologyRequest->request_date,
                'status' => $radiologyRequest->status,
                'status_label' => $radiologyRequest->status_label,
            ] : null,
            
            'doctor' => $doctor ? [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'specialization' => $doctor->specialization ?? null,
            ] : null,
            
            'analysis_completed_at' => $result->analysis_completed_at,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
        ];
    }

    /**
     * فرمت کردن درخواست با نتیجه
     */
    private function formatRequestWithResult($request)
    {
        $result = $request->result;
        
        $formatted = [
            'id' => $request->id,
            'reg_id' => $request->reg_id, // ✅ استفاده از reg_id
            'patient_id' => $request->patient_id,
            'radiology_type' => $request->radiology_type,
            'radiology_type_label' => $request->radiology_type_label,
            'body_part' => $request->body_part,
            'reason' => $request->reason,
            'notes' => $request->notes,
            'clinical_indication' => $request->clinical_indication,
            'special_notes' => $request->special_notes,
            'priority' => $request->priority,
            'priority_label' => $request->priority_label,
            'status' => $request->status,
            'status_label' => $request->status_label,
            'barcode' => $request->barcode,
            'has_fee' => $request->has_fee,
            'has_result' => $request->has_result,
            'request_date' => $request->request_date,
            'created_at' => $request->created_at,
        ];

        if ($request->patient) {
            $formatted['patient'] = [
                'id' => $request->patient->id,
                'first_name' => $request->patient->first_name,
                'last_name' => $request->patient->last_name,
                'full_name' => trim($request->patient->first_name . ' ' . $request->patient->last_name),
                'mobile' => $request->patient->mobile,
                'email' => $request->patient->email,
                'age' => $request->patient->age,
                'gender' => $request->patient->gender,
                'gender_label' => $this->getGenderLabel($request->patient->gender),
                'national_id' => $request->patient->national_id,
            ];
        }

        if ($request->registration) {
            $formatted['registration'] = [
                'reg_id' => $request->registration->reg_id,
                'visit_number' => $request->registration->visit_number,
                'visit_date' => $request->registration->visit_date,
            ];
        }

        if ($request->doctor) {
            $formatted['doctor'] = [
                'id' => $request->doctor->id,
                'name' => $request->doctor->name,
                'specialization' => $request->doctor->specialization ?? null,
            ];
        }

        if ($result) {
            $formatted['radiology_result'] = [
                'id' => $result->id,
                'report_no' => $result->report_no,
                'result_status' => $result->result_status,
                'status_label' => $result->result_status_label ?? $this->getResultStatusLabel($result->result_status),
                'result' => $result->result,
                'findings' => $result->findings,
                'interpretation' => $result->interpretation,
                'normal_range' => $result->normal_range,
                'remarks' => $result->remarks,
                'pdf_file' => $result->pdf_file,
                'pdf_file_name' => $result->pdf_file_name,
                'pdf_url' => $result->pdf_file ? asset('storage/' . $result->pdf_file) : null,
                'analysis_completed_at' => $result->analysis_completed_at,
                'created_at' => $result->created_at,
                'updated_at' => $result->updated_at,
            ];
            $formatted['pdf_url'] = $result->pdf_file ? asset('storage/' . $result->pdf_file) : null;
        } else {
            $formatted['radiology_result'] = null;
            $formatted['pdf_url'] = null;
        }

        return $formatted;
    }

    /**
     * دریافت برچسب وضعیت نتیجه
     */
    private function getResultStatusLabel($status)
    {
        $labels = [
            'Draft' => 'پیش‌نویس',
            'Completed' => 'تکمیل شده',
            'Verified' => 'تأیید شده',
            'Cancelled' => 'لغو شده',
        ];
        return $labels[$status] ?? $status;
    }

    /**
     * دریافت برچسب جنسیت
     */
    private function getGenderLabel($gender)
    {
        $genders = [
            'male' => 'مرد',
            'female' => 'زن',
            'other' => 'سایر',
        ];
        return $genders[$gender] ?? $gender ?? 'نامشخص';
    }


    /**
 * ============================================================
 * ویرایش نتیجه (با قابلیت آپلود فایل جدید)
 * ============================================================
 */
public function update(Request $request, $id)
{
    try {
        Log::info('✏️ ویرایش نتیجه', [
            'id' => $id,
            'data' => $request->all(),
            'has_file' => $request->hasFile('pdf_file')
        ]);

        $result = RadiologyResult::find($id);

        if (!$result) {
            Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
            
            return response()->json([
                'success' => false,
                'message' => 'نتیجه یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'result_status' => ['nullable', 'in:Draft,Completed,Verified,Cancelled'],
            'result' => ['nullable', 'string'],
            'findings' => ['nullable', 'string'],
            'interpretation' => ['nullable', 'string'],
            'normal_range' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'pdf_file' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        if ($validator->fails()) {
            Log::error('❌ خطا در اعتبارسنجی ویرایش نتیجه', [
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $updateData = [];

            // فیلدهای متنی
            if ($request->has('result')) $updateData['result'] = $request->result;
            if ($request->has('findings')) $updateData['findings'] = $request->findings;
            if ($request->has('interpretation')) $updateData['interpretation'] = $request->interpretation;
            if ($request->has('normal_range')) $updateData['normal_range'] = $request->normal_range;
            if ($request->has('remarks')) $updateData['remarks'] = $request->remarks;
            if ($request->has('result_status')) $updateData['result_status'] = $request->result_status;
            
            // پردازش فایل جدید در صورت آپلود
            if ($request->hasFile('pdf_file')) {
                // حذف فایل قدیمی اگر وجود داشته باشد
                if ($result->pdf_file) {
                    $oldPath = str_replace('storage/', '', $result->pdf_file);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                        Log::info('🗑️ فایل PDF قدیمی حذف شد', ['path' => $oldPath]);
                    } else {
                        $oldFullPath = storage_path('app/public/' . $oldPath);
                        if (file_exists($oldFullPath)) {
                            unlink($oldFullPath);
                            Log::info('🗑️ فایل PDF قدیمی با unlink حذف شد', ['path' => $oldFullPath]);
                        }
                    }
                }

                // آپلود فایل جدید
                $file = $request->file('pdf_file');
                $originalName = $file->getClientOriginalName();
                $fileName = 'radiology_' . time() . '_' . Str::random(8) . '.pdf';
                $path = $file->storeAs('radiology_results', $fileName, 'public');
                
                if (!$path) {
                    throw new \Exception('ذخیره فایل جدید با شکست مواجه شد');
                }
                
                Log::info('📄 فایل جدید آپلود شد', [
                    'path' => $path,
                    'original_name' => $originalName
                ]);

                $updateData['pdf_file'] = $path;
                $updateData['pdf_file_name'] = $originalName;
            }

            // اگر وضعیت به Completed تغییر کرده و زمان تکمیل ثبت نشده است
            if (isset($updateData['result_status']) && 
                $updateData['result_status'] === 'Completed' && 
                !$result->analysis_completed_at) {
                $updateData['analysis_completed_at'] = now();
            }

            // اگر وضعیت از Completed به غیر آن تغییر کرده
            if (isset($updateData['result_status']) && 
                $updateData['result_status'] !== 'Completed' && 
                $result->result_status === 'Completed') {
                $updateData['analysis_completed_at'] = null;
            }

            $updateData['updated_by'] = $request->user()?->id;

            $result->update($updateData);

            DB::commit();

            $result->load([
                'patient',
                'registration',
                'doctor',
                'radiologyRequest'
            ]);

            Log::info('✅ نتیجه ویرایش شد', [
                'id' => $id,
                'has_pdf' => !empty($result->pdf_file)
            ]);

            return response()->json([
                'success' => true,
                'data' => $this->formatResultData($result),
                'message' => 'نتیجه با موفقیت ویرایش شد'
            ], 200);

        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

    } catch (\Throwable $e) {
        Log::error('❌ خطا در ویرایش نتیجه', [
            'id' => $id,
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'خطا در ویرایش نتیجه: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ], 500);
    }
}
/**
 * فرمت کردن داده‌های نتیجه با اطلاعات پایه
 */
private function formatResultData($result)
{
    $pdfUrl = null;
    if ($result->pdf_file) {
        if (strpos($result->pdf_file, 'http') === 0) {
            $pdfUrl = $result->pdf_file;
        } else {
            $pdfUrl = asset('storage/' . $result->pdf_file);
        }
    }
    
    return [
        'id' => $result->id,
        'radiology_request_id' => $result->radiology_request_id,
        'report_no' => $result->report_no,
        'result_status' => $result->result_status,
        'status_label' => $this->getStatusLabel($result->result_status),
        
        'result' => $result->result,
        'findings' => $result->findings,
        'interpretation' => $result->interpretation,
        'normal_range' => $result->normal_range,
        'remarks' => $result->remarks,
        
        'pdf_file' => $result->pdf_file,
        'pdf_file_name' => $result->pdf_file_name,
        'pdf_url' => $pdfUrl,
        
        'patient' => $result->patient ? [
            'id' => $result->patient->id,
            'first_name' => $result->patient->first_name,
            'last_name' => $result->patient->last_name,
            'full_name' => trim($result->patient->first_name . ' ' . $result->patient->last_name),
            'mobile' => $result->patient->mobile,
            'email' => $result->patient->email,
            'age' => $result->patient->age,
            'gender' => $result->patient->gender,
            'gender_label' => $this->getGenderLabel($result->patient->gender),
            'national_id' => $result->patient->national_id,
        ] : null,
        
        'registration' => $result->registration ? [
            'reg_id' => $result->registration->reg_id,
            'visit_number' => $result->registration->visit_number,
        ] : null,
        
        'radiology_request' => $result->radiologyRequest ? [
            'id' => $result->radiologyRequest->id,
            'radiology_type' => $result->radiologyRequest->radiology_type,
            'radiology_type_label' => $result->radiologyRequest->radiology_type_label,
            'body_part' => $result->radiologyRequest->body_part,
        ] : null,
        
        'analysis_completed_at' => $result->analysis_completed_at,
        'created_at' => $result->created_at,
        'updated_at' => $result->updated_at,
    ];
}
/**
 * دریافت برچسب وضعیت نتیجه
 */
private function getStatusLabel($status)
{
    $labels = [
        'Draft' => 'پیش‌نویس',
        'Completed' => 'تکمیل شده',
        'Verified' => 'تأیید شده',
        'Cancelled' => 'لغو شده',
    ];
    return $labels[$status] ?? $status;
}
/**
 * دریافت برچسب وضعیت درخواست
 */
private function getRequestStatusLabel($status)
{
    $labels = [
        'pending' => 'در انتظار',
        'scheduled' => 'برنامه‌ریزی شده',
        'in_progress' => 'در حال انجام',
        'completed' => 'تکمیل شده',
        'cancelled' => 'لغو شده',
        'rejected' => 'رد شده',
        'sent_to_radiology' => 'ارسال به رادیولوژی',
    ];
    return $labels[$status] ?? $status;
}
/**
 * دریافت برچسب جنسیت
 */
 /**
 * ============================================================
 * نمایش یک نتیجه با تمام جزئیات
 * ============================================================
 */
public function show($id)
{
    try {
        Log::info('🔍 نمایش نتیجه', ['id' => $id]);

        $result = RadiologyResult::with([
            'patient',
            'registration',
            'doctor',
            'radiologyRequest'
        ])->find($id);

        if (!$result) {
            Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
            
            return response()->json([
                'success' => false,
                'message' => 'نتیجه یافت نشد'
            ], 404);
        }

        // ✅ استفاده از formatResultData به جای formatFullResultData
        return response()->json([
            'success' => true,
            'data' => $this->formatResultData($result),
            'message' => 'نتیجه با موفقیت دریافت شد'
        ], 200);

    } catch (\Throwable $e) {
        Log::error('❌ خطا در نمایش نتیجه', [
            'id' => $id,
            'message' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'خطا در نمایش نتیجه'
        ], 500);
    }
}
/**
 * ============================================================
 * حذف نتیجه
 * ============================================================
 */
public function destroy($id)
{
    try {
        Log::info('🗑️ حذف نتیجه', ['id' => $id]);

        $result = RadiologyResult::find($id);

        if (!$result) {
            Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
            
            return response()->json([
                'success' => false,
                'message' => 'نتیجه یافت نشد'
            ], 404);
        }

        // حذف فایل PDF اگر وجود داشته باشد
        if ($result->pdf_file) {
            $path = str_replace('storage/', '', $result->pdf_file);
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                Log::info('🗑️ فایل PDF حذف شد', ['path' => $path]);
            }
        }

        // به‌روزرسانی وضعیت درخواست رادیولوژی
        $radiologyRequest = RadiologyRequest::find($result->radiology_request_id);
        if ($radiologyRequest) {
            $radiologyRequest->update([
                'has_result' => false,
                'status' => 'sent_to_radiology',
                'completed_date' => null,
            ]);
        }

        $result->delete();
        
        Log::info('✅ نتیجه حذف شد', ['id' => $id]);

        return response()->json([
            'success' => true,
            'message' => 'نتیجه با موفقیت حذف شد'
        ], 200);

    } catch (\Throwable $e) {
        Log::error('❌ خطا در حذف نتیجه', [
            'id' => $id,
            'message' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'خطا در حذف نتیجه'
        ], 500);
    }
}
}