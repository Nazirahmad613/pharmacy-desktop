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
        'registration_id',
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
        'fee_id',
        'sent_to_lab_at',
    ];

    protected $casts = [
        'request_date' => 'date',
        'sample_collection_date' => 'date',
        'result_date' => 'date',
        'sent_to_lab_at' => 'datetime',
        'fee_id' => 'integer',
        'registration_id' => 'integer',
        'patient_id' => 'integer',
        'doctor_id' => 'integer',
        'status' => 'string',
    ];

    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'registration_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function fee()
    {
        return $this->hasOne(LaboratoryFee::class, 'laboratory_request_id');
    }

    public function getTestTypeLabelAttribute()
    {
        $labels = [
            'blood' => '🩸 آزمایش خون',
            'urine' => '💧 آزمایش ادرار',
            'stool' => '💩 آزمایش مدفوع',
            'biochemistry' => '🧪 بیوشیمی',
            'hormonal' => '🧬 هورمونی',
            'microbial' => '🦠 میکروبی',
            'pathology' => '🔬 پاتولوژی',
            'genetic' => '🧬 ژنتیک',
            'imaging' => '📷 تصویربرداری',
            'other' => '📋 سایر',
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
}