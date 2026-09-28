<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // پاک کردن cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $guardName = 'sanctum';

        // ================= ROLES =================
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => $guardName]
        );
        $userRole = Role::firstOrCreate(
            ['name' => 'user', 'guard_name' => $guardName]
        );
        $hospitalHeadRole = Role::firstOrCreate(
            ['name' => 'hospital_head', 'guard_name' => $guardName]
        );

        // ================= PERMISSIONS =================
        $permissions = [
            'view-users',
            'create-users',
            'edit-users',
            'delete-users',

            'view-roles',
            'create-roles',
            'edit-roles',
            'delete-roles',

            'view-permissions',
            'create-permissions',
            'delete-permissions',

            'view-medications',
            'create-medications',
            'edit-medications',
            'delete-medications',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => $guardName,
            ]);
        }

        // ================= ASSIGN PERMISSIONS =================
        // admin → تمام مجوزها
        $adminRole->syncPermissions($permissions);

        // hospital_head → مجوزهای محدود
        $hospitalHeadRole->syncPermissions([
            'view-users',
            'view-medications',
            'create-medications',
            'edit-medications',
        ]);

        // user → فقط مشاهده
        $userRole->syncPermissions([
            'view-medications',
        ]);

        // ================= CREATE ADMIN USER =================
        $admin = User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@gmail.com')],
            [
                'name' => env('ADMIN_NAME', 'Super Admin'),
                'password' => Hash::make(env('ADMIN_PASSWORD', '12345678')),
                'email_verified_at' => now(),
                'role' => 'admin',
            ]
        );

        // syncRoles → هم نقش قبلی را پاک می‌کند، هم نقش جدید می‌دهد
        $admin->syncRoles([$adminRole]);

        $this->command->info('✅ Roles, Permissions and Admin created successfully with sanctum guard!');
        $this->command->info('   Admin Email: ' . $admin->email);
    }
}