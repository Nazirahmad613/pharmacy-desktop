<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionFee;
use App\Models\Registrations;
use App\Models\User;
use App\Models\Patient;
use App\Models\Medication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
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
                Prescription::STATUS_PHARMACY_REGISTERED,
                Prescription::STATUS_PAID,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_SENT_TO_PHARMACY    => [
                Prescription::STATUS_PHARMACY_REGISTERED,
                Prescription::STATUS_PAID,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_PHARMACY_REGISTERED => [
                Prescription::STATUS_PAID,
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_PAID                => [
                Prescription::STATUS_CANCELLED,
            ],
            Prescription::STATUS_CANCELLED           => [],
        ];

        return in_array($to, $allowed[$from] ?? [], true);
    }

    // ============================================================
    // ✅ تابع کمکی: بررسی وجود ستون
    // ============================================================
    private function columnExists(string $table, string $column): bool
    {
        static $cache = [];
        $key = "{$table}.{$column}";
        if (array_key_exists($key, $cache)) return $cache[$key];

        try {
            $cache[$key] = Schema::hasColumn($table, $column);
        } catch (\Exception $e) {
            $cache[$key] = false;
        }
        return $cache[$key];
    }

    // ============================================================
    // ✅ یافتن آخرین فیس مرتبط با نسخه
    // ============================================================
    private function getLatestFeeForPrescription(Prescription $prescription): ?PrescriptionFee
    {
        try {
            return PrescriptionFee::where('registration_id', $prescription->reg_id)
                ->where('patient_id', $prescription->patient_id)
                ->latest('id')
                ->first();
        } catch (\Exception $e) {
            Log::warning('getLatestFeeForPrescription failed: ' . $e->getMessage());
            return null;
        }
    }

    // ============================================================
    // ✅ نگاشت وضعیت فیس → وضعیت نسخه
    // ============================================================
    private function mapFeeToPrescriptionStatus(?string $feeStatus): ?string
    {
        return match ($feeStatus) {
            'paid'      => Prescription::STATUS_PAID,
            'cancelled' => Prescription::STATUS_CANCELLED,
            'refunded'  => Prescription::STATUS_CANCELLED,
            'partial'   => Prescription::STATUS_PHARMACY_REGISTERED,
            default     => null,
        };
    }

    // ============================================================
    // ✅ همگام‌سازی خودکار وضعیت نسخه با فیس (silent)
    // ============================================================
    private function syncPrescriptionWithFee(Prescription $prescription, bool $persist = true): array
    {
        $result = [
            'synced'      => false,
            'old_status'  => $prescription->status,
            'new_status'  => $prescription->status,
            'fee_status'  => null,
            'fee_id'      => null,
            'message'     => null,
        ];

        try {
            $fee = $this->getLatestFeeForPrescription($prescription);

            if (!$fee) {
                $result['message'] = 'no fee found';
                return $result;
            }

            $result['fee_id']     = $fee->id;
            $result['fee_status'] = $fee->payment_status;

            $targetStatus = $this->mapFeeToPrescriptionStatus($fee->payment_status);

            if (!$targetStatus) {
                $result['message'] = 'no status change needed';
                return $result;
            }

            $currentStatus = $prescription->status;

            // اگر وضعیت فعلی همان است
            if ($currentStatus === $targetStatus) {
                $result['message'] = 'already in target status';
                return $result;
            }

            // ✅ اگر وضعیت فعلی paid است و target هم paid نیست، برنگردان (مگر cancelled)
            if ($currentStatus === Prescription::STATUS_PAID
                && $targetStatus !== Prescription::STATUS_CANCELLED) {
                $result['message'] = 'current is paid, skip';
                return $result;
            }

            // ✅ اگر گذار مجاز نیست، رد کن
            if (!$this->canTransition($currentStatus, $targetStatus)) {
                $result['message'] = "transition not allowed: {$currentStatus} → {$targetStatus}";
                return $result;
            }

            // ✅ اعمال
            $prescription->status      = $targetStatus;
            $prescription->status_note = "وضعیت به‌طور خودکار از فیس #{$fee->id} همگام شد (fee_status: {$fee->payment_status})";

            if ($targetStatus === Prescription::STATUS_PAID
                && $this->columnExists('prescriptions', 'paid_at')) {
                $prescription->paid_at = $fee->payment_date ?? now();
            }

            if ($targetStatus === Prescription::STATUS_CANCELLED
                && $this->columnExists('prescriptions', 'cancelled_at')) {
                $prescription->cancelled_at = now();
            }

            if ($persist) {
                $prescription->save();
                $prescription->refresh();
            }

            $result['synced']     = true;
            $result['new_status'] = $targetStatus;
            $result['message']    = "synced {$currentStatus} → {$targetStatus}";

            Log::info('Prescription status synced with fee', [
                'pres_id'    => $prescription->pres_id,
                'fee_id'     => $fee->id,
                'fee_status' => $fee->payment_status,
                'old_status' => $currentStatus,
                'new_status' => $targetStatus,
            ]);

        } catch (\Exception $e) {
            Log::error('syncPrescriptionWithFee failed: ' . $e->getMessage(), [
                'pres_id' => $prescription->pres_id ?? null,
            ]);
            $result['message'] = 'exception: ' . $e->getMessage();
        }

        return $result;
    }

    // ============================================================
    // ✅ تابع کمکی: قالب‌بندی خروجی نسخه (کامل)
    // ============================================================
    private function formatPrescription(Prescription $prescription, bool $syncWithFee = true): array
    {
        // ✅ همگام‌سازی خودکار قبل از فرمت
        if ($syncWithFee) {
            $this->syncPrescriptionWithFee($prescription, true);
        }

        $patient      = $prescription->patient;
        $registration = $prescription->registration;
        $doctor       = $prescription->doctor;

        // ✅ آخرین فیس مرتبط
        $fee = $this->getLatestFeeForPrescription($prescription);

        // ⭐ نام کامل بیمار
        $patientFullName =
            $prescription->patient_name
            ?: ($patient?->full_name
                ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? '')))
            ?: ($registration?->patient_name
                ?? $registration?->patient?->full_name);

        if (empty(trim((string) $patientFullName))) {
            $patientFullName = 'نامشخص';
        }

        // ⭐ شماره تذکره
        $tazkiraNumber =
            $prescription->tazkira_number
            ?: ($patient?->national_id
                ?? $patient?->tazkira_number
                ?? $registration?->tazkira_number
                ?? $registration?->patient?->national_id);

        // ⭐ سن
        $patientAge =
            $prescription->patient_age
            ?: ($patient?->age
                ?? $registration?->patient_age
                ?? $registration?->patient?->age);

        // ⭐ جنسیت
        $patientGender =
            $prescription->patient_gender
            ?: ($patient?->gender
                ?? $registration?->patient_gender
                ?? $registration?->patient?->gender);

        // ⭐ تماس
        $patientPhone =
            $prescription->patient_phone
            ?: ($patient?->mobile
                ?? $patient?->phone
                ?? $registration?->patient_phone
                ?? $registration?->patient?->mobile
                ?? $registration?->patient?->phone);

        // ⭐ گروه خون
        $patientBloodGroup =
            $prescription->patient_blood_group
            ?: ($patient?->blood_group
                ?? $registration?->patient_blood_group
                ?? $registration?->patient?->blood_group);

        // ⭐ آدرس
        $patientAddress =
            $patient?->address
            ?? $registration?->patient?->address
            ?? $registration?->address;

        // ⭐ نام داکتر
        $doctorName =
            $prescription->doc_name
            ?: ($doctor?->name
                ?? $doctor?->full_name
                ?? $doctor?->username);

        return [
            'pres_id'         => $prescription->pres_id,
            'pres_num'        => $prescription->pres_num,
            'pres_date'       => $prescription->pres_date,
            'patient_id'      => $prescription->patient_id,
            'patient_name'    => $patientFullName,
            'reg_id'          => $prescription->reg_id,
            'doc_id'          => $prescription->doc_id,
            'doc_name'        => $doctorName,
            'diagnosis'       => $prescription->diagnosis,
            'weight'          => $prescription->weight,
            'blood_pressure'  => $prescription->blood_pressure,
            'temperature'     => $prescription->temperature,
            'oxygen'          => $prescription->oxygen,

            // ✅ فیلدهای مریض
            'tazkira_number'      => $tazkiraNumber,
            'patient_age'         => $patientAge,
            'patient_gender'      => $patientGender,
            'patient_phone'       => $patientPhone,
            'patient_blood_group' => $patientBloodGroup,
            'patient_address'     => $patientAddress,

            // ✅ اطلاعات کامل بیمار
            'patient' => [
                'id'           => $patient?->id,
                'full_name'    => $patient?->full_name
                                  ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? '')),
                'first_name'   => $patient?->first_name,
                'last_name'    => $patient?->last_name,
                'age'          => $patientAge,
                'gender'       => $patientGender,
                'national_id'  => $patient?->national_id,
                'tazkira_number' => $tazkiraNumber,
                'mobile'       => $patientPhone,
                'phone'        => $patientPhone,
                'blood_group'  => $patientBloodGroup,
                'address'      => $patientAddress,
                'diagnosis'    => $prescription->diagnosis ?? $registration?->diagnosis,
                'weight'       => $prescription->weight ?? $registration?->weight,
                'blood_pressure' => $prescription->blood_pressure ?? $registration?->blood_pressure,
                'temperature'  => $prescription->temperature ?? $registration?->temperature,
                'oxygen'       => $prescription->oxygen ?? $registration?->oxygen,
            ],

            // ✅ اطلاعات داکتر
            'doctor' => $doctor ? [
                'id'         => $doctor->id,
                'name'       => $doctor->name ?? $doctor->full_name ?? $doctor->username,
                'full_name'  => $doctor->full_name ?? null,
                'username'   => $doctor->username ?? null,
                'email'      => $doctor->email ?? null,
                'phone'      => $doctor->phone ?? $doctor->mobile ?? null,
                'specialty'  => $doctor->specialty ?? $doctor->specialization ?? null,
            ] : null,

            // ✅ اطلاعات registration
            'registration' => $registration ? [
                'reg_id'         => $registration->reg_id,
                'patient_id'     => $registration->patient_id,
                'patient_name'   => $registration->patient_name ?? $patientFullName,
                'tazkira_number' => $registration->tazkira_number ?? $tazkiraNumber,
                'patient_age'    => $registration->patient_age ?? $patientAge,
                'patient_gender' => $registration->patient_gender ?? $patientGender,
                'patient_phone'  => $registration->patient_phone ?? $patientPhone,
                'diagnosis'      => $registration->diagnosis ?? $prescription->diagnosis,
                'weight'         => $registration->weight ?? $prescription->weight,
                'blood_pressure' => $registration->blood_pressure ?? $prescription->blood_pressure,
                'temperature'    => $registration->temperature ?? $prescription->temperature,
                'oxygen'         => $registration->oxygen ?? $prescription->oxygen,
                'visit_status'   => $registration->visit_status,
                'created_at'     => $registration->created_at,
            ] : null,

            // ✅ وضعیت
            'status'                 => $prescription->status,
            'status_label'           => Prescription::STATUSES[$prescription->status] ?? $prescription->status,
            'sent_to_pharmacy_at'    => $prescription->sent_to_pharmacy_at ?? null,
            'pharmacy_registered_at' => $prescription->pharmacy_registered_at ?? null,
            'paid_at'                => $prescription->paid_at ?? null,
            'pharmacy_id'            => $prescription->pharmacy_id ?? null,
            'pharmacy_name'          => optional($prescription->pharmacy)->name
                                        ?? optional($prescription->pharmacy)->full_name
                                        ?? null,
            'status_note'            => $prescription->status_note,
            'created_at'             => $prescription->created_at,
            'updated_at'             => $prescription->updated_at,

            // ✅ اطلاعات فیس مرتبط
            'fee' => $fee ? [
                'id'               => $fee->id,
                'total_amount'     => $fee->total_amount,
                'paid_amount'      => $fee->paid_amount,
                'discount'         => $fee->discount,
                'remaining_amount' => $fee->remaining_amount,
                'payment_status'   => $fee->payment_status,
                'payment_method'   => $fee->payment_method,
                'payment_date'     => $fee->payment_date,
                'description'      => $fee->description,
                'note'             => $fee->note,
                'created_at'       => $fee->created_at,
            ] : null,

            // ✅ خلاصه فیس (برای جدول)
            'fee_id'         => $fee?->id,
            'fee_status'     => $fee?->payment_status,
            'fee_total'      => $fee?->total_amount,
            'fee_paid'       => $fee?->paid_amount,
            'fee_remaining'  => $fee?->remaining_amount,
            'fee_paid_at'    => $fee?->payment_date,

            // ============================================================
            // ✅ اقلام نسخه
            // ============================================================
            'items' => $prescription->items->map(function ($item) {

                $supplierName = $item->is_custom
                    ? ($item->supplier_name ?? 'نامشخص')
                    : ($item->supplier->account_name ?? $item->supplier_name ?? 'نامشخص');

                $medName = $item->is_custom
                    ? ($item->med_name ?? 'نامشخص')
                    : ($item->medication->gen_name ?? $item->med_name ?? 'نامشخص');

                $categoryName = $item->category->category_name
                    ?? $item->category_name
                    ?? 'نامشخص';

                $medicationType =
                    $item->type
                    ?: ($item->medication->med_type
                        ?? $item->medication->type
                        ?? $item->medication->dosage_form
                        ?? null);

                return [
                    'pres_it_id'      => $item->pres_it_id,
                    'category_id'     => $item->category_id,
                    'category_name'   => $categoryName,
                    'med_id'          => $item->med_id,
                    'med_name'        => $medName,
                    'medication_name' => $medName,
                    'medication_type' => $medicationType,
                    'supplier_id'     => $item->supplier_id,
                    'supplier_name'   => $supplierName,
                    'is_custom'       => (bool) $item->is_custom,
                    'type'            => $item->type,
                    'dosage_form'     => $medicationType,
                    'stock_id'        => $item->stock_id,
                    'barcode'         => $item->barcode,
                    'batch_number'    => $item->batch_number,
                    'dosage'          => $item->dosage,
                    'quantity'        => $item->quantity,
                    'remarks'         => $item->remarks,
                    'notes'           => $item->remarks,
                    'unit_price'      => $item->unit_price ?? null,
                    'total_price'     => $item->total_price ?? null,
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
            'registration.patient',
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
            ->map(fn ($p) => $this->formatPrescription($p, true));  // ✅ sync خودکار

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
            'registration.patient',
            'doctor',
            'pharmacy',
        ])->where('doc_id', $doctorId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $prescriptions = $query->latest()
            ->get()
            ->map(fn ($p) => $this->formatPrescription($p, true));  // ✅ sync خودکار

        return response()->json([
            'success' => true,
            'data'    => $prescriptions
        ]);
    }

    // ============================================================
    // ✅ همگام‌سازی دستی وضعیت از فیس
    // ============================================================
    public function syncStatusFromFee($id)
    {
        try {
            $prescription = Prescription::with([
                'items.medication',
                'items.supplier',
                'items.category',
                'items.stock',
                'patient',
                'registration.patient',
                'doctor',
                'pharmacy',
            ])->findOrFail($id);

            $result = $this->syncPrescriptionWithFee($prescription, true);

            return response()->json([
                'success' => true,
                'message' => $result['synced']
                    ? "وضعیت نسخه از فیس همگام شد: {$result['old_status']} → {$result['new_status']}"
                    : "تغییری لازم نبود ({$result['message']})",
                'sync_result' => $result,
                'data' => $this->formatPrescription($prescription->fresh(), false),
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'نسخه یافت نشد',
            ], 404);
        } catch (\Exception $e) {
            Log::error('syncStatusFromFee error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در همگام‌سازی: ' . $e->getMessage(),
            ], 500);
        }
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
                    'stock_id'      => $stock->stock_id,
                    'barcode'       => $medication->barcode ?? null,
                    'batch_number'  => $stock->batch_number,
                    'exp_date'      => $stock->exp_date,
                    'quantity'      => $stock->quantity,
                    'selling_price' => $stock->selling_price,
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
                        'patient',
                        'registration.patient',
                        'doctor',
                        'pharmacy',
                    ]),
                    true  // ✅ sync با فیس
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

            foreach ($prescription->items as $oldItem) {
                if (!$oldItem->is_custom && $oldItem->med_id && $oldItem->stock_id) {
                    StockService::reverseDecreaseByStockId(
                        $oldItem->stock_id,
                        $oldItem->quantity
                    );
                }
            }

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

            PrescriptionItem::where('pres_id', $prescription->pres_id)->delete();

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
                        'patient',
                        'registration.patient',
                        'doctor',
                        'pharmacy',
                    ]),
                    true  // ✅ sync با فیس
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
                    'data'    => $this->formatPrescription($prescription->load('pharmacy'), true),
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
                        'patient',
                        'registration.patient',
                        'doctor',
                        'pharmacy',
                    ]),
                    true  // ✅ sync با فیس
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
                'registration.patient',
                'doctor',
                'pharmacy',
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data'    => $this->formatPrescription($prescription, true),  // ✅ sync
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