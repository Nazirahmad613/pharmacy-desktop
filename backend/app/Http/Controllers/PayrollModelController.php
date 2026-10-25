<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\EmployeeSalaryInfo;
use App\Models\EmployeeSalary;
use App\Models\PayrollPeriod;
use App\Models\SalaryAdvance;
use App\Models\PayrollSetting;
use App\Models\User;
use App\Models\Account;
use App\Services\PayrollJournalService;

class PayrollModelController extends Controller
{
    protected PayrollJournalService $journalService;

    /*
    |--------------------------------------------------------------------------
    | ✅ برچسب‌های فارسی نوعیت و دسته‌بندی حساب
    |--------------------------------------------------------------------------
    */

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
        // Asset
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

        // Liability
        'suppliers' => 'تأمین‌کنندگان',
        'medicine_purchase_payable' => 'بدهی خرید ادویه',
        'equipment_purchase_payable' => 'بدهی خرید تجهیزات',
        'laboratory_material_payable' => 'بدهی مواد لابراتوار',
        'salary_payable' => 'بدهی معاشات',
        'tax_payable' => 'بدهی مالیه',
        'loans' => 'قرض‌ها', 'bank_loans' => 'قرض بانکی',
        'contractual_liabilities' => 'تعهدات قراردادی',
        'other_liabilities' => 'سایر بدهی‌ها',

        // Equity
        'initial_capital' => 'سرمایه اولیه',
        'owner_capital' => 'سرمایه مالک',
        'partners_capital' => 'سرمایه شرکا',
        'retained_earnings' => 'سود انباشته',
        'retained_losses' => 'ضرر انباشته',
        'owner_drawings' => 'برداشت مالک',
        'other_equity' => 'سایر سرمایه',

        // Income
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

        // Expense
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

        // Receivable
        'insurance_companies' => 'شرکت‌های بیمه',
        'contracting_institutions' => 'مؤسسات قراردادی',
        'companies' => 'شرکت‌ها',
        'corporate_customers' => 'مشتریان شرکتی',
        'customers' => 'مشتریان',
        'miscellaneous_receivables' => 'مطالبات متفرقه',
        'other_receivables' => 'سایر مطالبات',

        // Payable
        'medicine_suppliers' => 'تأمین‌کنندگان ادویه',
        'medical_equipment_suppliers' => 'تأمین‌کنندگان تجهیزات طبی',
        'laboratory_material_suppliers' => 'تأمین‌کنندگان مواد لابراتوار',
        'consumable_material_suppliers' => 'تأمین‌کنندگان مواد مصرفی',
        'vendors' => 'فروشندگان', 'contractors' => 'پیمانکاران',
        'salary_payables' => 'معاشات قابل پرداخت',
        'tax_payables' => 'مالیات قابل پرداخت',
        'bank_payables' => 'بدهی بانکی',
        'other_creditors' => 'سایر طلبکاران',

        // ✅ Employee - رسمی
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

        // ✅ Employee - قراردادی
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

        // ✅ Employee - کارگرها
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

    /**
     * ✅ محاسبه «بخش» برای نمایش در جدول
     * - برای user: department.name
     * - برای account: categoryLabel (مثلاً «کارمند رادیولوژی»)
     * - اگر هیچ‌کدام: '—'
     */
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

