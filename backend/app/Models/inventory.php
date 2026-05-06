<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class inventory extends Model
{
    


    public function medications()
    {
        return $this->belongsTo(Medicine::class, 'medicine_id');
    }
    
    public function suppliers()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
    
















protected $primaryKey = 'invent_id';

 protected $fillable = ['supplier_id', 'med_id'];
  

    public function supplier(){

        return $this->belongsTo(supplier::class,'supplier_id', 'supplier_id');


    }

    public function Medication(){

        return $this->belongsTo(Medication::class,'med_id', 'med_id');


    }

}
