<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaboratoryResult extends Model
{
    use SoftDeletes;

    protected $table = 'laboratory_results';

    protected $fillable = [
        'laboratory_request_id',
        'registration_id',
        'patient_id',
        'report_no',
        'result_status',
        'result',
        'normal_range',
        'interpretation',
        'remarks',
        'recommendation',
        'pdf_file',
        'pdf_file_name',
        'sample_received_at',
        'analysis_started_at',
        'analysis_completed_at',
        'is_printed',
        'print_count',
        'last_printed_at',
        'is_delivered',
        'delivery_method',
        'delivered_to',
        'is_abnormal',
        'is_critical',
    ];

    protected $casts = [
        'sample_received_at' => 'datetime',
        'analysis_started_at' => 'datetime',
        'analysis_completed_at' => 'datetime',
        'last_printed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
        'is_printed' => 'boolean',
        'is_delivered' => 'boolean',
        'is_abnormal' => 'boolean',
        'is_critical' => 'boolean',
        'print_count' => 'integer',
    ];

    // ============ Relationships ============

    public function laboratoryRequest()
    {
        return $this->belongsTo(LaboratoryRequest::class, 'laboratory_request_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    // ============ Accessors ============

    public function getStatusLabelAttribute()
    {
        $labels = [
            'Draft' => 'پیش‌نویس',
            'Completed' => 'تکمیل شده',
            'Verified' => 'تایید شده',
            'Delivered' => 'تحویل شده',
            'Cancelled' => 'لغو شده',
        ];
        return $labels[$this->result_status] ?? $this->result_status;
    }

    public function getPdfUrlAttribute()
    {
        if ($this->pdf_file) {
            return asset('storage/' . $this->pdf_file);
        }
        return null;
    }

    public function getPatientFullNameAttribute()
    {
        if ($this->patient) {
            return trim($this->patient->first_name . ' ' . $this->patient->last_name);
        }
        return 'نامشخص';
    }
}