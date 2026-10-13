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
    ];

    /**
     * همه تنظیمات به‌صورت آبجکت با نوع درست
     */
    public static function asObject(): array
    {
        $rows = static::all();
        $obj = [];

        foreach ($rows as $r) {
            $val = $r->setting_value;

            switch ($r->setting_type) {
                case 'number':
                    $val = (float) $val;
                    break;
                case 'boolean':
                    $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                    break;
                case 'json':
                    $val = json_decode($val, true);
                    break;
                default:
                    $val = (string) $val;
            }

            $obj[$r->setting_key] = $val;
        }

        return $obj;
    }

    /**
     * به‌روزرسانی گروهی
     */
    public static function updateMany(array $data): array
    {
        foreach ($data as $key => $value) {
            $strValue = is_array($value) || is_object($value)
                ? json_encode($value)
                : (is_bool($value) ? ($value ? 'true' : 'false') : (string) $value);

            static::updateOrCreate(
                ['setting_key' => $key],
                [
                    'setting_value' => $strValue,
                    'updated_at'    => now(),
                ]
            );
        }

        return static::asObject();
    }
}