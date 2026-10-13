<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PayrollSetting extends Model
{
    protected $table = 'payroll_settings';

    public $timestamps = false;

    /*
    |--------------------------------------------------------------------------
    | Mass Assignment
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_type',
        'description',
        'updated_at',
    ];

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | ✅ Whitelist تنظیمات مجاز
    |--------------------------------------------------------------------------
    |
    | فقط این کلیدها از طریق updateMany قابل تغییر هستند.
    | اگر کلید جدیدی خواستی اضافه کنی، اینجا اضافه کن.
    |
    */

    public const ALLOWED_SETTINGS = [
        // ==== عمومی ====
        'currency'          => 'string',
        'payDay'            => 'number',

        // ==== مالیات و بیمه ====
        'taxRate'           => 'number',
        'insuranceRate'     => 'number',
        'enableTax'         => 'boolean',
        'enableInsurance'   => 'boolean',

        // ==== اضافه کاری ====
        'overtimeRate'      => 'number',
        'enableOvertime'    => 'boolean',

        // ==== کسورات ====
        'lateDeduction'     => 'number',
        'absenceDeduction'  => 'number',

        // ==== پرداخت ====
        'autoPayroll'       => 'boolean',
        'minSalary'         => 'number',
        'maxAdvancePercent' => 'number',
    ];

    /*
    |--------------------------------------------------------------------------
    | Cache Key
    |--------------------------------------------------------------------------
    */

    private const CACHE_KEY = 'payroll_settings_all';
    private const CACHE_TTL = 3600; // 1 ساعت

    /*
    |--------------------------------------------------------------------------
    | ✅ خواندن همه تنظیمات به صورت Array
    |--------------------------------------------------------------------------
    */

    public static function asObject(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $rows = static::all();
            $obj = [];

            foreach ($rows as $r) {
                $obj[$r->setting_key] = self::castValue($r->setting_value, $r->setting_type);
            }

            return $obj;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ خواندن یک تنظیم خاص
    |--------------------------------------------------------------------------
    */

    public static function get(string $key, $default = null)
    {
        $all = static::asObject();
        return $all[$key] ?? $default;
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ ذخیره یک تنظیم خاص
    |--------------------------------------------------------------------------
    */

    public static function set(
        string $key,
        $value,
        ?string $type = null,
        ?string $description = null
    ): void {
        // اگر نوع مشخص نشده، از whitelist بگیر
        if ($type === null) {
            $type = self::ALLOWED_SETTINGS[$key] ?? 'string';
        }

        // تبدیل به string برای ذخیره
        $stored = self::serializeValue($value, $type);

        static::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $stored,
                'setting_type'  => $type,
                'description'   => $description,
                'updated_at'    => now(),
            ]
        );

        // پاک کردن cache
        Cache::forget(self::CACHE_KEY);
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ به‌روزرسانی گروهی (فقط کلیدهای مجاز)
    |--------------------------------------------------------------------------
    */

    public static function updateMany(array $data): array
    {
        foreach ($data as $key => $value) {

            // ✅ فقط کلیدهای مجاز
            if (!array_key_exists($key, self::ALLOWED_SETTINGS)) {
                continue;
            }

            $type = self::ALLOWED_SETTINGS[$key];
            $stored = self::serializeValue($value, $type);

            static::updateOrCreate(
                ['setting_key' => $key],
                [
                    'setting_value' => $stored,
                    'setting_type'  => $type,
                    'updated_at'    => now(),
                ]
            );
        }

        // پاک کردن cache
        Cache::forget(self::CACHE_KEY);

        return static::asObject();
    }

    /*
    |--------------------------------------------------------------------------
    | 🔧 Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ تبدیل مقدار ذخیره‌شده به نوع اصلی
     */
    private static function castValue($value, string $type)
    {
        if ($value === null) return null;

        return match ($type) {
            'number'  => is_numeric($value) ? (float) $value : 0,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json'    => json_decode($value, true) ?: [],
            default   => (string) $value,
        };
    }

    /**
     * ✅ تبدیل مقدار به string برای ذخیره
     */
    private static function serializeValue($value, string $type): string
    {
        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return (string) $value;
    }

    /*
    |--------------------------------------------------------------------------
    | Boot - پاک کردن cache هنگام تغییر
    |--------------------------------------------------------------------------
    */

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget(self::CACHE_KEY));
        static::deleted(fn() => Cache::forget(self::CACHE_KEY));
    }
}