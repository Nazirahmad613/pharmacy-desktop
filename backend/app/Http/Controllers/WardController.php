<?php
// app/Http/Controllers/WardController.php

namespace App\Http\Controllers;

use App\Models\Ward;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WardController extends Controller
{
    /**
     * نمایش لیست تمام بخش‌ها
     */
    public function index(Request $request)
    {
        $query = Ward::withCount(['beds', 'activeAdmissions']);

        // فیلتر بر اساس نوع
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // فیلتر بر اساس فعال بودن
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        // جستجو
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $wards = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $wards
        ]);
    }

    /**
     * ذخیره بخش جدید
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:wards,code|max:50',
            'description' => 'nullable|string',
            'type' => 'required|in:general,icu,ccu,pediatric,maternity,surgical,medical',
            'total_beds' => 'required|integer|min:1',
            'location' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:50',
            'building' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $ward = Ward::create([
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'type' => $request->type,
                'total_beds' => $request->total_beds,
                'available_beds' => $request->total_beds,
                'location' => $request->location,
                'floor' => $request->floor,
                'building' => $request->building,
                'phone' => $request->phone,
                'is_active' => $request->is_active ?? true
            ]);

            // ایجاد تخت‌های بخش
            for ($i = 1; $i <= $request->total_beds; $i++) {
                Bed::create([
                    'ward_id' => $ward->id,
                    'bed_number' => (string) $i,
                    'status' => 'available',
                    'is_active' => true
                ]);
            }

            DB::commit();

            $ward->loadCount(['beds', 'activeAdmissions']);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت ایجاد شد',
                'data' => $ward
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک بخش
     */
    public function show($id)
    {
        $ward = Ward::with(['beds' => function($query) {
            $query->orderBy('bed_number');
        }])->withCount(['beds', 'activeAdmissions'])->find($id);

        if (!$ward) {
            return response()->json([
                'success' => false,
                'message' => 'بخش یافت نشد'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $ward
        ]);
    }

    /**
     * به‌روزرسانی بخش
     */
    public function update(Request $request, $id)
    {
        $ward = Ward::find($id);

        if (!$ward) {
            return response()->json([
                'success' => false,
                'message' => 'بخش یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|unique:wards,code,' . $id . '|max:50',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:general,icu,ccu,pediatric,maternity,surgical,medical',
            'total_beds' => 'sometimes|integer|min:1',
            'location' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:50',
            'building' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // اگر تعداد تخت‌ها تغییر کرد
            if ($request->has('total_beds') && $request->total_beds > $ward->total_beds) {
                $newBedsCount = $request->total_beds - $ward->total_beds;
                $lastBedNumber = Bed::where('ward_id', $ward->id)->max('bed_number') ?? 0;
                
                for ($i = 1; $i <= $newBedsCount; $i++) {
                    Bed::create([
                        'ward_id' => $ward->id,
                        'bed_number' => (string) ($lastBedNumber + $i),
                        'status' => 'available',
                        'is_active' => true
                    ]);
                }
                
                // افزایش تعداد تخت‌های موجود
                $ward->available_beds += $newBedsCount;
            }

            $ward->update($request->except(['total_beds']));

            if ($request->has('total_beds')) {
                $ward->total_beds = $request->total_beds;
                $ward->save();
            }

            DB::commit();

            $ward->loadCount(['beds', 'activeAdmissions']);

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت به‌روزرسانی شد',
                'data' => $ward
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف بخش
     */
    public function destroy($id)
    {
        $ward = Ward::find($id);

        if (!$ward) {
            return response()->json([
                'success' => false,
                'message' => 'بخش یافت نشد'
            ], 404);
        }

        // بررسی وجود بیمار بستری
        if ($ward->activeAdmissions()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'این بخش دارای بیماران بستری است و قابل حذف نمی‌باشد'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // حذف تخت‌های بخش
            Bed::where('ward_id', $ward->id)->delete();
            
            // حذف بخش
            $ward->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'بخش با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تخت‌های یک بخش
     */
    public function getBeds($wardId)
    {
        $ward = Ward::find($wardId);

        if (!$ward) {
            return response()->json([
                'success' => false,
                'message' => 'بخش یافت نشد'
            ], 404);
        }

        $beds = Bed::where('ward_id', $wardId)
            ->where('is_active', true)
            ->orderBy('bed_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $beds
        ]);
    }

    /**
     * دریافت آمار بخش‌ها
     */
    public function getStatistics()
    {
        $statistics = [
            'total_wards' => Ward::count(),
            'active_wards' => Ward::where('is_active', true)->count(),
            'total_beds' => Bed::count(),
            'available_beds' => Bed::where('status', 'available')->count(),
            'occupied_beds' => Bed::where('status', 'occupied')->count(),
            'reserved_beds' => Bed::where('status', 'reserved')->count(),
            'maintenance_beds' => Bed::where('status', 'maintenance')->count(),
            'wards_by_type' => Ward::select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->get()
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }
}