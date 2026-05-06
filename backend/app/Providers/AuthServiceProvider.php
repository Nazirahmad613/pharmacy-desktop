<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    public function boot()
    {
        $this->registerPolicies();

        // ثبت داینامیک تمام پرمیشن‌ها به عنوان Gate
        try {
            foreach (Permission::where('guard_name', 'sanctum')->get() as $permission) {
                Gate::define($permission->name, function (User $user) use ($permission) {
                    return $user->can($permission->name);
                });
            }
        } catch (\Exception $e) {
            // اگر جدول پرمیشن‌ها هنوز وجود ندارد، خطا را نادیده بگیر
        }
    }
}