    /**
     * ✅ خروجی استاندارد فیلدهای «حساب» (تذکره، نوع، دسته، برچسب‌ها)
     */
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
    // 📊 DASHBOARD (✅ اصلاح‌شده برای فیلتر ماه/سال)
    // ============================================================
    public function getDashboard(Request $request)
    {
        try {
            /*
            |--------------------------------------------------------------------------
            | ✅ 1) تعیین دوره بر اساس ماه/سال ارسالی از فرانت
            |--------------------------------------------------------------------------
            */
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

            /*
            |--------------------------------------------------------------------------
            | ✅ 2) آمار کلی کارمندان
            |--------------------------------------------------------------------------
            */
            $employeeStats = DB::table('v_active_employees')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('COALESCE(SUM(base_salary + allowances - deductions), 0) as total_salaries')
                ->first();

            /*
            |--------------------------------------------------------------------------
            | ✅ 3) آمار کلی پیش‌پرداخت‌ها
            |--------------------------------------------------------------------------
            */
            $advStats = DB::table('salary_advances')
                ->whereIn('status', ['pending', 'approved', 'partially_repaid'])
                ->selectRaw('COALESCE(SUM(amount), 0) as total')
                ->selectRaw('COALESCE(SUM(repaid_amount), 0) as repaid')
                ->selectRaw('COALESCE(SUM(remaining_amount), 0) as remaining')
                ->first();

            /*
            |--------------------------------------------------------------------------
            | ✅ 4) آمار پرداخت همین دوره
            |--------------------------------------------------------------------------
            */
            if ($period) {
                $periodTotal     = (float) $period->total_amount;
                $paidThisMonth   = (float) $period->paid_amount;
                $pendingPayments = max(0, $periodTotal - $paidThisMonth);
                $progress        = $periodTotal > 0
                    ? (int) round(($paidThisMonth / $periodTotal) * 100)
                    : 0;

                /*
                |--------------------------------------------------------------------------
                | ✅ 5) آخرین پرداخت‌های همین دوره (نه همه)
                |--------------------------------------------------------------------------
                */
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

            /*
            |--------------------------------------------------------------------------
            | ✅ 6) خروجی
            |--------------------------------------------------------------------------
            */
            return response()->json([
                'success' => true,
                'period'  => $period ? [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ] : null,
                'stats'   => [
                    // آمار کلی
                    'totalEmployees'   => (int) ($employeeStats->total ?? 0),
                    'totalSalaries'    => (float) ($employeeStats->total_salaries ?? 0),
                    'totalAdvances'    => (float) ($advStats->total ?? 0),

                    // آمار همین دوره
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
            $requestMonth = trim($request->month);
            $requestYear  = trim($request->year);

            foreach ($employees as $emp) {
                $base  = (float) $emp->base_salary;
                $allow = (float) $emp->allowances;
                $ded   = (float) $emp->deductions;
                $gross = $base + $allow;

                $rawTax       = round($gross * $taxRate / 100, 2);
                $rawInsurance = round($gross * $insRate / 100, 2);

                $taxForNet       = $enableTax ? $rawTax       : 0;
                $insuranceForNet = $enableIns ? $rawInsurance : 0;

                $advanceDeduction = 0;

                $advQuery = SalaryAdvance::whereIn('status', ['approved', 'partially_repaid'])
                    ->where(function ($q) use ($requestMonth, $requestYear) {
                        $q->where(function ($q2) use ($requestMonth, $requestYear) {
                            $q2->whereRaw('TRIM(target_month) = ?', [$requestMonth])
                               ->whereRaw('TRIM(target_year) = ?', [$requestYear]);
                        })
                        ->orWhere(function ($q2) {
                            $q2->whereNull('target_month')
                               ->whereNull('target_year');
                        });
                    });

                if ($emp->source === 'user') {
                    $advQuery->where('user_id', $emp->employee_id);
                } else {
                    $advQuery->where('account_id', $emp->employee_id);
                }

                $advances = $advQuery->get();

                foreach ($advances as $adv) {
                    $advRemaining = (float) $adv->remaining_amount
                        ?: ((float) $adv->amount - (float) $adv->repaid_amount);

                    $monthly = (float) $adv->monthly_deduction;
                    if ($monthly <= 0) {
                        $months  = max(1, (int) $adv->repayment_months);
                        $monthly = $advRemaining / $months;
                    }

                    $advanceDeduction += min($monthly, $advRemaining);
                }

                $advanceDeduction = round($advanceDeduction, 2);
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

                if ($salary->advance_deduction > 0) {
                    $remaining = (float) $salary->advance_deduction;

                    $period = PayrollPeriod::find($salary->period_id);

                    $advQuery = SalaryAdvance::whereIn('status', ['approved', 'partially_repaid'])
                        ->orderBy('created_at', 'asc');

                    if ($period) {
                        $periodMonth = trim($period->period_month);
                        $periodYear  = trim($period->period_year);

                        $advQuery->where(function ($q) use ($periodMonth, $periodYear) {
                            $q->where(function ($q2) use ($periodMonth, $periodYear) {
                                $q2->whereRaw('TRIM(target_month) = ?', [$periodMonth])
                                   ->whereRaw('TRIM(target_year) = ?', [$periodYear]);
                            })
                            ->orWhere(function ($q2) {
                                $q2->whereNull('target_month')
                                   ->whereNull('target_year');
                            });
                        });
                    }

                    if ($salary->user_id) {
                        $advQuery->where('user_id', $salary->user_id);
                    } elseif ($salary->account_id) {
                        $advQuery->where('account_id', $salary->account_id);
                    }

                    $advances = $advQuery->get();

                    foreach ($advances as $adv) {
                        if ($remaining <= 0) break;

                        $advRemaining = (float) $adv->remaining_amount
                            ?: ((float) $adv->amount - (float) $adv->repaid_amount);

                        $deduct = min($remaining, $advRemaining);

                        $newRepaid    = (float) $adv->repaid_amount + $deduct;
                        $newRemaining = (float) $adv->amount - $newRepaid;
                        $newStatus    = $newRemaining <= 0 ? 'repaid' : 'partially_repaid';

                        $adv->update([
                            'repaid_amount'    => $newRepaid,
                            'remaining_amount' => $newRemaining,
                            'status'           => $newStatus,
                        ]);

                        $remaining -= $deduct;
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
    // 📉 ADVANCES
    // ============================================================
    public function getAdvances(Request $request)
    {
        try {
            $status = $request->query('status');

            $query = SalaryAdvance::with(['user.department', 'account'])
                ->orderBy('created_at', 'desc');

            if ($status && $status !== 'all') {
                $query->where('status', $status);
            }

            $rows = $query->get()->map(fn($a) => $this->advanceToArray($a));

            $stats = DB::table('salary_advances')
                ->whereIn('status', ['pending', 'approved', 'partially_repaid'])
                ->selectRaw('COALESCE(SUM(amount), 0) as total')
                ->selectRaw('COALESCE(SUM(repaid_amount), 0) as repaid')
                ->selectRaw('COALESCE(SUM(remaining_amount), 0) as remaining')
                ->first();

            return response()->json([
                'success' => true,
                'data'    => $rows,
                'stats'   => [
                    'totalAdvances' => (float) ($stats->total ?? 0),
                    'totalRepaid'   => (float) ($stats->repaid ?? 0),
                    'remaining'     => (float) ($stats->remaining ?? 0),
                ],
            ]);
        } catch (\Throwable $e) {
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
            'date'            => 'nullable|string|max:20',
            'targetMonth'     => 'required|string|max:20',
            'targetYear'      => 'required|string|max:10',
            'repaymentMonths' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

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

            if (!$userId && !$accountId) {
                return response()->json([
                    'success' => false,
                    'message' => 'کارمند یافت نشد. لطفاً یک کارمند معتبر انتخاب کنید.',
                ], 404);
            }

            if ($userId && !User::where('id', $userId)->exists()) {
                return response()->json(['success' => false, 'message' => 'کاربر یافت نشد'], 404);
            }

            if ($accountId && !Account::where('id', $accountId)->exists()) {
                return response()->json(['success' => false, 'message' => 'طرف‌حساب یافت نشد'], 404);
            }

            $amount  = (float) $request->amount;
            $months  = (int) ($request->repaymentMonths ?? 1);
            $monthly = $months > 0 ? $amount / $months : $amount;

            $requestDate = $request->date ?: now()->toDateString();

            $advance = SalaryAdvance::create([
                'user_id'           => $userId,
                'account_id'        => $accountId,
                'amount'            => $amount,
                'reason'            => $request->reason,
                'request_date'      => $requestDate,
                'target_month'      => trim($request->targetMonth),
                'target_year'       => trim($request->targetYear),
                'status'            => 'pending',
                'repaid_amount'     => 0,
                'remaining_amount'  => $amount,
                'repayment_months'  => $months,
                'monthly_deduction' => $monthly,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $this->advanceToArray($advance->fresh(['user.department', 'account'])),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('createAdvance: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function approveAdvance(Request $request, $id)
    {
        try {
            $advance = SalaryAdvance::find($id);
            if (!$advance) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            if ($advance->status !== 'pending') {
                return response()->json([
                    'success' => true,
                    'data'    => $this->advanceToArray($advance->fresh(['user.department', 'account'])),
                ]);
            }

            DB::beginTransaction();

            $advance->update([
                'status'        => 'approved',
                'approval_date' => now()->toDateString(),
                'approved_by'   => $request->user()->id ?? null,
            ]);

            $this->journalService->recordAdvancePayment(
                $advance->fresh(['user', 'account']),
                now()->toDateString()
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'data'    => $this->advanceToArray($advance->fresh(['user.department', 'account'])),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function rejectAdvance(Request $request, $id)
    {
        try {
            $advance = SalaryAdvance::find($id);
            if (!$advance) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            $this->journalService->deleteAdvanceJournals($advance->id);

            $advance->update(['status' => 'rejected']);

            return response()->json([
                'success' => true,
                'data'    => $this->advanceToArray($advance->fresh(['user.department', 'account'])),
            ]);
        } catch (\Throwable $e) {
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

    private function advanceToArray(SalaryAdvance $a): array
    {
        $statusMap = [
            'pending'          => 'در انتظار',
            'approved'         => 'تأیید شده',
            'rejected'         => 'رد شده',
            'repaid'           => 'بازپرداخت شده',
            'partially_repaid' => 'تأیید شده',
        ];

        $employeeName = $a->user->name
            ?? $a->user->full_name
            ?? $a->account->account_name
            ?? '—';

        $department = $this->resolveDepartmentLabel($a->user, $a->account);

        $sourceLabel = '—';
        if ($a->user_id && $a->user) {
            $sourceLabel = $a->user->role ?? 'کاربر';
        } elseif ($a->account_id) {
            $sourceLabel = 'طرف‌حساب';
        }

        $accFields = $this->accountFields($a->account);

        return array_merge([
            'id'               => $a->id,
            'employee'         => $employeeName,
            'employeeId'       => $a->user_id ?? $a->account_id,
            'userId'           => $a->user_id,
            'accountId'        => $a->account_id,
            'source'           => $a->user_id ? 'user' : 'account',
            'sourceLabel'      => $sourceLabel,
            'department'       => $department,
            'amount'           => (float) $a->amount,
            'reason'           => $a->reason,
            'date'             => $a->request_date,
            'requestDate'      => $a->request_date,
            'targetMonth'      => $a->target_month,
            'targetYear'       => $a->target_year,
            'approvalDate'     => $a->approval_date?->format('Y-m-d'),
            'status'           => $statusMap[$a->status] ?? $a->status,
            'statusRaw'        => $a->status,
            'repaid'           => (float) $a->repaid_amount,
            'repaidAmount'     => (float) $a->repaid_amount,
            'remaining'        => (float) $a->remaining_amount,
            'remainingAmount'  => (float) $a->remaining_amount,
            'repaymentMonths'  => (int) $a->repayment_months,
            'monthlyDeduction' => (float) $a->monthly_deduction,
        ], $accFields);
    }
}