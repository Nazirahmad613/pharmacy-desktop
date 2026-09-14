<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockSale extends Model
{
    protected $table = 'stock_sales';
    protected $primaryKey = 'sale_id';

    protected $fillable = [
        'stock_id',
        'pres_it_id',
        'pres_id',
        'med_id',
        'supplier_id',
        'purchase_item_id',
        'barcode',
        'batch_number',
        'exp_date',
        'quantity_sold',
        'unit_price',
        'total_price',
        'sold_at',
    ];

    protected $casts = [
        'quantity_sold' => 'integer',
        'unit_price'    => 'decimal:2',
        'total_price'   => 'decimal:2',
        'exp_date'      => 'date',
        'sold_at'       => 'datetime',
    ];
}