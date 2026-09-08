<?php
// app/Models/Bed.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bed extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'beds';

    protected $fillable = [
        'ward_id',
        'bed_number',
        'room_number',
        'floor',
        'location',
        'status',
        'notes',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    // ============ روابط ============
    
    public function ward()
    {
        return $this->belongsTo(Ward::class);
    }

    public function admission()
    {
        return $this->hasOne(AdmissionRequest::class)->where('status', 'admitted');
    }

    public function admissions()
    {
        return $this->hasMany(AdmissionRequest::class);
    }

    // ============ اسکوپ‌ها ============
    
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeOccupied($query)
    {
        return $query->where('status', 'occupied');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByWard($query, $wardId)
    {
        return $query->where('ward_id', $wardId);
    }

    public function scopeByRoom($query, $roomNumber)
    {
        return $query->where('room_number', $roomNumber);
    }

    // ============ متدهای کمکی ============
    
    public function getStatusLabelAttribute()
    {
        $labels = [
            'available' => 'موجود',
            'occupied' => 'اشغال',
            'reserved' => 'رزرو',
            'maintenance' => 'در تعمیر'
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'available' => '#22c55e',
            'occupied' => '#ef4444',
            'reserved' => '#f59e0b',
            'maintenance' => '#6b7280'
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    public function getLocationFullAttribute()
    {
        $parts = [];
        if ($this->floor) $parts[] = "طبقه {$this->floor}";
        if ($this->room_number) $parts[] = "اتاق {$this->room_number}";
        if ($this->bed_number) $parts[] = "تخت {$this->bed_number}";
        if ($this->location) $parts[] = $this->location;
        return implode(' - ', $parts) ?: 'نامشخص';
    }

    // ============ متدهای عملیاتی ============
    
    public function occupy()
    {
        if ($this->status === 'available') {
            $this->update(['status' => 'occupied']);
            if ($this->ward) {
                $this->ward->decrement('available_beds');
            }
            return true;
        }
        return false;
    }

    public function release()
    {
        if ($this->status === 'occupied') {
            $this->update(['status' => 'available']);
            if ($this->ward) {
                $this->ward->increment('available_beds');
            }
            return true;
        }
        return false;
    }

    public function reserve()
    {
        if ($this->status === 'available') {
            $this->update(['status' => 'reserved']);
            if ($this->ward) {
                $this->ward->decrement('available_beds');
            }
            return true;
        }
        return false;
    }

    public function setMaintenance()
    {
        $this->update(['status' => 'maintenance']);
    }
}