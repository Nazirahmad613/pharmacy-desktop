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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    protected $appends = [
        'avatar_url',
        'role_name',
    ];

    public function getAvatarUrlAttribute()
    {
        if ($this->avatar) {

            if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
                return $this->avatar;
            }

            return asset('storage/' . ltrim($this->avatar, '/'));
        }

        return null;
    }

    public function getRoleNameAttribute(): string
    {
        return $this->roles->pluck('name')->join(', ') ?: 'بدون نقش';
    }

    public function hasRoleName(string $roleName): bool
    {
        return $this->roles->contains('name', $roleName);
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