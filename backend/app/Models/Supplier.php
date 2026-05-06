<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
 
 
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    protected $primaryKey = 'supplier_id';

    protected $fillable = [
        'name',
        'cont_person',
        'phone_num',
        'email',
        'address',
    ];




    
    public function medications(): HasMany
    {
        return $this->hasMany(Medication::class, 'supplier_id', 'supplier_id');
    }

    public function parchaseItems(): HasMany
    {
        return $this->hasMany(ParchaseItem::class, 'supplier_id', 'supplier_id');
    }
    public function prescriptionItem(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class, 'supplier_id', 'supplier_id');
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(Inventory::class, 'supplier_id', 'supplier_id');
    }
}