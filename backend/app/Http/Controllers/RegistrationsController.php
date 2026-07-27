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
use Illuminate\Support\Str;

class RegistrationsController extends Controller
{

    public function store(Request $request)
    {


        $validated = $request->validate([


            /*
            |--------------------------------------------------------------------------
            | ارتباط مریض
            |--------------------------------------------------------------------------
            */


            'patient_id'=>[
                'nullable',
                'exists:patients,id'
            ],


            'is_new_patient'=>[
                'nullable',
                'boolean'
            ],



            /*
            |--------------------------------------------------------------------------
            | معلومات مریض جدید
            |--------------------------------------------------------------------------
            */


            'first_name'=>[
                'required_without:patient_id',
                'string',
                'max:255'
            ],


            'last_name'=>[
                'nullable',
                'string',
                'max:255'
            ],


            'father_name'=>[
                'nullable',
                'string',
                'max:255'
            ],


            'mobile'=>[
                'nullable',
                'string',
                'max:30'
            ],


            'national_id'=>[
                'nullable',
                'string',
                'max:255'
            ],


            'gender'=>[
                'required_without:patient_id',
                'in:Male,Female,other'
            ],


            'age'=>[
                'nullable',
                'integer',
                'min:0',
                'max:150'
            ],


            'blood_group'=>[
                'nullable',
                'string'
            ],


            'address'=>[
                'nullable',
                'string'
            ],




            /*
            |--------------------------------------------------------------------------
            | معلومات مراجعه
            |--------------------------------------------------------------------------
            */


            'department_id'=>[
                'nullable',
                'exists:departments,id'
            ],


            'doctor_id'=>[
                'nullable',
                'exists:users,id'
            ],


            'visit_number'=>[
                'nullable',
                'string',
                'max:50'
            ],


            'visit_type'=>[
                'nullable',
                'in:OPD,IPD,Emergency,Laboratory,Radiology,Pharmacy'
            ],


            'queue_number'=>[
                'nullable',
                'integer',
                'min:1'
            ],


            'registration_fee'=>[
                'required',
                'numeric',
                'min:0'
            ],


            'visit_status'=>[
                'nullable',
                'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Billing,Completed,Cancelled'
            ],



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


            'visit_date'=>'nullable|date',


            'note'=>'nullable|string',


        ]);




        DB::beginTransaction();



        try {



            /*
            |--------------------------------------------------------------------------
            | ایجاد مریض جدید
            |--------------------------------------------------------------------------
            */


            if(!$request->patient_id){



                $gender = $request->gender;


                if($gender === 'other'){
                    $gender='Male';
                }



                $patient = Patient::create([


                    'uuid'=>Str::uuid(),


                    'patient_code'=>'P-'.time(),


                    'first_name'=>$request->first_name,


                    'last_name'=>$request->last_name,


                    'father_name'=>$request->father_name,


                    'mobile'=>$request->mobile,


                    'national_id'=>$request->national_id,


                    'gender'=>$gender,


                    'age'=>$request->age,


                    'blood_group'=>$request->blood_group,


                    'address'=>$request->address,


                    'created_by'=>Auth::id(),

                ]);



                $patient_id=$patient->id;



            }else{


                $patient_id=$request->patient_id;


            }




            /*
            |--------------------------------------------------------------------------
            | ثبت مراجعه
            |--------------------------------------------------------------------------
            */


            $validated['patient_id']=$patient_id;


            $validated['reg_type']='patient';



            $registration=Registrations::create($validated);





            /*
            |--------------------------------------------------------------------------
            | ثبت ژورنال
            |--------------------------------------------------------------------------
            */


            $journal=Journal::create([


                'journal_date'=>$registration->visit_date ?? now(),


                'description'=>"فیس مراجعه مریض - ID: {$registration->reg_id}",


                'entry_type'=>'debit',


                'amount'=>$registration->registration_fee,


                'ref_type'=>'patient',


                'ref_id'=>$registration->reg_id,


                'registration_id'=>$registration->reg_id,


                'user_id'=>Auth::id(),


            ]);




            try{


                LogService::create(

                    'create',

                    'registrations',

                    $registration->reg_id,

                    'Patient registration created',

                    $registration->toArray()

                );


            }catch(\Exception $e){


                Log::error(
                    "Registration log failed: ".$e->getMessage()
                );


            }




            try{


                LogService::create(

                    'create',

                    'journals',

                    $journal->id,

                    'Registration fee journal created',

                    $journal->toArray()

                );


            }catch(\Exception $e){


                Log::error(
                    "Journal log failed: ".$e->getMessage()
                );

            }





            DB::commit();



            return response()->json([


                'message'=>'مراجعه مریض موفقانه ثبت شد',


                'data'=>$registration->load([

                    'patient',

                    'department',

                    'doctor',

                    'journals'

                ])


            ],201);




        }catch(\Exception $e){



            DB::rollBack();



            Log::error(
                'Registration store error: '.$e->getMessage()
            );



            return response()->json([

                'message'=>'خطا در ثبت مراجعه مریض',

                'error'=>$e->getMessage()

            ],500);


        }


    }

}