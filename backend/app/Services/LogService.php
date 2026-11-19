<?php

namespace App\Services;

use App\Models\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogService
{
    /**
     * ثبت لاگ با مقادیر ورودی
     */
    public static function create(
        string $action,
        ?string $model = null,
        $modelId = null,
        ?string $description = null,
        $data = null
    ): ?Log {
        try {
            return Log::create([
                'user_id'     => Auth::id(),
                'action'      => $action,
                'model'       => $model,
                'model_id'    => $modelId,
                'description' => $description,
                'data'        => $data,
                'ip'          => Request::ip(),
            ]);
        } catch (\Throwable $e) {
            // هرگز نگذار لاگ‌گیری باعث کرش اپ شود
            \Log::warning('LogService failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * لاگ خودکار از رویدادهای Model (create/update/delete)
     */
    public static function logModelEvent(string $event, $model): void
    {
        // از لاگ کردن خود Log جلوگیری کن
        if ($model instanceof Log) {
            return;
        }

        $modelClass = get_class($model);
        $modelName  = class_basename($modelClass);

        $descriptions = [
            'created' => "ایجاد {$modelName}",
            'updated' => "ویرایش {$modelName}",
            'deleted' => "حذف {$modelName}",
        ];

        $data = null;
        if ($event === 'created') {
            $data = $model->getAttributes();
        } elseif ($event === 'updated') {
            $data = $model->getChanges();
            unset($data['updated_at']);
        } elseif ($event === 'deleted') {
            $data = $model->getOriginal();
        }

        // پاک‌سازی فیلدهای حساس
        if (is_array($data)) {
            $sensitive = ['password', 'remember_token', 'api_token', 'two_factor_secret'];
            foreach ($sensitive as $field) {
                if (array_key_exists($field, $data)) {
                    $data[$field] = '***';
                }
            }
        }

        self::create(
            action: $event,
            model: $modelClass,
            modelId: $model->getKey(),
            description: $descriptions[$event] ?? $event,
            data: $data,
        );
    }
}