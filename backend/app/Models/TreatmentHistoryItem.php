<?php
// app/Models/TreatmentHistoryItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TreatmentHistoryItem extends Model
{
    protected $table = 'treatment_history_items';
    protected $primaryKey = 'id';

    protected $fillable = [
        'history_id',
        'reg_id',
        'step_key',
        'step_label',
        'step_icon',
        'step_order',
        'step_at',
        'ref_id',
        'ref_table',
        'status',
        'summary',
        'amount',
        'paid_amount',
        'barcode',
        'pdf_file',
        'data',
        'performed_by',
        'performed_by_name',
    ];

    protected $casts = [
        'data'      => 'array',
        'step_at'   => 'datetime',
        'amount'    => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function history()
    {
        return $this->belongsTo(TreatmentHistory::class, 'history_id', 'history_id');
    }
}