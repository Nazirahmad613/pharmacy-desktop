<?php
// app/Models/TreatmentHistoryItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TreatmentHistoryItem extends Model
{
    use SoftDeletes;

    protected $table = 'treatment_history_items';

    protected $fillable = [
        'history_id',
        'reg_id',
        'step_key',
        'step_label',
        'step_icon',
        'action_type',
        'step_order',
        'ref_id',
        'ref_table',
        'data',
        'summary',
        'amount',
        'paid_amount',
        'payment_status',
        'status',
        'status_label',
        'pdf_file',
        'barcode',
        'step_at',
        'performed_by',
        'performed_by_name',
    ];

    protected $casts = [
        'data'        => 'array',      // ✅ حیاتی — بدون این، data به صورت string برمی‌گردد
        'step_at'     => 'datetime',
        'amount'      => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'step_order'  => 'integer',
        'ref_id'      => 'integer',
        'performed_by'=> 'integer',
    ];

    protected $appends = [
        'display_summary',
    ];

    // ============================================================
    // روابط
    // ============================================================

    public function history()
    {
        return $this->belongsTo(TreatmentHistory::class, 'history_id', 'history_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    // ============================================================
    // Accessors
    // ============================================================

    /**
     * خلاصه‌ی نمایش‌داده‌شده — اگر summary خالی بود، از data می‌سازد
     */
    public function getDisplaySummaryAttribute(): string
    {
        if (!empty($this->summary) && $this->summary !== 'ثبت شد') {
            return $this->summary;
        }

        $data = is_array($this->data) ? $this->data : [];

        switch ($this->step_key) {
            case 'examination':
                $parts = [];
                if (!empty($data['diagnosis']))      $parts[] = "تشخیص: {$data['diagnosis']}";
                if (!empty($data['weight']))         $parts[] = "وزن: {$data['weight']}";
                if (!empty($data['blood_pressure'])) $parts[] = "فشار: {$data['blood_pressure']}";
                return implode(' | ', $parts) ?: 'معاینه انجام شد';

            case 'laboratory':
                $name = $data['test_name'] ?? $data['test_type'] ?? $data['name'] ?? null;
                if (!$name && !empty($data['tests']) && is_array($data['tests']) && count($data['tests']) > 0) {
                    $name = $data['tests'][0]['test_name'] ?? $data['tests'][0]['test_type'] ?? null;
                }
                $name = $name ?: 'تست لابراتوار';
                $count = !empty($data['tests']) && is_array($data['tests']) ? count($data['tests']) : 1;
                $summary = "تست: {$name}";
                if ($count > 1) $summary .= " ({$count} تست)";
                if (!empty($data['barcode'])) $summary .= " | بارکد: {$data['barcode']}";
                return $summary;

            case 'radiology':
                $name = $data['radiology_type'] ?? $data['type'] ?? $data['name'] ?? 'رادیولوژی';
                $part = $data['body_part'] ?? '';
                $summary = "رادیولوژی: {$name}";
                if ($part) $summary .= " ({$part})";
                return $summary;

            case 'operation':
                $surgery = $data['surgery_type'] ?? $data['operation_type'] ?? $data['name'] ?? '-';
                $surgeon = $data['surgeon'] ?? $data['surgeon_name'] ?? '-';
                return "عملیات: {$surgery} | جراح: {$surgeon}";

            case 'pres_insert':
            case 'prescription':
                $count = $data['items_count'] ?? (is_array($data['items'] ?? null) ? count($data['items']) : 0);
                return "نسخه با {$count} قلم دارو";

            case 'followup':
                return "ملاقات بعدی: " . ($data['followup_date'] ?? $data['next_visit_date'] ?? '-');

            case 'admission':
                $ward = $data['ward_name'] ?? ($data['ward']['name'] ?? '-');
                return "بستری در {$ward}";

            default:
                return 'ثبت شد';
        }
    }
}