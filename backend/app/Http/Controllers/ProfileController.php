<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function getProfile(Request $request)
    {
        $user = $request->user()->load('roles', 'permissions');
        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'current_password' => 'required_with:new_password|string',
            'new_password' => 'nullable|min:6|confirmed',
        ]);

        // اطلاعات اصلی
        if ($request->filled('name')) {
            $user->name = $request->name;
        }

        if ($request->filled('email')) {
            $user->email = $request->email;
        }

        // تغییر رمز
        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'رمز عبور فعلی صحیح نیست'
                ], 422);
            }
            $user->password = Hash::make($request->new_password);
        }

        // ذخیره عکس - بخش اصلاح‌شده
        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            
            // لاگ برای دیباگ
            \Log::info('Profile avatar upload', [
                'user_id' => $user->id,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize()
            ]);

            // حذف عکس قبلی
            if ($user->avatar) {
                $oldPath = 'avatars/' . basename($user->avatar);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                    \Log::info('Old avatar deleted: ' . $oldPath);
                }
            }

            // ایجاد نام یکتا برای فایل
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // ذخیره عکس جدید
            $path = $file->storeAs('avatars', $filename, 'public');
            
            // ذخیره فقط نام فایل در دیتابیس (نه مسیر کامل)
            $user->avatar = $filename;
            
            \Log::info('New avatar saved: ' . $filename);
        }

        $user->save();

        // گرفتن اطلاعات کامل
        $user->load('roles', 'permissions');

        return response()->json([
            'message' => 'پروفایل با موفقیت به‌روزرسانی شد',
            'user' => $user
        ]);
    }
}