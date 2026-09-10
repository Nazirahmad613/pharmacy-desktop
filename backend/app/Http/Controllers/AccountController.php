<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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
    | لیست حساب‌ها
    |
    | امکانات:
    | - جستجو
    | - فیلتر نوع
    | - فیلتر دسته‌بندی
    | - فیلتر فعال/غیرفعال
    | - Pagination
    | - حساب مادر
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $query = Account::query()
            ->with([
                'parent:id,account_code,account_name',
            ]);

        /*
        |--------------------------------------------------------------------------
        | جستجو
        |--------------------------------------------------------------------------
        */

        if ($request->filled('search')) {

            $search = trim($request->search);

            $query->where(function ($q) use ($search) {

                $q->where(
                    'account_code',
                    'like',
                    "%{$search}%"
                )

                ->orWhere(
                    'account_name',
                    'like',
                    "%{$search}%"
                )

                ->orWhere(
                    'description',
                    'like',
                    "%{$search}%"
                );
            });
        }


        /*
        |--------------------------------------------------------------------------
        | فیلتر نوع حساب
        |--------------------------------------------------------------------------
        */

        if ($request->filled('account_type')) {

            $query->where(
                'account_type',
                $request->account_type
            );
        }


        /*
        |--------------------------------------------------------------------------
        | فیلتر دسته‌بندی
        |--------------------------------------------------------------------------
        */

        if ($request->filled('account_category')) {

            $query->where(
                'account_category',
                $request->account_category
            );
        }


        /*
        |--------------------------------------------------------------------------
        | فیلتر وضعیت
        |--------------------------------------------------------------------------
        */

        if ($request->has('is_active')) {

            $isActive = filter_var(
                $request->is_active,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($isActive !== null) {

                $query->where(
                    'is_active',
                    $isActive
                );
            }
        }


        /*
        |--------------------------------------------------------------------------
        | مرتب‌سازی
        |--------------------------------------------------------------------------
        */

        $query->orderBy(
            'account_code',
            'asc'
        );


        /*
        |--------------------------------------------------------------------------
        | تعداد رکورد
        |--------------------------------------------------------------------------
        */

        $perPage = min(
            max(
                (int) $request->get('per_page', 20),
                1
            ),
            100
        );


        $accounts = $query
            ->paginate($perPage)
            ->appends($request->query());


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
        $validated = $this->validateAccount($request);

        /*
        |--------------------------------------------------------------------------
        | بررسی ارتباط Category با Type
        |--------------------------------------------------------------------------
        */

        if (
            !$this->categoryBelongsToType(
                $validated['account_type'],
                $validated['account_category']
            )
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'دسته‌بندی انتخاب‌شده مربوط به این نوع حساب نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | تعیین ماهیت عادی
        |--------------------------------------------------------------------------
        */

        $validated['normal_balance'] =
            $this->getNormalBalance(
                $validated['account_type']
            );


        /*
        |--------------------------------------------------------------------------
        | بررسی حساب مادر
        |--------------------------------------------------------------------------
        */

        $parent = null;

        if (!empty($validated['parent_id'])) {

            $parent = Account::find(
                $validated['parent_id']
            );

            if (!$parent) {

                return response()->json([
                    'success' => false,
                    'message' => 'حساب مادر پیدا نشد.',
                ], 422);
            }


            if (!$parent->is_active) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حساب مادر غیرفعال است.',
                ], 422);
            }


            /*
            |--------------------------------------------------------------------------
            | نوع حساب مادر و فرزند باید یکسان باشد
            |--------------------------------------------------------------------------
            */

            if (
                $parent->account_type
                !==
                $validated['account_type']
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'نوع حساب باید با نوع حساب مادر یکسان باشد.',
                ], 422);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Opening Balance
        |--------------------------------------------------------------------------
        */

        $this->normalizeOpeningBalance(
            $validated
        );


        DB::beginTransaction();

        try {

            $account = Account::create(
                $validated
            );

            DB::commit();

            $account->load(
                'parent:id,account_code,account_name'
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'حساب با موفقیت ایجاد شد.',
                'data' => $account,
            ], 201);

        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' =>
                    'ایجاد حساب با خطا مواجه شد.',
                'error' =>
                    config('app.debug')
                        ? $e->getMessage()
                        : null,
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    | نمایش جزئیات یک حساب
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
                'message' =>
                    'حساب مورد نظر پیدا نشد.',
            ], 404);
        }


        return response()->json([
            'success' => true,
            'message' =>
                'جزئیات حساب دریافت شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    | ویرایش حساب
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        $id
    ) {

        $account = Account::find($id);


        if (!$account) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب مورد نظر پیدا نشد.',
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

                    if (
                        (string) $request->input($field)
                        !==
                        (string) $account->{$field}
                    ) {

                        return response()->json([
                            'success' => false,
                            'message' =>
                                'ساختار حساب سیستمی قابل تغییر نیست.',
                        ], 422);
                    }
                }
            }
        }


        $validated = $this->validateAccount(
            $request,
            $account->id
        );


        /*
        |--------------------------------------------------------------------------
        | Category / Type
        |--------------------------------------------------------------------------
        */

        if (
            !$this->categoryBelongsToType(
                $validated['account_type'],
                $validated['account_category']
            )
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'دسته‌بندی انتخاب‌شده مربوط به این نوع حساب نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | حساب دارای تراکنش
        |--------------------------------------------------------------------------
        |
        | اگر حساب قبلاً Journal داشته باشد، تغییر نوع آن خطرناک است.
        |--------------------------------------------------------------------------
        */

        if (
            $this->hasJournalTransactions($account)
        ) {

            if (
                $validated['account_type']
                !==
                $account->account_type
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حسابی که دارای تراکنش مالی است نمی‌تواند نوع خود را تغییر دهد.',
                ], 422);
            }

            if (
                $validated['account_category']
                !==
                $account->account_category
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حسابی که دارای تراکنش مالی است نمی‌تواند دسته‌بندی خود را تغییر دهد.',
                ], 422);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | جلوگیری از انتخاب خودش به عنوان Parent
        |--------------------------------------------------------------------------
        */

        if (
            !empty($validated['parent_id'])
            &&
            (int) $validated['parent_id']
            ===
            (int) $account->id
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب نمی‌تواند خودش حساب مادر خودش باشد.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | بررسی Parent
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['parent_id'])) {

            $parent = Account::find(
                $validated['parent_id']
            );


            if (!$parent) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حساب مادر پیدا نشد.',
                ], 422);
            }


            if (!$parent->is_active) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حساب مادر غیرفعال است.',
                ], 422);
            }


            if (
                $parent->account_type
                !==
                $validated['account_type']
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'نوع حساب فرزند باید با حساب مادر یکسان باشد.',
                ], 422);
            }


            /*
            |--------------------------------------------------------------------------
            | جلوگیری از ایجاد حلقه
            |--------------------------------------------------------------------------
            */

            if (
                $this->isDescendant(
                    $parent->id,
                    $account->id
                )
            ) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'ساختار حساب‌ها نمی‌تواند دارای حلقه باشد.',
                ], 422);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Normal Balance
        |--------------------------------------------------------------------------
        */

        $validated['normal_balance'] =
            $this->getNormalBalance(
                $validated['account_type']
            );


        /*
        |--------------------------------------------------------------------------
        | Opening Balance
        |--------------------------------------------------------------------------
        */

        $this->normalizeOpeningBalance(
            $validated
        );


        DB::beginTransaction();

        try {

            $account->update(
                $validated
            );

            DB::commit();

            $account->refresh();

            $account->load(
                'parent:id,account_code,account_name'
            );

            return response()->json([
                'success' => true,
                'message' =>
                    'حساب با موفقیت ویرایش شد.',
                'data' => $account,
            ]);

        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' =>
                    'ویرایش حساب با خطا مواجه شد.',
                'error' =>
                    config('app.debug')
                        ? $e->getMessage()
                        : null,
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | TOGGLE STATUS
    |--------------------------------------------------------------------------
    | فعال / غیرفعال کردن حساب
    |--------------------------------------------------------------------------
    |
    | Frontend:
    |
    | POST /accounts/{id}/toggle-status
    |
    |--------------------------------------------------------------------------
    */

    public function toggleStatus($id)
    {
        $account = Account::find($id);


        if (!$account) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب مورد نظر پیدا نشد.',
            ], 404);
        }


        /*
        |--------------------------------------------------------------------------
        | حساب سیستمی
        |--------------------------------------------------------------------------
        */

        if ($account->is_system) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب سیستمی را نمی‌توان فعال یا غیرفعال کرد.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | اگر حساب فعال است → غیرفعال شود
        |--------------------------------------------------------------------------
        */

        if ($account->is_active) {

            /*
            |--------------------------------------------------------------------------
            | اگر حساب مادر باشد و فرزند فعال داشته باشد
            |--------------------------------------------------------------------------
            */

            $activeChildren =
                $account->children()
                    ->where('is_active', true)
                    ->count();


            if ($activeChildren > 0) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'این حساب دارای حساب‌های فرزند فعال است. ابتدا حساب‌های فرزند را غیرفعال کنید.',
                    'active_children' =>
                        $activeChildren,
                ], 422);
            }


            $account->is_active = false;

            $account->save();


            return response()->json([
                'success' => true,
                'message' =>
                    'حساب با موفقیت غیرفعال شد.',
                'data' => $account,
            ]);
        }


        /*
        |--------------------------------------------------------------------------
        | اگر حساب غیرفعال است → فعال شود
        |--------------------------------------------------------------------------
        */

        if ($account->parent_id) {

            $parent = Account::find(
                $account->parent_id
            );


            if (!$parent) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'حساب مادر این حساب پیدا نشد.',
                ], 422);
            }


            if (!$parent->is_active) {

                return response()->json([
                    'success' => false,
                    'message' =>
                        'ابتدا حساب مادر را فعال کنید.',
                ], 422);
            }
        }


        $account->is_active = true;

        $account->save();


        return response()->json([
            'success' => true,
            'message' =>
                'حساب با موفقیت فعال شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | ACTIVATE
    |--------------------------------------------------------------------------
    | فعال‌سازی مستقیم
    |--------------------------------------------------------------------------
    */

    public function activate($id)
    {
        return $this->setStatus(
            $id,
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | DEACTIVATE
    |--------------------------------------------------------------------------
    | غیرفعال‌سازی مستقیم
    |--------------------------------------------------------------------------
    */

    public function deactivate($id)
    {
        return $this->setStatus(
            $id,
            false
        );
    }


    /*
    |--------------------------------------------------------------------------
    | SET STATUS
    |--------------------------------------------------------------------------
    */

    private function setStatus(
        $id,
        bool $status
    ) {

        $account = Account::find($id);


        if (!$account) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب پیدا نشد.',
            ], 404);
        }


        if ($account->is_system) {

            return response()->json([
                'success' => false,
                'message' =>
                    'وضعیت حساب سیستمی قابل تغییر نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | فعال کردن
        |--------------------------------------------------------------------------
        */

        if ($status === true) {

            if ($account->parent_id) {

                $parent = Account::find(
                    $account->parent_id
                );


                if (!$parent) {

                    return response()->json([
                        'success' => false,
                        'message' =>
                            'حساب مادر پیدا نشد.',
                    ], 422);
                }


                if (!$parent->is_active) {

                    return response()->json([
                        'success' => false,
                        'message' =>
                            'ابتدا حساب مادر را فعال کنید.',
                    ], 422);
                }
            }


            $account->is_active = true;

            $account->save();


            return response()->json([
                'success' => true,
                'message' =>
                    'حساب فعال شد.',
                'data' => $account,
            ]);
        }


        /*
        |--------------------------------------------------------------------------
        | غیرفعال کردن
        |--------------------------------------------------------------------------
        */

        $activeChildren =
            $account->children()
                ->where('is_active', true)
                ->count();


        if ($activeChildren > 0) {

            return response()->json([
                'success' => false,
                'message' =>
                    'ابتدا حساب‌های فرزند فعال را غیرفعال کنید.',
            ], 422);
        }


        $account->is_active = false;

        $account->save();


        return response()->json([
            'success' => true,
            'message' =>
                'حساب غیرفعال شد.',
            'data' => $account,
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    | حذف حساب
    |--------------------------------------------------------------------------
    |
    | حساب دارای Journal هرگز حذف نمی‌شود.
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $account = Account::find($id);


        if (!$account) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب پیدا نشد.',
            ], 404);
        }


        if ($account->is_system) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حساب سیستمی قابل حذف نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | حساب فرزند
        |--------------------------------------------------------------------------
        */

        if (
            $account->children()->exists()
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'این حساب دارای حساب فرزند است و قابل حذف نیست.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | Journal
        |--------------------------------------------------------------------------
        */

        if (
            $this->hasJournalTransactions(
                $account
            )
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'این حساب دارای تراکنش مالی است و قابل حذف نیست. حساب را غیرفعال کنید.',
            ], 422);
        }


        try {

            $account->delete();


            return response()->json([
                'success' => true,
                'message' =>
                    'حساب با موفقیت حذف شد.',
            ]);

        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' =>
                    'حذف حساب انجام نشد.',
                'error' =>
                    config('app.debug')
                        ? $e->getMessage()
                        : null,
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PARENTS
    |--------------------------------------------------------------------------
    | حساب‌های مادر برای Select
    |--------------------------------------------------------------------------
    */

    public function parents(
        Request $request
    ) {

        $query = Account::query()
            ->whereNull('parent_id')
            ->where('is_active', true);


        if ($request->filled('account_type')) {

            $query->where(
                'account_type',
                $request->account_type
            );
        }


        $accounts = $query
            ->orderBy('account_code')
            ->get([
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
    | حساب‌هایی که Journal می‌تواند از آنها استفاده کند
    |--------------------------------------------------------------------------
    */

    public function transactionAccounts(
        Request $request
    ) {

        $query = Account::query()
            ->where('is_active', true)
            ->where('allow_transactions', true);


        if ($request->filled('account_type')) {

            $query->where(
                'account_type',
                $request->account_type
            );
        }


        if ($request->filled('account_category')) {

            $query->where(
                'account_category',
                $request->account_category
            );
        }


        $accounts = $query
            ->orderBy('account_code')
            ->get([
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
    | CATEGORIES
    |--------------------------------------------------------------------------
    | دسته‌بندی‌ها بر اساس نوع حساب
    |--------------------------------------------------------------------------
    */

    public function categories(
        $accountType
    ) {

        if (
            !array_key_exists(
                $accountType,
                $this->categories
            )
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                    'نوع حساب نامعتبر است.',
            ], 422);
        }


        return response()->json([
            'success' => true,
            'data' =>
                $this->categories[$accountType],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | TYPES
    |--------------------------------------------------------------------------
    | انواع حساب
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
    | خلاصه وضعیت حساب‌ها
    |--------------------------------------------------------------------------
    */

    public function summary()
    {
        $total =
            Account::count();

        $active =
            Account::where(
                'is_active',
                true
            )->count();

        $inactive =
            Account::where(
                'is_active',
                false
            )->count();

        $system =
            Account::where(
                'is_system',
                true
            )->count();


        $byType =
            Account::select(
                'account_type',
                DB::raw(
                    'COUNT(*) as total'
                )
            )
            ->groupBy('account_type')
            ->get();


        return response()->json([
            'success' => true,

            'data' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'system' => $system,
                'by_type' => $byType,
            ],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | VALIDATE ACCOUNT
    |--------------------------------------------------------------------------
    */

    private function validateAccount(
        Request $request,
        ?int $accountId = null
    ): array {

        $validated = $request->validate([

            'account_code' => [
                'required',
                'string',
                'max:50',

                Rule::unique(
                    'accounts',
                    'account_code'
                )->ignore($accountId),
            ],

            'account_name' => [
                'required',
                'string',
                'max:200',
            ],

            'account_type' => [
                'required',
                Rule::in(
                    $this->accountTypes
                ),
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
                Rule::in([
                    'debit',
                    'credit',
                ]),
            ],

            'currency' => [
                'required',
                Rule::in([
                    'AFN',
                    'USD',
                    'EUR',
                    'PKR',
                    'IRR',
                    'AED',
                ]),
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


        return $validated;
    }


    /*
    |--------------------------------------------------------------------------
    | CATEGORY BELONGS TO TYPE
    |--------------------------------------------------------------------------
    */

    private function categoryBelongsToType(
        string $type,
        string $category
    ): bool {

        return in_array(
            $category,
            $this->categories[$type] ?? [],
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | NORMAL BALANCE
    |--------------------------------------------------------------------------
    */

    private function getNormalBalance(
        string $accountType
    ): string {

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

    private function normalizeOpeningBalance(
        array &$data
    ): void {

        $balance =
            (float) ($data['opening_balance'] ?? 0);


        if ($balance <= 0) {

            $data['opening_balance'] = 0;

            $data['opening_balance_type'] = null;

            return;
        }


        if (
            empty(
                $data['opening_balance_type']
            )
        ) {

            $data['opening_balance_type'] =
                $data['normal_balance'];
        }
    }


    /*
    |--------------------------------------------------------------------------
    | HAS JOURNAL TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    private function hasJournalTransactions(
        Account $account
    ): bool {

        /*
        |--------------------------------------------------------------------------
        | اگر رابطه journals در Model وجود داشته باشد
        |--------------------------------------------------------------------------
        */

        if (
            method_exists(
                $account,
                'journals'
            )
        ) {

            return $account
                ->journals()
                ->exists();
        }


        /*
        |--------------------------------------------------------------------------
        | بررسی مستقیم جدول Journal
        |--------------------------------------------------------------------------
        */

        if (
            DB::getSchemaBuilder()
                ->hasTable('journals')
        ) {

            return DB::table('journals')
                ->where(
                    'account_id',
                    $account->id
                )
                ->exists();
        }


        return false;
    }


    /*
    |--------------------------------------------------------------------------
    | IS DESCENDANT
    |--------------------------------------------------------------------------
    | جلوگیری از حلقه در حساب‌های مادر/فرزند
    |--------------------------------------------------------------------------
    */

    private function isDescendant(
        int $potentialParentId,
        int $accountId
    ): bool {

        $current =
            Account::find(
                $potentialParentId
            );


        $visited = [];


        while ($current) {

            /*
            |--------------------------------------------------------------------------
            | جلوگیری از Loop
            |--------------------------------------------------------------------------
            */

            if (
                in_array(
                    $current->id,
                    $visited
                )
            ) {

                return true;
            }


            $visited[] =
                $current->id;


            /*
            |--------------------------------------------------------------------------
            | رسیدن به حساب اصلی
            |--------------------------------------------------------------------------
            */

            if (
                (int) $current->id
                ===
                (int) $accountId
            ) {

                return true;
            }


            if (!$current->parent_id) {

                break;
            }


            $current =
                Account::find(
                    $current->parent_id
                );
        }


        return false;
    }
};