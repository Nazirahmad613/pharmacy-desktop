<?php

namespace App\Services;

 
use App\Models\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class LogService
{
    public static function create($action, $model = null, $modelId = null, $description = null, $data = null)
    {
        Log::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'model' => $model,
            'model_id' => $modelId,
            'description' => $description,
            'data' => $data,
            'ip' => Request::ip(),
        ]);
    }
}
 
