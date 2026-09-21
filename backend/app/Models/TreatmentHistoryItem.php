<?php
// app/Models/TreatmentHistoryItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TreatmentHistoryItem extends Model
{
    use SoftDeletes;

    protected $table = 'treatment_history_items';

    protected $fillable = [
        'history_id',
        'step_key',
        'step_label',
        'action_type',
        'step_order',
        'ref_id',
        'ref_table',
        'data',
        'summary',
        'amount',
        'paid_amount',
        'payment_status',
        'status',
        'status_label',
        'pdf_file',
        'barcode',
        'step_at',
        'performed_by',
        'performed_by_name',
    ];

    protected $casts = [
        'data' => 'array',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'step_at' => 'datetime',
    ];

    public function history()
    {
        return $this->belongsTo(TreatmentHistory::class, 'history_id', 'history_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}