<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\RadiologyRequest;
use App\Models\Registrations;
use App\Models\RadiologyResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RadiologyRequestController extends Controller
{
    /**
     * دریافت همه درخواست‌های رادیولوژی یک مراجعه با نتایج کامل
     * GET /api/radiology-requests/registration/{regId}/full
     */
    public function getFullByRegistration($regId)
    {
        try {
            $registration = Registrations::with(['patient'])->find($regId);

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            // ✅ دریافت درخواست‌ها با نتیجه
            $radiologyRequests = RadiologyRequest::where('reg_id', $regId)
                ->with(['doctor', 'result']) // result رابطه را لود می‌کند
                ->orderBy('created_at', 'desc')
                ->get();

            // ساختاردهی داده‌ها با نتیجه
            $radiologyData = $radiologyRequests->map(function ($item) {
                $result = $item->result;
                
                return [
                    'id' => $item->id,
                    'reg_id' => $item->reg_id,
                    'radiology_type' => $item->radiology_type,
                    'radiology_type_label' => $item->radiology_type_label,
                    'body_part' => $item->body_part,
                    'reason' => $item->reason,
                    'notes' => $item->notes,
                    'priority' => $item->priority,
                    'priority_label' => $item->priority_label,
                    'request_date' => $item->request_date?->format('Y-m-d'),
                    'clinical_indication' => $item->clinical_indication,
                    'special_notes' => $item->special_notes,
                    'barcode' => $item->barcode,
                    'request_number' => $item->request_number,
                    'status' => $item->status,
                    'status_label' => $item->status_label,
                    'has_result' => $item->has_result,
                    'doctor' => $item->doctor ? [
                        'id' => $item->doctor->id,
                        'name' => $item->doctor->name,
                    ] : null,
                    // ✅ نتیجه کامل
                    'result_details' => $result ? [
                        'id' => $result->id,
                        'radiology_request_id' => $result->radiology_request_id,
                        'result' => $result->result,
                        'findings' => $result->findings,
                        'interpretation' => $result->interpretation,
                        'normal_range' => $result->normal_range,
                        'remarks' => $result->remarks,
                        'report_no' => $result->report_no,
                        'result_status' => $result->result_status,
                        'result_status_label' => $result->result_status_label,
                        'pdf_file' => $result->pdf_file,
                        'pdf_file_name' => $result->pdf_file_name,
                        'pdf_url' => $result->pdf_url,
                        'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                        'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
                    ] : null,
                    'created_at' => $item->created_at?->format('Y-m-d H:i:s'),
                ];
            });

            // ✅ بررسی وجود نتیجه در هر درخواست
            $hasResults = $radiologyData->some(function ($item) {
                return $item['has_result'] === true && $item['result_details'] !== null;
            });

            // ✅ استخراج نتایج برای نمایش جداگانه
            $resultsData = $radiologyData
                ->filter(function ($item) {
                    return $item['has_result'] === true && $item['result_details'] !== null;
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'registration' => [
                        'reg_id' => $registration->id,
                        'visit_number' => $registration->visit_number,
                        'barcode' => $registration->barcode,
                        'visit_status' => $registration->visit_status,
                    ],
                    'patient' => $registration->patient ? [
                        'id' => $registration->patient->id,
                        'first_name' => $registration->patient->first_name,
                        'last_name' => $registration->patient->last_name,
                        'national_id' => $registration->patient->national_id,
                        'mobile' => $registration->patient->mobile,
                        'gender' => $registration->patient->gender,
                        'age' => $registration->patient->age,
                    ] : null,
                    'all_radiology' => $radiologyData->toArray(),
                    'radiology' => $radiologyData->toArray(),
                    // ✅ نتایج جداگانه برای نمایش در جدول
                    'results' => $resultsData->toArray(),
                    'has_results' => $hasResults,
                    'total_results' => $resultsData->count(),
                    'barcode' => $registration->barcode,
                    'visit_number' => $registration->visit_number,
                    'visit_status' => $registration->visit_status,
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
     * دریافت یک درخواست خاص با نتیجه
     * GET /api/radiology-requests/{id}
     */
    public function show($id)
    {
        try {
            $radiology = RadiologyRequest::with(['doctor', 'registration.patient', 'result'])->find($id);

            if (!$radiology) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست رادیولوژی یافت نشد'
                ], 404);
            }

            $result = $radiology->result;

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $radiology->id,
                    'reg_id' => $radiology->reg_id,
                    'radiology_type' => $radiology->radiology_type,
                    'radiology_type_label' => $radiology->radiology_type_label,
                    'body_part' => $radiology->body_part,
                    'reason' => $radiology->reason,
                    'notes' => $radiology->notes,
                    'priority' => $radiology->priority,
                    'priority_label' => $radiology->priority_label,
                    'request_date' => $radiology->request_date?->format('Y-m-d'),
                    'clinical_indication' => $radiology->clinical_indication,
                    'special_notes' => $radiology->special_notes,
                    'barcode' => $radiology->barcode,
                    'request_number' => $radiology->request_number,
                    'status' => $radiology->status,
                    'status_label' => $radiology->status_label,
                    'has_result' => $radiology->has_result,
                    'doctor' => $radiology->doctor ? [
                        'id' => $radiology->doctor->id,
                        'name' => $radiology->doctor->name,
                    ] : null,
                    'patient' => $radiology->registration?->patient ? [
                        'first_name' => $radiology->registration->patient->first_name,
                        'last_name' => $radiology->registration->patient->last_name,
                        'national_id' => $radiology->registration->patient->national_id,
                    ] : null,
                    'result_details' => $result ? [
                        'id' => $result->id,
                        'result' => $result->result,
                        'findings' => $result->findings,
                        'interpretation' => $result->interpretation,
                        'normal_range' => $result->normal_range,
                        'remarks' => $result->remarks,
                        'report_no' => $result->report_no,
                        'result_status' => $result->result_status,
                        'result_status_label' => $result->result_status_label,
                        'pdf_file' => $result->pdf_file,
                        'pdf_file_name' => $result->pdf_file_name,
                        'pdf_url' => $result->pdf_url,
                        'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                        'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
                    ] : null,
                    'created_at' => $radiology->created_at?->format('Y-m-d H:i:s'),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت نتایج رادیولوژی یک مراجعه
     * GET /api/radiology-requests/registration/{regId}/results
     */
    public function getResultsByRegistration($regId)
    {
        try {
            $registration = Registrations::find($regId);

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $results = RadiologyResult::whereHas('radiologyRequest', function ($query) use ($regId) {
                $query->where('reg_id', $regId);
            })
            ->with(['radiologyRequest'])
            ->orderBy('created_at', 'desc')
            ->get();

            $formattedResults = $results->map(function ($result) {
                return [
                    'id' => $result->id,
                    'radiology_request_id' => $result->radiology_request_id,
                    'result' => $result->result,
                    'findings' => $result->findings,
                    'interpretation' => $result->interpretation,
                    'normal_range' => $result->normal_range,
                    'remarks' => $result->remarks,
                    'report_no' => $result->report_no,
                    'result_status' => $result->result_status,
                    'result_status_label' => $result->result_status_label,
                    'pdf_file' => $result->pdf_file,
                    'pdf_file_name' => $result->pdf_file_name,
                    'pdf_url' => $result->pdf_url,
                    'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                    'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
                    'radiology_type' => $result->radiologyRequest?->radiology_type,
                    'radiology_type_label' => $result->radiologyRequest?->radiology_type_label,
                    'body_part' => $result->radiologyRequest?->body_part,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedResults,
                'total' => $results->count(),
                'message' => 'نتایج رادیولوژی با موفقیت دریافت شد'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتایج: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست نتایج رادیولوژی یک بیمار
     * GET /api/radiology-requests/patient/{patientId}/results
     */
    public function getPatientResults($patientId)
    {
        try {
            $results = RadiologyResult::whereHas('radiologyRequest', function ($query) use ($patientId) {
                $query->where('patient_id', $patientId);
            })
            ->with(['radiologyRequest.registration', 'radiologyRequest.doctor'])
            ->orderBy('created_at', 'desc')
            ->get();

            $formattedResults = $results->map(function ($result) {
                return [
                    'id' => $result->id,
                    'result' => $result->result,
                    'findings' => $result->findings,
                    'interpretation' => $result->interpretation,
                    'normal_range' => $result->normal_range,
                    'remarks' => $result->remarks,
                    'report_no' => $result->report_no,
                    'result_status' => $result->result_status,
                    'result_status_label' => $result->result_status_label,
                    'pdf_url' => $result->pdf_url,
                    'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                    'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
                    'radiology_type' => $result->radiologyRequest?->radiology_type,
                    'radiology_type_label' => $result->radiologyRequest?->radiology_type_label,
                    'body_part' => $result->radiologyRequest?->body_part,
                    'visit_number' => $result->radiologyRequest?->registration?->visit_number,
                    'reg_id' => $result->radiologyRequest?->reg_id,
                    'request_date' => $result->radiologyRequest?->request_date?->format('Y-m-d'),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedResults,
                'total' => $results->count(),
                'message' => 'لیست نتایج بیمار با موفقیت دریافت شد'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت نتایج: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت درخواست جدید رادیولوژی
     * POST /api/radiology-requests/registration/{regId}
     */
    public function store(Request $request, $regId)
    {
        try {
            $registration = Registrations::find($regId);
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'radiology_type' => ['required', 'string', Rule::in([
                    'xray', 'chest_xray', 'abdominal_xray', 'spine_xray', 'extremity_xray',
                    'ct_scan', 'brain_ct', 'chest_ct', 'abdominal_ct', 'spine_ct',
                    'mri', 'brain_mri', 'spine_mri', 'joint_mri',
                    'ultrasound', 'pelvic_ultrasound', 'abdominal_ultrasound', 
                    'obstetric_ultrasound', 'vascular_ultrasound',
                    'fluoroscopy', 'mammography', 'angiography', 'echocardiography',
                    'pet_scan', 'bone_density', 'other'
                ])],
                'body_part' => ['required', 'string', 'max:255'],
                'reason' => ['required', 'string'],
                'notes' => ['nullable', 'string'],
                'priority' => ['required', 'string', Rule::in(['normal', 'urgent', 'emergency'])],
                'request_date' => ['nullable', 'date'],
                'clinical_indication' => ['nullable', 'string'],
                'special_notes' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی داده‌ها',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $radiology = new RadiologyRequest();
            $radiology->reg_id = $regId;
            $radiology->patient_id = $registration->patient_id;
            $radiology->doctor_id = $request->user()?->id ?? $registration->doctor_id;
            $radiology->radiology_type = $request->radiology_type;
            $radiology->body_part = $request->body_part;
            $radiology->reason = $request->reason;
            $radiology->notes = $request->notes;
            $radiology->priority = $request->priority;
            $radiology->request_date = $request->request_date ?? now();
            $radiology->clinical_indication = $request->clinical_indication;
            $radiology->special_notes = $request->special_notes;
            $radiology->barcode = $radiology->generateBarcode();
            $radiology->request_number = $radiology->generateRequestNumber();
            $radiology->status = 'pending';
            $radiology->save();

            DB::commit();

            $radiology->load(['doctor', 'result']);

            // دریافت لیست کامل برای بازگشت
            $allRadiology = RadiologyRequest::where('reg_id', $regId)
                ->with(['doctor', 'result'])
                ->orderBy('created_at', 'desc')
                ->get();

            $allData = $this->formatRadiologyList($allRadiology);
            $resultsData = $this->extractResults($allData);

            return response()->json([
                'success' => true,
                'message' => 'درخواست رادیولوژی با موفقیت ثبت شد',
                'data' => [
                    'radiology_request' => $this->formatSingleRadiology($radiology),
                    'all_radiology' => $allData,
                    'radiology' => $allData,
                    'results' => $resultsData,
                    'has_results' => count($resultsData) > 0,
                    'total_results' => count($resultsData),
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی درخواست رادیولوژی
     * PUT /api/radiology-requests/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $radiology = RadiologyRequest::find($id);
            if (!$radiology) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست رادیولوژی یافت نشد'
                ], 404);
            }

            if (!in_array($radiology->status, ['pending', 'draft'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست قابل ویرایش نیست زیرا در وضعیت "' . $radiology->status_label . '" قرار دارد'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'radiology_type' => ['required', 'string', Rule::in([
                    'xray', 'chest_xray', 'abdominal_xray', 'spine_xray', 'extremity_xray',
                    'ct_scan', 'brain_ct', 'chest_ct', 'abdominal_ct', 'spine_ct',
                    'mri', 'brain_mri', 'spine_mri', 'joint_mri',
                    'ultrasound', 'pelvic_ultrasound', 'abdominal_ultrasound', 
                    'obstetric_ultrasound', 'vascular_ultrasound',
                    'fluoroscopy', 'mammography', 'angiography', 'echocardiography',
                    'pet_scan', 'bone_density', 'other'
                ])],
                'body_part' => ['required', 'string', 'max:255'],
                'reason' => ['required', 'string'],
                'notes' => ['nullable', 'string'],
                'priority' => ['required', 'string', Rule::in(['normal', 'urgent', 'emergency'])],
                'request_date' => ['nullable', 'date'],
                'clinical_indication' => ['nullable', 'string'],
                'special_notes' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی داده‌ها',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $radiology->radiology_type = $request->radiology_type;
            $radiology->body_part = $request->body_part;
            $radiology->reason = $request->reason;
            $radiology->notes = $request->notes;
            $radiology->priority = $request->priority;
            $radiology->request_date = $request->request_date ?? $radiology->request_date;
            $radiology->clinical_indication = $request->clinical_indication;
            $radiology->special_notes = $request->special_notes;
            $radiology->save();

            DB::commit();

            $radiology->load(['doctor', 'result']);

            // دریافت لیست کامل برای بازگشت
            $allRadiology = RadiologyRequest::where('reg_id', $radiology->reg_id)
                ->with(['doctor', 'result'])
                ->orderBy('created_at', 'desc')
                ->get();

            $allData = $this->formatRadiologyList($allRadiology);
            $resultsData = $this->extractResults($allData);

            return response()->json([
                'success' => true,
                'message' => 'درخواست رادیولوژی با موفقیت ویرایش شد',
                'data' => [
                    'radiology_request' => $this->formatSingleRadiology($radiology),
                    'all_radiology' => $allData,
                    'radiology' => $allData,
                    'results' => $resultsData,
                    'has_results' => count($resultsData) > 0,
                    'total_results' => count($resultsData),
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ویرایش درخواست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف درخواست رادیولوژی
     * DELETE /api/radiology-requests/{id}
     */
    public function destroy($id)
    {
        try {
            $radiology = RadiologyRequest::find($id);
            if (!$radiology) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست رادیولوژی یافت نشد'
                ], 404);
            }

            if ($radiology->has_result) {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست دارای نتیجه است و قابل حذف نمی‌باشد'
                ], 403);
            }

            if (!in_array($radiology->status, ['pending', 'draft'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست قابل حذف نیست زیرا در وضعیت "' . $radiology->status_label . '" قرار دارد'
                ], 403);
            }

            DB::beginTransaction();

            $regId = $radiology->reg_id;
            $radiology->delete();

            DB::commit();

            // دریافت لیست کامل برای بازگشت
            $allRadiology = RadiologyRequest::where('reg_id', $regId)
                ->with(['doctor', 'result'])
                ->orderBy('created_at', 'desc')
                ->get();

            $allData = $this->formatRadiologyList($allRadiology);
            $resultsData = $this->extractResults($allData);

            return response()->json([
                'success' => true,
                'message' => 'درخواست رادیولوژی با موفقیت حذف شد',
                'data' => [
                    'all_radiology' => $allData,
                    'radiology' => $allData,
                    'results' => $resultsData,
                    'has_results' => count($resultsData) > 0,
                    'total_results' => count($resultsData),
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف درخواست: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * تغییر وضعیت درخواست
     * PATCH /api/radiology-requests/{id}/status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $radiology = RadiologyRequest::find($id);
            if (!$radiology) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست رادیولوژی یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => ['required', 'string', Rule::in([
                    'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rejected', 'sent_to_radiology'
                ])],
                'scheduled_date' => ['nullable', 'date'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی داده‌ها',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $radiology->status = $request->status;
            
            if ($request->status === 'scheduled' && $request->scheduled_date) {
                $radiology->scheduled_date = $request->scheduled_date;
            }

            if ($request->status === 'completed') {
                $radiology->performed_date = now();
            }

            $radiology->save();

            DB::commit();

            $radiology->load(['doctor', 'result']);

            return response()->json([
                'success' => true,
                'message' => 'وضعیت درخواست با موفقیت تغییر یافت',
                'data' => [
                    'id' => $radiology->id,
                    'status' => $radiology->status,
                    'status_label' => $radiology->status_label,
                    'scheduled_date' => $radiology->scheduled_date?->format('Y-m-d H:i:s'),
                    'performed_date' => $radiology->performed_date?->format('Y-m-d H:i:s'),
                    'has_result' => $radiology->has_result,
                    'result' => $radiology->result ? [
                        'id' => $radiology->result->id,
                        'result' => $radiology->result->result,
                        'result_status' => $radiology->result->result_status,
                        'result_status_label' => $radiology->result->result_status_label,
                        'pdf_url' => $radiology->result->pdf_url,
                    ] : null,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در تغییر وضعیت: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت درخواست‌های رادیولوژی یک مراجعه (ساده)
     */
    public function getByRegistration($regId)
    {
        try {
            $registration = Registrations::find($regId);
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $radiologyRequests = RadiologyRequest::where('reg_id', $regId)
                ->with(['doctor', 'result'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $this->formatRadiologyList($radiologyRequests);

            return response()->json([
                'success' => true,
                'data' => $data,
                'registration' => [
                    'reg_id' => $registration->id,
                    'visit_number' => $registration->visit_number,
                    'barcode' => $registration->barcode,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==================== متدهای کمکی ====================

    /**
     * فرمت کردن لیست درخواست‌های رادیولوژی
     */
    private function formatRadiologyList($radiologyRequests)
    {
        return $radiologyRequests->map(function ($item) {
            $result = $item->result;
            
            return [
                'id' => $item->id,
                'reg_id' => $item->reg_id,
                'radiology_type' => $item->radiology_type,
                'radiology_type_label' => $item->radiology_type_label,
                'body_part' => $item->body_part,
                'reason' => $item->reason,
                'notes' => $item->notes,
                'priority' => $item->priority,
                'priority_label' => $item->priority_label,
                'request_date' => $item->request_date?->format('Y-m-d'),
                'clinical_indication' => $item->clinical_indication,
                'special_notes' => $item->special_notes,
                'barcode' => $item->barcode,
                'request_number' => $item->request_number,
                'status' => $item->status,
                'status_label' => $item->status_label,
                'has_result' => $item->has_result,
                'doctor' => $item->doctor ? [
                    'id' => $item->doctor->id,
                    'name' => $item->doctor->name,
                ] : null,
                'result_details' => $result ? [
                    'id' => $result->id,
                    'radiology_request_id' => $result->radiology_request_id,
                    'result' => $result->result,
                    'findings' => $result->findings,
                    'interpretation' => $result->interpretation,
                    'normal_range' => $result->normal_range,
                    'remarks' => $result->remarks,
                    'report_no' => $result->report_no,
                    'result_status' => $result->result_status,
                    'result_status_label' => $result->result_status_label,
                    'pdf_file' => $result->pdf_file,
                    'pdf_file_name' => $result->pdf_file_name,
                    'pdf_url' => $result->pdf_url,
                    'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                    'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
                ] : null,
                'created_at' => $item->created_at?->format('Y-m-d H:i:s'),
            ];
        })->toArray();
    }

    /**
     * فرمت کردن یک درخواست رادیولوژی
     */
    private function formatSingleRadiology($radiology)
    {
        $result = $radiology->result;
        
        return [
            'id' => $radiology->id,
            'reg_id' => $radiology->reg_id,
            'radiology_type' => $radiology->radiology_type,
            'radiology_type_label' => $radiology->radiology_type_label,
            'body_part' => $radiology->body_part,
            'reason' => $radiology->reason,
            'notes' => $radiology->notes,
            'priority' => $radiology->priority,
            'priority_label' => $radiology->priority_label,
            'request_date' => $radiology->request_date?->format('Y-m-d'),
            'clinical_indication' => $radiology->clinical_indication,
            'special_notes' => $radiology->special_notes,
            'barcode' => $radiology->barcode,
            'request_number' => $radiology->request_number,
            'status' => $radiology->status,
            'status_label' => $radiology->status_label,
            'has_result' => $radiology->has_result,
            'doctor' => $radiology->doctor ? [
                'id' => $radiology->doctor->id,
                'name' => $radiology->doctor->name,
            ] : null,
            'result_details' => $result ? [
                'id' => $result->id,
                'result' => $result->result,
                'findings' => $result->findings,
                'interpretation' => $result->interpretation,
                'normal_range' => $result->normal_range,
                'remarks' => $result->remarks,
                'report_no' => $result->report_no,
                'result_status' => $result->result_status,
                'result_status_label' => $result->result_status_label,
                'pdf_file' => $result->pdf_file,
                'pdf_file_name' => $result->pdf_file_name,
                'pdf_url' => $result->pdf_url,
                'analysis_completed_at' => $result->analysis_completed_at?->format('Y-m-d H:i:s'),
                'created_at' => $result->created_at?->format('Y-m-d H:i:s'),
            ] : null,
            'created_at' => $radiology->created_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * استخراج نتایج از لیست درخواست‌ها
     */
    private function extractResults($radiologyData)
    {
        return collect($radiologyData)
            ->filter(function ($item) {
                return $item['has_result'] === true && $item['result_details'] !== null;
            })
            ->map(function ($item) {
                return $item['result_details'];
            })
            ->values()
            ->toArray();
    }
}