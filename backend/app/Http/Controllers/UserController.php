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
        
        // اضافه کردن avatar_url و role_name به هر کاربر
        $users->each(function($user) {
            $user->avatar_url = $user->avatar_url;
            $user->role_name = $user->role_name;
        });
        
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|exists:roles,name',
            'avatar'   => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $userData = [
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ];

        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $userData['avatar'] = $avatarPath;
        }

        $user = User::create($userData);

        // ✅ تخصیص نقش با گارد sanctum
        $role = Role::findByName($request->role, 'sanctum');
        $user->assignRole($role);

        // بارگذاری مجدد با roles
        $user->load('roles', 'permissions');
        
        // اضافه کردن فیلدهای اضافی
        $user->avatar_url = $user->avatar_url;
        $user->role_name = $user->role_name;

        return response()->json($user);
    }

    public function show(User $user)
    {
        $user->load('roles', 'permissions');
        $user->avatar_url = $user->avatar_url;
        $user->role_name = $user->role_name;
        
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:6',
            'role'     => 'nullable|exists:roles,name',
            'avatar'   => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user->fill($request->only(['name', 'email']));

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $avatarPath;
        }

        $user->save();

        if ($request->has('role')) {
            $role = Role::findByName($request->role, 'sanctum');
            $user->syncRoles([$role]);
        }

        if ($request->has('permissions')) {
            $user->syncPermissions($request->permissions);
        }

        $user->load('roles', 'permissions');
        $user->avatar_url = $user->avatar_url;
        $user->role_name = $user->role_name;

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }
        
        $user->delete();
        return response()->json(['message' => 'deleted']);
    }
}