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
        Schema::create('roles', function (Blueprint $table) {
            // bigint unsigned AUTO_INCREMENT PRIMARY KEY
            $table->id(); // همینطور معادل bigint unsigned auto increment primary key است
            
            // varchar(125) NOT NULL با charset utf8mb4 و collate utf8mb4_unicode_ci
            $table->string('name', 125);
            $table->string('guard_name', 125);
            
            // timestamp nullable
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            
            // unique key مرکب روی name و guard_name
            $table->unique(['name', 'guard_name'], 'roles_name_guard_unique');
        });
        
        // اگر حتماً می‌خواهید موتور MyISAM باشد (در لاراول پیش‌فرض InnoDB است)
        // می‌توانید بعد از create، دستور raw بدهید:
        // DB::statement('ALTER TABLE roles ENGINE = MyISAM');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};