<?php

namespace App\Http\Controllers;

use App\Models\LaboratoryFee;
use App\Models\Registrations;
use App\Models\LaboratoryRequest;
use App\Models\QRCode;
use App\Models\JournalEntry;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LaboratoryFeeController extends Controller
{
    /**
     * ============================================================
     * لیست فیس‌های لابراتوار
     * ============================================================
     */
    public function index(Request $request)
    {
        $query = LaboratoryFee::with([
            'patient',
            'registration',
            'laboratoryRequest',
            'qrCode'
        ]);

        if ($request->filled('registration_id')) {
            $query->where('reg_id', $request->registration_id);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('barcode', 'LIKE', "%{$search}%")
                  ->orWhereHas('patient', function ($p) use ($search) {
                      $p->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%");
                  });
            });
        }

        $perPage = (int) ($request->per_page ?? 15);
        if ($perPage < 1) {
            $perPage = 15;
        }

        $fees = $query
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $fees,
            'message' => 'لیست فیس‌های لابراتوار'
        ]);
    }

    /**
     * ============================================================
     * دریافت درخواست‌های لابراتوار بدون فیس
     * ============================================================
     */
    public function getUnpaidRequests($registrationId)
    {
        $registration = Registrations::where('reg_id', $registrationId)->first();

        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        // دریافت تمام درخواست‌ها با اطلاعات کامل
        $allRequests = LaboratoryRequest::where('registration_id', $registration->reg_id)
            ->with(['doctor', 'fee', 'patient'])
            ->orderByDesc('created_at')
            ->get();

        // ✅ درخواست‌هایی که fee_id ندارند (بدون فیس)
        $unpaidRequests = $allRequests
            ->filter(function ($request) {
                return is_null($request->fee_id);
            })
            ->values();

        // ✅ درخواست‌هایی که fee_id دارند (دارای فیس)
        $paidRequests = $allRequests
            ->filter(function ($request) {
                return !is_null($request->fee_id);
            })
            ->values();

        // فرمت کردن درخواست‌های بدون فیس
        $formattedUnpaid = $unpaidRequests->map(function($request) {
            return [
                'id' => $request->id,
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'test_type' => $request->test_type,
                'test_type_label' => $this->getTestTypeLabel($request->test_type),
                'test_name' => $request->test_name ?? '',
                'test_description' => $request->test_description ?? '',
                'clinical_indication' => $request->clinical_indication ?? '',
                'special_notes' => $request->special_notes ?? '',
                'request_date' => $request->request_date,
                'sample_collection_date' => $request->sample_collection_date,
                'status' => $request->status,
                'barcode' => $request->barcode,
                'fee_id' => $request->fee_id,
                'has_fee' => false,
                'amount' => $request->fee ? (float) $request->fee->amount : 0,
                'created_at' => $request->created_at,
                'updated_at' => $request->updated_at,
            ];
        });

        // فرمت کردن درخواست‌های دارای فیس
        $formattedPaid = $paidRequests->map(function($request) {
            return [
                'id' => $request->id,
                'registration_id' => $request->registration_id,
                'patient_id' => $request->patient_id,
                'test_type' => $request->test_type,
                'test_type_label' => $this->getTestTypeLabel($request->test_type),
                'test_name' => $request->test_name ?? '',
                'test_description' => $request->test_description ?? '',
                'clinical_indication' => $request->clinical_indication ?? '',
                'special_notes' => $request->special_notes ?? '',
                'request_date' => $request->request_date,
                'sample_collection_date' => $request->sample_collection_date,
                'status' => $request->status,
                'barcode' => $request->barcode,
                'fee_id' => $request->fee_id,
                'has_fee' => true,
                'amount' => $request->fee ? (float) $request->fee->amount : 0,
                'paid_amount' => $request->fee ? (float) $request->fee->paid_amount : 0,
                'discount' => $request->fee ? (float) $request->fee->discount : 0,
                'remaining_amount' => $request->fee ? (float) $request->fee->remaining_amount : 0,
                'payment_status' => $request->fee ? $request->fee->payment_status : null,
                'payment_method' => $request->fee ? $request->fee->payment_method : null,
                'created_at' => $request->created_at,
                'updated_at' => $request->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'unpaid_requests' => $formattedUnpaid->toArray(),
                'paid_requests' => $formattedPaid->toArray(),
                'has_unpaid_requests' => $unpaidRequests->count() > 0,
                'total_unpaid_requests' => $unpaidRequests->count(),
                'has_paid_requests' => $paidRequests->count() > 0,
                'total_paid_requests' => $paidRequests->count(),
                'total_requests' => $allRequests->count(),
            ],
            'message' => 'درخواست‌های لابراتوار'
        ]);
    }

    /**
     * ============================================================
     * ثبت فیس جدید
     * ============================================================
     */
    public function store(Request $request, $registrationId)
    {
        // registrationId = reg_id
        $registration = Registrations::where('reg_id', $registrationId)->first();

        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'مراجعه یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'amount' => ['required', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'in:cash,card,online,insurance'],
            'discount' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'laboratory_request_ids' => ['nullable', 'array'],
            'laboratory_request_ids.*' => ['integer', 'exists:laboratory_requests,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی',
                'errors' => $validator->errors()
            ], 422);
        }

        $amount = (float) $request->amount;
        $paidAmount = (float) ($request->paid_amount ?? 0);
        $discount = (float) ($request->discount ?? 0);

        $discountAmount = $amount * ($discount / 100);
        $netAmount = $amount - $discountAmount;

        if ($paidAmount > $netAmount) {
            return response()->json([
                'success' => false,
                'message' => 'مبلغ پرداختی نمی‌تواند بیشتر از مبلغ قابل پرداخت باشد'
            ], 422);
        }

        $remainingAmount = $netAmount - $paidAmount;

        if ($remainingAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidAmount > 0) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'pending';
        }

        $barcode = $request->barcode ?: $this->generateBarcode();

        DB::beginTransaction();

        try {
            // ✅ ایجاد فیس با reg_id
            $fee = LaboratoryFee::create([
                'reg_id' => $registration->reg_id,  // ← استفاده از reg_id
                'patient_id' => $registration->patient_id,
                'barcode' => $barcode,
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'discount' => $discount,
                'remaining_amount' => $remainingAmount,
                'payment_status' => $paymentStatus,
                'payment_method' => $request->payment_method ?? 'cash',
                'description' => $request->description,
                'note' => $request->note,
                'laboratory_request_id' => null,
            ]);

            // ✅ اتصال درخواست‌های لابراتوار به فیس
            $laboratoryRequestIds = $request->laboratory_request_ids ?? [];
            $updatedRequests = collect();

            if (!empty($laboratoryRequestIds)) {
                LaboratoryRequest::whereIn('id', $laboratoryRequestIds)
                    ->where('registration_id', $registration->reg_id)
                    ->update(['fee_id' => $fee->id]);

                $updatedRequests = LaboratoryRequest::whereIn('id', $laboratoryRequestIds)
                    ->where('registration_id', $registration->reg_id)
                    ->get();

                if ($updatedRequests->isNotEmpty()) {
                    $fee->update(['laboratory_request_id' => $updatedRequests->first()->id]);
                }
            }

            // ✅ تولید QR
            $this->generateQRCode($fee);

            // ✅ Journal
            $this->syncJournal($fee);

            DB::commit();

            $fee->load(['patient', 'registration', 'laboratoryRequest', 'qrCode']);

            return response()->json([
                'success' => true,
                'data' => $fee,
                'message' => 'فیس لابراتوار با موفقیت ثبت شد'
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('خطا در ثبت فیس لابراتوار', [
                'message' => $e->getMessage(),
                'registration_id' => $registration->reg_id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت فیس: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================
     * دریافت برچسب نوع تست
     * ============================================================
     */
    private function getTestTypeLabel($type)
    {
        $labels = [
            'blood' => 'خون',
            'urine' => 'ادرار',
            'stool' => 'مدفوع',
            'biochemistry' => 'بیوشیمی',
            'hormonal' => 'هورمونی',
            'microbial' => 'میکروبی',
            'pathology' => 'پاتولوژی',
            'genetic' => 'ژنتیک',
            'imaging' => 'تصویربرداری',
            'other' => 'سایر'
        ];
        
        return $labels[$type] ?? $type;
    }

    /**
     * ============================================================
     * تولید QR Code
     * ============================================================
     */
    private function generateQRCode($fee, $forceNew = false)
    {
        $patient = $fee->patient;
        $registration = $fee->registration;

        $labRequests = LaboratoryRequest::where('fee_id', $fee->id)
            ->orderBy('created_at')
            ->get();

        $firstRequest = $labRequests->first();

        $qrData = [
            'fee_id' => $fee->id,
            'patient_name' => $patient ? trim($patient->first_name . ' ' . $patient->last_name) : 'نامشخص',
            'patient_id' => $patient ? $patient->id : null,
            'patient_mobile' => $patient ? $patient->mobile : null,
            'registration_id' => $registration ? $registration->reg_id : $fee->reg_id, // ← استفاده از reg_id
            'visit_number' => $registration ? $registration->visit_number : null,
            'barcode' => $fee->barcode,
            'amount' => (float) $fee->amount,
            'discount' => (float) $fee->discount,
            'net_amount' => (float) ($fee->amount - ($fee->amount * $fee->discount / 100)),
            'paid_amount' => (float) $fee->paid_amount,
            'remaining' => (float) $fee->remaining_amount,
            'payment_status' => $fee->payment_status,
            'payment_method' => $fee->payment_method,
            'created_at' => $fee->created_at ? $fee->created_at->toISOString() : null,
            'tests' => $labRequests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'test_type' => $req->test_type,
                    'test_type_label' => $this->getTestTypeLabel($req->test_type),
                    'test_name' => $req->test_name,
                    'test_description' => $req->test_description,
                    'clinical_indication' => $req->clinical_indication,
                    'status' => $req->status,
                    'barcode' => $req->barcode,
                ];
            })->values()->toArray(),
            'total_tests' => $labRequests->count(),
        ];

        $qrJson = json_encode($qrData, JSON_UNESCAPED_UNICODE);

        $directory = storage_path('app/public/qrcodes');
        if (!is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $fileName = 'qr_' . $fee->barcode . '_' . time() . '_' . Str::random(5) . '.png';
        $path = $directory . DIRECTORY_SEPARATOR . $fileName;

        \QrCode::format('png')
            ->size(300)
            ->errorCorrection('H')
            ->generate($qrJson, $path);

        $qrCode = QRCode::updateOrCreate(
            ['laboratory_fee_id' => $fee->id],
            [
                'laboratory_request_id' => $firstRequest ? $firstRequest->id : null,
                'patient_id' => $patient ? $patient->id : null,
                'registration_id' => $registration ? $registration->reg_id : $fee->reg_id, // ← استفاده از reg_id
                'qr_code_path' => 'storage/qrcodes/' . $fileName,
                'qr_code_data' => $qrJson,
                'qr_code_type' => 'laboratory_fee',
                'is_active' => true,
            ]
        );

        return $qrCode;
    }

    /**
     * ============================================================
     * همگام‌سازی با Journal
     * ============================================================
     */
    private function syncJournal($fee)
    {
        try {
            JournalEntry::where('reference_type', 'laboratory_fee')
                ->where('reference_id', $fee->id)
                ->delete();

            $patient = $fee->patient;
            $patientName = $patient ? trim($patient->first_name . ' ' . $patient->last_name) : 'نامشخص';

            $requests = LaboratoryRequest::where('fee_id', $fee->id)->get();
            $testTypes = $requests->pluck('test_type')->filter()->unique()->implode('، ');
            $testNames = $requests->pluck('test_name')->filter()->unique()->implode('، ');

            $description = 'فیس لابراتوار - ' . $patientName;
            if ($testNames) {
                $description .= ' - تست‌ها: ' . $testNames;
            } elseif ($testTypes) {
                $description .= ' - نوع تست: ' . $testTypes;
            }
            $description .= ' - بارکد: ' . $fee->barcode;

            $totalAmount = (float) $fee->amount;
            $discountAmount = $totalAmount * ((float) $fee->discount / 100);
            $netAmount = $totalAmount - $discountAmount;
            $remaining = $netAmount - (float) $fee->paid_amount;

            JournalEntry::create([
                'registration_id' => $fee->reg_id, // ← استفاده از reg_id
                'patient_id' => $fee->patient_id,
                'reference_type' => 'laboratory_fee',
                'reference_id' => $fee->id,
                'description' => $description,
                'debit' => $netAmount,
                'credit' => $fee->paid_amount,
                'balance' => $remaining,
                'payment_method' => $fee->payment_method,
                'payment_status' => $fee->payment_status,
                'transaction_date' => Carbon::now(),
                'barcode' => $fee->barcode,
                'metadata' => json_encode([
                    'fee_amount' => $fee->amount,
                    'discount' => $fee->discount,
                    'discount_amount' => $discountAmount,
                    'net_amount' => $netAmount,
                    'paid_amount' => $fee->paid_amount,
                    'remaining' => $remaining,
                    'registration_id' => $fee->reg_id, // ← استفاده از reg_id
                    'laboratory_request_ids' => $requests->pluck('id')->toArray(),
                    'test_types' => $requests->pluck('test_type')->toArray(),
                    'test_names' => $requests->pluck('test_name')->filter()->toArray(),
                    'patient_name' => $patientName,
                    'patient_mobile' => $patient ? $patient->mobile : null,
                ], JSON_UNESCAPED_UNICODE)
            ]);

        } catch (\Throwable $e) {
            Log::error('خطا در همگام‌سازی ژورنال', [
                'fee_id' => $fee->id,
                'registration_id' => $fee->reg_id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * ============================================================
     * تولید Barcode یکتا
     * ============================================================
     */
    private function generateBarcode()
    {
        do {
            $barcode = 'FEE' . Carbon::now()->format('Ymd') . strtoupper(Str::random(6));
        } while (LaboratoryFee::where('barcode', $barcode)->exists());

        return $barcode;
    }
}