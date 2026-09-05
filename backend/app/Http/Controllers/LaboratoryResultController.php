<?php

namespace App\Http\Controllers;

use App\Models\LaboratoryResult;
use App\Models\LaboratoryRequest;
use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LaboratoryResultController extends Controller
{
    /**
     * ============================================================
     * دریافت درخواست‌های لابراتوار با نتایج (اصلاح شده)
     * ============================================================
     */
    public function getRequestsWithResults(Request $request)
    {
        try {
            Log::info('📡 دریافت درخواست‌های لابراتوار با نتایج');

            $query = LaboratoryRequest::with([
                'patient',
                'registration',
                'doctor',
                'result' // ارتباط با نتیجه
            ]);

            // فیلتر بر اساس registration_id
            if ($request->filled('registration_id')) {
                $query->where('reg_id', $request->registration_id);
            }

            // فیلتر بر اساس patient_id
            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            // فیلتر بر اساس doctor_id (اختیاری)
            if ($request->filled('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            // فیلتر بر اساس وضعیت (اختیاری)
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // ❌ حذف شرط whereHas('fee') - این شرط باعث می‌شود درخواست‌های بدون فیس نمایش داده نشوند
            // $query->whereHas('fee');

            $requests = $query
                ->orderByDesc('created_at')
                ->get();

            Log::info('✅ تعداد درخواست‌های دریافت شده: ' . $requests->count());

            $formattedRequests = $requests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            // آمار وضعیت‌ها
            $stats = [
                'total' => $requests->count(),
                'pending' => $requests->where('status', 'pending')->count(),
                'in_progress' => $requests->where('status', 'in_progress')->count(),
                'completed' => $requests->where('status', 'completed')->count(),
                'with_result' => $requests->filter(function($r) { return $r->result; })->count(),
                'without_result' => $requests->filter(function($r) { return !$r->result; })->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
                'statistics' => $stats,
                'message' => 'درخواست‌های لابراتوار با نتایج دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت درخواست‌ها با نتایج', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت درخواست‌های لابراتوار برای یک دکتر خاص با نتایج
     * ============================================================
     */
    public function getDoctorRequestsWithResults(Request $request, $doctorId)
    {
        try {
            Log::info('📡 دریافت درخواست‌های لابراتوار برای دکتر', ['doctor_id' => $doctorId]);

            $query = LaboratoryRequest::with([
                'patient',
                'registration',
                'doctor',
                'result'
            ])->where('doctor_id', $doctorId);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('registration_id')) {
                $query->where('reg_id', $request->registration_id);
            }

            $requests = $query
                ->orderByDesc('created_at')
                ->get();

            $formattedRequests = $requests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            // آمار وضعیت‌ها
            $stats = [
                'total' => $requests->count(),
                'pending' => $requests->where('status', 'pending')->count(),
                'in_progress' => $requests->where('status', 'in_progress')->count(),
                'completed' => $requests->where('status', 'completed')->count(),
                'with_result' => $requests->filter(function($r) { return $r->result; })->count(),
                'without_result' => $requests->filter(function($r) { return !$r->result; })->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
                'statistics' => $stats,
                'message' => 'درخواست‌های لابراتوار دکتر با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت درخواست‌های دکتر', [
                'doctor_id' => $doctorId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت درخواست‌های لابراتوار برای یک بیمار با نتایج
     * ============================================================
     */
    public function getPatientRequestsWithResults(Request $request, $patientId)
    {
        try {
            Log::info('📡 دریافت درخواست‌های لابراتوار برای بیمار', ['patient_id' => $patientId]);

            $query = LaboratoryRequest::with([
                'patient',
                'registration',
                'doctor',
                'result'
            ])->where('patient_id', $patientId);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $requests = $query
                ->orderByDesc('created_at')
                ->get();

            $formattedRequests = $requests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
                'count' => $requests->count(),
                'message' => 'درخواست‌های لابراتوار بیمار با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت درخواست‌های بیمار', [
                'patient_id' => $patientId,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها: ' . $e->getMessage()
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

            $result = LaboratoryResult::with([
                'patient',
                'registration',
                'laboratoryRequest',
                'laboratoryRequest.doctor'
            ])->where('laboratory_request_id', $requestId)->first();

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

            $results = LaboratoryResult::with([
                'patient',
                'registration',
                'laboratoryRequest',
                'laboratoryRequest.doctor'
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

            $result = LaboratoryResult::find($id);

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
            
            if (strpos($pdfFile, 'laboratory_results/') === false && 
                strpos($pdfFile, 'lab_result_') !== false) {
                $pdfFile = 'laboratory_results/' . $pdfFile;
            }
            
            $fullPath = storage_path('app/public/' . $pdfFile);
            
            Log::info('📄 بررسی مسیر فایل', [
                'original_pdf_file' => $result->pdf_file,
                'cleaned_path' => $pdfFile,
                'full_path' => $fullPath,
                'file_exists' => file_exists($fullPath)
            ]);

            if (!file_exists($fullPath)) {
                $fileName = basename($pdfFile);
                $alternativePath = storage_path('app/public/laboratory_results/' . $fileName);
                
                Log::info('📄 بررسی مسیر جایگزین', [
                    'alternative_path' => $alternativePath,
                    'exists' => file_exists($alternativePath)
                ]);
                
                if (file_exists($alternativePath)) {
                    $fullPath = $alternativePath;
                } else {
                    $secondAlternative = public_path('storage/laboratory_results/' . $fileName);
                    Log::info('📄 بررسی مسیر جایگزین دوم', [
                        'path' => $secondAlternative,
                        'exists' => file_exists($secondAlternative)
                    ]);
                    
                    if (file_exists($secondAlternative)) {
                        $fullPath = $secondAlternative;
                    } else {
                        Log::warning('⚠️ فایل در هیچ مسیری وجود ندارد', [
                            'original' => $fullPath,
                            'alternative1' => $alternativePath,
                            'alternative2' => $secondAlternative
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'فایل یافت نشد'
                        ], 404);
                    }
                }
            }

            $result->increment('print_count');
            $result->last_printed_at = now();
            $result->is_printed = true;
            $result->save();

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
     * لیست نتایج لابراتوار
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
            Log::info('📋 دریافت لیست نتایج لابراتوار');

            $query = LaboratoryResult::with([
                'patient',
                'registration',
                'laboratoryRequest'
            ]);

            if ($request->filled('status')) {
                $query->where('result_status', $request->status);
            }

            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->filled('registration_id')) {
                $query->where('registration_id', $request->registration_id);
            }

            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('report_no', 'LIKE', "%{$search}%")
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
                'message' => 'لیست نتایج لابراتوار با موفقیت دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در دریافت نتایج لابراتوار', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتایج لابراتوار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * آپلود فایل PDF
     * ============================================================
     */
    public function uploadPdf(Request $request)
    {
        Log::info('📤 شروع آپلود PDF', [
            'request_data' => $request->all(),
            'has_file' => $request->hasFile('pdf_file'),
            'files' => $request->hasFile('pdf_file') ? 'فایل وجود دارد' : 'فایل وجود ندارد'
        ]);

        $validator = Validator::make($request->all(), [
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'laboratory_request_id' => ['required', 'exists:laboratory_requests,id'],
        ]);

        if ($validator->fails()) {
            Log::error('❌ خطا در اعتبارسنجی آپلود PDF', [
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('pdf_file');
            $originalName = $file->getClientOriginalName();
            $fileSize = $file->getSize();
            $fileMime = $file->getMimeType();
            
            $fileName = 'lab_result_' . time() . '_' . Str::random(8) . '.pdf';
            
            Log::info('📄 اطلاعات فایل', [
                'original_name' => $originalName,
                'size' => $fileSize,
                'mime' => $fileMime,
                'new_name' => $fileName
            ]);

            $path = $file->storeAs('laboratory_results', $fileName, 'public');
            
            if (!$path) {
                throw new \Exception('ذخیره فایل با شکست مواجه شد');
            }
            
            $fullUrl = asset('storage/' . $path);
            
            Log::info('✅ فایل ذخیره شد', [
                'path' => $path,
                'full_url' => $fullUrl
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'pdf_url' => $fullUrl,
                    'pdf_file_name' => $originalName,
                    'pdf_path' => $path,
                ],
                'message' => 'فایل PDF با موفقیت آپلود شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('❌ خطا در آپلود PDF', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در آپلود فایل PDF: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * ثبت نتیجه جدید با آپلود فایل (ترکیبی)
     * ============================================================
     */
    public function store(Request $request)
    {
        Log::info('📝 شروع ثبت نتیجه جدید (ترکیبی)', [
            'request_data' => $request->all(),
            'has_file' => $request->hasFile('pdf_file')
        ]);

        $validator = Validator::make($request->all(), [
            'laboratory_request_id' => ['required', 'exists:laboratory_requests,id'],
            'registration_id' => ['required'],
            'patient_id' => ['required', 'exists:patients,id'],
            'result_status' => ['required', 'in:Draft,Completed,Verified,Delivered,Cancelled'],
            'result' => ['nullable', 'string'],
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
            $pdfFile = null;
            $pdfFileName = null;
            
            if ($request->hasFile('pdf_file')) {
                $file = $request->file('pdf_file');
                $pdfFileName = $file->getClientOriginalName();
                $fileName = 'lab_result_' . time() . '_' . Str::random(8) . '.pdf';
                $path = $file->storeAs('laboratory_results', $fileName, 'public');
                $pdfFile = $path;
                
                Log::info('📄 فایل آپلود شد', [
                    'path' => $path,
                    'original_name' => $pdfFileName
                ]);
            }

            $reportNo = 'LAB' . Carbon::now()->format('Ymd') . strtoupper(Str::random(6));
            
            Log::info('📝 ایجاد نتیجه جدید', [
                'report_no' => $reportNo,
                'request_id' => $request->laboratory_request_id
            ]);

            $result = LaboratoryResult::create([
                'laboratory_request_id' => $request->laboratory_request_id,
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'report_no' => $reportNo,
                'result_status' => $request->result_status ?? 'Completed',
                'result' => $request->result,
                'normal_range' => $request->normal_range,
                'remarks' => $request->remarks,
                'pdf_file' => $pdfFile,
                'pdf_file_name' => $pdfFileName,
                'sample_received_at' => now(),
                'analysis_started_at' => now(),
                'analysis_completed_at' => $request->result_status === 'Completed' ? now() : null,
            ]);

            Log::info('✅ نتیجه ایجاد شد', [
                'result_id' => $result->id,
                'report_no' => $result->report_no,
                'pdf_file' => $pdfFile
            ]);

            $laboratoryRequest = LaboratoryRequest::find($request->laboratory_request_id);
            if ($laboratoryRequest) {
                $laboratoryRequest->status = 'completed';
                $laboratoryRequest->result_date = now();
                $laboratoryRequest->save();
                
                Log::info('✅ وضعیت درخواست به‌روزرسانی شد', [
                    'request_id' => $laboratoryRequest->id,
                    'new_status' => 'completed'
                ]);
            }

            DB::commit();

            $responseData = $this->formatResultData($result);
            $responseData['pdf_url'] = $result->pdf_file ? asset('storage/' . $result->pdf_file) : null;

            return response()->json([
                'success' => true,
                'data' => $responseData,
                'message' => 'نتیجه لابراتوار با موفقیت ثبت شد'
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

    /**
     * ============================================================
     * نمایش یک نتیجه با تمام جزئیات
     * ============================================================
     */
    public function show($id)
    {
        try {
            Log::info('🔍 نمایش نتیجه', ['id' => $id]);

            $result = LaboratoryResult::with([
                'patient',
                'registration',
                'laboratoryRequest'
            ])->find($id);

            if (!$result) {
                Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'نتیجه یافت نشد'
                ], 404);
            }

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
     * ویرایش نتیجه
     * ============================================================
     */
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

        $result = LaboratoryResult::find($id);

        if (!$result) {
            Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
            
            return response()->json([
                'success' => false,
                'message' => 'نتیجه یافت نشد'
            ], 404);
        }

        // ============================================================
        // اصلاح قوانین اعتبارسنجی - فایل باید از نوع file باشد
        // ============================================================
        $validator = Validator::make($request->all(), [
            'result_status' => ['nullable', 'in:Draft,Completed,Verified,Delivered,Cancelled'],
            'result' => ['nullable', 'string'],
            'normal_range' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            // اصلاح: استفاده از قوانین مربوط به فایل
            'pdf_file' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            // حذف pdf_file_name از اعتبارسنجی چون خودکار تولید می‌شود
            // 'pdf_file_name' => ['nullable', 'string'],
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
            // ============================================================
            // پردازش فایل جدید در صورت آپلود
            // ============================================================
            if ($request->hasFile('pdf_file')) {
                // حذف فایل قدیمی اگر وجود داشته باشد
                if ($result->pdf_file) {
                    $oldPath = str_replace('storage/', '', $result->pdf_file);
                    // بررسی مسیرهای مختلف برای حذف
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                        Log::info('🗑️ فایل PDF قدیمی حذف شد', ['path' => $oldPath]);
                    } else {
                        // بررسی مسیر جایگزین
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
                $fileName = 'lab_result_' . time() . '_' . Str::random(8) . '.pdf';
                $path = $file->storeAs('laboratory_results', $fileName, 'public');
                
                if (!$path) {
                    throw new \Exception('ذخیره فایل جدید با شکست مواجه شد');
                }
                
                Log::info('📄 فایل جدید آپلود شد', [
                    'path' => $path,
                    'original_name' => $originalName
                ]);

                // تنظیم مقادیر فایل جدید
                $updateData = $request->only([
                    'result_status',
                    'result',
                    'normal_range',
                    'remarks',
                ]);
                $updateData['pdf_file'] = $path;
                $updateData['pdf_file_name'] = $originalName;
                
            } else {
                // اگر فایل جدید آپلود نشده، فقط داده‌های متنی را به‌روزرسانی کن
                $updateData = $request->only([
                    'result_status',
                    'result',
                    'normal_range',
                    'remarks',
                ]);
            }

            // ============================================================
            // به‌روزرسانی نتیجه
            // ============================================================
            $result->update($updateData);

            // اگر وضعیت به Completed تغییر کرده و زمان تکمیل ثبت نشده است
            if (isset($updateData['result_status']) && 
                $updateData['result_status'] === 'Completed' && 
                !$result->analysis_completed_at) {
                $result->analysis_completed_at = now();
                $result->save();
            }

            // اگر وضعیت به Completed تغییر کرده اما زمان تکمیل قبلاً ثبت شده
            if (isset($updateData['result_status']) && 
                $updateData['result_status'] !== 'Completed') {
                $result->analysis_completed_at = null;
                $result->save();
            }

            DB::commit();

            // بارگذاری مجدد روابط
            $result->load([
                'patient',
                'registration',
                'laboratoryRequest'
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
     * ============================================================
     * حذف نتیجه
     * ============================================================
     */
    public function destroy($id)
    {
        try {
            Log::info('🗑️ حذف نتیجه', ['id' => $id]);

            $result = LaboratoryResult::find($id);

            if (!$result) {
                Log::warning('⚠️ نتیجه یافت نشد', ['id' => $id]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'نتیجه یافت نشد'
                ], 404);
            }

            if ($result->pdf_file) {
                $path = str_replace('storage/', '', $result->pdf_file);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                    Log::info('🗑️ فایل PDF حذف شد', ['path' => $path]);
                }
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

    // ============ متدهای کمکی ============

    /**
     * فرمت کردن داده‌های نتیجه با جزئیات کامل
     */
    private function formatFullResultData($result)
    {
        $doctor = $result->laboratoryRequest?->doctor;
        
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
            'laboratory_request_id' => $result->laboratory_request_id,
            'report_no' => $result->report_no,
            'result_status' => $result->result_status,
            'status_label' => $result->status_label ?? $this->getStatusLabel($result->result_status),
            
            'result' => $result->result,
            'normal_range' => $result->normal_range,
            'interpretation' => $result->interpretation,
            'remarks' => $result->remarks,
            'recommendation' => $result->recommendation,
            
            'pdf_file' => $result->pdf_file,
            'pdf_file_name' => $result->pdf_file_name,
            'pdf_url' => $pdfUrl,
            
            'patient' => $result->patient ? [
                'id' => $result->patient->id,
                'first_name' => $result->patient->first_name,
                'last_name' => $result->patient->last_name,
                'full_name' => $result->patient_full_name ?? trim($result->patient->first_name . ' ' . $result->patient->last_name),
                'mobile' => $result->patient->mobile,
                'email' => $result->patient->email,
                'age' => $result->patient->age,
                'gender' => $result->patient->gender,
                'gender_label' => $this->getGenderLabel($result->patient->gender),
                'national_id' => $result->patient->national_id,
                'address' => $result->patient->address,
            ] : null,
            
            'registration' => $result->registration ? [
                'reg_id' => $result->registration->reg_id,
                'visit_number' => $result->registration->visit_number,
                'visit_date' => $result->registration->visit_date,
            ] : null,
            
            'test' => $result->laboratoryRequest ? [
                'id' => $result->laboratoryRequest->id,
                'test_type' => $result->laboratoryRequest->test_type,
                'test_type_label' => $result->laboratoryRequest->test_type_label ?? $result->laboratoryRequest->test_type,
                'test_name' => $result->laboratoryRequest->test_name,
                'test_description' => $result->laboratoryRequest->test_description,
                'clinical_indication' => $result->laboratoryRequest->clinical_indication,
                'special_notes' => $result->laboratoryRequest->special_notes,
                'barcode' => $result->laboratoryRequest->barcode,
                'request_date' => $result->laboratoryRequest->request_date,
            ] : null,
            
            'doctor' => $doctor ? [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'specialization' => $doctor->specialization ?? null,
            ] : null,
            
            'sample_received_at' => $result->sample_received_at,
            'analysis_started_at' => $result->analysis_started_at,
            'analysis_completed_at' => $result->analysis_completed_at,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
            
            'is_printed' => $result->is_printed,
            'print_count' => $result->print_count,
            'last_printed_at' => $result->last_printed_at,
            'is_delivered' => $result->is_delivered,
            'delivery_method' => $result->delivery_method,
            'delivered_to' => $result->delivered_to,
            'is_abnormal' => $result->is_abnormal,
            'is_critical' => $result->is_critical,
        ];
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
            'laboratory_request_id' => $result->laboratory_request_id,
            'report_no' => $result->report_no,
            'result_status' => $result->result_status,
            'status_label' => $result->status_label ?? $this->getStatusLabel($result->result_status),
            
            'result' => $result->result,
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
                'national_id' => $result->patient->national_id,
            ] : null,
            
            'registration' => $result->registration ? [
                'reg_id' => $result->registration->reg_id,
                'visit_number' => $result->registration->visit_number,
            ] : null,
            
            'test' => $result->laboratoryRequest ? [
                'id' => $result->laboratoryRequest->id,
                'test_type' => $result->laboratoryRequest->test_type,
                'test_name' => $result->laboratoryRequest->test_name,
            ] : null,
            
            'sample_received_at' => $result->sample_received_at,
            'analysis_started_at' => $result->analysis_started_at,
            'analysis_completed_at' => $result->analysis_completed_at,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
        ];
    }

    /**
     * فرمت کردن درخواست با نتیجه (اصلاح شده)
     */
    private function formatRequestWithResult($request)
    {
        $result = $request->result;
        
        $formatted = [
            'id' => $request->id,
            'reg_id' => $request->reg_id,
            'patient_id' => $request->patient_id,
            'test_type' => $request->test_type,
            'test_name' => $request->test_name,
            'test_description' => $request->test_description,
            'clinical_indication' => $request->clinical_indication,
            'special_notes' => $request->special_notes,
            'status' => $request->status,
            'status_label' => $this->getRequestStatusLabel($request->status),
            'barcode' => $request->barcode,
            'has_fee' => !is_null($request->fee_id),
            'request_date' => $request->request_date,
            'created_at' => $request->created_at,
        ];

        // اطلاعات بیمار
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

        // اطلاعات مراجعه
        if ($request->registration) {
            $formatted['registration'] = [
                'reg_id' => $request->registration->reg_id,
                'visit_number' => $request->registration->visit_number,
                'visit_date' => $request->registration->visit_date,
            ];
        }

        // اطلاعات دکتر
        if ($request->doctor) {
            $formatted['doctor'] = [
                'id' => $request->doctor->id,
                'name' => $request->doctor->name,
                'specialization' => $request->doctor->specialization ?? null,
            ];
        }

        // ✅ نتیجه آزمایش با جزئیات کامل
        if ($result) {
            $formatted['laboratory_result'] = [
                'id' => $result->id,
                'report_no' => $result->report_no,
                'result_status' => $result->result_status,
                'status_label' => $result->status_label ?? $this->getStatusLabel($result->result_status),
                'result' => $result->result,
                'normal_range' => $result->normal_range,
                'interpretation' => $result->interpretation,
                'remarks' => $result->remarks,
                'recommendation' => $result->recommendation,
                'pdf_file' => $result->pdf_file,
                'pdf_file_name' => $result->pdf_file_name,
                'pdf_url' => $result->pdf_file ? asset('storage/' . $result->pdf_file) : null,
                'sample_received_at' => $result->sample_received_at,
                'analysis_started_at' => $result->analysis_started_at,
                'analysis_completed_at' => $result->analysis_completed_at,
                'is_printed' => $result->is_printed,
                'print_count' => $result->print_count,
                'last_printed_at' => $result->last_printed_at,
                'is_delivered' => $result->is_delivered,
                'delivery_method' => $result->delivery_method,
                'delivered_to' => $result->delivered_to,
                'is_abnormal' => $result->is_abnormal,
                'is_critical' => $result->is_critical,
                'created_at' => $result->created_at,
                'updated_at' => $result->updated_at,
            ];
            $formatted['has_result'] = true;
            $formatted['pdf_url'] = $result->pdf_file ? asset('storage/' . $result->pdf_file) : null;
        } else {
            $formatted['laboratory_result'] = null;
            $formatted['has_result'] = false;
            $formatted['pdf_url'] = null;
        }

        return $formatted;
    }

    /**
     * دریافت برچسب وضعیت درخواست
     */
    private function getRequestStatusLabel($status)
    {
        $labels = [
            'pending' => 'در انتظار',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده',
        ];
        return $labels[$status] ?? $status;
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
            'Delivered' => 'تحویل شده',
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
}