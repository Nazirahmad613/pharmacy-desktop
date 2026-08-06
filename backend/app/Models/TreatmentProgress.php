<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreatmentProgress extends Model
{
    use HasFactory;

    /**
     * نام جدول
     */
    protected $table = 'treatment_progress';

    /**
     * فیلدهای قابل پر کردن
     */
    protected $fillable = [
        'registration_id',
        'current_step_index',
        'current_step',
        'completed_steps',
        'saved_data',
        'is_complete',
        'start_time',
        'end_time',
        'last_activity_at',
        'is_active',
        'note',
    ];

    /**
     * فیلدهایی که باید به JSON تبدیل شوند
     */
    protected $casts = [
        'completed_steps' => 'array',
        'saved_data' => 'array',
        'is_complete' => 'boolean',
        'is_active' => 'boolean',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'last_activity_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * تعریف مراحل درمان
     */
    const STEPS = [
        0 => 'queue',
        1 => 'examination',
        2 => 'laboratory',
        3 => 'radiology',
        4 => 'operation',
        5 => 'pres_insert',
        6 => 'followup',
        7 => 'admission',
        8 => 'history',
    ];

    const STEP_LABELS = [
        'queue' => 'صف انتظار',
        'examination' => 'معاینه',
        'laboratory' => 'لابراتوار',
        'radiology' => 'رادیولوژی',
        'operation' => 'عملیات خانه',
        'pres_insert' => 'نسخه',
        'followup' => 'ملاقات بعدی',
        'admission' => 'بستری',
        'history' => 'تاریخچه',
    ];

    /**
     * رابطه با جدول registrations
     */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registrations::class, 'registration_id', 'reg_id');
    }

    /**
     * دریافت نام مرحله جاری
     */
    public function getCurrentStepLabelAttribute(): string
    {
        return self::STEP_LABELS[$this->current_step] ?? 'نامشخص';
    }

    /**
     * دریافت درصد پیشرفت
     */
    public function getProgressPercentageAttribute(): int
    {
        $totalSteps = count(self::STEPS) - 1; // منهای queue
        $completed = is_array($this->completed_steps) ? count($this->completed_steps) : 0;
        
        if ($totalSteps === 0) {
            return 0;
        }
        
        return round(($completed / $totalSteps) * 100);
    }

    /**
     * بررسی آیا مرحله خاصی تکمیل شده است
     */
    public function isStepCompleted(string $stepKey): bool
    {
        $completedSteps = is_array($this->completed_steps) ? $this->completed_steps : [];
        return in_array($stepKey, $completedSteps);
    }

    /**
     * افزودن مرحله به لیست تکمیل شده‌ها
     */
    public function addCompletedStep(string $stepKey): self
    {
        $completedSteps = is_array($this->completed_steps) ? $this->completed_steps : [];
        
        if (!in_array($stepKey, $completedSteps)) {
            $completedSteps[] = $stepKey;
            $this->completed_steps = $completedSteps;
            $this->save();
        }
        
        return $this;
    }

    /**
     * ذخیره داده‌های یک مرحله
     */
    public function saveStepData(string $stepKey, array $data): self
    {
        $savedData = is_array($this->saved_data) ? $this->saved_data : [];
        $savedData[$stepKey] = $data;
        $this->saved_data = $savedData;
        $this->save();
        
        return $this;
    }

    /**
     * دریافت داده‌های یک مرحله
     */
    public function getStepData(string $stepKey): ?array
    {
        $savedData = is_array($this->saved_data) ? $this->saved_data : [];
        return $savedData[$stepKey] ?? null;
    }

    /**
     * شروع درمان
     */
    public function startTreatment(): self
    {
        $this->start_time = now();
        $this->is_active = true;
        $this->is_complete = false;
        $this->current_step_index = 1;
        $this->current_step = 'examination';
        $this->completed_steps = ['queue'];
        $this->save();
        
        return $this;
    }

    /**
     * ختم درمان
     */
    public function completeTreatment(): self
    {
        $this->is_complete = true;
        $this->end_time = now();
        $this->is_active = false;
        $this->save();
        
        return $this;
    }

    /**
     * تغییر مرحله فعلی
     */
    public function setCurrentStep(int $index): self
    {
        $steps = self::STEPS;
        
        if (isset($steps[$index])) {
            $this->current_step_index = $index;
            $this->current_step = $steps[$index];
            $this->last_activity_at = now();
            $this->save();
        }
        
        return $this;
    }

    /**
     * رفتن به مرحله بعدی
     */
    public function goToNextStep(): ?string
    {
        $nextIndex = $this->current_step_index + 1;
        $steps = self::STEPS;
        
        if (isset($steps[$nextIndex])) {
            $currentStepKey = $steps[$this->current_step_index];
            
            // افزودن مرحله فعلی به لیست تکمیل شده‌ها
            if (!in_array($currentStepKey, (array) $this->completed_steps)) {
                $this->addCompletedStep($currentStepKey);
            }
            
            // تغییر به مرحله بعدی
            $this->setCurrentStep($nextIndex);
            
            return $steps[$nextIndex];
        }
        
        return null;
    }

    /**
     * برگشت به مرحله قبلی
     */
    public function goToPreviousStep(): ?string
    {
        $prevIndex = $this->current_step_index - 1;
        $steps = self::STEPS;
        
        if (isset($steps[$prevIndex])) {
            // حذف مرحله جاری از لیست تکمیل شده‌ها
            $currentStepKey = $steps[$this->current_step_index];
            $completedSteps = is_array($this->completed_steps) ? $this->completed_steps : [];
            $completedSteps = array_filter($completedSteps, function($step) use ($currentStepKey) {
                return $step !== $currentStepKey;
            });
            
            $this->completed_steps = array_values($completedSteps);
            
            // تغییر به مرحله قبلی
            $this->setCurrentStep($prevIndex);
            
            return $steps[$prevIndex];
        }
        
        return null;
    }

    /**
     * اسکوپ برای درمان‌های فعال
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * اسکوپ برای درمان‌های کامل شده
     */
    public function scopeCompleted($query)
    {
        return $query->where('is_complete', true);
    }

    /**
     * اسکوپ برای درمان‌های ناقص
     */
    public function scopeIncomplete($query)
    {
        return $query->where('is_complete', false)->where('is_active', true);
    }
}