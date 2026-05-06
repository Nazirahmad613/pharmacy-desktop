<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;

class FixRolesGuard extends Command
{
    protected $signature = 'fix:roles-guard';
    protected $description = 'Safely change roles guard to sanctum without duplicates';

    public function handle()
    {
        // پاک کردن کش پرمیشن‌ها
        app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. ابتدا نقش‌های با گارد sanctum را بیابید
        $existingSanctumRoles = Role::where('guard_name', 'sanctum')->pluck('name')->toArray();

        // 2. نقش‌های با گارد web را پردازش کنید
        $webRoles = Role::where('guard_name', 'web')->get();

        foreach ($webRoles as $role) {
            if (in_array($role->name, $existingSanctumRoles)) {
                // نقش تکراری: حذف نقش web
                $role->delete();
                $this->warn("Deleted duplicate role '{$role->name}' with guard 'web'");
            } else {
                // تغییر گارد به sanctum
                $role->guard_name = 'sanctum';
                $role->save();
                $this->info("Changed guard of role '{$role->name}' to 'sanctum'");
            }
        }

        // 3. اگر هیچ نقشی با گارد sanctum وجود ندارد، نقش‌های پیش‌فرض را ایجاد کن
        if (Role::where('guard_name', 'sanctum')->count() === 0) {
            $roles = ['super-admin', 'admin', 'head-of-hospital', 'doctor', 'pharmacist', 'nurse', 'user', 'employees'];
            foreach ($roles as $roleName) {
                Role::create(['name' => $roleName, 'guard_name' => 'sanctum']);
                $this->info("Created role '{$roleName}' with sanctum guard");
            }
        }

        // 4. همچنین پرمیشن‌ها را نیز به sanctum تغییر دهید (بدون duplicate)
        $existingSanctumPerms = DB::table('permissions')->where('guard_name', 'sanctum')->pluck('name')->toArray();
        $webPerms = DB::table('permissions')->where('guard_name', 'web')->get();

        foreach ($webPerms as $perm) {
            if (in_array($perm->name, $existingSanctumPerms)) {
                DB::table('permissions')->where('id', $perm->id)->delete();
                $this->warn("Deleted duplicate permission '{$perm->name}' with guard 'web'");
            } else {
                DB::table('permissions')->where('id', $perm->id)->update(['guard_name' => 'sanctum']);
                $this->info("Changed guard of permission '{$perm->name}' to 'sanctum'");
            }
        }

        $this->info('Done! All roles and permissions now use sanctum guard without duplicates.');
    }
}