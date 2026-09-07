// database/migrations/2026_01_01_000003_create_beds_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ward_id')->constrained()->onDelete('cascade');
            $table->string('bed_number');
            $table->enum('status', ['available', 'occupied', 'reserved', 'maintenance'])->default('available');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->unique(['ward_id', 'bed_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beds');
    }
};