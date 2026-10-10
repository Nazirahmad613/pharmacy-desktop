<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | انواع حساب
    |--------------------------------------------------------------------------
    */

    private array $accountTypes = [
        'asset',
        'liability',
        'equity',
        'income',
        'expense',
        'receivable',
        'payable',
    ];

    /*
    |--------------------------------------------------------------------------
    | دسته‌بندی حساب‌ها
    |--------------------------------------------------------------------------
    */

    private array $categories = [

        'asset' => [
            'cash',
            'bank',
            'medicine_inventory',
            'laboratory_inventory',
            'consumable_inventory',
            'medical_equipment',
            'office_equipment',
            'tools_and_supplies',
            'building',
            'land',
            'vehicle',
            'furniture',
            'prepayments',
            'deposits',
            'other_assets',
        ],

        'liability' => [
            'suppliers',
            'medicine_purchase_payable',
            'equipment_purchase_payable',
            'laboratory_material_payable',
            'salary_payable',
            'tax_payable',
            'loans',
            'bank_loans',
            'contractual_liabilities',
            'other_liabilities',
        ],

        'equity' => [
            'initial_capital',
            'owner_capital',
            'partners_capital',
            'retained_earnings',
            'retained_losses',
            'owner_drawings',
            'other_equity',
        ],

        'income' => [
            'medical_services_income',
            'consultation_income',
            'laboratory_income',
            'radiology_income',
            'operation_income',
            'admission_income',
            'pharmacy_income',
            'goods_sales_income',
            'operation_room_income',
            'other_services_income',
            'non_operating_income',
            'rent_income',
            'customers_income',
            'other_income',
        ],

        'expense' => [
            'salary_expense',
            'rent_expense',
            'electricity_expense',
            'water_expense',
            'internet_expense',
            'telephone_expense',
            'transportation_expense',
            'consumable_material_expense',
            'medical_material_expense',
            'laboratory_material_expense',
            'cleaning_material_expense',
            'repair_expense',
            'medical_equipment_repair_expense',
            'building_repair_expense',
            'fuel_expense',
            'stationery_expense',
            'administrative_expense',
            'marketing_expense',
            'legal_expense',
            'tax_and_duty_expense',
            'insurance_expense',
            'bank_charge_expense',
            'depreciation_expense',
            'other_expense',
        ],

        'receivable' => [
            'insurance_companies',
            'contracting_institutions',
            'companies',
            'corporate_customers',
            'customers',
            'miscellaneous_receivables',
            'other_receivables',
        ],

        'payable' => [
            'medicine_suppliers',
            'medical_equipment_suppliers',
            'laboratory_material_suppliers',
            'consumable_material_suppliers',
            'vendors',
            'contractors',
            'salary_payables',
            'tax_payables',
            'bank_payables',
            'other_creditors',
        ],
    ];


    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $query = Account::query()
            ->with([
                'parent:id,account_code,account_name',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('account_code', 'like', "%{$search}%")
                  ->orWhere('account_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        if ($request->filled('account_category')) {
            $query->where('account_category', $request->account_category);
        }

        if ($request->has('is_active')) {
            $isActive = filter_var(
                $request->is_active,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        $query->orderBy('account_code', 'asc');

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);

        $accounts = $query->paginate($perPage)->appends($request->query());

        return response()->json([
            'success' => true,
            'message' => 'لیست حساب‌ها دریافت شد.',
            'data' => $accounts,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    | ایجاد حساب جدید
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | ✅ لاگ 1: ورودی خام درخواست
        |--------------------------------------------------------------------------
        */

        Log::info('=== [ACCOUNT STORE] شروع ایجاد حساب ===', [
            'all_input' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'user_id' => optional($request->user())->id,
            'ip' => $request->ip(),
        ]);

        try {

            /*
            |--------------------------------------------------------------------------
            | ✅ لاگ 2: شروع Validation
            |--------------------------------------------------------------------------
            */

            Log::info('[ACCOUNT STORE] شروع Validation');

            $validated = $this->validateAccount($request);

            Log::info('[ACCOUNT STORE] Validation موفق', [
                'validated' => $validated,
            ]);

        } catch (ValidationException $e) {

            /*
            |--------------------------------------------------------------------------
            | خطاهای Validation
            |--------------------------------------------------------------------------
            */

            Log::warning('[ACCOUNT STORE] خطای Validation', [
                'errors' => $e->errors(),
                'input' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطاهای اعتبارسنجی',
                'errors' => $e->errors(),
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | ✅ لاگ 3: بررسی Category / Type
        |--------------------------------------------------------------------------
        */

        if (
            !$this->categoryBelongsToType(
                $validated['account_type'],
                $validated['account_category']
            )
        ) {

            Log::warning('[ACCOUNT STORE] دسته‌بندی با نوع مطابقت ندارد', [
                'account_type' => $validated['account_type'],
                'account_category' => $validated['account_category'],
                'allowed_categories' => $this->categories[$validated['account_type']] ?? [],
            ]);

            return response()->json([
                'success' => false,
                'message' => 'دسته‌بندی انتخاب‌شده مربوط به این نوع حساب نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | تعیین ماهیت عادی
        |--------------------------------------------------------------------------
        */

        $validated['normal_balance'] = $this->getNormalBalance($validated['account_type']);

        Log::info('[ACCOUNT STORE] normal_balance تعیین شد', [
            'normal_balance' => $validated['normal_balance'],
        ]);


        /*
        |--------------------------------------------------------------------------
        | ✅ لاگ 4: بررسی حساب مادر
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['parent_id'])) {

            $parent = Account::find($validated['parent_id']);

            if (!$parent) {

                Log::warning('[ACCOUNT STORE] حساب مادر پیدا نشد', [
                    'parent_id' => $validated['parent_id'],
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر پیدا نشد.',
                ], 422);
            }

            if (!$parent->is_active) {

                Log::warning('[ACCOUNT STORE] حساب مادر غیرفعال است', [
                    'parent_id' => $parent->id,
                    'parent_name' => $parent->account_name,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر غیرفعال است.',
                ], 422);
            }

            if ($parent->account_type !== $validated['account_type']) {

                Log::warning('[ACCOUNT STORE] نوع حساب مادر و فرزند یکسان نیست', [
                    'parent_type' => $parent->account_type,
                    'child_type' => $validated['account_type'],
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'نوع حساب باید با نوع حساب مادر یکسان باشد.',
                ], 422);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Opening Balance
        |--------------------------------------------------------------------------
        */

        $this->normalizeOpeningBalance($validated);


        /*
        |--------------------------------------------------------------------------
        | ✅ لاگ 5: داده نهایی قبل از Insert
        |--------------------------------------------------------------------------
        */

        Log::info('[ACCOUNT STORE] داده نهایی برای Insert', [
            'final_data' => $validated,
        ]);


        DB::beginTransaction();

        try {

            $account = Account::create($validated);

            DB::commit();

            Log::info('[ACCOUNT STORE] ✅ حساب با موفقیت ایجاد شد', [
                'account_id' => $account->id,
                'account_code' => $account->account_code,
            ]);

            $account->load('parent:id,account_code,account_name');

            return response()->json([
                'success' => true,
                'message' => 'حساب با موفقیت ایجاد شد.',
                'data' => $account,
            ], 201);

        } catch (\Throwable $e) {

            DB::rollBack();

            /*
            |--------------------------------------------------------------------------
            | ✅ لاگ 6: خطای واقعی با تمام جزئیات
            |--------------------------------------------------------------------------
            */

            Log::error('[ACCOUNT STORE] ❌ خطا در ایجاد حساب', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'code' => $e->getCode(),
                'class' => get_class($e),
                'input' => $validated,
                'sql' => $e instanceof \Illuminate\Database\QueryException
                            ? $e->getSql()
                            : null,
                'bindings' => $e instanceof \Illuminate\Database\QueryException
                            ? $e->getBindings()
                            : null,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'ایجاد حساب با خطا مواجه شد.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'class' => get_class($e),
                'sql' => $e instanceof \Illuminate\Database\QueryException
                            ? $e->getSql()
                            : null,
                'bindings' => $e instanceof \Illuminate\Database\QueryException
                            ? $e->getBindings()
                            : null,
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show($id)
    {
        $account = Account::with([
            'parent:id,account_code,account_name',
            'children:id,
                account_code,
                account_name,
                account_type,
                account_category,
                parent_id,
                is_active,
                allow_transactions',
        ])->find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'حساب مورد نظر پیدا نشد.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'جزئیات حساب دریافت شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, $id)
    {
        Log::info('=== [ACCOUNT UPDATE] شروع ویرایش حساب ===', [
            'account_id' => $id,
            'all_input' => $request->all(),
        ]);

        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'حساب مورد نظر پیدا نشد.',
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | حساب سیستمی
        |--------------------------------------------------------------------------
        */

        if ($account->is_system) {
            $protectedFields = [
                'account_code',
                'account_type',
                'account_category',
                'parent_id',
                'normal_balance',
            ];

            foreach ($protectedFields as $field) {
                if ($request->has($field)) {
                    if ((string) $request->input($field) !== (string) $account->{$field}) {
                        return response()->json([
                            'success' => false,
                            'message' => 'ساختار حساب سیستمی قابل تغییر نیست.',
                        ], 422);
                    }
                }
            }
        }

        try {
            $validated = $this->validateAccount($request, $account->id);
        } catch (ValidationException $e) {
            Log::warning('[ACCOUNT UPDATE] خطای Validation', [
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطاهای اعتبارسنجی',
                'errors' => $e->errors(),
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Category / Type
        |--------------------------------------------------------------------------
        */

        if (!$this->categoryBelongsToType($validated['account_type'], $validated['account_category'])) {
            return response()->json([
                'success' => false,
                'message' => 'دسته‌بندی انتخاب‌شده مربوط به این نوع حساب نیست.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | حساب دارای تراکنش
        |--------------------------------------------------------------------------
        */

        if ($this->hasJournalTransactions($account)) {

            if ($validated['account_type'] !== $account->account_type) {
                return response()->json([
                    'success' => false,
                    'message' => 'حسابی که دارای تراکنش مالی است نمی‌تواند نوع خود را تغییر دهد.',
                ], 422);
            }

            if ($validated['account_category'] !== $account->account_category) {
                return response()->json([
                    'success' => false,
                    'message' => 'حسابی که دارای تراکنش مالی است نمی‌تواند دسته‌بندی خود را تغییر دهد.',
                ], 422);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | جلوگیری از انتخاب خودش به عنوان Parent
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['parent_id']) && (int) $validated['parent_id'] === (int) $account->id) {
            return response()->json([
                'success' => false,
                'message' => 'حساب نمی‌تواند خودش حساب مادر خودش باشد.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | بررسی Parent
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['parent_id'])) {

            $parent = Account::find($validated['parent_id']);

            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر پیدا نشد.',
                ], 422);
            }

            if (!$parent->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر غیرفعال است.',
                ], 422);
            }

            if ($parent->account_type !== $validated['account_type']) {
                return response()->json([
                    'success' => false,
                    'message' => 'نوع حساب فرزند باید با حساب مادر یکسان باشد.',
                ], 422);
            }

            if ($this->isDescendant($parent->id, $account->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'ساختار حساب‌ها نمی‌تواند دارای حلقه باشد.',
                ], 422);
            }
        }

        $validated['normal_balance'] = $this->getNormalBalance($validated['account_type']);

        $this->normalizeOpeningBalance($validated);

        Log::info('[ACCOUNT UPDATE] داده نهایی برای Update', [
            'account_id' => $account->id,
            'data' => $validated,
        ]);

        DB::beginTransaction();

        try {

            $account->update($validated);

            DB::commit();

            Log::info('[ACCOUNT UPDATE] ✅ حساب با موفقیت ویرایش شد', [
                'account_id' => $account->id,
            ]);

            $account->refresh();
            $account->load('parent:id,account_code,account_name');

            return response()->json([
                'success' => true,
                'message' => 'حساب با موفقیت ویرایش شد.',
                'data' => $account,
            ]);

        } catch (\Throwable $e) {

            DB::rollBack();

            Log::error('[ACCOUNT UPDATE] ❌ خطا در ویرایش حساب', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'class' => get_class($e),
                'sql' => $e instanceof \Illuminate\Database\QueryException ? $e->getSql() : null,
                'bindings' => $e instanceof \Illuminate\Database\QueryException ? $e->getBindings() : null,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'ویرایش حساب با خطا مواجه شد.',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'class' => get_class($e),
                'sql' => $e instanceof \Illuminate\Database\QueryException ? $e->getSql() : null,
                'bindings' => $e instanceof \Illuminate\Database\QueryException ? $e->getBindings() : null,
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | TOGGLE STATUS
    |--------------------------------------------------------------------------
    */

    public function toggleStatus($id)
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'حساب مورد نظر پیدا نشد.',
            ], 404);
        }

        if ($account->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'حساب سیستمی را نمی‌توان فعال یا غیرفعال کرد.',
            ], 422);
        }

        if ($account->is_active) {

            $activeChildren = $account->children()->where('is_active', true)->count();

            if ($activeChildren > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'این حساب دارای حساب‌های فرزند فعال است. ابتدا حساب‌های فرزند را غیرفعال کنید.',
                    'active_children' => $activeChildren,
                ], 422);
            }

            $account->is_active = false;
            $account->save();

            Log::info('[ACCOUNT TOGGLE] حساب غیرفعال شد', ['account_id' => $account->id]);

            return response()->json([
                'success' => true,
                'message' => 'حساب با موفقیت غیرفعال شد.',
                'data' => $account,
            ]);
        }

        if ($account->parent_id) {
            $parent = Account::find($account->parent_id);

            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر این حساب پیدا نشد.',
                ], 422);
            }

            if (!$parent->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'ابتدا حساب مادر را فعال کنید.',
                ], 422);
            }
        }

        $account->is_active = true;
        $account->save();

        Log::info('[ACCOUNT TOGGLE] حساب فعال شد', ['account_id' => $account->id]);

        return response()->json([
            'success' => true,
            'message' => 'حساب با موفقیت فعال شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | ACTIVATE / DEACTIVATE
    |--------------------------------------------------------------------------
    */

    public function activate($id)
    {
        return $this->setStatus($id, true);
    }

    public function deactivate($id)
    {
        return $this->setStatus($id, false);
    }


    /*
    |--------------------------------------------------------------------------
    | SET STATUS
    |--------------------------------------------------------------------------
    */

    private function setStatus($id, bool $status)
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'حساب پیدا نشد.',
            ], 404);
        }

        if ($account->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'وضعیت حساب سیستمی قابل تغییر نیست.',
            ], 422);
        }

        if ($status === true) {

            if ($account->parent_id) {
                $parent = Account::find($account->parent_id);

                if (!$parent) {
                    return response()->json([
                        'success' => false,
                        'message' => 'حساب مادر پیدا نشد.',
                    ], 422);
                }

                if (!$parent->is_active) {
                    return response()->json([
                        'success' => false,
                        'message' => 'ابتدا حساب مادر را فعال کنید.',
                    ], 422);
                }
            }

            $account->is_active = true;
            $account->save();

            return response()->json([
                'success' => true,
                'message' => 'حساب فعال شد.',
                'data' => $account,
            ]);
        }

        $activeChildren = $account->children()->where('is_active', true)->count();

        if ($activeChildren > 0) {
            return response()->json([
                'success' => false,
                'message' => 'ابتدا حساب‌های فرزند فعال را غیرفعال کنید.',
            ], 422);
        }

        $account->is_active = false;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'حساب غیرفعال شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'حساب پیدا نشد.',
            ], 404);
        }

        if ($account->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'حساب سیستمی قابل حذف نیست.',
            ], 422);
        }

        if ($account->children()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'این حساب دارای حساب فرزند است و قابل حذف نیست.',
            ], 422);
        }

        if ($this->hasJournalTransactions($account)) {
            return response()->json([
                'success' => false,
                'message' => 'این حساب دارای تراکنش مالی است و قابل حذف نیست. حساب را غیرفعال کنید.',
            ], 422);
        }

        try {
            $account->delete();

            Log::info('[ACCOUNT DESTROY] حساب حذف شد', ['account_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'حساب با موفقیت حذف شد.',
            ]);

        } catch (\Throwable $e) {

            Log::error('[ACCOUNT DESTROY] ❌ خطا در حذف حساب', [
                'account_id' => $id,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'حذف حساب انجام نشد.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PARENTS
    |--------------------------------------------------------------------------
    */

    public function parents(Request $request)
    {
        $query = Account::query()
            ->whereNull('parent_id')
            ->where('is_active', true);

        if ($request->filled('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        if ($request->filled('account_category')) {
            $query->where('account_category', $request->account_category);
        }

        $accounts = $query->orderBy('account_code')->get([
            'id',
            'account_code',
            'account_name',
            'account_type',
            'account_category',
            'normal_balance',
            'allow_transactions',
            'is_control_account',
        ]);

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | TRANSACTION ACCOUNTS
    |--------------------------------------------------------------------------
    */

    public function transactionAccounts(Request $request)
    {
        $query = Account::query()
            ->where('is_active', true)
            ->where('allow_transactions', true);

        if ($request->filled('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        if ($request->filled('account_category')) {
            $query->where('account_category', $request->account_category);
        }

        $accounts = $query->orderBy('account_code')->get([
            'id',
            'account_code',
            'account_name',
            'account_type',
            'account_category',
            'normal_balance',
            'currency',
        ]);

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | CUSTOMERS
    |--------------------------------------------------------------------------
    */

    public function customers(Request $request)
    {
        $query = Account::query()->where('account_category', 'customers');

        if ($request->has('is_active')) {
            $isActive = filter_var(
                $request->is_active,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('account_code', 'like', "%{$search}%")
                  ->orWhere('account_name', 'like', "%{$search}%");
            });
        }

        $accounts = $query
            ->with('parent:id,account_code,account_name')
            ->orderBy('account_code')
            ->get([
                'id',
                'account_code',
                'account_name',
                'account_type',
                'account_category',
                'parent_id',
                'normal_balance',
                'currency',
                'opening_balance',
                'opening_balance_type',
                'is_active',
                'allow_transactions',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'لیست حساب‌های مشتریان دریافت شد.',
            'data' => $accounts,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | CUSTOMERS INCOME
    |--------------------------------------------------------------------------
    */

    public function customersIncome(Request $request)
    {
        $query = Account::query()->where('account_category', 'customers_income');

        if ($request->has('is_active')) {
            $isActive = filter_var(
                $request->is_active,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        $accounts = $query
            ->with('parent:id,account_code,account_name')
            ->orderBy('account_code')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'لیست حساب‌های درآمد از مشتریان دریافت شد.',
            'data' => $accounts,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | CATEGORIES
    |--------------------------------------------------------------------------
    */

    public function categories($accountType)
    {
        if (!array_key_exists($accountType, $this->categories)) {
            return response()->json([
                'success' => false,
                'message' => 'نوع حساب نامعتبر است.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $this->categories[$accountType],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | TYPES
    |--------------------------------------------------------------------------
    */

    public function types()
    {
        return response()->json([
            'success' => true,
            'data' => $this->accountTypes,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    public function summary()
    {
        $total = Account::count();
        $active = Account::where('is_active', true)->count();
        $inactive = Account::where('is_active', false)->count();
        $system = Account::where('is_system', true)->count();

        $byType = Account::select('account_type', DB::raw('COUNT(*) as total'))
            ->groupBy('account_type')
            ->get();

        $customersCount = Account::where('account_category', 'customers')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'system' => $system,
                'customers' => $customersCount,
                'by_type' => $byType,
            ],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE ACCOUNT
    |--------------------------------------------------------------------------
    */

    private function validateAccount(Request $request, ?int $accountId = null): array
    {
        return $request->validate([

            'account_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('accounts', 'account_code')->ignore($accountId),
            ],

            'account_name' => [
                'required',
                'string',
                'max:200',
            ],

            'account_type' => [
                'required',
                Rule::in($this->accountTypes),
            ],

            'account_category' => [
                'required',
                'string',
            ],

            'parent_id' => [
                'nullable',
                'integer',
                'exists:accounts,id',
            ],

            'opening_balance' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'opening_balance_type' => [
                'nullable',
                Rule::in(['debit', 'credit']),
            ],

            'currency' => [
                'required',
                Rule::in(['AFN', 'USD', 'EUR', 'PKR', 'IRR', 'AED']),
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'is_system' => [
                'sometimes',
                'boolean',
            ],

            'allow_transactions' => [
                'sometimes',
                'boolean',
            ],

            'is_control_account' => [
                'sometimes',
                'boolean',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | CATEGORY BELONGS TO TYPE
    |--------------------------------------------------------------------------
    */

    private function categoryBelongsToType(string $type, string $category): bool
    {
        return in_array($category, $this->categories[$type] ?? [], true);
    }


    /*
    |--------------------------------------------------------------------------
    | NORMAL BALANCE
    |--------------------------------------------------------------------------
    */

    private function getNormalBalance(string $accountType): string
    {
        return match ($accountType) {

            'asset',
            'expense',
            'receivable'
                => 'debit',

            'liability',
            'equity',
            'income',
            'payable'
                => 'credit',

            default
                => 'debit',
        };
    }


    /*
    |--------------------------------------------------------------------------
    | OPENING BALANCE
    |--------------------------------------------------------------------------
    */

    private function normalizeOpeningBalance(array &$data): void
    {
        $balance = (float) ($data['opening_balance'] ?? 0);

        if ($balance <= 0) {
            $data['opening_balance'] = 0;
            $data['opening_balance_type'] = null;
            return;
        }

        if (empty($data['opening_balance_type'])) {
            $data['opening_balance_type'] = $data['normal_balance'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | HAS JOURNAL TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    private function hasJournalTransactions(Account $account): bool
    {
        if (method_exists($account, 'journals')) {
            return $account->journals()->exists();
        }

        if (DB::getSchemaBuilder()->hasTable('journals')) {
            return DB::table('journals')->where('account_id', $account->id)->exists();
        }

        return false;
    }


    /*
    |--------------------------------------------------------------------------
    | IS DESCENDANT
    |--------------------------------------------------------------------------
    */

    private function isDescendant(int $potentialParentId, int $accountId): bool
    {
        $current = Account::find($potentialParentId);
        $visited = [];

        while ($current) {

            if (in_array($current->id, $visited)) {
                return true;
            }

            $visited[] = $current->id;

            if ((int) $current->id === (int) $accountId) {
                return true;
            }

            if (!$current->parent_id) {
                break;
            }

            $current = Account::find($current->parent_id);
        }

        return false;
    }
};