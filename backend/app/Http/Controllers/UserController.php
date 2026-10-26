<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    // ================== Helper: بررسی ادمین ==================
    private function isAdmin(?User $user): bool
    {
        if (!$user) return false;

        // ✅ بررسی از طریق Spatie roles
        try {
            if ($user->hasAnyRole([
                'admin',
                'super_admin',
                'administrator',
                'Admin',
                'Super_Admin',
                'SuperAdmin',
            ])) {
                return true;
            }
        } catch (\Throwable $e) {
            \Log::warning('isAdmin hasAnyRole failed: ' . $e->getMessage());
        }

        // ✅ بررسی از طریق فیلد role در جدول users
        $rawRole = strtolower(trim((string) ($user->role ?? '')));
        if (in_array($rawRole, ['admin', 'super_admin', 'superadmin', 'administrator'], true)) {
            return true;
        }

        // ✅ بررسی از طریق آرایه role_names اگر وجود دارد
        if (isset($user->role_names) && is_array($user->role_names)) {
            $normalized = array_map(fn($r) => strtolower(trim((string) $r)), $user->role_names);
            if (!empty(array_intersect($normalized, ['admin', 'super_admin', 'superadmin', 'administrator']))) {
                return true;
            }
        }

        // ✅ بررسی از طریق getRoleNames (Spatie)
        try {
            $roleNames = $user->getRoleNames()
                ->map(fn($r) => strtolower(trim((string) $r)))
                ->toArray();
            if (!empty(array_intersect($roleNames, ['admin', 'super_admin', 'superadmin', 'administrator']))) {
                return true;
            }
        } catch (\Throwable $e) {
            \Log::warning('isAdmin getRoleNames failed: ' . $e->getMessage());
        }

        return false;
    }

    // ================== Helper: پاسخ 403 ==================
    private function forbidden(string $message = 'شما مجاز به انجام این عملیات نیستید')
    {
        return response()->json(['message' => $message], 403);
    }

    // ================== Helper: بارگذاری کامل کاربر ==================
    private function loadUser($id): User
    {
        return User::with(['roles', 'department'])
            ->findOrFail($id)
            ->append(['avatar_url', 'role_name']);
    }

    // ============================================================
    //  لیست کاربران
    // ============================================================
    public function index(Request $request)
    {
        try {
            $authUser = $request->user();
            if (!$authUser) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // ✅ لاگ تشخیصی (اختیاری، برای دیباگ)
            \Log::info('User index called', [
                'user_id'      => $authUser->id,
                'role_field'   => $authUser->role ?? null,
                'roles'        => $authUser->getRoleNames()->toArray(),
                'is_admin'     => $this->isAdmin($authUser),
            ]);

            // ⛔ hospital_head نباید به لیست کاربران دسترسی داشته باشد
            if ($authUser->hasRole('hospital_head') && !$this->isAdmin($authUser)) {
                return $this->forbidden('شما فقط اجازه مشاهده گزارش‌ها را دارید');
            }

            // ✅ اگر ادمین نیست → فقط خودش را ببیند
            if (!$this->isAdmin($authUser)) {
                $self = $this->loadUser($authUser->id);
                return response()->json([$self]);
            }

            // ===== ادمین: فیلترها =====
            $query = User::with(['roles', 'department']);

            if ($request->filled('role')) {
                $roleName = $request->role;
                $query->whereHas('roles', function ($q) use ($roleName) {
                    $q->where('name', $roleName)
                      ->orWhere('name', strtolower($roleName))
                      ->orWhere('name', ucfirst($roleName));
                });
            }

            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('tazkira_number', 'like', "%{$search}%");
                });
            }

            $users = $query->get()->append(['avatar_url', 'role_name']);

            return response()->json($users);
        } catch (\Exception $e) {
            \Log::error('User index error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    //  ساخت کاربر جدید (فقط ادمین)
    // ============================================================
    public function store(Request $request)
    {
        try {
            $authUser = $request->user();
            if (!$authUser) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // ⛔ فقط ادمین می‌تواند کاربر جدید بسازد
            if (!$this->isAdmin($authUser)) {
                return $this->forbidden('فقط ادمین می‌تواند کاربر جدید ایجاد کند');
            }

            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:6',
                'role' => 'required|string|exists:roles,name',
                'department_id' => 'nullable|exists:departments,id',
                'tazkira_number' => 'nullable|string|max:50|unique:users,tazkira_number',
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'department_id' => $request->department_id ?: null,
                'role' => $request->role,
                'tazkira_number' => $request->tazkira_number ?: null,
            ]);

            // ذخیره آواتار
            if ($request->hasFile('avatar')) {
                $file = $request->file('avatar');

                \Log::info('User avatar upload - store', [
                    'user_id' => $user->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                ]);

                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('avatars', $filename, 'public');

                $user->avatar = $filename;
                $user->save();
            }

            $user->assignRole($request->role);

            $user = $this->loadUser($user->id);

            return response()->json($user, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('User store error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    //  نمایش یک کاربر
    // ============================================================
    public function show(Request $request, $id)
    {
        try {
            $authUser = $request->user();
            if (!$authUser) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            if ($authUser->hasRole('hospital_head') && !$this->isAdmin($authUser)) {
                return $this->forbidden('شما فقط اجازه مشاهده گزارش‌ها را دارید');
            }

            // ⛔ کاربر عادی فقط خودش را می‌بیند
            if (!$this->isAdmin($authUser) && (int) $authUser->id !== (int) $id) {
                return $this->forbidden('شما فقط می‌توانید اطلاعات حساب خودتان را ببینید');
            }

            $user = $this->loadUser($id);

            return response()->json($user);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'کاربر یافت نشد'], 404);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    //  ویرایش کاربر
    // ============================================================
    public function update(Request $request, $id)
    {
        try {
            $authUser = $request->user();
            if (!$authUser) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // ⛔ hospital_head نباید بتواند ویرایش کند
            if ($authUser->hasRole('hospital_head') && !$this->isAdmin($authUser)) {
                return $this->forbidden('شما فقط اجازه مشاهده گزارش‌ها را دارید');
            }

            $user = User::findOrFail($id);

            $isAdmin = $this->isAdmin($authUser);
            $isSelf = (int) $authUser->id === (int) $user->id;

            // ⛔ نه ادمین است نه خودش → 403
            if (!$isAdmin && !$isSelf) {
                return $this->forbidden('شما فقط می‌توانید اطلاعات حساب خودتان را ویرایش کنید');
            }

            // ✅ قوانین اعتبارسنجی
            $rules = [
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email,' . $id,
                'password' => 'nullable|string|min:6|confirmed',
                'tazkira_number' => 'nullable|string|max:50|unique:users,tazkira_number,' . $id,
            ];

            // فقط ادمین می‌تواند role و department_id را تغییر دهد
            if ($isAdmin) {
                $rules['role'] = 'required|string|exists:roles,name';
                $rules['department_id'] = 'nullable|exists:departments,id';
            }

            $request->validate($rules);

            // ===== فیلدهای مشترک =====
            $user->name = $request->name;
            $user->email = $request->email;
            $user->tazkira_number = $request->tazkira_number ?: null;

            // ===== فقط ادمین: role و department_id =====
            if ($isAdmin) {
                $user->role = $request->role;
                $user->department_id = $request->department_id ?: null;
            }
            // کاربر عادی نمی‌تواند role/department خود را تغییر دهد (نادیده گرفته می‌شود)

            // تغییر پسورد
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            // آپدیت عکس پروفایل
            if ($request->hasFile('avatar')) {
                $file = $request->file('avatar');

                if ($user->avatar) {
                    $oldPath = 'avatars/' . basename($user->avatar);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $file->storeAs('avatars', $filename, 'public');

                $user->avatar = $filename;
            }

            $user->save();

            // ===== فقط ادمین: syncRoles =====
            if ($isAdmin && $request->filled('role')) {
                $user->syncRoles([$request->role]);
            }

            $user = $this->loadUser($id);

            return response()->json($user);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'کاربر یافت نشد'], 404);
        } catch (\Exception $e) {
            \Log::error('User update error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ============================================================
    //  حذف کاربر (فقط ادمین، و نه خودش)
    // ============================================================
    public function destroy(Request $request, $id)
    {
        try {
            $authUser = $request->user();
            if (!$authUser) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // ⛔ فقط ادمین
            if (!$this->isAdmin($authUser)) {
                return $this->forbidden('فقط ادمین می‌تواند کاربر حذف کند');
            }

            $user = User::findOrFail($id);

            // ⛔ ادمین نتواند خودش را حذف کند
            if ((int) $authUser->id === (int) $user->id) {
                return $this->forbidden('نمی‌توانید حساب خودتان را حذف کنید');
            }

            if ($user->avatar) {
                $path = 'avatars/' . basename($user->avatar);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            }

            $user->delete();

            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'کاربر یافت نشد'], 404);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}