<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * لیست همه کاربران همراه با نقش و بخش
     */
    public function index(Request $request)
    {
        try {
            $query = User::with(['roles', 'department:id,name,code']);

            // فیلتر بر اساس بخش
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // فیلتر بر اساس نقش
            if ($request->filled('role')) {
                $query->role($request->role);
            }

            // جستجو
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $users = $query->get()->append('avatar_url');

            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('User index error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * لیست داکتران یک بخش خاص (برای dropdown انتخاب داکتر)
     */
    public function doctorsByDepartment($departmentId)
    {
        try {
            $doctors = User::with(['roles', 'department:id,name,code'])
                ->role('doctor')
                ->where('department_id', $departmentId)
                ->get()
                ->append('avatar_url');

            return response()->json($doctors);
        } catch (\Exception $e) {
            Log::error('Doctors by department error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * ذخیره کاربر جدید
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name'          => 'required|string|max:255',
                'email'         => 'required|string|email|max:255|unique:users',
                'password'      => 'required|string|min:6',
                'role'          => 'required|string|exists:roles,name',
                'department_id' => 'nullable|integer|exists:departments,id',
                'avatar'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            ]);

            DB::beginTransaction();

            $user = User::create([
                'name'          => $request->name,
                'email'         => $request->email,
                'password'      => Hash::make($request->password),
                'department_id' => $request->department_id,
            ]);

            // ذخیره آواتار
            if ($request->hasFile('avatar')) {
                $user->avatar = $this->uploadAvatar($request->file('avatar'));
                $user->save();
            }

            $user->assignRole($request->role);

            DB::commit();

            $user = User::with(['roles', 'department:id,name,code'])
                ->find($user->id)
                ->append('avatar_url');

            return response()->json([
                'message' => 'کاربر با موفقیت ایجاد شد',
                'user'    => $user
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('User store error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * نمایش یک کاربر
     */
    public function show($id)
    {
        try {
            $user = User::with(['roles', 'department:id,name,code'])
                ->findOrFail($id)
                ->append('avatar_url');

            return response()->json($user);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * بروزرسانی کاربر
     */
    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            $request->validate([
                'name'          => 'required|string|max:255',
                'email'         => [
                    'required', 'string', 'email', 'max:255',
                    Rule::unique('users', 'email')->ignore($id)
                ],
                'password'      => 'nullable|string|min:6',
                'role'          => 'required|string|exists:roles,name',
                'department_id' => 'nullable|integer|exists:departments,id',
                'avatar'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            ]);

            DB::beginTransaction();

            $user->name = $request->name;
            $user->email = $request->email;
            $user->department_id = $request->department_id;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            // آپدیت آواتار
            if ($request->hasFile('avatar')) {
                // حذف عکس قبلی
                if ($user->avatar) {
                    $oldPath = 'avatars/' . basename($user->avatar);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                $user->avatar = $this->uploadAvatar($request->file('avatar'));
            }

            $user->save();

            // بروزرسانی نقش
            $user->syncRoles([$request->role]);

            DB::commit();

            $user = User::with(['roles', 'department:id,name,code'])
                ->find($id)
                ->append('avatar_url');

            return response()->json([
                'message' => 'کاربر با موفقیت بروزرسانی شد',
                'user'    => $user
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('User update error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * حذف کاربر
     */
    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);

            // حذف آواتار
            if ($user->avatar) {
                $path = 'avatars/' . basename($user->avatar);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $user->delete();

            return response()->json(['message' => 'کاربر با موفقیت حذف شد']);
        } catch (\Exception $e) {
            Log::error('User destroy error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * آپلود آواتار
     */
    private function uploadAvatar($file): string
    {
        $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $file->storeAs('avatars', $filename, 'public');

        Log::info('Avatar uploaded', [
            'filename' => $filename,
            'size'     => $file->getSize(),
        ]);

        return $filename;
    }
}