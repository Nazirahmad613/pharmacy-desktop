<?php
// app/Http/Controllers/AdmissionRequestController.php

namespace App\Http\Controllers;

use App\Models\AdmissionRequest;
use App\Models\AdmissionFee;
use App\Models\Patient;
use App\Models\Registrations;
use App\Models\Ward;
use App\Models\Bed;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdmissionRequestController extends Controller
{
    /**
     * دریافت تمام درخواست‌های بستری با اطلاعات کامل
     * این متد برای تب مدیریت فیس‌های بستری استفاده می‌شود
     */
    public function getAllRequests(Request $request)
    {
        try {
            // دریافت تمام درخواست‌های بستری (شامل ترخیص شده‌ها)
            $query = AdmissionRequest::with([
                'patient',
                'doctor',
                'ward',
                'bed',
                'dischargedBy',
                'fees' => function($q) {
                    $q->select('id', 'admission_request_id', 'amount', 'status', 'paid_amount', 
                               'payment_method', 'discount', 'discount_percent', 'remaining_amount', 
                               'created_at')
                      ->orderBy('created_at', 'desc');
                }
            ])
            ->orderBy('created_at', 'desc');

            // فیلتر بر اساس بخش
            if ($request->has('ward_id') && $request->ward_id) {
                $query->where('ward_id', $request->ward_id);
            }

            // فیلتر بر اساس پزشک
            if ($request->has('doctor_id') && $request->doctor_id) {
                $query->where('doctor_id', $request->doctor_id);
            }

            // فیلتر بر اساس وضعیت
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // جستجو
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->whereHas('patient', function($p) use ($search) {
                        $p->where('first_name', 'like', "%{$search}%")
                          ->orWhere('last_name', 'like', "%{$search}%")
                          ->orWhere('mobile', 'like', "%{$search}%")
                          ->orWhere('national_id', 'like', "%{$search}%");
                    })
                    ->orWhere('reg_id', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");
                });
            }

            $requests = $query->get();

            // پردازش هر درخواست
            $allRequests = [];
            $unpaidRequests = [];
            $paidRequests = [];
            $dischargedRequests = [];

            foreach ($requests as $requestItem) {
                $hasFee = $requestItem->fees->count() > 0;
                $lastFee = $requestItem->fees->first();
                
                // تشخیص ترخیص
                $isDischarged = $requestItem->status === 'discharged' 
                                || $requestItem->discharge_date !== null 
                                || $requestItem->discharged_at !== null;

                $requestData = [
                    'id' => $requestItem->id,
                    'reg_id' => $requestItem->reg_id,
                    'patient_id' => $requestItem->patient_id,
                    'doctor_id' => $requestItem->doctor_id,
                    'ward_id' => $requestItem->ward_id,
                    'ward_name' => $requestItem->ward?->name,
                    'bed_id' => $requestItem->bed_id,
                    'bed_number' => $requestItem->bed_number ?? $requestItem->bed?->bed_number,
                    'location' => $requestItem->location,
                    'room_number' => $requestItem->room_number,
                    
                    // تاریخ‌ها
                    'admission_date' => $requestItem->admission_date,
                    'admission_type' => $requestItem->admission_type,
                    'request_date' => $requestItem->request_date,
                    'created_at' => $requestItem->created_at,
                    'updated_at' => $requestItem->updated_at,
                    
                    // ============ فیلدهای ترخیص ============
                    'is_discharged' => $isDischarged,
                    'discharge_date' => $requestItem->discharge_date,
                    'discharge_time' => $requestItem->discharge_time,
                    'discharge_type' => $requestItem->discharge_type,
                    'discharge_reason' => $requestItem->discharge_reason,
                    'discharge_notes' => $requestItem->discharge_notes,
                    'discharged_by' => $requestItem->dischargedBy?->name,
                    'discharged_by_user_id' => $requestItem->discharged_by_user_id,
                    'discharged_at' => $requestItem->discharged_at,
                    'cancelled_at' => $requestItem->cancelled_at,
                    'completed_at' => $requestItem->completed_at,
                    
                    // اطلاعات بالینی
                    'diagnosis' => $requestItem->diagnosis,
                    'admission_instructions' => $requestItem->admission_instructions,
                    'special_notes' => $requestItem->special_notes,
                    'status' => $requestItem->status,
                    'status_label' => $this->getStatusLabel($requestItem->status),
                    'priority' => $requestItem->priority,
                    'priority_label' => $this->getPriorityLabel($requestItem->priority),
                    
                    // هشدار فیس
                    'last_fee_alert_at' => $requestItem->last_fee_alert_at,
                    'fee_alert_count' => $requestItem->fee_alert_count,
                    
                    // اطلاعات بیمار
                    'patient' => $requestItem->patient ? [
                        'id' => $requestItem->patient->id,
                        'first_name' => $requestItem->patient->first_name,
                        'last_name' => $requestItem->patient->last_name,
                        'full_name' => $requestItem->patient->full_name ?? 
                                      (($requestItem->patient->first_name ?? '') . ' ' . ($requestItem->patient->last_name ?? '')),
                        'mobile' => $requestItem->patient->mobile,
                        'phone' => $requestItem->patient->phone,
                        'national_id' => $requestItem->patient->national_id,
                        'gender' => $requestItem->patient->gender,
                        'age' => $requestItem->patient->age,
                        'address' => $requestItem->patient->address,
                    ] : null,
                    'patient_name' => $requestItem->patient?->full_name ?? 
                                     (($requestItem->patient?->first_name ?? '') . ' ' . ($requestItem->patient?->last_name ?? '')),
                    
                    // اطلاعات پزشک
                    'doctor' => $requestItem->doctor ? [
                        'id' => $requestItem->doctor->id,
                        'name' => $requestItem->doctor->name,
                        'email' => $requestItem->doctor->email,
                    ] : null,
                    'doctor_name' => $requestItem->doctor?->name,
                    
                    // اطلاعات بخش
                    'ward' => $requestItem->ward ? [
                        'id' => $requestItem->ward->id,
                        'name' => $requestItem->ward->name,
                        'type' => $requestItem->ward->type,
                    ] : null,
                    
                    // اطلاعات فیس
                    'has_fee' => $hasFee,
                    'fee_id' => $lastFee?->id,
                    'fee_amount' => $lastFee?->amount,
                    'fee_status' => $lastFee?->status,
                    'fee_paid_amount' => $lastFee?->paid_amount,
                    'fee_remaining_amount' => $lastFee?->remaining_amount,
                    'fee_payment_method' => $lastFee?->payment_method,
                    'fee_discount' => $lastFee?->discount,
                    'fee_discount_percent' => $lastFee?->discount_percent,
                    'fee_created_at' => $lastFee?->created_at,
                    
                    // مجموع فیس‌ها
                    'total_fees_count' => $requestItem->fees->count(),
                    'paid_fees_count' => $requestItem->fees->where('status', 'paid')->count(),
                    'pending_fees_count' => $requestItem->fees->where('status', 'pending')->count(),
                    
                    'total_fees_amount' => $requestItem->fees->sum('amount'),
                    'paid_fees_amount' => $requestItem->fees->where('status', 'paid')->sum('amount'),
                    'pending_fees_amount' => $requestItem->fees->where('status', 'pending')->sum('amount'),
                    'remaining_fees_amount' => $requestItem->fees->sum('remaining_amount'),
                ];

                $allRequests[] = $requestData;

                // دسته‌بندی
                if ($isDischarged) {
                    $dischargedRequests[] = $requestData;
                } elseif ($hasFee) {
                    $paidRequests[] = $requestData;
                } else {
                    $unpaidRequests[] = $requestData;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $allRequests,
                    'unpaid_requests' => $unpaidRequests,
                    'paid_requests' => $paidRequests,
                    'discharged_requests' => $dischargedRequests,
                    'total_count' => count($allRequests),
                    'unpaid_count' => count($unpaidRequests),
                    'paid_count' => count($paidRequests),
                    'discharged_count' => count($dischargedRequests),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAllRequests: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌های بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش لیست تمام درخواست‌های بستری
     */
    public function index(Request $request)
    {
        $query = AdmissionRequest::with(['patient', 'ward', 'doctor', 'bed', 'dischargedBy', 'fees', 'registration']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('patient', function($p) use ($search) {
                    $p->where('full_name', 'like', "%{$search}%")
                      ->orWhere('national_id', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('mobile', 'like', "%{$search}%");
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
     * ذخیره درخواست بستری جدید (از تب معالجه)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'reg_id' => 'required|exists:registrations,reg_id',
            'ward_id' => 'required|exists:wards,id',
            'admission_date' => 'required|date',
            'admission_type' => 'nullable|in:emergency,planned,elective,transfer',
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

            $registration = Registrations::with(['patient', 'doctor'])
                ->where('reg_id', $request->reg_id)
                ->first();

            if (!$registration) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $patientId = $registration->patient_id ?? $registration->patient?->id;
            if (!$patientId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار یافت نشد'
                ], 404);
            }

            $doctorId = $request->user()?->id ?? $registration->doctor_id ?? $registration->doctor?->id;
            if (!$doctorId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'پزشک یافت نشد'
                ], 404);
            }

            $diagnosis = $request->diagnosis ?? ($registration->diagnosis ?? null);

            $ward = Ward::find($request->ward_id);
            if (!$ward) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'بخش یافت نشد'
                ], 404);
            }

            if ($ward->available_beds <= 0) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'در این بخش تخت خالی وجود ندارد'
                ], 400);
            }
            $ward->decrement('available_beds');

            $admission = AdmissionRequest::create([
                'reg_id' => $request->reg_id,
                'patient_id' => $patientId,
                'doctor_id' => $doctorId,
                'ward_id' => $request->ward_id,
                'admission_date' => $request->admission_date,
                'admission_type' => $request->admission_type ?? 'emergency',
                'request_date' => now(),
                'diagnosis' => $diagnosis,
                'admission_instructions' => $request->admission_instructions,
                'special_notes' => $request->special_notes,
                'status' => 'admitted',
                'priority' => $request->priority ?? 'normal'
            ]);

            if ($registration) {
                $registration->update(['visit_status' => 'Admission']);
            }

            DB::commit();

            $admission->load(['patient', 'ward', 'doctor', 'registration', 'bed', 'dischargedBy']);

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت ثبت شد',
                'data' => $admission
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ثبت درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست بستری: ' . $e->getMessage()
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
            'bed',
            'registration',
            'dischargedBy',
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
     * (استفاده می‌شود برای انتقال بیمار به بخش دیگر)
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
            'admission_instructions' => 'nullable|string',
            'special_notes' => 'nullable|string',
            'priority' => 'sometimes|in:high,medium,normal,low',
            'diagnosis' => 'nullable|string|max:500',
            'transfer_reason' => 'nullable|string|max:500',
            'transfer_notes' => 'nullable|string|max:500',
            'new_ward_name' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $isTransferring = $request->has('ward_id') && $request->ward_id != $admission->ward_id;

            if ($isTransferring) {
                // افزایش تخت‌های بخش قبلی
                $oldWard = Ward::find($admission->ward_id);
                if ($oldWard) {
                    $oldWard->increment('available_beds');
                }
                
                // کاهش تخت‌های بخش جدید
                $newWard = Ward::find($request->ward_id);
                if (!$newWard) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'بخش جدید یافت نشد'
                    ], 404);
                }
                
                if ($newWard->available_beds <= 0) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'در بخش جدید تخت خالی وجود ندارد'
                    ], 400);
                }
                $newWard->decrement('available_beds');

                // ثبت در special_notes که انتقال انجام شده
                $transferNote = "\n\n=== انتقال به بخش {$newWard->name} در " . now()->format('Y/m/d H:i') . " ===";
                if ($request->transfer_reason) {
                    $transferNote .= "\nدلیل: {$request->transfer_reason}";
                }
                if ($request->transfer_notes) {
                    $transferNote .= "\nیادداشت: {$request->transfer_notes}";
                }
                
                $admission->update([
                    'ward_id' => $request->ward_id,
                    'bed_id' => null, // تخت جدید بعداً اختصاص می‌یابد
                    'bed_number' => null,
                    'room_number' => null,
                    'location' => null,
                    'special_notes' => ($admission->special_notes ?? '') . $transferNote,
                ]);

                // لاگ انتقال
                Log::info('Patient transferred', [
                    'admission_id' => $admission->id,
                    'from_ward' => $oldWard?->name,
                    'to_ward' => $newWard->name,
                    'reason' => $request->transfer_reason,
                    'user_id' => auth()->id(),
                ]);
            }

            // به‌روزرسانی سایر فیلدها
            $updateData = [];
            if ($request->has('admission_instructions')) {
                $updateData['admission_instructions'] = $request->admission_instructions;
            }
            if ($request->has('priority')) {
                $updateData['priority'] = $request->priority;
            }
            if ($request->has('diagnosis')) {
                $updateData['diagnosis'] = $request->diagnosis;
            }
            if (!$isTransferring && $request->has('special_notes')) {
                $updateData['special_notes'] = $request->special_notes;
            }

            if (!empty($updateData)) {
                $admission->update($updateData);
            }

            DB::commit();

            $admission->load(['patient', 'ward', 'doctor', 'registration', 'bed', 'dischargedBy']);

            return response()->json([
                'success' => true,
                'message' => $isTransferring 
                    ? 'بیمار با موفقیت به بخش جدید منتقل شد' 
                    : 'اطلاعات بستری با موفقیت به‌روزرسانی شد',
                'data' => $admission
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در به‌روزرسانی درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی اطلاعات بستری: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ترخیص بیمار (توسط بخش فیس)
     * این متد حالا فیلدهای ترخیص را ذخیره می‌کند
     */
    public function discharge(Request $request, $id)
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

        // اعتبارسنجی فیلدهای ترخیص
        $validator = Validator::make($request->all(), [
            'discharge_date' => 'nullable|date',
            'discharge_time' => 'nullable|date_format:H:i',
            'discharge_type' => 'nullable|in:regular,against_advice,transferred,deceased,escaped',
            'discharge_reason' => 'nullable|string|max:1000',
            'discharge_notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $dischargeDate = $request->discharge_date ?? now()->toDateString();
            $dischargeTime = $request->discharge_time ?? now()->format('H:i');

            // به‌روزرسانی تمام فیلدهای ترخیص
            $admission->update([
                'status' => 'discharged',
                'discharge_date' => $dischargeDate,
                'discharge_time' => $dischargeTime,
                'discharge_type' => $request->discharge_type ?? 'regular',
                'discharge_reason' => $request->discharge_reason,
                'discharge_notes' => $request->discharge_notes,
                'discharged_by_user_id' => auth()->id(),
                'discharged_at' => now(),
            ]);

            // افزایش تخت‌های موجود در بخش
            if ($admission->ward_id) {
                Ward::find($admission->ward_id)?->increment('available_beds');
            }

            // آزاد کردن تخت
            if ($admission->bed_id) {
                Bed::where('id', $admission->bed_id)->update([
                    'status' => 'available',
                ]);
            }

            // به‌روزرسانی وضعیت مراجعه
            if ($admission->reg_id) {
                Registrations::where('reg_id', $admission->reg_id)
                    ->update(['visit_status' => 'Discharged']);
            }

            // ثبت لاگ
            Log::info('Admission discharged', [
                'admission_id' => $admission->id,
                'reg_id' => $admission->reg_id,
                'discharged_by' => auth()->id(),
                'type' => $admission->discharge_type,
            ]);

            DB::commit();

            $admission->load(['patient', 'ward', 'doctor', 'bed', 'dischargedBy']);

            return response()->json([
                'success' => true,
                'message' => 'بیمار با موفقیت ترخیص شد',
                'data' => [
                    'admission' => $admission,
                    'can_complete_treatment' => true,
                    'is_discharged' => true,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ترخیص بیمار:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
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

            if ($admission->status === 'admitted') {
                Ward::find($admission->ward_id)?->increment('available_beds');
                
                if ($admission->bed_id) {
                    Bed::where('id', $admission->bed_id)->update(['status' => 'available']);
                }
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
            Log::error('خطا در لغو درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
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

            if ($admission->status === 'admitted') {
                Ward::find($admission->ward_id)?->increment('available_beds');
                
                if ($admission->bed_id) {
                    Bed::where('id', $admission->bed_id)->update(['status' => 'available']);
                }
            }

            $admission->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'درخواست بستری با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در حذف درخواست بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
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
        $admissions = AdmissionRequest::with(['patient', 'ward', 'doctor', 'bed', 'registration'])
            ->where('status', 'admitted')
            ->whereNull('discharge_date')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $admissions
        ]);
    }

    /**
     * دریافت وضعیت بستری برای یک مراجعه خاص
     * این متد برای صفحه داکتر (Admission.jsx) حیاتی است
     */
    public function getAdmissionStatus($regId)
    {
        try {
            // آخرین درخواست بستری این مراجعه را بگیر (چه ترخیص شده چه نه)
            $admission = AdmissionRequest::with(['ward', 'doctor', 'bed', 'dischargedBy'])
                ->where('reg_id', $regId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$admission) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'is_admitted' => false,
                        'is_discharged' => false,
                        'admission_id' => null,
                        'status' => 'none',
                    ]
                ]);
            }

            // تشخیص ترخیص
            $isDischarged = $admission->status === 'discharged' 
                            || $admission->discharge_date !== null 
                            || $admission->discharged_at !== null;

            $isAdmitted = $admission->status === 'admitted' && !$isDischarged;

            return response()->json([
                'success' => true,
                'data' => [
                    'admission_id' => $admission->id,
                    'status' => $admission->status,
                    'is_admitted' => $isAdmitted,
                    'is_discharged' => $isDischarged, // ⭐ مهم برای Frontend
                    
                    // اطلاعات بیمار
                    'reg_id' => $admission->reg_id,
                    'patient_id' => $admission->patient_id,
                    'patient' => $admission->patient,
                    'patient_name' => $admission->patient?->full_name ?? 
                                     (($admission->patient?->first_name ?? '') . ' ' . ($admission->patient?->last_name ?? '')),
                    
                    // اطلاعات بستری
                    'ward_id' => $admission->ward_id,
                    'ward_name' => $admission->ward?->name,
                    'ward' => $admission->ward,
                    'bed_id' => $admission->bed_id,
                    'bed_number' => $admission->bed_number ?? $admission->bed?->bed_number,
                    'location' => $admission->location,
                    'room_number' => $admission->room_number,
                    
                    'admission_date' => $admission->admission_date,
                    'admission_type' => $admission->admission_type,
                    'diagnosis' => $admission->diagnosis,
                    'admission_instructions' => $admission->admission_instructions,
                    'special_notes' => $admission->special_notes,
                    'priority' => $admission->priority,
                    'doctor_id' => $admission->doctor_id,
                    'doctor_name' => $admission->doctor?->name,
                    
                    // ============ فیلدهای ترخیص ============
                    'discharge_date' => $admission->discharge_date,
                    'discharge_time' => $admission->discharge_time,
                    'discharge_type' => $admission->discharge_type,
                    'discharge_reason' => $admission->discharge_reason,
                    'discharge_notes' => $admission->discharge_notes,
                    'discharged_by' => $admission->dischargedBy?->name,
                    'discharged_at' => $admission->discharged_at,
                    
                    // وضعیت فیس
                    'fee_status' => $this->getFeeStatus($admission->id),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAdmissionStatus: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت وضعیت بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار بستری
     */
    public function getStatistics()
    {
        $statistics = [
            'total_admissions' => AdmissionRequest::count(),
            'active_admissions' => AdmissionRequest::where('status', 'admitted')
                ->whereNull('discharge_date')
                ->count(),
            'pending_admissions' => AdmissionRequest::where('status', 'pending')->count(),
            'discharged_today' => AdmissionRequest::whereDate('discharge_date', today())
                ->where('status', 'discharged')
                ->count(),
            'total_discharged' => AdmissionRequest::where('status', 'discharged')->count(),
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
        $admission = AdmissionRequest::with(['patient', 'ward', 'doctor', 'bed', 'fees', 'dischargedBy'])
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
            'bed' => $admission->bed,
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

        $admissions = AdmissionRequest::with(['ward', 'doctor', 'bed', 'fees', 'dischargedBy'])
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
     * این متد بعد از ترخیص کار می‌کند
     */
    public function completeTreatment($regId)
    {
        try {
            // پیدا کردن آخرین درخواست بستری این مراجعه
            $admission = AdmissionRequest::where('reg_id', $regId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری برای این بیمار یافت نشد'
                ], 404);
            }

            // بررسی اینکه بیمار ترخیص شده است
            $isDischarged = $admission->status === 'discharged' 
                            || $admission->discharge_date !== null;

            if (!$isDischarged) {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار هنوز ترخیص نشده است. لطفاً ابتدا ترخیص را انجام دهید.'
                ], 400);
            }

            // ثبت زمان تکمیل
            $admission->update([
                'completed_at' => now(),
            ]);

            // به‌روزرسانی وضعیت مراجعه
            Registrations::where('reg_id', $regId)
                ->update(['visit_status' => 'Completed']);

            return response()->json([
                'success' => true,
                'message' => 'معالجه با موفقیت تکمیل شد',
                'data' => $admission
            ]);

        } catch (\Exception $e) {
            Log::error('Error in completeTreatment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در تکمیل معالجه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی اطلاعات فیس در درخواست
     */
    public function updateFeeInfo(Request $request, $id)
    {
        try {
            $admission = AdmissionRequest::find($id);
            
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'total_amount' => 'nullable|numeric|min:0',
                'paid_amount' => 'nullable|numeric|min:0',
                'payment_status' => 'nullable|in:pending,partial,paid',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $admission->update($request->only(['total_amount', 'paid_amount', 'payment_status']));

            return response()->json([
                'success' => true,
                'message' => 'اطلاعات فیس با موفقیت به‌روزرسانی شد',
                'data' => $admission
            ]);

        } catch (\Exception $e) {
            Log::error('Error in updateFeeInfo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی اطلاعات فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ============ Helper Methods ============

    private function getStatusLabel($status)
    {
        $labels = [
            'pending' => 'در انتظار',
            'admitted' => 'بستری',
            'discharged' => 'ترخیص شده',
            'cancelled' => 'لغو شده',
            'completed' => 'معالجه ختم شده',
        ];
        return $labels[$status] ?? $status;
    }

    private function getPriorityLabel($priority)
    {
        $labels = [
            'high' => 'بالا',
            'medium' => 'متوسط',
            'normal' => 'معمولی',
            'low' => 'پایین',
        ];
        return $labels[$priority] ?? $priority;
    }

    private function getFeeStatus($admissionId)
    {
        $fees = AdmissionFee::where('admission_request_id', $admissionId)->get();
        
        if ($fees->isEmpty()) return 'unpaid';
        
        $totalAmount = $fees->sum('amount');
        $paidAmount = $fees->where('status', 'paid')->sum('amount');
        
        if ($paidAmount >= $totalAmount && $totalAmount > 0) return 'paid';
        if ($paidAmount > 0) return 'partial';
        return 'unpaid';
    }
}