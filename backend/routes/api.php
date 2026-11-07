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
use App\Http\Controllers\DepartmentController;
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
use App\Http\Controllers\OperationController;
use App\Http\Controllers\AdmissionRequestController;
use App\Http\Controllers\AdmissionFeeController;
use App\Http\Controllers\WardController;
use App\Http\Controllers\BedController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\PharmacyExecutionController;
use App\Http\Controllers\ExternalPrescriptionController;
use App\Http\Controllers\TreatmentHistoryController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\FollowUpController;
use App\Http\Controllers\JournalRefSourceController;
// ✅ جدید
use App\Http\Controllers\PayrollModelController;

// ✅ Emergency
use App\Http\Controllers\EmergencyController;
use App\Http\Controllers\EmergencyTriageController;
use App\Http\Controllers\EmergencyTreatmentController;
use App\Http\Controllers\EmergencyVitalController;

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

    Route::get('/reports/medication-stock',         [StockReportController::class, 'medicationStock']);
    Route::get('/reports/medication-stock/summary', [StockReportController::class, 'summary']);
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

    // ============================================================
    // ✅ Users Management
    // ============================================================
    Route::get('/users/by-role', [UserController::class, 'getByRole']);
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

    // ============================================================
    // ✅ Departments (CRUD کامل — ماژول «مدیریت بخش‌ها»)
    // ============================================================
    Route::prefix('departments')->name('departments.')->group(function () {

        Route::get('/active',       [DepartmentController::class, 'active'])->name('active');
        Route::get('/statistics',   [DepartmentController::class, 'statistics'])->name('statistics');
        Route::get('/search',       [DepartmentController::class, 'search'])->name('search');
        Route::get('/doctors/{id}', [DepartmentController::class, 'doctors'])->name('doctors')
            ->where('id', '[0-9]+');

        Route::get('/',      [DepartmentController::class, 'index'])->name('index');
        Route::post('/',     [DepartmentController::class, 'store'])->name('store');
        Route::get('/{id}',  [DepartmentController::class, 'show'])->name('show')
            ->where('id', '[0-9]+');
        Route::put('/{id}',  [DepartmentController::class, 'update'])->name('update')
            ->where('id', '[0-9]+');
        Route::patch('/{id}', [DepartmentController::class, 'update'])->name('update.patch')
            ->where('id', '[0-9]+');
        Route::delete('/{id}', [DepartmentController::class, 'destroy'])->name('destroy')
            ->where('id', '[0-9]+');

        Route::patch('/{id}/toggle-status', [DepartmentController::class, 'toggleStatus'])
            ->name('toggle-status')
            ->where('id', '[0-9]+');
    });

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
        Route::get('/doctor/emergency-queue', [DoctorQueueController::class, 'emergencyQueue']);
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

        Route::get('/wards', [DoctorTreatmentController::class, 'getWards']);
        Route::post('/admission', [DoctorTreatmentController::class, 'storeAdmission']);

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

        // ✅ Follow-up Routes — با خط تیره
        Route::get('/follow-up/stats', [FollowUpController::class, 'stats']);
        Route::get('/follow-up/registration/{regId}', [FollowUpController::class, 'byRegistration'])
            ->where('regId', '[0-9]+');
        Route::get('/follow-up', [FollowUpController::class, 'index']);
        Route::post('/follow-up', [FollowUpController::class, 'store']);
        Route::get('/follow-up/{id}', [FollowUpController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/follow-up/{id}', [FollowUpController::class, 'update'])->where('id', '[0-9]+');
        Route::patch('/follow-up/{id}', [FollowUpController::class, 'update'])->where('id', '[0-9]+');
        Route::patch('/follow-up/{id}/status', [FollowUpController::class, 'updateStatus'])->where('id', '[0-9]+');
        Route::delete('/follow-up/{id}', [FollowUpController::class, 'destroy'])->where('id', '[0-9]+');

        // ✅ Follow-up Routes — بدون خط تیره
        Route::get('/followup/stats', [FollowUpController::class, 'stats']);
        Route::get('/followup/registration/{regId}', [FollowUpController::class, 'byRegistration'])
            ->where('regId', '[0-9]+');
        Route::get('/followup', [FollowUpController::class, 'index']);
        Route::post('/followup', [FollowUpController::class, 'store']);
        Route::get('/followup/{id}', [FollowUpController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/followup/{id}', [FollowUpController::class, 'update'])->where('id', '[0-9]+');
        Route::patch('/followup/{id}', [FollowUpController::class, 'update'])->where('id', '[0-9]+');
        Route::patch('/followup/{id}/status', [FollowUpController::class, 'updateStatus'])->where('id', '[0-9]+');
        Route::delete('/followup/{id}', [FollowUpController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ✅ Follow-up Routes (بدون پیشوند doctor)
    Route::prefix('follow-ups')->group(function () {
        Route::get('/stats', [FollowUpController::class, 'stats']);
        Route::get('/patient/{patientId}', [FollowUpController::class, 'byPatient'])
            ->where('patientId', '[0-9]+');
        Route::get('/doctor/{doctorId}', [FollowUpController::class, 'byDoctor'])
            ->where('doctorId', '[0-9]+');
        Route::get('/upcoming', [FollowUpController::class, 'upcoming']);
        Route::get('/today', [FollowUpController::class, 'today']);

        Route::get('/', [FollowUpController::class, 'index']);
        Route::post('/', [FollowUpController::class, 'store']);
        Route::get('/{id}', [FollowUpController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [FollowUpController::class, 'update'])->where('id', '[0-9]+');
        Route::patch('/{id}/status', [FollowUpController::class, 'updateStatus'])->where('id', '[0-9]+');
        Route::delete('/{id}', [FollowUpController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ✅ تاریخچه معالجه (Treatment History)
    Route::prefix('treatment-history')->group(function () {
        Route::get('/patient/{patientId}', [TreatmentHistoryController::class, 'byPatient'])
            ->where('patientId', '[0-9]+');

        Route::post('/sync', [TreatmentHistoryController::class, 'sync']);
        Route::post('/finalize', [TreatmentHistoryController::class, 'finalize']);
        Route::post('/rebuild/{regId}', [TreatmentHistoryController::class, 'rebuild'])
            ->where('regId', '[0-9]+');

        Route::get('/', [TreatmentHistoryController::class, 'index']);
        Route::get('/{id}', [TreatmentHistoryController::class, 'show'])->where('id', '[0-9]+');
    });

    // ✅ مدیریت درخواست‌های لابراتوار
    Route::prefix('laboratory-requests')->group(function () {
        Route::get('/all', [LaboratoryRequestController::class, 'getAllRequests']);
        Route::get('/registration/{registrationId}/full', [LaboratoryRequestController::class, 'getByRegistrationFull']);
        Route::get('/registration/{registrationId}', [LaboratoryRequestController::class, 'getByRegistration']);
        Route::get('/doctor/{doctorId}/with-results', [LaboratoryResultController::class, 'getDoctorRequestsWithResults'])->where('doctorId', '[0-9]+');
        Route::get('/patient/{patientId}/with-results', [LaboratoryResultController::class, 'getPatientRequestsWithResults'])->where('patientId', '[0-9]+');

        Route::get('/', [LaboratoryRequestController::class, 'index']);
        Route::post('/registration/{registrationId}', [LaboratoryRequestController::class, 'store']);
        Route::get('/{id}', [LaboratoryRequestController::class, 'show']);
        Route::put('/{id}', [LaboratoryRequestController::class, 'update']);
        Route::delete('/{id}', [LaboratoryRequestController::class, 'destroy']);

        Route::post('/{id}/send-to-lab', [LaboratoryRequestController::class, 'sendToLab']);
        Route::post('/{id}/send-to-treatment', [LaboratoryResultController::class, 'sendToTreatment']);
    });

    // ✅ مدیریت نتایج لابراتوار
    Route::prefix('laboratory-results')->group(function () {
        Route::post('upload-pdf', [LaboratoryResultController::class, 'uploadPdf']);
        Route::get('request/{requestId}', [LaboratoryResultController::class, 'getResultByRequestId'])->where('requestId', '[0-9]+');
        Route::get('patient/{patientId}', [LaboratoryResultController::class, 'getResultsByPatient'])->where('patientId', '[0-9]+');
        Route::get('registration/{registrationId}', [LaboratoryResultController::class, 'getByRegistration'])->where('registrationId', '[0-9]+');
        Route::get('all', [LaboratoryResultController::class, 'getRequestsWithResults']);
        Route::get('download/{id}', [LaboratoryResultController::class, 'downloadPdf'])->where('id', '[0-9]+');

        Route::get('/', [LaboratoryResultController::class, 'index']);
        Route::post('/', [LaboratoryResultController::class, 'store']);
        Route::get('/{id}', [LaboratoryResultController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [LaboratoryResultController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [LaboratoryResultController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ✅ مسیرهای عملیات
    Route::prefix('operation')->group(function () {
        Route::get('/requests', [OperationController::class, 'index']);
        Route::get('/requests/registration/{regId}', [OperationController::class, 'getByRegistration']);
        Route::get('/requests-for-fee', [OperationController::class, 'getRequestsForFee']);
        Route::post('/requests/registration/{regId}', [OperationController::class, 'store']);
        Route::get('/requests/{id}', [OperationController::class, 'show']);
        Route::put('/requests/{id}', [OperationController::class, 'update']);
        Route::delete('/requests/{id}', [OperationController::class, 'destroy']);
        Route::patch('/requests/{id}/status', [OperationController::class, 'updateStatus']);
        Route::get('/without-fee', [OperationController::class, 'getOperationsWithoutFee']);
        Route::get('/with-fee', [OperationController::class, 'getOperationsWithFee']);
        Route::get('/{id}/with-fee', [OperationController::class, 'getOperationWithFee']);

        Route::prefix('fees')->group(function () {
            Route::get('/', [OperationController::class, 'feesIndex']);
            Route::post('/', [OperationController::class, 'storeFee']);
            Route::get('/statistics', [OperationController::class, 'feesStatistics']);
            Route::get('/{id}', [OperationController::class, 'showFee']);
            Route::put('/{id}', [OperationController::class, 'updateFee']);
            Route::delete('/{id}', [OperationController::class, 'destroyFee']);
        });
    });

    // ✅ مسیرهای بستری
    Route::prefix('admissions')->name('admissions.')->group(function () {
        Route::get('/all', [AdmissionRequestController::class, 'getAllRequests'])->name('all');
        Route::get('/active', [AdmissionRequestController::class, 'getActiveAdmissions'])->name('active');
        Route::get('/statistics', [AdmissionRequestController::class, 'getStatistics'])->name('statistics');
        Route::get('/status/{regId}', [AdmissionRequestController::class, 'getAdmissionStatus'])->name('status');
        Route::get('/patient/{patientId}', [AdmissionRequestController::class, 'getPatientAdmissions'])->name('patient');
        Route::post('/complete-treatment/{regId}', [AdmissionRequestController::class, 'completeTreatment'])->name('complete-treatment');

        Route::get('/', [AdmissionRequestController::class, 'index'])->name('index');
        Route::post('/', [AdmissionRequestController::class, 'store'])->name('store');
        Route::get('/{id}', [AdmissionRequestController::class, 'show'])->name('show');
        Route::put('/{id}', [AdmissionRequestController::class, 'update'])->name('update');
        Route::delete('/{id}', [AdmissionRequestController::class, 'destroy'])->name('destroy');

        Route::get('/{id}/print', [AdmissionRequestController::class, 'printReceipt'])->name('print');
        Route::post('/{id}/discharge', [AdmissionRequestController::class, 'discharge'])->name('discharge');
        Route::post('/{id}/cancel', [AdmissionRequestController::class, 'cancel'])->name('cancel');
        Route::post('/{id}/update-fee', [AdmissionRequestController::class, 'updateFeeInfo'])->name('update-fee');
    });

    // ✅ مسیرهای فیس بستری
    Route::prefix('admission-fees')->name('admission-fees.')->group(function () {
        Route::get('/pending/alerts', [AdmissionFeeController::class, 'getPendingFeesForAlert'])->name('pending-alerts');
        Route::get('/statistics', [AdmissionFeeController::class, 'getFeeStatistics'])->name('statistics');
        Route::get('/patient/{patientId}', [AdmissionFeeController::class, 'getPatientFees'])->name('patient');
        Route::get('/admission/{admissionId}', [AdmissionFeeController::class, 'getAdmissionFees'])->name('admission');
        Route::post('/registration/{regId}', [AdmissionFeeController::class, 'storeForRegistration'])->name('store-for-registration');

        Route::get('/', [AdmissionFeeController::class, 'index'])->name('index');
        Route::post('/', [AdmissionFeeController::class, 'store'])->name('store');
        Route::get('/{id}', [AdmissionFeeController::class, 'show'])->name('show');
        Route::put('/{id}', [AdmissionFeeController::class, 'update'])->name('update');
        Route::delete('/{id}', [AdmissionFeeController::class, 'destroy'])->name('destroy');

        Route::get('/{id}/print', [AdmissionFeeController::class, 'printReceipt'])->name('print');
        Route::post('/{id}/collect', [AdmissionFeeController::class, 'collectFee'])->name('collect');
    });

    // ✅ مسیرهای بخش‌ها (Wards)
    Route::prefix('wards')->name('wards.')->group(function () {
        Route::get('/statistics', [WardController::class, 'getStatistics'])->name('statistics');

        Route::get('/', [WardController::class, 'index'])->name('index');
        Route::post('/', [WardController::class, 'store'])->name('store');
        Route::get('/{id}', [WardController::class, 'show'])->name('show');
        Route::put('/{id}', [WardController::class, 'update'])->name('update');
        Route::delete('/{id}', [WardController::class, 'destroy'])->name('destroy');

        Route::get('/{wardId}/beds', [WardController::class, 'getBeds'])->name('beds');
    });

    // ✅ مسیرهای تخت‌ها
    Route::prefix('beds')->name('beds.')->group(function () {
        Route::get('/available', [BedController::class, 'getAvailableBeds'])->name('available');
        Route::get('/ward/{wardId}', [BedController::class, 'getBedsByWard'])->name('by-ward');

        Route::get('/', [BedController::class, 'index'])->name('index');
        Route::post('/', [BedController::class, 'store'])->name('store');
        Route::get('/{id}', [BedController::class, 'show'])->name('show');
        Route::put('/{id}', [BedController::class, 'update'])->name('update');
        Route::delete('/{id}', [BedController::class, 'destroy'])->name('destroy');

        Route::post('/{id}/change-status', [BedController::class, 'changeStatus'])->name('change-status');
    });

    // ✅ مسیرهای فیس لابراتوار
    Route::prefix('laboratory-fees')->group(function () {
        Route::get('/all-requests', [LaboratoryFeeController::class, 'getAllRequests']);
        Route::get('/reg-id/{regId}', [LaboratoryFeeController::class, 'getRequestsByRegId']);
        Route::get('/unpaid/{regId}', [LaboratoryFeeController::class, 'getUnpaidRequests']);

        Route::get('/', [LaboratoryFeeController::class, 'index']);
        Route::post('/registration/{regId}', [LaboratoryFeeController::class, 'store']);
        Route::get('/{id}', [LaboratoryFeeController::class, 'show']);
        Route::put('/{id}', [LaboratoryFeeController::class, 'update']);
        Route::delete('/{id}', [LaboratoryFeeController::class, 'destroy']);
    });

    // ✅ ROUTES رادیولوژی
    Route::prefix('radiology-requests')->group(function () {
        Route::get('/all', [RadiologyRequestController::class, 'getAllRequests']);
        Route::get('/registration/{regId}', [RadiologyRequestController::class, 'getByRegistration']);
        Route::get('/registration/{regId}/full', [RadiologyRequestController::class, 'getFullByRegistration']);
        Route::post('/registration/{regId}', [RadiologyRequestController::class, 'store']);
        Route::get('/{id}', [RadiologyRequestController::class, 'show']);
        Route::put('/{id}', [RadiologyRequestController::class, 'update']);
        Route::delete('/{id}', [RadiologyRequestController::class, 'destroy']);
        Route::patch('/{id}/status', [RadiologyRequestController::class, 'updateStatus']);
    });

    // ✅ ROUTES فیس رادیولوژی
    Route::prefix('radiology-fees')->group(function () {
        Route::get('/all-requests', [RadiologyFeeController::class, 'getAllRequests']);
        Route::get('/registration/{regId}', [RadiologyFeeController::class, 'getByRegistration']);

        Route::get('/', [RadiologyFeeController::class, 'index']);
        Route::post('/registration/{regId}', [RadiologyFeeController::class, 'store']);
        Route::get('/{id}', [RadiologyFeeController::class, 'show']);
        Route::put('/{id}', [RadiologyFeeController::class, 'update']);
        Route::delete('/{id}', [RadiologyFeeController::class, 'destroy']);
    });

    // ✅ ROUTES نتایج رادیولوژی
    Route::prefix('radiology-results')->group(function () {
        Route::get('/all', [RadiologyResultController::class, 'getAllRequests']);
        Route::get('/with-results', [RadiologyResultController::class, 'getRequestsWithResults']);
        Route::get('/registration/{regId}', [RadiologyResultController::class, 'getByRegistration']);
        Route::get('/registration/{regId}/full', [RadiologyResultController::class, 'getFullByRegistration']);
        Route::get('/doctor/{doctorId}', [RadiologyResultController::class, 'getDoctorRequestsWithResults'])->where('doctorId', '[0-9]+');
        Route::get('/patient/{patientId}', [RadiologyResultController::class, 'getPatientRequestsWithResults'])->where('patientId', '[0-9]+');
        Route::post('upload-pdf', [RadiologyResultController::class, 'uploadPdf']);
        Route::get('request/{requestId}', [RadiologyResultController::class, 'getResultByRequestId'])->where('requestId', '[0-9]+');
        Route::get('patient/{patientId}/results', [RadiologyResultController::class, 'getResultsByPatient'])->where('patientId', '[0-9]+');
        Route::get('download/{id}', [RadiologyResultController::class, 'downloadPdf'])->where('id', '[0-9]+');

        Route::get('/', [RadiologyResultController::class, 'index']);
        Route::post('/', [RadiologyResultController::class, 'store']);
        Route::get('/{id}', [RadiologyResultController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [RadiologyResultController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [RadiologyResultController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ✅ مسیرهای فیس نسخه
    Route::prefix('prescription-fees')->group(function () {
        Route::get('/pending',  [PrescriptionFeeController::class, 'pendingFees']);
        Route::get('/all',      [PrescriptionFeeController::class, 'allFees']);
        Route::post('/collect/{source}/{id}', [PrescriptionFeeController::class, 'collectFee'])
            ->where('source', 'internal|external')
            ->where('id', '[0-9]+');

        Route::get('/all-requests',   [PrescriptionFeeController::class, 'index']);
        Route::get('/statistics',     [PrescriptionFeeController::class, 'statistics']);
        Route::get('/reg-id/{regId}', [PrescriptionFeeController::class, 'index']);
        Route::get('/unpaid/{regId}', [PrescriptionFeeController::class, 'index']);
        Route::get('/registration/{regId}', [PrescriptionFeeController::class, 'index']);

        Route::get('/',  [PrescriptionFeeController::class, 'index']);
        Route::post('/', [PrescriptionFeeController::class, 'store']);
        Route::post('/registration/{regId}', [PrescriptionFeeController::class, 'store']);
        Route::get('/{id}',    [PrescriptionFeeController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}',    [PrescriptionFeeController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [PrescriptionFeeController::class, 'destroy'])->where('id', '[0-9]+');

        Route::post('/{id}/sync', [PrescriptionFeeController::class, 'syncStatus'])->where('id', '[0-9]+');
    });

    // ✅ Prescriptions
    Route::prefix('prescriptions')->group(function () {
        Route::get('/next-batch', [PrescriptionController::class, 'getNextBatch']);
        Route::get('/my/list', [PrescriptionController::class, 'myPrescriptions']);
        Route::post('/check-stock', [PrescriptionController::class, 'checkStockBeforePrescription']);
        Route::get('/medication/{med_id}/suppliers', [PrescriptionController::class, 'getMedicationSuppliers']);

        Route::post('/{pres_id}/sync-status', [PrescriptionController::class, 'syncStatusFromFee']);
        Route::post('/{pres_id}/send-to-pharmacy', [PrescriptionController::class, 'sendToPharmacy']);
        Route::post('/{pres_id}/pharmacy-registered', [PrescriptionController::class, 'markPharmacyRegistered']);
        Route::post('/{pres_id}/mark-paid', [PrescriptionController::class, 'markPaid']);
        Route::post('/{pres_id}/cancel', [PrescriptionController::class, 'cancel']);
        Route::patch('/{pres_id}/status', [PrescriptionController::class, 'updateStatus']);

        Route::get('/', [PrescriptionController::class, 'index']);
        Route::post('/', [PrescriptionController::class, 'store']);
        Route::get('/{pres_id}', [PrescriptionController::class, 'show']);
        Route::put('/{pres_id}', [PrescriptionController::class, 'update']);
        Route::delete('/{pres_id}', [PrescriptionController::class, 'destroy']);
    });

    // ✅ نسخه‌های بیرونی
    Route::prefix('external-prescriptions')->group(function () {
        Route::get('/pending-for-registration', [ExternalPrescriptionController::class, 'pendingForRegistration']);
        Route::get('/pending', [ExternalPrescriptionController::class, 'pending']);

        Route::get('/', [ExternalPrescriptionController::class, 'index']);
        Route::post('/', [ExternalPrescriptionController::class, 'store']);
        Route::get('/{id}', [ExternalPrescriptionController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [ExternalPrescriptionController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [ExternalPrescriptionController::class, 'destroy'])->where('id', '[0-9]+');
        Route::get('/{id}/print', [ExternalPrescriptionController::class, 'print'])->where('id', '[0-9]+');

        Route::post('/{id}/mark-paid', [ExternalPrescriptionController::class, 'markAsPaid'])->where('id', '[0-9]+');
        Route::post('/{id}/cancel', [ExternalPrescriptionController::class, 'cancel'])->where('id', '[0-9]+');
    });    // ⭐ اجراآت دواخانه
        // ⭐ اجراآت دواخانه (ادامه)
    Route::prefix('pharmacy-executions')->group(function () {
        Route::get('/pending-for-registration', [PharmacyExecutionController::class, 'getPendingForRegistration']);
        Route::get('/registration/{regId}', [PharmacyExecutionController::class, 'getByRegistration']);
        Route::get('/statistics', [PharmacyExecutionController::class, 'statistics']);
        Route::get('/pending', [PharmacyExecutionController::class, 'pending']);

        Route::get('/', [PharmacyExecutionController::class, 'index']);
        Route::post('/', [PharmacyExecutionController::class, 'store']);
        Route::get('/{id}', [PharmacyExecutionController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [PharmacyExecutionController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [PharmacyExecutionController::class, 'destroy'])->where('id', '[0-9]+');

        Route::post('/{id}/execute', [PharmacyExecutionController::class, 'execute'])->where('id', '[0-9]+');
        Route::post('/{id}/cancel', [PharmacyExecutionController::class, 'cancel'])->where('id', '[0-9]+');
        Route::post('/{id}/mark-paid', [PharmacyExecutionController::class, 'markPaid'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Patients
    // ============================================================
    Route::prefix('patients')->group(function () {
        Route::get('/search', [PatientController::class, 'search']);
        Route::get('/statistics', [PatientController::class, 'statistics']);

        Route::get('/', [PatientController::class, 'index']);
        Route::post('/', [PatientController::class, 'store']);
        Route::get('/{id}', [PatientController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [PatientController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [PatientController::class, 'destroy'])->where('id', '[0-9]+');

        Route::get('/{id}/history', [PatientController::class, 'history'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Registrations
    // ============================================================
   Route::prefix('registrations')->group(function () {
    // ✅ مسیرهای ثابت — قبل از /{id}
    Route::get('/today',       [RegistrationsController::class, 'today']);
    Route::get('/by-doctor',   [RegistrationsController::class, 'byDoctor']);
    Route::get('/statistics',  [RegistrationsController::class, 'statistics']);
    Route::get('/patient/{patientId}', [RegistrationsController::class, 'byPatient'])
        ->where('patientId', '[0-9]+');

    // ✅ به‌روزرسانی سریع وضعیت (ارسال به داکتر) — این خط جدید
    Route::put('/{id}/status', [RegistrationsController::class, 'updateStatus'])
        ->where('id', '[0-9]+');

    // ✅ CRUD اصلی
    Route::get('/',     [RegistrationsController::class, 'index']);
    Route::post('/',    [RegistrationsController::class, 'store']);
    Route::get('/{id}', [RegistrationsController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/{id}', [RegistrationsController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/{id}', [RegistrationsController::class, 'destroy'])->where('id', '[0-9]+');
});

    // ============================================================
    // ✅ Customers
    // ============================================================
    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomersController::class, 'index']);
        Route::post('/', [CustomersController::class, 'store']);
        Route::get('/{id}', [CustomersController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [CustomersController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [CustomersController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Categories
    // ============================================================
    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index']);
        Route::post('/', [CategoryController::class, 'store']);
        Route::get('/{id}', [CategoryController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [CategoryController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [CategoryController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Sales / Sales Details
    // ============================================================
    Route::prefix('sales')->group(function () {
        Route::get('/statistics', [SalesController::class, 'statistics']);
        Route::get('/report', [SalesController::class, 'report']);

        Route::get('/', [SalesController::class, 'index']);
        Route::post('/', [SalesController::class, 'store']);
        Route::get('/{id}', [SalesController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [SalesController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [SalesController::class, 'destroy'])->where('id', '[0-9]+');
    });

    Route::prefix('sales-details')->group(function () {
        Route::get('/sale/{saleId}', [SalesDetailsController::class, 'bySale'])->where('saleId', '[0-9]+');

        Route::get('/', [SalesDetailsController::class, 'index']);
        Route::post('/', [SalesDetailsController::class, 'store']);
        Route::get('/{id}', [SalesDetailsController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [SalesDetailsController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [SalesDetailsController::class, 'destroy'])->where('id', '[0-9]+');
    });

    Route::prefix('sales-full-details')->group(function () {
        Route::get('/', [SalesFullDetailsController::class, 'index']);
        Route::get('/{saleId}', [SalesFullDetailsController::class, 'show'])->where('saleId', '[0-9]+');
    });

    // ============================================================
    // ✅ Purchases
    // ============================================================
    Route::prefix('purchases')->group(function () {
        Route::get('/statistics', [ParchasesController::class, 'statistics']);

        Route::get('/', [ParchasesController::class, 'index']);
        Route::post('/', [ParchasesController::class, 'store']);
        Route::get('/{id}', [ParchasesController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [ParchasesController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [ParchasesController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Inventory / Medication Views
    // ============================================================
    Route::prefix('inventory')->group(function () {
        Route::get('/summary', [ViewInventoryController::class, 'summary']);
        Route::get('/movements', [ViewInventoryController::class, 'movements']);
        Route::get('/low-stock', [ViewInventoryController::class, 'lowStock']);
        Route::get('/', [ViewInventoryController::class, 'index']);
    });

    Route::get('/medications-view', [ViewMedicationsController::class, 'index']);
    Route::get('/medications-view/{id}', [ViewMedicationsController::class, 'show'])->where('id', '[0-9]+');

    // ============================================================
    // ✅ Profit & Loss
    // ============================================================
    Route::prefix('profit-loss')->group(function () {
        Route::get('/', [ViewProfitLossController::class, 'index']);
        Route::get('/summary', [ViewProfitLossController::class, 'summary']);
        Route::get('/by-date', [ViewProfitLossController::class, 'byDateRange']);
    });

    // ============================================================
    // ✅ Notifications
    // ============================================================
    Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);

    // ✅ ایجاد notification جدید — این خط جدید است
    Route::post('/', [NotificationController::class, 'store']);

    Route::post('/{id}/read', [NotificationController::class, 'markAsRead'])->where('id', '[0-9]+');
    Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/{id}', [NotificationController::class, 'destroy'])->where('id', '[0-9]+');
});

    // ============================================================
    // ✅ Accounts / Account Summary / Journal
    // ============================================================
    Route::prefix('accounts')->group(function () {
        Route::get('/statistics', [AccountController::class, 'statistics']);

        Route::get('/', [AccountController::class, 'index']);
        Route::post('/', [AccountController::class, 'store']);
        Route::get('/{id}', [AccountController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [AccountController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [AccountController::class, 'destroy'])->where('id', '[0-9]+');
    });

    Route::prefix('account-summary')->group(function () {
        Route::get('/', [AccountSummaryController::class, 'index']);
        Route::get('/by-account/{accountId}', [AccountSummaryController::class, 'byAccount'])->where('accountId', '[0-9]+');
        Route::get('/by-date', [AccountSummaryController::class, 'byDateRange']);
    });

    Route::prefix('journal')->group(function () {
        Route::get('/statistics', [JournalController::class, 'statistics']);
        Route::get('/by-source', [JournalController::class, 'bySource']);

        Route::get('/', [JournalController::class, 'index']);
        Route::post('/', [JournalController::class, 'store']);
        Route::get('/{id}', [JournalController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [JournalController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [JournalController::class, 'destroy'])->where('id', '[0-9]+');
    });

    Route::prefix('journal-ref-sources')->group(function () {
        Route::get('/', [JournalRefSourceController::class, 'index']);
        Route::post('/', [JournalRefSourceController::class, 'store']);
        Route::get('/{id}', [JournalRefSourceController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [JournalRefSourceController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [JournalRefSourceController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Reports
    // ============================================================
    Route::prefix('reports')->group(function () {
        Route::get('/hospital', [HospitalReportController::class, 'index']);
        Route::get('/hospital/summary', [HospitalReportController::class, 'summary']);
        Route::get('/hospital/by-date', [HospitalReportController::class, 'byDateRange']);
        Route::get('/hospital/export', [HospitalReportController::class, 'export']);
    });

    // ============================================================
    // ✅ Benefits
    // ============================================================
    Route::prefix('benefits')->group(function () {
        Route::get('/', [BenefitController::class, 'index']);
        Route::post('/', [BenefitController::class, 'store']);
        Route::get('/{id}', [BenefitController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [BenefitController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [BenefitController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Payroll
    // ============================================================
    Route::prefix('payrolls')->group(function () {
        Route::get('/statistics', [PayrollModelController::class, 'statistics']);
        Route::get('/by-user/{userId}', [PayrollModelController::class, 'byUser'])->where('userId', '[0-9]+');
        Route::post('/{id}/pay', [PayrollModelController::class, 'pay'])->where('id', '[0-9]+');

        Route::get('/', [PayrollModelController::class, 'index']);
        Route::post('/', [PayrollModelController::class, 'store']);
        Route::get('/{id}', [PayrollModelController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [PayrollModelController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [PayrollModelController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Laboratory (master data)
    // ============================================================
    Route::prefix('laboratory')->group(function () {
        Route::get('/tests', [LaboratoryController::class, 'index']);
        Route::post('/tests', [LaboratoryController::class, 'store']);
        Route::get('/tests/{id}', [LaboratoryController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/tests/{id}', [LaboratoryController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/tests/{id}', [LaboratoryController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Emergency
    // ============================================================
 // ============================================================
// ✅ Emergency (مریضان اضطراری)
// ============================================================
Route::prefix('emergency')->group(function () {                

    /* ----------------------------------------------------------
     | Triage (اولویت‌بندی)
     ---------------------------------------------------------- */
    Route::prefix('triage')->group(function () {
        Route::get('/queue',      [EmergencyTriageController::class, 'queue']);
        Route::get('/statistics', [EmergencyTriageController::class, 'statistics']);

        Route::get('/',    [EmergencyTriageController::class, 'index']);
        Route::post('/',   [EmergencyTriageController::class, 'store']);
        Route::get('/{id}',    [EmergencyTriageController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}',    [EmergencyTriageController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [EmergencyTriageController::class, 'destroy'])->where('id', '[0-9]+');
    });

    /* ----------------------------------------------------------
     | Treatments (معالجات)
     | - GET  /emergency/treatments?case_id=X    یا  ?emergency_id=EMG-...
     | - POST /emergency/treatments  با body شامل case_id
     ---------------------------------------------------------- */
    Route::prefix('treatments')->group(function () {
        // خواندن بر اساس registration_id (اگر emergency_case.registration_id موجود بود)
        Route::get('/by-registration/{regId}', [EmergencyTreatmentController::class, 'byRegistration'])
            ->where('regId', '[0-9]+');

        Route::get('/',    [EmergencyTreatmentController::class, 'index']);
        Route::post('/',   [EmergencyTreatmentController::class, 'store']);
        Route::get('/{id}',    [EmergencyTreatmentController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}',    [EmergencyTreatmentController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [EmergencyTreatmentController::class, 'destroy'])->where('id', '[0-9]+');
    });

    /* ----------------------------------------------------------
     | Vitals (علائم حیاتی)
     | - GET  /emergency/vitals?case_id=X   یا  ?emergency_id=EMG-...
     | - POST /emergency/vitals  با body شامل case_id
     ---------------------------------------------------------- */
    Route::prefix('vitals')->group(function () {
        Route::get('/by-registration/{regId}', [EmergencyVitalController::class, 'byRegistration'])
            ->where('regId', '[0-9]+');

        Route::get('/',    [EmergencyVitalController::class, 'index']);
        Route::post('/',   [EmergencyVitalController::class, 'store']);
        Route::get('/{id}',    [EmergencyVitalController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}',    [EmergencyVitalController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [EmergencyVitalController::class, 'destroy'])->where('id', '[0-9]+');
    });

    /* ----------------------------------------------------------
     | Main Emergency Cases (پرونده اصلی اضطراری)
     ---------------------------------------------------------- */

    // ✅ مسیرهای ثابت — باید قبل از /{id} باشند
    Route::get('/statistics', [EmergencyController::class, 'statistics']);
    Route::get('/active',     [EmergencyController::class, 'active']);

    // ✅ پذیرش یکپارچه: ساخت بیمار + پرونده اضطراری در یک درخواست
    Route::post('/admit', [EmergencyController::class, 'admitNew']);

    // ✅ تاریخچه — قبل از /{id}
    Route::get('/history',              [EmergencyController::class, 'history']);
    Route::get('/history/statistics',   [EmergencyController::class, 'historyStatistics']);
    Route::get('/history/export',       [EmergencyController::class, 'exportHistory']);

    // ✅ CRUD اصلی
    Route::get('/',      [EmergencyController::class, 'index']);
    Route::post('/',     [EmergencyController::class, 'store']);
    Route::get('/{id}',  [EmergencyController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/{id}',  [EmergencyController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/{id}', [EmergencyController::class, 'destroy'])->where('id', '[0-9]+');

    // ✅ اقدامات روی یک پرونده خاص
    Route::post('/{id}/discharge', [EmergencyController::class, 'discharge'])->where('id', '[0-9]+');
    Route::post('/{id}/admit',     [EmergencyController::class, 'admit'])->where('id', '[0-9]+');
});

}); // پایان گروه auth:sanctum