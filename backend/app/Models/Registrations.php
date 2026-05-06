<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Journal;
use App\Models\Departement;

class Registrations extends Model
{
    use HasFactory;

    protected $table = 'registrations';
    protected $primaryKey = 'reg_id';
    public $incrementing = true;
    protected $keyType = 'int';
 protected $fillable = [
    'reg_type',
    'full_name',
    'father_name',
    'phone',
    'gender',
    'department_id',
    'age',
    'blood_group',
    'address',
    'visit_date',
    'note',
    'tazkira_number',
    'status',
    // === NEW PATIENT FIELDS ===
    'diagnosis',
    'weight',
    'blood_pressure',
    'temperature',
    'oxygen',
];

    public function department()
    {
        return $this->belongsTo(Departement::class, 'department_id');
    }

    /* =========================
       Relationships
    ========================= */

    /**
     * ارتباط با ژورنال‌ها
     * (بر اساس reg_type + reg_id)
     */
    public function journals()
    {
        return $this->hasMany(
            Journal::class,
            'ref_id',
            'reg_id'
        )->whereColumn(
            'journals.ref_type',
            'registrations.reg_type'
        );
    }

    /* =========================
       Accessors (برای نمایش)
    ========================= */

    /**
     * نام نمایشی واحد برای ژورنال و Select ها
     */
    public function getRegNameAttribute(): string
    {
        return trim(
            $this->full_name .
            ($this->father_name ? ' / ' . $this->father_name : '')
        );
    }

    /* =========================
       Scopes (اختیاری ولی مفید)
    ========================= */

    public function scopeByType($query, string $type)
    {
        return $query->where('reg_type', $type);
    }
}