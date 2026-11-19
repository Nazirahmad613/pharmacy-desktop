<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\LogService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

class AuthEventListener
{
    /**
     * لاگ ورود موفق
     */
    public function handleLogin(Login $event): void
    {
        try {
            /** @var User $user */
            $user = $event->user;

            if (! $user) {
                return;
            }

            LogService::create(
                action: 'login',
                model: User::class,
                modelId: $user->id,
                description: "ورود کاربر {$user->name}",
                data: ['guard' => $event->guard, 'remember' => $event->remember],
            );
        } catch (\Throwable $e) {
            \Log::warning('AuthEventListener@handleLogin failed: ' . $e->getMessage());
        }
    }

    /**
     * لاگ خروج
     */
    public function handleLogout(Logout $event): void
    {
        try {
            /** @var User|null $user */
            $user = $event->user;

            if (! $user) {
                return;
            }

            LogService::create(
                action: 'logout',
                model: User::class,
                modelId: $user->id,
                description: "خروج کاربر {$user->name}",
                data: ['guard' => $event->guard],
            );
        } catch (\Throwable $e) {
            \Log::warning('AuthEventListener@handleLogout failed: ' . $e->getMessage());
        }
    }

    /**
     * لاگ تلاش ناموفق ورود
     */
    public function handleFailed(Failed $event): void
    {
        try {
            LogService::create(
                action: 'login_failed',
                model: User::class,
                modelId: null,
                description: "تلاش ناموفق برای ورود: {$event->email}",
                data: [
                    'guard' => $event->guard,
                    'email' => $event->email,
                ],
            );
        } catch (\Throwable $e) {
            \Log::warning('AuthEventListener@handleFailed failed: ' . $e->getMessage());
        }
    }
}