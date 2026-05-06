<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'sometimes|string'
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        if (!empty($validated['role'])) {
            $user->assignRole($validated['role']);
        } else {
            $user->assignRole('user');
        }

        // ✅ ایجاد توکن
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'ثبت نام با موفقیت انجام شد',
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($validated)) {
            return response()->json([
                'success' => false,
                'message' => 'ایمیل یا رمز عبور اشتباه است'
            ], 401);
        }

        $user = Auth::user();
        
        // ✅ ایجاد توکن جدید
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'ورود موفقیت آمیز',
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function logout(Request $request)
    {
        // ✅ حذف توکن فعلی
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'خروج از سیستم با موفقیت انجام شد'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'success' => true,
            'user' => $user,
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'roles' => $user->getRoleNames(),
        ]);
    }
}