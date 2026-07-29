<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {


            $table->id('reg_id');


            /*
            |--------------------------------------------------------------------------
            | نوع ثبت
            |--------------------------------------------------------------------------
            */

            $table->enum('reg_type', [

                'patient',

            ])->comment('نوع مراجعه');



            /*
            |--------------------------------------------------------------------------
            | ارتباطات سیستم شفاخانه
            |--------------------------------------------------------------------------
            */


            // مریض اصلی از جدول patients

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->cascadeOnDelete();



            // بخش مربوطه

            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->nullOnDelete();



            // داکتر معالج

            $table->foreignId('doctor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();




            /*
            |--------------------------------------------------------------------------
            | معلومات مراجعه
            |--------------------------------------------------------------------------
            */


            $table->string('visit_number',50)
                ->nullable()
                ->unique();



            $table->enum('visit_type',[

                'OPD',
                'IPD',
                'Emergency',
                'Laboratory',
                'Radiology',
                'Pharmacy'

            ])
            ->nullable();

        $table->timestamp('sent_to_doctor_at')
    ->nullable()
    ->comment('زمان ارسال مریض به داکتر');



// زمان شروع معاینه توسط داکتر

$table->timestamp('doctor_started_at')
    ->nullable()
    ->comment('زمان شروع معاینه توسط داکتر');

            $table->integer('queue_number')
                ->nullable();




            /*
            |--------------------------------------------------------------------------
            | فیس مراجعه
            |--------------------------------------------------------------------------
            */


            $table->decimal(
                'registration_fee',
                10,
                2
            )
            ->default(0)
            ->comment('فیس ابتدایی مراجعه');





            /*
            |--------------------------------------------------------------------------
            | گردش مریض
            |--------------------------------------------------------------------------
            */


            $table->enum('visit_status',[

                'Waiting',
                'Doctor',
                'Laboratory',
                'Radiology',
                'Pharmacy',
                'Billing',
                'Completed',
                'Cancelled'

            ])
            ->default('Waiting');





            /*
            |--------------------------------------------------------------------------
            | تاریخ و یادداشت
            |--------------------------------------------------------------------------
            */


            $table->date('visit_date')
                ->nullable();



            $table->text('note')
                ->nullable();





            /*
            |--------------------------------------------------------------------------
            | معلومات طبی اولیه
            |--------------------------------------------------------------------------
            */


            $table->text('diagnosis')
                ->nullable();



            $table->decimal(
                'weight',
                5,
                2
            )
            ->nullable();



            $table->string(
                'blood_pressure',
                20
            )
            ->nullable();



            $table->decimal(
                'temperature',
                4,
                1
            )
            ->nullable();



            $table->tinyInteger('oxygen')
                ->nullable();





            /*
            |--------------------------------------------------------------------------
            | وضعیت
            |--------------------------------------------------------------------------
            */


            $table->tinyInteger('status')
                ->default(1);



            $table->timestamps();


        });

    }



    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }

};