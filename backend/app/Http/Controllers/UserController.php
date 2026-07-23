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
        try {
           $users = User::with('roles')
    ->get()
    ->append('avatar_url');
            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:6',
                'role' => 'required|string|exists:roles,name',
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            // ذخیره آواتار - بخش اصلاح‌شده
            if ($request->hasFile('avatar')) {
                $file = $request->file('avatar');
                
                \Log::info('User avatar upload - store', [
                    'user_id' => $user->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize()
                ]);

                // ایجاد نام یکتا
                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                
                // ذخیره در storage/app/public/avatars
                $path = $file->storeAs('avatars', $filename, 'public');
                
                // ذخیره فقط نام فایل در دیتابیس
                $user->avatar = $filename;
                $user->save();
                
                \Log::info('Avatar saved successfully', [
                    'filename' => $filename,
                    'path' => $path
                ]);
            }

            $user->assignRole($request->role);

            // بارگذاری مجدد کاربر با اطلاعات کامل
            $user = User::with('roles')
    ->find($user->id)
    ->append('avatar_url');

return response()->json($user, 201);

             
        } catch (\Exception $e) {
            \Log::error('User store error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $user = User::with('roles')
    ->findOrFail($id)
    ->append('avatar_url');

return response()->json($user);
            
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

     public function update(Request $request, $id)
{
    try {

        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'required|string|exists:roles,name',
        ]);


        $user->name = $request->name;
        $user->email = $request->email;


        // تغییر پسورد در صورت وارد شدن
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }


        // آپدیت عکس پروفایل
        if ($request->hasFile('avatar')) {

            $file = $request->file('avatar');

            \Log::info('User avatar upload - update', [
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


            // ساخت نام جدید برای عکس
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();


            // ذخیره در storage/app/public/avatars
            $path = $file->storeAs(
                'avatars',
                $filename,
                'public'
            );


            // ذخیره نام فایل در دیتابیس
            $user->avatar = $filename;


            \Log::info('New avatar saved', [
                'filename' => $filename,
                'path' => $path
            ]);
        }


        $user->save();


        // بروزرسانی رول
        $user->syncRoles([$request->role]);


        // دوباره گرفتن اطلاعات کامل همراه با avatar_url
        $user = User::with('roles')
            ->find($id)
            ->append('avatar_url');


        return response()->json($user);


    } catch (\Exception $e) {

        \Log::error('User update error: ' . $e->getMessage());

        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}
    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            
            // حذف آواتار
            if ($user->avatar) {
                $path = 'avatars/' . basename($user->avatar);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                    \Log::info('Avatar deleted for user: ' . $id);
                }
            }
            
            $user->delete();
            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}