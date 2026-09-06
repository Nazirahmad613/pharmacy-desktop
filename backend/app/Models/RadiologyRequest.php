<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyRequest extends Model
{
    use SoftDeletes;

    protected $table = 'radiology_requests';

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'radiology_type',
        'radiology_type_label',
        'body_part',
        'reason',
        'notes',
        'clinical_indication',
        'special_notes',
        'priority',
        'status',
        'request_date',
        'scheduled_date',
        'completed_date',
        'barcode',
        'request_number',
        'has_fee',
        'has_result',
        'report_summary',
        'technician_id',
        'radiologist_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'request_date' => 'date',
        'scheduled_date' => 'date',
        'completed_date' => 'date',
        'has_fee' => 'boolean',
        'has_result' => 'boolean',
    ];

    // ============ Relations ============
    
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

    public function result()
    {
        return $this->hasOne(RadiologyResult::class, 'radiology_request_id');
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
    
    public function getRadiologyTypeLabelAttribute($value)
    {
        if ($value) return $value;
        
        $labels = [
            'xray' => 'رادیوگرافی ساده',
            'chest_xray' => 'رادیوگرافی قفسه سینه',
            'abdominal_xray' => 'رادیوگرافی شکم',
            'spine_xray' => 'رادیوگرافی ستون فقرات',
            'extremity_xray' => 'رادیوگرافی اندام‌ها',
            'ct_scan' => 'سی‌تی اسکن',
            'brain_ct' => 'سی‌تی اسکن مغز',
            'chest_ct' => 'سی‌تی اسکن قفسه سینه',
            'abdominal_ct' => 'سی‌تی اسکن شکم و لگن',
            'spine_ct' => 'سی‌تی اسکن ستون فقرات',
            'mri' => 'ام‌آرآی',
            'brain_mri' => 'ام‌آرآی مغز',
            'spine_mri' => 'ام‌آرآی ستون فقرات',
            'joint_mri' => 'ام‌آرآی مفاصل',
            'ultrasound' => 'سونوگرافی',
            'pelvic_ultrasound' => 'سونوگرافی لگن',
            'abdominal_ultrasound' => 'سونوگرافی شکم',
            'obstetric_ultrasound' => 'سونوگرافی مامایی',
            'vascular_ultrasound' => 'سونوگرافی عروق',
            'fluoroscopy' => 'فلوروسکوپی',
            'mammography' => 'ماموگرافی',
            'angiography' => 'آنژیوگرافی',
            'echocardiography' => 'اکوکاردیوگرافی',
            'pet_scan' => 'PET Scan',
            'bone_density' => 'سنجش تراکم استخوان',
            'other' => 'سایر',
        ];
        
        return $labels[$this->radiology_type] ?? $this->radiology_type;
    }

    public function getPriorityLabelAttribute()
    {
        $labels = [
            'normal' => '🟢 عادی',
            'urgent' => '🟡 فوری',
            'emergency' => '🔴 اورژانسی',
        ];
        return $labels[$this->priority] ?? $this->priority;
    }

    public function getPriorityColorAttribute()
    {
        $colors = [
            'normal' => '#10b981',
            'urgent' => '#f59e0b',
            'emergency' => '#ef4444',
        ];
        return $colors[$this->priority] ?? '#6b7280';
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'در انتظار',
            'scheduled' => 'برنامه‌ریزی شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده',
            'rejected' => 'رد شده',
            'sent_to_radiology' => 'ارسال به رادیولوژی',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'pending' => '#f59e0b',
            'scheduled' => '#3b82f6',
            'in_progress' => '#8b5cf6',
            'completed' => '#10b981',
            'cancelled' => '#6b7280',
            'rejected' => '#ef4444',
            'sent_to_radiology' => '#8b5cf6',
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    // ============ Scopes ============
    
    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'sent_to_radiology']);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByPatient($query, $patientId)
    {
        return $query->where('patient_id', $patientId);
    }

    public function scopeByRegistration($query, $regId)
    {
        return $query->where('reg_id', $regId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('radiology_type', $type);
    }

    public function scopeWithFee($query)
    {
        return $query->where('has_fee', true);
    }

    public function scopeWithResult($query)
    {
        return $query->where('has_result', true);
    }

    // ============ Boot ============
    
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->barcode)) {
                $model->barcode = self::generateBarcode();
            }
            if (empty($model->request_number)) {
                $model->request_number = self::generateRequestNumber(); // ✅ اضافه شد
            }
            if (empty($model->radiology_type_label)) {
                $model->radiology_type_label = $model->getRadiologyTypeLabelAttribute();
            }
        });

        static::updating(function ($model) {
            if (empty($model->radiology_type_label)) {
                $model->radiology_type_label = $model->getRadiologyTypeLabelAttribute();
            }
        });
    }

    // ============ Helpers ============
    
    /**
     * تولید بارکد یکتا
     */
    public static function generateBarcode()
    {
        do {
            $barcode = 'RAD-' . strtoupper(uniqid());
        } while (self::where('barcode', $barcode)->exists());
        
        return $barcode;
    }

    /**
     * ✅ تولید شماره درخواست یکتا
     */
    public static function generateRequestNumber()
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $day = now()->format('d');
        
        // شماره درخواست به فرمت: RAD-YYYYMMDD-XXXX
        $prefix = 'RAD-' . $year . $month . $day . '-';
        
        // پیدا کردن آخرین شماره درخواست امروز
        $lastRequest = self::where('request_number', 'LIKE', $prefix . '%')
                          ->orderBy('request_number', 'desc')
                          ->first();
        
        if ($lastRequest) {
            // استخراج شماره از آخرین درخواست
            $lastNumber = (int) substr($lastRequest->request_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . $newNumber;
    }

    public function markAsCompleted()
    {
        $this->update([
            'status' => 'completed',
            'completed_date' => now(),
        ]);
    }

    public function hasResult()
    {
        return $this->has_result && $this->result()->exists();
    }

    public function hasFee()
    {
        return $this->has_fee;
    }
}