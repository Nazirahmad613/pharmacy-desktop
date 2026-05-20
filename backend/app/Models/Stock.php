<?php
// app/Models/Stock.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Stock extends Model
{
    use HasFactory;

    protected $table = 'stock';
    protected $primaryKey = 'stock_id';

    protected $fillable = [
        'med_id',
        'supplier_id',
        'type',
        'exp_date',
        'quantity',
        'batch_number',
        'purchase_price'
    ];

    protected $casts = [
        'exp_date' => 'date',
        'quantity' => 'integer',
        'purchase_price' => 'decimal:2'
    ];

    public function medication()
    {
        return $this->belongsTo(Medication::class, 'med_id', 'med_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Registrations::class, 'supplier_id', 'reg_id');
    }

    public function purchaseItem()
    {
        return $this->belongsTo(ParchaseItem::class, 'med_id', 'med_id')
                    ->whereColumn('stock.supplier_id', 'parchaseitems.supplier_id')
                    ->whereColumn('stock.exp_date', 'parchaseitems.exp_date')
                    ->whereColumn('stock.type', 'parchaseitems.type');
    }

    public function getTypeNameAttribute()
    {
        $types = [
            'tablet' => 'قرص',
            'capsule' => 'کپسول',
            'syrup' => 'شربت',
            'injection' => 'آمپول',
            'ointment' => 'پماد',
            'drop' => 'قطره',
            'inhaler' => 'اسپری',
            'cream' => 'کرم',
            'gel' => 'ژل',
            'suppository' => 'شیاف',
            'solution' => 'محلول',
            'suspension' => 'سوسپانسیون',
            'powder' => 'پودر',
            'medical_device' => 'تجهیزات پزشکی',
            'consumable' => 'مصرفی',
            'equipment' => 'دستگاه',
            'other' => 'سایر',
        ];
        
        return $types[$this->type] ?? $this->type ?? 'نامشخص';
    }

    public function getMedicationNameAttribute()
    {
        if ($this->medication) {
            return $this->medication->gen_name ?? $this->medication->brand_name ?? $this->medication->name ?? 'نامشخص';
        }
        return 'نامشخص';
    }

    public function getSupplierNameAttribute()
    {
        if ($this->supplier) {
            return $this->supplier->full_name ?? $this->supplier->reg_name ?? 'نامشخص';
        }
        return 'نامشخص';
    }

    public function getStatusAttribute()
    {
        if ($this->quantity <= 0) return 'ناموجود';
        
        $today = now();
        $expDate = $this->exp_date;
        
        if ($today->greaterThan($expDate)) return 'منقضی شده';
        if ($today->diffInDays($expDate) <= 7) return 'در حال انقضا (فوری)';
        if ($today->diffInDays($expDate) <= 30) return 'در حال انقضا';
        if ($this->quantity <= 5) return 'موجودی کم';
        
        return 'موجود';
    }

    public function getStatusColorAttribute()
    {
        if ($this->quantity <= 0) return 'gray';
        
        $today = now();
        $expDate = $this->exp_date;
        
        if ($today->greaterThan($expDate)) return 'red';
        if ($today->diffInDays($expDate) <= 7) return 'orange';
        if ($today->diffInDays($expDate) <= 30) return 'yellow';
        if ($this->quantity <= 5) return 'orange';
        
        return 'green';
    }

    public function getDaysLeftAttribute()
    {
        if (!$this->exp_date) return null;
        
        $today = now();
        $expDate = $this->exp_date;
        
        if ($today->greaterThan($expDate)) return 0;
        
        return (int) $today->diffInDays($expDate);
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeExpiring($query, $days = 30)
    {
        return $query->where('exp_date', '<=', now()->addDays($days))
                     ->where('exp_date', '>=', now())
                     ->where('quantity', '>', 0);
    }

    public function scopeExpired($query)
    {
        return $query->where('exp_date', '<', now())
                     ->where('quantity', '>', 0);
    }

    public function scopeLowStock($query, $threshold = 10)
    {
        return $query->where('quantity', '<=', $threshold)
                     ->where('quantity', '>', 0);
    }
}