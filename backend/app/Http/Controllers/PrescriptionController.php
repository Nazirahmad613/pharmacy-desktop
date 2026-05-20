<?php

namespace App\Http\Controllers;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Registrations;
use App\Models\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService;
use App\Services\StockService; // ✅ سرویس مدیریت موجودی

class PrescriptionController extends Controller
{

    public function index()
    {
        $prescriptions = Prescription::with(['items.medication', 'items.supplier', 'items.category'])
            ->latest()
            ->get()
            ->map(function ($prescription) {
                return [
                    'pres_id' => $prescription->pres_id,
                    'pres_num' => $prescription->pres_num,
                    'pres_date' => $prescription->pres_date,
                    'patient_name' => $prescription->patient_name,
                    'doc_name' => $prescription->doc_name,
                    'total_amount' => $prescription->total_amount,
                    'discount' => $prescription->discount,
                    'net_amount' => $prescription->net_amount,
                    'diagnosis' => $prescription->diagnosis,
                    'items' => $prescription->items->map(function ($item) {
                        return [
                            'pres_it_id' => $item->pres_it_id,
                            'med_id' => $item->med_id,
                            'med_name' => $item->medication->gen_name ?? 'نامشخص',
                            'supplier_id' => $item->supplier_id,
                            'supplier_name' => $item->supplier->full_name ?? $item->supplier->reg_name ?? 'نامشخص',
                            'category_id' => $item->category_id,
                            'category_name' => $item->category->category_name ?? 'نامشخص',
                            'type' => $item->type,
                            'dosage' => $item->dosage,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'total_price' => $item->total_price,
                            'remarks' => $item->remarks,
                        ];
                    }),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $prescriptions
        ]);
    }

    // 📥 ثبت نسخه جدید
    public function store(Request $request)
    {
        $request->validate([
            'patient_id'      => 'required|exists:registrations,reg_id',
            'doc_id'          => 'required|exists:registrations,reg_id',
            'pres_date'       => 'required|date',
            'items'           => 'required|array|min:1',
            'total_amount'    => 'required|numeric|min:0',
            'net_amount'      => 'required|numeric|min:0',
            'discount'        => 'nullable|numeric|min:0',
            'tazkira_number'  => 'nullable|string',
            'diagnosis'       => 'nullable|string',
            'weight'          => 'nullable|numeric|min:0|max:300',
            'blood_pressure'  => 'nullable|string|max:20',
            'temperature'     => 'nullable|numeric|min:30|max:45',
            'oxygen'          => 'nullable|integer|min:0|max:100',
            'items.*.med_id' => 'required|exists:medications,med_id',
            'items.*.supplier_id' => 'required|exists:registrations,reg_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total_price' => 'required|numeric|min:0',
        ]);

        $prescription = null;

        DB::beginTransaction();
        
        try {
            // ✅ بررسی موجودی قبل از ثبت نسخه
            foreach ($request->items as $item) {
                // بررسی معتبر بودن تأمین‌کننده
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("تأمین‌کننده با شناسه {$item['supplier_id']} معتبر نیست");
                }

                // بررسی موجودی کافی
                $isAvailable = StockService::check(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity']
                );

                if (!$isAvailable) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    throw new \Exception("موجودی دارو '{$medication->gen_name}' از تأمین‌کننده {$supplier->full_name} کافی نیست");
                }
            }

            $patient = Registrations::find($request->patient_id);
            $doc = Registrations::find($request->doc_id);

            $lastPres = Prescription::orderBy('pres_num', 'desc')->lockForUpdate()->first();
            $newPresNum = $lastPres ? $lastPres->pres_num + 1 : 1;

            $prescription = Prescription::create([
                'patient_id'          => $request->patient_id,
                'patient_name'        => $patient->full_name ?? $patient->name ?? null,
                'tazkira_number'      => $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'patient_age'         => $patient->age ?? null,
                'patient_gender'      => $patient->gender ?? null,
                'patient_phone'       => $patient->phone ?? null,
                'patient_blood_group' => $patient->blood_group ?? null,
                'doc_id'              => $request->doc_id,
                'doc_name'            => $doc->full_name ?? $doc->name ?? null,
                'pres_num'            => $newPresNum,
                'pres_date'           => $request->pres_date,
                'total_amount'        => $request->total_amount,
                'discount'            => $request->discount ?? 0,
                'net_amount'          => $request->net_amount,
                'diagnosis'           => $request->diagnosis ?? null,
                'weight'              => $request->weight ?? null,
                'blood_pressure'      => $request->blood_pressure ?? null,
                'temperature'         => $request->temperature ?? null,
                'oxygen'              => $request->oxygen ?? null,
            ]);

            // ثبت آیتم‌ها و کاهش موجودی
            foreach ($request->items as $item) {
                PrescriptionItem::create([
                    'pres_id'     => $prescription->pres_id,
                    'category_id' => $item['category_id'],
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'type'        => $item['type'] ?? null,
                    'dosage'      => $item['dosage'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'remarks'     => $item['remarks'] ?? null,
                ]);

                // ✅ کاهش موجودی (استاک)
                StockService::decrease(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity']
                );
            }

            // ثبت ژورنال (بدهکار - مریض)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'debit',
                'amount'        => $request->net_amount,
                'description'   => 'بدهکاری مریض بابت نسخه شماره ' . $newPresNum,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);

            // ثبت ژورنال (بستانکار - فروش دارو)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'credit',
                'amount'        => $request->net_amount,
                'description'   => 'فروش دارو بابت نسخه شماره ' . $newPresNum,
                'ref_type'      => 'pharmacy',
                'ref_id'        => $prescription->pres_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);

