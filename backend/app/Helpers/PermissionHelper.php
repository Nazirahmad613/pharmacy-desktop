<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Auth;

class PermissionHelper
{
    /**
     * بررسی دسترسی کاربر به یک پرمیشن خاص
     */
    public static function can($permission)
    {
        return Auth::check() && Auth::user()->can($permission);
    }
    
    /**
     * بررسی دسترسی کاربر به چند پرمیشن (حداقل یکی)
     */
    public static function canAny($permissions)
    {
        if (!Auth::check()) return false;
        
        foreach ($permissions as $permission) {
            if (Auth::user()->can($permission)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * بررسی دسترسی کاربر به همه پرمیشن‌ها
     */
    public static function canAll($permissions)
    {
        if (!Auth::check()) return false;
        
        foreach ($permissions as $permission) {
            if (!Auth::user()->can($permission)) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * بررسی اینکه کاربر ادمین است
     */
    public static function isAdmin()
    {
        return Auth::check() && (Auth::user()->isAdmin() || Auth::user()->isSuperAdmin());
    }
}