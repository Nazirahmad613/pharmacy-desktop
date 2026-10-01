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

        // ============================================================
        // ================= ROLES ====================================
        // ============================================================
        $roles = [
            // ===== مدیریت =====
            'ADMIN'                => 'مدیر سیستم',
            'SUPERADMIN'           => 'مدیر ارشد',
            'HOSPITALHEAD'         => 'رئیس شفاخانه',
            'MANAGER'              => 'مدیر عمومی',

            // ===== پزشکی =====
            'DOCTOR'               => 'داکتر',
            'SPECIALISTDOCTOR'     => 'داکتر متخصص',
            'SURGEON'              => 'جراح',
            'NURSE'                => 'نرس',
            'HEADNURSE'            => 'نرس سر',
            'MIDWIFE'              => 'قابله',

            // ===== دواخانه =====
            'PHARMACIST'           => 'دواساز',
            'PHARMACYASSISTANT'    => 'دستیار دواخانه',

            // ===== لابراتوار =====
            'LABTECHNICIAN'        => 'تخنیکر لابراتوار',
            'LABMANAGER'           => 'مدیر لابراتوار',

            // ===== رادیولوژی =====
            'RADIOLOGIST'          => 'رادیولوجیست',
            'RADIOLOGYTECHNICIAN'  => 'تخنیکر رادیولوژی',

            // ===== اداری و مالی =====
            'RECEPTIONIST'         => 'استقبال',
            'ACCOUNTANT'           => 'حسابدار',
            'FINANCEMANAGER'       => 'مدیر مالی',
            'CASHIER'              => 'صندوق‌دار',
            'HRMANAGER'            => 'مدیر منابع بشری',
            'HRSTAFF'              => 'کارمند منابع بشری',

            // ===== گدام و موجودی =====
            'STOCKMANAGER'         => 'مدیر گدام',
            'INVENTORYCLERK'       => 'کارمند موجودی',

            // ===== پشتیبانی =====
            'ITSUPPORT'            => 'پشتیبانی تخنیکی',
            'SECURITY'             => 'امنیت',
            'CLEANER'              => 'پاک‌کن',
            'AMBULANCEDRIVER'      => 'راننده امبولانس',

            // ===== عمومی =====
            'PATIENT'              => 'مریض',
            'USER'                 => 'کاربر عادی',
        ];

        $roleInstances = [];

        foreach ($roles as $roleName => $displayName) {
            $roleInstances[$roleName] = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => $guardName]
            );
        }

        // ============================================================
        // ================= PERMISSIONS ==============================
        // ============================================================
        $permissions = [

            // ============================================================
            // ===== Users Management (مدیریت کاربران) =====
            // ============================================================
            'VIEW-USERS'            => 'مشاهده کاربران',
            'CREATE-USERS'          => 'ایجاد کاربر',
            'EDIT-USERS'            => 'ویرایش کاربر',
            'DELETE-USERS'          => 'حذف کاربر',

            // ============================================================
            // ===== Roles Management (مدیریت رول‌ها) =====
            // ============================================================
            'VIEW-ROLES'            => 'مشاهده رول‌ها',
            'CREATE-ROLES'          => 'ایجاد رول',
            'EDIT-ROLES'            => 'ویرایش رول',
            'DELETE-ROLES'          => 'حذف رول',

            // ============================================================
            // ===== Permissions Management (مدیریت مجوزها) =====
            // ============================================================
            'VIEW-PERMISSIONS'      => 'مشاهده مجوزها',
            'CREATE-PERMISSIONS'    => 'ایجاد مجوز',
            'EDIT-PERMISSIONS'      => 'ویرایش مجوز',
            'DELETE-PERMISSIONS'    => 'حذف مجوز',

            // ============================================================
            // ===== Medications (داروها) =====
            // ============================================================
            'VIEW-MEDICATIONS'      => 'مشاهده داروها',
            'CREATE-MEDICATIONS'    => 'ایجاد دارو',
            'EDIT-MEDICATIONS'      => 'ویرایش دارو',
            'DELETE-MEDICATIONS'    => 'حذف دارو',

            // ============================================================
            // ===== Registrations (ثبت نام مریض) =====
            // ============================================================
            'VIEW-REGISTRATIONS'    => 'مشاهده ثبت‌نام‌ها',
            'CREATE-REGISTRATIONS'  => 'ایجاد ثبت‌نام',
            'EDIT-REGISTRATIONS'    => 'ویرایش ثبت‌نام',
            'DELETE-REGISTRATIONS'  => 'حذف ثبت‌نام',

            // ============================================================
            // ===== Examinations (معالجه) =====
            // ============================================================
            'VIEW-EXAMINATIONS'     => 'مشاهده معالجات',
            'CREATE-EXAMINATIONS'   => 'ایجاد معالجه',
            'EDIT-EXAMINATIONS'     => 'ویرایش معالجه',
            'DELETE-EXAMINATIONS'   => 'حذف معالجه',

            // ============================================================
            // ===== Laboratory (لابراتوار) =====
            // ============================================================
            'VIEW-LAB'              => 'مشاهده لابراتوار',
            'CREATE-LAB'            => 'ایجاد آزمایش',
            'EDIT-LAB'              => 'ویرایش آزمایش',
            'DELETE-LAB'            => 'حذف آزمایش',
            'APPROVE-LAB-RESULTS'   => 'تأیید نتایج لابراتوار',

            // ============================================================
            // ===== Radiology (رادیولوژی) =====
            // ============================================================
            'VIEW-RADIOLOGY'        => 'مشاهده رادیولوژی',
            'CREATE-RADIOLOGY'      => 'ایجاد تصویربرداری',
            'EDIT-RADIOLOGY'        => 'ویرایش تصویربرداری',
            'DELETE-RADIOLOGY'      => 'حذف تصویربرداری',
            'APPROVE-RADIOLOGY'     => 'تأیید نتایج رادیولوژی',

            // ============================================================
            // ===== Pharmacy (دواخانه) =====
            // ============================================================
            'VIEW-PHARMACY'         => 'مشاهده دواخانه',
            'CREATE-PHARMACY'       => 'ایجاد نسخه دواخانه',
            'EDIT-PHARMACY'         => 'ویرایش نسخه دواخانه',
            'DELETE-PHARMACY'       => 'حذف نسخه دواخانه',
            'DISPENSE-MEDICINE'     => 'تحویل دارو',

            // ============================================================
            // ===== Prescriptions (نسخه‌ها) =====
            // ============================================================
            'VIEW-PRESCRIPTIONS'    => 'مشاهده نسخه‌ها',
            'CREATE-PRESCRIPTIONS'  => 'ایجاد نسخه',
            'EDIT-PRESCRIPTIONS'    => 'ویرایش نسخه',
            'DELETE-PRESCRIPTIONS'  => 'حذف نسخه',

            // ============================================================
            // ===== Stock Management (مدیریت گدام) =====
            // ============================================================
            'VIEW-STOCK'            => 'مشاهده گدام',
            'CREATE-STOCK'          => 'افزودن به گدام',
            'EDIT-STOCK'            => 'ویرایش گدام',
            'DELETE-STOCK'          => 'حذف از گدام',

            // ============================================================
            // ===== Accounts (حساب‌ها) =====
            // ============================================================
            'VIEW-ACCOUNTS'         => 'مشاهده حساب‌ها',
            'CREATE-ACCOUNTS'       => 'ایجاد حساب',
            'EDIT-ACCOUNTS'         => 'ویرایش حساب',
            'DELETE-ACCOUNTS'       => 'حذف حساب',

            // ============================================================
            // ===== Sales (فروش) =====
            // ============================================================
            'VIEW-SALES'            => 'مشاهده فروشات',
            'CREATE-SALES'          => 'ایجاد فروش',
            'EDIT-SALES'            => 'ویرایش فروش',
            'DELETE-SALES'          => 'حذف فروش',

            // ============================================================
            // ===== Purchases (خرید) =====
            // ============================================================
            'VIEW-PURCHASES'        => 'مشاهده خریدها',
            'CREATE-PURCHASES'      => 'ایجاد خرید',
            'EDIT-PURCHASES'        => 'ویرایش خرید',
            'DELETE-PURCHASES'      => 'حذف خرید',

            // ============================================================
            // ===== Payment (پرداخت) =====
            // ============================================================
            'VIEW-PAYMENT'          => 'مشاهده پرداخت‌ها',
            'CREATE-PAYMENT'        => 'ایجاد پرداخت',
            'EDIT-PAYMENT'          => 'ویرایش پرداخت',
            'DELETE-PAYMENT'        => 'حذف پرداخت',

            // ============================================================
            // ===== Changes (تبدیلی) =====
            // ============================================================
            'VIEW-CHANGES'          => 'مشاهده تبدیلی‌ها',
            'CREATE-CHANGES'        => 'ایجاد تبدیلی',
            'EDIT-CHANGES'          => 'ویرایش تبدیلی',
            'DELETE-CHANGES'        => 'حذف تبدیلی',

            // ============================================================
            // ===== Reports (گزارشات) =====
            // ============================================================
            'VIEW-REPORTS'              => 'مشاهده گزارشات',
            'VIEW-FINANCIAL-REPORTS'    => 'مشاهده گزارشات مالی',
            'VIEW-STOCK-REPORTS'        => 'مشاهده گزارشات گدام',
            'VIEW-SALES-REPORTS'        => 'مشاهده گزارشات فروش',
            'VIEW-HR-REPORTS'           => 'مشاهده گزارشات منابع بشری',
            'VIEW-MEDICAL-REPORTS'      => 'مشاهده گزارشات طبی',
            'EXPORT-REPORTS'            => 'صادر کردن گزارشات',

            // ============================================================
            // ===== Departments (بخش‌ها) =====
            // ============================================================
            'VIEW-DEPARTMENTS'      => 'مشاهده بخش‌ها',
            'CREATE-DEPARTMENTS'    => 'ایجاد بخش',
            'EDIT-DEPARTMENTS'      => 'ویرایش بخش',
            'DELETE-DEPARTMENTS'    => 'حذف بخش',

            // ============================================================
            // ===== Categories (دسته‌بندی‌ها) =====
            // ============================================================
            'VIEW-CATEGORIES'       => 'مشاهده دسته‌بندی‌ها',
            'CREATE-CATEGORIES'     => 'ایجاد دسته‌بندی',
            'EDIT-CATEGORIES'       => 'ویرایش دسته‌بندی',
            'DELETE-CATEGORIES'     => 'حذف دسته‌بندی',

            // ============================================================
            // ===== Logs (لاگ‌ها) =====
            // ============================================================
            'VIEW-LOGS'             => 'مشاهده لاگ‌ها',
            'DELETE-LOGS'           => 'حذف لاگ‌ها',

            // ============================================================
            // ===== Settings (تنظیمات) =====
            // ============================================================
            'VIEW-SETTINGS'         => 'مشاهده تنظیمات',
            'EDIT-SETTINGS'         => 'ویرایش تنظیمات',

            // ============================================================
            // ===== HR (منابع بشری) =====
            // ============================================================
            'VIEW-EMPLOYEES'        => 'مشاهده کارمندان',
            'CREATE-EMPLOYEES'      => 'ایجاد کارمند',
            'EDIT-EMPLOYEES'        => 'ویرایش کارمند',
            'DELETE-EMPLOYEES'      => 'حذف کارمند',
            'VIEW-ATTENDANCE'       => 'مشاهده حاضری',
            'MANAGE-ATTENDANCE'     => 'مدیریت حاضری',
            'VIEW-PAYROLL'          => 'مشاهده معاشات',
            'MANAGE-PAYROLL'        => 'مدیریت معاشات',
        ];

        foreach ($permissions as $permissionName => $displayName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guardName,
            ]);
        }

        // ============================================================
        // ================= ASSIGN PERMISSIONS ======================
        // ============================================================

        $allPermissions = array_keys($permissions);

        // -------- ADMIN: تمام مجوزها --------
        $roleInstances['ADMIN']->syncPermissions($allPermissions);

        // -------- SUPERADMIN: تمام مجوزها --------
        $roleInstances['SUPERADMIN']->syncPermissions($allPermissions);

        // -------- HOSPITALHEAD: مدیریت بالا --------
        $roleInstances['HOSPITALHEAD']->syncPermissions([
            'VIEW-USERS', 'CREATE-USERS', 'EDIT-USERS',
            'VIEW-ROLES', 'VIEW-PERMISSIONS',
            'VIEW-MEDICATIONS',
            'VIEW-REGISTRATIONS', 'CREATE-REGISTRATIONS', 'EDIT-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-LAB', 'APPROVE-LAB-RESULTS',
            'VIEW-RADIOLOGY', 'APPROVE-RADIOLOGY',
            'VIEW-PHARMACY',
            'VIEW-PRESCRIPTIONS',
            'VIEW-STOCK',
            'VIEW-ACCOUNTS',
            'VIEW-SALES', 'VIEW-PURCHASES', 'VIEW-PAYMENT', 'VIEW-CHANGES',
            'VIEW-REPORTS', 'VIEW-FINANCIAL-REPORTS', 'VIEW-STOCK-REPORTS',
            'VIEW-SALES-REPORTS', 'VIEW-HR-REPORTS', 'VIEW-MEDICAL-REPORTS',
            'EXPORT-REPORTS',
            'VIEW-DEPARTMENTS',
            'VIEW-CATEGORIES',
            'VIEW-LOGS',
            'VIEW-SETTINGS',
            'VIEW-EMPLOYEES', 'VIEW-ATTENDANCE', 'VIEW-PAYROLL',
        ]);

        // -------- MANAGER: مدیر عمومی --------
        $roleInstances['MANAGER']->syncPermissions([
            'VIEW-USERS',
            'VIEW-MEDICATIONS', 'CREATE-MEDICATIONS', 'EDIT-MEDICATIONS',
            'VIEW-REGISTRATIONS', 'CREATE-REGISTRATIONS', 'EDIT-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'CREATE-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-LAB', 'VIEW-RADIOLOGY', 'VIEW-PHARMACY', 'VIEW-PRESCRIPTIONS',
            'VIEW-STOCK', 'CREATE-STOCK', 'EDIT-STOCK',
            'VIEW-ACCOUNTS', 'VIEW-SALES', 'VIEW-PURCHASES', 'VIEW-PAYMENT',
            'VIEW-REPORTS', 'VIEW-STOCK-REPORTS', 'VIEW-SALES-REPORTS',
            'VIEW-DEPARTMENTS', 'VIEW-CATEGORIES',
            'VIEW-EMPLOYEES', 'VIEW-ATTENDANCE',
        ]);

        // -------- DOCTOR: داکتر --------
        $roleInstances['DOCTOR']->syncPermissions([
            'VIEW-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'CREATE-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS', 'CREATE-PRESCRIPTIONS', 'EDIT-PRESCRIPTIONS',
            'VIEW-LAB', 'VIEW-RADIOLOGY', 'VIEW-PHARMACY', 'VIEW-MEDICATIONS',
            'VIEW-REPORTS', 'VIEW-MEDICAL-REPORTS',
        ]);

        // -------- SPECIALISTDOCTOR: داکتر متخصص --------
        $roleInstances['SPECIALISTDOCTOR']->syncPermissions([
            'VIEW-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'CREATE-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS', 'CREATE-PRESCRIPTIONS', 'EDIT-PRESCRIPTIONS',
            'VIEW-LAB', 'APPROVE-LAB-RESULTS',
            'VIEW-RADIOLOGY', 'APPROVE-RADIOLOGY',
            'VIEW-PHARMACY', 'VIEW-MEDICATIONS',
            'VIEW-REPORTS', 'VIEW-MEDICAL-REPORTS',
        ]);

        // -------- SURGEON: جراح --------
        $roleInstances['SURGEON']->syncPermissions([
            'VIEW-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'CREATE-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS', 'CREATE-PRESCRIPTIONS', 'EDIT-PRESCRIPTIONS',
            'VIEW-LAB', 'VIEW-RADIOLOGY',
            'VIEW-PHARMACY', 'VIEW-MEDICATIONS',
            'VIEW-REPORTS', 'VIEW-MEDICAL-REPORTS',
        ]);

        // -------- NURSE: نرس --------
        $roleInstances['NURSE']->syncPermissions([
            'VIEW-REGISTRATIONS',
            'VIEW-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS',
            'VIEW-MEDICATIONS',
            'VIEW-LAB', 'VIEW-RADIOLOGY',
        ]);

        // -------- HEADNURSE: نرس سر --------
        $roleInstances['HEADNURSE']->syncPermissions([
            'VIEW-REGISTRATIONS', 'CREATE-REGISTRATIONS', 'EDIT-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'EDIT-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS',
            'VIEW-MEDICATIONS',
            'VIEW-LAB', 'VIEW-RADIOLOGY',
            'VIEW-REPORTS',
        ]);

        // -------- MIDWIFE: قابله --------
        $roleInstances['MIDWIFE']->syncPermissions([
            'VIEW-REGISTRATIONS', 'CREATE-REGISTRATIONS',
            'VIEW-EXAMINATIONS', 'CREATE-EXAMINATIONS',
            'VIEW-PRESCRIPTIONS', 'CREATE-PRESCRIPTIONS',
            'VIEW-MEDICATIONS',
            'VIEW-LAB',
        ]);

        // -------- PHARMACIST: دواساز --------
        $roleInstances['PHARMACIST']->syncPermissions([
            'VIEW-MEDICATIONS', 'CREATE-MEDICATIONS', 'EDIT-MEDICATIONS',
            'VIEW-PHARMACY', 'CREATE-PHARMACY', 'EDIT-PHARMACY', 'DELETE-PHARMACY',
            'DISPENSE-MEDICINE',
            'VIEW-PRESCRIPTIONS', 'EDIT-PRESCRIPTIONS',
            'VIEW-STOCK', 'CREATE-STOCK', 'EDIT-STOCK',
            'VIEW-SALES', 'CREATE-SALES',
            'VIEW-PURCHASES', 'CREATE-PURCHASES',
            'VIEW-REPORTS', 'VIEW-STOCK-REPORTS', 'VIEW-SALES-REPORTS',
        ]);

        // -------- PHARMACYASSISTANT: دستیار دواخانه --------
        $roleInstances['PHARMACYASSISTANT']->syncPermissions([
            'VIEW-MEDICATIONS',
            'VIEW-PHARMACY', 'CREATE-PHARMACY',
            'DISPENSE-MEDICINE',
            'VIEW-PRESCRIPTIONS',
            'VIEW-STOCK',
        ]);

        // -------- LABTECHNICIAN: تخنیکر لابراتوار --------
        $roleInstances['LABTECHNICIAN']->syncPermissions([
            'VIEW-LAB', 'CREATE-LAB', 'EDIT-LAB',
            'VIEW-REGISTRATIONS',
            'VIEW-REPORTS',
        ]);

        // -------- LABMANAGER: مدیر لابراتوار --------
        $roleInstances['LABMANAGER']->syncPermissions([
            'VIEW-LAB', 'CREATE-LAB', 'EDIT-LAB', 'DELETE-LAB',
            'APPROVE-LAB-RESULTS',
            'VIEW-REGISTRATIONS',
            'VIEW-REPORTS', 'VIEW-MEDICAL-REPORTS',
            'VIEW-EMPLOYEES',
        ]);

        // -------- RADIOLOGIST: رادیولوجیست --------
        $roleInstances['RADIOLOGIST']->syncPermissions([
            'VIEW-RADIOLOGY', 'CREATE-RADIOLOGY', 'EDIT-RADIOLOGY',
            'APPROVE-RADIOLOGY',
            'VIEW-REGISTRATIONS',
            'VIEW-REPORTS', 'VIEW-MEDICAL-REPORTS',
        ]);

        // -------- RADIOLOGYTECHNICIAN: تخنیکر رادیولوژی --------
        $roleInstances['RADIOLOGYTECHNICIAN']->syncPermissions([
            'VIEW-RADIOLOGY', 'CREATE-RADIOLOGY', 'EDIT-RADIOLOGY',
            'VIEW-REGISTRATIONS',
        ]);

        // -------- RECEPTIONIST: استقبال --------
        $roleInstances['RECEPTIONIST']->syncPermissions([
            'VIEW-REGISTRATIONS', 'CREATE-REGISTRATIONS', 'EDIT-REGISTRATIONS',
            'VIEW-MEDICATIONS',
        ]);

        // -------- ACCOUNTANT: حسابدار --------
        $roleInstances['ACCOUNTANT']->syncPermissions([
            'VIEW-ACCOUNTS', 'CREATE-ACCOUNTS', 'EDIT-ACCOUNTS',
            'VIEW-SALES', 'CREATE-SALES', 'EDIT-SALES',
            'VIEW-PURCHASES', 'CREATE-PURCHASES', 'EDIT-PURCHASES',
            'VIEW-PAYMENT', 'CREATE-PAYMENT', 'EDIT-PAYMENT',
            'VIEW-CHANGES', 'CREATE-CHANGES',
            'VIEW-MEDICATIONS',
            'VIEW-REPORTS', 'VIEW-FINANCIAL-REPORTS', 'VIEW-SALES-REPORTS',
            'EXPORT-REPORTS',
        ]);

        // -------- FINANCEMANAGER: مدیر مالی --------
        $roleInstances['FINANCEMANAGER']->syncPermissions([
            'VIEW-ACCOUNTS', 'CREATE-ACCOUNTS', 'EDIT-ACCOUNTS', 'DELETE-ACCOUNTS',
            'VIEW-SALES', 'CREATE-SALES', 'EDIT-SALES', 'DELETE-SALES',
            'VIEW-PURCHASES', 'CREATE-PURCHASES', 'EDIT-PURCHASES', 'DELETE-PURCHASES',
            'VIEW-PAYMENT', 'CREATE-PAYMENT', 'EDIT-PAYMENT', 'DELETE-PAYMENT',
            'VIEW-CHANGES', 'CREATE-CHANGES', 'EDIT-CHANGES',
            'VIEW-MEDICATIONS',
            'VIEW-REPORTS', 'VIEW-FINANCIAL-REPORTS', 'VIEW-SALES-REPORTS',
            'EXPORT-REPORTS',
            'VIEW-EMPLOYEES', 'VIEW-PAYROLL',
        ]);

        // -------- CASHIER: صندوق‌دار --------
        $roleInstances['CASHIER']->syncPermissions([
            'VIEW-ACCOUNTS',
            'VIEW-SALES', 'CREATE-SALES',
            'VIEW-PURCHASES',
            'VIEW-PAYMENT', 'CREATE-PAYMENT',
            'VIEW-CHANGES', 'CREATE-CHANGES',
        ]);

        // -------- HRMANAGER: مدیر منابع بشری --------
        $roleInstances['HRMANAGER']->syncPermissions([
            'VIEW-USERS', 'CREATE-USERS', 'EDIT-USERS',
            'VIEW-ROLES', 'VIEW-PERMISSIONS',
            'VIEW-EMPLOYEES', 'CREATE-EMPLOYEES', 'EDIT-EMPLOYEES', 'DELETE-EMPLOYEES',
            'VIEW-ATTENDANCE', 'MANAGE-ATTENDANCE',
            'VIEW-PAYROLL', 'MANAGE-PAYROLL',
            'VIEW-REPORTS', 'VIEW-HR-REPORTS',
            'EXPORT-REPORTS',
        ]);

        // -------- HRSTAFF: کارمند منابع بشری --------
        $roleInstances['HRSTAFF']->syncPermissions([
            'VIEW-EMPLOYEES', 'CREATE-EMPLOYEES', 'EDIT-EMPLOYEES',
            'VIEW-ATTENDANCE', 'MANAGE-ATTENDANCE',
            'VIEW-PAYROLL',
            'VIEW-REPORTS', 'VIEW-HR-REPORTS',
        ]);

        // -------- STOCKMANAGER: مدیر گدام --------
        $roleInstances['STOCKMANAGER']->syncPermissions([
            'VIEW-MEDICATIONS', 'CREATE-MEDICATIONS', 'EDIT-MEDICATIONS',
            'VIEW-STOCK', 'CREATE-STOCK', 'EDIT-STOCK', 'DELETE-STOCK',
            'VIEW-PURCHASES', 'CREATE-PURCHASES', 'EDIT-PURCHASES',
            'VIEW-REPORTS', 'VIEW-STOCK-REPORTS',
        ]);

        // -------- INVENTORYCLERK: کارمند موجودی --------
        $roleInstances['INVENTORYCLERK']->syncPermissions([
            'VIEW-MEDICATIONS',
            'VIEW-STOCK', 'CREATE-STOCK', 'EDIT-STOCK',
        ]);

        // -------- ITSUPPORT: پشتیبانی تخنیکی --------
        $roleInstances['ITSUPPORT']->syncPermissions([
            'VIEW-USERS',
            'VIEW-LOGS',
            'VIEW-SETTINGS',
        ]);

        // -------- SECURITY: امنیت --------
        $roleInstances['SECURITY']->syncPermissions([
            'VIEW-REGISTRATIONS',
        ]);

        // -------- CLEANER: پاک‌کن --------
        $roleInstances['CLEANER']->syncPermissions([]);

        // -------- AMBULANCEDRIVER: راننده امبولانس --------
        $roleInstances['AMBULANCEDRIVER']->syncPermissions([
            'VIEW-REGISTRATIONS',
        ]);

        // -------- PATIENT: مریض --------
        $roleInstances['PATIENT']->syncPermissions([
            'VIEW-PRESCRIPTIONS',
        ]);

        // -------- USER: کاربر عادی --------
        $roleInstances['USER']->syncPermissions([
            'VIEW-MEDICATIONS',
        ]);

        // ============================================================
        // ================= CREATE ADMIN USER =======================
        // ============================================================
        $admin = User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@gmail.com')],
            [
                'name' => env('ADMIN_NAME', 'Super Admin'),
                'password' => Hash::make(env('ADMIN_PASSWORD', '12345678')),
                'email_verified_at' => now(),
                'role' => 'ADMIN',
            ]
        );

        $admin->syncRoles([$roleInstances['ADMIN']]);

        // ============================================================
        // ================= OUTPUT ==================================
        // ============================================================
        $this->command->info('✅ Roles, Permissions and Admin created successfully!');
        $this->command->info('   Guard: ' . $guardName);
        $this->command->info('   Admin Email: ' . $admin->email);
        $this->command->info('   Total Roles: ' . count($roles));
        $this->command->info('   Total Permissions: ' . count($permissions));
    }
}