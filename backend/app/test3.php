<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// ==================== Controllers ====================
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CustomersController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesDetailsController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ViewInventoryController;
use App\Http\Controllers\ViewMedicationsController;
use App\Http\Controllers\ViewProfitLossController;
use App\Http\Controllers\ViewSupplierPurchasesController;
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

/*
|--------------------------------------------------------------------------
| API Test
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Authentication (PUBLIC)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/sales-view', [SalesController::class, 'view']); // View
Route::get('/sales/chart', [SalesController::class, 'chart']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Token-based)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/logs', [LogController::class, 'index']);

    // ===== Users ===== (با پرمیشن‌های مدیریت کاربران)
    Route::get('/users', [UserController::class, 'index'])->middleware('view-users');
    Route::post('/users', [UserController::class, 'store'])->middleware('create-users');
    Route::get('/users/{user}', [UserController::class, 'show'])->middleware('view-users');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('edit-users');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])
        ->middleware('delete-users'); // جایگزین middleware('admin')

    // ===== Auth =====
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ==================== Role & Permission Routes (با پرمیشن‌ها) ====================
    // ------------------------------
    // رول‌ها
    // ------------------------------
    Route::get('/roles', [RoleController::class, 'index'])->middleware('view-roles');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('create-roles');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])
        ->middleware('delete-roles');

    // اختصاص پرمیشن به رول
    Route::post('/roles/{id}/permissions', [RoleController::class, 'assignPermissions'])
        ->middleware('assign-permissions');

    // حذف یک پرمیشن خاص از رول
    Route::delete('/roles/{id}/permissions/{permissionId}', [RoleController::class, 'removePermission'])
        ->middleware('edit-roles'); // یا می‌توانید از 'remove-permissions' استفاده کنید

    // ------------------------------
    // پرمیشن‌ها
    // ------------------------------
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('view-permissions');
    Route::post('/permissions', [PermissionController::class, 'store'])->middleware('create-permissions');
    Route::delete('/permissions/{id}', [PermissionController::class, 'destroy'])
        ->middleware('delete-permissions');

    // ===== Departments =====
    Route::get('/departments', [DepartementController::class, 'index']);

    // ===== Registrations =====
    Route::post('/registrations', [RegistrationsController::class, 'store']);
    Route::get('/registrations', [RegistrationsController::class, 'index']);
    Route::delete('/registrations/{reg_id}', [RegistrationsController::class, 'destroy'])->middleware('admin');
    Route::put('/registrations/{reg_id}', [RegistrationsController::class, 'update']);

    // ===== Dashboard =====
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ===== Suppliers =====
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    // Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy'])->middleware('admin');

    // ===== Medications =====
    Route::get('/medications', [MedicationController::class, 'index']);
    Route::post('/medications', [MedicationController::class, 'store']);
    Route::get('/medications/{med_id}', [MedicationController::class, 'show']);
    Route::put('/medications/{med_id}', [MedicationController::class, 'update']);
    Route::delete('/medications/{med_id}', [MedicationController::class, 'destroy'])->middleware('admin');

    // ===== Doctors =====
    Route::get('/doctors', [DoctorController::class, 'index']);
    Route::post('/doctors', [DoctorController::class, 'store']);
    // Route::delete('/doctors/{id}', [DoctorController::class, 'destroy'])->middleware('admin');

    // ===== Prescriptions =====
    Route::get('/prescriptions', [PrescriptionController::class, 'index']);
    Route::post('/prescriptions', [PrescriptionController::class, 'store']);
    Route::put('/prescriptions/{pres_id}', [PrescriptionController::class, 'update']);
    Route::delete('/prescriptions/{pres_id}', [PrescriptionController::class, 'destroy'])->middleware('admin');

    // ===== Stock & Sales =====
    Route::get('/stock', [StockReportController::class, 'index']);
    Route::get('/salesd', [SalesFullDetailsController::class, 'index']);

    // ===== Suppliers by Medication =====
    Route::get('/suppliers/by-medication/{med_id}', [SupplierController::class, 'suppliersByMedication']);

    // ===== Inventory =====
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    // Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->middleware('admin');

    // ===== Sales Details =====
    Route::get('/sales-details', [SalesDetailsController::class, 'index']);

    // ===== Customers =====
    Route::get('/customers', [CustomersController::class, 'index']);

    // ===== CATEGORY ROUTES =====
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])
        ->middleware('admin:delete-category');

    // ===== PURCHASES ROUTES =====
    Route::prefix('parchases')->group(function () {
        Route::get('/', [ParchasesController::class, 'index']);
        Route::post('/', [ParchasesController::class, 'store']);
        Route::get('/{parchaseid}', [ParchasesController::class, 'show']);
        Route::put('/{parchaseid}', [ParchasesController::class, 'update']);
        Route::delete('/{parchaseid}', [ParchasesController::class, 'destroy'])->middleware('admin');
    });

    // ===== Notifications =====
    Route::get('/notifications', [NotificationController::class, 'index']);

    // ===== Sales CRUD =====
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);
    Route::put('/sales/{sales_id}', [SalesController::class, 'update']);
    Route::delete('/sales/{sales_id}', [SalesController::class, 'destroy'])->middleware('admin');

    // ===== Journals =====
    Route::get('/journals', [JournalController::class, 'index']);
    Route::get('/journals/{id}', [JournalController::class, 'show']);
    Route::post('/journals', [JournalController::class, 'store']);
    Route::put('/journals/{id}', [JournalController::class, 'update']);
    Route::post('journals/upsert/{id?}', [JournalController::class, 'upsert']);
    // Route::delete('/journals/{id}', [JournalController::class, 'destroy'])->middleware('admin');

    // ===== Reports / Views =====
    Route::get('/view-inventory', [ViewInventoryController::class, 'index']);
    Route::get('/view-medications', [ViewMedicationsController::class, 'index']);
    Route::get('/account-summary', [AccountSummaryController::class, 'index']);
    Route::get('/view-profit-loss', [ViewProfitLossController::class, 'index']);
    Route::get('/view-supplier-purchases', [ViewSupplierPurchasesController::class, 'index']);
    Route::get('/hospital-reports', [HospitalReportController::class, 'index']);
    Route::get('/reports/medication-stock', function () {
        return DB::table('vw_medication_status')->get();
    });
    Route::get('/reports/medication-stock', [StockReportController::class, 'medicationStock']);
    Route::get('/dashboard-daily', function () {
        return DB::table('view_dashboard_daily')->get();
    });
    Route::get('/benefits', [BenefitController::class, 'index']);
});

// مسیرهای عمومی (بدون نیاز به احراز هویت)
Route::get('/sales-report', function (Request $request) {
    $type = $request->get('type', 'daily');
    $query = DB::table('view_sales_summary');
    if ($type) {
        $query->where('report_type', $type);
    }
    return $query->get();
});

Route::get('/benefits-chart', [BenefitController::class, 'chart']);
Route::get('/test', function () {
    return response()->json(['message' => 'API is working']);
});