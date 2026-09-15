<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $table = 'stock';
    protected $primaryKey = 'stock_id';

    protected $fillable = [
        'med_id',
        'supplier_id',
        'batch_number',
        'exp_date',
        'quantity',
        'type',
        'purchase_price',
        'selling_price',
        'purchase_item_id',
    ];

    protected $casts = [
        'exp_date'       => 'datetime',
        'quantity'       => 'integer',
        'purchase_price' => 'decimal:2',
        'selling_price'  => 'decimal:2',
    ];

    // روابط
    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Account::class, 'supplier_id', 'id');
    }
}