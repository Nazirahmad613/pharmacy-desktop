<?php
// app/Models/Ward.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ward extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'wards';

    protected $fillable = [
        'name',
        'code',
        'description',
        'type',
        'total_beds',
        'available_beds',
        'location',
        'floor',
        'building',
        'phone',
        'is_active'
    ];

    protected $casts = [
        'total_beds' => 'integer',
        'available_beds' => 'integer',
        'is_active' => 'boolean'
    ];

    // ============ روابط ============
    
    public function beds()
    {
        return $this->hasMany(Bed::class);
    }

    public function admissions()
    {
        return $this->hasMany(AdmissionRequest::class);
    }

    public function activeAdmissions()
    {
        return $this->hasMany(AdmissionRequest::class)->where('status', 'admitted');
    }

    // ============ اسکوپ‌ها ============
    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeHasAvailableBeds($query)
    {
        return $query->where('available_beds', '>', 0);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // ============ متدهای کمکی ============
    
    public function getTypeLabelAttribute()
    {
        $labels = [
            'general' => 'عمومی',
            'icu' => 'آی‌سی‌یو',
            'ccu' => 'سی‌سی‌یو',
            'pediatric' => 'کودکان',
            'maternity' => 'زایمان',
            'surgical' => 'جراحی',
            'medical' => 'پزشکی'
        ];
        return $labels[$this->type] ?? $this->type;
    }

    public function getOccupancyRateAttribute()
    {
        if ($this->total_beds == 0) return 0;
        return round((($this->total_beds - $this->available_beds) / $this->total_beds) * 100, 2);
    }

    public function getLocationFullAttribute()
    {
        $parts = [];
        if ($this->building) $parts[] = $this->building;
        if ($this->floor) $parts[] = "طبقه {$this->floor}";
        if ($this->location) $parts[] = $this->location;
        return implode(' - ', $parts) ?: 'نامشخص';
    }

    // ============ متدهای عملیاتی ============
    
    public function addBed()
    {
        $this->increment('total_beds');
        $this->increment('available_beds');
    }

    public function removeBed()
    {
        if ($this->total_beds > 0) {
            $this->decrement('total_beds');
            if ($this->available_beds > 0) {
                $this->decrement('available_beds');
            }
        }
    }

    public function reserveBed()
    {
        if ($this->available_beds > 0) {
            $this->decrement('available_beds');
            return true;
        }
        return false;
    }

    public function releaseBed()
    {
        $this->increment('available_beds');
    }
}