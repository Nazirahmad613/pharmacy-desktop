<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasRoles;
    
    protected $with = ['roles', 'permissions'];

    // ✅ تنظیم گارد پیش‌فرض برای Spatie
    protected $guard_name = 'sanctum';

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    // اضافه شدن avatar_url به خروجی JSON
    protected $appends = [
        'avatar_url',
        'role_name',  // اضافه کردن role_name به appends
    ];

    // نمایش لینک کامل عکس پروفایل
    public function getAvatarUrlAttribute()
    {
        if ($this->avatar) {
            // بررسی اینکه آیا مسیر قبلاً کامل است یا خیر
            if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
                return $this->avatar;
            }
            return asset('storage/' . ltrim($this->avatar, '/'));
        }

        return null;
    }

    // نمایش رول‌های Spatie
    public function getRoleNameAttribute(): string
    {
        return $this->roles->pluck('name')->join(', ') ?: 'بدون نقش';
    }

    // متد کمکی برای چک کردن نقش
    public function hasRoleName(string $roleName): bool
    {
        return $this->roles->contains('name', $roleName);
    }

    // Relations
    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'doc_id', 'id');
    }

    public function sales()
    {
        return $this->hasMany(Sales::class, 'created_by', 'id');
    }
}