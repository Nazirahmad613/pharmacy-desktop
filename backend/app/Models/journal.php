<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Journal extends Model
{
    use HasFactory;

    protected $table = 'journals';

    protected $fillable = [
        'journal_date',
        'description',
        'entry_type',
        'amount',
        'tazkira_number',
        'ref_type',
        'ref_id',
        'user_id',
        'pres_num',
        'pres_id',
        'doc_id',
        'cust_id',
        'supplier_id',
        'med_id',
        'parchase_id',
    ];

    protected $casts = [
        'journal_date' => 'date',
        'amount'       => 'decimal:2',
    ];

    public const ENTRY_DEBIT  = 'debit';
    public const ENTRY_CREDIT = 'credit';

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function registration()
    {
        return $this->belongsTo(
            Registrations::class,
            'ref_id',
            'reg_id'
        );
    }

    public function scopeDebit($query)
    {
        return $query->where('entry_type', self::ENTRY_DEBIT);
    }

    public function scopeCredit($query)
    {
        return $query->where('entry_type', self::ENTRY_CREDIT);
    }

    public function getBalanceAttribute(): float
    {
        return $this->entry_type === self::ENTRY_CREDIT
            ? $this->amount
            : -$this->amount;
    }
}
