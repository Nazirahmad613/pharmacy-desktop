<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\Journal;
use App\Models\Patient;
use App\Models\Department;
use Illuminate\Http\Request;
use App\Services\LogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RegistrationsController extends Controller
{


    /**
     * دریافت لیست تمام مراجعات
     */
    public function index(Request $request)
    {
        try {
            $registrations = Registrations::with([
                'patient',
                'department',
                'doctor',
                'journals'
            ])
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching registrations: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت لیست مراجعات',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت یک مراجعه خاص
     */
    public function show($reg_id)
    {
        try {
            $registration = Registrations::with([
                'patient',
                'department',
                'doctor',
                'journals'
            ])->find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مراجعه مورد نظر یافت نشد'
                ], 404);
            }

            return response()->json([
                'data' => $registration
            ]);
        } catch (\Exception $e) {
            Log::error('Error showing registration: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت اطلاعات مراجعه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی یک مراجعه
     */
    public function update(Request $request, $reg_id)
    {
        $validated = $request->validate([
            // ارتباط مریض
            'patient_id' => [
                'nullable',
                'exists:patients,id'
            ],

            // معلومات مراجعه
            'department_id' => [
                'nullable',
                'exists:departments,id'
            ],
            'doctor_id' => [
                'nullable',
                'exists:users,id'
            ],
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
            'registration_fee' => [
                'nullable',
                'numeric',
                'min:0'
            ],
            'visit_status' => [
                'nullable',
                'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Billing,Completed,Cancelled'
            ],
            'diagnosis' => 'nullable|string',
            'weight' => [
                'nullable',
                'numeric',
                'min:0',
                'max:300'
            ],
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => [
                'nullable',
                'numeric',
                'min:30',
                'max:45'
            ],
            'oxygen' => [
                'nullable',
                'integer',
                'min:0',
                'max:100'
            ],
            'visit_date' => 'nullable|date',
            'note' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مراجعه مورد نظر یافت نشد'
                ], 404);
            }

            // به‌روزرسانی مراجعه
            $registration->update($validated);

            // اگر وضعیت به‌روزرسانی شد، لاگ ثبت کن
            if ($request->has('visit_status') && $request->visit_status !== $registration->getOriginal('visit_status')) {
                try {
                    LogService::create(
                        'update',
                        'registrations',
                        $registration->reg_id,
                        "وضعیت مراجعه از {$registration->getOriginal('visit_status')} به {$request->visit_status} تغییر یافت",
                        [
                            'old_status' => $registration->getOriginal('visit_status'),
                            'new_status' => $request->visit_status
                        ]
                    );
                } catch (\Exception $e) {
                    Log::error("Status update log failed: " . $e->getMessage());
                }
            }

            // اگر فیس تغییر کرده و جدیدتر از 0 است، ژورنال را به‌روزرسانی کن
            if ($request->has('registration_fee') && $request->registration_fee > 0) {
                $journal = Journal::where('ref_type','patient')
                    ->where('ref_id',$reg_id)
                    ->first();

                if ($journal) {
                    $journal->update([
                        'amount' => $request->registration_fee,
                        'journal_date' => $request->visit_date ?? $journal->journal_date,
                        'description' => "فیس مراجعه مریض - ID: {$registration->reg_id} (به‌روزرسانی)"
                    ]);
                } else {
                    // اگر ژورنال وجود ندارد، ایجاد کن
                    Journal::create([
                        'journal_date' => $request->visit_date ?? now(),
                        'description' => "فیس مراجعه مریض - ID: {$registration->reg_id}",
                        'entry_type' => 'debit',
                        'amount' => $request->registration_fee,
                        'ref_type' => 'patient',
                        'ref_id' => $registration->reg_id,
                        'registration_id' => $registration->reg_id,
                        'user_id' => Auth::id(),
                    ]);
                }
            }

            try {
                LogService::create(
                    'update',
                    'registrations',
                    $registration->reg_id,
                    'Patient registration updated',
                    $validated
                );
            } catch (\Exception $e) {
                Log::error("Registration update log failed: " . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => 'مراجعه مریض موفقانه به‌روزرسانی شد',
                'data' => $registration->load([
                    'patient',
                    'department',
                    'doctor',
                    'journals'
                ])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration update error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());

            return response()->json([
                'message' => 'خطا در به‌روزرسانی مراجعه مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف یک مراجعه
     */
    public function destroy($reg_id)
    {
        DB::beginTransaction();

        try {
            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مراجعه مورد نظر یافت نشد'
                ], 404);
            }

            // حذف ژورنال‌های مرتبط
            Journal::where('ref_type','patient')
                ->where('ref_id',$reg_id)
                ->delete();

            // حذف مراجعه
            $registration->delete();

            try {
                LogService::create(
                    'delete',
                    'registrations',
                    $reg_id,
                    'Patient registration deleted',
                    $registration->toArray()
                );
            } catch (\Exception $e) {
                Log::error("Registration delete log failed: " . $e->getMessage());
            }

            DB::commit();

            return response()->json([
                'message' => 'مراجعه مریض موفقانه حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Registration delete error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());

            return response()->json([
                'message' => 'خطا در حذف مراجعه مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * جستجوی مریض‌ها (برای استفاده در فرانت‌اند)
     */
    public function searchPatients(Request $request)
    {
        try {
            $searchTerm = $request->get('q');
            $searchType = $request->get('type', 'all'); // all, name, national_id, mobile

            if (empty($searchTerm)) {
                return response()->json([
                    'data' => []
                ]);
            }

            $query = Patient::query();

            switch ($searchType) {
                case 'national_id':
                    $query->where('national_id', 'LIKE', "%{$searchTerm}%");
                    break;
                case 'mobile':
                    $query->where('mobile', 'LIKE', "%{$searchTerm}%");
                    break;
                case 'name':
                    $query->where(function($q) use ($searchTerm) {
                        $q->where('first_name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$searchTerm}%");
                    });
                    break;
                default: // all
                    $query->where(function($q) use ($searchTerm) {
                        $q->where('first_name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('national_id', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('mobile', 'LIKE', "%{$searchTerm}%")
                          ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', "%{$searchTerm}%");
                    });
                    break;
            }

            $patients = $query->orderBy('first_name')
                ->limit(20)
                ->get();

            return response()->json([
                'data' => $patients
            ]);

        } catch (\Exception $e) {
            Log::error('Patient search error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در جستجوی مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت اطلاعات کامل یک مریض با شماره ID
     */
    public function getPatientInfo($patient_id)
    {
        try {
            $patient = Patient::with(['registrations' => function($query) {
                $query->orderBy('reg_id', 'desc')->limit(5);
            }])->find($patient_id);

            if (!$patient) {
                return response()->json([
                    'message' => 'مریض مورد نظر یافت نشد'
                ], 404);
            }

            return response()->json([
                'data' => $patient
            ]);

        } catch (\Exception $e) {
            Log::error('Patient info error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت اطلاعات مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار مراجعات
     */
    public function statistics(Request $request)
    {
        try {
            $today = date('Y-m-d');

            // مجموع مراجعات
            $totalPatients = Registrations::count();

            // مراجعات امروز
            $todayPatients = Registrations::whereDate('visit_date', $today)
                ->orWhereDate('created_at', $today)
                ->count();

            // مراجعات در انتظار
            $waitingPatients = Registrations::where('visit_status', 'Waiting')->count();

            // مراجعات تکمیل شده
            $completedPatients = Registrations::where('visit_status', 'Completed')->count();

            // مجموع فیس مراجعات
            $totalFees = Registrations::sum('registration_fee');

            // توزیع وضعیت‌ها
            $statusDistribution = Registrations::select('visit_status', DB::raw('count(*) as count'))
                ->groupBy('visit_status')
                ->get()
                ->pluck('count', 'visit_status')
                ->toArray();

            // مراجعات بر اساس بخش
            $departmentDistribution = Registrations::select('department_id', DB::raw('count(*) as count'))
                ->whereNotNull('department_id')
                ->groupBy('department_id')
                ->with('department')
                ->get()
                ->map(function($item) {
                    return [
                        'department_name' => $item->department ? $item->department->name : 'نامشخص',
                        'count' => $item->count
                    ];
                });

            // مراجعات ۷ روز اخیر
            $lastWeekRegistrations = Registrations::where('visit_date', '>=', date('Y-m-d', strtotime('-7 days')))
                ->orWhere('created_at', '>=', date('Y-m-d', strtotime('-7 days')))
                ->count();

            // بیماران تکراری (مریض‌هایی که بیش از یک مراجعه دارند)
            $repeatPatients = DB::table('registrations')
                ->select('patient_id', DB::raw('count(*) as visit_count'))
                ->groupBy('patient_id')
                ->having('visit_count', '>', 1)
                ->count();

            return response()->json([
                'total_patients' => $totalPatients,
                'today_patients' => $todayPatients,
                'waiting_patients' => $waitingPatients,
                'completed_patients' => $completedPatients,
                'total_fees' => $totalFees,
                'status_distribution' => $statusDistribution,
                'department_distribution' => $departmentDistribution,
                'last_week_registrations' => $lastWeekRegistrations,
                'repeat_patients' => $repeatPatients,
                'date' => $today
            ]);

        } catch (\Exception $e) {
            Log::error('Statistics error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت آمار',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت مراجعات یک مریض خاص
     */
    public function patientRegistrations($patient_id)
    {
        try {
            $registrations = Registrations::with([
                'department',
                'doctor',
                'journals'
            ])
            ->where('patient_id', $patient_id)
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations
            ]);

        } catch (\Exception $e) {
            Log::error('Patient registrations error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت مراجعات مریض',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت مراجعات بر اساس وضعیت
     */
    public function getByStatus($status)
    {
        try {
            $validStatuses = ['Waiting', 'Doctor', 'Laboratory', 'Radiology', 'Pharmacy', 'Billing', 'Completed', 'Cancelled'];
            
            if (!in_array($status, $validStatuses)) {
                return response()->json([
                    'message' => 'وضعیت نامعتبر است'
                ], 422);
            }

            $registrations = Registrations::with([
                'patient',
                'department',
                'doctor'
            ])
            ->where('visit_status', $status)
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Get by status error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت مراجعات بر اساس وضعیت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت مراجعات یک داکتر خاص
     */
    public function getByDoctor($doctor_id)
    {
        try {
            $registrations = Registrations::with([
                'patient',
                'department',
                'journals'
            ])
            ->where('doctor_id', $doctor_id)
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Get by doctor error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت مراجعات داکتر',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت مراجعات یک بخش خاص
     */
    public function getByDepartment($department_id)
    {
        try {
            $registrations = Registrations::with([
                'patient',
                'doctor',
                'journals'
            ])
            ->where('department_id', $department_id)
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations,
                'count' => $registrations->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Get by department error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت مراجعات بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت گزارش مالی مراجعات
     */
    public function financialReport(Request $request)
    {
        try {
            $startDate = $request->get('start_date', date('Y-m-01'));
            $endDate = $request->get('end_date', date('Y-m-d'));

            $registrations = Registrations::with([
                'patient',
                'journals'
            ])
            ->whereBetween('visit_date', [$startDate, $endDate])
            ->orderBy('reg_id', 'desc')
            ->get();

            $totalFees = $registrations->sum('registration_fee');
            $totalPaid = $registrations->sum(function($reg) {
                return $reg->journals->sum('amount');
            });

            $pendingPayments = $totalFees - $totalPaid;

            return response()->json([
                'data' => $registrations,
                'summary' => [
                    'total_registrations' => $registrations->count(),
                    'total_fees' => $totalFees,
                    'total_paid' => $totalPaid,
                    'pending_payments' => $pendingPayments,
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Financial report error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت گزارش مالی',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت خلاصه روزانه مراجعات
     */
    public function dailySummary(Request $request)
    {
        try {
            $date = $request->get('date', date('Y-m-d'));

            $registrations = Registrations::with([
                'patient',
                'department',
                'doctor'
            ])
            ->whereDate('visit_date', $date)
            ->orWhereDate('created_at', $date)
            ->get();

            $statusCounts = $registrations->groupBy('visit_status')
                ->map(function($group) {
                    return $group->count();
                });

            $totalFees = $registrations->sum('registration_fee');

            return response()->json([
                'date' => $date,
                'total_registrations' => $registrations->count(),
                'total_fees' => $totalFees,
                'status_breakdown' => $statusCounts,
                'registrations' => $registrations
            ]);

        } catch (\Exception $e) {
            Log::error('Daily summary error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت خلاصه روزانه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی وضعیت مراجعه (سریع)
     */
    public function updateStatus(Request $request, $reg_id)
    {
        try {
            $validated = $request->validate([
                'visit_status' => [
                    'required',
                    'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Billing,Completed,Cancelled'
                ]
            ]);

            $registration = Registrations::find($reg_id);

            if (!$registration) {
                return response()->json([
                    'message' => 'مراجعه مورد نظر یافت نشد'
                ], 404);
            }

            $oldStatus = $registration->visit_status;
            $registration->visit_status = $request->visit_status;
            $registration->save();

            try {
                LogService::create(
                    'update',
                    'registrations',
                    $registration->reg_id,
                    "وضعیت مراجعه از {$oldStatus} به {$request->visit_status} تغییر یافت",
                    [
                        'old_status' => $oldStatus,
                        'new_status' => $request->visit_status,
                        'changed_by' => Auth::id()
                    ]
                );
            } catch (\Exception $e) {
                Log::error("Status update log failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'وضعیت مراجعه موفقانه به‌روزرسانی شد',
                'data' => $registration->load(['patient', 'department', 'doctor'])
            ]);

        } catch (\Exception $e) {
            Log::error('Update status error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در به‌روزرسانی وضعیت',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت مراجعات امروز برای داشبورد
     */
    public function todayRegistrations()
    {
        try {
            $today = date('Y-m-d');

            $registrations = Registrations::with([
                'patient',
                'department',
                'doctor'
            ])
            ->whereDate('visit_date', $today)
            ->orWhereDate('created_at', $today)
            ->orderBy('reg_id', 'desc')
            ->get();

            return response()->json([
                'data' => $registrations,
                'count' => $registrations->count(),
                'date' => $today
            ]);

        } catch (\Exception $e) {
            Log::error('Today registrations error: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت مراجعات امروز',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ============================================================
    // متدهای مدیریت دیپارتمنت‌ها
    // ============================================================

    /**
     * دریافت لیست تمام دیپارتمنت‌ها
     */
    public function getDepartments(Request $request)
    {
        try {
            $status = $request->get('status', 'all');
            
            $query = Department::query();
            
            if ($status !== 'all') {
                $query->where('status', $status);
            }
            
            $departments = $query->orderBy('name')->get();

            return response()->json([
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت لیست بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت دیپارتمنت‌های فعال
     */
    public function getActiveDepartments()
    {
        try {
            $departments = Department::where('status', 'Active')
                ->select('id', 'uuid', 'code', 'name', 'description')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => $departments
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching active departments: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت بخش‌های فعال',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت یک دیپارتمنت خاص
     */
    public function getDepartment($id)
    {
        try {
            $department = Department::withCount('registrations')->find($id);

            if (!$department) {
                return response()->json([
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            return response()->json([
                'data' => $department
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت اطلاعات بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ایجاد دیپارتمنت جدید
     */
    public function createDepartment(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:departments,name',
                'code' => 'required|string|max:20|unique:departments,code',
                'description' => 'nullable|string',
                'status' => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            $department = Department::create([
                'uuid' => Str::uuid(),
                'code' => $validated['code'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'Active',
                'created_by' => Auth::id(),
            ]);

            try {
                LogService::create(
                    'create',
                    'departments',
                    $department->id,
                    'Department created',
                    $department->toArray()
                );
            } catch (\Exception $e) {
                Log::error("Department log failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'بخش با موفقیت ایجاد شد',
                'data' => $department
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در ایجاد بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * به‌روزرسانی دیپارتمنت
     */
    public function updateDepartment(Request $request, $id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            $validated = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('departments', 'name')->ignore($department->id)
                ],
                'code' => [
                    'required',
                    'string',
                    'max:20',
                    Rule::unique('departments', 'code')->ignore($department->id)
                ],
                'description' => 'nullable|string',
                'status' => ['nullable', Rule::in(['Active', 'Inactive'])],
            ]);

            $oldData = $department->toArray();

            $department->update([
                'name' => $validated['name'],
                'code' => $validated['code'],
                'description' => $validated['description'] ?? $department->description,
                'status' => $validated['status'] ?? $department->status,
                'updated_by' => Auth::id(),
            ]);

            try {
                LogService::create(
                    'update',
                    'departments',
                    $department->id,
                    'Department updated',
                    [
                        'old' => $oldData,
                        'new' => $department->toArray()
                    ]
                );
            } catch (\Exception $e) {
                Log::error("Department update log failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'بخش با موفقیت به‌روزرسانی شد',
                'data' => $department
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در به‌روزرسانی بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف دیپارتمنت
     */
    public function deleteDepartment($id)
    {
        try {
            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            // بررسی اینکه آیا بخش در مراجعات استفاده شده است
            $hasRegistrations = $department->registrations()->exists();
            
            if ($hasRegistrations) {
                // اگر بخش در مراجعات استفاده شده، فقط غیرفعال می‌کنیم
                $oldStatus = $department->status;
                $department->update([
                    'status' => 'Inactive',
                    'updated_by' => Auth::id(),
                ]);

                try {
                    LogService::create(
                        'update',
                        'departments',
                        $department->id,
                        'Department deactivated due to existing registrations',
                        [
                            'old_status' => $oldStatus,
                            'new_status' => 'Inactive'
                        ]
                    );
                } catch (\Exception $e) {
                    Log::error("Department deactivation log failed: " . $e->getMessage());
                }

                return response()->json([
                    'message' => 'بخش به دلیل استفاده در مراجعات، غیرفعال شد',
                    'data' => $department
                ]);
            }

            // اگر استفاده نشده، حذف فیزیکی
            $departmentData = $department->toArray();
            $department->delete();

            try {
                LogService::create(
                    'delete',
                    'departments',
                    $id,
                    'Department deleted',
                    $departmentData
                );
            } catch (\Exception $e) {
                Log::error("Department delete log failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'بخش با موفقیت حذف شد'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting department: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در حذف بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * دریافت آمار دیپارتمنت‌ها
     */
    public function departmentStatistics()
    {
        try {
            $total = Department::count();
            $active = Department::where('status', 'Active')->count();
            $inactive = Department::where('status', 'Inactive')->count();
            
            $departmentUsage = Department::withCount('registrations')
                ->orderBy('registrations_count', 'desc')
                ->get()
                ->map(function($dept) {
                    return [
                        'id' => $dept->id,
                        'name' => $dept->name,
                        'code' => $dept->code,
                        'registration_count' => $dept->registrations_count,
                        'status' => $dept->status
                    ];
                });

            return response()->json([
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'usage' => $departmentUsage
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching department statistics: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در دریافت آمار بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * جستجوی دیپارتمنت‌ها
     */
    public function searchDepartments(Request $request)
    {
        try {
            $searchTerm = $request->get('q', '');
            $status = $request->get('status', 'all');

            $query = Department::query();

            if (!empty($searchTerm)) {
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('code', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('description', 'LIKE', "%{$searchTerm}%");
                });
            }

            if ($status !== 'all') {
                $query->where('status', $status);
            }

            $departments = $query->orderBy('name')->get();

            return response()->json([
                'data' => $departments,
                'count' => $departments->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching departments: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در جستجوی بخش‌ها',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * تغییر وضعیت دیپارتمنت
     */
    public function toggleDepartmentStatus(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'status' => ['required', Rule::in(['Active', 'Inactive'])]
            ]);

            $department = Department::find($id);

            if (!$department) {
                return response()->json([
                    'message' => 'بخش مورد نظر یافت نشد'
                ], 404);
            }

            if ($validated['status'] === 'Inactive' && $department->registrations()->exists()) {
                return response()->json([
                    'message' => 'امکان غیرفعال کردن بخش وجود ندارد زیرا در مراجعات استفاده شده است',
                    'registrations_count' => $department->registrations()->count()
                ], 422);
            }

            $oldStatus = $department->status;
            $department->update([
                'status' => $validated['status'],
                'updated_by' => Auth::id(),
            ]);

            try {
                LogService::create(
                    'update',
                    'departments',
                    $department->id,
                    "Department status changed from {$oldStatus} to {$validated['status']}",
                    [
                        'old_status' => $oldStatus,
                        'new_status' => $validated['status']
                    ]
                );
            } catch (\Exception $e) {
                Log::error("Department status change log failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => "وضعیت بخش با موفقیت به {$validated['status']} تغییر یافت",
                'data' => $department
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'خطا در اعتبارسنجی اطلاعات',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error toggling department status: ' . $e->getMessage());
            return response()->json([
                'message' => 'خطا در تغییر وضعیت بخش',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}