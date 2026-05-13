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
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            // فیلد email به عنوان کلید اصلی
            $table->string('email', 191)->primary();
            
            // فیلد token
            $table->string('token', 191);
            
            // فیلد created_at از نوع timestamp و nullable
            $table->timestamp('created_at')->nullable();
        });
        
        // اگر نیاز به موتور MyISAM دارید (مطابق با جدول فعلی شما)
        DB::statement('ALTER TABLE password_reset_tokens ENGINE = MyISAM');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};