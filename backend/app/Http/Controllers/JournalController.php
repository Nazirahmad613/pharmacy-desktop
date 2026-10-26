<?php
// app/Http/Controllers/JournalController.php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Registrations;
use App\Models\Sales;
use App\Models\Parchase;
use App\Models\Prescription;
use App\Models\ExternalPrescription;
use App\Models\Patient;
use App\Models\User;
use App\Models\Account;
use App\Models\EmployeeSalary;
use App\Models\EmployeeSalaryInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Services\LogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class JournalController extends Controller
{
    /* ============================================================
     *  ✅ انواع ژورنال معاشات — فقط برچسب
     * ============================================================ */
    private const SALARY_META = [
        'salary_generation'    => ['label' => 'تولید معاش (هزینه)'],
        'salary_payable'       => ['label' => 'معاش قابل پرداخت'],
        'salary_payment'       => ['label' => 'پرداخت معاش (صندوق/بانک)'],
        'salary_payment_debit' => ['label' => 'تسویه معاش'],
        'salary_advance'       => ['label' => 'پیش‌پرداخت معاش'],
        'salary_advance_debit' => ['label' => 'ثبت پیش‌پرداخت'],
        'salary_advance_settlement' => ['label' => 'تسویه پیش‌پرداخت'],
    ];

    /* ============================================================
     *  ✅ برچسب‌های فارسی برای دسته‌بندی حساب
     * ============================================================ */
    private const ACCOUNT_CATEGORY_LABELS = [
        'cash' => 'نقدی', 'bank' => 'بانکی',
        'medicine_inventory' => 'موجودی ادویه',
        'laboratory_inventory' => 'موجودی لابراتوار',
        'consumable_inventory' => 'موجودی مصرفی',
        'medical_equipment' => 'تجهیزات طبی',
        'office_equipment' => 'تجهیزات دفتری',
        'tools_and_supplies' => 'ابزار و لوازم',
        'building' => 'ساختمان', 'land' => 'زمین',
        'vehicle' => 'وسیله نقلیه', 'furniture' => 'فرنیچر',
        'prepayments' => 'پیش‌پرداخت‌ها', 'deposits' => 'سپرده‌ها',
        'other_assets' => 'سایر دارایی‌ها',
        'suppliers' => 'تأمین‌کنندگان',
        'medicine_purchase_payable' => 'بدهی خرید ادویه',
        'equipment_purchase_payable' => 'بدهی خرید تجهیزات',
        'laboratory_material_payable' => 'بدهی مواد لابراتوار',
        'salary_payable' => 'بدهی معاشات',
        'tax_payable' => 'بدهی مالیه',
        'loans' => 'قرض‌ها', 'bank_loans' => 'قرض بانکی',
        'contractual_liabilities' => 'تعهدات قراردادی',
        'other_liabilities' => 'سایر بدهی‌ها',
        'initial_capital' => 'سرمایه اولیه',
        'owner_capital' => 'سرمایه مالک',
        'partners_capital' => 'سرمایه شرکا',
        'retained_earnings' => 'سود انباشته',
        'retained_losses' => 'ضرر انباشته',
        'owner_drawings' => 'برداشت مالک',
        'other_equity' => 'سایر سرمایه',
        'medical_services_income' => 'درآمد خدمات طبی',
        'consultation_income' => 'درآمد مشاوره',
        'laboratory_income' => 'درآمد لابراتوار',
        'radiology_income' => 'درآمد رادیولوژی',
        'operation_income' => 'درآمد عملیات',
        'admission_income' => 'درآمد بستر',
        'pharmacy_income' => 'درآمد دواخانه',
        'goods_sales_income' => 'درآمد فروش اجناس',
        'operation_room_income' => 'درآمد اتاق عملیات',
        'other_services_income' => 'درآمد سایر خدمات',
        'non_operating_income' => 'درآمد غیرعملیاتی',
        'rent_income' => 'درآمد کرایه',
        'customers_income' => 'درآمد از مشتریان',
        'customer_income'  => 'درآمد از مشتریان',
        'other_income' => 'سایر درآمدها',
        'salary_expense' => 'مصرف معاشات',
        'rent_expense' => 'مصرف کرایه',
        'electricity_expense' => 'مصرف برق',
        'water_expense' => 'مصرف آب',
        'internet_expense' => 'مصرف انترنت',
        'telephone_expense' => 'مصرف تلیفون',
        'transportation_expense' => 'مصرف ترانسپورت',
        'consumable_material_expense' => 'مصرف مواد مصرفی',
        'medical_material_expense' => 'مصرف مواد طبی',
        'laboratory_material_expense' => 'مصرف مواد لابراتوار',
        'cleaning_material_expense' => 'مصرف مواد پاک‌کاری',
        'repair_expense' => 'مصرف تعمیرات',
        'medical_equipment_repair_expense' => 'مصرف تعمیر تجهیزات طبی',
        'building_repair_expense' => 'مصرف تعمیر ساختمان',
        'fuel_expense' => 'مصرف سوخت',
        'stationery_expense' => 'مصرف قرطاسیه',
        'administrative_expense' => 'مصرف اداری',
        'marketing_expense' => 'مصرف بازاریابی',
        'legal_expense' => 'مصرف حقوقی',
        'tax_and_duty_expense' => 'مصرف مالیه و عوارض',
        'insurance_expense' => 'مصرف بیمه',
        'bank_charge_expense' => 'مصرف کمیشن بانکی',
        'depreciation_expense' => 'مصرف استهلاک',
        'other_expense' => 'سایر مصارف',
        'insurance_companies' => 'شرکت‌های بیمه',
        'contracting_institutions' => 'مؤسسات قراردادی',
        'companies' => 'شرکت‌ها',
        'corporate_customers' => 'مشتریان شرکتی',
        'customers' => 'مشتریان',
        'miscellaneous_receivables' => 'مطالبات متفرقه',
        'other_receivables' => 'سایر مطالبات',
        'medicine_suppliers' => 'تأمین‌کنندگان ادویه',
        'medical_equipment_suppliers' => 'تأمین‌کنندگان تجهیزات طبی',
        'laboratory_material_suppliers' => 'تأمین‌کنندگان مواد لابراتوار',
        'consumable_material_suppliers' => 'تأمین‌کنندگان مواد مصرفی',
        'vendors' => 'فروشندگان', 'contractors' => 'پیمانکاران',
        'salary_payables' => 'معاشات قابل پرداخت',
        'tax_payables' => 'مالیات قابل پرداخت',
        'bank_payables' => 'بدهی بانکی',
        'other_creditors' => 'سایر طلبکاران',
        'employee_doctor' => 'داکتر',
        'employee_nurse' => 'نرس',
        'employee_radiology' => 'کارمند رادیولوژی',
        'employee_laboratory' => 'کارمند لابراتوار',
        'employee_pharmacy' => 'کارمند دواخانه',
        'employee_reception' => 'کارمند پذیرش',
        'employee_administration' => 'کارمند اداری',
        'employee_finance' => 'کارمند مالی / حسابداری',
        'employee_cleaning' => 'کارمند نظافت',
        'employee_security' => 'کارمند امنیت',
        'employee_kitchen' => 'کارمند آشپزخانه',
        'employee_other' => 'سایر کارمندان رسمی',
        'contract_doctor' => 'داکتر قراردادی',
        'contract_nurse' => 'نرس قراردادی',
        'contract_radiology' => 'کارمند رادیولوژی قراردادی',
        'contract_laboratory' => 'کارمند لابراتوار قراردادی',
        'contract_pharmacy' => 'کارمند دواخانه قراردادی',
        'contract_reception' => 'کارمند پذیرش قراردادی',
        'contract_administration' => 'کارمند اداری قراردادی',
        'contract_finance' => 'کارمند مالی قراردادی',
        'contract_cleaning' => 'کارمند نظافت قراردادی',
        'contract_security' => 'کارمند امنیت قراردادی',
        'contract_kitchen' => 'کارمند آشپزخانه قراردادی',
        'contract_other' => 'سایر کارمندان قراردادی',
        'worker_construction' => 'کارگر ساختمانی',
        'worker_cleaning' => 'کارگر نظافت',
        'worker_loading' => 'کارگر بارگیری',
        'worker_gardening' => 'کارگر باغبانی',
        'worker_kitchen' => 'کارگر آشپزخانه',
        'worker_laundry' => 'کارگر لباس‌شویی',
        'worker_maintenance' => 'کارگر تعمیرات',
        'worker_security' => 'کارگر نگهبانی',
        'worker_other' => 'سایر کارگرها',
    ];

    private const USER_ROLE_LABELS = [
        'patient' => 'مریض', 'doctor' => 'داکتر', 'nurse' => 'نرس',
        'receptionist' => 'منشی', 'accountant' => 'محاسب',
        'pharmacist' => 'دواساز', 'laboratorist' => 'لابراتوار',
        'radiologist' => 'رادیولوژیست', 'staff' => 'کارمند',
        'visitor' => 'مراجع', 'admin' => 'مدیر', 'super_admin' => 'مدیر ارشد',
        'employee' => 'کارمند', 'customer' => 'مشتری', 'supplier' => 'تأمین‌کننده',
    ];

    private const ACCOUNT_REF_TYPES = [
        'customer_account',
        'corporate_customer',
        'insurance_company',
        'supplier_account',
        'medicine_supplier',
        'equipment_supplier',
        'laboratory_material_supplier',
        'consumable_material_supplier',
        'customer_income',
    ];

    public const GENERIC_ACCOUNT_REF_TYPE = 'account';
    public const ACCOUNT_CATEGORY_PREFIX = 'account:';

    /* ============================================================
     *  ✅ جدید: پیشوند داینامیک یوزرها بر اساس نقش
     *  مثال: user_role:nurse → همه یوزرهای با نقش nurse
     * ============================================================ */
    public const USER_ROLE_PREFIX = 'user_role:';

    private const ACCOUNT_REF_MAP = [
        'customer_account' => ['type' => 'receivable', 'categories' => ['customers', 'corporate_customers', 'companies']],
        'corporate_customer' => ['type' => 'receivable', 'categories' => ['corporate_customers', 'companies']],
        'insurance_company' => ['type' => 'receivable', 'categories' => ['insurance_companies']],
        'supplier_account' => [
            'type' => 'payable',
            'categories' => [
                'medicine_suppliers', 'medical_equipment_suppliers',
                'laboratory_material_suppliers', 'consumable_material_suppliers',
                'vendors', 'contractors', 'other_creditors',
            ],
        ],
        'medicine_supplier' => ['type' => 'payable', 'categories' => ['medicine_suppliers']],
        'equipment_supplier' => ['type' => 'payable', 'categories' => ['medical_equipment_suppliers']],
        'laboratory_material_supplier' => ['type' => 'payable', 'categories' => ['laboratory_material_suppliers']],
        'consumable_material_supplier' => ['type' => 'payable', 'categories' => ['consumable_material_suppliers']],
        'customer_income' => ['type' => 'income', 'categories' => ['customers_income', 'customer_income']],
    ];

    /* ============================================================
     *  ✅ نرمال‌سازی تاریخ — همه به شمسی YYYY/MM/DD
     * ============================================================ */
    private function normalizeJournalDate(?string $date): ?string
    {
        if (empty($date)) return null;

        $date = trim((string) $date);

        if (str_contains($date, 'T')) $date = substr($date, 0, 10);
        if (str_contains($date, ' ')) $date = explode(' ', $date)[0];

        $date = str_replace('-', '/', $date);

        if (preg_match('/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/', $date, $m)) {
            $year  = (int) $m[1];
            $month = (int) $m[2];
            $day   = (int) $m[3];

            if ($year >= 1900) {
                return $this->gregorianToShamsi($year, $month, $day);
            }

            if ($year >= 1200 && $year < 1900) {
                return sprintf('%04d/%02d/%02d', $year, $month, $day);
            }
        }

        return null;
    }

    private function gregorianToShamsi(int $gy, int $gm, int $gd): string
    {
        $g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
        $days = 355666 + (365 * $gy) + intdiv($gy2 + 3, 4) - intdiv($gy2 + 99, 100)
              + intdiv($gy2 + 399, 400) + $gd + $g_d_m[$gm - 1];

        $jy = -1595 + (33 * intdiv($days, 12053));
        $days %= 12053;
        $jy += 4 * intdiv($days, 1461);
        $days %= 1461;
        if ($days > 365) {
            $jy += intdiv($days - 1, 365);
            $days = ($days - 1) % 365;
        }

        if ($days < 186) {
            $jm = 1 + intdiv($days, 31);
            $jd = 1 + ($days % 31);
        } else {
            $jm = 7 + intdiv($days - 186, 30);
            $jd = 1 + (($days - 186) % 30);
        }

        return sprintf('%04d/%02d/%02d', $jy, $jm, $jd);
    }

    /* ============================================================
     *  🔧 کمکی: تشخیص ref_type داینامیک حساب
     * ============================================================ */
    private function isDynamicAccountRef(?string $refType): bool
    {
        return is_string($refType)
            && str_starts_with($refType, self::ACCOUNT_CATEGORY_PREFIX)
            && strlen($refType) > strlen(self::ACCOUNT_CATEGORY_PREFIX);
    }

    private function extractCategoryFromRefType(?string $refType): ?string
    {
        if (!$this->isDynamicAccountRef($refType)) return null;
        return substr($refType, strlen(self::ACCOUNT_CATEGORY_PREFIX));
    }

    /* ============================================================
     *  ✅ جدید: کمکی‌های تشخیص ref_type داینامیک یوزر
     * ============================================================ */
    private function isDynamicUserRoleRef(?string $refType): bool
    {
        return is_string($refType)
            && str_starts_with($refType, self::USER_ROLE_PREFIX)
            && strlen($refType) > strlen(self::USER_ROLE_PREFIX);
    }

    private function extractRoleFromRefType(?string $refType): ?string
    {
        if (!$this->isDynamicUserRoleRef($refType)) return null;
        return substr($refType, strlen(self::USER_ROLE_PREFIX));
    }

    /**
     * ✅ جدید: گرفتن شماره تذکره کاربر از جدول users
     */
    private function getUserTazkiraNumber(?int $userId): ?string
    {
        if (empty($userId)) return null;

        try {
            $tazkira = User::where('id', $userId)->value('tazkira_number');
            if (!empty($tazkira)) return (string) $tazkira;
        } catch (\Throwable $e) {
            Log::warning('getUserTazkiraNumber failed: ' . $e->getMessage());
        }

        return null;
    }

    /* ============================================================
     *  ✅ نمایش لیست ژورنال‌ها
     * ============================================================ */
    public function index(Request $request)
    {
        $query = Journal::query();

        if ($request->filled('type'))     $query->where('entry_type', $request->type);

        if ($request->filled('from')) {
            $from = $this->normalizeJournalDate($request->from);
            if ($from) {
                $query->whereRaw('REPLACE(journal_date, "-", "/") >= ?', [$from]);
            }
        }
        if ($request->filled('to')) {
            $to = $this->normalizeJournalDate($request->to);
            if ($to) {
                $query->whereRaw('REPLACE(journal_date, "-", "/") <= ?', [$to]);
            }
        }

        if ($request->filled('ref_type')) $query->where('ref_type', $request->ref_type);
        if ($request->filled('ref_id'))   $query->where('ref_id', $request->ref_id);
        if ($request->filled('reg_id'))   $query->where('reg_id', $request->reg_id);

        $journals = $query->orderBy('journal_date', 'desc')->get();

        $journals->transform(function ($j) {
            $j->full_name               = null;
            $j->display_name            = null;
            $j->total_amount            = null;
            $j->paid_amount             = null;
            $j->due_amount              = null;
            $j->source_name             = null;
            $j->source_kind             = null;
            $j->source_label            = null;
            $j->source_type_label       = null;
            $j->source_role_label       = null;
            $j->source_account_category = null;
            $j->source_account_category_label = null;

            // ============ ژورنال‌های معاشات ============
            if (isset(self::SALARY_META[$j->ref_type])) {
                $meta = self::SALARY_META[$j->ref_type];
                $j->source_label = $meta['label'];

                try {
                    if (!empty($j->account_id)) {
                        $account = Account::find($j->account_id);
                        if ($account) {
                            $j->source_kind = 'account';
                            $j->source_name = $account->account_name
                                ?? $account->name
                                ?? "حساب #{$j->account_id}";
                            $j->source_account_category = $account->account_category ?? null;
                            $j->source_account_category_label =
                                $this->categoryLabelForAccount($account->account_category ?? null);

                            if (!empty($account->tazkira_number) && empty($j->tazkira_number)) {
                                $j->tazkira_number = $account->tazkira_number;
                            }
                        }
                    }

                    if (empty($j->source_kind)) {
                        if (in_array($j->ref_type, [
                            'salary_generation', 'salary_payable',
                            'salary_payment', 'salary_payment_debit',
                        ], true)) {
                            $salary = EmployeeSalary::with(['user', 'account'])->find($j->ref_id);

                            if ($salary) {
                                if (!empty($salary->user_id)) {
                                    $j->source_kind = 'user';
                                    $j->source_name = $salary->user?->name
                                        ?? $salary->user?->full_name
                                        ?? null;
                                    $j->employee_id = $salary->user_id;

                                    if ($salary->user) {
                                        $j->source_role_label =
                                            $this->roleLabel($salary->user->role ?? null);
                                    }

                                    // ✅ شماره تذکره کاربر از جدول users
                                    $userTazkira = $this->getUserTazkiraNumber((int) $salary->user_id);
                                    if (!empty($userTazkira) && empty($j->tazkira_number)) {
                                        $j->tazkira_number = $userTazkira;
                                    }
                                } elseif (!empty($salary->account_id)) {
                                    $j->source_kind = 'account';
                                    $j->account_id  = $salary->account_id;
                                    $j->source_name = $salary->account?->account_name ?? null;
                                    $j->source_account_category =
                                        $salary->account?->account_category ?? null;
                                    $j->source_account_category_label =
                                        $this->categoryLabelForAccount($salary->account?->account_category ?? null);

                                    if (!empty($salary->account?->tazkira_number) && empty($j->tazkira_number)) {
                                        $j->tazkira_number = $salary->account->tazkira_number;
                                    }
                                }

                                if (empty($j->source_name)) {
                                    $name = $salary->employee_name;
                                    if (!empty($name) && $name !== '—') {
                                        $j->source_name = $name;
                                    }
                                }
                            }
                        }
                    }

                    if (empty($j->source_name) && !empty($j->description)) {
                        if (preg_match('/(?:معاش|پیش‌پرداخت|تولید معاش|پرداخت معاش|تسویه معاش|تسویه پیش‌پرداخت)\s*-\s*([^\-()]+)/u', $j->description, $m)) {
                            $name = trim($m[1]);
                            if ($name !== '') $j->source_name = $name;
                        }
                    }

                    if (empty($j->source_kind)) $j->source_kind = 'user';
                    if (empty($j->source_name)) $j->source_name = "معاش #{$j->ref_id}";

                    $j->full_name    = $j->source_name;
                    $j->display_name = $j->source_name;
                    $j->source_type_label = $this->resolveSourceTypeLabel($j);

                } catch (\Throwable $e) {
                    Log::warning('salary source resolve failed for Journal #' . $j->id . ': ' . $e->getMessage());
                    $j->source_kind = empty($j->account_id) ? 'user' : 'account';
                    $j->source_name = "معاش #{$j->ref_id}";
                    $j->source_type_label = $this->resolveSourceTypeLabel($j);
                }

                return $j;
            }

            // ============ منابع حساب‌محور کلاسیک ============
            if (in_array($j->ref_type, self::ACCOUNT_REF_TYPES, true)) {
                $account = null;
                if (!empty($j->account_id)) $account = Account::find($j->account_id);
                if (!$account && !empty($j->ref_id)) $account = Account::find($j->ref_id);

                if ($account) {
                    $j->source_kind                    = 'account';
                    $j->source_name                    = $account->account_name;
                    $j->source_account_category        = $account->account_category;
                    $j->source_account_category_label  =
                        $this->categoryLabelForAccount($account->account_category);

                    if (!empty($account->tazkira_number) && empty($j->tazkira_number)) {
                        $j->tazkira_number = $account->tazkira_number;
                    }

                    $j->full_name    = $account->account_name;
                    $j->display_name = $account->account_name;
                } else {
                    $j->source_kind = 'account';
                    $j->source_name = $j->description ?: "حساب #{$j->ref_id}";
                }

                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ نوع «account» عمومی ============
            if ($j->ref_type === self::GENERIC_ACCOUNT_REF_TYPE) {
                $account = null;
                if (!empty($j->account_id)) $account = Account::find($j->account_id);
                if (!$account && !empty($j->ref_id)) $account = Account::find($j->ref_id);

                if ($account) {
                    $j->source_kind                    = 'account';
                    $j->source_name                    = $account->account_name;
                    $j->source_account_category        = $account->account_category;
                    $j->source_account_category_label  =
                        $this->categoryLabelForAccount($account->account_category);

                    if (!empty($account->tazkira_number) && empty($j->tazkira_number)) {
                        $j->tazkira_number = $account->tazkira_number;
                    }

                    $j->full_name    = $account->account_name;
                    $j->display_name = $account->account_name;
                } else {
                    $j->source_kind = 'account';
                    $j->source_name = $j->description ?: "حساب #{$j->ref_id}";
                }

                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ نوع داینامیک account:{category} ============
            if ($this->isDynamicAccountRef($j->ref_type)) {
                $account = null;
                if (!empty($j->account_id)) $account = Account::find($j->account_id);
                if (!$account && !empty($j->ref_id)) $account = Account::find($j->ref_id);

                $expectedCategory = $this->extractCategoryFromRefType($j->ref_type);

                if ($account) {
                    $j->source_kind                    = 'account';
                    $j->source_name                    = $account->account_name;
                    $j->source_account_category        = $account->account_category;
                    $j->source_account_category_label  =
                        $this->categoryLabelForAccount($account->account_category);

                    if (!empty($account->tazkira_number) && empty($j->tazkira_number)) {
                        $j->tazkira_number = $account->tazkira_number;
                    }

                    $j->full_name    = $account->account_name;
                    $j->display_name = $account->account_name;
                } else {
                    $j->source_kind = 'account';
                    $j->source_account_category = $expectedCategory;
                    $j->source_account_category_label = $this->categoryLabelForAccount($expectedCategory);
                    $j->source_name = $j->description ?: "حساب #{$j->ref_id}";
                }

                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ ✅ جدید: نوع داینامیک user_role:{role} ============
            if ($this->isDynamicUserRoleRef($j->ref_type)) {
                $role = $this->extractRoleFromRefType($j->ref_type);

                $j->source_kind = 'user';
                $j->source_role_label = $this->roleLabel($role);

                try {
                    $user = User::find($j->ref_id);
                    if ($user) {
                        $j->source_name  = $user->name ?? $user->full_name ?? "کاربر #{$user->id}";
                        $j->employee_id  = $user->id;

                        if (!empty($user->role)) {
                            $j->source_role_label = $this->roleLabel($user->role);
                        }

                        // ✅ شماره تذکره کاربر از جدول users
                        if (!empty($user->tazkira_number) && empty($j->tazkira_number)) {
                            $j->tazkira_number = $user->tazkira_number;
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('user_role source resolve failed: ' . $e->getMessage());
                }

                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "کاربر #{$j->ref_id}";
                }

                $j->full_name    = $j->source_name;
                $j->display_name = $j->source_name;
                $j->source_type_label = $this->resolveSourceTypeLabel($j);

                return $j;
            }

            // ============ external_prescription ============
            if ($j->ref_type === 'external_prescription') {
                $external = ExternalPrescription::find($j->ref_id);

                if ($external) {
                    $patientName = $external->patient_name ?: "نسخه بیرونی #{$j->ref_id}";

                    $j->full_name      = $patientName;
                    $j->display_name   = $patientName;
                    $j->source_name    = $patientName;
                    $j->tazkira_number = $external->tazkira_number ?? $j->tazkira_number;
                    $j->total_amount   = $external->total_amount;
                    $j->paid_amount    = $j->amount;
                    $j->due_amount     = max(
                        0,
                        (float) $external->total_amount
                            - (float) ($external->discount ?? 0)
                            - (float) $j->amount
                    );
                    $j->reg_type = 'external_prescription';
                } else {
                    $j->source_name = "نسخه بیرونی #{$j->ref_id}";
                }

                if (empty($j->source_name) || $j->source_name === "نسخه بیرونی #{$j->ref_id}") {
                    $extracted = $this->extractNameFromDescription($j->description);
                    if (!empty($extracted)) {
                        $j->full_name    = $extracted;
                        $j->display_name = $extracted;
                        $j->source_name  = $extracted;
                    }
                }

                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "نسخه بیرونی #{$j->ref_id}";
                }

                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ sale ============
            if ($j->ref_type === 'sale') {
                $sale = Sales::with('customer')->find($j->ref_id);
                if ($sale) {
                    $name = $sale->customer->account_name
                        ?? $sale->customer->full_name
                        ?? $sale->customer->name
                        ?? "فروش شماره {$j->ref_id}";
                    $j->full_name      = $name;
                    $j->display_name   = $name;
                    $j->source_name    = $name;
                    $j->tazkira_number = $sale->customer->tazkira_number ?? $j->tazkira_number;
                    $j->total_amount   = $sale->net_sales;
                    $j->paid_amount    = $sale->total_paid;
                    $j->due_amount     = $sale->remaining_amount;
                } else {
                    $j->source_name = "فروش شماره {$j->ref_id}";
                }
                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ parchase ============
            if ($j->ref_type === 'parchase') {
                $p = Parchase::with('supplier')->find($j->ref_id);
                if ($p) {
                    $name = $p->supplier->account_name
                        ?? $p->supplier->full_name
                        ?? $p->supplier->name
                        ?? "خرید شماره {$j->ref_id}";
                    $j->full_name      = $name;
                    $j->display_name   = $name;
                    $j->source_name    = $name;
                    $j->tazkira_number = $p->supplier->tazkira_number ?? $j->tazkira_number;
                    $j->total_amount   = $p->total_parchase;
                    $j->paid_amount    = $p->par_paid;
                    $j->due_amount     = $p->due_par;
                } else {
                    $j->source_name = "خرید شماره {$j->ref_id}";
                }
                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ patient ============
            if ($j->ref_type === 'patient') {
                $patient = $this->findPatientForJournal($j);

                if ($patient) {
                    $patientName = trim(
                        ($patient->first_name ?? '') . ' ' .
                        ($patient->last_name ?? '')
                    );

                    if ($patientName !== '') {
                        $j->full_name    = $patientName;
                        $j->display_name = $patientName;
                        $j->source_name  = $patientName;
                    } else {
                        $j->source_name = "مریض #{$patient->id}";
                    }

                    if (!empty($patient->national_id)) {
                        $j->tazkira_number = $patient->national_id;
                    }
                }

                if (empty($j->source_name)) {
                    $regIdToUse = $j->reg_id ?: $j->ref_id;
                    if ($regIdToUse) {
                        $reg = Registrations::where('reg_id', $regIdToUse)->first();
                        if ($reg) {
                            $j->full_name    = $reg->full_name ?? null;
                            $j->display_name = $reg->full_name ?? null;
                            $j->source_name  = $reg->full_name ?? null;

                            if (empty($j->tazkira_number)) {
                                $j->tazkira_number = $reg->tazkira_number ?? null;
                            }
                            $j->reg_type = $reg->reg_type;
                        }
                    }
                }

                if ($j->pres_id) {
                    $prescription = Prescription::find($j->pres_id);
                    if ($prescription) {
                        $j->display_name = "نسخه شماره {$prescription->pres_num}";
                        if (empty($j->source_name) && !empty($prescription->patient_name)) {
                            $j->source_name = $prescription->patient_name;
                        }
                        $j->total_amount = $prescription->net_amount;
                        $j->paid_amount  = $prescription->net_amount;
                        $j->due_amount   = 0;
                    }
                }

                if (empty($j->source_name) && !empty($j->description)) {
                    $j->source_name = $this->extractNameFromDescription($j->description);
                }

                if (empty($j->source_name)) {
                    $j->source_name = $j->description ?: "مریض #{$j->ref_id}";
                }

                $j->source_type_label = $this->resolveSourceTypeLabel($j);
                return $j;
            }

            // ============ سایر انواع ============
            if (method_exists($j, 'resolveSourceName')) {
                try {
                    $name = $j->resolveSourceName();
                    if (!empty($name) && $name !== '-') {
                        $j->source_name = $name;
                    }
                } catch (\Throwable $e) {
                    Log::warning('resolveSourceName failed for Journal #' . $j->id . ': ' . $e->getMessage());
                }
            }

            if ($j->reg_id) {
                $reg = Registrations::where('reg_id', $j->reg_id)->first();
                if ($reg) {
                    $j->full_name    = $reg->full_name ?? $j->full_name;
                    $j->display_name = $reg->full_name ?? $j->display_name;
                    if (empty($j->tazkira_number)) {
                        $j->tazkira_number = $reg->tazkira_number ?? null;
                    }
                    $j->reg_type = $reg->reg_type;

                    if (empty($j->source_name) && !empty($reg->full_name)) {
                        $j->source_name = $reg->full_name;
                    }
                }
            }

            // ✅ اگر هنوز شماره تذکره خالی است و journal.user_id موجود است، از جدول users بگیر
            if (empty($j->tazkira_number) && !empty($j->user_id)) {
                $userTazkira = $this->getUserTazkiraNumber((int) $j->user_id);
                if (!empty($userTazkira)) {
                    $j->tazkira_number = $userTazkira;
                }
            }

            if (empty($j->source_name)) {
                $j->source_name = $j->description ?: "منبع #{$j->ref_id}";
            }

            $j->source_type_label = $this->resolveSourceTypeLabel($j);
            return $j;
        });

        return response()->json($journals);
    }

    /* ============================================================ 
     *  ✅ نوعیت منبع
     * ============================================================ */
    private function resolveSourceTypeLabel(Journal $j): string
    {
        if (isset(self::SALARY_META[$j->ref_type])) {
            if ($j->source_kind === 'user') {
                if (!empty($j->source_role_label)) return $j->source_role_label;
                return 'یوزر';
            }
            if ($j->source_kind === 'account') {
                if (!empty($j->source_account_category_label)) {
                    return $j->source_account_category_label;
                }
                return 'حساب';
            }
            return '-';
        }

        if (in_array($j->ref_type, self::ACCOUNT_REF_TYPES, true)) {
            if (!empty($j->source_account_category_label)) {
                return $j->source_account_category_label;
            }
            return 'حساب';
        }

        if ($j->ref_type === self::GENERIC_ACCOUNT_REF_TYPE) {
            if (!empty($j->source_account_category_label)) {
                return $j->source_account_category_label;
            }
            return 'حساب';
        }

        if ($this->isDynamicAccountRef($j->ref_type)) {
            if (!empty($j->source_account_category_label)) {
                return $j->source_account_category_label;
            }
            $cat = $this->extractCategoryFromRefType($j->ref_type);
            return $this->categoryLabelForAccount($cat) ?? 'حساب';
        }

        // ✅ جدید: نوع داینامیک user_role:{role}
        if ($this->isDynamicUserRoleRef($j->ref_type)) {
            if (!empty($j->source_role_label)) return $j->source_role_label;
            $role = $this->extractRoleFromRefType($j->ref_type);
            return $this->roleLabel($role) ?? 'کاربر';
        }

        if ($j->ref_type === 'sale') return 'مشتری';
        if ($j->ref_type === 'parchase') return 'تأمین‌کننده';
        if ($j->ref_type === 'external_prescription') return 'نسخه بیرونی';
        if ($j->ref_type === 'patient') return 'مریض';

        if (!empty($j->reg_type)) {
            $role = $this->roleLabel($j->reg_type);
            if ($role) return $role;
            return (string) $j->reg_type;
        }

        if (!empty($j->ref_type)) {
            $role = $this->roleLabel($j->ref_type);
            if ($role) return $role;
            return (string) $j->ref_type;
        }

        return '-';
    }

    private function roleLabel(?string $role): ?string
    {
        if (!$role) return null;
        $r = strtolower(trim($role));
        return self::USER_ROLE_LABELS[$r] ?? $role;
    }

    private function categoryLabelForAccount(?string $category): ?string
    {
        if (!$category) return null;
        return self::ACCOUNT_CATEGORY_LABELS[$category] ?? $category;
    }

    private function typeLabelForAccount(?string $type): string
    {
        $map = [
            'asset'      => 'دارایی',
            'liability'  => 'بدهی',
            'equity'     => 'سرمایه',
            'income'     => 'درآمد',
            'expense'    => 'هزینه',
            'receivable' => 'مطالبات',
            'payable'    => 'بدهی‌ها',
            'employee'   => 'کارمندان',
        ];
        if (!$type) return 'سایر';
        return $map[$type] ?? $type;
    }

    private function findPatientForJournal(Journal $journal): ?Patient
    {
        try {
            if (!empty($journal->patient_id)) {
                $p = Patient::find($journal->patient_id);
                if ($p) return $p;
            }
            if (!empty($journal->reg_id)) {
                $reg = Registrations::where('reg_id', $journal->reg_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
            }
            if (!empty($journal->ref_id)) {
                $reg = Registrations::where('reg_id', $journal->ref_id)->first();
                if ($reg && !empty($reg->patient_id)) {
                    $p = Patient::find($reg->patient_id);
                    if ($p) return $p;
                }
            }
            if (!empty($journal->ref_id)) {
                $p = Patient::find($journal->ref_id);
                if ($p) return $p;
            }
            if (!empty($journal->parent_journal_id)) {
                $parent = Journal::find($journal->parent_journal_id);
                if ($parent) {
                    if (!empty($parent->patient_id)) {
                        $p = Patient::find($parent->patient_id);
                        if ($p) return $p;
                    }
                    if (!empty($parent->reg_id)) {
                        $reg = Registrations::where('reg_id', $parent->reg_id)->first();
                        if ($reg && !empty($reg->patient_id)) {
                            $p = Patient::find($reg->patient_id);
                            if ($p) return $p;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('findPatientForJournal failed: ' . $e->getMessage());
        }
        return null;
    }

    private function extractNameFromDescription(?string $description): ?string
    {
        if (empty($description)) return null;

        $patterns = [
            '/بیمار\s+(.+?)(?:\s*-\s*رسید|$)/u',
            '/مریض\s+(.+?)(?:\s*-\s*رسید|$)/u',
            '/بیمار\s*:\s*(.+?)(?:\s*-\s*|$)/u',
            '/مریض\s*:\s*(.+?)(?:\s*-\s*|$)/u',
            '/patient\s*:\s*(.+?)(?:\s*-\s*|$)/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $description, $m)) {
                $name = trim($m[1]);
                if ($name !== '') return $name;
            }
        }
        return null;
    }

    /* ============================================================
     *  ✅ دریافت لیست منابع
     * ============================================================ */
    public function getRefSources(Request $request)
    {
        $request->validate([
            'type'   => 'required|string',
            'search' => 'nullable|string|max:255',
        ]);

        try {
            $type   = $request->type;
            $search = $request->search;
            $limit  = min((int) $request->get('limit', 100), 500);

            if ($type === self::GENERIC_ACCOUNT_REF_TYPE) {
                $sources = $this->getAllAccountsRefSources($search, $limit);
                return response()->json([
                    'success' => true,
                    'data'    => $sources,
                    'count'   => count($sources),
                    'type'    => $type,
                ]);
            }

            if ($this->isDynamicAccountRef($type)) {
                $category = $this->extractCategoryFromRefType($type);
                $sources  = $this->getAccountsByCategory($category, $search, $limit);

                if (empty($sources)) {
                    Log::info('[getRefSources] هیچ حسابی برای دسته داینامیک یافت نشد', [
                        'type' => $type, 'category' => $category,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'data'    => $sources,
                    'count'   => count($sources),
                    'type'    => $type,
                ]);
            }

            // ✅ جدید: نوع داینامیک user_role:{role}
            if ($this->isDynamicUserRoleRef($type)) {
                $role    = $this->extractRoleFromRefType($type);
                $sources = $this->getUsersByRole($role, $search, $limit);

                if (empty($sources)) {
                    Log::info('[getRefSources] هیچ یوزری برای نقش یافت نشد', [
                        'type' => $type, 'role' => $role,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'data'    => $sources,
                    'count'   => count($sources),
                    'type'    => $type,
                ]);
            }

            if (in_array($type, self::ACCOUNT_REF_TYPES, true)) {
                $sources = $this->getAccountsRefSources($type, $search, $limit);

                if (empty($sources)) {
                    Log::info('[getRefSources] هیچ حسابی برای ref_type یافت نشد', [
                        'type' => $type, 'search' => $search,
                        'map_config' => self::ACCOUNT_REF_MAP[$type] ?? null,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'data'    => $sources,
                    'count'   => count($sources),
                    'type'    => $type,
                ]);
            }

            $sources = Journal::getRefSources($type, $search, $limit);

            return response()->json([
                'success' => true,
                'data'    => $sources,
                'count'   => count($sources),
                'type'    => $type,
            ]);
        } catch (\Throwable $e) {
            Log::error('getRefSources failed: ' . $e->getMessage(), [
                'type'  => $request->type,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت منابع',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /* ============================================================
     *  ✅ گروه‌های داینامیک کتگوری حساب‌ها
     * ============================================================ */
    public function getAccountRefGroups()
    {
        try {
            $rows = Account::query()
                ->where('is_active', true)
                ->whereNotNull('account_type')
                ->whereNotNull('account_category')
                ->select('account_type', 'account_category', DB::raw('COUNT(*) as total'))
                ->groupBy('account_type', 'account_category')
                ->orderBy('account_type')
                ->orderBy('account_category')
                ->get();

            $groups = [];
            foreach ($rows as $r) {
                $groups[] = [
                    'account_type'           => $r->account_type,
                    'account_type_label'     => $this->typeLabelForAccount($r->account_type),
                    'account_category'       => $r->account_category,
                    'account_category_label' => $this->categoryLabelForAccount($r->account_category),
                    'ref_type'               => self::ACCOUNT_CATEGORY_PREFIX . $r->account_category,
                    'total'                  => (int) $r->total,
                ];
            }

            $grouped = [];
            foreach ($groups as $g) {
                $grouped[$g['account_type']][] = $g;
            }

            return response()->json([
                'success' => true,
                'data'    => $groups,
                'grouped' => $grouped,
            ]);
        } catch (\Throwable $e) {
            Log::error('getAccountRefGroups failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /* ============================================================
     *  ✅ جدید: گروه‌های داینامیک نقش‌های کاربری
     *  هر نقشی که حداقل یک یوزر دارد، اینجا برمی‌گردد.
     * ============================================================ */
    public function getUserRoleGroups()
    {
        try {
            $groups = [];

            // ✅ تلاش ۱: از جدول Spatie roles
            try {
                if (Schema::hasTable('roles') && Schema::hasTable('model_has_roles')) {
                    $rows = DB::table('roles')
                        ->select('roles.name', DB::raw('(SELECT COUNT(*) FROM model_has_roles mhr WHERE mhr.role_id = roles.id) as total'))
                        ->orderBy('roles.name')
                        ->get();

                    foreach ($rows as $r) {
                        $roleName  = $r->name;
                        $roleLabel = self::USER_ROLE_LABELS[$roleName] ?? $roleName;

                        $groups[] = [
                            'role'       => $roleName,
                            'role_label' => $roleLabel,
                            'ref_type'   => self::USER_ROLE_PREFIX . $roleName,
                            'total'      => (int) $r->total,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('getUserRoleGroups (spatie) failed: ' . $e->getMessage());
            }

            // ✅ تلاش ۲: اگر خالی بود، از ستون users.role
            if (empty($groups)) {
                $rows = User::query()
                    ->whereNotNull('role')
                    ->where('role', '!=', '')
                    ->select('role', DB::raw('COUNT(*) as total'))
                    ->groupBy('role')
                    ->orderBy('role')
                    ->get();

                foreach ($rows as $r) {
                    $roleName  = $r->role;
                    $roleLabel = self::USER_ROLE_LABELS[$roleName] ?? $roleName;

                    $groups[] = [
                        'role'       => $roleName,
                        'role_label' => $roleLabel,
                        'ref_type'   => self::USER_ROLE_PREFIX . $roleName,
                        'total'      => (int) $r->total,
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data'    => $groups,
            ]);
        } catch (\Throwable $e) {
            Log::error('getUserRoleGroups failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /* ============================================================
     *  ✅ جدید: یوزرهای یک نقش خاص (برای user_role:{role})
     * ============================================================ */
    private function getUsersByRole(string $role, ?string $search = null, int $limit = 200): array
    {
        $query = User::query();

        // ✅ فیلتر بر اساس نقش (هم ستون role، هم Spatie roles)
        try {
            $query->where(function ($q) use ($role) {
                $q->where('role', $role);

                if (Schema::hasTable('roles') && Schema::hasTable('model_has_roles')) {
                    $q->orWhereHas('roles', function ($qq) use ($role) {
                        $qq->where('name', $role);
                    });
                }
            });
        } catch (\Throwable $e) {
            $query->where('role', $role);
        }

        if (!empty($search)) {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('tazkira_number', 'like', "%{$s}%");
            });
        }

        $users = $query
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'email', 'role', 'tazkira_number']);

        $roleLabel = self::USER_ROLE_LABELS[$role] ?? $role;

        return $users->map(function ($u) use ($role, $roleLabel) {
            return [
                'id'             => $u->id,
                'name'           => $u->name ?? ('کاربر #' . $u->id),
                'code'           => 'USR-' . str_pad($u->id, 5, '0', STR_PAD_LEFT),
                'national_id'    => $u->tazkira_number ?? null,
                'tazkira_number' => $u->tazkira_number ?? null,
                'reg_id'         => null,
                'currency'       => null,
                'category'       => $role,
                'category_label' => $roleLabel,
                'type'           => 'user',
                'type_label'     => 'کاربر سیستم',
                'source_kind'    => 'user',
                'total_amount'   => null,
                'discount'       => 0,
                'paid_amount'    => 0,
                'role'           => $role,
            ];
        })->toArray();
    }

    /* ============================================================
     *  ✅ همه حساب‌های فعال (برای نوع account عمومی)
     * ============================================================ */
    private function getAllAccountsRefSources(?string $search = null, int $limit = 500): array
    {
        $query = Account::query()->where('is_active', true);

        if (!empty($search)) {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('account_name', 'like', "%{$s}%")
                  ->orWhere('account_code', 'like', "%{$s}%")
                  ->orWhere('tazkira_number', 'like', "%{$s}%");
            });
        }

        $accounts = $query
            ->orderBy('account_type')
            ->orderBy('account_category')
            ->orderBy('account_name')
            ->limit($limit)
            ->get([
                'id', 'account_code', 'account_name', 'account_type',
                'account_category', 'tazkira_number', 'currency',
            ]);

        $flat = [];
        foreach ($accounts as $a) {
            $typeKey = $a->account_type ?: 'other';
            $catKey  = $a->account_category ?: 'other';

            $flat[] = [
                'id'             => $a->id,
                'name'           => $a->account_name,
                'code'           => $a->account_code,
                'national_id'    => $a->tazkira_number,
                'reg_id'         => null,
                'currency'       => $a->currency,
                'category'       => $a->account_category,
                'category_label' => $this->categoryLabelForAccount($a->account_category),
                'type'           => $a->account_type,
                'type_label'     => $this->typeLabelForAccount($a->account_type),
                'source_kind'    => 'account',
                'total_amount'   => null,
                'discount'       => 0,
                'paid_amount'    => 0,
                'group_type'       => $typeKey,
                'group_type_label' => $this->typeLabelForAccount($typeKey),
                'group_category'   => $catKey,
            ];
        }

        return $flat;
    }

    /* ============================================================
     *  ✅ حساب‌های یک کتگوری خاص (برای account:{category})
     * ============================================================ */
    private function getAccountsByCategory(string $category, ?string $search = null, int $limit = 100): array
    {
        $query = Account::query()
            ->where('is_active', true)
            ->where('account_category', $category);

        if (!empty($search)) {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('account_name', 'like', "%{$s}%")
                  ->orWhere('account_code', 'like', "%{$s}%")
                  ->orWhere('tazkira_number', 'like', "%{$s}%");
            });
        }

        $accounts = $query
            ->orderBy('account_name')
            ->limit($limit)
            ->get([
                'id', 'account_code', 'account_name', 'account_category',
                'account_type', 'tazkira_number', 'currency',
            ]);

        return $accounts->map(function ($a) {
            return [
                'id'             => $a->id,
                'name'           => $a->account_name,
                'code'           => $a->account_code,
                'national_id'    => $a->tazkira_number,
                'reg_id'         => null,
                'currency'       => $a->currency,
                'category'       => $a->account_category,
                'category_label' => $this->categoryLabelForAccount($a->account_category),
                'type'           => $a->account_type,
                'type_label'     => $this->typeLabelForAccount($a->account_type),
                'source_kind'    => 'account',
                'total_amount'   => null,
                'discount'       => 0,
                'paid_amount'    => 0,
            ];
        })->toArray();
    }

    /* ============================================================
     *  ✅ حساب‌های یک کتگوری خاص (کلاسیک)
     * ============================================================ */
    private function getAccountsRefSources(string $refType, ?string $search = null, int $limit = 100): array
    {
        if (!isset(self::ACCOUNT_REF_MAP[$refType])) {
            Log::warning('[getAccountsRefSources] ref_type در ACCOUNT_REF_MAP یافت نشد', [
                'ref_type' => $refType,
            ]);
            return [];
        }

        $config = self::ACCOUNT_REF_MAP[$refType];

        $query = Account::query()
            ->where('account_type', $config['type'])
            ->whereIn('account_category', $config['categories'])
            ->where('is_active', true);

        try {
            if (Schema::hasColumn('accounts', 'allow_transactions')) {
                $query->where('allow_transactions', true);
            }
        } catch (\Throwable $e) {
            // نادیده بگیر
        }

        if (!empty($search)) {
            $s = trim($search);
            $query->where(function ($q) use ($s) {
                $q->where('account_name', 'like', "%{$s}%")
                  ->orWhere('account_code', 'like', "%{$s}%")
                  ->orWhere('tazkira_number', 'like', "%{$s}%");
            });
        }

        $accounts = $query
            ->orderBy('account_name')
            ->limit($limit)
            ->get(['id', 'account_code', 'account_name', 'account_category', 'tazkira_number']);

        return $accounts->map(function ($a) {
            return [
                'id'           => $a->id,
                'name'         => $a->account_name,
                'code'         => $a->account_code,
                'national_id'  => $a->tazkira_number,
                'reg_id'       => null,
                'category'     => $a->account_category,
                'category_label' => $this->categoryLabelForAccount($a->account_category),
                'total_amount' => null,
                'discount'     => 0,
                'paid_amount'  => 0,
            ];
        })->toArray();
    }

    /* ============================================================
     *  ✅ STORE — با نرمال‌سازی تاریخ + استخراج خودکار account_id
     * ============================================================ */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'journal_date'      => 'required|string',
            'description'       => 'nullable|string|max:1000',
            'entry_type'        => ['required', Rule::in(['debit', 'credit'])],
            'amount'            => 'required|numeric|min:0.01',
            'ref_type'          => 'required|string',
            'ref_id'            => 'required|integer',
            'pres_id'           => 'nullable|integer',
            'reg_id'            => 'nullable|integer',
            'account_id'        => 'nullable|integer|exists:accounts,id',
            'tazkira_number'    => 'nullable|string|max:255',
            'parent_journal_id' => 'nullable|exists:journals,id',
        ]);

        $journalDate = $this->normalizeJournalDate($validated['journal_date']);
        if (!$journalDate) {
            return response()->json([
                'message' => 'تاریخ ژورنال نامعتبر است',
                'received' => $validated['journal_date'],
            ], 422);
        }

        Log::info('Journal store — date', [
            'received' => $validated['journal_date'],
            'normalized' => $journalDate,
        ]);

        DB::beginTransaction();

        try {
            $reg = $this->resolveRegistration($validated);
            $patientId = $this->resolvePatientIdFromValidated($validated);

            $resolvedAccountId = $this->resolveJournalAccountId($validated);
            Log::info('[store] resolvedAccountId', [
                'input' => $validated['account_id'] ?? null,
                'resolved' => $resolvedAccountId,
                'ref_type' => $validated['ref_type'],
                'ref_id' => $validated['ref_id'],
            ]);

            // ✅ اگر شماره تذکره ارسال نشده و ref_type یوزری است، از جدول users بگیر
            $resolvedTazkira = $validated['tazkira_number']
                ?? $reg->tazkira_number
                ?? null;

            if (empty($resolvedTazkira)) {
                $resolvedTazkira = $this->resolveTazkiraForJournal($validated);
            }

            $data = [
                'journal_date'      => $journalDate,
                'description'       => $validated['description'] ?? null,
                'entry_type'        => $validated['entry_type'],
                'amount'            => $validated['amount'],
                'ref_type'          => $validated['ref_type'],
                'ref_id'            => $validated['ref_id'],
                'pres_id'           => $validated['pres_id'] ?? null,
                'reg_id'            => $validated['reg_id'] ?? null,
                'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                'tazkira_number'    => $resolvedTazkira,
                'user_id'           => Auth::id(),
            ];

            if ($this->journalHasAccountIdColumn() && $resolvedAccountId) {
                $data['account_id'] = $resolvedAccountId;
            }

            if ($patientId && $this->journalHasPatientIdColumn()) {
                $data['patient_id'] = $patientId;
            }

            $journal = Journal::create($data);

            if (!empty($validated['reg_id'])) {
                $this->updateParentJournal($validated['reg_id']);
            }

            LogService::create('create', 'journals', $journal->id, 'Journal created', $journal->toArray());

            DB::commit();

            return response()->json([
                'message' => 'ژورنال با موفقیت ذخیره شد.',
                'journal' => $journal,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', null, 'Error creating journal', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در ذخیره ژورنال', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * ✅ جدید: حل شماره تذکره بر اساس ref_type/ref_id برای ژورنال
     */
    private function resolveTazkiraForJournal(array $validated): ?string
    {
        try {
            $refType = $validated['ref_type'] ?? null;
            $refId   = $validated['ref_id'] ?? null;

            if (!$refType || !$refId) return null;

            // یوزر داینامیک بر اساس نقش
            if ($this->isDynamicUserRoleRef($refType)) {
                return $this->getUserTazkiraNumber((int) $refId);
            }

            // معاشات: اگر حساب مستقیم نداریم، از کاربر یا حساب بگیر
            if (isset(self::SALARY_META[$refType])) {
                if (in_array($refType, [
                    'salary_generation', 'salary_payable',
                    'salary_payment', 'salary_payment_debit',
                ], true)) {
                    $salary = EmployeeSalary::find($refId);
                    if ($salary) {
                        if (!empty($salary->user_id)) {
                            $t = $this->getUserTazkiraNumber((int) $salary->user_id);
                            if (!empty($t)) return $t;
                        }
                        if (!empty($salary->account_id)) {
                            $t = Account::where('id', $salary->account_id)->value('tazkira_number');
                            if (!empty($t)) return (string) $t;
                        }
                    }
                }
                return null;
            }

            // حساب‌محور: از خود حساب بگیر
            if (
                in_array($refType, self::ACCOUNT_REF_TYPES, true)
                || $refType === self::GENERIC_ACCOUNT_REF_TYPE
                || $this->isDynamicAccountRef($refType)
            ) {
                $t = Account::where('id', $refId)->value('tazkira_number');
                if (!empty($t)) return (string) $t;
                return null;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('resolveTazkiraForJournal failed: ' . $e->getMessage());
            return null;
        }
    }

    /* ============================================================
     *  updateParentJournal
     * ============================================================ */
    private function updateParentJournal($regId)
    {
        if (!$regId) return;

        $parentJournal = Journal::where('reg_id', $regId)
            ->whereNull('parent_journal_id')
            ->first();

        if ($parentJournal) {
            $totalDebit = Journal::where('reg_id', $regId)
                ->whereNull('parent_journal_id')
                ->where('entry_type', 'debit')
                ->sum('amount');

            $totalCredit = Journal::where('reg_id', $regId)
                ->whereNull('parent_journal_id')
                ->where('entry_type', 'credit')
                ->sum('amount');

            $netAmount = $totalDebit - $totalCredit;

            $parentJournal->update([
                'amount'      => $netAmount,
                'description' => "مجموع فیس‌های مریض - مجموع: {$netAmount}",
            ]);
        }
    }

    /* ============================================================
     *  destroy
     * ============================================================ */
    public function destroy($id)
    {
        $journal = Journal::find($id);
        if (!$journal) return response()->json(['message' => 'ژورنال یافت نشد.'], 404);

        DB::beginTransaction();

        try {
            $journalData = $journal->toArray();
            $regId = $journal->reg_id;

            if (is_null($journal->parent_journal_id)) {
                Journal::where('parent_journal_id', $journal->id)->delete();
            }

            $journal->delete();

            if ($regId) $this->updateParentJournal($regId);

            LogService::create('delete', 'journals', $journalData['id'], 'Journal deleted', $journalData);
            DB::commit();

            return response()->json(['message' => 'ژورنال با موفقیت حذف شد.']);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', $id, 'Error deleting journal', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در حذف ژورنال.'], 500);
        }
    }

    /* ============================================================
     *  ✅ UPSERT — با نرمال‌سازی تاریخ + استخراج خودکار account_id
     * ============================================================ */
    public function upsert(Request $request, $id = null)
    {
        $validated = $request->validate([
            'journal_date'      => 'required|string',
            'description'       => 'nullable|string|max:1000',
            'entry_type'        => ['required', Rule::in(['debit', 'credit'])],
            'amount'            => 'required|numeric|min:0.01',
            'ref_type'          => 'required|string',
            'ref_id'            => 'required|integer',
            'pres_id'           => 'nullable|integer',
            'reg_id'            => 'nullable|integer',
            'account_id'        => 'nullable|integer|exists:accounts,id',
            'tazkira_number'    => 'nullable|string|max:255',
            'parent_journal_id' => 'nullable|exists:journals,id',
        ]);

        $journalDate = $this->normalizeJournalDate($validated['journal_date']);
        if (!$journalDate) {
            return response()->json([
                'message' => 'تاریخ ژورنال نامعتبر است',
                'received' => $validated['journal_date'],
            ], 422);
        }

        Log::info('Journal upsert — date', [
            'received' => $validated['journal_date'],
            'normalized' => $journalDate,
            'id' => $id,
        ]);

        DB::beginTransaction();

        try {
            $reg = $this->resolveRegistration($validated);
            $patientId = $this->resolvePatientIdFromValidated($validated);
            $hasPatientIdCol = $this->journalHasPatientIdColumn();
            $hasAccountIdCol = $this->journalHasAccountIdColumn();

            $resolvedAccountId = $this->resolveJournalAccountId($validated);
            Log::info('[upsert] resolvedAccountId', [
                'input' => $validated['account_id'] ?? null,
                'resolved' => $resolvedAccountId,
                'ref_type' => $validated['ref_type'],
                'ref_id' => $validated['ref_id'],
            ]);

            // ✅ اگر شماره تذکره ارسال نشده، از منابع بگیر
            $resolvedTazkira = $validated['tazkira_number']
                ?? $reg->tazkira_number
                ?? null;

            if (empty($resolvedTazkira)) {
                $resolvedTazkira = $this->resolveTazkiraForJournal($validated);
            }

            if ($id) {
                $journal = Journal::find($id);
                if (!$journal) {
                    DB::rollBack();
                    return response()->json(['message' => 'ژورنال یافت نشد.'], 404);
                }

                $oldData  = $journal->toArray();
                $oldRegId = $journal->reg_id;
                $newRegId = $validated['reg_id'] ?? null;

                $data = [
                    'journal_date'      => $journalDate,
                    'description'       => $validated['description'] ?? null,
                    'entry_type'        => $validated['entry_type'],
                    'amount'            => $validated['amount'],
                    'ref_type'          => $validated['ref_type'],
                    'ref_id'            => $validated['ref_id'],
                    'pres_id'           => $validated['pres_id'] ?? null,
                    'reg_id'            => $newRegId,
                    'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                    'tazkira_number'    => $resolvedTazkira ?? $journal->tazkira_number,
                    'user_id'           => Auth::id(),
                ];

                if ($hasAccountIdCol && $resolvedAccountId) {
                    $data['account_id'] = $resolvedAccountId;
                }

                if ($hasPatientIdCol && $patientId) {
                    $data['patient_id'] = $patientId;
                }

                $journal->update($data);

                if ($oldRegId && $oldRegId != $newRegId) $this->updateParentJournal($oldRegId);
                if ($newRegId) $this->updateParentJournal($newRegId);

                LogService::create('update', 'journals', $journal->id, 'Journal updated', ['old' => $oldData, 'new' => $journal->toArray()]);
                $message = 'ژورنال با موفقیت آپدیت شد.';
            } else {
                $data = [
                    'journal_date'      => $journalDate,
                    'description'       => $validated['description'] ?? null,
                    'entry_type'        => $validated['entry_type'],
                    'amount'            => $validated['amount'],
                    'ref_type'          => $validated['ref_type'],
                    'ref_id'            => $validated['ref_id'],
                    'pres_id'           => $validated['pres_id'] ?? null,
                    'reg_id'            => $validated['reg_id'] ?? null,
                    'parent_journal_id' => $validated['parent_journal_id'] ?? null,
                    'tazkira_number'    => $resolvedTazkira,
                    'user_id'           => Auth::id(),
                ];

                if ($hasAccountIdCol && $resolvedAccountId) {
                    $data['account_id'] = $resolvedAccountId;
                }

                if ($hasPatientIdCol && $patientId) {
                    $data['patient_id'] = $patientId;
                }

                $journal = Journal::create($data);

                if (!empty($validated['reg_id'])) $this->updateParentJournal($validated['reg_id']);

                LogService::create('create', 'journals', $journal->id, 'Journal created', $journal->toArray());
                $message = 'ژورنال با موفقیت ذخیره شد.';
            }

            DB::commit();

            return response()->json(['message' => $message, 'journal' => $journal], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            LogService::create('error', 'journals', $id, 'Error in journal upsert', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'خطا در عملیات ژورنال', 'error' => $e->getMessage()], 500);
        }
    }

    /* ============================================================
     *  ✅ استخراج خودکار account_id از ورودی ژورنال
     * ============================================================ */
    private function resolveJournalAccountId(array $validated): ?int
    {
        if (!empty($validated['account_id'])) {
            return (int) $validated['account_id'];
        }

        $refType = $validated['ref_type'] ?? null;
        $refId   = $validated['ref_id'] ?? null;

        if (!$refId) return null;

        if (in_array($refType, self::ACCOUNT_REF_TYPES, true)) {
            return (int) $refId;
        }

        if ($refType === self::GENERIC_ACCOUNT_REF_TYPE) {
            return (int) $refId;
        }

        if ($this->isDynamicAccountRef($refType)) {
            return (int) $refId;
        }

        if (in_array($refType, [
            'salary_advance',
            'salary_advance_debit',
            'salary_advance_settlement',
        ], true)) {
            return (int) $refId;
        }

        // ✅ جدید: برای user_role:{role}، حساب salary_info کاربر را برمی‌گردانیم
        if ($this->isDynamicUserRoleRef($refType)) {
            try {
                $info = EmployeeSalaryInfo::where('user_id', $refId)->first();
                if ($info && !empty($info->account_id)) {
                    return (int) $info->account_id;
                }
            } catch (\Throwable $e) {
                Log::warning('resolveJournalAccountId user_role failed: ' . $e->getMessage());
            }
            return null;
        }

        return null;
    }

    /* ============================================================
     *  getPatientJournalSummary
     * ============================================================ */
    public function getPatientJournalSummary($regId)
    {
        $registration = Registrations::where('reg_id', $regId)->first();
        if (!$registration) return response()->json(['message' => 'رجستریشن یافت نشد'], 404);

        $journals = Journal::where('reg_id', $regId)->get();
        $childJournals = $journals->whereNotNull('parent_journal_id');

        $totalDebit  = $childJournals->where('entry_type', 'debit')->sum('amount');
        $totalCredit = $childJournals->where('entry_type', 'credit')->sum('amount');
        $balance = $totalDebit - $totalCredit;

        return response()->json([
            'registration'    => $registration,
            'total_fees'      => $totalDebit,
            'total_payments'  => $totalCredit,
            'balance'         => $balance,
            'journals'        => $journals,
        ]);
    }

    /* ============================================================
     *  resolveRegistration
     * ============================================================ */
    private function resolveRegistration(array $validated): ?Registrations
    {
        if (!empty($validated['reg_id'])) {
            return Registrations::where('reg_id', $validated['reg_id'])->first();
        }

        $skipRegTypes = [
            'sale', 'parchase', 'patient', 'external_prescription',
            self::GENERIC_ACCOUNT_REF_TYPE,
            ...self::ACCOUNT_REF_TYPES,
        ];

        if ($this->isDynamicAccountRef($validated['ref_type'])) {
            return null;
        }

        // ✅ جدید: user_role هم reg_id ندارد
        if ($this->isDynamicUserRoleRef($validated['ref_type'])) {
            return null;
        }

        if (in_array($validated['ref_type'], $skipRegTypes)) {
            return null;
        }

        return Registrations::where('reg_type', $validated['ref_type'])
            ->where('reg_id', $validated['ref_id'])
            ->first();
    }

    /* ============================================================
     *  resolvePatientIdFromValidated
     * ============================================================ */
    private function resolvePatientIdFromValidated(array $validated): ?int
    {
        try {
            if (!empty($validated['reg_id'])) {
                $reg = Registrations::where('reg_id', $validated['reg_id'])->first();
                if ($reg && !empty($reg->patient_id)) {
                    return (int) $reg->patient_id;
                }
            }

            if (!empty($validated['ref_id'])) {
                $reg = Registrations::where('reg_id', $validated['ref_id'])->first();
                if ($reg && !empty($reg->patient_id)) {
                    return (int) $reg->patient_id;
                }

                $patient = Patient::find($validated['ref_id']);
                if ($patient) {
                    return (int) $patient->id;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('resolvePatientIdFromValidated failed: ' . $e->getMessage());
        }

        return null;
    }

    /* ============================================================
     *  journalHasPatientIdColumn / journalHasAccountIdColumn
     * ============================================================ */
    private function journalHasPatientIdColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            try {
                $hasColumn = Schema::hasColumn('journals', 'patient_id');
            } catch (\Throwable $e) {
                $hasColumn = false;
            }
        }
        return $hasColumn;
    }

    private function journalHasAccountIdColumn(): bool
    {
        static $hasColumn = null;
        if ($hasColumn === null) {
            try {
                $hasColumn = Schema::hasColumn('journals', 'account_id');
            } catch (\Throwable $e) {
                $hasColumn = false;
            }
        }
        return $hasColumn;
    }
}