<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Registrations;
use App\Models\User;
use App\Models\Patient;
use App\Models\Medication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService;
use App\Services\StockService;
use App\Services\PrescriptionService;

class PrescriptionController extends Controller
{
    public function __construct(
        private PrescriptionService $prescriptionService
    ) {}

    // ============================================================
    // ✅ تابع کمکی: یافتن تأمین‌کننده در accounts
    // ============================================================
    private function findSupplier($supplierId)
    {
        if (!$supplierId) return null;
        $account = Account::find($supplierId);
        if (!$account) return null;

        return (object) [
            'id'     => $account->id,
            'name'   => $account->account_name ?? 'نامشخص',
            'source' => 'accounts',
        ];
    }

    // ============================================================
    // ✅ تابع کمکی: بررسی مجاز بودن گذار وضعیت
    // ============================================================
    private function canTransition(string $from, string $to): bool
    {
        $allowed = [
            Prescription::STATUS_PENDING             => [
                Prescription::STATUS_SENT_TO_PHARMACY,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_SENT_TO_PHARMACY    => [
                Prescription::STATUS_PHARMACY_REGISTERED,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_PHARMACY_REGISTERED => [
                Prescription::STATUS_PAID,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_PAID                => [],
            Prescription::STATUS_CANCELLED           => [],
        ];

        return in_array($to, $allowed[$from] ?? [], true);
    }

    // ============================================================
    // ✅ تابع کمکی: قالب‌بندی خروجی نسخه — با همه فیلدها
    // ============================================================
    private function formatPrescription(Prescription $prescription): array
    {
        return [
            'pres_id'         => $prescription->pres_id,
            'pres_num'        => $prescription->pres_num,
            'pres_date'       => $prescription->pres_date,
            'patient_id'      => $prescription->patient_id,
            'patient_name'    => $prescription->patient_name,
            'reg_id'          => $prescription->reg_id,
            'doc_id'          => $prescription->doc_id,
            'doc_name'        => $prescription->doc_name,
            'diagnosis'       => $prescription->diagnosis,
            'weight'          => $prescription->weight,
            'blood_pressure'  => $prescription->blood_pressure,
            'temperature'     => $prescription->temperature,
            'oxygen'          => $prescription->oxygen,

            // ✅ فیلدهای اضافی مریض که توی فرم ویرایش و چاپ لازمه
            'tazkira_number'      => $prescription->tazkira_number,
            'patient_age'         => $prescription->patient_age,
            'patient_gender'      => $prescription->patient_gender,
            'patient_phone'       => $prescription->patient_phone,
            'patient_blood_group' => $prescription->patient_blood_group,

            // ✅ وضعیت
            'status'                 => $prescription->status,
            'status_label'           => Prescription::STATUSES[$prescription->status] ?? $prescription->status,
            'sent_to_pharmacy_at'    => $prescription->sent_to_pharmacy_at,
            'pharmacy_registered_at' => $prescription->pharmacy_registered_at,
            'paid_at'                => $prescription->paid_at,
            'pharmacy_id'            => $prescription->pharmacy_id,
            'pharmacy_name'          => optional($prescription->pharmacy)->name
                                        ?? optional($prescription->pharmacy)->full_name
                                        ?? null,
            'status_note'            => $prescription->status_note,

            // ============================================================
            // ✅ اقلام نسخه — با همه فیلدها + fallback
            // ============================================================
            'items' => $prescription->items->map(function ($item) {

                // نام حمایت‌کننده
                $supplierName = $item->is_custom
                    ? ($item->supplier_name ?? 'نامشخص')
                    : ($item->supplier->account_name ?? $item->supplier_name ?? 'نامشخص');

                // نام دارو
                $medName = $item->is_custom
                    ? ($item->med_name ?? 'نامشخص')
                    : ($item->medication->gen_name ?? $item->med_name ?? 'نامشخص');

                // نام کتگوری — با fallback از هر دو منبع
                $categoryName = $item->category->category_name
                    ?? $item->category_name
                    ?? 'نامشخص';

                return [
                    'pres_it_id'      => $item->pres_it_id,
                    'category_id'     => $item->category_id,
                    'category_name'   => $categoryName,
                    'med_id'          => $item->med_id,
                    'med_name'        => $medName,
                    'supplier_id'     => $item->supplier_id,
                    'supplier_name'   => $supplierName,
                    'is_custom'       => (bool) $item->is_custom,
                    'type'            => $item->type,
                    'stock_id'        => $item->stock_id,
                    'barcode'         => $item->barcode,
                    'batch_number'    => $item->batch_number,
                    'dosage'          => $item->dosage,
                    'quantity'        => $item->quantity,
                    'remarks'         => $item->remarks,
                ];
            })->values()->toArray(),
        ];
    }

    // ============================================================
    // INDEX
    // ============================================================
    public function index(Request $request)
    {
        $query = Prescription::with([
            'items.medication',
            'items.supplier',
            'items.category',
            'items.stock',
            'patient',
            'registration',
            'doctor',
            'pharmacy',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('doc_id')) {
            $query->where('doc_id', $request->doc_id);
        }

        if ($request->filled('reg_id')) {
            $query->where('reg_id', $request->reg_id);
        }

        $prescriptions = $query->latest()
            ->get()
            ->map(fn ($p) => $this->formatPrescription($p));

        return response()->json([
            'success' => true,
            'data'    => $prescriptions
        ]);
    }

    // ============================================================
    // MY PRESCRIPTIONS
    // ============================================================
    public function myPrescriptions(Request $request)
    {
        $doctorId = Auth::id();

        $query = Prescription::with([
            'items.medication',
            'items.supplier',
            'items.category',
            'items.stock',
            'patient',
            'registration',
            'pharmacy',
        ])->where('doc_id', $doctorId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $prescriptions = $query->latest()
            ->get()
            ->map(fn ($p) => $this->formatPrescription($p));

        return response()->json([
            'success' => true,
            'data'    => $prescriptions
        ]);
    }

    // ============================================================
    // ✅ حمایت‌کنندگان یک دارو (از stock)
    // ============================================================
    public function getMedicationSuppliers($med_id)
    {
        try {
            $suppliers = DB::table('stock')
                ->join('accounts', 'accounts.id', '=', 'stock.supplier_id')
                ->where('stock.med_id', $med_id)
                ->where('stock.quantity', '>', 0)
                ->whereDate('stock.exp_date', '>=', now()->toDateString())
                ->select(
                    'accounts.id as reg_id',
                    'accounts.account_name as full_name',
                    'accounts.account_name as name'
                )
                ->distinct()
                ->orderBy('accounts.account_name')
                ->get();

            return response()->json([
                'success' => true,
                'source'  => 'stock',
                'data'    => $suppliers,
                'count'   => $suppliers->count(),
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getMedicationSuppliers: ' . $e->getMessage(), [
                'med_id' => $med_id,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت حمایت‌کننده‌ها',
                'error'   => config('app.debug') ? $e->getMessage() : null,
                'data'    => []
            ], 500);
        }
    }

    // ============================================================
    // ✅ بچ بعدی (FEFO)
    // ============================================================
    public function getNextBatch(Request $request)
    {
        $request->validate([
            'med_id'      => 'required|exists:medications,med_id',
            'supplier_id' => 'nullable|integer|exists:accounts,id',
            'quantity'    => 'nullable|integer|min:1',
        ]);

        try {
            $stock = StockService::getNextBatch(
                (int) $request->med_id,
                $request->supplier_id ? (int) $request->supplier_id : null,
                (int) ($request->quantity ?? 1)
            );

            if (!$stock) {
                return response()->json([
                    'success' => false,
                    'message' => 'موجودی کافی یافت نشد',
                ], 404);
            }

            $medication = Medication::find($request->med_id);

            return response()->json([
                'success' => true,
                'data'    => [
                    'stock_id'     => $stock->stock_id,
                    'barcode'      => $medication->barcode ?? null,
                    'batch_number' => $stock->batch_number,
                    'exp_date'     => $stock->exp_date,
                    'quantity'     => $stock->quantity,
                    'selling_price'=> $stock->selling_price,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات بچ',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // STORE
    // ============================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id'      => 'required|exists:patients,id',
            'reg_id'          => 'required|exists:registrations,reg_id',
            'pres_date'       => 'required|date',

            'patient_name'        => 'nullable|string|max:255',
            'tazkira_number'      => 'nullable|string|max:100',
            'patient_age'         => 'nullable|integer|min:0',
            'patient_gender'      => 'nullable|string|max:20',
            'patient_phone'       => 'nullable|string|max:30',
            'patient_blood_group' => 'nullable|string|max:10',

            'diagnosis'       => 'nullable|string',
            'weight'          => 'nullable|numeric|min:0|max:999',
            'blood_pressure'  => 'nullable|string|max:50',
            'temperature'     => 'nullable|numeric|min:0|max:99',
            'oxygen'          => 'nullable|integer|min:0|max:100',

            'items'                    => 'required|array|min:1',
            'items.*.category_id'      => 'nullable|exists:categories,category_id',
            'items.*.is_custom'        => 'required|boolean',
            'items.*.med_id'           => 'nullable|required_if:items.*.is_custom,false|exists:medications,med_id',
            'items.*.supplier_id'      => 'nullable|required_if:items.*.is_custom,false|integer|min:1',
            'items.*.med_name'         => 'nullable|required_if:items.*.is_custom,true|string|max:255',
            'items.*.supplier_name'    => 'nullable|required_if:items.*.is_custom,true|string|max:255',
            'items.*.type'             => 'nullable|string|max:100',
            'items.*.dosage'           => 'required|string|max:100',
            'items.*.quantity'         => 'required|integer|min:1',
            'items.*.remarks'          => 'nullable|string',
        ], [
            'patient_id.required'   => 'شناسه مریض الزامی است',
            'patient_id.exists'     => 'مریض در سیستم یافت نشد',
            'reg_id.required'       => 'شناسه مراجعه الزامی است',
            'reg_id.exists'         => 'مراجعه در سیستم یافت نشد',
            'pres_date.required'    => 'تاریخ نسخه الزامی است',
            'items.required'        => 'حداقل یک دارو باید تجویز شود',
            'items.*.dosage.required' => 'مقدار مصرف برای هر دارو الزامی است',
            'items.*.quantity.required' => 'تعداد برای هر دارو الزامی است',
            'items.*.quantity.min'  => 'تعداد باید حداقل ۱ باشد',
        ]);

        DB::beginTransaction();

        try {
            $doctorId = Auth::id();
            if (!$doctorId) throw new \Exception('کاربر لاگین‌شده یافت نشد');

            $doctor = User::find($doctorId);
            if (!$doctor) throw new \Exception('داکتر در سیستم یافت نشد');

            $prescription = Prescription::create([
                'patient_id'          => $validated['patient_id'],
                'reg_id'              => $validated['reg_id'],
                'doc_id'              => $doctorId,
                'doc_name'            => $doctor->name
                                        ?? $doctor->full_name
                                        ?? $doctor->username
                                        ?? null,
                'patient_name'        => $validated['patient_name'] ?? null,
                'tazkira_number'      => $validated['tazkira_number'] ?? null,
                'patient_age'         => $validated['patient_age'] ?? null,
                'patient_gender'      => $validated['patient_gender'] ?? null,
                'patient_phone'       => $validated['patient_phone'] ?? null,
                'patient_blood_group' => $validated['patient_blood_group'] ?? null,
                'diagnosis'           => $validated['diagnosis'] ?? null,
                'weight'              => $validated['weight'] ?? null,
                'blood_pressure'      => $validated['blood_pressure'] ?? null,
                'temperature'         => $validated['temperature'] ?? null,
                'oxygen'              => $validated['oxygen'] ?? null,
                'pres_date'           => $validated['pres_date'],
                'status'              => Prescription::STATUS_PENDING,
            ]);

            $prescription->pres_num = $prescription->pres_id;
            $prescription->save();

            foreach ($validated['items'] as $item) {
                $isCustom = !empty($item['is_custom']);

                if ($isCustom) {
                    $this->prescriptionService->prescribeCustomItem(
                        $prescription->pres_id,
                        $item['med_name'] ?? '',
                        $item['supplier_name'] ?? '',
                        (int) $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'type'        => $item['type'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                } else {
                    $this->prescriptionService->prescribeItem(
                        $prescription->pres_id,
                        (int) $item['med_id'],
                        (int) $item['supplier_id'],
                        (int) $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                }
            }

            DB::commit();

            LogService::create(
                'create',
                'prescriptions',
                $prescription->pres_id,
                'Prescription created with FEFO',
                $prescription->load('items')->toArray()
            );

            return response()->json([
                'success' => true,
                'message' => 'نسخه با موفقیت ثبت شد',
                'data'    => $this->formatPrescription(
                    $prescription->load([
                        'items.medication',
                        'items.supplier',
                        'items.category',
                        'items.stock',
                        'pharmacy'
                    ])
                )
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Store Error', [
                'error'   => $e->getMessage(),
                'request' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // UPDATE
    // ============================================================
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'patient_id'      => 'required|exists:patients,id',
            'reg_id'          => 'required|exists:registrations,reg_id',
            'pres_date'       => 'required|date',

            'patient_name'        => 'nullable|string|max:255',
            'tazkira_number'      => 'nullable|string|max:100',
            'patient_age'         => 'nullable|integer|min:0',
            'patient_gender'      => 'nullable|string|max:20',
            'patient_phone'       => 'nullable|string|max:30',
            'patient_blood_group' => 'nullable|string|max:10',

            'diagnosis'       => 'nullable|string',
            'weight'          => 'nullable|numeric|min:0|max:999',
            'blood_pressure'  => 'nullable|string|max:50',
            'temperature'     => 'nullable|numeric|min:0|max:99',
            'oxygen'          => 'nullable|integer|min:0|max:100',

            'items'                 => 'required|array|min:1',
            'items.*.category_id'   => 'nullable|exists:categories,category_id',
            'items.*.is_custom'     => 'required|boolean',
            'items.*.med_id'        => 'nullable|required_if:items.*.is_custom,false|exists:medications,med_id',
            'items.*.supplier_id'   => 'nullable|required_if:items.*.is_custom,false|integer|min:1',
            'items.*.med_name'      => 'nullable|required_if:items.*.is_custom,true|string|max:255',
            'items.*.supplier_name' => 'nullable|required_if:items.*.is_custom,true|string|max:255',
            'items.*.type'          => 'nullable|string|max:100',
            'items.*.dosage'        => 'required|string|max:100',
            'items.*.quantity'      => 'required|integer|min:1',
            'items.*.remarks'       => 'nullable|string',

            'status'                => 'nullable|in:pending,sent_to_pharmacy,pharmacy_registered,paid,cancelled',
            'status_note'           => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $prescription = Prescription::with('items')->findOrFail($id);
            $oldData = $prescription->toArray();

            if (!empty($validated['status']) && $validated['status'] !== $prescription->status) {
                if (!$this->canTransition($prescription->status, $validated['status'])) {
                    throw new \Exception(
                        "گذر از وضعیت '{$prescription->status}' به '{$validated['status']}' مجاز نیست"
                    );
                }
            }

            // ✅ برگرداندن موجودی آیتم‌های قبلی
            foreach ($prescription->items as $oldItem) {
                if (!$oldItem->is_custom && $oldItem->med_id && $oldItem->stock_id) {
                    StockService::reverseDecreaseByStockId(
                        $oldItem->stock_id,
                        $oldItem->quantity
                    );
                }
            }

            // ✅ بروزرسانی نسخه
            $prescription->update([
                'patient_id'          => $validated['patient_id'],
                'reg_id'              => $validated['reg_id'],
                'patient_name'        => $validated['patient_name'] ?? null,
                'tazkira_number'      => $validated['tazkira_number'] ?? null,
                'patient_age'         => $validated['patient_age'] ?? null,
                'patient_gender'      => $validated['patient_gender'] ?? null,
                'patient_phone'       => $validated['patient_phone'] ?? null,
                'patient_blood_group' => $validated['patient_blood_group'] ?? null,
                'diagnosis'           => $validated['diagnosis'] ?? null,
                'weight'              => $validated['weight'] ?? null,
                'blood_pressure'      => $validated['blood_pressure'] ?? null,
                'temperature'         => $validated['temperature'] ?? null,
                'oxygen'              => $validated['oxygen'] ?? null,
                'pres_date'           => $validated['pres_date'],
                'status'              => $validated['status'] ?? $prescription->status,
                'status_note'         => $validated['status_note'] ?? $prescription->status_note,
            ]);

            // ✅ حذف آیتم‌های قدیمی
            PrescriptionItem::where('pres_id', $prescription->pres_id)->delete();

            // ✅ ثبت آیتم‌های جدید
            foreach ($validated['items'] as $item) {
                $isCustom = !empty($item['is_custom']);

                if ($isCustom) {
                    $this->prescriptionService->prescribeCustomItem(
                        $prescription->pres_id,
                        $item['med_name'] ?? '',
                        $item['supplier_name'] ?? '',
                        (int) $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'type'        => $item['type'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                } else {
                    $this->prescriptionService->prescribeItem(
                        $prescription->pres_id,
                        (int) $item['med_id'],
                        (int) $item['supplier_id'],
                        (int) $item['quantity'],
                        $item['dosage'],
                        [
                            'category_id' => $item['category_id'] ?? null,
                            'remarks'     => $item['remarks'] ?? null,
                        ]
                    );
                }
            }

            DB::commit();

            LogService::create(
                'update',
                'prescriptions',
                $id,
                'Prescription updated with FEFO',
                [
                    'old' => $oldData,
                    'new' => $prescription->load('items')->toArray()
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'نسخه با موفقیت بروزرسانی شد',
                'data'    => $this->formatPrescription(
                    $prescription->load([
                        'items.medication',
                        'items.supplier',
                        'items.category',
                        'items.stock',
                        'pharmacy'
                    ])
                )
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Update Error', [
                'error'   => $e->getMessage(),
                'request' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // SEND TO PHARMACY
    // ============================================================
    public function sendToPharmacy($id)
    {
        return $this->changeStatus(
            $id,
            Prescription::STATUS_SENT_TO_PHARMACY,
            ['sent_to_pharmacy_at' => now()],
            'نسخه به دواخانه ارسال شد'
        );
    }

    // ============================================================
    // PHARMACY REGISTERED
    // ============================================================
    public function markPharmacyRegistered(Request $request, $id)
    {
        $request->validate([
            'pharmacy_id' => 'nullable|exists:users,id',
            'status_note' => 'nullable|string',
        ]);

        $extra = [
            'pharmacy_registered_at' => now(),
            'pharmacy_id'            => $request->pharmacy_id ?? Auth::id(),
            'status_note'            => $request->status_note,
        ];

        return $this->changeStatus(
            $id,
            Prescription::STATUS_PHARMACY_REGISTERED,
            $extra,
            'نسخه در دواخانه ثبت شد'
        );
    }

    // ============================================================
    // MARK PAID
    // ============================================================
    public function markPaid($id)
    {
        return $this->changeStatus(
            $id,
            Prescription::STATUS_PAID,
            ['paid_at' => now()],
            'پول نسخه اخذ شد'
        );
    }

    // ============================================================
    // CANCEL
    // ============================================================
    public function cancel(Request $request, $id)
    {
        $request->validate([
            'status_note' => 'nullable|string|max:500',
        ]);

        return $this->changeStatus(
            $id,
            Prescription::STATUS_CANCELLED,
            ['status_note' => $request->status_note],
            'نسخه لغو شد'
        );
    }

    // ============================================================
    // UPDATE STATUS
    // ============================================================
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status'      => 'required|in:pending,sent_to_pharmacy,pharmacy_registered,paid,cancelled',
            'status_note' => 'nullable|string|max:500',
        ]);

        $extra = ['status_note' => $validated['status_note'] ?? null];

        switch ($validated['status']) {
            case Prescription::STATUS_SENT_TO_PHARMACY:
                $extra['sent_to_pharmacy_at'] = now();
                break;
            case Prescription::STATUS_PHARMACY_REGISTERED:
                $extra['pharmacy_registered_at'] = now();
                $extra['pharmacy_id']            = Auth::id();
                break;
            case Prescription::STATUS_PAID:
                $extra['paid_at'] = now();
                break;
        }

        return $this->changeStatus(
            $id,
            $validated['status'],
            $extra,
            'وضعیت نسخه بروزرسانی شد'
        );
    }

    // ============================================================
    // CHANGE STATUS (helper)
    // ============================================================
    private function changeStatus($id, string $newStatus, array $extra = [], string $successMessage = '')
    {
        DB::beginTransaction();

        try {
            $prescription = Prescription::findOrFail($id);

            if ($prescription->status === $newStatus) {
                return response()->json([
                    'success' => true,
                    'message' => 'وضعیت قبلاً در همین حالت بود',
                    'data'    => $this->formatPrescription($prescription->load('pharmacy')),
                ]);
            }

            if (!$this->canTransition($prescription->status, $newStatus)) {
                return response()->json([
                    'success' => false,
                    'message' => "گذر از وضعیت '{$prescription->status}' به '{$newStatus}' مجاز نیست",
                ], 422);
            }

            $oldStatus = $prescription->status;

            $prescription->update(array_merge([
                'status' => $newStatus,
            ], $extra));

            DB::commit();

            LogService::create(
                'status_change',
                'prescriptions',
                $prescription->pres_id,
                "Prescription status changed: {$oldStatus} → {$newStatus}",
                [
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'extra'      => $extra,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => $successMessage ?: 'وضعیت بروزرسانی شد',
                'data'    => $this->formatPrescription(
                    $prescription->fresh()->load([
                        'items.medication',
                        'items.supplier',
                        'items.category',
                        'items.stock',
                        'pharmacy'
                    ])
                ),
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'نسخه یافت نشد',
            ], 404);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Status Change Error', [
                'error' => $e->getMessage(),
                'id'    => $id,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در تغییر وضعیت',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // DESTROY
    // ============================================================
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $prescription = Prescription::with('items')->findOrFail($id);
            $data = $prescription->toArray();

            foreach ($prescription->items as $item) {
                if (!$item->is_custom && $item->stock_id) {
                    StockService::reverseDecreaseByStockId(
                        $item->stock_id,
                        $item->quantity
                    );
                }
            }

            PrescriptionItem::where('pres_id', $id)->delete();
            $prescription->delete();

            DB::commit();

            LogService::create(
                'delete',
                'prescriptions',
                $id,
                'Prescription deleted',
                $data
            );

            return response()->json([
                'success' => true,
                'message' => 'نسخه با موفقیت حذف شد'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Delete Error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف نسخه',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // CHECK STOCK
    // ============================================================
    public function checkStockBeforePrescription(Request $request)
    {
        $request->validate([
            'items'                 => 'required|array|min:1',
            'items.*.is_custom'     => 'required|boolean',
            'items.*.med_id'        => 'nullable|required_if:items.*.is_custom,false|exists:medications,med_id',
            'items.*.supplier_id'   => 'nullable|required_if:items.*.is_custom,false|integer|min:1',
            'items.*.quantity'      => 'required|integer|min:1',
        ]);

        try {
            $unavailableItems = [];

            foreach ($request->items as $index => $item) {
                if (!empty($item['is_custom'])) continue;

                $supplier = $this->findSupplier($item['supplier_id']);

                $total = StockService::getAvailableQuantity(
                    (int) $item['med_id'],
                    (int) $item['supplier_id'],
                    null
                );

                if ($total < (int) $item['quantity']) {
                    $medication = Medication::find($item['med_id']);

                    $unavailableItems[] = [
                        'index'             => $index,
                        'med_id'            => $item['med_id'],
                        'med_name'          => $medication->gen_name ?? 'نامشخص',
                        'supplier_id'       => $item['supplier_id'],
                        'supplier_name'     => $supplier->name ?? 'نامشخص',
                        'required_quantity' => $item['quantity'],
                        'available_quantity'=> $total,
                    ];
                }
            }

            if (count($unavailableItems) > 0) {
                return response()->json([
                    'success'           => false,
                    'message'           => 'برخی از اقلام موجودی کافی ندارند',
                    'unavailable_items' => $unavailableItems
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'همه اقلام موجودی کافی دارند'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بررسی موجودی',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ============================================================
    // SHOW
    // ============================================================
    public function show($id)
    {
        try {
            $prescription = Prescription::with([
                'items.medication',
                'items.supplier',
                'items.category',
                'items.stock',
                'patient',
                'registration',
                'doctor',
                'pharmacy',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data'    => $this->formatPrescription($prescription),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'نسخه یافت نشد',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 404);
        }
    }
}