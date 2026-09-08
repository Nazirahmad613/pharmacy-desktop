<?php
// app/Http/Controllers/BedController.php

namespace App\Http\Controllers;

use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BedController extends Controller
{
    /**
     * نمایش لیست تمام تخت‌ها
     */
    public function index(Request $request)
    {
        $query = Bed::with(['ward']);

        // فیلتر بر اساس بخش
        if ($request->has('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        // فیلتر بر اساس وضعیت
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // فیلتر بر اساس فعال بودن
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        // جستجو
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('bed_number', 'like', "%{$search}%")
                  ->orWhere('room_number', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhereHas('ward', function($w) use ($search) {
                      $w->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $beds = $query->orderBy('ward_id')->orderBy('bed_number')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $beds
        ]);
    }

    /**
     * ذخیره تخت جدید
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ward_id' => 'required|exists:wards,id',
            'bed_number' => 'required|string|unique:beds,bed_number,NULL,id,ward_id,' . $request->ward_id,
            'room_number' => 'nullable|string|max:50',
            'floor' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|in:available,occupied,reserved,maintenance',
            'notes' => 'nullable|string',
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

            $bed = Bed::create([
                'ward_id' => $request->ward_id,
                'bed_number' => $request->bed_number,
                'room_number' => $request->room_number,
                'floor' => $request->floor,
                'location' => $request->location,
                'status' => $request->status ?? 'available',
                'notes' => $request->notes,
                'is_active' => $request->is_active ?? true
            ]);

            // افزایش تعداد تخت‌های بخش
            $ward = Ward::find($request->ward_id);
            $ward->increment('total_beds');
            $ward->increment('available_beds');

            DB::commit();

            $bed->load('ward');

            return response()->json([
                'success' => true,
                'message' => 'تخت با موفقیت ایجاد شد',
                'data' => $bed
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ایجاد تخت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * نمایش جزئیات یک تخت
     */
    public function show($id)
    {
        $bed = Bed::with(['ward', 'admission.patient'])->find($id);

        if (!$bed) {
            return response()->json([
                'success' => false,
                'message' => 'تخت یافت نشد'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $bed
        ]);
    }

    /**
     * به‌روزرسانی تخت
     */
    public function update(Request $request, $id)
    {
        $bed = Bed::find($id);

        if (!$bed) {
            return response()->json([
                'success' => false,
                'message' => 'تخت یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'bed_number' => 'sometimes|string|unique:beds,bed_number,' . $id . ',id,ward_id,' . $bed->ward_id,
            'room_number' => 'nullable|string|max:50',
            'floor' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|in:available,occupied,reserved,maintenance',
            'notes' => 'nullable|string',
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

            // اگر وضعیت تغییر کرد
            if ($request->has('status') && $request->status != $bed->status) {
                // اگر تخت از اشغال به موجود تغییر کرد
                if ($bed->status === 'occupied' && $request->status === 'available') {
                    $ward = Ward::find($bed->ward_id);
                    $ward->increment('available_beds');
                }
                // اگر تخت از موجود به اشغال تغییر کرد
                elseif ($bed->status === 'available' && $request->status === 'occupied') {
                    $ward = Ward::find($bed->ward_id);
                    $ward->decrement('available_beds');
                }
            }

            $bed->update($request->all());

            DB::commit();

            $bed->load('ward');

            return response()->json([
                'success' => true,
                'message' => 'تخت با موفقیت به‌روزرسانی شد',
                'data' => $bed
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در به‌روزرسانی تخت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف تخت
     */
    public function destroy($id)
    {
        $bed = Bed::find($id);

        if (!$bed) {
            return response()->json([
                'success' => false,
                'message' => 'تخت یافت نشد'
            ], 404);
        }

        if ($bed->status === 'occupied') {
            return response()->json([
                'success' => false,
                'message' => 'این تخت اشغال است و قابل حذف نمی‌باشد'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // کاهش تعداد تخت‌های بخش
            $ward = Ward::find($bed->ward_id);
            if ($bed->status === 'available') {
                $ward->decrement('available_beds');
            }
            $ward->decrement('total_beds');

            $bed->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تخت با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف تخت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تخت‌های موجود
     */
    public function getAvailableBeds()
    {
        $beds = Bed::with('ward')
            ->where('status', 'available')
            ->where('is_active', true)
            ->orderBy('ward_id')
            ->orderBy('bed_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $beds
        ]);
    }

    /**
     * دریافت تخت‌های یک بخش
     */
    public function getBedsByWard($wardId)
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
     * تغییر وضعیت تخت
     */
    public function changeStatus(Request $request, $id)
    {
        $bed = Bed::find($id);

        if (!$bed) {
            return response()->json([
                'success' => false,
                'message' => 'تخت یافت نشد'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:available,occupied,reserved,maintenance'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // مدیریت تغییرات موجودی تخت
            $oldStatus = $bed->status;
            $newStatus = $request->status;

            if ($oldStatus !== $newStatus) {
                $ward = Ward::find($bed->ward_id);

                // از موجود به غیرموجود
                if ($oldStatus === 'available') {
                    $ward->decrement('available_beds');
                }
                // از غیرموجود به موجود
                elseif ($newStatus === 'available') {
                    $ward->increment('available_beds');
                }
            }

            $bed->update(['status' => $request->status]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'وضعیت تخت با موفقیت تغییر کرد',
                'data' => $bed->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در تغییر وضعیت تخت',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}