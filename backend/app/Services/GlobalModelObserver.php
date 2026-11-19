<?php

namespace App\Observers;

use App\Models\Log;
use App\Services\LogService;
use Illuminate\Database\Eloquent\Model;

class GlobalModelObserver
{
    /**
     * مدل‌هایی که نباید لاگ شوند
     * (جداول سیستمی، کش، نشست، صف و ...)
     */
    protected static array $skipModels = [
        Log::class,
        \Illuminate\Session\DatabaseSessionHandler::class,
        \Illuminate\Queue\Failed\FailedJobProviderInterface::class,
        \Spatie\Permission\Models\Permission::class,
        \Spatie\Permission\Models\Role::class,
    ];

    /**
     * نام کلاس‌هایی که نباید لاگ شوند (بر اساس basename)
     */
    protected static array $skipBasenames = [
        'Log',
        'Session',
        'Job',
        'FailedJob',
        'JobBatch',
        'Cache',
        'CacheLock',
        'PasswordResetToken',
        'PersonalAccessToken',
        'Migration',
    ];

    public function created(Model $model): void
    {
        $this->safeLog('created', $model);
    }

    public function updated(Model $model): void
    {
        $this->safeLog('updated', $model);
    }

    public function deleted(Model $model): void
    {
        $this->safeLog('deleted', $model);
    }

    /**
     * لاگ امن — هرگز باعث کرش نمی‌شود
     */
    protected function safeLog(string $event, Model $model): void
    {
        try {
            if (! $this->shouldLog($model)) {
                return;
            }

            LogService::logModelEvent($event, $model);
        } catch (\Throwable $e) {
            \Log::warning(
                "GlobalModelObserver failed on {$event} for " . get_class($model) . ': ' . $e->getMessage()
            );
        }
    }

    /**
     * بررسی اینکه آیا این Model باید لاگ شود
     */
    protected function shouldLog(Model $model): bool
    {
        // خود Log را لاگ نکن (جلوگیری از حلقه)
        if ($model instanceof Log) {
            return false;
        }

        $class    = get_class($model);
        $basename = class_basename($class);

        // بررسی کلاس‌های نادیده‌گرفته‌شده
        if (in_array($class, self::$skipModels, true)) {
            return false;
        }

        // بررسی نام کلاس
        if (in_array($basename, self::$skipBasenames, true)) {
            return false;
        }

        // در حین اجرای migration یا در console بدون auth، لاگ نکن
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            // فقط در صورت وجود کاربر لاگین‌شده یا درخواست HTTP لاگ کن
            if (! request()->hasHeader('User-Agent')) {
                // احتمالاً artisan command است
                // ولی برای اطمینان لاگ می‌کنیم — می‌توانید سخت‌گیرتر کنید
            }
        }

        return true;
    }
}