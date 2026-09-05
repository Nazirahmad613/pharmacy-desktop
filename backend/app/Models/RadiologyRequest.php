<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reg_id',
        'patient_id',
        'doctor_id',
        'radiology_type',
        'body_part',
        'reason',
        'notes',
        'priority',
        'request_date',
        'clinical_indication',
        'special_notes',
        'barcode',
        'request_number',
        'status',
        'has_result',
        'report_summary',
        'technician_id',
        'radiologist_id',
        'scheduled_date',
        'performed_date',
    ];

    protected $casts = [
        'request_date' => 'date',
        'scheduled_date' => 'datetime',
        'performed_date' => 'datetime',
        'has_result' => 'boolean',
    ];

    // ============ روابط ============
    
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'reg_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function radiologist()
    {
        return $this->belongsTo(User::class, 'radiologist_id');
    }

    // ============ متدهای کمکی ============
    
    public function getStatusLabelAttribute()
    {
        return [
            'pending' => 'در انتظار',
            'scheduled' => 'برنامه‌ریزی شده',
            'in_progress' => 'در حال انجام',
            'completed' => 'تکمیل شده',
            'cancelled' => 'لغو شده',
            'rejected' => 'رد شده',
            'sent_to_radiology' => 'ارسال به رادیولوژی',
        ][$this->status] ?? $this->status;
    }

    public function getPriorityLabelAttribute()
    {
        return [
            'normal' => 'عادی',
            'urgent' => 'فوری',
            'emergency' => 'اورژانسی',
        ][$this->priority] ?? $this->priority;
    }

    public function getRadiologyTypeLabelAttribute()
    {
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

    public function generateBarcode()
    {
        return 'RAD' . now()->format('YmdHis') . strtoupper(substr(uniqid(), -6));
    }

    public function generateRequestNumber()
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $count = self::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count() + 1;
        return 'RAD-' . $year . $month . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
    }
}