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
        Schema::create('role_has_permissions', function (Blueprint $table) {
            // فیلدها
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('role_id');
            
            // کلید اصلی مرکب (permission_id, role_id)
            $table->primary(['permission_id', 'role_id']);
            
            // ایندکس روی role_id
            $table->index(['role_id'], 'role_has_permissions_role_id_foreign');
        });
        
        // اگر نیاز به موتور MyISAM دارید (مطابق با جدول فعلی شما)
        DB::statement('ALTER TABLE role_has_permissions ENGINE = MyISAM');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_has_permissions');
    }
};