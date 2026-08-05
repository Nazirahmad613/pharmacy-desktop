<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaboratoryRequest extends Model
{
    use HasFactory, SoftDeletes;

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
    ];

    protected $casts = [
        'request_date' => 'date',
        'sample_collection_date' => 'date',
        'result_date' => 'date',
    ];

    // Relationships
    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function fee()
    {
        return $this->hasOne(LaboratoryFee::class);
    }

    // Accessors
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
        ];

        return $colors[$this->status] ?? '#6b7280';
    }
}