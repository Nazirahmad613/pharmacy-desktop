<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    /**
     * دریافت لیست تمام بخش‌ها
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            // فقط بخش‌های فعال را برمی‌گرداند و بر اساس نام مرتب می‌کند
            $departments = Department::where('status', 'Active')
                ->orderBy('name')
                ->get();

            // برگرداندن داده در فرمت استاندارد برای فرانت‌اند
            return response()->json([
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت لیست بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ایجاد بخش جدید
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            // اعتبارسنجی داده‌ها
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:departments,name',
                'code' => 'required|string|max:20|unique:departments,code',
                'description' => 'nullable|string',
                'status' => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            // ایجاد بخش جدید
            $department = Department::create([
                'uuid' => Str::uuid(),
                'code' => $validated['code'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'Active',
                'created_by' => auth()->id(),
            ]);

            // لاگ عملیات
            Log::info('Department created: ' . $department->id);

            return response()->json([
                'message' => 'بخش با موفقیت ایجاد شد',
                'data' => $department
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ایجاد بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش یک بخش خاص
     * 
     * @param Department $department
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Department $department)
    {
        try {
            return response()->json([
                'data' => $department
            ]);

        } catch (\Exception $e) {
            Log::error('Error showing department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت اطلاعات بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی بخش
     * 
     * @param Request $request
     * @param Department $department
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, Department $department)
    {
        try {
            // اعتبارسنجی داده‌ها
            $validated = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('departments', 'name')->ignore($department->id)
                ],
                'code' => [
                    'required',
                    'string',
                    'max:20',
                    Rule::unique('departments', 'code')->ignore($department->id)
                ],
                'description' => 'nullable|string',
                'status' => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            // به‌روزرسانی بخش
            $department->update([
                'name' => $validated['name'],
                'code' => $validated['code'],
                'description' => $validated['description'] ?? $department->description,
                'status' => $validated['status'] ?? $department->status,
                'updated_by' => auth()->id(),
            ]);

            // لاگ عملیات
            Log::info('Department updated: ' . $department->id);

            return response()->json([
                'message' => 'بخش با موفقیت به‌روزرسانی شد',
                'data' => $department
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در به‌روزرسانی بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف بخش (سخت یا نرم)
     * 
     * @param Request $request
     * @param Department $department
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, Department $department)
    {
        try {
            // بررسی اینکه آیا بخش در مراجعات استفاده شده است
            $hasRegistrations = $department->registrations()->exists();
            
            if ($hasRegistrations) {
                // اگر بخش در مراجعات استفاده شده، فقط غیرفعال می‌کنیم
                $department->update([
                    'status' => 'Inactive',
                    'updated_by' => auth()->id(),
                ]);

                return response()->json([
                    'message' => 'بخش به دلیل استفاده در مراجعات، غیرفعال شد',
                    'data' => $department
                ]);
            }

            // اگر استفاده نشده، حذف فیزیکی (سخت)
            $department->delete();

            // لاگ عملیات
            Log::info('Department deleted: ' . $department->id);

            return response()->json([
                'message' => 'بخش با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در حذف بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت بخش‌های فعال (برای استفاده در انتخاب‌ها)
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActiveDepartments()
    {
        try {
            $departments = Department::where('status', 'Active')
                ->select('id', 'uuid', 'code', 'name')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching active departments: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت بخش‌های فعال',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار بخش‌ها
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function statistics()
    {
        try {
            $total = Department::count();
            $active = Department::where('status', 'Active')->count();
            $inactive = Department::where('status', 'Inactive')->count();

            return response()->json([
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching department statistics: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت آمار بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}