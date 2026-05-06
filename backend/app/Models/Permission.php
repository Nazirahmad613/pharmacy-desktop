<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Permission extends SpatiePermission
{
    use HasFactory;

    protected $fillable = [
        'name',
        'guard_name',
    ];

    /**
     * Override the users relationship to fix the class name issue
     */
    public function users(): MorphToMany
    {
        return $this->morphedByMany(
            config('permission.models.user', User::class),
            'model',
            config('permission.table_names.model_has_permissions', 'model_has_permissions'),
            'permission_id',
            'model_id'
        );
    }

    /**
     * Override the roles relationship
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            config('permission.models.role', Role::class),
            config('permission.table_names.role_has_permissions', 'role_has_permissions'),
            'permission_id',
            'role_id'
        );
    }
}