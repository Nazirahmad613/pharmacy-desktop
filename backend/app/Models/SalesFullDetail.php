<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesFullDetail extends Model
{
    protected $table = 'sales_full_details'; // نام ویو
    public $timestamps = false;
    protected $guarded = [];
    public $incrementing = false;
    protected $primaryKey = null; // ویو کلید ندارد
}
