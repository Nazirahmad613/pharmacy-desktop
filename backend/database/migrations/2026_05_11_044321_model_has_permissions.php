<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('model_has_permissions', function (Blueprint $table) {
            // فیلدها
            $table->unsignedBigInteger('permission_id');
            $table->string('model_type', 191);
            $table->unsignedBigInteger('model_id');
            
            // کلید اصلی مرکب (permission_id, model_id, model_type)
            $table->primary(['permission_id', 'model_id', 'model_type']);
            
            // ایندکس اضافی روی (model_id, model_type)
            $table->index(['model_id', 'model_type'], 'model_has_permissions_model_id_model_type_index');
        });
        
        // اگر نیاز به موتور MyISAM دارید (مطابق با جدول فعلی شما)
        DB::statement('ALTER TABLE model_has_permissions ENGINE = MyISAM');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('model_has_permissions');
    }
};