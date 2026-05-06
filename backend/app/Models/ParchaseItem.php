<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParchaseItem extends Model
{
    use HasFactory;

    protected $table = 'parchaseitems';
    protected $primaryKey = 'parchase_it_id';
    public $timestamps = false;

    protected $fillable = [
        'parchase_id',
        'med_id',
        'type',
        'category_id',
        'quantity',
        'unit_price',
        'total_price',
        'exp_date',
        'supplier_id', // اضافه شد
    ];

    public function parchase(): BelongsTo
    {
        return $this->belongsTo(Parchase::class, 'parchase_id', 'parchase_id');
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Registrations::class, 'supplier_id', 'reg_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }
}
