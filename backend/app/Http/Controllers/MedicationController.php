<?php

namespace App\Http\Controllers;

use App\Models\Medication;
use App\Models\Category;
use App\Models\Registrations;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\LogService;

class MedicationController extends Controller
{
    /**
     * 📋 لیست دواها
     */
    public function index()
    {
        $medications = Medication::with(['category', 'supplier'])
            ->orderBy('med_id', 'desc')
            ->get();

        return response()->json($medications);
    }

    /**
     * 💾 ثبت دوا جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'category_id')
            ],
            'supplier_id' => [
                'required',
                'integer',
                Rule::exists('registrations', 'reg_id')
                    ->where('reg_type', 'supplier')
            ],
            'gen_name' => 'required|string|max:255',
            'dosage'   => 'required|string|max:255',
            'type'     => 'required|string|max:255',
        ]);

        try {

            $medication = Medication::create($validated);
          // ✅ لاگ
        LogService::create(
            'create',
            'medications',
            $medication->med_id,
            'Medication created',
            $medication->toArray()
        );

            return response()->json([
                'message' => '✅ دوا با موفقیت ثبت شد',
                'medication' => Medication::with(['category','supplier'])
                    ->find($medication->med_id)
            ], 201);

        } catch (\Exception $e) {

            return response()->json([
                'error' => '❌ خطا در ثبت دوا',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🔍 نمایش یک دوا
     */
    public function show($med_id)
    {
        $medication = Medication::with(['category', 'supplier'])
            ->find($med_id);
            

        if (!$medication) {
            return response()->json(['error' => 'دوا پیدا نشد'], 404);
        }

        return response()->json($medication);
    }

    /**
     * ✏️ ویرایش دوا
     */
    public function update(Request $request, $med_id)
    {
        $validated = $request->validate([
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'category_id')
            ],
            'supplier_id' => [
                'required',
                'integer',
                Rule::exists('registrations', 'reg_id')
                    ->where('reg_type', 'supplier')
            ],
            'gen_name' => 'required|string|max:255',
            'dosage'   => 'required|string|max:255',
            'type'     => 'required|string|max:255',
        ]);

        $medication = Medication::find($med_id);


        
        if (!$medication) {
            return response()->json(['error' => 'دوا پیدا نشد'], 404);
        }
          // ✅ گرفتن اطلاعات قبل از تغییر
    $oldData = $medication->toArray();

    $medication->update($validated);

    // ✅ لاگ
    LogService::create(
        'update',
        'medications',
        $medication->med_id,
        'Medication updated',
        [
            'old' => $oldData,
            'new' => $medication->toArray()
        ]
    );

        $medication->update($validated);

        return response()->json([
            'message' => '✅ دوا با موفقیت ویرایش شد',
            'medication' => Medication::with(['category','supplier'])
                ->find($med_id)
        ]);
    }

    /**
     * ❌ حذف دوا
     */
    public function destroy($med_id)
    {
        $medication = Medication::find($med_id);
            // ✅ لاگ
            LogService::create(
                'delete',
                'medications',
                $medication->med_id,
                'Medication deleted',
                $medication->toArray()
            );

        if (!$medication) {
            return response()->json(['error' => 'دوا پیدا نشد'], 404);
        }

    // ✅ ذخیره اطلاعات قبل از حذف
    $data = $medication->toArray();

    $medication->delete();

    // ✅ لاگ
    LogService::create(
        'delete',
        'medications',
        $med_id,
        'Medication deleted',
        $data
    );



        $medication->delete();

        return response()->json([
            'message' => '✅ دوا با موفقیت حذف شد'
        ]);
    }
}