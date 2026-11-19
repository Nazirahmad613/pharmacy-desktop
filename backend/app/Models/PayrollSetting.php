<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollSetting extends Model
{
    protected $table = 'payroll_settings';

    public $timestamps = false;

    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_type',
        'description',
        'updated_at',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    /**
     * کلیدهای مجاز و نوع هرکدام
     * هر تنظیمی که اینجا نباشد در updateMany نادیده گرفته می‌شود.
     */
    public const ALLOWED_SETTINGS = [
        'currency'          => 'string',
        'payDay'            => 'number',
        'taxRate'           => 'number',
        'insuranceRate'     => 'number',
        'enableTax'         => 'boolean',
        'enableInsurance'   => 'boolean',
        'overtimeRate'      => 'number',
        'enableOvertime'    => 'boolean',
        'lateDeduction'     => 'number',
        'absenceDeduction'  => 'number',
        'autoPayroll'       => 'boolean',
        'minSalary'         => 'number',
        'maxAdvancePercent' => 'number',
    ];

    /**
     * همه تنظیمات به‌صورت آبجکت با نوع درست
     * بدون کش — تا تنظیمات بلافاصله در generateSalaries اثر بگذارد
     */
    public static function asObject(): array
    {
        $obj = [];

        foreach (static::all() as $row) {
            $obj[$row->setting_key] = self::castValue(
                $row->setting_value,
                $row->setting_type
            );
        }

        return $obj;
    }

    /**
     * به‌روزرسانی گروهی تنظیمات
     * فقط کلیدهای موجود در ALLOWED_SETTINGS پذیرفته می‌شوند.
     */
    public static function updateMany(array $data): array
    {
        foreach ($data as $key => $value) {
            if (! array_key_exists($key, self::ALLOWED_SETTINGS)) {
                continue;
            }

            $type   = self::ALLOWED_SETTINGS[$key];
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

        return static::asObject();
    }

    /**
     * تبدیل مقدار ذخیره‌شده به نوع صحیح
     */
    private static function castValue(mixed $value, ?string $type): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'number'  => is_numeric($value) ? (float) $value : 0.0,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json'    => self::safeJsonDecode($value),
            default   => (string) $value,
        };
    }

    /**
     * تبدیل مقدار به رشته برای ذخیره در دیتابیس
     */
    private static function serializeValue(mixed $value, string $type): string
    {
        if (is_array($value) || is_object($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE) ?: 'null';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if ($value === null) {
            return '';
        }

        return (string) $value;
    }

    /**
     * دیکد امن JSON — در صورت خطا آرایه‌ی خالی برمی‌گرداند
     */
    private static function safeJsonDecode(string $value): array
    {
        $decoded = json_decode($value, true);

        return (json_last_error() === JSON_ERROR_NONE && is_array($decoded))
            ? $decoded
            : [];
    }
}