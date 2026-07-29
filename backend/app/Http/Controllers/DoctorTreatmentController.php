<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\LogService;


class DoctorTreatmentController extends Controller
{


    /*
    |--------------------------------------------------------------------------
    | صف مریضان داکتر
    |--------------------------------------------------------------------------
    */

    public function doctorQueue()
    {

        try {


            $doctorId = Auth::id();


            $registrations = Registrations::with([

                'patient',
                'department'

            ])
            ->where('doctor_id',$doctorId)
            ->where('visit_status','Doctor')
            ->orderBy('sent_to_doctor_at','asc')
            ->get();



            return response()->json([

                'data'=>$registrations,

                'count'=>$registrations->count()

            ]);


        }catch(\Exception $e){


            return response()->json([

                'message'=>'خطا در دریافت صف داکتر',

                'error'=>$e->getMessage()

            ],500);


        }

    }






    /*
    |--------------------------------------------------------------------------
    | دریافت معلومات کامل مریض برای معاینه
    |--------------------------------------------------------------------------
    */

    public function show($reg_id)
    {


        $registration = Registrations::with([

            'patient',
            'department',
            'doctor'

        ])
        ->where('reg_id',$reg_id)
        ->first();



        if(!$registration){


            return response()->json([

                'message'=>'مراجعه مریض یافت نشد'

            ],404);


        }



        return response()->json([

            'data'=>$registration

        ]);


    }







    /*
    |--------------------------------------------------------------------------
    | ثبت تشخیص و معلومات معالجه
    |--------------------------------------------------------------------------
    */

    public function treatment(Request $request,$reg_id)
    {


        $validated=$request->validate([


            'diagnosis'=>'nullable|string',


            'note'=>'nullable|string',


            'weight'=>'nullable|numeric',


            'blood_pressure'=>'nullable|string',


            'temperature'=>'nullable|numeric',


            'oxygen'=>'nullable|integer',


        ]);




        $registration=Registrations::find($reg_id);



        if(!$registration){


            return response()->json([

                'message'=>'مریض یافت نشد'

            ],404);

        }





        $old=$registration->toArray();



        $registration->update([


            'diagnosis'=>$validated['diagnosis'] ?? null,


            'note'=>$validated['note'] ?? null,


            'weight'=>$validated['weight'] ?? null,


            'blood_pressure'=>$validated['blood_pressure'] ?? null,


            'temperature'=>$validated['temperature'] ?? null,


            'oxygen'=>$validated['oxygen'] ?? null,


            'visit_status'=>'Doctor'


        ]);





        LogService::create(

            'update',

            'registrations',

            $registration->reg_id,

            'Doctor treatment updated',

            [

                'old'=>$old,

                'new'=>$registration->toArray()

            ]

        );





        return response()->json([

            'message'=>'معلومات معالجه ثبت شد',

            'data'=>$registration

        ]);


    }







    /*
    |--------------------------------------------------------------------------
    | ارسال به لابراتوار
    |--------------------------------------------------------------------------
    */

    public function sendToLaboratory(Request $request,$reg_id)
    {



        $registration=Registrations::find($reg_id);



        if(!$registration){


            return response()->json([

                'message'=>'مریض یافت نشد'

            ],404);

        }




        $registration->update([


            'visit_status'=>'Laboratory'


        ]);




        LogService::create(

            'update',

            'registrations',

            $registration->reg_id,

            'Patient sent to laboratory',

            $registration->toArray()

        );




        return response()->json([

            'message'=>'مریض به لابراتوار ارسال شد',

            'data'=>$registration

        ]);



    }







    /*
    |--------------------------------------------------------------------------
    | ختم معالجه
    |--------------------------------------------------------------------------
    */

    public function complete($reg_id)
    {


        $registration=Registrations::find($reg_id);



        if(!$registration){


            return response()->json([

                'message'=>'مریض یافت نشد'

            ],404);

        }




        $registration->update([

            'visit_status'=>'Completed'

        ]);




        LogService::create(

            'update',

            'registrations',

            $registration->reg_id,

            'Doctor treatment completed',

            $registration->toArray()

        );




        return response()->json([

            'message'=>'معالجه ختم شد',

            'data'=>$registration

        ]);


    }



}