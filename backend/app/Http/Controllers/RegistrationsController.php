<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\Journal;
use App\Models\Patient;
use Illuminate\Http\Request;
use App\Services\LogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistrationsController extends Controller
{

    /*
    |--------------------------------------------------------------------------
    | ثبت مراجعه جدید مریض
    |--------------------------------------------------------------------------
    */
    public function store(Request $request)
    {

        $validated = $request->validate([

            /*
            |--------------------------------------------------------------------------
            | ارتباط مریض
            |--------------------------------------------------------------------------
            */

            'patient_id' => [
                'required',
                'exists:patients,id'
            ],


            'department_id' => [
                'nullable',
                'exists:departments,id'
            ],


            'doctor_id' => [
                'nullable',
                'exists:users,id'
            ],



            /*
            |--------------------------------------------------------------------------
            | معلومات مراجعه
            |--------------------------------------------------------------------------
            */


            'visit_number' => [
                'nullable',
                'string',
                'max:50'
            ],


            'visit_type' => [
                'nullable',
                'in:OPD,IPD,Emergency,Laboratory,Radiology,Pharmacy'
            ],


            'queue_number' => [
                'nullable',
                'integer',
                'min:1'
            ],



            /*
            |--------------------------------------------------------------------------
            | فیس مراجعه
            |--------------------------------------------------------------------------
            */


            'registration_fee'=>[
                'required',
                'numeric',
                'min:0'
            ],



            /*
            |--------------------------------------------------------------------------
            | وضعیت مراجعه
            |--------------------------------------------------------------------------
            */


            'visit_status'=>[
                'nullable',
                'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Billing,Completed,Cancelled'
            ],



            /*
            |--------------------------------------------------------------------------
            | معلومات طبی
            |--------------------------------------------------------------------------
            */


            'diagnosis'=>'nullable|string',

            'weight'=>[
                'nullable',
                'numeric',
                'min:0',
                'max:300'
            ],


            'blood_pressure'=>'nullable|string|max:20',


            'temperature'=>[
                'nullable',
                'numeric',
                'min:30',
                'max:45'
            ],


            'oxygen'=>[
                'nullable',
                'integer',
                'min:0',
                'max:100'
            ],



            /*
            |--------------------------------------------------------------------------
            | تاریخ
            |--------------------------------------------------------------------------
            */


            'visit_date'=>'nullable|date',

            'note'=>'nullable|string',


        ]);



        DB::beginTransaction();


        try {


            /*
            |--------------------------------------------------------------------------
            | ثبت مراجعه
            |--------------------------------------------------------------------------
            */


            $validated['reg_type']='patient';


            $registration = Registrations::create($validated);



            /*
            |--------------------------------------------------------------------------
            | ثبت حساب فیس در ژورنال
            |--------------------------------------------------------------------------
            */


            $patient = Patient::findOrFail(
                $registration->patient_id
            );



            $journal = Journal::create([


                'journal_date' =>
                    $registration->visit_date ?? now(),



                'description' =>
                    "فیس مراجعه مریض - ID: {$registration->reg_id}",



                'entry_type'=>'debit',



                'amount'=>
                    $registration->registration_fee,



                /*
                | مهم:
                | حساب مربوط به مراجعه است
                */

                'ref_type'=>'patient',


                'ref_id'=>
                    $registration->reg_id,


                'registration_id'=>
                    $registration->reg_id,


                'user_id'=>
                    Auth::id(),

            ]);




            /*
            |--------------------------------------------------------------------------
            | ثبت لاگ
            |--------------------------------------------------------------------------
            */


            try {

                LogService::create(

                    'create',

                    'registrations',

                    $registration->reg_id,

                    'Patient registration created',

                    $registration->toArray()

                );


            } catch(\Exception $e){


                Log::error(
                    "Registration log failed: ".$e->getMessage()
                );

            }




            try {

                LogService::create(

                    'create',

                    'journals',

                    $journal->id,

                    'Registration fee journal created',

                    $journal->toArray()

                );


            } catch(\Exception $e){


                Log::error(
                    "Journal log failed: ".$e->getMessage()
                );

            }




            DB::commit();



            return response()->json([

                'message'=>
                    'مراجعه مریض موفقانه ثبت شد',


                'data'=>
                    $registration->load([

                        'patient',

                        'department',

                        'doctor',

                        'journals'

                    ])

            ],201);



        } catch(\Exception $e){


            DB::rollBack();


            Log::error(
                'Registration store error: '.$e->getMessage()
            );



            return response()->json([

                'message'=>
                    'خطا در ثبت مراجعه مریض',


                'error'=>
                    $e->getMessage()

            ],500);

        }


    }
}