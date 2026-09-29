<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExternalPrescription extends Model
{
    use HasFactory;

    protected $table = 'external_prescriptions';

    protected $fillable = [
        'patient_name',
        'patient_age',
        'patient_gender',
        'patient_phone',
        'tazkira_number',
        'patient_address',
        'doctor_name',
        'diagnosis',
        'total_amount',
        'discount',
        'status',
        'created_by',
        'paid_by',
        'paid_at',
        'notes',
        'receipt_number',
    ];

    protected $casts = [
        'patient_age' => 'integer',
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============ Relationships ============

    public function items()
    {
        return $this->hasMany(ExternalPrescriptionItem::class, 'external_pres_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payer()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    // ============ Scopes ============

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeSentToRegistration($query)
    {
        return $query->where('status', 'sent_to_registration');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    // ============ Accessors ============

    public function getNetAmountAttribute()
    {
        return $this->total_amount - $this->discount;
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار پرداخت',
            'sent_to_registration' => 'ارسال شده به رسپشن',
            'paid' => 'پرداخت شده',
            'cancelled' => 'لغو شده',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    // ============ Helpers ============

    /**
     * تولید شماره رسید یکتا
     */
    public static function generateReceiptNumber()
    {
        $prefix = 'EXT-' . date('Ymd') . '-';
        $last = self::where('receipt_number', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->first();

        $num = 1;
        if ($last && $last->receipt_number) {
            $parts = explode('-', $last->receipt_number);
            $num = (int)end($parts) + 1;
        }

        return $prefix . str_pad($num, 4, '0', STR_PAD_LEFT);
    }

    /**
     * محاسبه مجدد مبلغ کل از اقلام
     */
    public function recalculateTotal()
    {
        $this->total_amount = $this->items()->sum('total_price');
        $this->save();
        return $this->total_amount;
    }

    /**
     * علامت‌گذاری به عنوان پرداخت شده
     */
    public function markAsPaid($userId = null)
    {
        $this->status = 'paid';
        $this->paid_by = $userId;
        $this->paid_at = now();
        $this->save();
    }

    /**
     * لغو کردن نسخه
     */
    public function cancel($reason = null)
    {
        $this->status = 'cancelled';
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . 'دلیل لغو: ' . $reason;
        }
        $this->save();
    }
}