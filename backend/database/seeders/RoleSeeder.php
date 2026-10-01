<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ============================================================
        // ✅ لیست رول‌ها - دقیقاً مطابق navigations.jsx
        // ============================================================
        $roles = [
            ['name' => 'Admin',         'display_name' => 'مدیر سیستم'],
            ['name' => 'super_admin',   'display_name' => 'مدیر ارشد'],
            ['name' => 'hospital_head', 'display_name' => 'رئیس شفاخانه'],
            ['name' => 'Doctor',        'display_name' => 'داکتر'],
            ['name' => 'Pharmacist',    'display_name' => 'دواساز'],
            ['name' => 'LabTechnician', 'display_name' => 'تخنیکر لابراتوار'],
            ['name' => 'Radiologist',   'display_name' => 'رادیولوجیست'],
            ['name' => 'Receptionist',  'display_name' => 'استقبال'],
            ['name' => 'Accountant',    'display_name' => 'حسابدار'],
            ['name' => 'User',          'display_name' => 'کاربر عادی'],
        ];

        foreach ($roles as $roleData) {
            // ✅ اگر رول وجود ندارد، بساز
            Role::firstOrCreate(
                ['name' => $roleData['name']],   // شرط جستجو
                [
                    'display_name' => $roleData['display_name'],
                    'guard_name'   => 'web',     // اگر ستون guard_name دارید
                ]
            );

            $this->command->info("✅ رول {$roleData['name']} پردازش شد");
        }

        $this->command->info('🎉 همه رول‌ها با موفقیت ثبت شدند!');
    }
}