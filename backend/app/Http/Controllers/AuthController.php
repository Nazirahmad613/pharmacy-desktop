<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

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

        // ✅ اختصاص نقش
        $roleName = $validated['role'] ?? 'user';
        $user->assignRole($roleName);

        // ✅ بارگذاری مجدد کاربر با روابط
        $user->load('roles.permissions');
        
        $token = $user->createToken('auth_token')->plainTextToken;

        // ✅ ساخت ساختار داده مناسب برای فرانت‌اند
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->map(function($permission) {
                        return [
                            'id' => $permission->id,
                            'name' => $permission->name
                        ];
                    })
                ];
            }),
            'permissions' => $user->getAllPermissions()->map(function($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name
                ];
            })
        ];

        return response()->json([
            'success' => true,
            'message' => 'ثبت نام با موفقیت انجام شد',
            'user' => $userData,
            'token' => $token,
            'token_type' => 'Bearer',
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
        
        // ✅ بارگذاری مجدد کاربر با روابط
        $user->load('roles.permissions');
        
        $token = $user->createToken('auth_token')->plainTextToken;

        // ✅ ساخت ساختار داده مناسب برای فرانت‌اند
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->map(function($permission) {
                        return [
                            'id' => $permission->id,
                            'name' => $permission->name
                        ];
                    })
                ];
            }),
            'permissions' => $user->getAllPermissions()->map(function($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name
                ];
            })
        ];

        return response()->json([
            'success' => true,
            'message' => 'ورود موفقیت آمیز',
            'user' => $userData,
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        // ✅ بارگذاری مجدد کاربر با روابط
        $user->load('roles.permissions');

        // ✅ ساخت ساختار داده مناسب برای فرانت‌اند
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->map(function($permission) {
                        return [
                            'id' => $permission->id,
                            'name' => $permission->name
                        ];
                    })
                ];
            }),
            'permissions' => $user->getAllPermissions()->map(function($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name
                ];
            })
        ];

        return response()->json([
            'success' => true,
            'user' => $userData,
        ]);
    }                   
    
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'خروج از سیستم با موفقیت انجام شد'
        ]);
    }
}