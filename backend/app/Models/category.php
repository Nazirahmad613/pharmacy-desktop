<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
 
class Category extends Model
{
    use HasFactory;

    protected $primaryKey = 'category_id';
   
    protected $fillable = [
        'category_id',
        'category_name',
    ];

    public function medications(){
        return $this->hasMany(Medication::class, 'category_id', 'category_id');
    }
    public function prescriptionItem(){
        return $this->hasMany(PrescriptionItem::class, 'category_id', 'category_id');
    }
}
