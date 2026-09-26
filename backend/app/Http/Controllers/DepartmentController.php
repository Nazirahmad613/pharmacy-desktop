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
     */
    public function index()
    {
        try {
            $departments = Department::where('status', 'Active')
                ->orderBy('name')
                ->get();

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
                'name'        => 'required|string|max:255|unique:departments,name',
                'code'        => 'nullable|string|max:20|unique:departments,code',
                'description' => 'nullable|string',
                'status'      => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            // اگر code داده نشد، خودکار بساز
            $code = $validated['code'] ?? $this->generateUniqueCode($validated['name']);

            $department = Department::create([
                'uuid'        => (string) Str::uuid(),
                'code'        => $code,
                'name'        => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status'      => $validated['status'] ?? 'Active',
                'created_by'  => auth()->id(),
            ]);

            Log::info('Department created: ' . ($department->id ?? 'unknown'));

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت ایجاد شد',
                'data'    => $department
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد بخش',
                'error'   => $e->getMessage()
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
                'data'    => $department
            ]);

        } catch (\Exception $e) {
            Log::error('Error showing department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات بخش',
                'error'   => $e->getMessage()
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
                    'max:255',
                    Rule::unique('departments', 'name')->ignore($department->id)
                ],
                'code' => [
                    'nullable',
                    'string',
                    'max:20',
                    Rule::unique('departments', 'code')->ignore($department->id)
                ],
                'description' => 'nullable|string',
                'status'      => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            $department->update([
                'name'        => $validated['name'],
                'code'        => $validated['code'] ?? $department->code,
                'description' => $validated['description'] ?? $department->description,
                'status'      => $validated['status'] ?? $department->status,
                'updated_by'  => auth()->id(),
            ]);

            Log::info('Department updated: ' . $department->id);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت به‌روزرسانی شد',
                'data'    => $department->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors'  => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی بخش',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف بخش (نرم یا سخت)
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

            $hasRegistrations = method_exists($department, 'registrations')
                && $department->registrations()->exists();

            if ($hasRegistrations) {
                $department->update([
                    'status'     => 'Inactive',
                    'updated_by' => auth()->id(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'بخش به دلیل استفاده در مراجعات، غیرفعال شد',
                    'data'    => $department->fresh()
                ]);
            }

            $department->delete();

            Log::info('Department deleted: ' . $id);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف بخش',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت بخش‌های فعال
     */
    public function getActiveDepartments()
    {
        try {
            $departments = Department::where('status', 'Active')
                ->select('id', 'uuid', 'code', 'name')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data'    => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching active departments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت بخش‌های فعال',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار بخش‌ها
     */
    public function statistics()
    {
        try {
            $total    = Department::count();
            $active   = Department::where('status', 'Active')->count();
            $inactive = Department::where('status', 'Inactive')->count();

            return response()->json([
                'success'  => true,
                'total'    => $total,
                'active'   => $active,
                'inactive' => $inactive
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching department statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار بخش‌ها',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * تولید کد یکتا از نام بخش
     * مثال: "لابراتوار" → "LAB-XXXX" (اگر code داده نشود)
     */
    private function generateUniqueCode(string $name): string
    {
        // تلاش برای ساخت کد از سه حرف اول نام (لاتین)
        $base = strtoupper(preg_replace('/[^A-Za-z]/', '', $name));
        $base = substr($base, 0, 3);
        if (strlen($base) < 2) {
            $base = 'DEP';
        }

        // اطمینان از یکتا بودن
        $code = $base;
        $i = 1;
        while (Department::where('code', $code)->exists()) {
            $code = $base . $i;
            $i++;
            if ($i > 999) {
                $code = $base . '-' . Str::upper(Str::random(4));
                break;
            }
        }
        return $code;
    }
}