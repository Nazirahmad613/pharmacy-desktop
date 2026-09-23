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
use App\Http\Controllers\OperationController;
use App\Http\Controllers\AdmissionRequestController;
use App\Http\Controllers\AdmissionFeeController;
use App\Http\Controllers\WardController;
use App\Http\Controllers\BedController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\PharmacyExecutionController;
use App\Http\Controllers\TreatmentHistoryController;
// ✅ کنترلرهای مورد نیاز برای JournalPage
use App\Http\Controllers\PatientController;

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

    // ============================================================
    // ✅ Users Management
    // ⭐ اضافه شد: by-role برای dropdown منابع (داکتر، نرس، ...)
    // ============================================================
    Route::get('/users/by-role', [UserController::class, 'getByRole']); // ✅ جدید
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

    // ===== Departments (لیست ساده) =====
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
    });

    Route::prefix('treatment-history')->group(function () {
        Route::get('/', [TreatmentHistoryController::class, 'index']);
        Route::get('/{id}', [TreatmentHistoryController::class, 'show']);
        Route::get('/patient/{patientId}', [TreatmentHistoryController::class, 'byPatient']);
        Route::post('/sync', [TreatmentHistoryController::class, 'sync']);
    });

    // ============================================================
    // ✅ مدیریت درخواست‌های لابراتوار
    // ============================================================
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

    // ============================================================
    // ✅ مدیریت نتایج لابراتوار
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای عملیات
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای بستری
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای فیس بستری
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای بخش‌ها
    // ============================================================
    Route::prefix('wards')->name('wards.')->group(function () {
        Route::get('/statistics', [WardController::class, 'getStatistics'])->name('statistics');

        Route::get('/', [WardController::class, 'index'])->name('index');
        Route::post('/', [WardController::class, 'store'])->name('store');
        Route::get('/{id}', [WardController::class, 'show'])->name('show');
        Route::put('/{id}', [WardController::class, 'update'])->name('update');
        Route::delete('/{id}', [WardController::class, 'destroy'])->name('destroy');

        Route::get('/{wardId}/beds', [WardController::class, 'getBeds'])->name('beds');
    });

    // ============================================================
    // ✅ مسیرهای تخت‌ها
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای فیس لابراتوار
    // ============================================================
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

    // ============================================================
    // ✅ ROUTES رادیولوژی
    // ============================================================
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

    // ============================================================
    // ✅ ROUTES فیس رادیولوژی
    // ============================================================
    Route::prefix('radiology-fees')->group(function () {
        Route::get('/all-requests', [RadiologyFeeController::class, 'getAllRequests']);
        Route::get('/registration/{regId}', [RadiologyFeeController::class, 'getByRegistration']);

        Route::get('/', [RadiologyFeeController::class, 'index']);
        Route::post('/registration/{regId}', [RadiologyFeeController::class, 'store']);
        Route::get('/{id}', [RadiologyFeeController::class, 'show']);
        Route::put('/{id}', [RadiologyFeeController::class, 'update']);
        Route::delete('/{id}', [RadiologyFeeController::class, 'destroy']);
    });

    // ============================================================
    // ✅ ROUTES نتایج رادیولوژی
    // ============================================================
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

    // ============================================================
    // ✅ مسیرهای فیس نسخه
    // ============================================================
    Route::prefix('prescription-fees')->group(function () {
        Route::get('/all-requests', [PrescriptionFeeController::class, 'index']);
        Route::get('/statistics',   [PrescriptionFeeController::class, 'statistics']);
        Route::get('/reg-id/{regId}',   [PrescriptionFeeController::class, 'index']);
        Route::get('/unpaid/{regId}',   [PrescriptionFeeController::class, 'index']);
        Route::get('/registration/{regId}', [PrescriptionFeeController::class, 'index']);

        Route::get('/',  [PrescriptionFeeController::class, 'index']);
        Route::post('/', [PrescriptionFeeController::class, 'store']);
        Route::post('/registration/{regId}', [PrescriptionFeeController::class, 'store']);
        Route::get('/{id}',    [PrescriptionFeeController::class, 'show']);
        Route::put('/{id}',    [PrescriptionFeeController::class, 'update']);
        Route::delete('/{id}', [PrescriptionFeeController::class, 'destroy']);

        Route::post('/{id}/sync', [PrescriptionFeeController::class, 'syncStatus']);
    });

    // ============================================================
    // ✅ Prescriptions
    // ============================================================
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

    // ============================================================
    // ⭐ اجراآت دواخانه
    // ============================================================
    Route::prefix('pharmacy-executions')->group(function () {
        Route::get('/pending-for-registration', [PharmacyExecutionController::class, 'getPendingForRegistration']);
        Route::get('/reg/{regId}', [PharmacyExecutionController::class, 'getByRegId']);

        Route::get('/', [PharmacyExecutionController::class, 'index']);
        Route::post('/', [PharmacyExecutionController::class, 'store']);
        Route::get('/{id}', [PharmacyExecutionController::class, 'show']);
        Route::put('/{id}', [PharmacyExecutionController::class, 'update']);
        Route::delete('/{id}', [PharmacyExecutionController::class, 'destroy']);

        Route::post('/{id}/send-to-registration', [PharmacyExecutionController::class, 'sendToRegistration']);
        Route::post('/{id}/collect-fee', [PharmacyExecutionController::class, 'collectFee']);
        Route::get('/{id}/print', [PharmacyExecutionController::class, 'printReceipt']);
    });

    // ===== Stock & Sales Reports =====
    Route::get('/salesd', [SalesFullDetailsController::class, 'index']);
    Route::get('/sales-details', [SalesDetailsController::class, 'index']);
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
    // مسیرهای مدیریت مراجعات
    // ============================================================
    Route::prefix('registrations')->group(function () {
        Route::get('/statistics', [RegistrationsController::class, 'statistics']);
        Route::get('/today', [RegistrationsController::class, 'todayRegistrations']);

        Route::get('/', [RegistrationsController::class, 'index']);
        Route::post('/', [RegistrationsController::class, 'store']);
        Route::get('/{reg_id}', [RegistrationsController::class, 'show']);
        Route::put('/{reg_id}', [RegistrationsController::class, 'update']);
        Route::delete('/{reg_id}', [RegistrationsController::class, 'destroy']);

        Route::put('/{reg_id}/status', [RegistrationsController::class, 'updateStatus']);
    });
    
    // ============================================================
    // مسیرهای مدیریت دیپارتمنت‌ها (کامل با CRUD)
    // ============================================================
    Route::prefix('departments-management')->group(function () {
        Route::get('/active', [RegistrationsController::class, 'getActiveDepartments']);
        Route::get('/statistics', [RegistrationsController::class, 'departmentStatistics']);
        Route::get('/search', [RegistrationsController::class, 'searchDepartments']);

        Route::get('/', [RegistrationsController::class, 'getDepartments']);
        Route::post('/', [RegistrationsController::class, 'createDepartment']);
        Route::get('/{id}', [RegistrationsController::class, 'getDepartment']);
        Route::put('/{id}', [RegistrationsController::class, 'updateDepartment']);
        Route::delete('/{id}', [RegistrationsController::class, 'deleteDepartment']);

        Route::patch('/{id}/toggle-status', [RegistrationsController::class, 'toggleDepartmentStatus']);
    });

    // ===== Sales CRUD =====
    Route::prefix('sales')->group(function () {
        Route::get('/', [SalesController::class, 'index']);
        Route::post('/', [SalesController::class, 'store']);
        Route::put('/{sales_id}', [SalesController::class, 'update']);
        Route::delete('/{sales_id}', [SalesController::class, 'destroy']);
    });

    // ============================================================
    // ✅ Journals (ژورنال)
    // ⭐ ترتیب مهم: routes خاص قبل از /{id}
    // ============================================================
    Route::prefix('journals')->group(function () {
        // ✅ routes خاص اول (قبل از /{id})
        Route::get('/ref-sources', [JournalController::class, 'getRefSources']);
        Route::get('/patient-summary/{regId}', [JournalController::class, 'getPatientJournalSummary'])
            ->where('regId', '[0-9]+');

        // ⭐ CRUD
        Route::get('/', [JournalController::class, 'index']);
        Route::post('/', [JournalController::class, 'store']);

        // ⭐ upsert (ایجاد یا به‌روزرسانی)
        Route::post('/upsert/{id?}', [JournalController::class, 'upsert'])->where('id', '[0-9]+');
        Route::put('/upsert/{id?}',  [JournalController::class, 'upsert'])->where('id', '[0-9]+');

        // ⭐ show / update / destroy
        Route::get('/{id}',    [JournalController::class, 'index'])->where('id', '[0-9]+'); // اگر show ندارید
        Route::put('/{id}',    [JournalController::class, 'upsert'])->where('id', '[0-9]+');
        Route::delete('/{id}', [JournalController::class, 'destroy'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Accounts (حساب‌ها - شرکت دوا، مشتری، ...)
    // ⭐ routes خاص قبل از /{id}
    // ============================================================
    Route::prefix('accounts')->group(function () {
        // ⭐ routes خاص اول
        Route::get('/parents', [AccountController::class, 'parents']);
        Route::get('/transaction-accounts', [AccountController::class, 'transactionAccounts']);
        Route::get('/summary', [AccountController::class, 'summary']);
        Route::get('/types', [AccountController::class, 'types']);
        Route::get('/categories/{accountType}', [AccountController::class, 'categories']);
        Route::get('/by-category', [AccountController::class, 'byCategory']);
        
        // ⭐ CRUD
        Route::get('/', [AccountController::class, 'index']);
        Route::post('/', [AccountController::class, 'store']);
        Route::get('/{id}', [AccountController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [AccountController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [AccountController::class, 'destroy'])->where('id', '[0-9]+');

        // ⭐ toggle-status
        Route::post('/{id}/toggle-status', [AccountController::class, 'toggleStatus'])->where('id', '[0-9]+');
    });

    // ============================================================
    // ✅ Patients (مریضان)
    // ⭐ routes خاص قبل از /{id}
    // ============================================================
    Route::prefix('patients')->group(function () {
        // ⭐ routes خاص اول
        Route::get('/search', [RegistrationsController::class, 'searchPatients']);
        Route::get('/{patient_id}/info', [RegistrationsController::class, 'getPatientInfo'])
            ->where('patient_id', '[0-9]+');

        // ⭐ CRUD
        Route::get('/', [PatientController::class, 'index']);
        Route::post('/', [PatientController::class, 'store']);
        Route::get('/{id}', [PatientController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{id}', [PatientController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{id}', [PatientController::class, 'destroy'])->where('id', '[0-9]+');
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