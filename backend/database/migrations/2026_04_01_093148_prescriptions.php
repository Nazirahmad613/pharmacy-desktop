<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id('pres_id');

            $table->unsignedBigInteger('patient_id');
            $table->string('patient_name')->nullable();
            $table->string('tazkira_number')->nullable();
            $table->integer('patient_age')->nullable();
            $table->string('patient_gender')->nullable();
            $table->string('patient_phone')->nullable();
            $table->string('patient_blood_group')->nullable();
        $table->text('diagnosis')->nullable()->comment('تشخیص (برای مریض)');
        $table->decimal('weight', 5, 2)->nullable()->comment('وزن به کیلوگرم');
        $table->string('blood_pressure', 20)->nullable()->comment('فشار خون (مثلاً 120/80)');
        $table->decimal('temperature', 4, 1)->nullable()->comment('دمای بدن (درجه سانتی‌گراد)');
        $table->tinyInteger('oxygen')->nullable()->comment('درصد اکسیژن خون');

            $table->unsignedBigInteger('doc_id');
            $table->string('doc_name')->nullable();

            $table->unsignedBigInteger('pres_num')->unique();
            $table->date('pres_date');

            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);

            $table->timestamps();

            $table->foreign('patient_id')->references('reg_id')->on('registrations');
            $table->foreign('doc_id')->references('reg_id')->on('registrations');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
}; 