<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasRoles;

    protected $guard_name = 'sanctum';

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'department_id', // ✅ اضافه شد
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    // ================= APPENDS =================
    protected $appends = [
        'avatar_url',
        'role_name',
    ];

    // ================= AVATAR URL =================
    public function getAvatarUrlAttribute()
    {
        if (!$this->avatar) {
            return null;
        }

        if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
            return $this->avatar;
        }

        $avatarPath = ltrim($this->avatar, '/');

        return asset('storage/avatars/' . $avatarPath);
    }

    // ================= ROLE NAME =================
    public function getRoleNameAttribute(): string
    {
        return $this->roles->pluck('name')->join(', ') ?: 'بدون نقش';
    }

    // ================= ROLE CHECK =================
    public function hasRoleName(string $roleName): bool
    {
        return $this->roles->contains('name', $roleName);
    }

    // ================= RELATIONS =================

    /**
     * بخش مربوطه کاربر
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id', 'id');
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'doc_id', 'id');
    }

    public function sales()
    {
        return $this->hasMany(Sales::class, 'created_by', 'id');
    }
}