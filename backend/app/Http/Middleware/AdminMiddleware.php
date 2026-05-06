<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next, $permission = null)
{
    $user = auth()->user();

    if (!$user) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    // اگر permission مشخص شده
    if ($permission && !$user->can($permission)) {
        return response()->json([
            'message' => 'دسترسی ندارید'
        ], 403);
    }

    return $next($request);
}
}