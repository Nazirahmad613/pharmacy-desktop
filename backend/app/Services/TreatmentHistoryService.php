<?php
// app/Services/TreatmentHistoryService.php

namespace App\Services;

use App\Models\TreatmentHistory;
use App\Models\TreatmentHistoryItem;
use App\Models\Registrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class TreatmentHistoryService
{
    /**
     * ============================================================
     * همگام‌سازی تاریخچه اصلی
     * ============================================================
     */
    public function syncMainHistory(int $regId, array $progressData = []): ?TreatmentHistory
    {
        try {
            $registration = Registrations::with(['patient'])
                ->where('reg_id', $regId)
                ->first();

            if (!$registration) {
                Log::warning("syncMainHistory: registration not found", ['reg_id' => $regId]);
                return null;
            }

            $history = TreatmentHistory::firstOrNew(['reg_id' => $regId]);

            $patient = $registration->patient;

            $history->patient_id   = $registration->patient_id;
            $history->visit_number = $registration->visit_number;
            $history->queue_number = $registration->queue_number ?? $history->queue_number;

            // ✅ دریافت doctor_id از examinations.user_id (منبع اصلی)
            $doctorId = null;

            if (Schema::hasTable('examinations')) {
                try {
                    $doctorId = DB::table('examinations')
                        ->where('registration_id', $regId)
                        ->whereNotNull('user_id')
                        ->orderByDesc('id')
                        ->value('user_id');
                } catch (\Throwable $e) {
                    Log::warning("syncMainHistory: failed to read examinations.user_id", [
                        'reg_id' => $regId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // اگر پیدا نشد، از registrations.doctor_id
            if (!$doctorId && !empty($registration->doctor_id)) {
                $doctorId = $registration->doctor_id;
            }

            // اگر باز پیدا نشد، از current user
            if (!$doctorId && auth()->check()) {
                $doctorId = auth()->id();
            }

            if ($doctorId) {
                $history->doctor_id = $doctorId;

                if (Schema::hasTable('users')) {
                    try {
                        $doctor = DB::table('users')->where('id', $doctorId)->first();
                        if ($doctor) {
                            $history->doctor_name = $doctor->name
                                ?? $doctor->full_name
                                ?? $doctor->username
                                ?? null;

                            $history->doctor_specialty = $doctor->specialty
                                ?? $doctor->specialization
                                ?? null;
                        }
                    } catch (\Throwable $e) {
                        Log::warning("syncMainHistory: failed to load doctor", [
                            'doctor_id' => $doctorId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            if ($patient) {
                $history->patient_name        = trim(($patient->first_name ?? '') . ' ' . ($patient->last_name ?? ''));
                $history->tazkira_number      = $patient->national_id ?? $patient->tazkira_number ?? null;
                $history->patient_age         = $patient->age ?? null;
                $history->patient_gender      = $patient->gender ?? null;
                $history->patient_phone       = $patient->mobile ?? $patient->phone ?? null;
                $history->patient_blood_group = $patient->blood_group ?? null;
            }

            $history->visit_status       = $registration->visit_status ?? $history->visit_status ?? 'InProgress';
            $history->current_step       = $progressData['current_step'] ?? $history->current_step ?? 'examination';
            $history->current_step_index = $progressData['current_step_index'] ?? $history->current_step_index ?? 0;
            $history->completed_steps    = $progressData['completed_steps'] ?? $history->completed_steps ?? ['queue'];

            $history->diagnosis      = $registration->diagnosis ?? $history->diagnosis;
            $history->weight         = $registration->weight ?? $history->weight;
            $history->blood_pressure = $registration->blood_pressure ?? $history->blood_pressure;
            $history->temperature    = $registration->temperature ?? $history->temperature;
            $history->oxygen         = $registration->oxygen ?? $history->oxygen;

            if ($registration->created_at && !$history->sent_to_doctor_at) {
                $history->sent_to_doctor_at = $registration->created_at;
            }
            if (!$history->treatment_started_at) {
                $history->treatment_started_at = now();
            }

            $history->save();

            $this->updateCounters($history);

            return $history->fresh();

        } catch (\Throwable $e) {
            Log::error('syncMainHistory error', [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * به‌روزرسانی شمارنده‌ها
     * ============================================================
     */
    public function updateCounters(TreatmentHistory $history): void
    {
        $regId = $history->reg_id;

        // ✅ معاینات — examinations ستون registration_id دارد
        $history->examinations_count = $this->safeCountExaminations($regId);

        $history->laboratory_tests_count   = $this->safeCount('laboratory_requests', $regId);
        $history->radiology_requests_count = $this->safeCount('radiology_requests', $regId);
        $history->operations_count         = $this->safeCount('operation_requests', $regId);
        $history->prescriptions_count      = $this->safeCount('prescriptions', $regId);
        $history->admissions_count         = $this->safeCount('admission_requests', $regId);
        $history->followups_count          = $this->safeCount('followups', $regId);

        // ─── مجموع مالی ───
        $totalAmount = 0;
        $totalPaid   = 0;

        if (Schema::hasTable('laboratory_fees')) {
            try {
                $totalAmount += (float) DB::table('laboratory_fees')->where('reg_id', $regId)->sum('amount');
                $totalPaid   += (float) DB::table('laboratory_fees')->where('reg_id', $regId)->sum('paid_amount');
            } catch (\Throwable $e) {}
        }

        if (Schema::hasTable('prescription_fees')) {
            try {
                $totalAmount += (float) DB::table('prescription_fees')->where('registration_id', $regId)->sum('total_amount');
                $totalPaid   += (float) DB::table('prescription_fees')->where('registration_id', $regId)->sum('paid_amount');
            } catch (\Throwable $e) {}
        }

        if (Schema::hasTable('admission_fees')) {
            try {
                $totalAmount += (float) DB::table('admission_fees')->where('reg_id', $regId)->sum('amount');
                $totalPaid   += (float) DB::table('admission_fees')->where('reg_id', $regId)->sum('paid_amount');
            } catch (\Throwable $e) {}
        }

        if (Schema::hasTable('operation_fees') && Schema::hasTable('operation_requests')) {
            try {
                $opIds = DB::table('operation_requests')->where('reg_id', $regId)->pluck('id')->toArray();
                if (!empty($opIds)) {
                    $totalAmount += (float) DB::table('operation_fees')->whereIn('operation_request_id', $opIds)->sum('total_amount');
                    $totalPaid   += (float) DB::table('operation_fees')->whereIn('operation_request_id', $opIds)->sum('paid_amount');
                }
            } catch (\Throwable $e) {}
        }

        $history->total_amount    = $totalAmount;
        $history->total_paid      = $totalPaid;
        $history->total_remaining = max(0, $totalAmount - $totalPaid);

        $history->save();
    }

    /**
     * شمارش امن در جدول با ستون reg_id
     */
    protected function safeCount(string $table, int $regId): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }

        try {
            if (!Schema::hasColumn($table, 'reg_id')) {
                return 0;
            }

            return (int) DB::table($table)->where('reg_id', $regId)->count();
        } catch (\Throwable $e) {
            Log::warning("safeCount failed for {$table}", ['message' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * ✅ شمارش امن معاینات — examinations ستون registration_id دارد
     */
    protected function safeCountExaminations(int $regId): int
    {
        if (!Schema::hasTable('examinations')) return 0;

        try {
            if (Schema::hasColumn('examinations', 'registration_id')) {
                return (int) DB::table('examinations')
                    ->where('registration_id', $regId)
                    ->count();
            }

            if (Schema::hasColumn('examinations', 'reg_id')) {
                return (int) DB::table('examinations')
                    ->where('reg_id', $regId)
                    ->count();
            }

            return 0;
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * ============================================================
     * افزودن آیتم به تاریخچه
     * ============================================================
     */
    public function addItem(
        int $regId,
        string $stepKey,
        array $stepData = [],
        ?int $refId = null,
        ?string $refTable = null
    ): ?TreatmentHistoryItem {
        try {
            $history = TreatmentHistory::firstOrCreate(
                ['reg_id' => $regId],
                ['patient_id' => Registrations::where('reg_id', $regId)->value('patient_id')]
            );

            $stepOrderMap = [
                'examination'   => 1,
                'laboratory'    => 2,
                'radiology'     => 3,
                'operation'     => 4,
                'pres_insert'   => 5,
                'prescription'  => 5,
                'followup'      => 6,
                'admission'     => 7,
            ];
            $stepOrder = $stepOrderMap[$stepKey] ?? 99;

            $meta = $this->getStepMeta($stepKey);

            if (!$refId && !empty($stepData['id'])) {
                $refId = (int) $stepData['id'];
            }
            if (!$refId && !empty($stepData['pres_id'])) {
                $refId = (int) $stepData['pres_id'];
            }

            $summary = $this->buildSummary($stepKey, $stepData);

            $item = new TreatmentHistoryItem();
            $item->history_id   = $history->history_id;
            $item->reg_id       = $regId;
            $item->step_key     = $stepKey;
            $item->step_label   = $meta['label'];
            $item->step_icon    = $meta['icon'];
            $item->step_order   = $stepOrder;
            $item->step_at      = now();

            $item->ref_id       = $refId;
            $item->ref_table    = $refTable ?? $meta['table'];

            $item->status       = $stepData['status'] ?? 'completed';
            $item->summary      = $summary;

            $item->amount       = $stepData['amount'] ?? $stepData['total_amount'] ?? null;
            $item->paid_amount  = $stepData['paid_amount'] ?? null;
            $item->barcode      = $stepData['barcode'] ?? null;

            if (!empty($stepData['pdf_url'])) {
                $item->pdf_file = $stepData['pdf_url'];
            } elseif (!empty($stepData['pdf_file'])) {
                $item->pdf_file = $stepData['pdf_file'];
            }

            $item->data = $stepData;

            $item->performed_by      = $stepData['performed_by'] ?? null;
            $item->performed_by_name = $stepData['performed_by_name'] ?? null;

            $item->save();

            $this->updateCounters($history);

            return $item;

        } catch (\Throwable $e) {
            Log::error('addItem error', [
                'reg_id' => $regId,
                'step_key' => $stepKey,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * نهایی‌سازی
     * ============================================================
     */
    public function finalizeHistory(int $regId): ?TreatmentHistory
    {
        try {
            $history = TreatmentHistory::where('reg_id', $regId)->first();
            if (!$history) {
                $history = $this->syncMainHistory($regId);
            }
            if (!$history) return null;

            $history->visit_status = 'Completed';
            $history->treatment_completed_at = now();

            $registration = Registrations::where('reg_id', $regId)->first();
            if ($registration) {
                $history->diagnosis = $registration->diagnosis ?? $history->diagnosis;
                $history->summary   = $registration->summary ?? $history->summary;
            }

            $history->save();

            $this->updateCounters($history);

            return $history->fresh(['items']);

        } catch (\Throwable $e) {
            Log::error('finalizeHistory error', [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * بازسازی کامل
     * ============================================================
     */
    public function rebuildHistory(int $regId): ?TreatmentHistory
    {
        Log::info('🔄 rebuildHistory START', ['reg_id' => $regId]);

        try {
            DB::beginTransaction();

            TreatmentHistoryItem::where('reg_id', $regId)->delete();

            $history = $this->syncMainHistory($regId);
            if (!$history) {
                DB::rollBack();
                Log::error('❌ rebuildHistory: syncMainHistory failed', ['reg_id' => $regId]);
                return null;
            }

            $this->rebuildExaminations($regId);
            $this->rebuildLaboratory($regId);
            $this->rebuildRadiology($regId);
            $this->rebuildOperations($regId);
            $this->rebuildPrescriptions($regId);
            $this->rebuildFollowUps($regId);
            $this->rebuildAdmissions($regId);

            $this->updateCounters($history);

            DB::commit();

            $itemsCount = TreatmentHistoryItem::where('reg_id', $regId)->count();
            Log::info('✅ rebuildHistory DONE', [
                'reg_id' => $regId,
                'items_count' => $itemsCount,
            ]);

            return $history->fresh(['items']);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('❌ rebuildHistory error', [
                'reg_id' => $regId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    // ============================================================
    //  بازسازی هر بخش
    // ============================================================

    protected function rebuildExaminations(int $regId): void
    {
        if (!Schema::hasTable('examinations')) return;

        try {
            // ✅ examinations ستون registration_id دارد
            $rows = DB::table('examinations')
                ->where('registration_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildExaminations: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;
                $data['status'] = 'completed';

                // ✅ نام داکتر از جدول users با user_id
                if (!empty($row->user_id)) {
                    try {
                        $doctor = DB::table('users')->where('id', $row->user_id)->first();
                        if ($doctor) {
                            $doctorName = $doctor->name
                                ?? $doctor->full_name
                                ?? $doctor->username
                                ?? null;

                            $data['performed_by']      = $doctor->id;
                            $data['performed_by_name'] = $doctorName;
                            $data['doctor_name']       = $doctorName;
                        }
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'examination', $data, $row->id, 'examinations');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildExaminations failed: {$e->getMessage()}");
        }
    }

    protected function rebuildLaboratory(int $regId): void
    {
        if (!Schema::hasTable('laboratory_requests')) return;

        try {
            $rows = DB::table('laboratory_requests')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildLaboratory: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;

                // فیس
                if (Schema::hasTable('laboratory_fees') && !empty($row->fee_id)) {
                    try {
                        $fee = DB::table('laboratory_fees')->where('id', $row->fee_id)->first();
                        if ($fee) {
                            $data['amount']         = (float) $fee->amount;
                            $data['paid_amount']    = (float) $fee->paid_amount;
                            $data['payment_status'] = $fee->payment_status;
                        }
                    } catch (\Throwable $e) {}
                }

                // نتیجه
                if (Schema::hasTable('laboratory_results')) {
                    try {
                        $result = DB::table('laboratory_results')
                            ->where('laboratory_request_id', $row->id)
                            ->first();
                        if ($result) {
                            $data['has_result'] = true;
                            $data['result']     = $result->result ?? null;
                            $data['pdf_url']    = !empty($result->pdf_file)
                                ? asset('storage/' . $result->pdf_file)
                                : null;
                        }
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'laboratory', $data, $row->id, 'laboratory_requests');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildLaboratory failed: {$e->getMessage()}");
        }
    }

    protected function rebuildRadiology(int $regId): void
    {
        if (!Schema::hasTable('radiology_requests')) return;

        try {
            $rows = DB::table('radiology_requests')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildRadiology: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;

                // فیس
                if (Schema::hasTable('radiology_fees') && !empty($row->fee_id)) {
                    try {
                        $fee = DB::table('radiology_fees')->where('id', $row->fee_id)->first();
                        if ($fee) {
                            $data['amount']         = (float) $fee->amount;
                            $data['paid_amount']    = (float) $fee->paid_amount;
                            $data['payment_status'] = $fee->payment_status;
                        }
                    } catch (\Throwable $e) {}
                }

                // نتیجه
                if (Schema::hasTable('radiology_results')) {
                    try {
                        $result = DB::table('radiology_results')
                            ->where('radiology_request_id', $row->id)
                            ->first();
                        if ($result) {
                            $data['has_result'] = true;
                            $data['result']     = $result->result ?? null;
                            $data['findings']   = $result->findings ?? null;
                            $data['pdf_url']    = !empty($result->pdf_file)
                                ? asset('storage/' . $result->pdf_file)
                                : null;
                        }
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'radiology', $data, $row->id, 'radiology_requests');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildRadiology failed: {$e->getMessage()}");
        }
    }

    protected function rebuildOperations(int $regId): void
    {
        if (!Schema::hasTable('operation_requests')) return;

        try {
            $rows = DB::table('operation_requests')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildOperations: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;

                if (Schema::hasTable('operation_fees')) {
                    try {
                        $fee = DB::table('operation_fees')
                            ->where('operation_request_id', $row->id)
                            ->first();
                        if ($fee) {
                            $data['amount']         = (float) ($fee->total_amount ?? $fee->amount ?? 0);
                            $data['paid_amount']    = (float) ($fee->paid_amount ?? 0);
                            $data['payment_status'] = $fee->payment_status ?? null;
                        }
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'operation', $data, $row->id, 'operation_requests');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildOperations failed: {$e->getMessage()}");
        }
    }

    protected function rebuildPrescriptions(int $regId): void
    {
        if (!Schema::hasTable('prescriptions')) return;

        try {
            $rows = DB::table('prescriptions')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildPrescriptions: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;

                // تعداد اقلام
                if (Schema::hasTable('prescription_items')) {
                    try {
                        $data['items_count'] = DB::table('prescription_items')
                            ->where('pres_id', $row->pres_id)
                            ->count();
                    } catch (\Throwable $e) {}
                }

                // فیس
                if (Schema::hasTable('prescription_fees')) {
                    try {
                        $fee = DB::table('prescription_fees')
                            ->where('registration_id', $regId)
                            ->where('patient_id', $row->patient_id)
                            ->orderByDesc('id')
                            ->first();
                        if ($fee) {
                            $data['amount']         = (float) $fee->total_amount;
                            $data['paid_amount']    = (float) $fee->paid_amount;
                            $data['payment_status'] = $fee->payment_status;
                            $data['fee_id']         = $fee->id;
                        }
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'pres_insert', $data, $row->pres_id, 'prescriptions');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildPrescriptions failed: {$e->getMessage()}");
        }
    }

    protected function rebuildFollowUps(int $regId): void
    {
        if (!Schema::hasTable('followups')) return;

        try {
            $rows = DB::table('followups')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildFollowUps: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $this->addItem($regId, 'followup', (array) $row, $row->id, 'followups');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildFollowUps failed: {$e->getMessage()}");
        }
    }

    protected function rebuildAdmissions(int $regId): void
    {
        if (!Schema::hasTable('admission_requests')) return;

        try {
            $rows = DB::table('admission_requests')
                ->where('reg_id', $regId)
                ->orderBy('created_at')
                ->get();

            Log::info("rebuildAdmissions: found {$rows->count()} rows", ['reg_id' => $regId]);

            foreach ($rows as $row) {
                $data = (array) $row;

                if (Schema::hasTable('wards') && !empty($row->ward_id)) {
                    try {
                        $ward = DB::table('wards')->where('id', $row->ward_id)->first();
                        if ($ward) $data['ward_name'] = $ward->name;
                    } catch (\Throwable $e) {}
                }

                if (Schema::hasTable('admission_fees')) {
                    try {
                        $totalAmount = (float) DB::table('admission_fees')
                            ->where('admission_request_id', $row->id)
                            ->sum('amount');
                        $totalPaid = (float) DB::table('admission_fees')
                            ->where('admission_request_id', $row->id)
                            ->where('status', 'paid')
                            ->sum('amount');
                        $data['amount']         = $totalAmount;
                        $data['paid_amount']    = $totalPaid;
                        $data['payment_status'] = $totalPaid >= $totalAmount && $totalAmount > 0
                            ? 'paid'
                            : ($totalPaid > 0 ? 'partial' : 'pending');
                    } catch (\Throwable $e) {}
                }

                $this->addItem($regId, 'admission', $data, $row->id, 'admission_requests');
            }
        } catch (\Throwable $e) {
            Log::warning("rebuildAdmissions failed: {$e->getMessage()}");
        }
    }

    // ============================================================
    //  کمکی
    // ============================================================

    protected function getStepMeta(string $stepKey): array
    {
        $map = [
            'examination'  => ['label' => 'معاینه',      'icon' => '🩺', 'table' => 'examinations'],
            'laboratory'   => ['label' => 'لابراتوار',   'icon' => '🔬', 'table' => 'laboratory_requests'],
            'radiology'    => ['label' => 'رادیولوژی',   'icon' => '📷', 'table' => 'radiology_requests'],
            'operation'    => ['label' => 'عملیات',      'icon' => '🔪', 'table' => 'operation_requests'],
            'pres_insert'  => ['label' => 'نسخه',        'icon' => '📝', 'table' => 'prescriptions'],
            'prescription' => ['label' => 'نسخه',        'icon' => '📝', 'table' => 'prescriptions'],
            'followup'     => ['label' => 'ملاقات بعدی', 'icon' => '📅', 'table' => 'followups'],
            'admission'    => ['label' => 'بستری',       'icon' => '🏥', 'table' => 'admission_requests'],
        ];

        return $map[$stepKey] ?? ['label' => $stepKey, 'icon' => '📄', 'table' => null];
    }

    protected function buildSummary(string $stepKey, array $data): string
    {
        switch ($stepKey) {
            case 'examination':
                $parts = [];
                if (!empty($data['diagnosis']))      $parts[] = "تشخیص: {$data['diagnosis']}";
                if (!empty($data['weight']))         $parts[] = "وزن: {$data['weight']}";
                if (!empty($data['blood_pressure'])) $parts[] = "فشار: {$data['blood_pressure']}";
                return implode(' | ', $parts) ?: 'معاینه انجام شد';

            case 'laboratory':
                $name = $data['test_name'] ?? $data['test_type'] ?? '';
                return "تست: {$name}" . (!empty($data['barcode']) ? " | بارکد: {$data['barcode']}" : '');

            case 'radiology':
                $name = $data['radiology_type'] ?? '';
                $part = $data['body_part'] ?? '';
                return "رادیولوژی: {$name}" . ($part ? " ({$part})" : '');

            case 'operation':
                return "عملیات: " . ($data['surgery_type'] ?? '-') . " | جراح: " . ($data['surgeon'] ?? '-');

            case 'pres_insert':
            case 'prescription':
                $count = $data['items_count'] ?? 0;
                return "نسخه با {$count} قلم دارو";

            case 'followup':
                return "ملاقات بعدی: " . ($data['followup_date'] ?? $data['next_visit_date'] ?? '-');

            case 'admission':
                return "بستری در " . ($data['ward_name'] ?? '-');

            default:
                return 'ثبت شد';
        }
    }
}