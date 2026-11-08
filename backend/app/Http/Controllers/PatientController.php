<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\LogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    /**
     * لیست مریضان (صفحه‌بندی شده)
     */
    public function index(Request $request)
    {
        try {
            $perPage = (int) $request->get('per_page', 20);
            if ($perPage < 1 || $perPage > 200) {
                $perPage = 20;
            }

            $query = Patient::query();

            // فیلتر اختیاری بر اساس جستجو
            if ($search = $request->get('q')) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('national_id', 'LIKE', "%{$search}%")
                        ->orWhere('mobile', 'LIKE', "%{$search}%")
                        ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$search}%");
                });
            }

            $patients = $query->latest()->paginate($perPage);

            return response()->json($patients);
        } catch (\Exception $e) {
            Log::error('Patient index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت لیست مریضان',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ جستجوی مریضان — این متد قبلاً وجود نداشت
     *
     * پشتیبانی از دو حالت:
     *   1) پارامترهای جداگانه: national_id, name, mobile
     *   2) پارامتر عمومی: q  و  type (all|national_id|name|mobile)
     */
    public function search(Request $request)
    {
        try {
            $nationalId = $request->get('national_id');
            $name       = $request->get('name');
            $mobile     = $request->get('mobile');

            $q    = $request->get('q');
            $type = $request->get('type', 'all');

            // اگر پارامترهای جداگانه ارسال شده بود
            $hasSeparateParams = $nationalId || $name || $mobile;

            if (!$hasSeparateParams && empty($q)) {
                return response()->json(['data' => []]);
            }

            $query = Patient::query();

            if ($hasSeparateParams) {
                if ($nationalId) {
                    $query->where('national_id', 'LIKE', "%{$nationalId}%");
                }
                if ($name) {
                    $query->where(function ($sub) use ($name) {
                        $sub->where('first_name', 'LIKE', "%{$name}%")
                            ->orWhere('last_name', 'LIKE', "%{$name}%")
                            ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$name}%");
                    });
                }
                if ($mobile) {
                    $query->where('mobile', 'LIKE', "%{$mobile}%");
                }
            } else {
                // حالت قدیمی: q + type
                switch ($type) {
                    case 'national_id':
                        $query->where('national_id', 'LIKE', "%{$q}%");
                        break;
                    case 'mobile':
                        $query->where('mobile', 'LIKE', "%{$q}%");
                        break;
                    case 'name':
                        $query->where(function ($sub) use ($q) {
                            $sub->where('first_name', 'LIKE', "%{$q}%")
                                ->orWhere('last_name', 'LIKE', "%{$q}%")
                                ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$q}%");
                        });
                        break;
                    default: // all
                        $query->where(function ($sub) use ($q) {
                            $sub->where('first_name', 'LIKE', "%{$q}%")
                                ->orWhere('last_name', 'LIKE', "%{$q}%")
                                ->orWhere('national_id', 'LIKE', "%{$q}%")
                                ->orWhere('mobile', 'LIKE', "%{$q}%")
                                ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$q}%");
                        });
                        break;
                }
            }

            $patients = $query->orderBy('first_name')
                ->limit(20)
                ->get();

            return response()->json([
                'data'  => $patients,
                'count' => $patients->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Patient search error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در جستجوی مریض',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ آمار مریضان — این متد هم قبلاً وجود نداشت
     */
    public function statistics()
    {
        try {
            $today = date('Y-m-d');

            $total       = Patient::count();
            $male        = Patient::where('gender', 'Male')->count();
            $female      = Patient::where('gender', 'Female')->count();
            $todayCount  = Patient::whereDate('created_at', $today)->count();
            $thisMonth   = Patient::whereYear('created_at', date('Y'))
                ->whereMonth('created_at', date('m'))
                ->count();

            return response()->json([
                'total_patients'       => $total,
                'male_patients'        => $male,
                'female_patients'      => $female,
                'today_patients'       => $todayCount,
                'this_month_patients'  => $thisMonth,
                'date'                 => $today,
            ]);
        } catch (\Exception $e) {
            Log::error('Patient statistics error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت آمار مریضان',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ایجاد مریض جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name'   => 'required|string|max:255',
            'last_name'    => 'required|string|max:255',
            'father_name'  => 'nullable|string|max:255',
            'mobile'       => 'nullable|string|max:30',
            'national_id'  => 'nullable|string|max:255',
            'gender'       => 'nullable|string|max:50',
            'age'          => 'nullable|integer|min:0|max:150',
            'blood_group'  => 'nullable|string|max:10',
            'address'      => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $gender = $validated['gender'] ?? null;
            if (in_array($gender, ['male', 'Male', 'other'])) {
                $gender = 'Male';
            } elseif (in_array($gender, ['female', 'Female'])) {
                $gender = 'Female';
            }

            $patient = Patient::create([
                'uuid'         => Str::uuid(),
                'patient_code' => 'P-' . time(),
                'first_name'   => $validated['first_name'],
                'last_name'    => $validated['last_name'],
                'father_name'  => $validated['father_name'] ?? null,
                'mobile'       => $validated['mobile'] ?? null,
                'national_id'  => $validated['national_id'] ?? null,
                'gender'       => $gender,
                'age'          => $validated['age'] ?? null,
                'blood_group'  => $validated['blood_group'] ?? null,
                'address'      => $validated['address'] ?? null,
                'created_by'   => Auth::id(),
            ]);

            try {
                LogService::create(
                    'create',
                    'patients',
                    $patient->id,
                    'Patient created',
                    $patient->toArray()
                );
            } catch (\Exception $e) {
                Log::error('Patient create log failed: ' . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => 'مریض با موفقیت ثبت شد',
                'data'    => $patient,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Patient store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ثبت مریض',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * نمایش یک مریض
     */
    public function show(Patient $patient)
    {
        return response()->json(['data' => $patient]);
    }

    /**
     * به‌روزرسانی مریض
     */
    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'first_name'   => 'sometimes|required|string|max:255',
            'last_name'    => 'sometimes|required|string|max:255',
            'father_name'  => 'nullable|string|max:255',
            'mobile'       => 'nullable|string|max:30',
            'national_id'  => 'nullable|string|max:255',
            'gender'       => 'nullable|string|max:50',
            'age'          => 'nullable|integer|min:0|max:150',
            'blood_group'  => 'nullable|string|max:10',
            'address'      => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            if (isset($validated['gender'])) {
                $g = $validated['gender'];
                if (in_array($g, ['male', 'Male', 'other'])) {
                    $validated['gender'] = 'Male';
                } elseif (in_array($g, ['female', 'Female'])) {
                    $validated['gender'] = 'Female';
                }
            }

            $oldData = $patient->toArray();
            $patient->update($validated);

            try {
                LogService::create(
                    'update',
                    'patients',
                    $patient->id,
                    'Patient updated',
                    ['old' => $oldData, 'new' => $patient->toArray()]
                );
            } catch (\Exception $e) {
                Log::error('Patient update log failed: ' . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => 'مریض با موفقیت به‌روزرسانی شد',
                'data'    => $patient->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Patient update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در به‌روزرسانی مریض',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * حذف مریض
     */
    public function destroy(Patient $patient)
    {
        DB::beginTransaction();
        try {
            $data = $patient->toArray();
            $id   = $patient->id;
            $patient->delete();

            try {
                LogService::create(
                    'delete',
                    'patients',
                    $id,
                    'Patient deleted',
                    $data
                );
            } catch (\Exception $e) {
                Log::error('Patient delete log failed: ' . $e->getMessage());
            }

            DB::commit();

            return response()->json(['message' => 'مریض با موفقیت حذف شد']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Patient delete error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در حذف مریض',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * تاریخچه مریض
     */
    public function history($id)
    {
        try {
            $patient = Patient::with(['registrations' => function ($q) {
                $q->orderBy('reg_id', 'desc')->limit(20);
            }])->find($id);

            if (!$patient) {
                return response()->json(['message' => 'مریض یافت نشد'], 404);
            }

            return response()->json(['data' => $patient]);
        } catch (\Exception $e) {
            Log::error('Patient history error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت تاریخچه مریض',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}