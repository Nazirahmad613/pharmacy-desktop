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
     * دریافت درخواست‌های لابراتوار با نتایج
     * ============================================================
     */
    public function getRequestsWithResults(Request $request)
    {
        try {
            $query = LaboratoryRequest::with([
                'patient',
                'registration',
                'doctor',
                'result'  // ← رابطه با LaboratoryResult
            ]);

            if ($request->filled('registration_id')) {
                $query->where('reg_id', $request->registration_id);
            }

            if ($request->filled('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            $query->whereHas('fee');

            $requests = $query
                ->orderByDesc('created_at')
                ->get();

            $formattedRequests = $requests->map(function ($request) {
                return $this->formatRequestWithResult($request);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedRequests,
                'message' => 'درخواست‌های لابراتوار با نتایج دریافت شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('خطا در دریافت درخواست‌ها با نتایج', [
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
     * لیست نتایج لابراتوار
     * ============================================================
     */
    public function index(Request $request)
    {
        try {
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
            Log::error('خطا در دریافت نتایج لابراتوار', [
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
     * ثبت نتیجه جدید (کامل با تمام اطلاعات)
     * ============================================================
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'laboratory_request_id' => ['required', 'exists:laboratory_requests,id'],
            'registration_id' => ['required', 'exists:registrations,reg_id'],
            'patient_id' => ['required', 'exists:patients,id'],
            'result_status' => ['required', 'in:Draft,Completed,Verified,Delivered,Cancelled'],
            
            // نتیجه اصلی
            'result' => ['nullable', 'string'],
            'normal_range' => ['nullable', 'string'],
            'interpretation' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            
            // فایل
            'pdf_file' => ['nullable', 'string'],
            'pdf_file_name' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            // تولید شماره گزارش یکتا
            $reportNo = 'LAB' . Carbon::now()->format('Ymd') . strtoupper(Str::random(6));

            $result = LaboratoryResult::create([
                'laboratory_request_id' => $request->laboratory_request_id,
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'report_no' => $reportNo,
                'result_status' => $request->result_status ?? 'Draft',
                
                // نتیجه اصلی
                'result' => $request->result,
                'normal_range' => $request->normal_range,
                'interpretation' => $request->interpretation,
                'remarks' => $request->remarks,
                'recommendation' => $request->recommendation,
                
                // فایل
                'pdf_file' => $request->pdf_file,
                'pdf_file_name' => $request->pdf_file_name,
                
                // تاریخ‌ها
                'sample_received_at' => now(),
                'analysis_started_at' => now(),
                'analysis_completed_at' => $request->result_status === 'Completed' ? now() : null,
            ]);

            // به‌روزرسانی وضعیت درخواست اصلی
            $laboratoryRequest = LaboratoryRequest::find($request->laboratory_request_id);
            if ($laboratoryRequest) {
                $laboratoryRequest->status = 'completed';
                $laboratoryRequest->result_date = now();
                $laboratoryRequest->save();
            }

            DB::commit();

            // بارگذاری روابط
            $result->load([
                'patient',
                'registration',
                'laboratoryRequest'
            ]);

            return response()->json([
                'success' => true,
                'data' => $this->formatResultData($result),
                'message' => 'نتیجه لابراتوار با موفقیت ثبت شد'
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('خطا در ثبت نتیجه لابراتوار', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت نتیجه لابراتوار',
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
        $validator = Validator::make($request->all(), [
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'laboratory_request_id' => ['required', 'exists:laboratory_requests,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('pdf_file');
            $originalName = $file->getClientOriginalName();
            $fileName = 'lab_result_' . time() . '_' . Str::random(8) . '.pdf';
            $path = $file->storeAs('laboratory_results', $fileName, 'public');

            return response()->json([
                'success' => true,
                'data' => [
                    'pdf_url' => asset('storage/' . $path),
                    'pdf_file_name' => $originalName,
                    'pdf_path' => $path,
                ],
                'message' => 'فایل PDF با موفقیت آپلود شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('خطا در آپلود PDF', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در آپلود فایل PDF',
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
            $result = LaboratoryResult::with([
                'patient',
                'registration',
                'laboratoryRequest'
            ])->find($id);

            if (!$result) {
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
            Log::error('خطا در نمایش نتیجه', [
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
    public function update(Request $request, $id)
    {
        try {
            $result = LaboratoryResult::find($id);

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'نتیجه یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'result_status' => ['nullable', 'in:Draft,Completed,Verified,Delivered,Cancelled'],
                'result' => ['nullable', 'string'],
                'normal_range' => ['nullable', 'string'],
                'interpretation' => ['nullable', 'string'],
                'remarks' => ['nullable', 'string'],
                'recommendation' => ['nullable', 'string'],
                'pdf_file' => ['nullable', 'string'],
                'pdf_file_name' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            try {
                $result->update($request->only([
                    'result_status',
                    'result',
                    'normal_range',
                    'interpretation',
                    'remarks',
                    'recommendation',
                    'pdf_file',
                    'pdf_file_name',
                ]));

                if ($request->result_status === 'Completed' && !$result->analysis_completed_at) {
                    $result->analysis_completed_at = now();
                    $result->save();
                }

                DB::commit();

                $result->load([
                    'patient',
                    'registration',
                    'laboratoryRequest'
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
            Log::error('خطا در ویرایش نتیجه', [
                'id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ویرایش نتیجه',
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
            $result = LaboratoryResult::find($id);

            if (!$result) {
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
                }
            }

            $result->delete();

            return response()->json([
                'success' => true,
                'message' => 'نتیجه با موفقیت حذف شد'
            ], 200);

        } catch (\Throwable $e) {
            Log::error('خطا در حذف نتیجه', [
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
     * فرمت کردن داده‌های نتیجه با تمام جزئیات
     */
    private function formatResultData($result)
    {
        return [
            // اطلاعات نتیجه
            'id' => $result->id,
            'laboratory_request_id' => $result->laboratory_request_id,
            'report_no' => $result->report_no,
            'result_status' => $result->result_status,
            'status_label' => $result->status_label,
            
            // نتیجه اصلی
            'result' => $result->result,
            'normal_range' => $result->normal_range,
            'interpretation' => $result->interpretation,
            'remarks' => $result->remarks,
            'recommendation' => $result->recommendation,
            
            // فایل
            'pdf_file' => $result->pdf_file,
            'pdf_file_name' => $result->pdf_file_name,
            'pdf_url' => $result->pdf_url,
            
            // اطلاعات بیمار (کامل)
            'patient' => $result->patient ? [
                'id' => $result->patient->id,
                'first_name' => $result->patient->first_name,
                'last_name' => $result->patient->last_name,
                'full_name' => $result->patient_full_name,
                'mobile' => $result->patient->mobile,
                'email' => $result->patient->email,
                'age' => $result->patient->age,
                'gender' => $result->patient->gender,
                'national_id' => $result->patient->national_id,
                'address' => $result->patient->address,
            ] : null,
            
            // اطلاعات مراجعه
            'registration' => $result->registration ? [
                'reg_id' => $result->registration->reg_id,
                'visit_number' => $result->registration->visit_number,
                'visit_date' => $result->registration->visit_date,
            ] : null,
            
            // اطلاعات تست
            'test' => $result->laboratoryRequest ? [
                'id' => $result->laboratoryRequest->id,
                'test_type' => $result->laboratoryRequest->test_type,
                'test_type_label' => $result->laboratoryRequest->test_type_label,
                'test_name' => $result->laboratoryRequest->test_name,
                'test_description' => $result->laboratoryRequest->test_description,
                'clinical_indication' => $result->laboratoryRequest->clinical_indication,
                'special_notes' => $result->laboratoryRequest->special_notes,
                'barcode' => $result->laboratoryRequest->barcode,
            ] : null,
            
            // تاریخ‌ها
            'sample_received_at' => $result->sample_received_at,
            'analysis_started_at' => $result->analysis_started_at,
            'analysis_completed_at' => $result->analysis_completed_at,
            'created_at' => $result->created_at,
            'updated_at' => $result->updated_at,
            
            // وضعیت‌ها
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
     * فرمت کردن درخواست با نتیجه
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
                'national_id' => $request->patient->national_id,
            ];
        }

        // اطلاعات مراجعه
        if ($request->registration) {
            $formatted['registration'] = [
                'reg_id' => $request->registration->reg_id,
                'visit_number' => $request->registration->visit_number,
            ];
        }

        // اطلاعات داکتر
        if ($request->doctor) {
            $formatted['doctor'] = [
                'id' => $request->doctor->id,
                'name' => $request->doctor->name,
            ];
        }

        // نتیجه (با تمام جزئیات)
        if ($result) {
            $formatted['laboratory_result'] = $this->formatResultData($result);
            $formatted['has_result'] = true;
        } else {
            $formatted['laboratory_result'] = null;
            $formatted['has_result'] = false;
        }

        return $formatted;
    }
}