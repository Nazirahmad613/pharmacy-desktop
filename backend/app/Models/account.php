<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Account extends Model
{
    use HasFactory;

    protected $table = 'accounts';

    protected $fillable = [

        /*
        |--------------------------------------------------------------------------
        | اطلاعات اصلی
        |--------------------------------------------------------------------------
        */

        'account_code',
        'account_type',
        'name',
        'contact_person',

        /*
        |--------------------------------------------------------------------------
        | اطلاعات تماس
        |--------------------------------------------------------------------------
        */

        'phone',
        'mobile',
        'email',

        /*
        |--------------------------------------------------------------------------
        | اطلاعات هویتی
        |--------------------------------------------------------------------------
        */

        'tazkira_number',
        'tax_number',

        /*
        |--------------------------------------------------------------------------
        | آدرس
        |--------------------------------------------------------------------------
        */

        'country',
        'province',
        'district',
        'address',

        /*
        |--------------------------------------------------------------------------
        | اطلاعات مالی
        |--------------------------------------------------------------------------
        */

        'opening_balance',
        'credit_limit',

        /*
        |--------------------------------------------------------------------------
        | وضعیت
        |--------------------------------------------------------------------------
        */

        'status',
        'note',

        /*
        |--------------------------------------------------------------------------
        | کاربران
        |--------------------------------------------------------------------------
        */

        'created_by',
        'updated_by',
    ];

    protected $casts = [

        'opening_balance' => 'decimal:2',
        'credit_limit'    => 'decimal:2',
        'status'          => 'boolean',

    ];

    /*
    |--------------------------------------------------------------------------
    | Relations
    |--------------------------------------------------------------------------
    */

    /**
     * ایجاد کننده حساب
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * ویرایش کننده حساب
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /*
    |--------------------------------------------------------------------------
    | آینده
    |--------------------------------------------------------------------------
    | این Relation ها بعداً استفاده خواهند شد
    */

    public function purchases()
    {
        return $this->hasMany(Parchases::class, 'supplier_id');
    }

    public function sales()
    {
        return $this->hasMany(Sales::class, 'customer_id');
    }

    public function journals()
    {
        return $this->hasMany(Journal::class, 'account_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */

    public function getStatusNameAttribute()
    {
        return $this->status ? 'Active' : 'Inactive';
    }

    public function getDisplayNameAttribute()
    {
        return "{$this->account_code} - {$this->name}";
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    public function scopeSuppliers($query)
    {
        return $query->where('account_type', 'Supplier');
    }

    public function scopeCustomers($query)
    {
        return $query->where('account_type', 'Customer');
    }

    public function scopeInsurance($query)
    {
        return $query->where('account_type', 'Insurance');
    }

    public function scopeBanks($query)
    {
        return $query->where('account_type', 'Bank');
    }

    public function scopeCompanies($query)
    {
        return $query->where('account_type', 'Company');
    }

    public function scopeLaboratories($query)
    {
        return $query->where('account_type', 'Laboratory');
    }

    public function scopeRadiology($query)
    {
        return $query->where('account_type', 'Radiology');
    }
}