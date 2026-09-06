<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\OperationRequest;
use App\Models\OperationFee;
use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OperationController extends Controller
{
    /**
     * دریافت لیست درخواست‌های عملیات
     */
    public function index(Request $request)
    {
        try {
            $query = OperationRequest::with(['patient', 'doctor', 'fee'])
                ->byDoctor(auth()->id());

            // فیلتر بر اساس وضعیت
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // فیلتر بر اساس اولویت
            if ($request->has('priority')) {
                $query->where('priority', $request->priority);
            }

            // جستجو
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                })->orWhere('surgery_type', 'like', "%{$search}%")
                  ->orWhere('surgeon', 'like', "%{$search}%");
            }

            // مرتب‌سازی
            $sortBy = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->per_page ?? 10;
            $operations = $query->paginate($perPage);

            // آمار
            $stats = [
                'total' => OperationRequest::byDoctor(auth()->id())->count(),
                'pending' => OperationRequest::byDoctor(auth()->id())->pending()->count(),
                'in_progress' => OperationRequest::byDoctor(auth()->id())->inProgress()->count(),
                'completed' => OperationRequest::byDoctor(auth()->id())->completed()->count(),
                'cancelled' => OperationRequest::byDoctor(auth()->id())->cancelled()->count()
            ];

            return response()->json([
                'success' => true,
                'message' => 'لیست عملیات با موفقیت دریافت شد',
                'data' => $operations,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت درخواست عملیات جدید
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'registration_id' => 'required|exists:registrations,id',
            'patient_id' => 'required|exists:patients,id',
            'surgery_type' => 'required|string|max:255',
            'surgeon' => 'required|string|max:255',
            'anesthesiologist' => 'nullable|string|max:255',
            'room_number' => 'nullable|string|max:50',
            'scheduled_date' => 'nullable|date',
            'estimated_duration' => 'nullable|string',
            'notes' => 'nullable|string',
            'priority' => 'nullable|in:high,medium,normal,low'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // بررسی اینکه آیا این مراجعه قبلاً درخواست عملیات دارد یا خیر
            $existing = OperationRequest::where('registration_id', $request->registration_id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'این مراجعه قبلاً درخواست عملیات دارد'
                ], 400);
            }

            $operation = OperationRequest::create([
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'doctor_id' => auth()->id(),
                'surgery_type' => $request->surgery_type,
                'surgeon' => $request->surgeon,
                'anesthesiologist' => $request->anesthesiologist,
                'room_number' => $request->room_number,
                'scheduled_date' => $request->scheduled_date,
                'estimated_duration' => $request->estimated_duration,
                'notes' => $request->notes,
                'status' => 'pending',
                'priority' => $request->priority ?? 'normal',
                'fee_status' => 'pending'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'درخواست عملیات با موفقیت ثبت شد',
                'data' => $operation->load(['patient', 'doctor'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت درخواست عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک درخواست عملیات
     */
    public function show($id)
    {
        try {
            $operation = OperationRequest::with(['patient', 'doctor', 'fee', 'registration'])
                ->where('doctor_id', auth()->id())
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $operation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'عملیات مورد نظر یافت نشد'
            ], 404);
        }
    }

    /**
     * بروزرسانی درخواست عملیات
     */
    public function update(Request $request, $id)
    {
        try {
            $operation = OperationRequest::where('doctor_id', auth()->id())
                ->findOrFail($id);

            // بررسی اینکه عملیات قابل ویرایش باشد
            if (in_array($operation->status, ['completed', 'cancelled'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'امکان ویرایش عملیات تکمیل شده یا لغو شده وجود ندارد'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'surgery_type' => 'sometimes|string|max:255',
                'surgeon' => 'sometimes|string|max:255',
                'anesthesiologist' => 'nullable|string|max:255',
                'room_number' => 'nullable|string|max:50',
                'scheduled_date' => 'nullable|date',
                'estimated_duration' => 'nullable|string',
                'notes' => 'nullable|string',
                'priority' => 'nullable|in:high,medium,normal,low',
                'status' => 'nullable|in:pending,in_progress,completed,cancelled'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            $operation->update($request->only([
                'surgery_type', 'surgeon', 'anesthesiologist',
                'room_number', 'scheduled_date', 'estimated_duration',
                'notes', 'priority', 'status'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'عملیات با موفقیت بروزرسانی شد',
                'data' => $operation->load(['patient', 'doctor'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی وضعیت عملیات
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $operation = OperationRequest::where('doctor_id', auth()->id())
                ->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pending,in_progress,completed,cancelled'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldStatus = $operation->status;
            $newStatus = $request->status;

            // اگر عملیات کامل شد
            if ($newStatus === 'completed' && $oldStatus !== 'completed') {
                $operation->completed_at = now();
                
                // اگر فیس وجود دارد و پرداخت کامل نشده، وضعیت فیس را بروز کن
                if ($operation->fee && $operation->fee->payment_status !== 'paid') {
                    // فقط هشدار می‌دهیم، اما عملیات کامل می‌شود
                }
            }

            if ($newStatus === 'cancelled') {
                $operation->cancelled_at = now();
            }

            $operation->status = $newStatus;
            $operation->save();

            return response()->json([
                'success' => true,
                'message' => 'وضعیت عملیات با موفقیت بروزرسانی شد',
                'data' => $operation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی وضعیت عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف درخواست عملیات
     */
    public function destroy($id)
    {
        try {
            $operation = OperationRequest::where('doctor_id', auth()->id())
                ->findOrFail($id);

            // فقط عملیات‌های pending قابل حذف هستند
            if ($operation->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'امکان حذف عملیات در حال انجام یا تکمیل شده وجود ندارد'
                ], 400);
            }

            // اگر فیس ثبت شده باشد، نمی‌توان حذف کرد
            if ($operation->fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'این عملیات دارای فیس ثبت شده است، امکان حذف وجود ندارد'
                ], 400);
            }

            $operation->delete();

            return response()->json([
                'success' => true,
                'message' => 'درخواست عملیات با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف درخواست عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ==========================================
    // بخش مدیریت فیس‌های عملیات
    // ==========================================

    /**
     * دریافت لیست فیس‌های عملیات
     */
    public function feesIndex(Request $request)
    {
        try {
            $query = OperationFee::with(['patient', 'doctor', 'collector', 'operationRequest']);

            // فیلتر بر اساس وضعیت پرداخت
            if ($request->has('payment_status') && $request->payment_status !== 'all') {
                $query->where('payment_status', $request->payment_status);
            }

            // فیلتر بر اساس روش پرداخت
            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

            // فیلتر بر اساس تاریخ
            if ($request->has('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            // جستجو
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('patient', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                })->orWhere('transaction_id', 'like', "%{$search}%");
            }

            // مرتب‌سازی
            $sortBy = $request->sort_by ?? 'created_at';
            $sortOrder = $request->sort_order ?? 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->per_page ?? 10;
            $fees = $query->paginate($perPage);

            // آمار
            $stats = [
                'total' => OperationFee::count(),
                'pending' => OperationFee::pending()->count(),
                'partial' => OperationFee::partial()->count(),
                'paid' => OperationFee::paid()->count(),
                'total_amount' => OperationFee::sum('total_amount'),
                'total_paid' => OperationFee::sum('paid_amount'),
                'total_remaining' => OperationFee::sum('remaining_amount'),
                'today' => OperationFee::today()->count(),
                'today_amount' => OperationFee::today()->sum('total_amount')
            ];

            return response()->json([
                'success' => true,
                'message' => 'لیست فیس‌های عملیات با موفقیت دریافت شد',
                'data' => $fees,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست فیس‌های عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت فیس عملیات جدید
     */
    public function storeFee(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'operation_request_id' => 'required|exists:operation_requests,id',
            'registration_id' => 'required|exists:registrations,id',
            'patient_id' => 'required|exists:patients,id',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'required|in:cash,card,online,insurance',
            'description' => 'nullable|string',
            'note' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // بررسی اینکه آیا برای این عملیات قبلاً فیس ثبت شده است
            $existingFee = OperationFee::where('operation_request_id', $request->operation_request_id)->first();
            if ($existingFee) {
                return response()->json([
                    'success' => false,
                    'message' => 'برای این عملیات قبلاً فیس ثبت شده است'
                ], 400);
            }

            // بررسی وجود درخواست عملیات
            $operation = OperationRequest::find($request->operation_request_id);
            if (!$operation) {
                return response()->json([
                    'success' => false,
                    'message' => 'درخواست عملیات یافت نشد'
                ], 404);
            }

            $totalAmount = $request->total_amount;
            $discount = $request->discount ?? 0;
            $paidAmount = $request->paid_amount ?? 0;

            // محاسبه مبلغ بعد از تخفیف
            $discountedAmount = $totalAmount - (($totalAmount * $discount) / 100);
            $remainingAmount = max(0, $discountedAmount - $paidAmount);

            // تعیین وضعیت پرداخت
            $paymentStatus = 'pending';
            if ($remainingAmount <= 0) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $fee = OperationFee::create([
                'operation_request_id' => $request->operation_request_id,
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'doctor_id' => $operation->doctor_id,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'discount' => ($totalAmount * $discount) / 100,
                'discount_percent' => $discount,
                'remaining_amount' => $remainingAmount,
                'payment_method' => $request->payment_method,
                'payment_status' => $paymentStatus,
                'description' => $request->description,
                'note' => $request->note,
                'collected_by' => auth()->id()
            ]);

            // بروزرسانی فیس در درخواست عملیات
            $operation->fee_id = $fee->id;
            $operation->fee_amount = $totalAmount;
            $operation->fee_paid = $paidAmount;
            $operation->fee_status = $paymentStatus;
            $operation->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس عملیات با موفقیت ثبت شد',
                'data' => $fee->load(['patient', 'doctor', 'collector', 'operationRequest'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک فیس عملیات
     */
    public function showFee($id)
    {
        try {
            $fee = OperationFee::with(['patient', 'doctor', 'collector', 'operationRequest'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $fee
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'فیس عملیات مورد نظر یافت نشد'
            ], 404);
        }
    }

    /**
     * بروزرسانی فیس عملیات
     */
    public function updateFee(Request $request, $id)
    {
        try {
            $fee = OperationFee::findOrFail($id);

            // اگر فیس پرداخت کامل شده باشد، قابل ویرایش نیست
            if ($fee->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'امکان ویرایش فیس پرداخت کامل شده وجود ندارد'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'total_amount' => 'sometimes|numeric|min:0',
                'paid_amount' => 'sometimes|numeric|min:0',
                'discount_percent' => 'sometimes|numeric|min:0|max:100',
                'payment_method' => 'sometimes|in:cash,card,online,insurance',
                'description' => 'nullable|string',
                'note' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'خطا در اعتبارسنجی',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $totalAmount = $request->total_amount ?? $fee->total_amount;
            $discountPercent = $request->discount_percent ?? $fee->discount_percent;
            $paidAmount = $request->paid_amount ?? $fee->paid_amount;

            // محاسبه مجدد
            $discount = ($totalAmount * $discountPercent) / 100;
            $discountedAmount = $totalAmount - $discount;
            $remainingAmount = max(0, $discountedAmount - $paidAmount);

            $paymentStatus = 'pending';
            if ($remainingAmount <= 0) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $fee->update([
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'discount' => $discount,
                'discount_percent' => $discountPercent,
                'remaining_amount' => $remainingAmount,
                'payment_method' => $request->payment_method ?? $fee->payment_method,
                'payment_status' => $paymentStatus,
                'description' => $request->description ?? $fee->description,
                'note' => $request->note ?? $fee->note
            ]);

            // بروزرسانی درخواست عملیات
            if ($fee->operationRequest) {
                $fee->operationRequest->update([
                    'fee_amount' => $totalAmount,
                    'fee_paid' => $paidAmount,
                    'fee_status' => $paymentStatus
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس عملیات با موفقیت بروزرسانی شد',
                'data' => $fee->load(['patient', 'doctor', 'collector'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی فیس عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف فیس عملیات
     */
    public function destroyFee($id)
    {
        try {
            $fee = OperationFee::findOrFail($id);

            // فقط فیس‌های پرداخت نشده قابل حذف هستند
            if ($fee->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'امکان حذف فیس پرداخت کامل شده وجود ندارد'
                ], 400);
            }

            DB::beginTransaction();

            // حذف ارتباط با درخواست عملیات
            if ($fee->operationRequest) {
                $fee->operationRequest->update([
                    'fee_id' => null,
                    'fee_amount' => null,
                    'fee_paid' => null,
                    'fee_status' => 'pending'
                ]);
            }

            $fee->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'فیس عملیات با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف فیس عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار فیس‌های عملیات
     */
    public function feesStatistics()
    {
        try {
            $stats = [
                'total' => OperationFee::count(),
                'pending' => OperationFee::pending()->count(),
                'partial' => OperationFee::partial()->count(),
                'paid' => OperationFee::paid()->count(),
                'total_amount' => OperationFee::sum('total_amount'),
                'total_paid' => OperationFee::sum('paid_amount'),
                'total_remaining' => OperationFee::sum('remaining_amount'),
                'today' => OperationFee::today()->count(),
                'today_amount' => OperationFee::today()->sum('total_amount'),
                'by_method' => [
                    'cash' => OperationFee::where('payment_method', 'cash')->count(),
                    'card' => OperationFee::where('payment_method', 'card')->count(),
                    'online' => OperationFee::where('payment_method', 'online')->count(),
                    'insurance' => OperationFee::where('payment_method', 'insurance')->count()
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار فیس‌های عملیات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت جزئیات کامل عملیات با فیس
     */
    public function getOperationWithFee($id)
    {
        try {
            $operation = OperationRequest::with(['patient', 'doctor', 'fee.patient', 'fee.collector'])
                ->where('doctor_id', auth()->id())
                ->findOrFail($id);

            // اگر فیس وجود دارد، جزئیات کامل را برگردان
            if ($operation->fee) {
                $operation->fee_details = [
                    'total_amount' => $operation->fee->total_amount,
                    'paid_amount' => $operation->fee->paid_amount,
                    'remaining_amount' => $operation->fee->remaining_amount,
                    'discount' => $operation->fee->discount,
                    'discount_percent' => $operation->fee->discount_percent,
                    'payment_method' => $operation->fee->payment_method,
                    'payment_method_label' => $operation->fee->payment_method_label,
                    'payment_status' => $operation->fee->payment_status,
                    'payment_status_label' => $operation->fee->payment_status_label,
                    'payment_date' => $operation->fee->payment_date,
                    'description' => $operation->fee->description,
                    'note' => $operation->fee->note,
                    'collected_by' => $operation->fee->collector ? 
                        $operation->fee->collector->name : null
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $operation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'عملیات مورد نظر یافت نشد',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * دریافت لیست عملیات‌های بدون فیس (برای نمایش در تب عملیات)
     */
    public function getOperationsWithoutFee()
    {
        try {
            $operations = OperationRequest::with(['patient', 'doctor'])
                ->where('doctor_id', auth()->id())
                ->whereNull('fee_id')
                ->where('status', '!=', 'cancelled')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $operations
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت عملیات‌های بدون فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست عملیات‌های با فیس (برای نمایش در تب اخذ فیس)
     */
    public function getOperationsWithFee()
    {
        try {
            $operations = OperationRequest::with(['patient', 'doctor', 'fee'])
                ->where('doctor_id', auth()->id())
                ->whereNotNull('fee_id')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $operations
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت عملیات‌های با فیس',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}