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
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            // فیلدهای اصلی
            $table->id(); // bigint unsigned NOT NULL AUTO_INCREMENT
            $table->string('tokenable_type', 255);
            $table->unsignedBigInteger('tokenable_id');
            $table->string('name', 255);
            $table->string('token', 64)->unique(); // توکن باید یکتا باشد
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps(); // created_at و updated_at
            
            // ایندکس ترکیبی برای tokenable (Polymorphic relationship)
            $table->index(['tokenable_type', 'tokenable_id']);
        });
        
        // اگر نیاز به موتور MyISAM دارید (مطابق با جدول فعلی شما)
        DB::statement('ALTER TABLE personal_access_tokens ENGINE = MyISAM');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};