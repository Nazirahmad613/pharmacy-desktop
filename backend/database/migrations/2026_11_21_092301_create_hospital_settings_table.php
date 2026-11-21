// database/migrations/xxxx_xx_xx_create_hospital_settings_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_settings', function (Blueprint $table) {
            $table->id();
            $table->string('hospital_name');
            $table->string('hospital_logo')->nullable(); // مسیر فایل
            $table->json('enabled_modules')->nullable(); // آرایه ماژول‌های فعال
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_settings');
    }
};