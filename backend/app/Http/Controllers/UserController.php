<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
       public function index()
    {
        $users = User::with('roles', 'permissions')->get();
        
        // اضافه کردن avatar_url به هر کاربر
        $users->each(function($user) {
            $user->avatar_url = $user->avatar_url;
        });
        
        return response()->json($users);
    }

    public function store(Request $request)
    {
        // اعتبارسنجی ساده (اختیاری اما توصیه می‌شود)
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|exists:roles,name',
            'avatar'   => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // اعتبارسنجی عکس
        ]);

        $userData = [
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ];

        // ذخیره عکس اگر وجود داشته باشد
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $userData['avatar'] = $avatarPath;
        }

        $user = User::create($userData);

        // تخصیص نقش با گارد تعریف‌شده در مدل (همان sanctum)
        $user->assignRole($request->role);

        return $user->load('roles', 'permissions');
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:6',
            'role'     => 'nullable|exists:roles,name',
            'avatar'   => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // اعتبارسنجی عکس
        ]);

        // به‌روزرسانی فیلدهای اصلی
        $user->fill($request->only(['name', 'email']));

        // اگر پسورد جدید ارسال شده باشد، هش و ذخیره کن
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        // ذخیره عکس جدید اگر وجود داشته باشد
        if ($request->hasFile('avatar')) {
            // حذف عکس قدیمی اگر وجود داشته باشد
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $avatarPath;
        }

        $user->save();

        // به‌روزرسانی نقش (اگر مقدار role ارسال شده باشد)
        if ($request->has('role')) {
            $user->syncRoles([$request->role]);
        }

        // در صورت نیاز به همگام‌سازی پرمیشن‌ها
        if ($request->has('permissions')) {
            $user->syncPermissions($request->permissions);
        }

        return $user->load('roles', 'permissions');
    }

    public function destroy(User $user)
    {
        // حذف عکس کاربر اگر وجود داشته باشد
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }
        
        $user->delete();
        return response()->json(['message' => 'deleted']);
    }
}