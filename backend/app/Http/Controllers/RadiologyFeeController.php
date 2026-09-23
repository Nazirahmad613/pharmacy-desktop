<?php

namespace App\Http\Controllers;

use App\Models\RadiologyFee;
use App\Models\RadiologyRequest;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RadiologyFeeController extends Controller
{
    /**
     * دریافت همه فیس‌های رادیولوژی
     * GET /api/radiology-fees
     */
    public function index()
    {
        try {
            $fees = RadiologyFee::with(['registration', 'radiologyRequest', 'creator'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $fees->map(function ($fee) {
                return [
                    'id' => $fee->id,
                    'reg_id' => $fee->reg_id,
                    'radiology_request_id' => $fee->radiology_request_id,
                    'amount' => $fee->amount,
                    'paid_amount' => $fee->paid_amount,
                    'discount' => $fee->discount,
                    'remaining_amount' => $fee->remaining_amount,
                    'payment_method' => $fee->payment_method,
                    'payment_method_label' => $fee->method_label,
                    'payment_status' => $fee->payment_status,
                    'payment_status_label' => $fee->payment_status_label,
                    'payment_status_color' => $fee->payment_status_color,
                    'description' => $fee->description,
                    'note' => $fee->note,
                    'barcode' => $fee->barcode,
                    'receipt_number' => $fee->receipt_number,
                    'paid_date' => $fee->paid_date?->format('Y-m-d H:i:s'),
                    'created_at' => $fee->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $fee->updated_at?->format('Y-m-d H:i:s'),
                    'patient' => $fee->patient ? [
                        'id' => $fee->patient->id,
                        'first_name' => $fee->patient->first_name,
                        'last_name' => $fee->patient->last_name,
                        'mobile' => $fee->patient->mobile,
                    ] : null,
                    'radiology_request' => $fee->radiologyRequest ? [
                        'id' => $fee->radiologyRequest->id,
                        'radiology_type' => $fee->radiologyRequest->radiology_type,
                        'radiology_type_label' => $fee->radiologyRequest->radiology_type_label,
                        'body_part' => $fee->radiologyRequest->body_part,
                        'barcode' => $fee->radiologyRequest->barcode,
                    ] : null,
                    'registration' => $fee->registration ? [
                        'id' => $fee->registration->id,
                        'visit_number' => $fee->registration->visit_number,
                        'barcode' => $fee->registration->barcode,
                    ] : null,
                    'creator' => $fee->creator ? [
                        'id' => $fee->creator->id,
                        'name' => $fee->creator->name,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس‌ها: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت همه درخواست‌های رادیولوژی با وضعیت فیس (همه مراجعات)
     * GET /api/radiology-fees/all-requests
     */
    public function getAllRequests()
    {
        try {
            $requests = RadiologyRequest::with(['patient', 'registration'])
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $requests->map(function ($request) {
                $fee = RadiologyFee::where('radiology_request_id', $request->id)->first();
                $hasFee = $fee !== null;
                
                return [
                    'id' => $request->id,
                    'reg_id' => $request->reg_id,
                    'radiology_type' => $request->radiology_type,
                    'radiology_type_label' => $request->radiology_type_label,
                    'body_part' => $request->body_part,
                    'reason' => $request->reason,
                    'priority' => $request->priority,
                    'priority_label' => $request->priority_label,
                    'barcode' => $request->barcode,
                    'status' => $request->status,
                    'status_label' => $request->status_label,
                    'has_fee' => $hasFee,
                    'fee_id' => $fee ? $fee->id : null,
                    'fee' => $fee ? [
                        'id' => $fee->id,
                        'amount' => $fee->amount,
                        'paid_amount' => $fee->paid_amount,
                        'discount' => $fee->discount,
                        'remaining_amount' => $fee->remaining_amount,
                        'payment_method' => $fee->payment_method,
                        'payment_method_label' => $fee->method_label,
                        'payment_status' => $fee->payment_status,
                        'payment_status_label' => $fee->payment_status_label,
                    ] : null,
                    'patient' => $request->patient ? [
                        'id' => $request->patient->id,
                        'first_name' => $request->patient->first_name,
                        'last_name' => $request->patient->last_name,
                        'mobile' => $request->patient->mobile,
                        'age' => $request->patient->age,
                        'gender' => $request->patient->gender,
                    ] : null,
                    'registration' => $request->registration ? [
                        'id' => $request->registration->id,
                        'visit_number' => $request->registration->visit_number,
                        'barcode' => $request->registration->barcode,
                    ] : null,
                    'request_date' => $request->request_date?->format('Y-m-d'),
                    'created_at' => $request->created_at?->format('Y-m-d H:i:s'),
                ];
            });

            $unpaid = $data->filter(fn($r) => !$r['has_fee'])->values();
            $paid = $data->filter(fn($r) => $r['has_fee'])->values();

            $grouped = $data->groupBy('reg_id')->map(function ($items, $regId) {
                $first = $items->first();
                return [
                    'reg_id' => $regId,
                    'patient_name' => ($first['patient']['first_name'] ?? '') . ' ' . ($first['patient']['last_name'] ?? ''),
                    'count' => $items->count(),
                    'has_fee' => $items->some(fn($r) => $r['has_fee']),
                    'requests' => $items,
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'all_requests' => $data,
                    'unpaid_requests' => $unpaid,
                    'paid_requests' => $paid,
                    'grouped_by_reg_id' => $grouped,
                    'total_requests' => $data->count(),
                    'total_unpaid' => $unpaid->count(),
                    'total_paid' => $paid->count(),
                    'total_registrations' => $grouped->count(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت درخواست‌ها: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت اطلاعات کامل برای یک مراجعه با فیس‌های رادیولوژی
     * GET /api/radiology-fees/registration/{regId}
     */
    public function getByRegistration($regId)
    {
        try {
            $registration = Registrations::with(['patient'])->find($regId);
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'مراجعه یافت نشد'
                ], 404);
            }

            $radiologyRequests = RadiologyRequest::where('reg_id', $regId)
                ->with(['patient'])
                ->orderBy('created_at', 'desc')
                ->get();

            $fees = RadiologyFee::where('reg_id', $regId)
                ->with(['radiologyRequest'])
                ->orderBy('created_at', 'desc')
                ->get();

            $requestsData = $radiologyRequests->map(function ($request) {
                $fee = RadiologyFee::where('radiology_request_id', $request->id)->first();
                $hasFee = $fee !== null;
                
                return [
                    'id' => $request->id,
                    'reg_id' => $request->reg_id,
                    'radiology_type' => $request->radiology_type,
                    'radiology_type_label' => $request->radiology_type_label,
                    'body_part' => $request->body_part,
                    'reason' => $request->reason,
                    'priority' => $request->priority,
                    'priority_label' => $request->priority_label,
                    'barcode' => $request->barcode,
                    'status' => $request->status,
                    'status_label' => $request->status_label,
                    'has_fee' => $hasFee,
                    'fee_id' => $fee ? $fee->id : null,
                    'fee' => $fee ? [
                        'id' => $fee->id,
                        'amount' => $fee->amount,
                        'paid_amount' => $fee->paid_amount,
                        'discount' => $fee->discount,
                        'remaining_amount' => $fee->remaining_amount,
                        'payment_method' => $fee->payment_method,
                        'payment_method_label' => $fee->method_label,
                        'payment_status' => $fee->payment_status,
                        'payment_status_label' => $fee->payment_status_label,
                        'description' => $fee->description,
                        'barcode' => $fee->barcode,
                        'receipt_number' => $fee->receipt_number,
                    ] : null,
                    'patient' => $request->patient ? [
                        'id' => $request->patient->id,
                        'first_name' => $request->patient->first_name,
                        'last_name' => $request->patient->last_name,
                        'mobile' => $request->patient->mobile,
                        'age' => $request->patient->age,
                        'gender' => $request->patient->gender,
                    ] : null,
                    'created_at' => $request->created_at?->format('Y-m-d H:i:s'),
                ];
            });

            $feesData = $fees->map(function ($fee) {
                return [
                    'id' => $fee->id,
                    'radiology_request_id' => $fee->radiology_request_id,
                    'amount' => $fee->amount,
                    'paid_amount' => $fee->paid_amount,
                    'discount' => $fee->discount,
                    'remaining_amount' => $fee->remaining_amount,
                    'payment_method' => $fee->payment_method,
                    'payment_method_label' => $fee->method_label,
                    'payment_status' => $fee->payment_status,
                    'payment_status_label' => $fee->payment_status_label,
                    'description' => $fee->description,
                    'note' => $fee->note,
                    'barcode' => $fee->barcode,
                    'receipt_number' => $fee->receipt_number,
                    'paid_date' => $fee->paid_date?->format('Y-m-d H:i:s'),
                    'created_at' => $fee->created_at?->format('Y-m-d H:i:s'),
                    'radiology_request' => $fee->radiologyRequest ? [
                        'id' => $fee->radiologyRequest->id,
                        'radiology_type' => $fee->radiologyRequest->radiology_type,
                        'radiology_type_label' => $fee->radiologyRequest->radiology_type_label,
                        'body_part' => $fee->radiologyRequest->body_part,
                        'barcode' => $fee->radiologyRequest->barcode,
                    ] : null,
                ];
            });

            $unpaidRequests = $requestsData->filter(fn($r) => !$r['has_fee'])->values();
            $paidRequests = $requestsData->filter(fn($r) => $r['has_fee'])->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'registration' => [
                        'reg_id' => $registration->id,
                        'visit_number' => $registration->visit_number,
                        'barcode' => $registration->barcode,
                    ],
                    'patient' => $registration->patient ? [
                        'id' => $registration->patient->id,
                        'first_name' => $registration->patient->first_name,
                        'last_name' => $registration->patient->last_name,
                        'mobile' => $registration->patient->mobile,
                        'age' => $registration->patient->age,
                        'gender' => $registration->patient->gender,
                    ] : null,
                    'all_requests' => $requestsData,
                    'requests' => $requestsData,
                    'unpaid_requests' => $unpaidRequests,
                    'paid_requests' => $paidRequests,
                    'fees' => $feesData,
                    'total_unpaid' => $unpaidRequests->count(),
                    'total_paid' => $paidRequests->count(),
                    'total_requests' => $requestsData->count(),
                    'total_fees' => $fees->count(),
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
     * ثبت فیس رادیولوژی جدید
     * POST /api/radiology-fees/registration/{regId}
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
                'radiology_request_id' => ['required', 'exists:radiology_requests,id'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'paid_amount' => ['nullable', 'numeric', 'min:0'],
                'discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'payment_method' => ['required', 'string', Rule::in(['cash', 'card', 'online', 'insurance'])],
                'description' => ['nullable', 'string'],
                'note' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی داده‌ها',
                    'errors' => $validator->errors()
                ], 422);
            }

            $existingFee = RadiologyFee::where('radiology_request_id', $request->radiology_request_id)->first();
            if ($existingFee) {
                return response()->json([
                    'success' => false,
                    'message' => 'این درخواست رادیولوژی قبلاً فیس ثبت شده است'
                ], 409);
            }

            $radiologyRequest = RadiologyRequest::find($request->radiology_request_id);
            if (!$radiologyRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست رادیولوژی یافت نشد'
                ], 404);
            }

            DB::beginTransaction();

            $amount = $request->amount;
            $paidAmount = $request->paid_amount ?? 0;
            $discount = $request->discount ?? 0;
            $remaining = $amount - $paidAmount - $discount;

            $paymentStatus = 'pending';
            if ($remaining <= 0) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $fee = new RadiologyFee();
            $fee->reg_id = $regId;
            $fee->patient_id = $registration->patient_id;
            $fee->doctor_id = $registration->doctor_id;
            $fee->created_by = $request->user()?->id;
            $fee->radiology_request_id = $request->radiology_request_id;
            $fee->amount = $amount;
            $fee->paid_amount = $paidAmount;
            $fee->discount = $discount;
            $fee->payment_method = $request->payment_method;
            $fee->description = $request->description;
            $fee->note = $request->note;
            $fee->payment_status = $paymentStatus;
            $fee->barcode = $fee->generateBarcode();
            $fee->receipt_number = $fee->generateReceiptNumber();
            $fee->paid_date = $paymentStatus === 'paid' ? now() : null;
            $fee->save();

            // ✅ ثبت خودکار در ژورنال
            $this->syncJournalEntry($fee);

            $radiologyRequest->has_fee = true;
            $radiologyRequest->save();

            DB::commit();

            $fee->load(['patient', 'radiologyRequest']);

            return response()->json([
                'success' => true,
                'message' => '✅ فیس رادیولوژی با موفقیت ثبت شد',
                'data' => [
                    'fee' => [
                        'id' => $fee->id,
                        'radiology_request_id' => $fee->radiology_request_id,
                        'amount' => $fee->amount,
                        'paid_amount' => $fee->paid_amount,
                        'discount' => $fee->discount,
                        'remaining_amount' => $fee->remaining_amount,
                        'payment_method' => $fee->payment_method,
                        'payment_method_label' => $fee->method_label,
                        'payment_status' => $fee->payment_status,
                        'payment_status_label' => $fee->payment_status_label,
                        'barcode' => $fee->barcode,
                        'receipt_number' => $fee->receipt_number,
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی فیس رادیولوژی
     * PUT /api/radiology-fees/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $fee = RadiologyFee::find($id);
            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس رادیولوژی یافت نشد'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'amount' => ['required', 'numeric', 'min:0.01'],
                'paid_amount' => ['nullable', 'numeric', 'min:0'],
                'discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'payment_method' => ['required', 'string', Rule::in(['cash', 'card', 'online', 'insurance'])],
                'description' => ['nullable', 'string'],
                'note' => ['nullable', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی داده‌ها',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $amount = $request->amount;
            $paidAmount = $request->paid_amount ?? 0;
            $discount = $request->discount ?? 0;
            $remaining = $amount - $paidAmount - $discount;

            $paymentStatus = 'pending';
            if ($remaining <= 0) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $fee->amount = $amount;
            $fee->paid_amount = $paidAmount;
            $fee->discount = $discount;
            $fee->payment_method = $request->payment_method;
            $fee->description = $request->description;
            $fee->note = $request->note;
            $fee->payment_status = $paymentStatus;
            $fee->paid_date = $paymentStatus === 'paid' ? now() : null;
            $fee->save();

            // ✅ بروزرسانی خودکار ژورنال
            $this->syncJournalEntry($fee);

            DB::commit();

            $fee->load(['patient', 'radiologyRequest']);

            return response()->json([
                'success' => true,
                'message' => '✅ فیس رادیولوژی با موفقیت ویرایش شد',
                'data' => [
                    'fee' => [
                        'id' => $fee->id,
                        'amount' => $fee->amount,
                        'paid_amount' => $fee->paid_amount,
                        'discount' => $fee->discount,
                        'remaining_amount' => $fee->remaining_amount,
                        'payment_method' => $fee->payment_method,
                        'payment_method_label' => $fee->method_label,
                        'payment_status' => $fee->payment_status,
                        'payment_status_label' => $fee->payment_status_label,
                        'barcode' => $fee->barcode,
                        'receipt_number' => $fee->receipt_number,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ویرایش فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس رادیولوژی
     * DELETE /api/radiology-fees/{id}
     */
    public function destroy($id)
    {
        try {
            $fee = RadiologyFee::find($id);
            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس رادیولوژی یافت نشد'
                ], 404);
            }

            DB::beginTransaction();

            // ✅ حذف اثر ژورنال مرتبط
            $this->removeJournalEntry($fee);

            $radiologyRequest = RadiologyRequest::find($fee->radiology_request_id);
            if ($radiologyRequest) {
                $radiologyRequest->has_fee = false;
                $radiologyRequest->save();
            }

            $fee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '✅ فیس رادیولوژی با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت یک فیس خاص
     * GET /api/radiology-fees/{id}
     */
    public function show($id)
    {
        try {
            $fee = RadiologyFee::with(['patient', 'radiologyRequest', 'creator'])
                ->find($id);

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'فیس رادیولوژی یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $fee->id,
                    'reg_id' => $fee->reg_id,
                    'radiology_request_id' => $fee->radiology_request_id,
                    'amount' => $fee->amount,
                    'paid_amount' => $fee->paid_amount,
                    'discount' => $fee->discount,
                    'remaining_amount' => $fee->remaining_amount,
                    'payment_method' => $fee->payment_method,
                    'payment_method_label' => $fee->method_label,
                    'payment_status' => $fee->payment_status,
                    'payment_status_label' => $fee->payment_status_label,
                    'description' => $fee->description,
                    'note' => $fee->note,
                    'barcode' => $fee->barcode,
                    'receipt_number' => $fee->receipt_number,
                    'paid_date' => $fee->paid_date?->format('Y-m-d H:i:s'),
                    'created_at' => $fee->created_at?->format('Y-m-d H:i:s'),
                    'patient' => $fee->patient ? [
                        'id' => $fee->patient->id,
                        'first_name' => $fee->patient->first_name,
                        'last_name' => $fee->patient->last_name,
                    ] : null,
                    'radiology_request' => $fee->radiologyRequest ? [
                        'id' => $fee->radiologyRequest->id,
                        'radiology_type' => $fee->radiologyRequest->radiology_type,
                        'radiology_type_label' => $fee->radiologyRequest->radiology_type_label,
                        'body_part' => $fee->radiologyRequest->body_part,
                        'barcode' => $fee->radiologyRequest->barcode,
                    ] : null,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /* ============================================================
     *  متدهای کمکی ژورنال (Journal Sync)
     * ============================================================ */

    /**
     * ثبت یا بروزرسانی خودکار سند حسابداری در ژورنال
     * این متد بر اساس مبلغ فیس، تخفیف، پرداختی و روش پرداخت
     * سند مربوطه را در جدول journal_entries ثبت/بروزرسانی می‌کند.
     *
     * @param RadiologyFee $fee
     * @return void
     */
    protected function syncJournalEntry(RadiologyFee $fee): void
    {
        // اگر جدول یا مدل ژورنال وجود ندارد، از این متد صرف‌نظر کن
        if (!class_exists(\App\Models\JournalEntry::class)) {
            return;
        }

        try {
            $amount       = (float) $fee->amount;
            $paidAmount   = (float) $fee->paid_amount;
            $discount     = (float) $fee->discount;
            $remaining    = (float) $fee->remaining_amount;
            $paymentMethod = $fee->payment_method;

            // تعیین حساب بدهکار بر اساس روش پرداخت
            $debitAccount = match ($paymentMethod) {
                'cash'      => 'صندوق',
                'card'      => 'بانک - کارتخوان',
                'online'    => 'بانک - درگاه آنلاین',
                'insurance' => 'بیمه - مطالبات',
                default     => 'صندوق',
            };

            // حساب بستانکار همیشه درآمد رادیولوژی است
            $creditAccount = 'درآمد رادیولوژی';

            // شرح سند
            $description = sprintf(
                'فیس رادیولوژی - رسید %s - بیمار %s',
                $fee->receipt_number ?? $fee->id,
                $fee->patient ? trim($fee->patient->first_name . ' ' . $fee->patient->last_name) : 'نامشخص'
            );

            // جستجوی سند قبلی این فیس
            $journal = \App\Models\JournalEntry::where('reference_type', RadiologyFee::class)
                ->where('reference_id', $fee->id)
                ->first();

            $data = [
                'reference_type'  => RadiologyFee::class,
                'reference_id'    => $fee->id,
                'reg_id'          => $fee->reg_id,
                'patient_id'      => $fee->patient_id,
                'doctor_id'       => $fee->doctor_id,
                'created_by'      => $fee->created_by,
                'entry_date'      => now()->toDateString(),
                'debit_account'   => $debitAccount,
                'credit_account'  => $creditAccount,
                'amount'          => $amount,           // مبلغ کل فاکتور
                'discount'        => $discount,          // تخفیف
                'paid_amount'     => $paidAmount,        // پرداختی
                'remaining_amount'=> $remaining,         // باقیمانده
                'payment_method'  => $paymentMethod,
                'payment_status'  => $fee->payment_status,
                'description'     => $description,
                'barcode'         => $fee->barcode,
                'receipt_number'  => $fee->receipt_number,
                'source'          => 'radiology_fee',
            ];

            if ($journal) {
                // بروزرسانی سند موجود (اگر قیمت‌ها تغییر کرده باشند)
                $journal->update($data);
            } else {
                // ایجاد سند جدید
                \App\Models\JournalEntry::create($data);
            }
        } catch (\Throwable $e) {
            // لاگ کردن خطا بدون متوقف کردن عملیات اصلی
            \Log::warning('Journal sync failed for RadiologyFee #' . $fee->id . ': ' . $e->getMessage());
        }
    }

    /**
     * حذف سند ژورنال مرتبط با فیس حذف‌شده
     *
     * @param RadiologyFee $fee
     * @return void
     */
    protected function removeJournalEntry(RadiologyFee $fee): void
    {
        if (!class_exists(\App\Models\JournalEntry::class)) {
            return;
        }

        try {
            \App\Models\JournalEntry::where('reference_type', RadiologyFee::class)
                ->where('reference_id', $fee->id)
                ->delete();
        } catch (\Throwable $e) {
            \Log::warning('Journal remove failed for RadiologyFee #' . $fee->id . ': ' . $e->getMessage());
        }
    }
}