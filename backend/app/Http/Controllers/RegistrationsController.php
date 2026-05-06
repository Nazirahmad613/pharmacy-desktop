<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use Illuminate\Http\Request;
use App\Services\LogService; // ✅ اضافه شد

class RegistrationsController extends Controller
{
    // 📥 ثبت
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reg_type'     => 'required|string',
            'full_name'    => 'required|string|max:255',
            'father_name'  => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:50',
            'gender'       => 'nullable|string',
            'age'          => 'nullable|integer',
            'blood_group'  => 'nullable|string|max:10',
            'address'      => 'nullable|string',
            'visit_date'   => 'nullable|date',
            'note'         => 'nullable|string',
            'department_id'=> 'nullable|exists:departments,id',
            'diagnosis'       => 'nullable|string',
'weight'          => 'nullable|numeric|min:0|max:300',
'blood_pressure'  => 'nullable|string|max:20',
'temperature'     => 'nullable|numeric|min:30|max:45',
'oxygen'          => 'nullable|integer|min:0|max:100',
            'tazkira_number'   => [
                'nullable',
                'regex:/^\d{4}-\d{4}-\d{5}$/'
            ],
        ]);

        $data = Registrations::create($validated);

        // ✅ لاگ ایجاد
        LogService::create(
            'create',
            'registrations',
            $data->reg_id,
            'Registration created',
            $data->toArray()
        );

        return response()->json([
            'message' => 'ثبت موفقانه انجام شد',
            'data' => $data
        ], 201);
    }

    // 📤 لیست
    public function index(Request $request)
    {
        $query = Registrations::with('department');

        if ($request->filled('reg_type')) {
            $query->where('reg_type', $request->reg_type);
        }

        return response()->json(
            $query->orderBy('reg_id', 'desc')->get()
        );
    }

    public function update(Request $request, $reg_id)
    {
        $registration = Registrations::find($reg_id);

        if (! $registration) {
            return response()->json([
                'message' => 'رجستریشن یافت نشد.'
            ], 404);
        }

        $validated = $request->validate([
            'reg_type'     => 'sometimes|required|string',
            'full_name'    => 'sometimes|required|string|max:255',
            'father_name'  => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:50',
            'gender'       => 'nullable|string',
            'age'          => 'nullable|integer',
            'blood_group'  => 'nullable|string|max:10',
            'address'      => 'nullable|string',
            'visit_date'   => 'nullable|date',
            'note'         => 'nullable|string',
            'department_id'=> 'nullable|exists:departments,id',
            'diagnosis'       => 'nullable|string',
'weight'          => 'nullable|numeric|min:0|max:300',
'blood_pressure'  => 'nullable|string|max:20',
'temperature'     => 'nullable|numeric|min:30|max:45',
'oxygen'          => 'nullable|integer|min:0|max:100',
            'tazkira_number' => [
                'nullable',
                'regex:/^\d{4}-\d{4}-\d{5}$/'
            ],
            
        ]);

        // ✅ ذخیره داده‌های قبلی
        $oldData = $registration->toArray();

        $registration->update($validated);

        // ✅ لاگ آپدیت
        LogService::create(
            'update',
            'registrations',
            $registration->reg_id,
            'Registration updated',
            [
                'old' => $oldData,
                'new' => $registration->toArray()
            ]
        );

        return response()->json([
            'message' => 'رجستریشن با موفقیت به‌روزرسانی شد',
            'data' => $registration
        ]);
    }

    public function destroy($reg_id)
    {
        $registration = Registrations::find($reg_id);

        if (! $registration) {
            return response()->json([
                'message' => 'رجستریشن یافت نشد.'
            ], 404);
        }

        // ✅ ذخیره اطلاعات قبل از حذف
        $data = $registration->toArray();

        $registration->delete();

        // ✅ لاگ حذف
        LogService::create(
            'delete',
            'registrations',
            $reg_id,
            'Registration deleted',
            $data
        );

        return response()->json([
            'message' => 'رجستریشن با موفقیت حذف شد.'
        ], 200);
    }
}