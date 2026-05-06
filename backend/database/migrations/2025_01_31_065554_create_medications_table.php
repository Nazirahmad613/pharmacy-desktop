
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('medications', function (Blueprint $table) {
            $table->bigIncrements('med_id');
            $table->string('gen_name');   
            $table->string('dosage');
            $table->integer('unit_price');
            $table->integer('quantity');
            $table->date('exp_date');
        
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down()
    {
        Schema::dropIfExists('medications');
    }
};
