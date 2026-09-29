<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ExternalPrescription;
use App\Models\ExternalPrescriptionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ExternalPrescriptionController extends Controller
{
    // لیست همه
    public function index(Request $request)
    {
        $query = ExternalPrescription::with('items');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('patient_name', 'like', "%{$s}%")
                  ->orWhere('tazkira_number', 'like', "%{$s}%")
                  ->orWhere('patient_phone', 'like', "%{$s}%")
                  ->orWhere('receipt_number', 'like', "%{$s}%");
            });
        }

        $data = $query->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // ثبت + ارسال به رسپشن
    public function store(Request $request)
    {
        $request->validate([
            'patient_name' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.med_id' => 'required|integer',
            'items.*.medication_name' => 'required|string',
            'items.*.dosage' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = collect($request->items)->sum(function ($it) {
                return $it['quantity'] * $it['unit_price'];
            });

            $prescription = ExternalPrescription::create([
                'patient_name' => $request->patient_name,
                'patient_age' => $request->patient_age,
                'patient_gender' => $request->patient_gender,
                'patient_phone' => $request->patient_phone,
                'tazkira_number' => $request->tazkira_number,
                'patient_address' => $request->patient_address,
                'doctor_name' => $request->doctor_name,
                'diagnosis' => $request->diagnosis,
                'total_amount' => $totalAmount,
                'discount' => $request->discount ?? 0,
                'status' => 'sent_to_registration',
                'created_by' => Auth::id(),
                'notes' => $request->notes,
                'receipt_number' => ExternalPrescription::generateReceiptNumber(),
            ]);

            foreach ($request->items as $it) {
                ExternalPrescriptionItem::create([
                    'external_pres_id' => $prescription->id,
                    'med_id' => $it['med_id'],
                    'category_id' => $it['category_id'] ?? null,
                    'supplier_id' => $it['supplier_id'] ?? null,
                    'stock_id' => $it['stock_id'] ?? null,
                    'medication_name' => $it['medication_name'],
                    'medication_type' => $it['medication_type'] ?? null,
                    'supplier_name' => $it['supplier_name'] ?? null,
                    'barcode' => $it['barcode'] ?? null,
                    'batch_number' => $it['batch_number'] ?? null,
                    'dosage' => $it['dosage'],
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'total_price' => $it['quantity'] * $it['unit_price'],
                    'remarks' => $it['remarks'] ?? null,
                ]);
            }

            DB::commit();
            $prescription->load('items');

            return response()->json([
                'success' => true,
                'message' => 'نسخه ثبت و به رسپشن ارسال شد',
                'data' => $prescription,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا: ' . $e->getMessage(),
            ], 500);
        }
    }

    // نمایش یک نسخه
    public function show($id)
    {
        $prescription = ExternalPrescription::with('items')->find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        return response()->json(['success' => true, 'data' => $prescription]);
    }

    // بروزرسانی
    public function update(Request $request, $id)
    {
        $prescription = ExternalPrescription::find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        if ($prescription->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'نسخه پرداخت شده قابل ویرایش نیست',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $prescription->update([
                'patient_name' => $request->patient_name ?? $prescription->patient_name,
                'patient_age' => $request->patient_age ?? $prescription->patient_age,
                'patient_gender' => $request->patient_gender ?? $prescription->patient_gender,
                'patient_phone' => $request->patient_phone ?? $prescription->patient_phone,
                'tazkira_number' => $request->tazkira_number ?? $prescription->tazkira_number,
                'patient_address' => $request->patient_address ?? $prescription->patient_address,
                'doctor_name' => $request->doctor_name ?? $prescription->doctor_name,
                'diagnosis' => $request->diagnosis ?? $prescription->diagnosis,
                'discount' => $request->discount ?? $prescription->discount,
                'notes' => $request->notes ?? $prescription->notes,
            ]);

            if ($request->has('items')) {
                $prescription->items()->delete();
                $totalAmount = 0;

                foreach ($request->items as $it) {
                    $total = $it['quantity'] * $it['unit_price'];
                    $totalAmount += $total;

                    ExternalPrescriptionItem::create([
                        'external_pres_id' => $prescription->id,
                        'med_id' => $it['med_id'],
                        'category_id' => $it['category_id'] ?? null,
                        'supplier_id' => $it['supplier_id'] ?? null,
                        'stock_id' => $it['stock_id'] ?? null,
                        'medication_name' => $it['medication_name'],
                        'medication_type' => $it['medication_type'] ?? null,
                        'supplier_name' => $it['supplier_name'] ?? null,
                        'barcode' => $it['barcode'] ?? null,
                        'batch_number' => $it['batch_number'] ?? null,
                        'dosage' => $it['dosage'],
                        'quantity' => $it['quantity'],
                        'unit_price' => $it['unit_price'],
                        'total_price' => $total,
                        'remarks' => $it['remarks'] ?? null,
                    ]);
                }

                $prescription->total_amount = $totalAmount;
                $prescription->save();
            }

            DB::commit();
            $prescription->load('items');

            return response()->json([
                'success' => true,
                'message' => 'بروزرسانی شد',
                'data' => $prescription,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'خطا: ' . $e->getMessage()], 500);
        }
    }

    // حذف
    public function destroy($id)
    {
        $prescription = ExternalPrescription::find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        if ($prescription->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'نسخه پرداخت شده قابل حذف نیست',
            ], 422);
        }

        $prescription->items()->delete();
        $prescription->delete();

        return response()->json(['success' => true, 'message' => 'حذف شد']);
    }

    // چاپ
    public function print($id)
    {
        $prescription = ExternalPrescription::with('items')->find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'execution' => $prescription,
                'hospital_name' => config('app.name', 'بیمارستان'),
                'hospital_phone' => '',
                'print_date' => now()->format('Y-m-d H:i'),
            ],
        ]);
    }

    // ==========================================
    // ⭐ متدهای رسپشن
    // ==========================================

    // لیست در انتظار پرداخت (برای رسپشن)
    public function pending()
    {
        $data = ExternalPrescription::with('items')
            ->where('status', 'sent_to_registration')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // اخذ فیس
    public function markAsPaid($id)
    {
        $prescription = ExternalPrescription::find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        if ($prescription->status === 'paid') {
            return response()->json(['success' => false, 'message' => 'قبلاً پرداخت شده'], 422);
        }

        $prescription->update([
            'status' => 'paid',
            'paid_by' => Auth::id(),
            'paid_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'فیس اخذ شد',
            'data' => $prescription,
        ]);
    }

    // لغو
    public function cancel(Request $request, $id)
    {
        $prescription = ExternalPrescription::find($id);

        if (!$prescription) {
            return response()->json(['success' => false, 'message' => 'یافت نشد'], 404);
        }

        $prescription->update([
            'status' => 'cancelled',
            'notes' => $request->reason
                ? ($prescription->notes ? $prescription->notes . "\n" : '') . 'دلیل لغو: ' . $request->reason
                : $prescription->notes,
        ]);

        return response()->json(['success' => true, 'message' => 'لغو شد']);
    }
}