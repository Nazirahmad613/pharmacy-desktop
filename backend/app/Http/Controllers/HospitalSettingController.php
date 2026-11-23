<?php

namespace App\Http\Controllers;

use App\Models\HospitalSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class HospitalSettingController extends Controller
{
    /**
     * وضعیت setup — آیا سوپر ادمین قبلاً تنظیمات را انجام داده؟
     */
    public function status(Request $request)
    {
        $setting = HospitalSetting::current();

        return response()->json([
            'is_configured' => (bool) $setting,
            'setting' => $setting,
        ]);
    }

    /**
     * ثبت تنظیمات اولیه (فقط یک بار مجاز است)
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // فقط سوپر ادمین
        if (!$user || !$user->hasRole('super_admin')) {
            return response()->json([
                'message' => 'فقط سوپر ادمین می‌تواند این تنظیمات را ثبت کند.',
            ], 403);
        }

        // اگر قبلاً ثبت شده، اجازه نده
        if (HospitalSetting::current()) {
            return response()->json([
                'message' => 'تنظیمات شفاخانه قبلاً ثبت شده است.',
            ], 409);
        }

        $validator = Validator::make($request->all(), [
            'hospital_name' => 'required|string|max:200',
            'hospital_logo' => 'nullable|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
            'enabled_modules' => 'required|array|min:1',
            'enabled_modules.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'اطلاعات وارد شده معتبر نیست.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $logoPath = null;
        if ($request->hasFile('hospital_logo')) {
            $logoPath = $request->file('hospital_logo')
                ->store('hospital', 'public');
        }

        $setting = HospitalSetting::create([
            'hospital_name' => $request->hospital_name,
            'hospital_logo' => $logoPath,
            'enabled_modules' => $request->enabled_modules,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'تنظیمات شفاخانه با موفقیت ذخیره شد.',
            'setting' => $setting,
            'logo_url' => $logoPath ? Storage::url($logoPath) : null,
        ], 201);
    }

    /**
     * دریافت تنظیمات جاری (برای نمایش در layout)
     */
    public function show()
    {
        $setting = HospitalSetting::current();

        if (!$setting) {
            return response()->json([
                'is_configured' => false,
                'setting' => null,
            ]);
        }

        return response()->json([
            'is_configured' => true,
            'setting' => $setting,
            'logo_url' => $setting->hospital_logo
                ? Storage::url($setting->hospital_logo)
                : null,
        ]);
    }
}