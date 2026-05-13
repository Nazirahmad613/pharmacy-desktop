<?php

namespace App\Http\Controllers;

use App\Models\Medication;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MedicationController extends Controller
{
    /**
     * دریافت لیست همه دواها به همراه کتگوری مرتبط
     */
    public function index()
    {
        try {
            $medications = Medication::with('category')->get();
            
            return response()->json($medications, 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'خطا در دریافت دواها',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ثبت دوا جدید
     */
    public function store(Request $request)
    {
        try {
            // اعتبارسنجی داده‌ها
            $validator = Validator::make($request->all(), [
                'category_id' => 'required|exists:categories,category_id',
                'type' => 'required|string|in:شربت,تابلیت,سیروم,پودر,کپسول,کریم',
                'gen_name' => 'required|string|max:255',
                'dosage' => 'required|string|max:255',
            ], [
                'category_id.required' => 'انتخاب کتگوری الزامی است',
                'category_id.exists' => 'کتگوری انتخاب شده معتبر نیست',
                'type.required' => 'نوع دوا الزامی است',
                'type.in' => 'نوع دوا باید یکی از: شربت، تابلیت، سیروم، پودر، کپسول، کریم باشد',
                'gen_name.required' => 'نام عمومی دوا الزامی است',
                'dosage.required' => 'مقدار مصرف الزامی است',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'خطا در اعتبارسنجی',
                    'message' => $validator->errors()->first()
                ], 422);
            }

            // ساخت دوا جدید
            $medication = Medication::create([
                'category_id' => $request->category_id,
                'type' => $request->type,
                'gen_name' => $request->gen_name,
                'dosage' => $request->dosage,
            ]);

            // بارگذاری رابطه کتگوری
            $medication->load('category');

            return response()->json([
                'message' => '✅ دوا با موفقیت ثبت شد',
                'data' => $medication
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'خطا در ثبت دوا',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت یک دوا مشخص
     */
    public function show($id)
    {
        try {
            $medication = Medication::with('category')->find($id);

            if (!$medication) {
                return response()->json([
                    'error' => 'دوا یافت نشد'
                ], 404);
            }

            return response()->json($medication, 200);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'خطا در دریافت دوا',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ویرایش دوا
     */
    public function update(Request $request, $id)
    {
        try {
            // پیدا کردن دوا
            $medication = Medication::find($id);

            if (!$medication) {
                return response()->json([
                    'error' => 'دوا یافت نشد'
                ], 404);
            }

            // اعتبارسنجی داده‌ها
            $validator = Validator::make($request->all(), [
                'category_id' => 'required|exists:categories,category_id',
                'type' => 'required|string|in:شربت,تابلیت,سیروم,پودر,کپسول,کریم',
                'gen_name' => 'required|string|max:255',
                'dosage' => 'required|string|max:255',
            ], [
                'category_id.required' => 'انتخاب کتگوری الزامی است',
                'category_id.exists' => 'کتگوری انتخاب شده معتبر نیست',
                'type.required' => 'نوع دوا الزامی است',
                'type.in' => 'نوع دوا باید یکی از: شربت، تابلیت، سیروم، پودر، کپسول، کریم باشد',
                'gen_name.required' => 'نام عمومی دوا الزامی است',
                'dosage.required' => 'مقدار مصرف الزامی است',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'خطا در اعتبارسنجی',
                    'message' => $validator->errors()->first()
                ], 422);
            }

            // به‌روزرسانی دوا
            $medication->update([
                'category_id' => $request->category_id,
                'type' => $request->type,
                'gen_name' => $request->gen_name,
                'dosage' => $request->dosage,
            ]);

            // بارگذاری رابطه کتگوری
            $medication->load('category');

            return response()->json([
                'message' => '✅ دوا با موفقیت تصحیح شد',
                'data' => $medication
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'خطا در تصحیح دوا',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف دوا
     */
    public function destroy($id)
{
    try {
        // مستقیماً با Query Builder حذف کنید
        $deleted = \DB::table('medications')->where('med_id', $id)->delete();
        
        if (!$deleted) {
            return response()->json([
                'error' => 'دوا یافت نشد'
            ], 404);
        }

        return response()->json([
            'message' => '✅ دوا حذف شد'
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'خطا در حذف دوا',
            'message' => $e->getMessage()
        ], 500);
    }
}
}