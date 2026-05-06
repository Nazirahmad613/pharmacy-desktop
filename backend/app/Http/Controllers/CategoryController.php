<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;
use App\Services\LogService; // اضافه شده

class CategoryController extends Controller
{
    // نمایش همه کتگوری‌ها برای فرم React
    public function index()
    {
        try {
            // گرفتن ستون‌های واقعی جدول
            $categories = Category::select('category_id', 'category_name')->get();

            return response()->json($categories);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'خطا در دریافت کتگوری‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ثبت کتگوری جدید
    public function store(Request $request)
    {
        $request->validate([
            'category_name' => 'required|string|max:255',
        ]);

        try {
            $category = Category::create([
                'category_name' => $request->category_name,
            ]);

            // ✅ لاگ ثبت کتگوری
            LogService::create(
                'create',
                'categories',
                $category->category_id,
                'Category created',
                $category->toArray()
            );

            return response()->json([
                'message' => 'کتگوری با موفقیت ثبت شد',
                'category' => $category
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'خطا در ثبت کتگوری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // نمایش یک کتگوری خاص
    public function show($id)
    {
        try {
            $category = Category::findOrFail($id);
            return response()->json($category);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'کتگوری یافت نشد',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    // بروزرسانی کتگوری
    public function update(Request $request, $id)
    {
        $request->validate([
            'category_name' => 'required|string|max:255',
        ]);

        try {
            $category = Category::findOrFail($id);
            
            // ✅ گرفتن اطلاعات قبل از تغییر
            $oldData = $category->toArray();

            $category->update($request->only('category_name'));

            // ✅ لاگ ویرایش کتگوری
            LogService::create(
                'update',
                'categories',
                $category->category_id,
                'Category updated',
                [
                    'old' => $oldData,
                    'new' => $category->toArray()
                ]
            );

            return response()->json([
                'message' => 'کتگوری با موفقیت بروزرسانی شد',
                'category' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'خطا در بروزرسانی کتگوری',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // حذف کتگوری
    public function destroy($id)
    {
        try {
            $category = Category::findOrFail($id);
            
            // ✅ ذخیره اطلاعات قبل از حذف
            $data = $category->toArray();

            $category->delete();

            // ✅ لاگ حذف کتگوری
            LogService::create(
                'delete',
                'categories',
                $id,
                'Category deleted',
                $data
            );

            return response()->json([
                'message' => 'کتگوری با موفقیت حذف شد'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'خطا در حذف کتگوری',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}