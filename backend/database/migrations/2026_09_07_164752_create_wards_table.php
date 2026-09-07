// database/migrations/2026_01_01_000002_create_wards_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['general', 'icu', 'ccu', 'pediatric', 'maternity', 'surgical', 'medical']);
            $table->integer('total_beds');
            $table->integer('available_beds');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wards');
    }
};