<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesView extends Model
{
    // نام ویو در دیتابیس
    protected $table = 'view_sales_summary';

    // چون View است، primary key واقعی ندارد
    protected $primaryKey = 'id';

    // اتو اینکریمنت ندارد
    public $incrementing = false;

    // timestamp ندارد
    public $timestamps = false;

    // چون View فقط برای خواندن است
    protected $guarded = [];

    /*
    |--------------------------------------------------------------------------
    | اگر خواستی relation هم اضافه کنی (اختیاری)
    |--------------------------------------------------------------------------
    */

    public function customer()
    {
        return $this->belongsTo(Registration::class, 'cust_id', 'reg_id');
    }

    public function doctor()
    {
        return $this->belongsTo(Registration::class, 'doc_id', 'reg_id');
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}