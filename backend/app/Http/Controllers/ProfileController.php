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
        $user->avatar_url = $user->avatar_url;
        
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

        // به‌روزرسانی اطلاعات پایه
        if ($request->has('name')) {
            $user->name = $request->name;
        }
        
        if ($request->has('email')) {
            $user->email = $request->email;
        }

        // تغییر رمز عبور
        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'رمز عبور فعلی صحیح نیست'
                ], 422);
            }
            $user->password = Hash::make($request->new_password);
        }

        // آپدیت عکس
        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $avatarPath;
        }

        $user->save();

        $user->load('roles', 'permissions');
        $user->avatar_url = $user->avatar_url;

        return response()->json([
            'message' => 'پروفایل با موفقیت به‌روزرسانی شد',
            'user' => $user
        ]);
    }
}