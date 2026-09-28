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
     * دریافت لیست تمام بخش‌ها (فعال و غیرفعال)
     */
    public function index(Request $request)
    {
        try {
            $query = Department::query();

            // فیلتر بر اساس وضعیت (اختیاری)
            if ($request->filled('status') && in_array($request->status, ['Active', 'Inactive'])) {
                $query->where('status', $request->status);
            }

            // جستجو
            if ($request->filled('search')) {
                $q = $request->search;
                $query->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('code', 'like', "%{$q}%")
                        ->orWhere('description', 'like', "%{$q}%");
                });
            }

            $departments = $query->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ایجاد بخش جدید
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:150|unique:departments,name',
                'code' => 'required|string|max:20|unique:departments,code',
                'description' => 'nullable|string',
                'status' => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            $department = Department::create([
                'uuid' => (string) Str::uuid(),
                'code' => strtoupper($validated['code']),
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'Active',
                'created_by' => auth()->id(),
            ]);

            Log::info('Department created: ' . ($department->id ?? 'unknown'));

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت ایجاد شد',
                'data' => $department
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش یک بخش خاص
     */
    public function show($id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $department
            ]);

        } catch (\Exception $e) {
            Log::error('Error showing department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی بخش
     */
    public function update(Request $request, $id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            $validated = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:150',
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

            $department->update([
                'name' => $validated['name'],
                'code' => strtoupper($validated['code']),
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? $department->status,
                'updated_by' => auth()->id(),
            ]);

            Log::info('Department updated: ' . $department->id);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت به‌روزرسانی شد',
                'data' => $department->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف بخش (سخت یا نرم)
     */
    public function destroy(Request $request, $id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            // بررسی وجود مراجعه مرتبط
            $hasRegistrations = false;
            if (method_exists($department, 'registrations')) {
                try {
                    $hasRegistrations = $department->registrations()->exists();
                } catch (\Exception $e) {
                    $hasRegistrations = false;
                }
            }

            if ($hasRegistrations) {
                $department->update([
                    'status' => 'Inactive',
                    'updated_by' => auth()->id(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'بخش به دلیل استفاده در مراجعات، غیرفعال شد',
                    'data' => $department->fresh()
                ]);
            }

            $department->delete();

            Log::info('Department deleted: ' . $department->id);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت بخش‌های فعال (برای استفاده در انتخاب‌ها)
     */
    public function active()
    {
        try {
            $departments = Department::where('status', 'Active')
                ->select('id', 'uuid', 'code', 'name')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching active departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت بخش‌های فعال',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Alias برای سازگاری با کد قدیمی
     */
    public function getActiveDepartments()
    {
        return $this->active();
    }

    /**
     * دریافت آمار بخش‌ها
     */
    public function statistics()
    {
        try {
            $total = Department::count();
            $active = Department::where('status', 'Active')->count();
            $inactive = Department::where('status', 'Inactive')->count();

            return response()->json([
                'success' => true,
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching department statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * جستجوی بخش‌ها
     */
    public function search(Request $request)
    {
        try {
            $q = $request->get('q', '');

            $departments = Department::where(function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%")
                        ->orWhere('code', 'like', "%{$q}%")
                        ->orWhere('description', 'like', "%{$q}%");
                })
                ->orderBy('name')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در جستجوی بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت داکتران یک بخش
     */
    public function doctors($id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            if (method_exists($department, 'doctors')) {
                return response()->json([
                    'success' => true,
                    'data' => $department->doctors()->get()
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching department doctors: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت داکتران بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * تغییر وضعیت (فعال/غیرفعال)
     */
    public function toggleStatus($id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            $department->status = $department->status === 'Active' ? 'Inactive' : 'Active';
            $department->updated_by = auth()->id();
            $department->save();

            return response()->json([
                'success' => true,
                'message' => 'وضعیت بخش با موفقیت تغییر کرد',
                'data' => $department
            ]);

        } catch (\Exception $e) {
            Log::error('Error toggling department status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در تغییر وضعیت بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}