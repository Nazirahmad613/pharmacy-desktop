<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful as Middleware;

class EnsureFrontendRequestsAreStateful extends Middleware
{
    /**
     * Determine if the request is from the first-party frontend.
     *
     * ❌ ما هیچ frontend stateful نداریم
     * ✅ فقط API + Bearer Token
     */
    protected function fromFrontend($request)
    {
        return false;
    }
}
