<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyResult extends Model
{
    use SoftDeletes;

    protected $table = 'radiology_results';

    protected $fillable = [
        'radiology_request_id',
        'reg_id', // ✅ استفاده از reg_id
        'patient_id',
        'doctor_id',
        'report_no',
        'result_status',
        'result',
        'findings',
        'interpretation',
        'remarks',
        'normal_range',
        'pdf_file',
        'pdf_file_name',
        'pdf_url',
        'analysis_completed_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'analysis_completed_at' => 'datetime',
    ];

    // ============ Relations ============
    
    public function radiologyRequest()
    {
        return $this->belongsTo(RadiologyRequest::class, 'radiology_request_id');
    }

    // ✅ اصلاح: استفاده از Registrations و reg_id
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ============ Accessors ============
    public function getResultStatusLabelAttribute()
    {
        $labels = [
            'Draft' => 'پیش‌نویس',
            'Completed' => 'تکمیل شده',
            'Verified' => 'تأیید شده',
            'Cancelled' => 'لغو شده',
        ];
        return $labels[$this->result_status] ?? $this->result_status;
    }

    public function getPatientFullNameAttribute()
    {
        return $this->patient ? trim($this->patient->first_name . ' ' . $this->patient->last_name) : null;
    }

    // ============ Scopes ============
    public function scopeWithResult($query)
    {
        return $query->where('has_result', true);
    }

    public function scopeWithoutResult($query)
    {
        return $query->where('has_result', false);
    }

    // ============ Boot ============
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->report_no)) {
                $model->report_no = self::generateReportNo();
            }
        });

        static::created(function ($model) {
            // به‌روزرسانی وضعیت درخواست رادیولوژی
            if ($model->radiologyRequest) {
                $model->radiologyRequest->update([
                    'has_result' => true,
                    'status' => 'completed',
                    'completed_date' => now(),
                ]);
            }
        });

        static::deleted(function ($model) {
            // به‌روزرسانی وضعیت درخواست رادیولوژی
            if ($model->radiologyRequest) {
                $model->radiologyRequest->update([
                    'has_result' => false,
                    'status' => 'sent_to_radiology',
                    'completed_date' => null,
                ]);
            }
        });
    }

    // ============ Helpers ============
    public static function generateReportNo()
    {
        do {
            $reportNo = 'RAD-RPT-' . date('Ymd') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (self::where('report_no', $reportNo)->exists());
        
        return $reportNo;
    }

    public function hasResult()
    {
        return $this->has_result && !empty($this->result);
    }
}