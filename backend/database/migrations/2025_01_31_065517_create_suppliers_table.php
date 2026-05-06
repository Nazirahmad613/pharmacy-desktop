<?php
 use Illuminate\Database\Migrations\Migration;
 use Illuminate\Database\Schema\Blueprint;
 use Illuminate\Support\Facades\Schema;
 
 return new class extends Migration {
     public function up()
     {
         Schema::create('suppliers', function (Blueprint $table) {
            $table->bigIncrements('supplier_id');
             $table->string('name');
             $table->string('cont_person');
             $table->integer('phone_num');
             $table->string('email')->nullable();
             $table->string('address')->nullable();
             $table->date('CreatedAt');
             $table->timestamp('created_at')->useCurrent();
             $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
         });
     }
 
     public function down()
     {
         Schema::dropIfExists('suppliers');
     }
 };
 
  