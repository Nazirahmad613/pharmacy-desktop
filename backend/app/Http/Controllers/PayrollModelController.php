<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmployeeSalaryInfo;
use App\Models\EmployeeSalary;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\User;
use App\Models\Account;
use App\Models\Journal;
use App\Services\PayrollJournalService;

class PayrollModelController extends Controller
{
    protected PayrollJournalService $journalService;

    /**
     * ✅ ref_type های مربوط به پیش‌پرداخت معاش در ژورنال
     */
    private const ADVANCE_CREDIT_REF_TYPES = [
        'salary_advance',
        'salary_advance_debit',
    ];

    private const ADVANCE_SETTLEMENT_REF_TYPES = [
        'salary_advance_settlement',
    ];

    private array $typeLabels = [
        'asset'      => 'دارایی',
        'liability'  => 'بدهی',
        'equity'     => 'سرمایه',
        'income'     => 'درآمد',
        'expense'    => 'هزینه',
        'receivable' => 'مطالبات',
        'payable'    => 'بدهی‌ها',
        'employee'   => 'کارمندان',
    ];

    private array $categoryLabels = [
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

    public function __construct(PayrollJournalService $journalService)
    {
        $this->journalService = $journalService;
    }

    // ============================================================
    // 🔧 کمکی: برچسب‌ها
    // ============================================================
    private function typeLabel(?string $type): ?string
    {
        return $type ? ($this->typeLabels[$type] ?? $type) : null;
    }

    private function categoryLabel(?string $category): ?string
    {
        return $category ? ($this->categoryLabels[$category] ?? $category) : null;
    }

    private function resolveDepartmentLabel($user, $account): string
    {
        if ($user && $user->department) {
            return $user->department->name ?? '—';
        }
        if ($account) {
            $label = $this->categoryLabel($account->account_category ?? null);
            if ($label) return $label;
            return $account->account_code ?? '—';
        }
        return '—';
    }

    private function accountFields($account): array
    {
        $accType     = $account->account_type     ?? null;
        $accCategory = $account->account_category ?? null;

        return [
            'tazkiraNumber'        => $account->tazkira_number ?? null,
            'accountType'          => $accType,
            'accountCategory'      => $accCategory,
            'accountTypeLabel'     => $this->typeLabel($accType),
            'accountCategoryLabel' => $this->categoryLabel($accCategory),
        ];
    }

    // ============================================================
    // 🧮 هسته‌ی محاسبه پیش‌پرداخت — از ژورنال حساب کارمند
    // ============================================================

    /**
     * ✅ پیدا کردن account_id کارمند
     */
       private function resolveEmployeeAccountId(?int $userId, ?int $accountId): ?int
    {
        // 1) اگر account_id مستقیم
        if (!empty($accountId)) {
            return (int) $accountId;
        }

        if (empty($userId)) {
            return null;
        }

        // 2) از salary_info
        $info = EmployeeSalaryInfo::where('user_id', $userId)->first();
        if ($info && !empty($info->account_id)) {
            return (int) $info->account_id;
        }

        // 3) از employee_salaries (fallback)
        try {
            $salary = EmployeeSalary::where('user_id', $userId)
                ->whereNotNull('account_id')
                ->orderBy('id', 'desc')
                ->first();
            if ($salary && !empty($salary->account_id)) {
                return (int) $salary->account_id;
            }
        } catch (\Throwable $e) {
            Log::warning('resolveEmployeeAccountId fallback failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * ✅ محاسبه مانده پیش‌پرداخت از ژورنال حساب کارمند
     *
     * ✅ تغییر مهم: اگر $upToDate = null → همه ژورنال‌ها (بدون فیلتر تاریخ)
     * اگر بخواهید تا تاریخ خاصی فیلتر کنید، $upToDate را مقدار بدهید.
     */
     /**
     * ✅ محاسبه مانده پیش‌پرداخت از ژورنال حساب کارمند
     *
     * منطق:
     *   - هر credit روی حساب کارمند (به جز ژورنال‌های معاش) = پیش‌پرداخت
     *   - هر debit روی حساب کارمند (به جز ژورنال‌های معاش) = کاهش پیش‌پرداخت
     *   - مانده = مجموع credit − مجموع debit
     *
     * ژورنال‌های معاش (تولید، پرداخت، تسویه) نادیده گرفته می‌شوند
     * چون خودشان بخشی از چرخه‌ی معاش هستند و باعث دوبار محاسبه می‌شوند.
     */
     /**
     * ✅ محاسبه مانده پیش‌پرداخت از ژورنال حساب کارمند
     *
     * منطق:
     *   - هر credit روی حساب کارمند (به جز ژورنال‌های معاش) = پیش‌پرداخت
     *   - هر debit روی حساب کارمند (به جز ژورنال‌های معاش) = کاهش پیش‌پرداخت
     *   - مانده = مجموع credit − مجموع debit
     *
     * ⚠️ اگر account_id ژورنال NULL بود ولی ref_id حساب کارمند است،
     *    از COALESCE(account_id, ref_id) استفاده می‌کنیم.
     */
       /**
     * ✅ محاسبه مانده پیش‌پرداخت از ژورنال حساب کارمند
     *
     * منطق:
     *   - هر credit روی حساب کارمند (به جز معاش) = پیش‌پرداخت
     *   - هر debit روی حساب کارمند (به جز معاش) = کاهش پیش‌پرداخت
     *   - مانده = مجموع credit − مجموع debit
     *
     * ⚠️ این نسخه چند مسیر را برای پیدا کردن حساب چک می‌کند:
     *   1) account_id مستقیم روی ژورنال
     *   2) ref_id = account_id کارمند (اگر account_id ژورنال NULL بود)
     *   3) هر ژورنالی که user_id آن با userId کارمند یکسان است
     *   4) هر ژورنالی که ref_id آن با userId کارمند یکسان است
     */
    private function calcAdvanceDeduction(
        ?int $userId,
        ?int $accountId,
        ?string $upToDate = null
    ): float {
        // ✅ جمع‌آوری همه شناسه‌های مرتبط با این کارمند
        $accountIds   = [];
        $userIds      = [];

        if (!empty($accountId)) {
            $accountIds[] = (int) $accountId;
        }

        if (!empty($userId)) {
            $userIds[] = (int) $userId;

            // از salary_info
            $info = EmployeeSalaryInfo::where('user_id', $userId)->first();
            if ($info && !empty($info->account_id)) {
                $accountIds[] = (int) $info->account_id;
            }

            // از employee_salaries (همه)
            $salaryAccountIds = EmployeeSalary::where('user_id', $userId)
                ->whereNotNull('account_id')
                ->pluck('account_id')
                ->unique()
                ->filter()
                ->values()
                ->all();
            foreach ($salaryAccountIds as $aid) {
                $accountIds[] = (int) $aid;
            }
        }

        $accountIds = array_values(array_unique(array_filter($accountIds)));
        $userIds    = array_values(array_unique(array_filter($userIds)));

        Log::info('[calcAdvanceDeduction] START', [
            'userId' => $userId,
            'accountId' => $accountId,
            'accountIds' => $accountIds,
            'userIds' => $userIds,
        ]);

        if (empty($accountIds) && empty($userIds)) {
            Log::warning('[calcAdvanceDeduction] هیچ حساب/کاربری پیدا نشد');
            return 0.0;
        }

        // ✅ ref_type هایی که نادیده گرفته می‌شوند
        $excludedRefTypes = [
            'salary_generation',
            'salary_payable',
            'salary_payment',
            'salary_payment_debit',
        ];

        // ✅ تابع کمکی برای ساخت شرط شناسایی ژورنال کارمند
        $matchEmployee = function ($q) use ($accountIds, $userIds) {
            $q->where(function ($q2) use ($accountIds, $userIds) {
                // مسیر ۱: account_id روی ژورنال با یکی از حساب‌های کارمند
                if (!empty($accountIds)) {
                    $q2->whereIn('account_id', $accountIds);
                }

                // مسیر ۲: ref_id = یکی از حساب‌های کارمند (اگر account_id NULL بود)
                if (!empty($accountIds)) {
                    $q2->orWhere(function ($q3) use ($accountIds) {
                        $q3->whereNull('account_id')
                           ->whereIn('ref_id', $accountIds);
                    });
                }

                // مسیر ۳: user_id ژورنال = userId کارمند
                if (!empty($userIds)) {
                    $q2->orWhereIn('user_id', $userIds);
                }

                // مسیر ۴: ref_id = userId (بعضی از createAdvance قدیمی)
                if (!empty($userIds)) {
                    $q2->orWhere(function ($q3) use ($userIds) {
                        $q3->whereIn('ref_id', $userIds)
                           ->whereIn('ref_type', [
                               'salary_advance',
                               'salary_advance_debit',
                           ]);
                    });
                }
            });
        };

        // ✅ مرحله ۱: مجموع credit
        $creditQuery = DB::table('journals')
            ->where('entry_type', 'credit')
            ->whereNotIn('ref_type', $excludedRefTypes)
            ->where($matchEmployee);

        if (!empty($upToDate)) {
            $creditQuery->whereRaw('REPLACE(journal_date, "-", "/") <= ?', [$upToDate]);
        }

        $totalCredit = (float) $creditQuery->sum('amount');

        // ✅ مرحله ۲: مجموع debit
        $debitQuery = DB::table('journals')
            ->where('entry_type', 'debit')
            ->whereNotIn('ref_type', $excludedRefTypes)
            ->where($matchEmployee);

        if (!empty($upToDate)) {
            $debitQuery->whereRaw('REPLACE(journal_date, "-", "/") <= ?', [$upToDate]);
        }

        $totalDebit = (float) $debitQuery->sum('amount');

        $remaining = max(0, round($totalCredit - $totalDebit, 2));

        Log::info('[calcAdvanceDeduction] RESULT', [
            'accountIds' => $accountIds,
            'userIds' => $userIds,
            'totalCredit' => $totalCredit,
            'totalDebit' => $totalDebit,
            'remaining' => $remaining,
        ]);

        return $remaining;
    }
    
    public function getEmployeeAdvanceBalances(Request $request)
    {
        try {
            $month = $request->query('month');
            $year  = $request->query('year');

            if (!$month || !$year) {
                return response()->json([
                    'success' => false,
                    'message' => 'ماه و سال الزامی است',
                ], 400);
            }

            $period = PayrollPeriod::findOrCreate($month, $year);

            // ✅ حذف فیلتر تاریخ — همه ژورنال‌ها
            $salaries = EmployeeSalary::where('period_id', $period->id)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->get();

            $balances = [];
            foreach ($salaries as $s) {
                $balance = $this->calcAdvanceDeduction(
                    $s->user_id,
                    $s->account_id,
                    null // همه ژورنال‌ها
                );
                $balances[] = [
                    'salaryId'  => $s->id,
                    'userId'    => $s->user_id,
                    'accountId' => $s->account_id,
                    'balance'   => $balance,
                ];
            }

            return response()->json([
                'success'  => true,
                'period'   => [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ],
                'balances' => $balances,
            ]);
        } catch (\Throwable $e) {
            Log::error('getEmployeeAdvanceBalances: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ✅ دیباگ: بررسی دقیق وضعیت پیش‌پرداخت یک کارمند
     */
    public function debugAdvance(Request $request)
    {
        try {
            $userId    = $request->query('userId');
            $accountId = $request->query('accountId');
            $salaryId  = $request->query('salaryId');

            // اگر salaryId داده شد، از آن استفاده کن
            if ($salaryId) {
                $salary = EmployeeSalary::find($salaryId);
                if ($salary) {
                    $userId    = $salary->user_id;
                    $accountId = $salary->account_id;
                }
            }

            $employeeAccountId = $this->resolveEmployeeAccountId(
                $userId ? (int) $userId : null,
                $accountId ? (int) $accountId : null
            );

            if (!$employeeAccountId) {
                return response()->json([
                    'success' => false,
                    'message' => 'حساب کارمند یافت نشد',
                    'userId'  => $userId,
                    'accountId' => $accountId,
                    'hint'    => 'این کارمند در employee_salary_info.account_id حساب ندارد. ابتدا یک حساب به او اختصاص دهید.',
                ], 404);
            }

            // همه ژورنال‌های مرتبط
            $journals = DB::table('journals')
                ->where('account_id', $employeeAccountId)
                ->whereIn('ref_type', array_merge(
                    self::ADVANCE_CREDIT_REF_TYPES,
                    self::ADVANCE_SETTLEMENT_REF_TYPES
                ))
                ->orderBy('journal_date')
                ->get();

            // مجموع‌ها
            $row = DB::table('journals')
                ->where('account_id', $employeeAccountId)
                ->whereIn('ref_type', array_merge(
                    self::ADVANCE_CREDIT_REF_TYPES,
                    self::ADVANCE_SETTLEMENT_REF_TYPES
                ))
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN entry_type = "credit" THEN amount ELSE 0 END), 0) AS total_credit,
                    COALESCE(SUM(CASE WHEN entry_type = "debit"  THEN amount ELSE 0 END), 0) AS total_debit
                ')
                ->first();

            $credit = (float) ($row->total_credit ?? 0);
            $debit  = (float) ($row->total_debit  ?? 0);

            return response()->json([
                'success' => true,
                'employeeAccountId' => $employeeAccountId,
                'advance_credit_types' => self::ADVANCE_CREDIT_REF_TYPES,
                'advance_settlement_types' => self::ADVANCE_SETTLEMENT_REF_TYPES,
                'journals_count' => count($journals),
                'journals' => $journals,
                'total_credit' => $credit,
                'total_debit'  => $debit,
                'balance'      => max(0, round($credit - $debit, 2)),
                'today' => now()->toDateString(),
            ]);
        } catch (\Throwable $e) {
            Log::error('debugAdvance: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ✅ بازمحاسبه‌ی پیش‌پرداخت برای همه معاش‌های «پرداخت‌نشده» یک دوره
     * ✅ تغییر مهم: بدون فیلتر تاریخ — همه ژورنال‌های پیش‌پرداخت جمع می‌شوند.
     */
    private function recalcAdvanceDeductionsForPeriod(PayrollPeriod $period): int
    {
        $salaries = EmployeeSalary::where('period_id', $period->id)
            ->whereIn('payment_status', ['pending', 'partial'])
            ->get();

        $changed = 0;

        foreach ($salaries as $salary) {
            // ✅ null → بدون فیلتر تاریخ
            $newAdvance = $this->calcAdvanceDeduction(
                $salary->user_id,
                $salary->account_id,
                null
            );

            $oldAdvance = (float) $salary->advance_deduction;

            if (abs($newAdvance - $oldAdvance) < 0.005) {
                continue;
            }

            $gross = (float) ($salary->gross_salary
                ?? ((float) $salary->base_salary + (float) $salary->allowances));
            $tax   = (float) ($salary->tax_amount ?? 0);
            $ins   = (float) ($salary->insurance_amount ?? 0);
            $ded   = (float) ($salary->deductions ?? 0);

            $newNet = round($gross - $ded - $tax - $ins - $newAdvance, 2);

            $salary->update([
                'advance_deduction' => $newAdvance,
                'net_salary'        => $newNet,
            ]);

            try {
                $this->journalService->deleteSalaryJournals($salary->id);
                $this->journalService->recordSalaryGeneration($salary->fresh());
            } catch (\Throwable $je) {
                Log::warning('recalcAdvanceDeductionsForPeriod journal error: ' . $je->getMessage());
            }

            $changed++;
        }

        if ($changed > 0) {
            $period->recalcTotals();
        }

        return $changed;
    }

    // ============================================================
    // 📊 DASHBOARD
    // ============================================================
    public function getDashboard(Request $request)
    {
        try {
            $month = $request->query('month');
            $year  = $request->query('year');

            if ($month && $year) {
                $period = PayrollPeriod::firstOrCreate(
                    [
                        'period_month' => trim($month),
                        'period_year'  => trim($year),
                    ],
                    [
                        'status'       => 'open',
                        'total_amount' => 0,
                        'paid_amount'  => 0,
                    ]
                );
            } else {
                $period = PayrollPeriod::orderBy('created_at', 'desc')->first();
            }

            $employeeStats = DB::table('v_active_employees')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('COALESCE(SUM(base_salary + allowances - deductions), 0) as total_salaries')
                ->first();

            $advStats = DB::table('journals')
                ->whereIn('ref_type', array_merge(
                    self::ADVANCE_CREDIT_REF_TYPES,
                    self::ADVANCE_SETTLEMENT_REF_TYPES
                ))
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN entry_type = "credit" THEN amount ELSE 0 END), 0) AS total,
                    COALESCE(SUM(CASE WHEN entry_type = "debit"  THEN amount ELSE 0 END), 0) AS settled
                ')
                ->first();

            $advTotal    = (float) ($advStats->total ?? 0);
            $advSettled  = (float) ($advStats->settled ?? 0);
            $advRemaining = max(0, round($advTotal - $advSettled, 2));

            if ($period) {
                $periodTotal     = (float) $period->total_amount;
                $paidThisMonth   = (float) $period->paid_amount;
                $pendingPayments = max(0, $periodTotal - $paidThisMonth);
                $progress        = $periodTotal > 0
                    ? (int) round(($paidThisMonth / $periodTotal) * 100)
                    : 0;

                $recent = EmployeeSalary::with(['user.department', 'account', 'salaryInfo'])
                    ->where('period_id', $period->id)
                    ->orderBy('updated_at', 'desc')
                    ->limit(5)
                    ->get()
                    ->map(function ($s) {
                        $departmentLabel = $this->resolveDepartmentLabel($s->user, $s->account);
                        $fields = $this->accountFields($s->account);

                        return array_merge([
                            'id'         => $s->id,
                            'name'       => $s->employee_name,
                            'department' => $departmentLabel,
                            'amount'     => (float) $s->net_salary,
                            'date'       => $s->payment_date
                                ? $s->payment_date->format('Y-m-d')
                                : $s->updated_at->format('Y-m-d'),
                            'status'     => $s->payment_status === 'paid'
                                ? 'پرداخت شده'
                                : 'در انتظار',
                        ], $fields);
                    });
            } else {
                $periodTotal     = 0;
                $paidThisMonth   = 0;
                $pendingPayments = 0;
                $progress        = 0;
                $recent          = collect();
            }

            return response()->json([
                'success' => true,
                'period'  => $period ? [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ] : null,
                'stats'   => [
                    'totalEmployees'   => (int) ($employeeStats->total ?? 0),
                    'totalSalaries'    => (float) ($employeeStats->total_salaries ?? 0),
                    'totalAdvances'    => $advTotal,
                    'totalAdvanceSettled' => $advSettled,
                    'totalAdvanceRemaining' => $advRemaining,
                    'paidThisMonth'    => $paidThisMonth,
                    'pendingPayments'  => $pendingPayments,
                    'paymentProgress'  => $progress,
                    'periodTotal'      => $periodTotal,
                ],
                'recentPayments' => $recent,
            ]);
        } catch (\Throwable $e) {
            Log::error('getDashboard: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // 👥 EMPLOYEES
    // ============================================================
    public function getEmployees(Request $request)
    {
        try {
            $search     = $request->query('search');
            $department = $request->query('department');
            $status     = $request->query('status');
            $source     = $request->query('source');

            $query = DB::table('v_active_employees');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('full_name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('account_code', 'like', "%{$search}%")
                      ->orWhere('tazkira_number', 'like', "%{$search}%");
                });
            }

            if ($department && $department !== 'all') {
                $query->where('department_name', $department);
            }

            if ($status && $status !== 'all') {
                $query->where('salary_status', $status);
            }

            if ($source && $source !== 'all') {
                $query->where('source', $source);
            }

            $rows = $query->orderBy('full_name')->get();

            $data = $rows->map(function ($r) {
                $uniqueId = $r->source . '-' . $r->employee_id;

                $sourceLabel = $r->source === 'user'
                    ? ($r->role ?? 'کاربر')
                    : 'طرف‌حساب';

                $accType     = $r->account_type     ?? null;
                $accCategory = $r->account_category ?? null;

                $departmentLabel = $r->source === 'user'
                    ? ($r->department_name ?? '—')
                    : ($this->categoryLabel($accCategory) ?? ($r->account_code ?? '—'));

                return [
                    'id'            => $uniqueId,
                    'employeeId'    => $r->employee_id,
                    'salaryInfoId'  => $r->salary_info_id,
                    'userId'        => $r->source === 'user' ? $r->employee_id : null,
                    'accountId'     => $r->source === 'account' ? $r->employee_id : null,
                    'source'        => $r->source,
                    'sourceLabel'   => $sourceLabel,
                    'fullName'      => $r->full_name,
                    'email'         => $r->email,
                    'department'    => $departmentLabel,
                    'departmentId'  => $r->department_id,
                    'employeeCode'  => $r->employee_code ?? $r->account_code,
                    'baseSalary'    => (float) $r->base_salary,
                    'allowances'    => (float) $r->allowances,
                    'deductions'    => (float) $r->deductions,
                    'bankAccount'   => $r->bank_account_number ?? null,
                    'hireDate'      => $r->hire_date ?? null,
                    'status'        => $r->salary_status === 'active' ? 'فعال' : 'غیرفعال',
                    'statusRaw'     => $r->salary_status,

                    'tazkiraNumber'        => $r->tazkira_number ?? null,
                    'accountType'          => $accType,
                    'accountCategory'      => $accCategory,
                    'accountTypeLabel'     => $this->typeLabel($accType),
                    'accountCategoryLabel' => $this->categoryLabel($accCategory),
                ];
            });

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            Log::error('getEmployees: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getEmployee($id)
    {
        try {
            $info = $this->findSalaryInfo($id);

            if (!$info) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }
            return response()->json([
                'success' => true,
                'data'    => $this->salaryInfoToArray($info),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function createEmployee(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId'       => 'nullable|integer|exists:users,id',
            'accountId'    => 'nullable|integer|exists:accounts,id',
            'baseSalary'   => 'required|numeric|min:0',
            'allowances'   => 'nullable|numeric|min:0',
            'deductions'   => 'nullable|numeric|min:0',
            'bankAccount'  => 'nullable|string|max:100',
            'hireDate'     => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        if (!$request->userId && !$request->accountId) {
            return response()->json([
                'success' => false,
                'message' => 'باید یکی از userId یا accountId ارسال شود',
            ], 422);
        }

        try {
            $exists = $request->userId
                ? EmployeeSalaryInfo::where('user_id', $request->userId)->first()
                : EmployeeSalaryInfo::where('account_id', $request->accountId)->first();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'این کارمند قبلاً اطلاعات معاش دارد',
                ], 409);
            }

            $code = $request->userId
                ? 'EMP-' . str_pad($request->userId, 6, '0', STR_PAD_LEFT)
                : 'ACC-' . str_pad($request->accountId, 6, '0', STR_PAD_LEFT);

            $info = EmployeeSalaryInfo::create([
                'user_id'             => $request->userId ?? null,
                'account_id'          => $request->accountId ?? null,
                'employee_code'       => $code,
                'base_salary'         => $request->baseSalary,
                'allowances'          => $request->allowances ?? 0,
                'deductions'          => $request->deductions ?? 0,
                'bank_account_number' => $request->bankAccount,
                'hire_date'           => $request->hireDate,
                'salary_status'       => 'active',
            ]);

            return response()->json([
                'success' => true,
                'data'    => $this->salaryInfoToArray($info->fresh(['user.department', 'account'])),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('createEmployee: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateEmployee(Request $request, $id)
    {
        try {
            $info = $this->findSalaryInfo($id);

            if (!$info) {
                $parsed = $this->parseEmployeeId($id);

                if (!$parsed['userId'] && !$parsed['accountId']) {
                    return response()->json(['success' => false, 'message' => 'کارمند یافت نشد'], 404);
                }

                $userId    = $request->input('userId')    ?: $parsed['userId'];
                $accountId = $request->input('accountId') ?: $parsed['accountId'];

                if (!$userId && !$accountId) {
                    return response()->json(['success' => false, 'message' => 'کارمند یافت نشد'], 404);
                }

                $code = $userId
                    ? 'EMP-' . str_pad($userId, 6, '0', STR_PAD_LEFT)
                    : 'ACC-' . str_pad($accountId, 6, '0', STR_PAD_LEFT);

                $info = EmployeeSalaryInfo::create([
                    'user_id'       => $userId,
                    'account_id'    => $accountId,
                    'employee_code' => $code,
                    'base_salary'   => 0,
                    'allowances'    => 0,
                    'deductions'    => 0,
                    'salary_status' => 'active',
                ]);
            }

            $validator = Validator::make($request->all(), [
                'baseSalary'  => 'nullable|numeric|min:0',
                'allowances'  => 'nullable|numeric|min:0',
                'deductions'  => 'nullable|numeric|min:0',
                'bankAccount' => 'nullable|string|max:100',
                'hireDate'    => 'nullable|string|max:20',
                'statusRaw'   => 'nullable|in:active,suspended,terminated',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
            }

            $data = [];
            if ($request->has('baseSalary'))  $data['base_salary']         = $request->baseSalary;
            if ($request->has('allowances'))  $data['allowances']          = $request->allowances;
            if ($request->has('deductions'))  $data['deductions']          = $request->deductions;
            if ($request->has('bankAccount')) $data['bank_account_number'] = $request->bankAccount;
            if ($request->has('hireDate'))    $data['hire_date']           = $request->hireDate;
            if ($request->has('statusRaw'))   $data['salary_status']       = $request->statusRaw;

            $info->update($data);

            return response()->json([
                'success' => true,
                'data'    => $this->salaryInfoToArray($info->fresh(['user.department', 'account'])),
            ]);
        } catch (\Throwable $e) {
            Log::error('updateEmployee: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function deleteEmployee($id)
    {
        try {
            $info = $this->findSalaryInfo($id);

            if (!$info) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            $salaryIds = EmployeeSalary::where('salary_info_id', $info->id)->pluck('id')->toArray();
            foreach ($salaryIds as $sid) {
                $this->journalService->deleteSalaryJournals($sid);
            }

            $info->delete();
            return response()->json(['success' => true, 'message' => 'حذف شد']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 💵 SALARIES
    // ============================================================
    public function getSalaries(Request $request)
    {
        try {
            $month      = $request->query('month');
            $year       = $request->query('year');
            $department = $request->query('department');
            $status     = $request->query('status');

            if (!$month || !$year) {
                return response()->json([
                    'success' => false,
                    'message' => 'ماه و سال الزامی است',
                ], 400);
            }

            $period = PayrollPeriod::findOrCreate($month, $year);

            // ✅ بازمحاسبه پیش‌پرداخت — بدون فیلتر تاریخ
            try {
                $this->recalcAdvanceDeductionsForPeriod($period);
            } catch (\Throwable $re) {
                Log::warning('getSalaries recalcAdvance failed: ' . $re->getMessage());
            }

            $query = EmployeeSalary::with(['user.department', 'account', 'salaryInfo'])
                ->where('period_id', $period->id);

            if ($department && $department !== 'all') {
                $query->where(function ($q) use ($department) {
                    $q->whereHas('user.department', function ($qq) use ($department) {
                        $qq->where('name', $department);
                    })
                    ->orWhereHas('account', function ($qq) use ($department) {
                        $qq->where('account_category', $department);
                    });
                });
            }

            if ($status && $status !== 'all') {
                $query->where('payment_status', $status);
            }

            $rows = $query->get()->map(fn($s) => $this->salaryToArray($s));

            return response()->json([
                'success' => true,
                'period'  => [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ],
                'data' => $rows,
            ]);
        } catch (\Throwable $e) {
            Log::error('getSalaries: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function generateSalaries(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'month' => 'required|string',
            'year'  => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $period = PayrollPeriod::findOrCreate($request->month, $request->year);

            $employees = DB::table('v_active_employees')
                ->where('salary_status', 'active')
                ->where(function ($q) use ($period) {
                    $q->where(function ($q2) use ($period) {
                        $q2->where('source', 'user')
                           ->whereNotExists(function ($sub) use ($period) {
                               $sub->select(DB::raw(1))
                                   ->from('employee_salaries')
                                   ->whereColumn('employee_salaries.user_id', 'v_active_employees.employee_id')
                                   ->where('employee_salaries.period_id', $period->id);
                           });
                    })->orWhere(function ($q2) use ($period) {
                        $q2->where('source', 'account')
                           ->whereNotExists(function ($sub) use ($period) {
                               $sub->select(DB::raw(1))
                                   ->from('employee_salaries')
                                   ->whereColumn('employee_salaries.account_id', 'v_active_employees.employee_id')
                                   ->where('employee_salaries.period_id', $period->id);
                           });
                    });
                })
                ->get();

            $settings  = PayrollSetting::asObject();
            $taxRate   = (float) ($settings['taxRate'] ?? 0);
            $insRate   = (float) ($settings['insuranceRate'] ?? 0);
            $enableTax = (bool)  ($settings['enableTax'] ?? false);
            $enableIns = (bool)  ($settings['enableInsurance'] ?? false);

            $inserted = 0;

            foreach ($employees as $emp) {
                $base  = (float) $emp->base_salary;
                $allow = (float) $emp->allowances;
                $ded   = (float) $emp->deductions;
                $gross = $base + $allow;

                $rawTax       = round($gross * $taxRate / 100, 2);
                $rawInsurance = round($gross * $insRate / 100, 2);

                $taxForNet       = $enableTax ? $rawTax       : 0;
                $insuranceForNet = $enableIns ? $rawInsurance : 0;

                // ✅ پیش‌پرداخت از ژورنال — بدون فیلتر تاریخ
                $advanceDeduction = $this->calcAdvanceDeduction(
                    $emp->source === 'user'    ? (int) $emp->employee_id : null,
                    $emp->source === 'account' ? (int) $emp->employee_id : null,
                    null
                );

                $net = round($gross - $ded - $taxForNet - $insuranceForNet - $advanceDeduction, 2);

                $salary = EmployeeSalary::create([
                    'user_id'           => $emp->source === 'user'    ? $emp->employee_id : null,
                    'account_id'        => $emp->source === 'account' ? $emp->employee_id : null,
                    'period_id'         => $period->id,
                    'salary_info_id'    => $emp->salary_info_id,
                    'base_salary'       => $base,
                    'allowances'        => $allow,
                    'deductions'        => $ded,
                    'gross_salary'      => $gross,
                    'tax_amount'        => $rawTax,
                    'insurance_amount'  => $rawInsurance,
                    'advance_deduction' => $advanceDeduction,
                    'net_salary'        => $net,
                    'payment_status'    => 'pending',
                ]);

                $this->journalService->recordSalaryGeneration($salary);

                $inserted++;
            }

            $this->recalcAdvanceDeductionsForPeriod($period);
            $period->recalcTotals();

            DB::commit();

            return response()->json([
                'success'   => true,
                'generated' => $inserted,
                'period'    => [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('generateSalaries: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function paySalariesBulk(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'salaryIds'   => 'required|array|min:1',
            'salaryIds.*' => 'integer|exists:employee_salaries,id',
            'paymentDate' => 'required|date',
            'method'      => 'nullable|in:cash,bank_transfer,cheque',
            'accountId'   => 'nullable|integer|exists:accounts,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $salaryIds   = $request->salaryIds;
            $paymentDate = $request->paymentDate;
            $method      = $request->method ?? 'bank_transfer';
            $accountId   = $request->accountId;

            $salaries = EmployeeSalary::whereIn('id', $salaryIds)
                ->where('payment_status', '!=', 'paid')
                ->get();

            if ($salaries->isEmpty()) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'هیچ معاش قابل پرداختی یافت نشد',
                ], 400);
            }

            $affectedPeriods = [];

            foreach ($salaries as $salary) {
                // ✅ بازخوانی پیش‌پرداخت — بدون فیلتر تاریخ
                $freshAdvance = $this->calcAdvanceDeduction(
                    $salary->user_id,
                    $salary->account_id,
                    null
                );

                if (abs($freshAdvance - (float) $salary->advance_deduction) > 0.005) {
                    $gross = (float) ($salary->gross_salary
                        ?? ((float) $salary->base_salary + (float) $salary->allowances));
                    $tax   = (float) ($salary->tax_amount ?? 0);
                    $ins   = (float) ($salary->insurance_amount ?? 0);
                    $ded   = (float) ($salary->deductions ?? 0);

                    $salary->update([
                        'advance_deduction' => $freshAdvance,
                        'net_salary'        => round($gross - $ded - $tax - $ins - $freshAdvance, 2),
                    ]);
                    $salary->refresh();
                }

                $salary->update([
                    'payment_status'       => 'paid',
                    'paid_amount'          => $salary->net_salary,
                    'payment_date'         => $paymentDate,
                    'payment_method'       => $method,
                    'paid_from_account_id' => $accountId,
                    'receipt_number'       => 'RCP-' . str_pad($salary->id, 8, '0', STR_PAD_LEFT),
                    'updated_by'           => $request->user()?->id,
                ]);

                $this->journalService->recordSalaryPayment($salary->fresh(), $paymentDate, $accountId);

                if ((float) $salary->advance_deduction > 0) {
                    $employeeAccountId = $this->resolveEmployeeAccountId(
                        $salary->user_id,
                        $salary->account_id
                    );

                    if ($employeeAccountId) {
                        try {
                            $this->journalService->recordAdvanceSettlement(
                                $salary->fresh(),
                                $paymentDate,
                                $employeeAccountId
                            );
                        } catch (\Throwable $je) {
                            Log::warning('recordAdvanceSettlement failed for salary #' . $salary->id . ': ' . $je->getMessage());
                        }
                    } else {
                        Log::warning("پیش‌پرداخت کسر شد اما حساب کارمند یافت نشد. salary #{$salary->id}");
                    }
                }

                $affectedPeriods[$salary->period_id] = true;
            }

            foreach (array_keys($affectedPeriods) as $pid) {
                PayrollPeriod::find($pid)?->recalcTotals();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'paid'    => $salaries->count(),
                'message' => '✅ پرداخت معاش با موفقیت ثبت شد',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('paySalariesBulk: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 📉 ADVANCES — بر اساس ژورنال
    // ============================================================

    public function getAdvances(Request $request)
    {
        try {
            $status = $request->query('status');
            $search = $request->query('search');

            $query = Journal::query()
                ->with(['account', 'user'])
                ->whereIn('ref_type', self::ADVANCE_CREDIT_REF_TYPES)
                ->orderBy('journal_date', 'desc')
                ->orderBy('id', 'desc');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhereHas('account', function ($qq) use ($search) {
                          $qq->where('account_name', 'like', "%{$search}%")
                             ->orWhere('account_code', 'like', "%{$search}%");
                      });
                });
            }

            $journals = $query->limit(1000)->get();

            $rows = $journals->map(function ($j) {
                $acc = $j->account;
                $accId = $j->account_id;
                $balance = 0.0;

                if ($accId) {
                    $row = DB::table('journals')
                        ->where('account_id', $accId)
                        ->whereIn('ref_type', array_merge(
                            self::ADVANCE_CREDIT_REF_TYPES,
                            self::ADVANCE_SETTLEMENT_REF_TYPES
                        ))
                        ->selectRaw('
                            COALESCE(SUM(CASE WHEN entry_type = "credit" THEN amount ELSE 0 END), 0) AS total_credit,
                            COALESCE(SUM(CASE WHEN entry_type = "debit"  THEN amount ELSE 0 END), 0) AS total_debit
                        ')
                        ->first();

                    $balance = max(0, (float) ($row->total_credit ?? 0) - (float) ($row->total_debit ?? 0));
                }

                return [
                    'id'              => $j->id,
                    'employee'        => $acc?->account_name ?? '—',
                    'employeeId'      => $j->account_id,
                    'accountId'       => $j->account_id,
                    'userId'          => null,
                    'source'          => 'account',
                    'sourceLabel'     => 'حساب',
                    'department'      => $this->categoryLabel($acc?->account_category),
                    'amount'          => (float) $j->amount,
                    'reason'          => $j->description,
                    'date'            => $j->journal_date,
                    'requestDate'     => $j->journal_date,
                    'targetMonth'     => null,
                    'targetYear'      => null,
                    'approvalDate'    => $j->journal_date,
                    'status'          => 'ثبت شده',
                    'statusRaw'       => 'approved',
                    'repaid'          => 0,
                    'repaidAmount'    => 0,
                    'remaining'       => $balance,
                    'remainingAmount' => $balance,
                    'repaymentMonths' => 1,
                    'monthlyDeduction'=> (float) $j->amount,
                    'accountCode'     => $acc?->account_code,
                    'tazkiraNumber'   => $acc?->tazkira_number,
                    'accountCategoryLabel' => $this->categoryLabel($acc?->account_category),
                ];
            });

            $statsRow = DB::table('journals')
                ->whereIn('ref_type', array_merge(
                    self::ADVANCE_CREDIT_REF_TYPES,
                    self::ADVANCE_SETTLEMENT_REF_TYPES
                ))
                ->selectRaw('
                    COALESCE(SUM(CASE WHEN entry_type = "credit" THEN amount ELSE 0 END), 0) AS total,
                    COALESCE(SUM(CASE WHEN entry_type = "debit"  THEN amount ELSE 0 END), 0) AS settled
                ')
                ->first();

            $total   = (float) ($statsRow->total ?? 0);
            $settled = (float) ($statsRow->settled ?? 0);

            return response()->json([
                'success' => true,
                'data'    => $rows,
                'stats'   => [
                    'totalAdvances' => $total,
                    'totalRepaid'   => $settled,
                    'remaining'     => max(0, round($total - $settled, 2)),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('getAdvances: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function createAdvance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employeeId'      => 'nullable',
            'userId'          => 'nullable|integer|exists:users,id',
            'accountId'       => 'nullable|integer|exists:accounts,id',
            'employee'        => 'nullable|string',
            'amount'          => 'required|numeric|min:1',
            'reason'          => 'nullable|string',
            'date'            => 'nullable|date',
            'targetMonth'     => 'required|string|max:20',
            'targetYear'      => 'required|string|max:10',
            'repaymentMonths' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $userId    = $request->userId;
            $accountId = $request->accountId;

            if (!$userId && !$accountId && $request->employeeId) {
                $employeeId = $request->employeeId;

                if (is_string($employeeId) && str_starts_with($employeeId, 'user-')) {
                    $userId = (int) substr($employeeId, 5);
                } elseif (is_string($employeeId) && str_starts_with($employeeId, 'account-')) {
                    $accountId = (int) substr($employeeId, 8);
                } elseif (is_numeric($employeeId)) {
                    $isUser = User::where('id', $employeeId)->exists();
                    if ($isUser) {
                        $userId = (int) $employeeId;
                    } else {
                        $isAccount = Account::where('id', $employeeId)->exists();
                        if ($isAccount) {
                            $accountId = (int) $employeeId;
                        }
                    }
                }
            }

            if (!$userId && !$accountId && $request->employee) {
                $user = User::where('name', $request->employee)
                    ->orWhere('full_name', $request->employee)
                    ->first();
                if ($user) {
                    $userId = $user->id;
                } else {
                    $acc = Account::where('account_name', $request->employee)->first();
                    if ($acc) $accountId = $acc->id;
                }
            }

            $employeeAccountId = $this->resolveEmployeeAccountId($userId, $accountId);

            if (!$employeeAccountId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'برای این کارمند حساب تعریف نشده است. ابتدا در صفحه حساب‌ها یک حساب به کارمند اختصاص دهید.',
                ], 422);
            }

            $amount      = (float) $request->amount;
            $requestDate = $request->date ?: now()->toDateString();
            $description = $request->reason ?: 'پیش‌پرداخت معاش';

            $journal = Journal::create([
                'journal_date'   => $requestDate,
                'description'    => $description,
                'entry_type'     => 'credit',
                'amount'         => $amount,
                'ref_type'       => 'salary_advance',
                'ref_id'         => $employeeAccountId,
                'account_id'     => $employeeAccountId,
                'user_id'        => $request->user()?->id,
                'tazkira_number' => optional(Account::find($employeeAccountId))->tazkira_number,
            ]);

            try {
                $period = PayrollPeriod::where('period_month', trim($request->targetMonth))
                    ->where('period_year', trim($request->targetYear))
                    ->first();

                if ($period) {
                    $this->recalcAdvanceDeductionsForPeriod($period);
                }
            } catch (\Throwable $re) {
                Log::warning('createAdvance recalc failed: ' . $re->getMessage());
            }

            DB::commit();

            $account = Account::find($employeeAccountId);

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'              => $journal->id,
                    'employee'        => $account?->account_name ?? '—',
                    'employeeId'      => $employeeAccountId,
                    'userId'          => $userId,
                    'accountId'       => $employeeAccountId,
                    'source'          => 'account',
                    'sourceLabel'     => 'حساب',
                    'department'      => $this->categoryLabel($account?->account_category),
                    'amount'          => $amount,
                    'reason'          => $description,
                    'date'            => $requestDate,
                    'requestDate'     => $requestDate,
                    'targetMonth'     => $request->targetMonth,
                    'targetYear'      => $request->targetYear,
                    'approvalDate'    => $requestDate,
                    'status'          => 'ثبت شده',
                    'statusRaw'       => 'approved',
                    'repaid'          => 0,
                    'repaidAmount'    => 0,
                    'remaining'       => $amount,
                    'remainingAmount' => $amount,
                    'repaymentMonths' => (int) ($request->repaymentMonths ?? 1),
                    'monthlyDeduction'=> $amount,
                    'accountCode'     => $account?->account_code,
                    'tazkiraNumber'   => $account?->tazkira_number,
                    'accountCategoryLabel' => $this->categoryLabel($account?->account_category),
                ],
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('createAdvance: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function approveAdvance(Request $request, $id)
    {
        try {
            $journal = Journal::whereIn('ref_type', self::ADVANCE_CREDIT_REF_TYPES)
                ->find($id);

            if (!$journal) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            $account = Account::find($journal->account_id);

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'              => $journal->id,
                    'employee'        => $account?->account_name ?? '—',
                    'employeeId'      => $journal->account_id,
                    'accountId'       => $journal->account_id,
                    'source'          => 'account',
                    'sourceLabel'     => 'حساب',
                    'department'      => $this->categoryLabel($account?->account_category),
                    'amount'          => (float) $journal->amount,
                    'reason'          => $journal->description,
                    'date'            => $journal->journal_date,
                    'requestDate'     => $journal->journal_date,
                    'status'          => 'ثبت شده',
                    'statusRaw'       => 'approved',
                    'repaid'          => 0,
                    'repaidAmount'    => 0,
                    'remaining'       => (float) $journal->amount,
                    'remainingAmount' => (float) $journal->amount,
                    'repaymentMonths' => 1,
                    'monthlyDeduction'=> (float) $journal->amount,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function rejectAdvance(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $journal = Journal::whereIn('ref_type', self::ADVANCE_CREDIT_REF_TYPES)
                ->find($id);

            if (!$journal) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            $accountId = $journal->account_id;
            $journal->delete();

            try {
                PayrollPeriod::whereIn('status', ['open', 'processing'])
                    ->get()
                    ->each(fn($p) => $this->recalcAdvanceDeductionsForPeriod($p));
            } catch (\Throwable $re) {
                Log::warning('rejectAdvance recalc failed: ' . $re->getMessage());
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'پیش‌پرداخت حذف شد',
                'data'    => ['accountId' => $accountId],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 📊 REPORTS
    // ============================================================
    public function getReports(Request $request)
    {
        try {
            $month = $request->query('month');
            $year  = $request->query('year');

            if (!$month || !$year) {
                return response()->json([
                    'success' => false,
                    'message' => 'ماه و سال الزامی است',
                ], 400);
            }

            $period = PayrollPeriod::findOrCreate($month, $year);

            try {
                $this->recalcAdvanceDeductionsForPeriod($period);
            } catch (\Throwable $re) {
                Log::warning('getReports recalc failed: ' . $re->getMessage());
            }

            $salaries = EmployeeSalary::with(['user.department', 'account', 'salaryInfo'])
                ->where('period_id', $period->id)
                ->orderByRaw("CASE 
                    WHEN payment_status = 'pending' THEN 1
                    WHEN payment_status = 'partial' THEN 2
                    WHEN payment_status = 'paid' THEN 3
                    ELSE 4
                END")
                ->orderBy('id', 'asc')
                ->get();

            $rows = $salaries->map(fn($s) => $this->salaryToArray($s));

            $totals = [
                'employees'       => $rows->count(),
                'totalBase'       => (float) $rows->sum('baseSalary'),
                'totalAllowances' => (float) $rows->sum('allowances'),
                'totalDeductions' => (float) $rows->sum('deductions'),
                'totalTax'        => (float) $rows->sum('tax'),
                'totalInsurance'  => (float) $rows->sum('insurance'),
                'totalAdvance'    => (float) $rows->sum('advanceDeduction'),
                'totalGross'      => (float) $rows->sum('grossSalary'),
                'totalSalary'     => (float) $rows->sum('netSalary'),
                'paid'            => (float) $rows
                    ->filter(fn($r) => ($r['paymentStatus'] ?? '') === 'paid')
                    ->sum('netSalary'),
                'pending'         => (float) $rows
                    ->filter(fn($r) => ($r['paymentStatus'] ?? '') !== 'paid')
                    ->sum('netSalary'),
                'countPaid'       => $rows->filter(fn($r) => ($r['paymentStatus'] ?? '') === 'paid')->count(),
                'countPending'    => $rows->filter(fn($r) => ($r['paymentStatus'] ?? '') === 'pending')->count(),
                'countPartial'    => $rows->filter(fn($r) => ($r['paymentStatus'] ?? '') === 'partial')->count(),
            ];

            return response()->json([
                'success' => true,
                'data'    => $rows,
                'totals'  => $totals,
                'period'  => [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('getReports: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function getReportPeriods(Request $request)
    {
        try {
            $periods = PayrollPeriod::query()
                ->whereHas('salaries')
                ->orderBy('period_year', 'desc')
                ->orderBy('id', 'desc')
                ->get(['id', 'period_month', 'period_year'])
                ->map(fn($p) => [
                    'id'    => $p->id,
                    'month' => $p->period_month,
                    'year'  => $p->period_year,
                ])
                ->values();

            return response()->json([
                'success' => true,
                'data'    => $periods,
            ]);
        } catch (\Throwable $e) {
            Log::error('getReportPeriods: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // ⚙️ SETTINGS
    // ============================================================
    public function getSettings()
    {
        try {
            return response()->json([
                'success' => true,
                'data'    => PayrollSetting::asObject(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateSettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'currency'          => 'nullable|string|max:10',
            'payDay'            => 'nullable|integer|min:1|max:31',
            'taxRate'           => 'nullable|numeric|min:0|max:100',
            'insuranceRate'     => 'nullable|numeric|min:0|max:100',
            'overtimeRate'      => 'nullable|numeric|min:0',
            'lateDeduction'     => 'nullable|numeric|min:0',
            'absenceDeduction'  => 'nullable|numeric|min:0',
            'enableTax'         => 'nullable|boolean',
            'enableInsurance'   => 'nullable|boolean',
            'enableOvertime'    => 'nullable|boolean',
            'autoPayroll'       => 'nullable|boolean',
            'minSalary'         => 'nullable|numeric|min:0',
            'maxAdvancePercent' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            PayrollSetting::updateMany($request->all());

            return response()->json([
                'success' => true,
                'data'    => PayrollSetting::asObject(),
                'message' => '✅ تنظیمات با موفقیت ذخیره شد',
            ]);
        } catch (\Throwable $e) {
            Log::error('updateSettings: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 🔧 HELPERS
    // ============================================================
    private function parseEmployeeId($id): array
    {
        $userId        = null;
        $accountId     = null;
        $salaryInfoId  = null;

        if (is_string($id) && str_starts_with($id, 'user-')) {
            $userId = (int) substr($id, 5);
        } elseif (is_string($id) && str_starts_with($id, 'account-')) {
            $accountId = (int) substr($id, 8);
        } elseif (is_numeric($id)) {
            $salaryInfoId = (int) $id;
        }

        return [
            'userId'       => $userId,
            'accountId'    => $accountId,
            'salaryInfoId' => $salaryInfoId,
        ];
    }

    private function findSalaryInfo($id): ?EmployeeSalaryInfo
    {
        $parsed = $this->parseEmployeeId($id);

        if ($parsed['userId']) {
            return EmployeeSalaryInfo::with(['user.department', 'account'])
                ->where('user_id', $parsed['userId'])
                ->first();
        }

        if ($parsed['accountId']) {
            return EmployeeSalaryInfo::with(['user.department', 'account'])
                ->where('account_id', $parsed['accountId'])
                ->first();
        }

        if ($parsed['salaryInfoId']) {
            $id = $parsed['salaryInfoId'];

            $info = EmployeeSalaryInfo::with(['user.department', 'account'])->find($id);
            if ($info) return $info;

            $info = EmployeeSalaryInfo::with(['user.department', 'account'])->where('user_id', $id)->first();
            if ($info) return $info;

            $info = EmployeeSalaryInfo::with(['user.department', 'account'])->where('account_id', $id)->first();
            if ($info) return $info;
        }

        return null;
    }

    private function salaryInfoToArray(EmployeeSalaryInfo $info): array
    {
        $fullName = $info->user->name
            ?? $info->account->account_name
            ?? '—';

        $department = $this->resolveDepartmentLabel($info->user, $info->account);

        $sourceLabel = '—';
        if ($info->user_id && $info->user) {
            $sourceLabel = $info->user->role ?? 'کاربر';
        } elseif ($info->account_id && $info->account) {
            $sourceLabel = 'طرف‌حساب';
        }

        $accFields = $this->accountFields($info->account);

        return array_merge([
            'id'            => $info->id,
            'userId'        => $info->user_id,
            'accountId'     => $info->account_id,
            'source'        => $info->user_id ? 'user' : 'account',
            'sourceLabel'   => $sourceLabel,
            'fullName'      => $fullName,
            'department'    => $department,
            'departmentId'  => $info->user->department_id ?? null,
            'employeeCode'  => $info->employee_code,
            'baseSalary'    => (float) $info->base_salary,
            'allowances'    => (float) $info->allowances,
            'deductions'    => (float) $info->deductions,
            'bankAccount'   => $info->bank_account_number,
            'hireDate'      => $info->hire_date,
            'status'        => $info->salary_status === 'active' ? 'فعال' : 'غیرفعال',
            'statusRaw'     => $info->salary_status,
        ], $accFields);
    }

    private function salaryToArray(EmployeeSalary $s): array
    {
        $sourceLabel = '—';
        if ($s->user_id && $s->user) {
            $sourceLabel = $s->user->role ?? 'کاربر';
        } elseif ($s->account_id) {
            $sourceLabel = 'طرف‌حساب';
        }

        $gross     = (float) ($s->gross_salary ?? ((float) $s->base_salary + (float) $s->allowances));
        $tax       = (float) ($s->tax_amount ?? 0);
        $insurance = (float) ($s->insurance_amount ?? 0);

        $department = $this->resolveDepartmentLabel($s->user, $s->account);

        $accFields = $this->accountFields($s->account);

        return array_merge([
            'id'               => $s->id,
            'source'           => $s->employee_source,
            'sourceLabel'      => $sourceLabel,
            'userId'           => $s->user_id,
            'accountId'        => $s->account_id,
            'fullName'         => $s->employee_name,
            'department'       => $department,
            'employeeCode'     => $s->salaryInfo->employee_code
                ?? $s->account->account_code
                ?? null,
            'baseSalary'       => (float) $s->base_salary,
            'allowances'       => (float) $s->allowances,
            'deductions'       => (float) $s->deductions,
            'advanceDeduction' => (float) $s->advance_deduction,
            'insurance'        => $insurance,
            'tax'              => $tax,
            'grossSalary'      => $gross,
            'netSalary'        => (float) $s->net_salary,
            'paidAmount'       => (float) $s->paid_amount,
            'remaining'        => $s->remaining_amount,
            'paymentStatus'    => $s->payment_status,
            'paymentDate'      => $s->payment_date?->format('Y-m-d'),
            'paymentMethod'    => $s->payment_method,
            'receiptNumber'    => $s->receipt_number,
            'notes'            => $s->notes,
        ], $accFields);
    }
}