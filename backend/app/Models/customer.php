<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class customer extends Model
{
     use HasFactory;
    protected $primacyKey ='customer_id';

    protected $fillable = [
        'cust_id',  
        'cust_name',
        'cust_address',
        'cust_phone_num'

    ];
   


    public function Sales(){

        return $this->hasMany(Sales::class);


    }
      
 
      public function Prescriptions()
    {
        return $this->hasMany(Prescriptions::class,'cust_id','cust_id');
    }

  }



    

 
