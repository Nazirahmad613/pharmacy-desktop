<?php

 

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Log extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'model',
        'model_id',
        'description',
        'data',
        'ip'
    ];

    protected $casts = [
        'data' => 'array',
    ];


    public function user()
{
    return $this->belongsTo(User::class);
}
}

 
