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
     * ✅ بدون کش — تا تنظیمات بلافاصله در generateSalaries اثر بگذارد
     */
    public static function asObject(): array
    {
        $rows = static::all();
        $obj = [];

        foreach ($rows as $r) {
            $obj[$r->setting_key] = self::castValue($r->setting_value, $r->setting_type);
        }

        return $obj;
    }

    public static function updateMany(array $data): array
    {
        foreach ($data as $key => $value) {
            // فقط کلیدهای مجاز
            if (!array_key_exists($key, self::ALLOWED_SETTINGS)) {
                continue;
            }

            $type = self::ALLOWED_SETTINGS[$key];
            $stored = self::serializeValue($value, $type);

            static::updateOrCreate(
                ['setting_key' => $key],
                [
                    'setting_value' => $stored,
                    'setting_type'  => $type,   // ✅ همیشه تنظیم شود
                    'updated_at'    => now(),
                ]
            );
        }

        return static::asObject();
    }

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
}