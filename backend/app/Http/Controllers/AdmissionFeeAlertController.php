<?php
// app/Http/Controllers/AdmissionFeeAlertController.php

namespace App\Http\Controllers;

use App\Models\AdmissionFeeAlert;
use App\Models\AdmissionRequest;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdmissionFeeAlertController extends Controller
{
    /**
     * نمایش لیست هشدارها
     */
    public function index(Request $request)
    {
        $query = AdmissionFeeAlert::with(['patient', 'admissionRequest']);

        // فیلتر بر اساس ارسال شده
        if ($request->has('is_sent')) {
            $query->where('is_sent', $request->is_sent);
        }

        // فیلتر بر اساس حل شده
        if ($request->has('is_resolved')) {
            $query->where('is_resolved', $request->is_resolved);
        }

        // فیلتر بر اساس تاریخ
        if ($request->has('from_date')) {
            $query->whereDate('alert_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('alert_date', '<=', $request->to_date);
        }

        $alerts = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $alerts
        ]);
    }

    /**
     * ایجاد هشدار برای یک درخواست بستری
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'admission_request_id' => 'required|exists:admission_requests,id',
            'alert_type' => 'sometimes|in:daily,weekly,custom',
            'message' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $admission = AdmissionRequest::with('patient')->find($request->admission_request_id);

            if (!$admission || $admission->status !== 'admitted') {
                return response()->json([
                    'success' => false,
                    'message' => 'بیمار بستری نمی‌باشد'
                ], 400);
            }

            $alert = AdmissionFeeAlert::create([
                'admission_request_id' => $request->admission_request_id,
                'patient_id' => $admission->patient_id,
                'alert_date' => now()->toDateString(),
                'alert_time' => now()->toTimeString(),
                'alert_type' => $request->alert_type ?? 'daily',
                'message' => $request->message ?? $this->generateAlertMessage($admission),
                'is_sent' => false,
                'is_resolved' => false
            ]);

            $alert->load(['patient', 'admissionRequest']);

            return response()->json([
                'success' => true,
                'message' => 'هشدار با موفقیت ایجاد شد',
                'data' => $alert
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد هشدار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک هشدار
     */
    public function show($id)
    {
        $alert = AdmissionFeeAlert::with(['patient', 'admissionRequest.ward', 'admissionRequest.bed'])
            ->find($id);

        if (!$alert) {
            return response()->json([
                'success' => false,
                'message' => 'هشدار یافت نشد'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $alert
        ]);
    }

    /**
     * به‌روزرسانی هشدار
     */
    public function update(Request $request, $id)
    {
        $alert = AdmissionFeeAlert::find($id);

        if (!$alert) {
            return response()->json([
                'success' => false,
                'message' => 'هشدار یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'nullable|string',
            'is_sent' => 'sometimes|boolean',
            'is_resolved' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $alert->update($request->only(['message', 'is_sent', 'is_resolved']));

            if ($request->has('is_sent') && $request->is_sent) {
                $alert->update(['sent_at' => now()]);
            }

            if ($request->has('is_resolved') && $request->is_resolved) {
                $alert->update(['resolved_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'هشدار با موفقیت به‌روزرسانی شد',
                'data' => $alert
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی هشدار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * علامت‌گذاری هشدار به عنوان ارسال شده
     */
    public function markAsSent($id)
    {
        $alert = AdmissionFeeAlert::find($id);

        if (!$alert) {
            return response()->json([
                'success' => false,
                'message' => 'هشدار یافت نشد'
            ], 404);
        }

        $alert->update([
            'is_sent' => true,
            'sent_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'هشدار به عنوان ارسال شده علامت‌گذاری شد',
            'data' => $alert
        ]);
    }

    /**
     * علامت‌گذاری هشدار به عنوان حل شده
     */
    public function markAsResolved($id)
    {
        $alert = AdmissionFeeAlert::find($id);

        if (!$alert) {
            return response()->json([
                'success' => false,
                'message' => 'هشدار یافت نشد'
            ], 404);
        }

        $alert->update([
            'is_resolved' => true,
            'resolved_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'هشدار به عنوان حل شده علامت‌گذاری شد',
            'data' => $alert
        ]);
    }

    /**
     * حذف هشدار
     */
    public function destroy($id)
    {
        $alert = AdmissionFeeAlert::find($id);

        if (!$alert) {
            return response()->json([
                'success' => false,
                'message' => 'هشدار یافت نشد'
            ], 404);
        }

        $alert->delete();

        return response()->json([
            'success' => true,
            'message' => 'هشدار با موفقیت حذف شد'
        ]);
    }

    /**
     * دریافت هشدارهای حل نشده
     */
    public function getUnresolvedAlerts()
    {
        $alerts = AdmissionFeeAlert::with(['patient', 'admissionRequest'])
            ->where('is_resolved', false)
            ->where('is_sent', true)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $alerts
        ]);
    }

    /**
     * دریافت هشدارهای امروز
     */
    public function getTodayAlerts()
    {
        $alerts = AdmissionFeeAlert::with(['patient', 'admissionRequest'])
            ->whereDate('alert_date', today())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $alerts
        ]);
    }

    /**
     * بررسی و ایجاد هشدارهای خودکار
     */
    public function checkAndCreateAlerts()
    {
        try {
            // دریافت بیماران بستری که نیاز به هشدار دارند
            $admissions = AdmissionRequest::with(['patient', 'ward', 'bed'])
                ->where('status', 'admitted')
                ->where(function($query) {
                    $query->whereNull('last_fee_alert_at')
                          ->orWhere('last_fee_alert_at', '<=', now()->subHours(24));
                })
                ->get();

            $createdAlerts = [];

            foreach ($admissions as $admission) {
                // بررسی اینکه آیا هشدار امروز قبلاً ایجاد شده است
                $existingAlert = AdmissionFeeAlert::where('admission_request_id', $admission->id)
                    ->whereDate('alert_date', today())
                    ->first();

                if (!$existingAlert) {
                    $alert = AdmissionFeeAlert::create([
                        'admission_request_id' => $admission->id,
                        'patient_id' => $admission->patient_id,
                        'alert_date' => today(),
                        'alert_time' => now()->toTimeString(),
                        'alert_type' => 'daily',
                        'message' => $this->generateAlertMessage($admission),
                        'is_sent' => false,
                        'is_resolved' => false
                    ]);

                    $createdAlerts[] = $alert;

                    // بروزرسانی زمان آخرین هشدار در درخواست بستری
                    $admission->update([
                        'last_fee_alert_at' => now(),
                        'fee_alert_count' => $admission->fee_alert_count + 1
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($createdAlerts) . ' هشدار جدید ایجاد شد',
                'data' => $createdAlerts
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بررسی و ایجاد هشدارها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * تولید پیام هشدار
     */
    private function generateAlertMessage($admission)
    {
        $patientName = $admission->patient->full_name ?? 'بیمار';
        $wardName = $admission->ward->name ?? 'نامشخص';
        $daysAdmitted = $admission->admission_date ? $admission->admission_date->diffInDays(now()) + 1 : 1;

        return "هشدار فیس بستری برای بیمار {$patientName} در بخش {$wardName} - روز {$daysAdmitted} بستری";
    }

    /**
     * دریافت آمار هشدارها
     */
    public function getStatistics()
    {
        $statistics = [
            'total_alerts' => AdmissionFeeAlert::count(),
            'unresolved_alerts' => AdmissionFeeAlert::where('is_resolved', false)->count(),
            'resolved_alerts' => AdmissionFeeAlert::where('is_resolved', true)->count(),
            'sent_alerts' => AdmissionFeeAlert::where('is_sent', true)->count(),
            'unsent_alerts' => AdmissionFeeAlert::where('is_sent', false)->count(),
            'today_alerts' => AdmissionFeeAlert::whereDate('alert_date', today())->count(),
            'overdue_alerts' => AdmissionFeeAlert::where('is_resolved', false)
                ->where('created_at', '<=', now()->subHours(24))
                ->count()
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }
}