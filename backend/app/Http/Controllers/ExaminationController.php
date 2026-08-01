<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Examination;
use App\Models\Registrations;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ExaminationController extends Controller
{
    /**
     * ثبت معاینه جدید
     */
    public function store(Request $request, $registrationId)
    {
        $validator = Validator::make($request->all(), [
            'chief_complaint' => 'required|string|max:500',
            'diagnosis' => 'required|string|max:500',
            'weight' => 'nullable|numeric|min:0|max:300',
            'height' => 'nullable|numeric|min:50|max:250',
            'bmi' => 'nullable|numeric|min:10|max:60',
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'pulse' => 'nullable|integer|min:30|max:200',
            'respiratory_rate' => 'nullable|integer|min:5|max:60',
            'oxygen' => 'nullable|integer|min:0|max:100',
            'history_of_present_illness' => 'nullable|string',
            'past_medical_history' => 'nullable|string',
            'physical_examination' => 'nullable|string',
            'note' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $registration = Registrations::with(['patient'])->where('reg_id', $registrationId)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            // بررسی اینکه آیا قبلاً معاینه ثبت شده است
            $existingExamination = Examination::where('registration_id', $registrationId)->first();
            if ($existingExamination) {
                return response()->json([
                    'success' => false,
                    'message' => 'این مریض قبلاً معاینه شده است'
                ], 409);
            }

            DB::beginTransaction();

            $examination = Examination::create([
                'registration_id' => $registration->reg_id,
                'user_id' => Auth::id(),
                'patient_id' => $registration->patient_id,
                'chief_complaint' => $request->chief_complaint,
                'diagnosis' => $request->diagnosis,
                'weight' => $request->weight,
                'height' => $request->height,
                'bmi' => $request->bmi,
                'blood_pressure' => $request->blood_pressure,
                'temperature' => $request->temperature,
                'pulse' => $request->pulse,
                'respiratory_rate' => $request->respiratory_rate,
                'oxygen' => $request->oxygen,
                'history_of_present_illness' => $request->history_of_present_illness,
                'past_medical_history' => $request->past_medical_history,
                'physical_examination' => $request->physical_examination,
                'note' => $request->note,
                'examination_date' => now()
            ]);

            // ============================================================
            // اصلاح: بروزرسانی visit_status به 'Examining'
            // ============================================================
            $registration->update([
                'visit_status' => 'Examining'  // مقدار صحیح از enum
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'معاینه با موفقیت ثبت شد',
                'data' => $examination->load(['patient', 'user'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ثبت معاینه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت اطلاعات یک معاینه
     */
    public function show($registrationId)
    {
        try {
            $examination = Examination::with(['patient', 'user', 'registration'])
                ->where('registration_id', $registrationId)
                ->latest()
                ->first();

            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'معاینه‌ای برای این مریض یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $examination
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت جزئیات کامل معاینه با ID
     */
    public function getById($id)
    {
        try {
            $examination = Examination::with(['patient', 'user', 'registration.department'])
                ->where('id', $id)
                ->first();

            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'معاینه یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $examination
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تاریخچه معاینات یک مریض
     */
    public function history($patientId)
    {
        try {
            $patient = Patient::find($patientId);
            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'مریض پیدا نشد'
                ], 404);
            }

            $examinations = Examination::with(['patient', 'user', 'registration'])
                ->where('patient_id', $patientId)
                ->orderBy('examination_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'patient' => $patient,
                    'examinations' => $examinations,
                    'total' => $examinations->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت تاریخچه معاینات با فیلتر تاریخ
     */
    public function historyWithDateFilter(Request $request, $patientId)
    {
        $validator = Validator::make($request->all(), [
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $query = Examination::with(['patient', 'user', 'registration'])
                ->where('patient_id', $patientId);

            if ($request->from_date) {
                $query->whereDate('examination_date', '>=', $request->from_date);
            }

            if ($request->to_date) {
                $query->whereDate('examination_date', '<=', $request->to_date);
            }

            $perPage = $request->per_page ?? 15;
            $examinations = $query->orderBy('examination_date', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $examinations
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت تاریخچه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت لیست معاینات داکتر جاری
     */
    public function myExaminations(Request $request)
    {
        try {
            $query = Examination::with(['patient', 'registration'])
                ->where('user_id', Auth::id());

            if ($request->from_date) {
                $query->whereDate('examination_date', '>=', $request->from_date);
            }

            if ($request->to_date) {
                $query->whereDate('examination_date', '<=', $request->to_date);
            }

            if ($request->status) {
                $query->whereHas('registration', function ($q) use ($request) {
                    $q->where('visit_status', $request->status);
                });
            }

            $perPage = $request->per_page ?? 20;
            $examinations = $query->orderBy('examination_date', 'desc')->paginate($perPage);

            $stats = [
                'total' => Examination::where('user_id', Auth::id())->count(),
                'today' => Examination::where('user_id', Auth::id())
                    ->whereDate('examination_date', today())
                    ->count(),
                'this_week' => Examination::where('user_id', Auth::id())
                    ->whereBetween('examination_date', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
                'this_month' => Examination::where('user_id', Auth::id())
                    ->whereMonth('examination_date', now()->month)
                    ->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $examinations,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت لیست معاینات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار معاینات داکتر
     */
    public function getStatistics()
    {
        try {
            $userId = Auth::id();

            $stats = [
                'total_examinations' => Examination::where('user_id', $userId)->count(),
                'today_examinations' => Examination::where('user_id', $userId)
                    ->whereDate('examination_date', today())
                    ->count(),
                'weekly_examinations' => Examination::where('user_id', $userId)
                    ->whereBetween('examination_date', [now()->startOfWeek(), now()->endOfWeek()])
                    ->count(),
                'monthly_examinations' => Examination::where('user_id', $userId)
                    ->whereMonth('examination_date', now()->month)
                    ->count(),
                'yearly_examinations' => Examination::where('user_id', $userId)
                    ->whereYear('examination_date', now()->year)
                    ->count(),
                'last_7_days' => Examination::where('user_id', $userId)
                    ->whereDate('examination_date', '>=', now()->subDays(7))
                    ->count(),
                'average_daily' => Examination::where('user_id', $userId)
                    ->whereDate('examination_date', '>=', now()->subDays(30))
                    ->count() / 30
            ];

            $monthlyStats = Examination::where('user_id', $userId)
                ->whereYear('examination_date', now()->year)
                ->select(
                    DB::raw('MONTH(examination_date) as month'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'monthly' => $monthlyStats
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت آمار: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ختم معالجه
     */
    public function complete($registrationId)
    {
        try {
            DB::beginTransaction();

            $registration = Registrations::where('reg_id', $registrationId)->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'ثبت مریض پیدا نشد'
                ], 404);
            }

            // بررسی اینکه آیا معاینه ثبت شده است
            $examination = Examination::where('registration_id', $registrationId)->first();
            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'قبل از ختم معالجه، معاینه باید ثبت شود'
                ], 400);
            }

            // ============================================================
            // اصلاح: استفاده از visit_status به جای status
            // ============================================================
            $registration->update([
                'visit_status' => 'Completed',  // مقدار صحیح از enum
                'completed_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'معالجه با موفقیت ختم شد',
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در ختم معالجه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * بروزرسانی معاینه
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'chief_complaint' => 'nullable|string|max:500',
            'diagnosis' => 'nullable|string|max:500',
            'weight' => 'nullable|numeric|min:0|max:300',
            'height' => 'nullable|numeric|min:50|max:250',
            'bmi' => 'nullable|numeric|min:10|max:60',
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'pulse' => 'nullable|integer|min:30|max:200',
            'respiratory_rate' => 'nullable|integer|min:5|max:60',
            'oxygen' => 'nullable|integer|min:0|max:100',
            'history_of_present_illness' => 'nullable|string',
            'past_medical_history' => 'nullable|string',
            'physical_examination' => 'nullable|string',
            'note' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $examination = Examination::find($id);
            
            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'معاینه پیدا نشد'
                ], 404);
            }

            if ($examination->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'شما دسترسی به بروزرسانی این معاینه ندارید'
                ], 403);
            }

            if ($examination->examination_date->diffInHours(now()) > 24) {
                return response()->json([
                    'success' => false,
                    'message' => 'امکان بروزرسانی معاینه‌های بیش از 24 ساعت وجود ندارد'
                ], 400);
            }

            $examination->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'معاینه با موفقیت بروزرسانی شد',
                'data' => $examination->fresh(['patient', 'user'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در بروزرسانی معاینه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف معاینه (فقط ادمین)
     */
    public function destroy($id)
    {
        try {
            $examination = Examination::find($id);
            
            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'معاینه پیدا نشد'
                ], 404);
            }

            DB::beginTransaction();

            $registration = Registrations::where('reg_id', $examination->registration_id)->first();
            if ($registration && $registration->visit_status === 'Examining') {
                $registration->update([
                    'visit_status' => 'Doctor'
                ]);
            }

            $examination->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'معاینه با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'خطا در حذف معاینه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * جستجوی معاینات
     */
    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:2',
            'type' => 'nullable|in:patient_name,patient_phone,diagnosis,registration_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $query = $request->query;
            $type = $request->type ?? 'patient_name';

            $examinations = Examination::with(['patient', 'user', 'registration'])
                ->where('user_id', Auth::id());

            switch ($type) {
                case 'patient_name':
                    $examinations->whereHas('patient', function ($q) use ($query) {
                        $q->where('first_name', 'LIKE', "%{$query}%")
                          ->orWhere('last_name', 'LIKE', "%{$query}%");
                    });
                    break;
                case 'patient_phone':
                    $examinations->whereHas('patient', function ($q) use ($query) {
                        $q->where('mobile', 'LIKE', "%{$query}%");
                    });
                    break;
                case 'diagnosis':
                    $examinations->where('diagnosis', 'LIKE', "%{$query}%");
                    break;
                case 'registration_id':
                    $examinations->where('registration_id', $query);
                    break;
                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'نوع جستجو معتبر نیست'
                    ], 400);
            }

            $results = $examinations->orderBy('examination_date', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $results
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در جستجو: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آخرین معاینه ثبت شده
     */
    public function getLatest()
    {
        try {
            $examination = Examination::with(['patient', 'registration'])
                ->where('user_id', Auth::id())
                ->latest('examination_date')
                ->first();

            if (!$examination) {
                return response()->json([
                    'success' => false,
                    'message' => 'هیچ معاینه‌ای یافت نشد'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $examination
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت اطلاعات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت خلاصه معاینات امروز
     */
    public function getTodaySummary()
    {
        try {
            $today = today();
            
            $examinations = Examination::with(['patient', 'registration'])
                ->where('user_id', Auth::id())
                ->whereDate('examination_date', $today)
                ->orderBy('examination_date', 'desc')
                ->get();

            $summary = [
                'total' => $examinations->count(),
                'pending' => $examinations->filter(function ($item) {
                    return $item->registration->visit_status === 'Waiting';
                })->count(),
                'examining' => $examinations->filter(function ($item) {
                    return $item->registration->visit_status === 'Examining';
                })->count(),
                'completed' => $examinations->filter(function ($item) {
                    return $item->registration->visit_status === 'Completed';
                })->count(),
                'examinations' => $examinations
            ];

            return response()->json([
                'success' => true,
                'data' => $summary
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت خلاصه: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت معاینات بر اساس بازه زمانی
     */
    public function getByDateRange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'doctor_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $doctorId = $request->doctor_id ?? Auth::id();

            $examinations = Examination::with(['patient', 'user', 'registration'])
                ->where('user_id', $doctorId)
                ->whereDate('examination_date', '>=', $request->start_date)
                ->whereDate('examination_date', '<=', $request->end_date)
                ->orderBy('examination_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $examinations,
                'count' => $examinations->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'خطا در دریافت معاینات: ' . $e->getMessage()
            ], 500);
        }
    }
}