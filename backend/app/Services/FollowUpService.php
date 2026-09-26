<?php
// app/Services/FollowUpService.php

namespace App\Services;

use App\Models\Followup;
use App\Models\Registrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class FollowUpService
{
    /**
     * ============================================================
     * ثبت مراجعه بعدی
     * ============================================================
     */
    public function create(array $data): ?Followup
    {
        try {
            // ✅ اعتبارسنجی reg_id
            $registration = Registrations::with('patient')
                ->where('reg_id', $data['reg_id'])
                ->first();

            if (!$registration) {
                Log::warning('FollowUpService::create — registration not found', [
                    'reg_id' => $data['reg_id'] ?? null,
                ]);
                return null;
            }

            // ✅ اگر قبلاً برای این reg_id ثبت شده، بروزرسانی کن
            $existing = Followup::where('reg_id', $data['reg_id'])
                ->whereIn('status', ['pending', 'confirmed'])
                ->first();

            if ($existing) {
                Log::info('FollowUpService::create — updating existing', [
                    'followup_id' => $existing->id,
                    'reg_id' => $data['reg_id'],
                ]);
                return $this->update($existing->id, $data);
            }

            // ✅ ساخت رکورد جدید
            $followup = new Followup();
            $followup->reg_id          = $data['reg_id'];
            $followup->patient_id      = $data['patient_id'] 
                ?? $registration->patient_id;
            $followup->doctor_id       = $data['doctor_id'] 
                ?? $registration->doctor_id 
                ?? auth()->id();
            $followup->follow_up_date  = $data['follow_up_date'];
            $followup->follow_up_time  = $data['follow_up_time'] ?? null;
            $followup->reason          = $data['reason'] ?? null;
            $followup->instructions    = $data['instructions'] ?? null;
            $followup->priority        = $data['priority'] ?? 'normal';
            $followup->status          = 'pending';
            $followup->created_by      = auth()->id();
            $followup->save();

            // ✅ بارکد خودکار
            if (empty($followup->barcode)) {
                $followup->barcode = $this->generateBarcode($followup);
                $followup->save();
            }

            Log::info('✅ FollowUpService::create — created', [
                'followup_id' => $followup->id,
                'reg_id' => $followup->reg_id,
                'date' => $followup->follow_up_date,
            ]);

            return $followup->fresh(['patient', 'doctor', 'registration']);

        } catch (\Throwable $e) {
            Log::error('FollowUpService::create error', [
                'reg_id' => $data['reg_id'] ?? null,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * بروزرسانی
     * ============================================================
     */
    public function update(int $id, array $data): ?Followup
    {
        try {
            $followup = Followup::find($id);
            if (!$followup) {
                Log::warning('FollowUpService::update — not found', ['id' => $id]);
                return null;
            }

            if (isset($data['follow_up_date']))  $followup->follow_up_date  = $data['follow_up_date'];
            if (isset($data['follow_up_time']))  $followup->follow_up_time  = $data['follow_up_time'];
            if (isset($data['reason']))          $followup->reason          = $data['reason'];
            if (isset($data['instructions']))    $followup->instructions    = $data['instructions'];
            if (isset($data['priority']))        $followup->priority        = $data['priority'];
            if (isset($data['status']))          $followup->status          = $data['status'];
            if (isset($data['doctor_notes']))    $followup->doctor_notes    = $data['doctor_notes'];
            if (isset($data['patient_notes']))   $followup->patient_notes   = $data['patient_notes'];
            if (isset($data['actual_visit_at'])) $followup->actual_visit_at = $data['actual_visit_at'];
            if (isset($data['actual_reg_id']))   $followup->actual_reg_id   = $data['actual_reg_id'];

            $followup->updated_by = auth()->id();
            $followup->save();

            Log::info('✅ FollowUpService::update — updated', [
                'followup_id' => $followup->id,
            ]);

            return $followup->fresh(['patient', 'doctor', 'registration']);

        } catch (\Throwable $e) {
            Log::error('FollowUpService::update error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * حذف (Soft Delete)
     * ============================================================
     */
    public function delete(int $id): bool
    {
        try {
            $followup = Followup::find($id);
            if (!$followup) {
                return false;
            }
            $followup->delete();

            Log::info('🗑️ FollowUpService::delete — deleted', ['id' => $id]);
            return true;

        } catch (\Throwable $e) {
            Log::error('FollowUpService::delete error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * ============================================================
     * بروزرسانی وضعیت
     * ============================================================
     */
    public function updateStatus(int $id, string $status): ?Followup
    {
        try {
            $followup = Followup::find($id);
            if (!$followup) return null;

            $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
            if (!in_array($status, $validStatuses)) {
                Log::warning('FollowUpService::updateStatus — invalid status', [
                    'id' => $id,
                    'status' => $status,
                ]);
                return null;
            }

            $followup->status = $status;
            $followup->updated_by = auth()->id();

            // اگر completed شد
            if ($status === 'completed') {
                $followup->actual_visit_at = now();
            }

            $followup->save();

            Log::info('✅ FollowUpService::updateStatus — done', [
                'id' => $id,
                'status' => $status,
            ]);

            return $followup->fresh();

        } catch (\Throwable $e) {
            Log::error('FollowUpService::updateStatus error', [
                'id' => $id,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * ============================================================
     * ساخت بارکد
     * ============================================================
     */
    protected function generateBarcode(Followup $followup): string
    {
        $date = $followup->follow_up_date 
            ? \Carbon\Carbon::parse($followup->follow_up_date)->format('Ymd') 
            : now()->format('Ymd');

        return 'FUP-' . $date . '-' . str_pad((string) $followup->id, 6, '0', STR_PAD_LEFT);
    }
}