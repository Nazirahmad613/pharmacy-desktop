<?php

namespace App\Http\Controllers;

use App\Models\Registrations;
use App\Models\Journal;
use Illuminate\Http\Request;
use App\Services\LogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RegistrationsController extends Controller
{
    /**
     * ثبت مراجعه جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            /*
            |--------------------------------------------------------------------------
            | نوع ثبت
            |--------------------------------------------------------------------------
            */
            'reg_type' => [
                'required',
                'in:patient,doctor,visitor,laboratory,transport,consultation'
            ],

            /*
            |--------------------------------------------------------------------------
            | اطلاعات عمومی مراجعه
            |--------------------------------------------------------------------------
            */
            'full_name' => [
                'required',
                'string',
                'max:255'
            ],
            'father_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'gender' => [
                'nullable',
                'in:male,female,other'
            ],
            'age' => 'nullable|integer',
            'blood_group' => 'nullable|string|max:10',
            'address' => 'nullable|string',

            /*
            |--------------------------------------------------------------------------
            | ارتباطات HIS
            |--------------------------------------------------------------------------
            */
            'patient_id' => [
                'nullable',
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
            | گردش مراجعه مریض
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
            'visit_status' => [
                'nullable',
                'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Completed,Cancelled'
            ],

            /*
            |--------------------------------------------------------------------------
            | اطلاعات طبی اولیه
            |--------------------------------------------------------------------------
            */
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

            /*
            |--------------------------------------------------------------------------
            | تاریخ و یادداشت
            |--------------------------------------------------------------------------
            */
            'visit_date' => 'nullable|date',
            'note' => 'nullable|string',
        ]);

        // شروع تراکنش
        DB::beginTransaction();

        try {
            $data = Registrations::create($validated);

            // ثبت در ژورنال - برای مریض‌ها
            if ($validated['reg_type'] === 'patient') {
                // ایجاد رکورد ژورنال برای مریض
                $journal = Journal::create([
                    'journal_date' => $validated['visit_date'] ?? now(),
                    'description' => "ثبت مریض جدید: {$validated['full_name']}",
                    'entry_type' => 'debit', // یا credit بر اساس نیاز
                    'amount' => 0, // مقدار اولیه صفر - بعداً توسط فیس‌ها تکمیل می‌شود
                    'ref_type' => 'patient',
                    'ref_id' => $data->reg_id,
                    'tazkira_number' => $validated['tazkira_number'] ?? null,
                    'user_id' => Auth::id(),
                    'registration_id' => $data->reg_id, // ارتباط با رجستریشن
                ]);

                LogService::create(
                    'create',
                    'journals',
                    $journal->id,
                    'Journal created for patient registration',
                    $journal->toArray()
                );
            }

            LogService::create(
                'create',
                'registrations',
                $data->reg_id,
                'Registration created',
                $data->toArray()
            );

            DB::commit();

            return response()->json([
                'message' => 'مراجعه مریض موفقانه ثبت شد',
                'data' => $data->load([
                    'patient',
                    'department',
                    'doctor'
                ])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'registrations',
                null,
                'Error creating registration',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در ثبت مراجعه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * لیست مراجعه ها
     */
    public function index(Request $request)
    {
        $query = Registrations::with([
            'patient',
            'department',
            'doctor'
        ]);

        if ($request->filled('reg_type')) {
            $query->where('reg_type', $request->reg_type);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->filled('visit_status')) {
            $query->where('visit_status', $request->visit_status);
        }

        return response()->json(
            $query
                ->orderBy('reg_id', 'desc')
                ->get()
        );
    }

    /**
     * ویرایش مراجعه
     */
    public function update(Request $request, $reg_id)
    {
        $registration = Registrations::find($reg_id);

        if (!$registration) {
            return response()->json([
                'message' => 'رجستریشن یافت نشد'
            ], 404);
        }

        $validated = $request->validate([
            'reg_type' => [
                'sometimes',
                'in:patient,doctor,visitor,laboratory,transport,consultation'
            ],
            'full_name' => 'sometimes|string|max:255',
            'father_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'gender' => 'nullable|in:male,female,other',
            'age' => 'nullable|integer',
            'blood_group' => 'nullable|string|max:10',
            'address' => 'nullable|string',

            'patient_id' => 'nullable|exists:patients,id',
            'department_id' => 'nullable|exists:departments,id',
            'doctor_id' => 'nullable|exists:users,id',

            'visit_number' => 'nullable|string|max:50',
            'visit_type' => 'nullable|in:OPD,IPD,Emergency,Laboratory,Radiology,Pharmacy',
            'queue_number' => 'nullable|integer|min:1',
            'visit_status' => [
                'nullable',
                'in:Waiting,Doctor,Laboratory,Radiology,Pharmacy,Completed,Cancelled'
            ],

            'diagnosis' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0|max:300',
            'blood_pressure' => 'nullable|string|max:20',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'oxygen' => 'nullable|integer|min:0|max:100',

            'visit_date' => 'nullable|date',
            'note' => 'nullable|string'
        ]);

        DB::beginTransaction();

        try {
            $oldData = $registration->toArray();
            $registration->update($validated);

            // بروزرسانی ژورنال مرتبط با این رجستریشن
            if ($registration->reg_type === 'patient') {
                $journal = Journal::where('ref_type', 'patient')
                    ->where('ref_id', $registration->reg_id)
                    ->first();

                if ($journal) {
                    $journal->update([
                        'description' => "ویرایش مریض: {$registration->full_name}",
                        'tazkira_number' => $registration->tazkira_number ?? $journal->tazkira_number,
                    ]);

                    LogService::create(
                        'update',
                        'journals',
                        $journal->id,
                        'Journal updated for patient registration',
                        [
                            'old' => $oldData,
                            'new' => $registration->toArray()
                        ]
                    );
                }
            }

            LogService::create(
                'update',
                'registrations',
                $registration->reg_id,
                'Registration updated',
                [
                    'old' => $oldData,
                    'new' => $registration->toArray()
                ]
            );

            DB::commit();

            return response()->json([
                'message' => 'مراجعه موفقانه ویرایش شد',
                'data' => $registration->load([
                    'patient',
                    'department',
                    'doctor'
                ])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'registrations',
                $reg_id,
                'Error updating registration',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در ویرایش مراجعه',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * حذف
     */
    public function destroy($reg_id)
    {
        $registration = Registrations::find($reg_id);

        if (!$registration) {
            return response()->json([
                'message' => 'رجستریشن یافت نشد'
            ], 404);
        }

        DB::beginTransaction();

        try {
            $data = $registration->toArray();

            // حذف ژورنال‌های مرتبط با این رجستریشن
            Journal::where('ref_type', $registration->reg_type)
                ->where('ref_id', $registration->reg_id)
                ->delete();

            $registration->delete();

            LogService::create(
                'delete',
                'registrations',
                $reg_id,
                'Registration deleted',
                $data
            );

            DB::commit();

            return response()->json([
                'message' => 'رجستریشن حذف شد'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'registrations',
                $reg_id,
                'Error deleting registration',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در حذف رجستریشن',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * اضافه کردن فیس به ژورنال مریض
     */
    public function addFeeToJournal(Request $request, $reg_id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:1000',
            'entry_type' => 'required|in:debit,credit',
        ]);

        $registration = Registrations::find($reg_id);

        if (!$registration) {
            return response()->json([
                'message' => 'رجستریشن یافت نشد'
            ], 404);
        }

        DB::beginTransaction();

        try {
            // پیدا کردن یا ایجاد ژورنال برای این مریض
            $journal = Journal::where('ref_type', 'patient')
                ->where('ref_id', $reg_id)
                ->first();

            if (!$journal) {
                // اگر ژورنال وجود ندارد، ایجاد می‌کنیم
                $journal = Journal::create([
                    'journal_date' => now(),
                    'description' => "ثبت مریض: {$registration->full_name}",
                    'entry_type' => 'debit',
                    'amount' => 0,
                    'ref_type' => 'patient',
                    'ref_id' => $reg_id,
                    'tazkira_number' => $registration->tazkira_number ?? null,
                    'user_id' => Auth::id(),
                    'registration_id' => $reg_id,
                ]);
            }

            // ثبت فیس جدید در ژورنال
            $newJournal = Journal::create([
                'journal_date' => now(),
                'description' => $request->description ?? "فیس مریض: {$registration->full_name}",
                'entry_type' => $request->entry_type,
                'amount' => $request->amount,
                'ref_type' => 'patient',
                'ref_id' => $reg_id,
                'tazkira_number' => $registration->tazkira_number ?? null,
                'user_id' => Auth::id(),
                'registration_id' => $reg_id,
                'parent_journal_id' => $journal->id, // ارتباط با ژورنال اصلی
            ]);

            // بروزرسانی مبلغ کل در ژورنال اصلی
            $totalAmount = Journal::where('registration_id', $reg_id)
                ->where('entry_type', 'debit')
                ->sum('amount');

            $journal->update([
                'amount' => $totalAmount,
                'description' => "مجموع فیس‌های مریض: {$registration->full_name} - مجموع: {$totalAmount}"
            ]);

            LogService::create(
                'create',
                'journals',
                $newJournal->id,
                'Fee added to patient journal',
                $newJournal->toArray()
            );

            DB::commit();

            return response()->json([
                'message' => 'فیس با موفقیت به ژورنال اضافه شد',
                'journal' => $newJournal,
                'total_amount' => $totalAmount
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            LogService::create(
                'error',
                'journals',
                null,
                'Error adding fee to journal',
                ['error' => $e->getMessage()]
            );

            return response()->json([
                'message' => 'خطا در اضافه کردن فیس به ژورنال',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}