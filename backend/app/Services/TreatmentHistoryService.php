<?php
// app/Services/TreatmentHistoryService.php

namespace App\Services;

use App\Models\TreatmentHistory;
use App\Models\TreatmentHistoryItem;
use App\Models\Registrations;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TreatmentHistoryService
{
    /**
     * ثبت / به‌روزرسانی تاریخچه اصلی مراجعه
     * هر بار که داکتر وارد صفحه معالجه می‌شود یا دکمه ثبت می‌زند، این تابع صدا زده می‌شود
     */
    public function syncMainHistory(int $regId, array $progressData = []): ?TreatmentHistory
    {
        try {
            $registration = Registrations::with(['patient'])
                ->where('reg_id', $regId)
                ->first();

            if (!$registration) {
                Log::warning("TreatmentHistory: registration not found", ['reg_id' => $regId]);
                return null;
            }

            $patient = $registration->patient;

            // پیدا کردن یا ساختن رکورد اصلی
            $history = TreatmentHistory::firstOrNew(['reg_id' => $regId]);

            // ============ اطلاعات بیمار (Snapshot) ============
            if ($patient) {
                $history->patient_id = $patient->id;
                $history->patient_name = trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? ''));
                $history->tazkira_number = $patient->national_id ?? null;
                $history->patient_age = $patient->age ?? null;
                $history->patient_gender = $patient->gender ?? null;
                $history->patient_phone = $patient->mobile ?? $patient->phone ?? null;
                $history->patient_blood_group = $patient->blood_group ?? null;
            }

            // ============ اطلاعات مراجعه ============
            $history->visit_number = $registration->visit_number ?? null;
            $history->queue_number = $registration->queue_number ?? null;
            $history->visit_status = $registration->visit_status ?? 'InProgress';

            // ============ اطلاعات داکتر ============
            $doctorId = $registration->doctor_id ?? auth()->id();
            if ($doctorId) {
                $doctor = User::find($doctorId);
                if ($doctor) {
                    $history->doctor_id = $doctor->id;
                    $history->doctor_name = $doctor->name ?? null;
                    $history->doctor_specialty = $doctor->specialty ?? null;
                }
            }

            // ============ وضعیت مراحل ============
            if (!empty($progressData)) {
                $history->current_step = $progressData['current_step'] ?? $history->current_step;
                $history->current_step_index = $progressData['current_step_index'] ?? $history->current_step_index;
                $history->completed_steps = $progressData['completed_steps'] ?? $history->completed_steps;
            }

            $history->created_by = $history->created_by ?? auth()->id();
            $history->updated_by = auth()->id();

            $history->save();

            // ============ به‌روزرسانی شمارش‌ها و مبالغ ============
            $this->refreshCounters($history);
            $this->refreshAmounts($history);
            $this->rebuildActivityLog($history);
            $this->rebuildSummary($history);

            $history->save();

            return $history;

        } catch (\Throwable $e) {
            Log::error("TreatmentHistory::syncMainHistory error", [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * افزودن یک آیتم (مرحله) به تاریخچه
     * بعد از هر ثبت موفق یک مرحله صدا زده می‌شود
     */
    public function addItem(int $regId, string $stepKey, array $data = [], ?int $refId = null, ?string $refTable = null): ?TreatmentHistoryItem
    {
        try {
            // اطمینان از وجود History اصلی
            $history = TreatmentHistory::where('reg_id', $regId)->first();
            if (!$history) {
                $history = $this->syncMainHistory($regId);
            }
            if (!$history) return null;

            $stepMap = $this->getStepMap();
            $stepInfo = $stepMap[$stepKey] ?? ['label' => $stepKey, 'order' => 99];

            // استخراج خلاصه، مبلغ، وضعیت
            $summary = $this->buildItemSummary($stepKey, $data);
            $amount = $this->extractAmount($stepKey, $data);
            $status = $data['status'] ?? 'completed';
            $statusLabel = $this->getStatusLabel($stepKey, $status);
            $pdfFile = $data['pdf_url'] ?? $data['pdf_file'] ?? null;
            $barcode = $data['barcode'] ?? null;

            $item = TreatmentHistoryItem::create([
                'history_id' => $history->history_id,
                'step_key' => $stepKey,
                'step_label' => $stepInfo['label'],
                'action_type' => 'create',
                'step_order' => $stepInfo['order'],
                'ref_id' => $refId ?? ($data['id'] ?? null),
                'ref_table' => $refTable ?? $stepInfo['table'] ?? null,
                'data' => $data,
                'summary' => $summary,
                'amount' => $amount,
                'paid_amount' => $data['paid_amount'] ?? null,
                'payment_status' => $data['payment_status'] ?? null,
                'status' => $status,
                'status_label' => $statusLabel,
                'pdf_file' => $pdfFile,
                'barcode' => $barcode,
                'step_at' => now(),
                'performed_by' => auth()->id(),
                'performed_by_name' => auth()->user()?->name,
            ]);

            // به‌روزرسانی شمارش‌ها
            $this->refreshCounters($history);
            $this->refreshAmounts($history);
            $this->rebuildActivityLog($history);
            $this->rebuildSummary($history);
            $history->save();

            return $item;

        } catch (\Throwable $e) {
            Log::error("TreatmentHistory::addItem error", [
                'reg_id' => $regId,
                'step_key' => $stepKey,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * به‌روزرسانی شمارش‌های مرحله‌ای
     */
    private function refreshCounters(TreatmentHistory $history): void
    {
        $history->examinations_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'examination')->count();

        $history->laboratory_tests_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'laboratory')->count();

        $history->radiology_requests_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'radiology')->count();

        $history->operations_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'operation')->count();

        $history->prescriptions_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'pres_insert')->count();

        $history->admissions_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'admission')->count();

        $history->followups_count = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->where('step_key', 'followup')->count();
    }

    /**
     * محاسبه مجموع مبالغ
     */
    private function refreshAmounts(TreatmentHistory $history): void
    {
        $items = TreatmentHistoryItem::where('history_id', $history->history_id)->get();

        $history->total_amount = $items->sum('amount') ?? 0;
        $history->total_paid = $items->sum('paid_amount') ?? 0;
        $history->total_remaining = $history->total_amount - $history->total_paid;
    }

    /**
     * ساخت activity_log برای نمایش سریع
     */
    private function rebuildActivityLog(TreatmentHistory $history): void
    {
        $items = TreatmentHistoryItem::where('history_id', $history->history_id)
            ->orderBy('step_order')
            ->orderBy('step_at')
            ->get();

        $log = $items->map(function ($item) {
            return [
                'step' => $item->step_key,
                'step_label' => $item->step_label,
                'action' => $item->action_type,
                'summary' => $item->summary,
                'status' => $item->status,
                'amount' => (float) $item->amount,
                'time' => $item->step_at?->toISOString(),
                'ref_id' => $item->ref_id,
                'ref_table' => $item->ref_table,
            ];
        })->toArray();

        $history->activity_log = $log;
    }

    /**
     * ساخت خلاصه متنی
     */
    private function rebuildSummary(TreatmentHistory $history): void
    {
        $parts = [];

        if ($history->diagnosis) {
            $parts[] = "تشخیص: {$history->diagnosis}";
        }
        if ($history->examinations_count > 0) {
            $parts[] = "معاینه: {$history->examinations_count}";
        }
        if ($history->laboratory_tests_count > 0) {
            $parts[] = "لابراتوار: {$history->laboratory_tests_count}";
        }
        if ($history->radiology_requests_count > 0) {
            $parts[] = "رادیولوژی: {$history->radiology_requests_count}";
        }
        if ($history->operations_count > 0) {
            $parts[] = "عملیات: {$history->operations_count}";
        }
        if ($history->prescriptions_count > 0) {
            $parts[] = "نسخه: {$history->prescriptions_count}";
        }
        if ($history->admissions_count > 0) {
            $parts[] = "بستری: {$history->admissions_count}";
        }

        $history->summary = implode(' | ', $parts);
    }

    /**
     * خلاصه هر آیتم
     */
    private function buildItemSummary(string $stepKey, array $data): string
    {
        return match ($stepKey) {
            'examination' => 'معاینه: ' . ($data['diagnosis'] ?? $data['chief_complaint'] ?? '-'),
            'laboratory' => 'لابراتوار: ' . ($data['test_type_label'] ?? $data['test_name'] ?? $data['test_type'] ?? '-'),
            'radiology' => 'رادیولوژی: ' . ($data['radiology_type_label'] ?? $data['radiology_type'] ?? '-') . ' - ' . ($data['body_part'] ?? ''),
            'operation' => 'عملیات: ' . ($data['surgery_type'] ?? '-'),
            'pres_insert' => 'نسخه #' . ($data['pres_num'] ?? $data['id'] ?? '-'),
            'followup' => 'ملاقات بعدی: ' . ($data['followup_date'] ?? '-'),
            'admission' => 'بستری: بخش ' . ($data['ward_name'] ?? $data['ward'] ?? '-'),
            default => $stepKey,
        };
    }

    /**
     * استخراج مبلغ مرتبط با هر مرحله
     */
    private function extractAmount(string $stepKey, array $data): float
    {
        return (float) ($data['total_amount'] ?? $data['amount'] ?? 0);
    }

    /**
     * برچسب فارسی وضعیت
     */
    private function getStatusLabel(string $stepKey, string $status): string
    {
        $labels = [
            'pending' => 'در انتظار',
            'partial' => 'پرداخت ناقص',
            'paid' => 'پرداخت شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'sent_to_lab' => 'ارسال به لابراتوار',
            'sent_to_radiology' => 'ارسال به رادیولوژی',
            'sent_to_pharmacy' => 'ارسال به دواخانه',
            'cancelled' => 'لغو شده',
            'rejected' => 'رد شده',
            'scheduled' => 'برنامه‌ریزی شده',
            'admitted' => 'بستری',
            'discharged' => 'ترخیص شده',
        ];
        return $labels[$status] ?? $status;
    }

    /**
     * نقشه مراحل
     */
    private function getStepMap(): array
    {
        return [
            'examination' => ['label' => 'معاینه', 'order' => 1, 'table' => 'examinations'],
            'laboratory' => ['label' => 'لابراتوار', 'order' => 2, 'table' => 'laboratory_requests'],
            'radiology' => ['label' => 'رادیولوژی', 'order' => 3, 'table' => 'radiology_requests'],
            'operation' => ['label' => 'عملیات', 'order' => 4, 'table' => 'operation_requests'],
            'pres_insert' => ['label' => 'نسخه', 'order' => 5, 'table' => 'prescriptions'],
            'followup' => ['label' => 'ملاقات بعدی', 'order' => 6, 'table' => 'followups'],
            'admission' => ['label' => 'بستری', 'order' => 7, 'table' => 'admission_requests'],
        ];
    }
}