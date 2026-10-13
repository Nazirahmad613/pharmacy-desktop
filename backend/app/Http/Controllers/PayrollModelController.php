<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

use App\Models\PayrollModel;
use App\Models\EmployeeSalary;
use App\Models\PayrollPeriod;
use App\Models\SalaryAdvance;
use App\Models\PayrollSetting;
use App\Models\User;

class PayrollModelController extends Controller
{
    // ============================================================
    // 📊 DASHBOARD
    // GET /api/payroll/dashboard
    // مطابق PayrollDashboard.jsx
    // ============================================================
    public function getDashboard(Request $request)
    {
        try {
            // 1) آمار کارمندان فعال (از users)
            $employeeStats = DB::table('v_active_employees')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('COALESCE(SUM(base_salary + allowances - deductions), 0) as total_salaries')
                ->first();

            // 2) آخرین دوره
            $period = PayrollPeriod::orderBy('created_at', 'desc')->first();

            // 3) آمار پیش‌پرداخت‌ها
            $advStats = DB::table('salary_advances')
                ->whereIn('status', ['pending', 'approved', 'partially_repaid'])
                ->selectRaw('COALESCE(SUM(amount), 0) as total')
                ->selectRaw('COALESCE(SUM(repaid_amount), 0) as repaid')
                ->selectRaw('COALESCE(SUM(remaining_amount), 0) as remaining')
                ->first();

            $totalSalaries   = (float) ($employeeStats->total_salaries ?? 0);
            $paidThisMonth   = $period ? (float) $period->paid_amount : 0;
            $periodTotal     = $period ? (float) $period->total_amount : 0;
            $pendingPayments = max(0, $periodTotal - $paidThisMonth);
            $progress        = $periodTotal > 0
                ? (int) round(($paidThisMonth / $periodTotal) * 100)
                : 0;

            // 4) آخرین پرداخت‌ها
            $recent = EmployeeSalary::with(['user.department'])
                ->orderBy('updated_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($s) {
                    return [
                        'id'         => $s->id,
                        'name'       => $s->user->full_name ?? $s->user->name ?? '—',
                        'department' => $s->user->department->name ?? '—',
                        'amount'     => (float) $s->net_salary,
                        'date'       => $s->payment_date
                            ? $s->payment_date->format('Y-m-d')
                            : $s->updated_at->format('Y-m-d'),
                        'status'     => $s->payment_status === 'paid'
                            ? 'پرداخت شده'
                            : 'در انتظار',
                    ];
                });

            return response()->json([
                'success' => true,
                'stats'   => [
                    'totalEmployees'   => (int) ($employeeStats->total ?? 0),
                    'totalSalaries'    => $totalSalaries,
                    'paidThisMonth'    => $paidThisMonth,
                    'pendingPayments'  => $pendingPayments,
                    'totalAdvances'    => (float) ($advStats->total ?? 0),
                    'paymentProgress'  => $progress,
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
    // 👥 EMPLOYEES — از جدول users
    // ============================================================

    /**
     * GET /api/payroll/employees?search=&department=&status=
     * مطابق EmployeeSalaries.jsx
     */
    public function getEmployees(Request $request)
    {
        try {
            $search     = $request->query('search');
            $department = $request->query('department');
            $status     = $request->query('status');

            $query = DB::table('v_active_employees');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('full_name', 'like', "%{$search}%")
                      ->orWhere('username', 'like', "%{$search}%");
                });
            }

            if ($department && $department !== 'all') {
                $query->where('department_name', $department);
            }

            if ($status && $status !== 'all') {
                $query->where('salary_status', $status);
            }

            $rows = $query->orderBy('full_name')->get();

            $data = $rows->map(function ($r) {
                return [
                    'id'            => $r->salary_info_id,
                    'userId'        => $r->user_id,
                    'fullName'      => $r->full_name,
                    'department'    => $r->department_name,
                    'departmentId'  => $r->department_id,
                    'position'      => '',
                    'employeeCode'  => $r->employee_code,
                    'baseSalary'    => (float) $r->base_salary,
                    'allowances'    => (float) $r->allowances,
                    'deductions'    => (float) $r->deductions,
                    'bankAccount'   => $r->bank_account_number,
                    'hireDate'      => $r->hire_date,
                    'status'        => $r->salary_status === 'active' ? 'فعال' : 'غیرفعال',
                    'statusRaw'     => $r->salary_status,
                ];
            });

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            Log::error('getEmployees: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/payroll/employees/{id}
     */
    public function getEmployee($id)
    {
        try {
            $info = PayrollModel::with('user.department')->find($id);
            if (!$info) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }
            return response()->json(['success' => true, 'data' => $info->toFrontendArray()]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/payroll/employees
     * افزودن اطلاعات معاش برای یک کاربر موجود
     */
    public function createEmployee(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userId'       => 'required|integer|exists:users,id',
            'baseSalary'   => 'required|numeric|min:0',
            'allowances'   => 'nullable|numeric|min:0',
            'deductions'   => 'nullable|numeric|min:0',
            'bankAccount'  => 'nullable|string|max:100',
            'hireDate'     => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            // جلوگیری از تکرار
            $exists = PayrollModel::where('user_id', $request->userId)->first();
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'این کاربر قبلاً اطلاعات معاش دارد',
                ], 409);
            }

            $code = 'EMP-' . str_pad($request->userId, 6, '0', STR_PAD_LEFT);

            $info = PayrollModel::create([
                'user_id'             => $request->userId,
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
                'data'    => $info->fresh('user.department')->toFrontendArray(),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('createEmployee: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/payroll/employees/{id}
     */
    public function updateEmployee(Request $request, $id)
    {
        $info = PayrollModel::find($id);
        if (!$info) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
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

        try {
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
                'data'    => $info->fresh('user.department')->toFrontendArray(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/payroll/employees/{id}
     */
    public function deleteEmployee($id)
    {
        try {
            $info = PayrollModel::find($id);
            if (!$info) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }
            $info->delete();
            return response()->json(['success' => true, 'message' => 'حذف شد']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 💵 SALARIES — مطابق SalaryPayment.jsx
    // ============================================================

    /**
     * GET /api/payroll/salaries?month=&year=&department=&status=
     */
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

            $query = EmployeeSalary::with(['user.department'])
                ->where('period_id', $period->id);

            if ($department && $department !== 'all') {
                $query->whereHas('user.department', function ($q) use ($department) {
                    $q->where('name', $department);
                });
            }

            if ($status && $status !== 'all') {
                $query->where('payment_status', $status);
            }

            $rows = $query->get()->map->toFrontendArray();

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

    /**
     * POST /api/payroll/salaries/generate
     * تولید معاشات یک دوره برای تمام کارمندان فعال
     */
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

            // کارمندان فعال بدون معاش در این دوره
            $employees = DB::table('v_active_employees')
                ->where('salary_status', 'active')
                ->whereNotExists(function ($q) use ($period) {
                    $q->select(DB::raw(1))
                      ->from('employee_salaries')
                      ->whereColumn('employee_salaries.user_id', 'v_active_employees.user_id')
                      ->where('employee_salaries.period_id', $period->id);
                })
                ->get();

            $settings     = PayrollSetting::asObject();
            $taxRate      = (float) ($settings['taxRate'] ?? 0);
            $insRate      = (float) ($settings['insuranceRate'] ?? 0);
            $enableTax    = (bool)  ($settings['enableTax'] ?? false);
            $enableIns    = (bool)  ($settings['enableInsurance'] ?? false);

            $inserted = 0;

            foreach ($employees as $emp) {
                $base  = (float) $emp->base_salary;
                $allow = (float) $emp->allowances;
                $ded   = (float) $emp->deductions;
                $gross = $base + $allow;

                $tax       = $enableTax ? ($gross * $taxRate / 100) : 0;
                $insurance = $enableIns ? ($gross * $insRate / 100) : 0;

                // پیش‌پرداخت‌های تأییدشده
                $advanceDeduction = (float) DB::table('salary_advances')
                    ->where('user_id', $emp->user_id)
                    ->whereIn('status', ['approved', 'partially_repaid'])
                    ->sum('monthly_deduction');

                $net = $gross - $ded - $tax - $insurance - $advanceDeduction;

                EmployeeSalary::create([
                    'user_id'           => $emp->user_id,
                    'period_id'         => $period->id,
                    'salary_info_id'    => $emp->salary_info_id,
                    'base_salary'       => $base,
                    'allowances'        => $allow,
                    'deductions'        => $ded,
                    'advance_deduction' => $advanceDeduction,
                    'net_salary'        => $net,
                    'payment_status'    => 'pending',
                ]);

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

    /**
     * POST /api/payroll/salaries/pay-bulk
     * مطابق handlePayment در SalaryPayment.jsx
     */
    public function paySalariesBulk(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'salaryIds'   => 'required|array|min:1',
            'salaryIds.*' => 'integer|exists:employee_salaries,id',
            'paymentDate' => 'required|date',
            'method'      => 'nullable|in:cash,bank_transfer,cheque',
            'accountId'   => 'nullable|integer',
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
                // 1) به‌روزرسانی وضعیت
                $salary->update([
                    'payment_status'     => 'paid',
                    'payment_date'       => $paymentDate,
                    'payment_method'     => $method,
                    'payment_account_id' => $accountId,
                    'receipt_number'     => 'RCP-' . str_pad($salary->id, 8, '0', STR_PAD_LEFT),
                ]);

                // 2) به‌روزرسانی پیش‌پرداخت‌ها
                if ($salary->advance_deduction > 0) {
                    $remaining = (float) $salary->advance_deduction;

                    $advances = SalaryAdvance::where('user_id', $salary->user_id)
                        ->whereIn('status', ['approved', 'partially_repaid'])
                        ->orderBy('created_at', 'asc')
                        ->get();

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

            // 3) به‌روزرسانی totals
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
    // 📉 ADVANCES — مطابق SalaryAdvances.jsx
    // ============================================================

    /**
     * GET /api/payroll/advances?status=
     */
    public function getAdvances(Request $request)
    {
        try {
            $status = $request->query('status');

            $query = SalaryAdvance::with(['user.department'])->orderBy('created_at', 'desc');

            if ($status && $status !== 'all') {
                $query->where('status', $status);
            }

            $rows = $query->get()->map->toFrontendArray();

            // آمار
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

    /**
     * POST /api/payroll/advances
     */
    public function createAdvance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employeeId'      => 'nullable|integer|exists:users,id',
            'employee'        => 'nullable|string',
            'amount'          => 'required|numeric|min:1',
            'reason'          => 'nullable|string',
            'date'            => 'nullable|string|max:20',
            'repaymentMonths' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $userId = $request->employeeId;

            if (!$userId && $request->employee) {
                $user = User::where('full_name', $request->employee)
                    ->orWhere('name', $request->employee)
                    ->first();
                if (!$user) {
                    return response()->json(['success' => false, 'message' => 'کارمند یافت نشد'], 404);
                }
                $userId = $user->id;
            }

            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'employeeId الزامی است'], 422);
            }

            $amount   = (float) $request->amount;
            $months   = (int) ($request->repaymentMonths ?? 1);
            $monthly  = $amount / $months;

            $advance = SalaryAdvance::create([
                'user_id'           => $userId,
                'amount'            => $amount,
                'reason'            => $request->reason,
                'request_date'      => $request->date,
                'status'            => 'pending',
                'remaining_amount'  => $amount,
                'repayment_months'  => $months,
                'monthly_deduction' => $monthly,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $advance->fresh('user.department')->toFrontendArray(),
            ], 201);
        } catch (\Throwable $e) {
            Log::error('createAdvance: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api/payroll/advances/{id}/approve
     */
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
                    'data'    => $advance->fresh('user.department')->toFrontendArray(),
                ]);
            }

            $advance->update([
                'status'        => 'approved',
                'approval_date' => now()->toDateString(),
                'approved_by'   => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => true,
                'data'    => $advance->fresh('user.department')->toFrontendArray(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api/payroll/advances/{id}/reject
     */
    public function rejectAdvance(Request $request, $id)
    {
        try {
            $advance = SalaryAdvance::find($id);
            if (!$advance) {
                return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
            }

            $advance->update(['status' => 'rejected']);

            return response()->json([
                'success' => true,
                'data'    => $advance->fresh('user.department')->toFrontendArray(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // 📊 REPORTS — مطابق PayrollReports.jsx
    // ============================================================

    /**
     * GET /api/payroll/reports?month=&year=
     */
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

            $rows = DB::table('departments as d')
                ->leftJoin('users as u', function ($join) {
                    $join->on('u.department_id', '=', 'd.id')
                         ->where('u.is_active', '=', 1);
                })
                ->leftJoin('employee_salaries as s', function ($join) use ($period) {
                    $join->on('s.user_id', '=', 'u.id')
                         ->where('s.period_id', '=', $period->id);
                })
                ->groupBy('d.id', 'd.name')
                ->orderBy('d.name')
                ->selectRaw('
                    d.name as department,
                    COUNT(DISTINCT u.id) as employees,
                    COALESCE(SUM(s.net_salary), 0) as total_salary,
                    COALESCE(SUM(CASE WHEN s.payment_status = "paid" THEN s.net_salary ELSE 0 END), 0) as paid,
                    COALESCE(SUM(CASE WHEN s.payment_status != "paid" THEN s.net_salary ELSE 0 END), 0) as pending
                ')
                ->get()
                ->map(function ($r) {
                    return [
                        'department'  => $r->department,
                        'employees'   => (int) $r->employees,
                        'totalSalary' => (float) $r->total_salary,
                        'paid'        => (float) $r->paid,
                        'pending'     => (float) $r->pending,
                    ];
                });

            return response()->json([
                'success' => true,
                'data'    => $rows,
                'period'  => [
                    'id'    => $period->id,
                    'month' => $period->period_month,
                    'year'  => $period->period_year,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('getReports: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    // ⚙️ SETTINGS — مطابق SalarySettings.jsx
    // ============================================================

    /**
     * GET /api/payroll/settings
     */
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

    /**
     * PUT /api/payroll/settings
     */
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
            $data = PayrollSetting::updateMany($request->all());

            return response()->json([
                'success' => true,
                'data'    => $data,
                'message' => '✅ تنظیمات با موفقیت ذخیره شد',
            ]);
        } catch (\Throwable $e) {
            Log::error('updateSettings: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}