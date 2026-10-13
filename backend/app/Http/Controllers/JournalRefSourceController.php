<?php
// app/Http/Controllers/JournalRefSourceController.php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Registrations;
use App\Models\Patient;
use App\Models\User;
use App\Models\ExternalPrescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class JournalRefSourceController extends Controller
{
    /* ============================================================
     *  ✅ نگاشت ref_type حساب‌محور → (account_type + account_category)
     * ============================================================ */
    private array $accountRefMap = [
        'customer_account' => [
            'account_type' => 'receivable',
            'account_category' => 'customers',
        ],
        'corporate_customer' => [
            'account_type' => 'receivable',
            'account_category' => 'corporate_customers',
        ],
        'insurance_company' => [
            'account_type' => 'receivable',
            'account_category' => 'insurance_companies',
        ],
        'supplier_account' => [
            'account_type' => 'payable',
            'account_category' => 'medicine_suppliers',
        ],
        'medicine_supplier' => [
            'account_type' => 'payable',
            'account_category' => 'medicine_suppliers',
        ],
        'equipment_supplier' => [
            'account_type' => 'payable',
            'account_category' => 'medical_equipment_suppliers',
        ],
        'customer_income' => [
            'account_type' => 'income',
            'account_category' => 'customers_income',
        ],
    ];

    /* ============================================================
     *  ✅ نگاشت ref_type کاربرمحور → نقش کاربر
     * ============================================================ */
    private array $userRoleMap = [
        'doctor'        => ['doctor', 'داکتر', 'Doctor', 'DOCTOR'],
        'nurse'         => ['nurse', 'نرس', 'Nurse', 'NURSE'],
        'receptionist'  => ['receptionist', 'منشی', 'Receptionist'],
        'accountant'    => ['accountant', 'محاسب', 'Accountant'],
        'pharmacist'    => ['pharmacist', 'دواساز', 'Pharmacist'],
        'laboratorist'  => ['laboratorist', 'لابراتوار', 'Laboratorist', 'lab'],
        'radiologist'   => ['radiologist', 'رادیولوژیست', 'Radiologist'],
        'staff'         => null, // همه کاربران
    ];

    public function refSources(Request $request)
    {
        $type  = $request->get('type');
        $limit = min((int) $request->get('limit', 500), 1000);

        /* 1) حساب‌محور → accounts */
        if (isset($this->accountRefMap[$type])) {
            return $this->accountSources($type, $limit);
        }

        /* 2) عمومی → جداول اصلی */
        return $this->genericSources($type, $limit);
    }

    /* ============================================================
     *  حساب‌محور
     * ============================================================ */
    private function accountSources(string $type, int $limit)
    {
        $map = $this->accountRefMap[$type];

        $accounts = Account::query()
            ->where('is_active', true)
            ->where('allow_transactions', true)
            ->where('account_type', $map['account_type'])
            ->where('account_category', $map['account_category'])
            ->orderBy('account_code')
            ->limit($limit)
            ->get([
                'id', 'account_code as code', 'account_name as name',
                'currency', 'opening_balance as total_amount',
            ]);

        return response()->json([
            'success' => true,
            'data' => $accounts->map(fn($a) => [
                'id'            => $a->id,
                'name'          => $a->name,
                'code'          => $a->code,
                'national_id'   => null,
                'reg_id'        => null,
                'total_amount'  => (float) ($a->total_amount ?? 0),
                'discount'      => 0,
                'paid_amount'   => 0,
                'currency'      => $a->currency,
                'source_kind'   => 'account',
            ]),
        ]);
    }

    /* ============================================================
     *  عمومی
     * ============================================================ */
    private function genericSources(string $type, int $limit)
    {
        try {
            switch ($type) {

                /* ===== بیمار ===== */
                case 'patient':
                    $rows = DB::table('registrations as r')
                        ->leftJoin('patients as p', 'p.id', '=', 'r.patient_id')
                        ->select(
                            'r.reg_id as id',
                            'r.reg_id',
                            'p.id as patient_id',
                            'p.national_id',
                            DB::raw("TRIM(CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,''))) as name"),
                        )
                        ->whereNotNull('p.id')
                        ->orderByDesc('r.reg_id')
                        ->limit($limit)
                        ->get();

                    return response()->json([
                        'success' => true,
                        'data' => $rows->map(fn($r) => [
                            'id'            => $r->id,
                            'reg_id'        => $r->reg_id,
                            'patient_id'    => $r->patient_id,
                            'name'          => trim($r->name) ?: ('بیمار #' . $r->reg_id),
                            'national_id'   => $r->national_id,
                            'code'          => null,
                            'total_amount'  => 0,
                            'discount'      => 0,
                            'paid_amount'   => 0,
                            'source_kind'   => 'patient',
                        ]),
                    ]);

                /* ===== کاربران بر اساس نقش (داکتر، نرس، منشی، ...) ===== */
                case 'doctor':
                case 'nurse':
                case 'receptionist':
                case 'accountant':
                case 'pharmacist':
                case 'laboratorist':
                case 'radiologist':
                case 'staff':

                    return $this->userSourcesByRole($type, $limit);

                /* ===== نسخه بیرونی ===== */
                case 'external_prescription':
                    $rows = ExternalPrescription::query()
                        ->orderByDesc('id')
                        ->limit($limit)
                        ->get();

                    return response()->json([
                        'success' => true,
                        'data' => $rows->map(fn($e) => [
                            'id'            => $e->id,
                            'name'          => $e->patient_name ?? ('نسخه #' . $e->id),
                            'code'          => null,
                            'national_id'   => $e->tazkira_number ?? null,
                            'reg_id'        => null,
                            'total_amount'  => (float) ($e->total_amount ?? 0),
                            'discount'      => (float) ($e->discount ?? 0),
                            'paid_amount'   => (float) ($e->paid_amount ?? 0),
                            'source_kind'   => 'external_prescription',
                        ]),
                    ]);

                /* ===== فروش ===== */
                case 'sale':
                    $rows = DB::table('sales')->orderByDesc('sales_id')->limit($limit)->get();
                    return response()->json([
                        'success' => true,
                        'data' => $rows->map(fn($s) => [
                            'id'            => $s->sales_id,
                            'name'          => 'فروش #' . $s->sales_id,
                            'code'          => null,
                            'national_id'   => null,
                            'reg_id'        => null,
                            'total_amount'  => (float) ($s->total_amount ?? $s->total ?? 0),
                            'discount'      => (float) ($s->discount ?? 0),
                            'paid_amount'   => (float) ($s->paid_amount ?? 0),
                            'source_kind'   => 'sale',
                        ]),
                    ]);

                /* ===== خرید ===== */
                case 'parchase':
                    $rows = DB::table('parchases')->orderByDesc('parchase_id')->limit($limit)->get();
                    return response()->json([
                        'success' => true,
                        'data' => $rows->map(fn($p) => [
                            'id'            => $p->parchase_id,
                            'name'          => 'خرید #' . $p->parchase_id,
                            'code'          => null,
                            'national_id'   => null,
                            'reg_id'        => null,
                            'total_amount'  => (float) ($p->total_amount ?? $p->total ?? 0),
                            'discount'      => (float) ($p->discount ?? 0),
                            'paid_amount'   => (float) ($p->paid_amount ?? 0),
                            'source_kind'   => 'parchase',
                        ]),
                    ]);

                /* ===== شرکت / فروشنده / شرکت دوا ===== */
                case 'company':
                case 'vendor':
                case 'drug_company':
                    $accounts = Account::query()
                        ->where('is_active', true)
                        ->whereIn('account_category', [
                            'companies', 'vendors',
                            'medicine_suppliers', 'medical_equipment_suppliers',
                        ])
                        ->orderBy('account_code')
                        ->limit($limit)
                        ->get(['id', 'account_code as code', 'account_name as name',
                               'currency', 'opening_balance as total_amount']);

                    return response()->json([
                        'success' => true,
                        'data' => $accounts->map(fn($a) => [
                            'id'            => $a->id,
                            'name'          => $a->name,
                            'code'          => $a->code,
                            'national_id'   => null,
                            'reg_id'        => null,
                            'total_amount'  => (float) ($a->total_amount ?? 0),
                            'discount'      => 0,
                            'paid_amount'   => 0,
                            'currency'      => $a->currency,
                            'source_kind'   => 'account',
                        ]),
                    ]);

                default:
                    return response()->json([
                        'success' => true,
                        'data' => [],
                        'message' => "نوع منبع «{$type}» پشتیبانی نمی‌شود.",
                    ]);
            }

        } catch (\Throwable $e) {
            Log::error('JournalRefSourceController::genericSources error', [
                'type' => $type,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست منابع: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }

    /* ============================================================
     *  ✅ استخراج کاربران بر اساس نقش — مقاوم در برابر ساختارهای مختلف
     * ============================================================ */
    private function userSourcesByRole(string $type, int $limit)
    {
        $roleNames = $this->userRoleMap[$type] ?? null;

        Log::info('[JournalRefSource] userSourcesByRole', [
            'type' => $type,
            'roleNames' => $roleNames,
            'users_has_role_id' => Schema::hasColumn('users', 'role_id'),
            'users_has_role'    => Schema::hasColumn('users', 'role'),
            'role_user_exists'  => Schema::hasTable('role_user'),
            'user_roles_exists' => Schema::hasTable('user_roles'),
        ]);

        $query = User::query()->select(['id', 'name']);

        // اگر ستون phone/email/is_active دارید، اضافه کنید
        if (Schema::hasColumn('users', 'phone')) {
            $query->addSelect('phone');
        }
        if (Schema::hasColumn('users', 'email')) {
            $query->addSelect('email');
        }

        /* ============================================================
         *  حالت 1: ستون مستقیم role در جدول users
         * ============================================================ */
        if (Schema::hasColumn('users', 'role') && $roleNames) {

            $query->whereIn(DB::raw('LOWER(role)'), array_map('strtolower', $roleNames));

        }
        /* ============================================================
         *  حالت 2: ستون role_id در جدول users + جدول roles
         * ============================================================ */
        elseif (Schema::hasColumn('users', 'role_id') && $roleNames) {

            $roleIds = DB::table('roles')
                ->where(function ($q) use ($roleNames) {
                    foreach ($roleNames as $rn) {
                        $q->orWhere('name', 'LIKE', '%' . $rn . '%');
                    }
                })
                ->pluck('id')
                ->toArray();

            if (empty($roleIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => "نقشی با نام‌های " . implode(', ', $roleNames) . " پیدا نشد.",
                ]);
            }

            $query->whereIn('role_id', $roleIds);

        }
        /* ============================================================
         *  حالت 3: جدول pivot role_user (role_id + user_id)
         * ============================================================ */
        elseif (Schema::hasTable('role_user') && $roleNames) {

            $roleIds = DB::table('roles')
                ->where(function ($q) use ($roleNames) {
                    foreach ($roleNames as $rn) {
                        $q->orWhere('name', 'LIKE', '%' . $rn . '%');
                    }
                })
                ->pluck('id')
                ->toArray();

            if (empty($roleIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => "نقشی با نام‌های " . implode(', ', $roleNames) . " پیدا نشد.",
                ]);
            }

            $userIds = DB::table('role_user')
                ->whereIn('role_id', $roleIds)
                ->pluck('user_id')
                ->unique()
                ->toArray();

            if (empty($userIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'کاربری با این نقش ثبت نشده است.',
                ]);
            }

            $query->whereIn('id', $userIds);

        }
        /* ============================================================
         *  حالت 4: جدول user_roles (user_id + role_id)
         * ============================================================ */
        elseif (Schema::hasTable('user_roles') && $roleNames) {

            $roleIds = DB::table('roles')
                ->where(function ($q) use ($roleNames) {
                    foreach ($roleNames as $rn) {
                        $q->orWhere('name', 'LIKE', '%' . $rn . '%');
                    }
                })
                ->pluck('id')
                ->toArray();

            if (empty($roleIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => "نقشی با نام‌های " . implode(', ', $roleNames) . " پیدا نشد.",
                ]);
            }

            $userIds = DB::table('user_roles')
                ->whereIn('role_id', $roleIds)
                ->pluck('user_id')
                ->unique()
                ->toArray();

            if (empty($userIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'کاربری با این نقش ثبت نشده است.',
                ]);
            }

            $query->whereIn('id', $userIds);

        }
        /* ============================================================
         *  حالت 5: هیچ‌کدام → همه کاربران (فقط برای staff)
         * ============================================================ */
        else {
            Log::warning('[JournalRefSource] ساختار نقش کاربران شناسایی نشد', [
                'type' => $type,
                'users_columns' => Schema::getColumnListing('users'),
            ]);
            // اگر type=staff بود، همه کاربران را برگردان
            if ($type !== 'staff') {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'ساختار نقش‌های کاربری در سیستم شناسایی نشد. لطفاً ساختار جدول users و نقش‌ها را بررسی کنید.',
                ]);
            }
        }

        $users = $query->orderBy('name')->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $users->map(fn($u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'code'          => null,
                'national_id'   => null,
                'reg_id'        => null,
                'phone'         => $u->phone ?? null,
                'total_amount'  => 0,
                'discount'      => 0,
                'paid_amount'   => 0,
                'source_kind'   => 'user',
            ]),
        ]);
    }
}