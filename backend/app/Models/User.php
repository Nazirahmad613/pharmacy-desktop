<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    // ✅ گارد sanctum برای هماهنگی با Sanctum
    protected $guard_name = 'sanctum';

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar', // اضافه شدن فیلد عکس
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    // ✅ اضافه کردن role به appends تا در JSON خروجی قرار گیرد
    protected $appends = ['role'];

    const ROLE_SUPER_ADMIN = 'super-admin';
    const ROLE_ADMIN = 'admin';
    const ROLE_HOSPITAL_HEAD = 'head-of-hospital';
    const ROLE_DOCTOR = 'doctor';
    const ROLE_PHARMACIST = 'pharmacist';
    const ROLE_NURSE = 'nurse';
    const ROLE_USER = 'user';
    const ROLE_EMPLOYEES = 'employees';

    public static function getRoles(): array
    {
        return [
            self::ROLE_SUPER_ADMIN => 'سوپر ادمین',
            self::ROLE_ADMIN => 'ادمین',
            self::ROLE_HOSPITAL_HEAD => 'رئیس عمومی شفاخانه',
            self::ROLE_DOCTOR => 'داکتر',
            self::ROLE_PHARMACIST => 'مسئول دواخانه',
            self::ROLE_NURSE => 'نرس',
            self::ROLE_USER => 'کاربر عادی',
            self::ROLE_EMPLOYEES => 'کارمندان',
        ];
    }

    /**
     * اکسسور role - مقدار فیلد role در دیتابیس را نادیده گرفته
     * و نقش واقعی کاربر را برمی‌گرداند
     */
    public function getRoleAttribute(): string
    {
        if ($this->roles->isNotEmpty()) {
            return $this->roles->first()->name;
        }
        return 'user'; // نقش پیش‌فرض
    }

    /**
     * اکسسور role_name (برای نمایش چند نقش در صورت وجود)
     */
    public function getRoleNameAttribute(): string
    {
        if ($this->roles->isNotEmpty()) {
            return $this->roles->pluck('name')->join('، ');
        }
        return 'بدون نقش';
    }

    /**
     * اکسسور avatar_url - آدرس کامل عکس پروفایل
     */
       public function getAvatarUrlAttribute(): string
    {
        // اگر avatar وجود داشته باشد
        if ($this->avatar) {
            // چک کردن اینکه آیا آدرس کامل است یا نسبی
            if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
                return $this->avatar;
            }
            
            // اگر فایل در استوریج وجود دارد
            $avatarPath = storage_path('app/public/' . $this->avatar);
            if (file_exists($avatarPath)) {
                return asset('storage/' . $this->avatar);
            }
        }
        
        // اگر عکس وجود نداشت، از ui-avatars استفاده کن
        return 'https://ui-avatars.com/api/?background=0D8F81&color=fff&name=' . urlencode($this->name);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'doc_id', 'id');
    }

     public function sales(){

      return $this->hasMany(Sales::class, 'created_by', 'id');
     }
}