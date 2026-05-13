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

        // ✅ تغییر گارد به 'sanctum' برای هماهنگی با کنترلرها
        $guardName = 'sanctum';

        // ================= ROLES =================
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guardName]);
        $userRole  = Role::firstOrCreate(['name' => 'user', 'guard_name' => $guardName]);

        // اضافه کردن نقش hospital_head
        $hospitalHeadRole = Role::firstOrCreate(['name' => 'hospital_head', 'guard_name' => $guardName]);

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
                'guard_name' => $guardName  // ✅ استفاده از گارد یکسان
            ]);
        }

        // ================= ASSIGN PERMISSIONS TO ADMIN =================
        $adminRole->syncPermissions($permissions);

        // ================= CREATE ADMIN USER =================
        $admin = User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('12345678'),
            ]
        );

        // assign role
        $admin->assignRole($adminRole);

        $this->command->info('Roles, Permissions and Admin created successfully with sanctum guard!');
    }
}