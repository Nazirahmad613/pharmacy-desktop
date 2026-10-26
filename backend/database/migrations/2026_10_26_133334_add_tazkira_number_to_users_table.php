<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('tazkira_number', 50)
                  ->nullable()
                  ->unique()
                  ->after('is_active'); // یا after('role') اگر is_active هنوز وجود ندارد
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['tazkira_number']);
            $table->dropColumn('tazkira_number');
        });
    }
};