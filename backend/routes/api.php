<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// ==================== Controllers ====================
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\CustomersController;
use App\Http\Controllers\DoctorTreatmentController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesDetailsController;
use App\Http\Controllers\ViewMedicationsController;
use App\Http\Controllers\ViewProfitLossController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\StockReportController;
use App\Http\Controllers\ParchasesController;
use App\Http\Controllers\SalesFullDetailsController;
use App\Http\Controllers\RegistrationsController;
use App\Http\Controllers\JournalController;
use App\Http\Controllers\HospitalReportController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\AccountSummaryController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\DepartementController;
use App\Http\Controllers\BenefitController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ViewInventoryController;
use App\Http\Controllers\ExaminationController;
use App\Http\Controllers\LaboratoryRequestController;
use App\Http\Controllers\LaboratoryFeeController;
use App\Http\Controllers\PrescriptionFeeController;
use App\Http\Controllers\LaboratoryController;
use App\Http\Controllers\LaboratoryResultController;
use App\Http\Controllers\RadiologyRequestController;
use App\Http\Controllers\RadiologyFeeController;
use App\Http\Controllers\RadiologyResultController;

/*
|--------------------------------------------------------------------------
| API Test
|--------------------------------------------------------------------------
*/
Route::get('/test', function () {
    return response()->json(['message' => 'API is working', 'timestamp' => now()]);
});

/*
|--------------------------------------------------------------------------
| Authentication (PUBLIC)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/sales-view', [SalesController::class, 'view']);
Route::get('/sales/chart', [SalesController::class, 'chart']);

/*
|--------------------------------------------------------------------------
| Stock Routes (PUBLIC)
|--------------------------------------------------------------------------
*/
Route::prefix('stock')->group(function () {
    Route::get('/', [StockController::class, 'index']);
    Route::get('/summary', [StockController::class, 'summary']);
    Route::get('/expiring', [StockController::class, 'expiring']);
    Route::get('/expired', [StockController::class, 'expired']);
    Route::get('/report', [StockController::class, 'report']);
    Route::post('/check', [StockController::class, 'check']);
    Route::get('/suppliers/{medId}', [StockController::class, 'getSuppliersByMedication']);
    Route::get('/details/{medId}', [StockController::class, 'getStockDetails']);
    Route::get('/types/{medId}', [StockController::class, 'getTypesByMedication']);
    Route::get('/reports/medication-stock', [StockReportController::class, 'medicationStock']);
});

