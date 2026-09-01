<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaboratoryRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'laboratory_requests';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'test_type',
        'test_name',
        'test_description',
        'clinical_indication',
        'special_notes',
        'request_date',
        'sample_collection_date',
        'status',
        'results',
        'result_file_path',
        'result_date',
        'barcode',
        'sent_to_lab_at',
        'fee_id',          // ← اضافه شد
    ];

    protected $casts = [
        'request_date' => 'date',
        'sample_collection_date' => 'date',
        'result_date' => 'date',
        'sent_to_lab_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'fee_id' => 'integer',
        'patient_id' => 'integer',
        'doctor_id' => 'integer',
    ];

    /**
     * ============================================================
     * Relationships
     * ============================================================
     */

    /**
     * رابطه با جدول registrations از طریق reg_id
     */
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id', 'reg_id');
    }

    /**
     * رابطه با جدول patients
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * رابطه با جدول users (داکتر)
     */
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * رابطه با جدول laboratory_fees
     */
    public function fee()
    {
        return $this->belongsTo(LaboratoryFee::class, 'fee_id');
    }

    /**
     * ============================================================
     * رابطه با LaboratoryResult
     * ============================================================
     */

    /**
     * رابطه یک به یک با LaboratoryResult
     * هر درخواست لابراتوار می‌تواند یک نتیجه داشته باشد
     */
    public function result()
    {
        return $this->hasOne(LaboratoryResult::class, 'laboratory_request_id');
    }

    /**
     * دریافت نتیجه با جزئیات کامل
     */
    public function resultWithDetails()
    {
        return $this->hasOne(LaboratoryResult::class, 'laboratory_request_id')
            ->with(['patient', 'registration', 'doctor', 'technician', 'verifiedBy']);
    }

    /**
     * بررسی وجود نتیجه
     */
    public function hasResult()
    {
        return $this->result()->exists();
    }

    /**
     * دریافت آخرین نتیجه
     */
    public function latestResult()
    {
        return $this->result()->latest()->first();
    }

    /**
     * ============================================================
     * Accessors
     * ============================================================
     */

    public function getTestTypeLabelAttribute()
    {
        $labels = [
            'blood' => 'خون',
            'urine' => 'ادرار',
            'stool' => 'مدفوع',
            'biochemistry' => 'بیوشیمی',
            'hormonal' => 'هورمونی',
            'microbial' => 'میکروبی',
            'pathology' => 'پاتولوژی',
            'genetic' => 'ژنتیک',
            'imaging' => 'تصویربرداری',
            'other' => 'سایر',
        ];

        return $labels[$this->test_type] ?? $this->test_type;
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'sample_taken' => 'نمونه گرفته شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده',
            'rejected' => 'رد شده',
            'sent_to_lab' => 'ارسال به لابراتوار',
        ];

        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'pending' => '#f59e0b',
            'sample_taken' => '#3b82f6',
            'in_progress' => '#8b5cf6',
            'completed' => '#10b981',
            'cancelled' => '#6b7280',
            'rejected' => '#ef4444',
            'sent_to_lab' => '#8b5cf6',
        ];

        return $colors[$this->status] ?? '#6b7280';
    }

    /**
     * دریافت نام کامل بیمار
     */
    public function getPatientNameAttribute()
    {
        if ($this->patient) {
            return trim($this->patient->first_name . ' ' . $this->patient->last_name);
        }
        return 'نامشخص';
    }

    /**
     * دریافت نام داکتر
     */
    public function getDoctorNameAttribute()
    {
        return $this->doctor?->name ?? 'نامشخص';
    }

    /**
     * ============================================================
     * Scopes
     * ============================================================
     */

    /**
     * فیلتر درخواست‌های دارای فیس
     */
    public function scopeWithFee($query)
    {
        return $query->whereNotNull('fee_id');
    }

    /**
     * فیلتر درخواست‌های بدون فیس
     */
    public function scopeWithoutFee($query)
    {
        return $query->whereNull('fee_id');
    }

    /**
     * فیلتر درخواست‌های دارای نتیجه
     */
    public function scopeWithResult($query)
    {
        return $query->whereHas('result');
    }

    /**
     * فیلتر درخواست‌های بدون نتیجه
     */
    public function scopeWithoutResult($query)
    {
        return $query->whereDoesntHave('result');
    }

    /**
     * فیلتر بر اساس وضعیت
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * فیلتر بر اساس بیمار
     */
    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    /**
     * فیلتر بر اساس مراجعه
     */
    public function scopeByRegistration($query, $regId)
    {
        return $query->where('reg_id', $regId);
    }

    /**
     * فیلتر بر اساس نوع تست
     */
    public function scopeByTestType($query, $testType)
    {
        return $query->where('test_type', $testType);
    }

    /**
     * ============================================================
     * Helper Methods
     * ============================================================
     */

    /**
     * علامت‌گذاری به عنوان ارسال شده به لابراتوار
     */
    public function markAsSentToLab()
    {
        $this->status = 'sent_to_lab';
        $this->sent_to_lab_at = now();
        $this->save();
    }

    /**
     * علامت‌گذاری به عنوان تکمیل شده
     */
    public function markAsCompleted()
    {
        $this->status = 'completed';
        $this->result_date = now();
        $this->save();
    }

    /**
     * علامت‌گذاری به عنوان لغو شده
     */
    public function markAsCancelled()
    {
        $this->status = 'cancelled';
        $this->save();
    }

    /**
     * بررسی اینکه آیا درخواست کامل شده است
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    /**
     * بررسی اینکه آیا درخواست به لابراتوار ارسال شده است
     */
    public function isSentToLab()
    {
        return $this->status === 'sent_to_lab';
    }

    /**
     * دریافت نتایج به همراه اطلاعات کامل
     */
    public function getResultWithDetails()
    {
        return $this->result()->with([
            'patient',
            'registration',
            'doctor',
            'technician',
            'verifiedBy'
        ])->first();
    }
}