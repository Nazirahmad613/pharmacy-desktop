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


       public function doctorQueue()
    {
        try {
            $doctorId = Auth::id();

        $registrations = Registrations::with([
    'patient',
    'department'
])
->where('doctor_id', $doctorId)
->where('visit_status', 'Doctor')
->whereNotNull('sent_to_doctor_at')
->whereDate('queue_date', now()->toDateString())
->orderBy('sent_to_doctor_at', 'asc')
->orderBy('queue_number', 'asc')
->get();

            // تبدیل داده‌ها به فرمت مناسب برای فرانت‌اند
            $formattedData = $registrations->map(function($registration) {
                return [
                    'reg_id' => $registration->reg_id,
                     'queue_number' => $registration->queue_number,
                     'queue_date' => $registration->queue_date,
                     'visit_date' => $registration->visit_date,
                    'visit_date' => $registration->visit_date,
                    'queue_date' => $registration->queue_date,
                    'visit_status' => $registration->visit_status,
                    'registration_fee' => $registration->registration_fee,
                    'sent_to_doctor_at' => $registration->sent_to_doctor_at,
                    'diagnosis' => $registration->diagnosis,
                    'weight' => $registration->weight,
                    'blood_pressure' => $registration->blood_pressure,
                    'temperature' => $registration->temperature,
                    'oxygen' => $registration->oxygen,
                    'note' => $registration->note,
                    'patient' => $registration->patient ? [
                        'id' => $registration->patient->id,
                        'first_name' => $registration->patient->first_name,
                        'last_name' => $registration->patient->last_name,
                        'father_name' => $registration->patient->father_name,
                        'mobile' => $registration->patient->mobile,
                        'national_id' => $registration->patient->national_id,
                        'gender' => $registration->patient->gender,
                        'age' => $registration->patient->age,
                        'blood_group' => $registration->patient->blood_group,
                        'address' => $registration->patient->address,
                    ] : null,
                    'department' => $registration->department ? [
                        'id' => $registration->department->id,
                        'name' => $registration->department->name,
                        'code' => $registration->department->code,
                    ] : null,
                ];
            });
            
            return response()->json([
                'data' => $formattedData,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Doctor queue error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت صف داکتر',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ... بقیه متدها
}


