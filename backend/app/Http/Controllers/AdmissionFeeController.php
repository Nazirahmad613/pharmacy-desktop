<?php
// app/Http/Controllers/AdmissionFeeController.php

namespace App\Http\Controllers;

use App\Models\AdmissionFee;
use App\Models\AdmissionRequest;
use App\Models\Patient;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdmissionFeeController extends Controller
{
    /**
     * دریافت لیست فیس‌های بستری
     */
    public function index(Request $request)
    {
        try {
            $query = AdmissionFee::with([
                'patient', 
                'admissionRequest.ward',
                'admissionRequest.bed',
                'admissionRequest.patient',
                'admissionRequest.doctor',
                'collector', 
                'doctor', 
                'registration'
            ]);

            if ($request->has('patient_id')) {
                $query->where('patient_id', $request->patient_id);
            }

            if ($request->has('admission_request_id')) {
                $query->where('admission_request_id', $request->admission_request_id);
            }

            if ($request->has('reg_id')) {
                $query->where('reg_id', $request->reg_id);
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('from_date')) {
                $query->whereDate('fee_date', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('fee_date', '<=', $request->to_date);
            }

            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

            if ($request->has('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('receipt_number', 'like', "%{$search}%")
                      ->orWhereHas('patient', function($p) use ($search) {
                          $p->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('mobile', 'like', "%{$search}%")
                            ->orWhere('national_id', 'like', "%{$search}%");
                      });
                });
            }

            $fees = $query->orderBy('created_at', 'desc')->get();

            $stats = [
                'total' => AdmissionFee::count(),
                'pending' => AdmissionFee::where('status', 'pending')->count(),
                'paid' => AdmissionFee::where('status', 'paid')->count(),
                'total_amount' => AdmissionFee::sum('amount'),
                'paid_amount' => AdmissionFee::where('status', 'paid')->sum('amount'),
                'pending_amount' => AdmissionFee::where('status', 'pending')->sum('amount'),
                'remaining_amount' => AdmissionFee::sum('remaining_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $fees,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error in index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست فیس‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت فیس بستری جدید
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'admission_request_id' => 'required|exists:admission_requests,id',
            'patient_id' => 'required|exists:patients,id',
            'amount' => 'required|numeric|min:0.01',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'fee_type' => 'required|in:daily,weekly,monthly,custom',
            'period' => 'nullable|in:morning,evening,night,full_day',
            'day_number' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
            'payment_method' => 'required|in:cash,card,bank_transfer,insurance,online',
            'fee_date' => 'required|date',
            'fee_time' => 'required|date_format:H:i'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $admission = AdmissionRequest::with(['registration'])
                ->find($request->admission_request_id);
                
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            if ($admission->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'نمی‌توان برای درخواست لغو شده فیس ثبت کرد'
                ], 400);
            }

            $regId = $admission->reg_id;
            if (!$regId) {
                return response()->json([
                    'success' => false,
                    'message' => 'شناسه مراجعه برای این درخواست بستری یافت نشد'
                ], 400);
            }

            $doctorId = $admission->doctor_id;

            $amount = (float) $request->amount;
            $paidAmount = (float) ($request->paid_amount ?? 0);
            
            $discountPercent = (float) ($request->discount_percent ?? 0);
            $manualDiscount = (float) ($request->discount ?? 0);
            
            if ($discountPercent > 0) {
                $discountAmount = ($amount * $discountPercent) / 100;
            } else {
                $discountAmount = $manualDiscount;
                if ($manualDiscount > 0 && $amount > 0) {
                    $discountPercent = round(($manualDiscount / $amount) * 100, 2);
                }
            }
            
            $remainingAmount = max(0, $amount - $discountAmount - $paidAmount);

            $status = 'pending';
            $collectedBy = null;
            $collectedAt = null;

            if ($remainingAmount <= 0 && $paidAmount > 0) {
                $status = 'paid';
                $collectedBy = auth()->id();
                $collectedAt = now();
            }

            $receiptNumber = 'FEE-' . date('Ymd') . '-' . str_pad(AdmissionFee::count() + 1, 6, '0', STR_PAD_LEFT);

            $fee = AdmissionFee::create([
                'admission_request_id' => $request->admission_request_id,
                'patient_id' => $request->patient_id,
                'reg_id' => $regId,
                'doctor_id' => $doctorId,
                'fee_date' => $request->fee_date,
                'fee_time' => $request->fee_time,
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'remaining_amount' => $remainingAmount,
                'fee_type' => $request->fee_type,
                'period' => $request->period ?? 'full_day',
                'day_number' => $request->day_number ?? 1,
                'description' => $request->description,
                'notes' => $request->notes,
                'receipt_number' => $receiptNumber,
                'payment_method' => $request->payment_method,
                'status' => $status,
                'collected_by' => $collectedBy,
                'collected_at' => $collectedAt
            ]);

            // ✅ ثبت خودکار در ژورنال
            $this->syncJournalEntry($fee);

            DB::commit();

            $fee->load(['patient', 'admissionRequest.ward', 'collector', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت ثبت شد',
                'data' => $fee
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در ایجاد فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $fee = AdmissionFee::with([
                'patient', 
                'admissionRequest.ward',
                'admissionRequest.bed',
                'admissionRequest.patient',
                'admissionRequest.doctor',
                'admissionRequest.dischargedBy',
                'collector', 
                'doctor', 
                'registration'
            ])->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس بستری یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            Log::error('Error in show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی فیس بستری
     */
    public function update(Request $request, $id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'این فیس قبلاً پرداخت شده است و قابل ویرایش نمی‌باشد'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'sometimes|numeric|min:0.01',
            'paid_amount' => 'sometimes|numeric|min:0',
            'discount' => 'sometimes|numeric|min:0',
            'discount_percent' => 'sometimes|numeric|min:0|max:100',
            'fee_type' => 'sometimes|in:daily,weekly,monthly,custom',
            'period' => 'nullable|in:morning,evening,night,full_day',
            'day_number' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
            'payment_method' => 'sometimes|in:cash,card,bank_transfer,insurance,online',
            'fee_date' => 'sometimes|date',
            'fee_time' => 'sometimes|date_format:H:i'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $amount = (float) ($request->amount ?? $fee->amount);
            $paidAmount = (float) ($request->paid_amount ?? $fee->paid_amount);
            
            if ($request->has('discount_percent')) {
                $discountPercent = (float) $request->discount_percent;
                $discountAmount = ($amount * $discountPercent) / 100;
            } elseif ($request->has('discount')) {
                $discountAmount = (float) $request->discount;
                $discountPercent = $amount > 0 ? round(($discountAmount / $amount) * 100, 2) : 0;
            } else {
                $discountAmount = (float) ($fee->discount ?? 0);
                $discountPercent = (float) ($fee->discount_percent ?? 0);
            }

            $remainingAmount = max(0, $amount - $discountAmount - $paidAmount);

            $status = $fee->status;
            $collectedBy = $fee->collected_by;
            $collectedAt = $fee->collected_at;

            if ($remainingAmount <= 0 && $paidAmount > 0) {
                $status = 'paid';
                $collectedBy = $collectedBy ?? auth()->id();
                $collectedAt = $collectedAt ?? now();
            } elseif ($remainingAmount > 0 && $fee->status === 'paid') {
                $status = 'pending';
                $collectedBy = null;
                $collectedAt = null;
            }

            $updateData = [
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discountAmount,
                'discount_percent' => $discountPercent,
                'remaining_amount' => $remainingAmount,
                'status' => $status,
                'collected_by' => $collectedBy,
                'collected_at' => $collectedAt,
            ];

            if ($request->has('fee_type')) $updateData['fee_type'] = $request->fee_type;
            if ($request->has('period')) $updateData['period'] = $request->period;
            if ($request->has('day_number')) $updateData['day_number'] = $request->day_number;
            if ($request->has('description')) $updateData['description'] = $request->description;
            if ($request->has('notes')) $updateData['notes'] = $request->notes;
            if ($request->has('payment_method')) $updateData['payment_method'] = $request->payment_method;
            if ($request->has('fee_date')) $updateData['fee_date'] = $request->fee_date;
            if ($request->has('fee_time')) $updateData['fee_time'] = $request->fee_time;

            $fee->update($updateData);

            // ✅ بروزرسانی خودکار ژورنال
            $this->syncJournalEntry($fee);

            DB::commit();

            $fee->load(['patient', 'admissionRequest.ward', 'collector', 'doctor', 'registration']);

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت به‌روزرسانی شد',
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در به‌روزرسانی فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت فیس (تغییر وضعیت به paid)
     */
    public function collectFee($id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        if ($fee->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'این فیس قبلاً دریافت شده است'
            ], 400);
        }

        $admission = $fee->admissionRequest;
        if ($admission && $admission->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'نمی‌توان فیس درخواست لغو شده را دریافت کرد'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $discountAmount = (float) ($fee->discount ?? 0);
            $remainingAmount = max(0, $fee->amount - $fee->paid_amount - $discountAmount);

            if ($remainingAmount <= 0) {
                $fee->update([
                    'status' => 'paid',
                    'collected_by' => auth()->id(),
                    'collected_at' => now(),
                    'remaining_amount' => 0,
                ]);
            } else {
                $newPaidAmount = $fee->paid_amount + $remainingAmount;
                $fee->update([
                    'paid_amount' => $newPaidAmount,
                    'remaining_amount' => 0,
                    'status' => 'paid',
                    'collected_by' => auth()->id(),
                    'collected_at' => now(),
                ]);
            }

            // ✅ بروزرسانی خودکار ژورنال پس از دریافت فیس
            $this->syncJournalEntry($fee->fresh());

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت دریافت شد',
                'data' => $fee->fresh([
                    'patient', 
                    'admissionRequest.ward', 
                    'collector', 
                    'doctor'
                ])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در دریافت فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس بستری
     */
    public function destroy($id)
    {
        $fee = AdmissionFee::find($id);

        if (!$fee) {
            return response()->json([
                'success' => false,
                'message' => 'فیس بستری یافت نشد'
            ], 404);
        }

        try {
            DB::beginTransaction();

            // ✅ حذف اثر ژورنال مرتبط
            $this->removeJournalEntry($fee);

            $fee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس بستری با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('خطا در حذف فیس بستری:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPatientFees($patientId, Request $request)
    {
        try {
            $patient = Patient::find($patientId);
            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار یافت نشد'
                ], 404);
            }

            $query = AdmissionFee::with([
                'admissionRequest.ward',
                'admissionRequest.bed',
                'collector', 
                'doctor'
            ])
            ->where('patient_id', $patientId);

            if ($request->has('admission_request_id')) {
                $query->where('admission_request_id', $request->admission_request_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $fees = $query->orderBy('created_at', 'desc')->get();

            $statistics = [
                'total_fees' => $fees->count(),
                'total_amount' => $fees->sum('amount'),
                'paid_amount' => $fees->where('status', 'paid')->sum('amount'),
                'pending_amount' => $fees->where('status', 'pending')->sum('amount'),
                'remaining_amount' => $fees->sum('remaining_amount'),
                'total_paid' => $fees->where('status', 'paid')->count(),
                'total_pending' => $fees->where('status', 'pending')->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'patient' => $patient,
                    'fees' => $fees,
                    'statistics' => $statistics
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getPatientFees: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌های بیمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAdmissionFees($admissionId)
    {
        try {
            $admission = AdmissionRequest::with(['patient', 'ward', 'bed', 'doctor'])
                ->find($admissionId);
                
            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری یافت نشد'
                ], 404);
            }

            $fees = AdmissionFee::with(['collector', 'doctor', 'patient', 'admissionRequest.ward'])
                ->where('admission_request_id', $admissionId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'admission' => $admission,
                    'fees' => $fees,
                    'total_amount' => $fees->sum('amount'),
                    'paid_amount' => $fees->where('status', 'paid')->sum('amount'),
                    'pending_amount' => $fees->where('status', 'pending')->sum('amount'),
                    'remaining_amount' => $fees->sum('remaining_amount'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getAdmissionFees: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌های بستری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPendingFeesForAlert()
    {
        try {
            $pendingFees = AdmissionFee::with([
                'patient', 
                'admissionRequest.ward',
                'admissionRequest.bed',
                'admissionRequest.patient',
                'collector', 
                'doctor'
            ])
                ->where('status', 'pending')
                ->where('remaining_amount', '>', 0)
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function ($fee) {
                    $admission = $fee->admissionRequest;
                    return [
                        'id' => $fee->id,
                        'admission_request_id' => $fee->admission_request_id,
                        'fee_id' => $fee->id,
                        'patient_id' => $fee->patient_id,
                        'patient' => $fee->patient,
                        'patient_name' => $fee->patient?->full_name ?? 
                                         (($fee->patient?->first_name ?? '') . ' ' . ($fee->patient?->last_name ?? '')),
                        'ward_name' => $admission?->ward?->name,
                        'location' => $admission?->location,
                        'room_number' => $admission?->room_number,
                        'bed_number' => $admission?->bed_number ?? $admission?->bed?->bed_number,
                        'admission_date' => $admission?->admission_date,
                        'fee_date' => $fee->fee_date,
                        'fee_amount' => $fee->amount,
                        'paid_amount' => $fee->paid_amount,
                        'discount' => $fee->discount,
                        'remaining_amount' => $fee->remaining_amount,
                        'last_fee_alert_at' => $admission?->last_fee_alert_at,
                        'fee_alert_count' => $admission?->fee_alert_count,
                        'created_at' => $fee->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $pendingFees,
                'count' => $pendingFees->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getPendingFeesForAlert: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت هشدارها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function printReceipt($id)
    {
        try {
            $fee = AdmissionFee::with([
                'patient', 
                'admissionRequest.ward',
                'admissionRequest.bed',
                'admissionRequest.patient',
                'admissionRequest.doctor',
                'admissionRequest.dischargedBy',
                'collector', 
                'doctor', 
                'registration'
            ])->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس بستری یافت نشد'
                ], 404);
            }

            $fee->increment('print_count');
            $fee->update(['last_printed_at' => now()]);

            $admission = $fee->admissionRequest;

            $receiptData = [
                'hospital_name' => config('app.name', 'بیمارستان'),
                'hospital_address' => config('app.address', ''),
                'hospital_phone' => config('app.phone', ''),

                'fee' => [
                    'id' => $fee->id,
                    'receipt_number' => $fee->receipt_number,
                    'fee_date' => $fee->fee_date,
                    'fee_time' => $fee->fee_time,
                    'amount' => $fee->amount,
                    'paid_amount' => $fee->paid_amount,
                    'discount' => $fee->discount,
                    'discount_percent' => $fee->discount_percent,
                    'remaining_amount' => $fee->remaining_amount,
                    'payment_method' => $fee->payment_method,
                    'status' => $fee->status,
                    'description' => $fee->description,
                    'day_number' => $fee->day_number,
                    'fee_type' => $fee->fee_type,
                    'period' => $fee->period,
                    'print_count' => $fee->print_count,
                ],

                'patient' => $fee->patient ? [
                    'id' => $fee->patient->id,
                    'full_name' => $fee->patient->full_name ?? 
                                  (($fee->patient->first_name ?? '') . ' ' . ($fee->patient->last_name ?? '')),
                    'first_name' => $fee->patient->first_name,
                    'last_name' => $fee->patient->last_name,
                    'national_id' => $fee->patient->national_id,
                    'mobile' => $fee->patient->mobile ?? $fee->patient->phone,
                    'phone' => $fee->patient->phone ?? $fee->patient->mobile,
                    'age' => $fee->patient->age,
                    'gender' => $fee->patient->gender,
                ] : null,

                'admission' => $admission ? [
                    'id' => $admission->id,
                    'admission_date' => $admission->admission_date,
                    'ward' => $admission->ward ? [
                        'id' => $admission->ward->id,
                        'name' => $admission->ward->name,
                    ] : null,
                    'ward_name' => $admission->ward?->name,
                    'bed' => $admission->bed ? [
                        'id' => $admission->bed->id,
                        'bed_number' => $admission->bed->bed_number,
                    ] : null,
                    'bed_number' => $admission->bed_number ?? $admission->bed?->bed_number,
                    'room_number' => $admission->room_number,
                    'location' => $admission->location,
                    'diagnosis' => $admission->diagnosis,
                ] : null,

                'collector' => $fee->collector ? [
                    'id' => $fee->collector->id,
                    'name' => $fee->collector->name,
                ] : null,

                'print_date' => now()->format('Y/m/d H:i'),
            ];

            return response()->json([
                'success' => true,
                'data' => $receiptData
            ]);

        } catch (\Exception $e) {
            Log::error('Error in printReceipt: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در آماده‌سازی پرینت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function incrementPrint($id)
    {
        try {
            $fee = AdmissionFee::findOrFail($id);
            $fee->increment('print_count');
            $fee->update(['last_printed_at' => now()]);

            return response()->json([
                'success' => true,
                'data' => [
                    'print_count' => $fee->print_count,
                    'last_printed_at' => $fee->last_printed_at,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی شمارنده پرینت',
            ], 500);
        }
    }

    public function getFeeStatistics(Request $request)
    {
        try {
            $query = AdmissionFee::query();

            if ($request->has('from_date')) {
                $query->whereDate('fee_date', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('fee_date', '<=', $request->to_date);
            }
            if ($request->has('doctor_id')) {
                $query->where('doctor_id', $request->doctor_id);
            }

            $statistics = [
                'total_fees' => $query->count(),
                'total_amount' => $query->sum('amount'),
                'paid_amount' => (clone $query)->where('status', 'paid')->sum('amount'),
                'pending_amount' => (clone $query)->where('status', 'pending')->sum('amount'),
                'remaining_amount' => $query->sum('remaining_amount'),
                'total_paid' => (clone $query)->where('status', 'paid')->count(),
                'total_pending' => (clone $query)->where('status', 'pending')->count(),
                'by_payment_method' => [
                    'cash' => (clone $query)->where('payment_method', 'cash')->count(),
                    'card' => (clone $query)->where('payment_method', 'card')->count(),
                    'bank_transfer' => (clone $query)->where('payment_method', 'bank_transfer')->count(),
                    'insurance' => (clone $query)->where('payment_method', 'insurance')->count(),
                    'online' => (clone $query)->where('payment_method', 'online')->count()
                ],
                'by_fee_type' => [
                    'daily' => (clone $query)->where('fee_type', 'daily')->count(),
                    'weekly' => (clone $query)->where('fee_type', 'weekly')->count(),
                    'monthly' => (clone $query)->where('fee_type', 'monthly')->count(),
                    'custom' => (clone $query)->where('fee_type', 'custom')->count()
                ],
                'today' => (clone $query)->whereDate('fee_date', today())->count(),
                'today_amount' => (clone $query)->whereDate('fee_date', today())->sum('amount')
            ];

            return response()->json([
                'success' => true,
                'data' => $statistics
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getFeeStatistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function storeForRegistration(Request $request, $regId)
    {
        try {
            $admission = AdmissionRequest::where('reg_id', $regId)
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$admission) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست بستری برای این مراجعه یافت نشد'
                ], 404);
            }

            $request->merge(['admission_request_id' => $admission->id]);

            return $this->store($request);

        } catch (\Exception $e) {
            Log::error('Error in storeForRegistration: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /* ============================================================
     *  متدهای کمکی ژورنال (Journal Sync)
     * ============================================================ */

    /**
     * ثبت یا بروزرسانی خودکار سند حسابداری در ژورنال
     *
     * @param AdmissionFee $fee
     * @return void
     */
    protected function syncJournalEntry(AdmissionFee $fee): void
    {
        if (!class_exists(\App\Models\JournalEntry::class)) {
            return;
        }

        try {
            $amount        = (float) $fee->amount;
            $paidAmount    = (float) $fee->paid_amount;
            $discount      = (float) $fee->discount;
            $remaining     = (float) $fee->remaining_amount;
            $paymentMethod = $fee->payment_method;

            // تعیین حساب بدهکار بر اساس روش پرداخت
            $debitAccount = match ($paymentMethod) {
                'cash'           => 'صندوق',
                'card'           => 'بانک - کارتخوان',
                'online'         => 'بانک - درگاه آنلاین',
                'bank_transfer'  => 'بانک - حواله',
                'insurance'      => 'بیمه - مطالبات',
                default          => 'صندوق',
            };

            $creditAccount = 'درآمد بستری';

            $description = sprintf(
                'فیس بستری - رسید %s - بیمار %s',
                $fee->receipt_number ?? ('#' . $fee->id),
                $fee->patient ? trim(($fee->patient->first_name ?? '') . ' ' . ($fee->patient->last_name ?? '')) : 'نامشخص'
            );

            $journal = \App\Models\JournalEntry::where('reference_type', AdmissionFee::class)
                ->where('reference_id', $fee->id)
                ->first();

            $data = [
                'reference_type'   => AdmissionFee::class,
                'reference_id'     => $fee->id,
                'reg_id'           => $fee->reg_id,
                'patient_id'       => $fee->patient_id,
                'doctor_id'        => $fee->doctor_id,
                'created_by'       => $fee->collected_by,
                'entry_date'       => $fee->fee_date ?? now()->toDateString(),
                'debit_account'    => $debitAccount,
                'credit_account'   => $creditAccount,
                'amount'           => $amount,
                'discount'         => $discount,
                'paid_amount'      => $paidAmount,
                'remaining_amount' => $remaining,
                'payment_method'   => $paymentMethod,
                'payment_status'   => $fee->status,
                'description'      => $description,
                'barcode'          => $fee->barcode ?? null,
                'receipt_number'   => $fee->receipt_number,
                'source'           => 'admission_fee',
            ];

            if ($journal) {
                $journal->update($data);
            } else {
                \App\Models\JournalEntry::create($data);
            }
        } catch (\Throwable $e) {
            Log::warning('Journal sync failed for AdmissionFee #' . $fee->id . ': ' . $e->getMessage());
        }
    }

    /**
     * حذف سند ژورنال مرتبط با فیس حذف‌شده
     *
     * @param AdmissionFee $fee
     * @return void
     */
    protected function removeJournalEntry(AdmissionFee $fee): void
    {
        if (!class_exists(\App\Models\JournalEntry::class)) {
            return;
        }

        try {
            \App\Models\JournalEntry::where('reference_type', AdmissionFee::class)
                ->where('reference_id', $fee->id)
                ->delete();
        } catch (\Throwable $e) {
            Log::warning('Journal remove failed for AdmissionFee #' . $fee->id . ': ' . $e->getMessage());
        }
    }
}