<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
           $table->string('name', 191)->unique();; // نام بخش
            $table->string('location')->nullable(); // محل بخش
            $table->unsignedBigInteger('head_doctor_id')->nullable(); // سرپرست داکتر
            $table->timestamps();

            // ارتباط با جدول registrations (داکترها از همین جدول گرفته می‌شوند)
            $table->foreign('head_doctor_id')
                  ->references('reg_id')
                  ->on('registrations')
                  ->onDelete('set null');
        });

        // درج بخش‌های پیش‌فرض
        DB::table('departments')->insert([
            ['name' => 'داخله عمومی', 'location' => 'طبقه اول', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'جراحی', 'location' => 'طبقه دوم', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'نسایی و ولادی', 'location' => 'طبقه سوم', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'اطفال', 'location' => 'طبقه چهارم', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'قلب و عروق', 'location' => 'طبقه پنجم', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'اورژانس', 'location' => 'طبقه همکف', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'رادیولوژی', 'location' => 'طبقه اول', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'دواخانه', 'location' => 'طبقه همکف', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ICU', 'location' => 'طبقه سوم', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};