<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'sales_id',
        'amount',
        'payment_date',
        'payment_method',
        'note'
    ];

    public function sale()
    {
        return $this->belongsTo(Sales::class);
    }
}