Route::post('/sales/check-stock', [SalesController::class, 'checkStockBeforeSale']);
Route::post('/sales/check-multiple-stock', [SalesController::class, 'checkMultipleStockBeforeSale']);
Route::get('/low-stock', [StockController::class, 'lowStock']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Token-based)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    
    Route::put('/profile', [ProfileController::class, 'updateProfile']);
    Route::get('/profile', [ProfileController::class, 'getProfile']);
    
    // ===== Logs =====
    Route::get('/logs', [LogController::class, 'index'])->middleware('can:view-logs');

    // ===== Users Management =====
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::post('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // ===== Auth =====
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ===== Roles Management =====
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::delete('/roles/{id}', [RoleController::class, 'destroy']);
    Route::post('/roles/{id}/permissions', [RoleController::class, 'assignPermissions']);
    Route::delete('/roles/{id}/permissions/{permissionId}', [RoleController::class, 'removePermission']);

    // ===== Permissions Management =====
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::post('/permissions', [PermissionController::class, 'store']);
    Route::delete('/permissions/{id}', [PermissionController::class, 'destroy']);

    // ===== Departments =====
    Route::get('/departments', [DepartementController::class, 'index']);

    // ===== Dashboard =====
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ===== Medications =====
    Route::get('/medications', [MedicationController::class, 'index']);
    Route::post('/medications', [MedicationController::class, 'store']);
    Route::get('/medications/{med_id}', [MedicationController::class, 'show']);
    Route::put('/medications/{med_id}', [MedicationController::class, 'update']);
    Route::delete('/medications/{med_id}', [MedicationController::class, 'destroy']);

    // ============================================================
    // ✅ مسیرهای داکتر (Doctor)
    // ============================================================
    Route::prefix('doctor')->group(function () {
        
        Route::get('/treatment/active', [DoctorTreatmentController::class,'activePatients']);
        Route::get('/queue', [DoctorTreatmentController::class, 'doctorQueue']);
        Route::post('/treatment/progress/save', [DoctorTreatmentController::class, 'saveProgress']);
        Route::get('/treatment/progress/{registrationId}', [DoctorTreatmentController::class, 'getProgress']);
        Route::get('/patient/{reg_id}', [DoctorTreatmentController::class, 'show']);
        Route::post('/treatment/{reg_id}', [DoctorTreatmentController::class, 'treatment']);
        Route::post('/start-treatment/{reg_id}', [DoctorTreatmentController::class, 'startTreatment']);
        Route::post('/laboratory/{reg_id}', [DoctorTreatmentController::class, 'sendToLaboratory']);
        Route::post('/complete/{reg_id}', [DoctorTreatmentController::class, 'complete']);
        Route::post('/return-to-treatment/{history_id}', [DoctorTreatmentController::class, 'returnToTreatment']);
        Route::get('/treatment-history', [DoctorTreatmentController::class, 'treatmentHistory']);
        Route::post('/radiology-request', [DoctorTreatmentController::class, 'storeRadiologyRequest']);
        Route::post('/follow-up', [DoctorTreatmentController::class, 'storeFollowUp']);
        Route::get('/wards', [DoctorTreatmentController::class, 'getWards']);
        Route::post('/admission', [DoctorTreatmentController::class, 'storeAdmission']);

        Route::post('/{id}/send-to-treatment', [LaboratoryRequestController::class, 'sendToTreatment']);

        // ============================================================
        // ✅ مسیرهای معاینات (ExaminationController)
        // ============================================================
        Route::post('/examination/{registrationId}', [ExaminationController::class, 'store']);
        Route::get('/examination/{registrationId}', [ExaminationController::class, 'show']);
        Route::get('/examination-by-id/{id}', [ExaminationController::class, 'getById']);
        Route::get('/patient-history/{patientId}', [ExaminationController::class, 'history']);
        Route::get('/patient-history-filter/{patientId}', [ExaminationController::class, 'historyWithDateFilter']);
        Route::get('/my-examinations', [ExaminationController::class, 'myExaminations']);
        Route::get('/my-statistics', [ExaminationController::class, 'getStatistics']);
        Route::get('/my-latest', [ExaminationController::class, 'getLatest']);
        Route::get('/today-summary', [ExaminationController::class, 'getTodaySummary']);
        Route::get('/search-examinations', [ExaminationController::class, 'search']);
        Route::get('/date-range', [ExaminationController::class, 'getByDateRange']);
        Route::put('/examination/{id}', [ExaminationController::class, 'update']);
        Route::delete('/examination/{id}', [ExaminationController::class, 'destroy']);
        Route::post('/complete-examination/{registrationId}', [ExaminationController::class, 'complete']);
        Route::get('/examinations/patient/{patientId}', [ExaminationController::class, 'getPatientExaminations']);
        Route::get('/examinations/{id}/edit', [ExaminationController::class, 'getExaminationForEdit']);
        Route::put('/examinations/{id}', [ExaminationController::class, 'updateExamination']);
        Route::delete('/examinations/{id}', [ExaminationController::class, 'deleteExamination']);
        Route::post('/treatment/{registrationId}/complete', [ExaminationController::class, 'complete']);
        
        // ============================================================
        // ✅ مسیرهای لابراتوار برای دکتر
        // ============================================================
        Route::prefix('laboratory')->group(function () {
            Route::get('/{registrationId}', [LaboratoryRequestController::class, 'getByRegistration']);
            Route::post('/{registrationId}', [LaboratoryRequestController::class, 'store']);
        });
    });

    // ============================================================
    // ✅ ROUTES مدیریت درخواست‌های لابراتوار
    // ============================================================
    Route::prefix('laboratory-requests')->group(function () {
        Route::get('/all', [LaboratoryRequestController::class, 'getAllRequests']);
        Route::get('/', [LaboratoryRequestController::class, 'index']);
        Route::get('/registration/{registrationId}/full', [LaboratoryRequestController::class, 'getByRegistrationFull']);
        Route::get('/registration/{registrationId}', [LaboratoryRequestController::class, 'getByRegistration']);
        Route::post('/registration/{registrationId}', [LaboratoryRequestController::class, 'store']);
        Route::get('/{id}', [LaboratoryRequestController::class, 'show']);
        Route::put('/{id}', [LaboratoryRequestController::class, 'update']);
        Route::delete('/{id}', [LaboratoryRequestController::class, 'destroy']);
        Route::post('/{id}/send-to-lab', [LaboratoryRequestController::class, 'sendToLab']);
        
        Route::get('/doctor/{doctorId}/with-results', [LaboratoryResultController::class, 'getDoctorRequestsWithResults'])
            ->name('laboratory-requests.doctor-with-results')
            ->where('doctorId', '[0-9]+');
        
        Route::get('/patient/{patientId}/with-results', [LaboratoryResultController::class, 'getPatientRequestsWithResults'])
            ->name('laboratory-requests.patient-with-results')
            ->where('patientId', '[0-9]+');
    });

    // ============================================================
    // ✅ ROUTES مدیریت نتایج لابراتوار
    // ============================================================
    Route::prefix('laboratory-results')->group(function () {
        
        Route::post('upload-pdf', [LaboratoryResultController::class, 'uploadPdf'])
            ->name('laboratory-results.upload-pdf');
        
        Route::get('request/{requestId}', [LaboratoryResultController::class, 'getResultByRequestId'])
            ->name('laboratory-results.by-request')
            ->where('requestId', '[0-9]+');
        
        Route::get('patient/{patientId}', [LaboratoryResultController::class, 'getResultsByPatient'])
            ->name('laboratory-results.by-patient')
            ->where('patientId', '[0-9]+');
        
        Route::get('all', [LaboratoryResultController::class, 'getRequestsWithResults'])
            ->name('laboratory-results.all');
        
        Route::get('/', [LaboratoryResultController::class, 'index'])
            ->name('laboratory-results.index');
        
        Route::post('/', [LaboratoryResultController::class, 'store'])
            ->name('laboratory-results.store');
        
        Route::get('/{id}', [LaboratoryResultController::class, 'show'])
            ->name('laboratory-results.show')
            ->where('id', '[0-9]+');
        
        Route::put('/{id}', [LaboratoryResultController::class, 'update'])
            ->name('laboratory-results.update')
            ->where('id', '[0-9]+');
        
        Route::delete('/{id}', [LaboratoryResultController::class, 'destroy'])
            ->name('laboratory-results.destroy')
            ->where('id', '[0-9]+');
        
        Route::get('download/{id}', [LaboratoryResultController::class, 'downloadPdf'])
            ->name('laboratory-results.download')
            ->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ ============ رادیولوژی (اصلاح شده) ============
    // ============================================================
    
    // ============================================================
    // ✅ ROUTES مدیریت درخواست‌های رادیولوژی (RadiologyRequestController)
    // ============================================================
    Route::prefix('radiology-requests')->group(function () {
        
        // دریافت همه درخواست‌ها (حتی بدون فیس)
        Route::get('/all', [RadiologyRequestController::class, 'getAllRequests']);
        
        // دریافت درخواست‌های یک مراجعه
        Route::get('/registration/{regId}', [RadiologyRequestController::class, 'getByRegistration']);
        
        // دریافت اطلاعات کامل یک مراجعه
        Route::get('/registration/{regId}/full', [RadiologyRequestController::class, 'getFullByRegistration']);
        
        // ثبت درخواست جدید
        Route::post('/registration/{regId}', [RadiologyRequestController::class, 'store']);
        
        // دریافت یک درخواست خاص
        Route::get('/{id}', [RadiologyRequestController::class, 'show']);
        
        // بروزرسانی درخواست
        Route::put('/{id}', [RadiologyRequestController::class, 'update']);
        
        // حذف درخواست
        Route::delete('/{id}', [RadiologyRequestController::class, 'destroy']);
        
        // تغییر وضعیت درخواست
        Route::patch('/{id}/status', [RadiologyRequestController::class, 'updateStatus']);
    });

    // ============================================================
    // ✅ ROUTES مدیریت فیس‌های رادیولوژی (RadiologyFeeController)
    // ============================================================
    Route::prefix('radiology-fees')->group(function () {
        
        // دریافت همه فیس‌ها
        Route::get('/', [RadiologyFeeController::class, 'index']);
        
        // دریافت همه درخواست‌ها با وضعیت فیس
        Route::get('/all-requests', [RadiologyFeeController::class, 'getAllRequests']);
        
        // دریافت اطلاعات یک مراجعه با فیس‌ها
        Route::get('/registration/{regId}', [RadiologyFeeController::class, 'getByRegistration']);
        
        // ثبت فیس جدید برای یک مراجعه
        Route::post('/registration/{regId}', [RadiologyFeeController::class, 'store']);
        
        // دریافت یک فیس خاص
        Route::get('/{id}', [RadiologyFeeController::class, 'show']);
        
        // بروزرسانی فیس
        Route::put('/{id}', [RadiologyFeeController::class, 'update']);
        
        // حذف فیس
        Route::delete('/{id}', [RadiologyFeeController::class, 'destroy']);
    });

    // ============================================================
    // ✅ ROUTES مدیریت نتایج رادیولوژی (RadiologyResultController)
    // ✅ این مسیرها از جدول radiology_requests و فیلتر has_fee=true استفاده می‌کنند
    // ============================================================
    Route::prefix('radiology-results')->group(function () {
        
        // ============================================================
        // 🔴 مهم: این مسیرها از جدول radiology_requests استفاده می‌کنند
        // و فقط درخواست‌های دارای فیس (has_fee = true) را نمایش می‌دهند
        // ============================================================
        
        // دریافت همه درخواست‌های دارای فیس (برای نمایش در صفحه نتایج)
        Route::get('/all', [RadiologyResultController::class, 'getAllRequests']);
        
        // دریافت همه درخواست‌ها با نتایج (فقط دارای فیس)
        Route::get('/with-results', [RadiologyResultController::class, 'getRequestsWithResults']);
        
        // دریافت درخواست‌های یک مراجعه (فقط دارای فیس)
        Route::get('/registration/{regId}', [RadiologyResultController::class, 'getByRegistration']);
        
        // دریافت کامل اطلاعات یک مراجعه (فقط دارای فیس)
        Route::get('/registration/{regId}/full', [RadiologyResultController::class, 'getFullByRegistration']);
        
        // دریافت درخواست‌های یک دکتر (فقط دارای فیس)
        Route::get('/doctor/{doctorId}', [RadiologyResultController::class, 'getDoctorRequestsWithResults'])
            ->where('doctorId', '[0-9]+');
        
        // دریافت درخواست‌های یک بیمار (فقط دارای فیس)
        Route::get('/patient/{patientId}', [RadiologyResultController::class, 'getPatientRequestsWithResults'])
            ->where('patientId', '[0-9]+');
        
        // ============================================================
        // مسیرهای مربوط به نتایج (RadiologyResult)
        // ============================================================
        
        // آپلود فایل PDF
        Route::post('upload-pdf', [RadiologyResultController::class, 'uploadPdf'])
            ->name('radiology-results.upload-pdf');
        
        // دریافت نتیجه بر اساس شناسه درخواست
        Route::get('request/{requestId}', [RadiologyResultController::class, 'getResultByRequestId'])
            ->name('radiology-results.by-request')
            ->where('requestId', '[0-9]+');
        
        // دریافت تمام نتایج یک بیمار
        Route::get('patient/{patientId}/results', [RadiologyResultController::class, 'getResultsByPatient'])
            ->name('radiology-results.by-patient')
            ->where('patientId', '[0-9]+');
        
        // لیست نتایج
        Route::get('/', [RadiologyResultController::class, 'index'])
            ->name('radiology-results.index');
        
        // ثبت نتیجه جدید
        Route::post('/', [RadiologyResultController::class, 'store'])
            ->name('radiology-results.store');
        
        // نمایش یک نتیجه
        Route::get('/{id}', [RadiologyResultController::class, 'show'])
            ->name('radiology-results.show')
            ->where('id', '[0-9]+');
        
        // ویرایش نتیجه
        Route::put('/{id}', [RadiologyResultController::class, 'update'])
            ->name('radiology-results.update')
            ->where('id', '[0-9]+');
        
        // حذف نتیجه
        Route::delete('/{id}', [RadiologyResultController::class, 'destroy'])
            ->name('radiology-results.destroy')
            ->where('id', '[0-9]+');
        
        // دانلود فایل PDF
        Route::get('download/{id}', [RadiologyResultController::class, 'downloadPdf'])
            ->name('radiology-results.download')
            ->where('id', '[0-9]+');
    });

    // ============================================================
    // مسیرهای مدیریت فیس‌های لابراتوار
    // ============================================================
    Route::prefix('laboratory-fees')->group(function () {
        Route::get('/', [LaboratoryFeeController::class, 'index']);
        Route::get('/all-requests', [LaboratoryFeeController::class, 'getAllRequests']);
        Route::get('/reg-id/{regId}', [LaboratoryFeeController::class, 'getRequestsByRegId']);
        Route::get('/unpaid/{regId}', [LaboratoryFeeController::class, 'getUnpaidRequests']);
        Route::post('/registration/{regId}', [LaboratoryFeeController::class, 'store']);
        Route::put('/{id}', [LaboratoryFeeController::class, 'update']);
        Route::delete('/{id}', [LaboratoryFeeController::class, 'destroy']);
        Route::get('/{id}', [LaboratoryFeeController::class, 'show']);
    });

    // ============================================================
    // مسیرهای فیس نسخه
    // ============================================================
    Route::prefix('prescription-fees')->group(function () {
        Route::get('/', [PrescriptionFeeController::class, 'index']);
        Route::post('/', [PrescriptionFeeController::class, 'store']);
        Route::get('/statistics', [PrescriptionFeeController::class, 'statistics']);
        Route::put('/{id}', [PrescriptionFeeController::class, 'update']);
        Route::delete('/{id}', [PrescriptionFeeController::class, 'destroy']);
    });

    // ===== Prescriptions =====
    Route::get('/prescriptions/medication/{med_id}/suppliers', [PrescriptionController::class, 'getMedicationSuppliers']);
    Route::get('/prescriptions', [PrescriptionController::class, 'index']);
    Route::post('/prescriptions', [PrescriptionController::class, 'store']);
    Route::put('/prescriptions/{pres_id}', [PrescriptionController::class, 'update']);
    Route::delete('/prescriptions/{pres_id}', [PrescriptionController::class, 'destroy']);

    // ===== Stock & Sales Reports =====
    Route::get('/salesd', [SalesFullDetailsController::class, 'index']);

    // ===== Sales Details =====
    Route::get('/sales-details', [SalesDetailsController::class, 'index']);

    // ===== Customers =====
    Route::get('/customers', [CustomersController::class, 'index']);

    // ===== Categories =====
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // ===== Purchases =====
    Route::prefix('parchases')->group(function () {
        Route::get('/', [ParchasesController::class, 'index']);
        Route::post('/', [ParchasesController::class, 'store']);
        Route::get('/{parchaseid}', [ParchasesController::class, 'show']);
        Route::put('/{parchaseid}', [ParchasesController::class, 'update']);
        Route::delete('/{parchaseid}', [ParchasesController::class, 'destroy']);
    });

    // ===== Notifications =====
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::put('/notifications/{id}', [NotificationController::class, 'update']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // ============================================================
    // مسیرهای مدیریت مراجعات (RegistrationsController)
    // ============================================================
    Route::prefix('registrations')->group(function () {
        Route::post('/', [RegistrationsController::class, 'store']);
        Route::get('/', [RegistrationsController::class, 'index']);
        Route::get('/statistics', [RegistrationsController::class, 'statistics']);
        Route::get('/today', [RegistrationsController::class, 'todayRegistrations']);
        Route::put('/{reg_id}/status', [RegistrationsController::class, 'updateStatus']);
        Route::get('/{reg_id}', [RegistrationsController::class, 'show']);
        Route::put('/{reg_id}', [RegistrationsController::class, 'update']);
        Route::delete('/{reg_id}', [RegistrationsController::class, 'destroy']);
    });
    
    // ============================================================
    // مسیرهای مدیریت دیپارتمنت‌ها
    // ============================================================
    Route::prefix('departments')->group(function () {
        Route::get('/', [RegistrationsController::class, 'getDepartments']);
        Route::get('/active', [RegistrationsController::class, 'getActiveDepartments']);
        Route::get('/{id}', [RegistrationsController::class, 'getDepartment']);
        Route::post('/', [RegistrationsController::class, 'createDepartment']);
        Route::put('/{id}', [RegistrationsController::class, 'updateDepartment']);
        Route::delete('/{id}', [RegistrationsController::class, 'deleteDepartment']);
        Route::get('/statistics', [RegistrationsController::class, 'departmentStatistics']);
        Route::get('/search', [RegistrationsController::class, 'searchDepartments']);
        Route::patch('/{id}/toggle-status', [RegistrationsController::class, 'toggleDepartmentStatus']);
    });

    // ===== Sales CRUD =====
    Route::prefix('sales')->group(function () {
        Route::get('/', [SalesController::class, 'index']);
        Route::post('/', [SalesController::class, 'store']);
        Route::put('/{sales_id}', [SalesController::class, 'update']);
        Route::delete('/{sales_id}', [SalesController::class, 'destroy']);
    });

    // ===== Journals =====
    Route::prefix('journals')->group(function () {
        Route::get('/', [JournalController::class, 'index']);
        Route::get('/{id}', [JournalController::class, 'show']);
        Route::post('/', [JournalController::class, 'store']);
        Route::put('/{id}', [JournalController::class, 'update']);
        Route::post('/upsert/{id?}', [JournalController::class, 'upsert']);
    });

    // ===== Reports / Views =====
    Route::get('/view-inventory', [ViewInventoryController::class, 'index']);
    Route::get('/view-medications', [ViewMedicationsController::class, 'index']);
    Route::get('/account-summary', [AccountSummaryController::class, 'index']);
    Route::get('/view-profit-loss', [ViewProfitLossController::class, 'index']);
    Route::get('/hospital-reports', [HospitalReportController::class, 'index']);
    Route::get('/reports/medication-stock', [StockReportController::class, 'medicationStock']);
    Route::get('/dashboard-daily', function () {
        return DB::table('view_dashboard_daily')->get();
    });
    Route::get('/benefits', [BenefitController::class, 'index']);
    Route::get('/patients/search', [RegistrationsController::class, 'searchPatients']);
    Route::get('/patients/{patient_id}/info', [RegistrationsController::class, 'getPatientInfo']);
});

/*
|--------------------------------------------------------------------------
| Public Routes (بدون نیاز به احراز هویت)
|--------------------------------------------------------------------------
*/
Route::get('/sales-report', function (Request $request) {
    $type = $request->get('type', 'daily');
    $query = DB::table('view_sales_summary');
    if ($type) {
        $query->where('report_type', $type);
    }
    return $query->get();
});

Route::get('/benefits-chart', [BenefitController::class, 'chart']);