<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckPermission
{
    public function handle(Request $request, Closure $next, $permission)
    {
        if (!auth()->user() || !auth()->user()->can($permission)) {
            abort(403, 'شما دسترسی لازم برای این بخش را ندارید.');
        }
        
        return $next($request);
    }
}