<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaboratoryTest extends Model
{
    use SoftDeletes;

    protected $table = 'laboratory_tests';

    protected $fillable = [
        'registration_id',
        'patient_id',
        'doctor_id',
        'user_id',
        'test_type',
        'test_name',
        'test_description',
        'clinical_indication',
        'special_notes',
        'request_date',
        'sample_collection_date',
        'test_date',
        'result_date',
        'status',
        'result_summary',
        'result_details',
        'interpretation',
        'doctor_comment',
        'result_file',
        'test_parameters',
        'result_values'
    ];

    protected $casts = [
        'test_parameters' => 'array',
        'result_values' => 'array',
        'request_date' => 'date',
        'sample_collection_date' => 'date',
        'test_date' => 'date',
        'result_date' => 'date',
    ];

    // ============ Relations ============
    public function registration()
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ============ Accessors ============
    public function getStatusLabelAttribute()
    {
        $statuses = [
            'pending' => 'در انتظار',
            'sample_taken' => 'نمونه گرفته شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده',
            'rejected' => 'رد شده'
        ];
        return $statuses[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'pending' => '#f59e0b',      // زرد
            'sample_taken' => '#3b82f6', // آبی
            'in_progress' => '#8b5cf6',  // بنفش
            'completed' => '#10b981',    // سبز
            'cancelled' => '#6b7280',    // خاکستری
            'rejected' => '#ef4444'      // قرمز
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    public function getTestTypeLabelAttribute()
    {
        $types = [
            'blood' => 'خون',
            'urine' => 'ادرار',
            'stool' => 'مدفوع',
            'biochemistry' => 'بیوشیمی',
            'hormonal' => 'هورمونی',
            'microbial' => 'میکروبی',
            'pathology' => 'پاتولوژی',
            'genetic' => 'ژنتیک',
            'imaging' => 'تصویربرداری',
            'other' => 'سایر'
        ];
        return $types[$this->test_type] ?? $this->test_type;
    }

    // ============ Scopes ============
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByRegistration($query, $registrationId)
    {
        return $query->where('registration_id', $registrationId);
    }
}