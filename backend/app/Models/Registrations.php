<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Journal;
use App\Models\Patient;
use App\Models\User;
use App\Models\Department;
use App\Models\TreatmentProgress;

class Registrations extends Model
{
    use HasFactory;

    /*
    |--------------------------------------------------------------------------
    | Table
    |--------------------------------------------------------------------------
    */

    protected $table = 'registrations';

    /*
    |--------------------------------------------------------------------------
    | Primary Key
    |--------------------------------------------------------------------------
    |
    | Registration هیچ ستون id ندارد.
    | کلید اصلی فقط reg_id است.
    |
    */

    protected $primaryKey = 'reg_id';

    public $incrementing = true;

    protected $keyType = 'int';

    /*
    |--------------------------------------------------------------------------
    | Fillable
    |--------------------------------------------------------------------------
    */

    protected $fillable = [

        // نوع مراجعه
        'reg_type',

        // ارتباطات
        'patient_id',
        'department_id',
        'doctor_id',

        // معلومات مراجعه
        'visit_number',
        'visit_type',

        // صف
        'queue_number',
        'queue_date',
        'queue_status',
        'queue_expired_at',

        // گردش مریض
        'visit_status',

        // زمان‌ها
        'sent_to_doctor_at',
        'doctor_started_at',

        // فیس
        'registration_fee',

        // تاریخ
        'visit_date',

        // یادداشت
        'note',

        // معلومات طبی
        'diagnosis',
        'weight',
        'blood_pressure',
        'temperature',
        'oxygen',

        // وضعیت
        'status',
    ];

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected $casts = [

        'sent_to_doctor_at' => 'datetime',
        'doctor_started_at' => 'datetime',
        'queue_expired_at' => 'datetime',

        'visit_date' => 'date',
        'queue_date' => 'date',

        'registration_fee' => 'decimal:2',

        'weight' => 'decimal:2',
        'temperature' => 'decimal:1',

        'oxygen' => 'integer',

        'patient_id' => 'integer',
        'department_id' => 'integer',
        'doctor_id' => 'integer',

        'queue_number' => 'integer',
        'status' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Patient
    |--------------------------------------------------------------------------
    */

    public function patient(): BelongsTo
    {
        return $this->belongsTo(
            Patient::class,
            'patient_id',
            'id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Department
    |--------------------------------------------------------------------------
    */

    public function department(): BelongsTo
    {
        return $this->belongsTo(
            Department::class,
            'department_id',
            'id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Doctor
    |--------------------------------------------------------------------------
    */

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'doctor_id',
            'id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Journal
    |--------------------------------------------------------------------------
    */

    public function journals(): HasMany
    {
        return $this->hasMany(
            Journal::class,
            'ref_id',
            'reg_id'
        )->where('ref_type', 'patient');
    }

    /*
    |--------------------------------------------------------------------------
    | Laboratory Requests
    |--------------------------------------------------------------------------
    |
    | laboratory_requests.registration_id
    |                 ↓
    | registrations.reg_id
    |
    */

    public function laboratoryRequests(): HasMany
    {
        return $this->hasMany(
            LaboratoryRequest::class,
            'registration_id',
            'reg_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Laboratory Fees
    |--------------------------------------------------------------------------
    */

    public function laboratoryFees(): HasMany
    {
        return $this->hasMany(
            LaboratoryFee::class,
            'registration_id',
            'reg_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Treatment Progress
    |--------------------------------------------------------------------------
    */

    public function treatmentProgress(): HasOne
    {
        return $this->hasOne(
            TreatmentProgress::class,
            'registration_id',
            'reg_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Reg Name
    |--------------------------------------------------------------------------
    */

    public function getRegNameAttribute(): string
    {
        if (!$this->patient) {
            return '';
        }

        return trim(
            $this->patient->first_name . ' ' .
            $this->patient->last_name
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopePatients($query)
    {
        return $query->where('reg_type', 'patient');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('reg_type', $type);
    }

    /*
    |--------------------------------------------------------------------------
    | Treatment Progress Attribute
    |--------------------------------------------------------------------------
    */

    public function getTreatmentProgressAttribute(): ?array
    {
        $progress = $this->treatmentProgress;

        if (!$progress) {
            return null;
        }

        return [
            'currentStepIndex' => $progress->current_step_index,
            'currentStep' => $progress->current_step,
            'completedSteps' => $progress->completed_steps ?? [],
            'isComplete' => $progress->is_complete,
            'startTime' => $progress->start_time?->toISOString(),
            'endTime' => $progress->end_time?->toISOString(),
            'registrationId' => $progress->registration_id,
            'savedData' => $progress->saved_data ?? [],
            'progressPercentage' => $progress->progress_percentage,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Start / Continue Treatment
    |--------------------------------------------------------------------------
    */

    public function startOrContinueTreatment(): TreatmentProgress
    {
        $progress = $this->treatmentProgress;

        if (!$progress) {

            $progress = TreatmentProgress::create([
                'registration_id' => $this->reg_id,
            ]);

            $progress->startTreatment();
        }

        return $progress;
    }
}