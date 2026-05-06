<?php

namespace App\Http\Controllers;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Registrations;
use App\Models\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Services\LogService; // ✅ اضافه شد

class PrescriptionController extends Controller
{

    public function index()
    {
        $prescriptions = \App\Models\Prescription::with('items')->latest()->get();

        return response()->json([
            'data' => $prescriptions
        ]);
    }

    // 📥 ثبت نسخه جدید
    public function store(Request $request)
    {
        $request->validate([
            'patient_id'      => 'required',
            'doc_id'          => 'required',
            'pres_date'       => 'required|date',
            'items'           => 'required|array|min:1',
            'total_amount'    => 'required|numeric',
            'net_amount'      => 'required|numeric',
            'tazkira_number'  => 'nullable|string',
            'diagnosis'       => 'nullable|string',
'weight'          => 'nullable|numeric|min:0|max:300',
'blood_pressure'  => 'nullable|string|max:20',
'temperature'     => 'nullable|numeric|min:30|max:45',
'oxygen'          => 'nullable|integer|min:0|max:100',
        ]);

        // 🔹 تعریف متغیر بیرون از closure
        $prescription = null;

        DB::transaction(function () use ($request, &$prescription) {

            $patient = Registrations::find($request->patient_id);
            $doc     = Registrations::find($request->doc_id);

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

            // ثبت آیتم‌ها
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
            }

            // 🔹 ثبت ژورنال (debit)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'debit',
                'amount'        => $request->net_amount,
                'description'   => 'بدهکاری مریض بابت نسخه شماره '.$newPresNum,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);

            // 🔹 ثبت ژورنال (credit)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'credit',
                'amount'        => $request->net_amount,
                'description'   => 'فروش دوا بابت نسخه شماره '.$newPresNum,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $prescription->pres_id,
                'pres_num'      => $prescription->pres_id,
                'user_id'       => Auth::id(),
            ]);
        });

        // ✅ لاگ ایجاد نسخه
        LogService::create(
            'create',
            'prescriptions',
            $prescription->pres_id,
            'Prescription created',
            $prescription->load('items')->toArray()
        );

        // 🔹 استفاده از $prescription بعد از transaction بدون مشکل
        return response()->json([
            'message' => 'Prescription saved',
            'data' => $prescription->load('items')
        ], 201);
    }

    // ✏️ آپدیت نسخه
    public function update(Request $request, $id)
    {
        // ✅ ذخیره داده‌های قبلی قبل از تراکنش
        $oldPrescription = Prescription::with('items')->findOrFail($id);
        $oldData = $oldPrescription->toArray();

        DB::transaction(function () use ($request, $id) {

            $pres = Prescription::findOrFail($id);
            $patient = Registrations::find($request->patient_id);
            $doc     = Registrations::find($request->doc_id);

            $pres->update([
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

            ]);

            // حذف ژورنال‌های قدیمی مرتبط
            Journal::where('pres_id', $pres->pres_id)->delete();

            // حذف آیتم‌های قدیمی نسخه
            PrescriptionItem::where('pres_id',$pres->pres_id)->delete();

            // ثبت آیتم‌های جدید
            foreach ($request->items as $item) {
                PrescriptionItem::create([
                    'pres_id'     => $pres->pres_id,
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
            }

            // ثبت دوباره ژورنال (debit)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'debit',
                'amount'        => $request->net_amount,
                'description'   => 'بدهکاری مریض بابت نسخه شماره '.$pres->pres_num,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $pres->pres_id,
                'pres_num'      => $pres->pres_id, // ✅ pres_id در pres_num ذخیره شود
                'user_id'       => Auth::id(),
            ]);

            // ثبت دوباره ژورنال (credit)
            Journal::create([
                'journal_date'  => $request->pres_date,
                'entry_type'    => 'credit',
                'amount'        => $request->net_amount,
                'description'   => 'فروش دوا بابت نسخه شماره '.$pres->pres_num,
                'ref_type'      => 'patient',
                'ref_id'        => $request->patient_id,
                'tazkira_number'=> $request->tazkira_number ?? $patient->tazkira_number ?? null,
                'pres_id'       => $pres->pres_id,
                'pres_num'      => $pres->pres_id,
                'user_id'       => Auth::id(),
            ]);
        });

        // ✅ لاگ بروزرسانی
        $newPrescription = Prescription::with('items')->find($id);
        LogService::create(
            'update',
            'prescriptions',
            $id,
            'Prescription updated',
            [
                'old' => $oldData,
                'new' => $newPrescription->toArray()
            ]
        );

        return response()->json(['message'=>'Prescription updated successfully']);
    }

    // ❌ حذف نسخه
    public function destroy($id)
    {
        // ✅ ذخیره اطلاعات قبل از حذف
        $prescription = Prescription::with('items')->findOrFail($id);
        $data = $prescription->toArray();

        DB::transaction(function () use ($id) {
            // حذف آیتم‌ها
            PrescriptionItem::where('pres_id',$id)->delete();

            // حذف ژورنال‌های مرتبط
            Journal::where('pres_id',$id)->delete();

            // حذف خود نسخه
            Prescription::where('pres_id',$id)->delete();
        });

        // ✅ لاگ حذف
        LogService::create(
            'delete',
            'prescriptions',
            $id,
            'Prescription deleted',
            $data
        );

        return response()->json(['message'=>'Prescription deleted successfully']);
    }
}