            DB::commit();

            // لاگ ایجاد نسخه
            LogService::create(
                'create',
                'prescriptions',
                $prescription->pres_id,
                'Prescription created',
                $prescription->load('items')->toArray()
            );

            return response()->json([
                'success' => true,
                'message' => 'نسخه با موفقیت ثبت شد',
                'data' => $prescription->load(['items.medication', 'items.supplier', 'items.category'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Store Error', ['error' => $e->getMessage(), 'request' => $request->all()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت نسخه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ✏️ آپدیت نسخه
    public function update(Request $request, $id)
    {
        $request->validate([
            'patient_id'      => 'required|exists:registrations,reg_id',
            'doc_id'          => 'required|exists:registrations,reg_id',
            'pres_date'       => 'required|date',
            'items'           => 'required|array|min:1',
            'total_amount'    => 'required|numeric|min:0',
            'net_amount'      => 'required|numeric|min:0',
            'discount'        => 'nullable|numeric|min:0',
            'items.*.med_id' => 'required|exists:medications,med_id',
            'items.*.supplier_id' => 'required|exists:registrations,reg_id',
            'items.*.category_id' => 'required|exists:categories,category_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        
        try {
            $prescription = Prescription::with('items')->findOrFail($id);
            $oldData = $prescription->toArray();

            // ✅ برگرداندن موجودی آیتم‌های قبلی
            foreach ($prescription->items as $oldItem) {
                StockService::reverseDecrease(
                    $oldItem->med_id,
                    $oldItem->supplier_id,
                    $oldItem->quantity
                );
            }

            // ✅ بررسی موجودی برای آیتم‌های جدید
            foreach ($request->items as $item) {
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();

                if (!$supplier) {
                    throw new \Exception("تأمین‌کننده با شناسه {$item['supplier_id']} معتبر نیست");
                }

                $isAvailable = StockService::check(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity']
                );

                if (!$isAvailable) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    throw new \Exception("موجودی دارو '{$medication->gen_name}' از تأمین‌کننده {$supplier->full_name} کافی نیست");
                }
            }

            $patient = Registrations::find($request->patient_id);
            $doc = Registrations::find($request->doc_id);

            // بروزرسانی اطلاعات نسخه
            $prescription->update([
                'patient_id'          => $request->patient_id,
                'patient_name'        => $patient->full_name ?? $patient->name ?? null,
                'tazkira_number'      => $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'patient_age'         => $patient->age ?? null,
                'patient_gender'      => $patient->gender ?? null,
                'patient_phone'       => $patient->phone ?? null,
                'patient_blood_group' => $patient->blood_group ?? null,
                'doc_id'              => $request->doc_id,
                'doc_name'            => $doc->full_name ?? $doc->name ?? null,
                'pres_date'           => $request->pres_date,
                'total_amount'        => $request->total_amount,
                'discount'            => $request->discount ?? 0,
                'net_amount'          => $request->net_amount,
                'diagnosis'           => $request->diagnosis ?? null,
                'weight'              => $request->weight ?? null,
                'blood_pressure'      => $request->blood_pressure ?? null,
                'temperature'         => $request->temperature ?? null,
                'oxygen'              => $request->oxygen ?? null,
            ]);

            // حذف آیتم‌های قدیمی
            PrescriptionItem::where('pres_id', $prescription->pres_id)->delete();

            // ثبت آیتم‌های جدید و کاهش موجودی
            foreach ($request->items as $item) {
                PrescriptionItem::create([
                    'pres_id'     => $prescription->pres_id,
                    'category_id' => $item['category_id'],
                    'med_id'      => $item['med_id'],
                    'supplier_id' => $item['supplier_id'],
                    'type'        => $item['type'] ?? null,
                    'dosage'      => $item['dosage'] ?? null,
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'remarks'     => $item['remarks'] ?? null,
                ]);

                // ✅ کاهش موجودی برای آیتم جدید
                StockService::decrease(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity']
                );
            }

            // حذف و ثبت مجدد ژورنال‌ها
            Journal::where('pres_id', $prescription->pres_id)->delete();

            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'debit',
                'amount'        => $request->net_amount,
                'description'   => 'بدهکاری مریض بابت نسخه شماره ' . $prescription->pres_num,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);

            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'credit',
                'amount'        => $request->net_amount,
                'description'   => 'فروش دارو بابت نسخه شماره ' . $prescription->pres_num,
                'ref_type'      => 'pharmacy',
                'ref_id'        => $prescription->pres_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);

            DB::commit();

            // لاگ بروزرسانی
            LogService::create(
                'update',
                'prescriptions',
                $id,
                'Prescription updated',
                [
                    'old' => $oldData,
                    'new' => $prescription->load('items')->toArray()
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'نسخه با موفقیت بروزرسانی شد',
                'data' => $prescription->load(['items.medication', 'items.supplier', 'items.category'])
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prescription Update Error', ['error' => $e->getMessage(), 'request' => $request->all()]);
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی نسخه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ❌ حذف نسخه
    public function destroy($id)
    {
        DB::beginTransaction();
        
        try {
            $prescription = Prescription::with('items')->findOrFail($id);
            $data = $prescription->toArray();

            // ✅ برگرداندن موجودی آیتم‌ها قبل از حذف
            foreach ($prescription->items as $item) {
                StockService::reverseDecrease(
                    $item->med_id,
                    $item->supplier_id,
                    $item->quantity
                );
            }

            // حذف آیتم‌ها
            PrescriptionItem::where('pres_id', $id)->delete();

            // حذف ژورنال‌های مرتبط
            Journal::where('pres_id', $id)->delete();

            // حذف خود نسخه
            $prescription->delete();

            DB::commit();

            // لاگ حذف
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
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * بررسی موجودی قبل از ثبت نسخه (API جداگانه برای فرانت‌اند)
     */
    public function checkStockBeforePrescription(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.med_id' => 'required|exists:medications,med_id',
            'items.*.supplier_id' => 'required|exists:registrations,reg_id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            $unavailableItems = [];
            
            foreach ($request->items as $index => $item) {
                $supplier = Registrations::where('reg_id', $item['supplier_id'])
                    ->where('reg_type', 'supplier')
                    ->first();
                    
                $isAvailable = StockService::check(
                    $item['med_id'],
                    $item['supplier_id'],
                    $item['quantity']
                );
                
                if (!$isAvailable) {
                    $medication = \App\Models\Medication::find($item['med_id']);
                    
                    $unavailableItems[] = [
                        'index' => $index,
                        'med_id' => $item['med_id'],
                        'med_name' => $medication->gen_name ?? 'نامشخص',
                        'supplier_id' => $item['supplier_id'],
                        'supplier_name' => $supplier->full_name ?? $supplier->reg_name ?? 'نامشخص',
                        'required_quantity' => $item['quantity'],
                    ];
                }
            }
            
            if (count($unavailableItems) > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'برخی از اقلام موجودی کافی ندارند',
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
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت جزئیات یک نسخه خاص
     */
    public function show($id)
    {
        try {
            $prescription = Prescription::with(['items.medication', 'items.supplier', 'items.category'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $prescription
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'نسخه یافت نشد',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}