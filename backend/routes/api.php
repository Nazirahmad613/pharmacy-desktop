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
use App\Http\Controllers\ProfileController;

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

Route::get('/sales-view', [SalesController::class, 'view']);
Route::get('/sales/chart', [SalesController::class, 'chart']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Token-based) with Permissions
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::put('/profile', [ProfileController::class, 'updateProfile']);
        Route::get('/profile', [ProfileController::class, 'getProfile']);
    // ===== Logs =====
    Route::get('/logs', [LogController::class, 'index'])->middleware('can:view-logs');

    // ===== Users Management =====
    Route::get('/users', [UserController::class, 'index'])->middleware('can:view-users');
    Route::post('/users', [UserController::class, 'store'])->middleware('can:create-users');
    Route::get('/users/{user}', [UserController::class, 'show'])->middleware('can:view-users');
    Route::put('/users/{user}', [UserController::class, 'update'])->middleware('can:edit-users');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('can:delete-users');

    // ===== Auth =====
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ===== Roles Management =====
    Route::get('/roles', [RoleController::class, 'index'])->middleware('can:view-roles');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('can:create-roles');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('can:delete-roles');
    Route::post('/roles/{id}/permissions', [RoleController::class, 'assignPermissions'])->middleware('can:assign-permissions');
    Route::delete('/roles/{id}/permissions/{permissionId}', [RoleController::class, 'removePermission'])->middleware('can:edit-roles');

    // ===== Permissions Management =====
    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('can:view-permissions');
    Route::post('/permissions', [PermissionController::class, 'store'])->middleware('can:create-permissions');
    Route::delete('/permissions/{id}', [PermissionController::class, 'destroy'])->middleware('can:delete-permissions');

    // ===== Departments =====
    Route::get('/departments', [DepartementController::class, 'index'])->middleware('can:view-departments');

    // ===== Registrations =====
    Route::post('/registrations', [RegistrationsController::class, 'store'])->middleware('can:create-registrations');
    Route::get('/registrations', [RegistrationsController::class, 'index'])->middleware('can:view-registrations');
    Route::delete('/registrations/{reg_id}', [RegistrationsController::class, 'destroy'])->middleware('can:delete-registrations');
    Route::put('/registrations/{reg_id}', [RegistrationsController::class, 'update'])->middleware('can:edit-registrations');

    // ===== Dashboard =====
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('can:view-dashboard');

    // ===== Suppliers =====
    Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('can:view-suppliers');
    Route::post('/suppliers', [SupplierController::class, 'store'])->middleware('can:create-suppliers');

    // ===== Medications =====
    Route::get('/medications', [MedicationController::class, 'index'])->middleware('can:view-medications');
    Route::post('/medications', [MedicationController::class, 'store'])->middleware('can:create-medications');
    Route::get('/medications/{med_id}', [MedicationController::class, 'show'])->middleware('can:view-medications');
    Route::put('/medications/{med_id}', [MedicationController::class, 'update'])->middleware('can:edit-medications');
    Route::delete('/medications/{med_id}', [MedicationController::class, 'destroy'])->middleware('can:delete-medications');

    // ===== Doctors =====
    Route::get('/doctors', [DoctorController::class, 'index'])->middleware('can:view-doctors');
    Route::post('/doctors', [DoctorController::class, 'store'])->middleware('can:create-doctors');

    // ===== Prescriptions =====
    Route::get('/prescriptions', [PrescriptionController::class, 'index'])->middleware('can:view-prescriptions');
    Route::post('/prescriptions', [PrescriptionController::class, 'store'])->middleware('can:create-prescriptions');
    Route::put('/prescriptions/{pres_id}', [PrescriptionController::class, 'update'])->middleware('can:edit-prescriptions');
    Route::delete('/prescriptions/{pres_id}', [PrescriptionController::class, 'destroy'])->middleware('can:delete-prescriptions');

    // ===== Stock & Sales Reports =====
    Route::get('/stock', [StockReportController::class, 'index'])->middleware('can:view-stock');
    Route::get('/salesd', [SalesFullDetailsController::class, 'index'])->middleware('can:view-sales-details');

    // ===== Suppliers by Medication =====
    Route::get('/suppliers/by-medication/{med_id}', [SupplierController::class, 'suppliersByMedication'])->middleware('can:view-suppliers');

    // ===== Inventory =====
    Route::get('/inventory', [InventoryController::class, 'index'])->middleware('can:view-inventory');
    Route::post('/inventory', [InventoryController::class, 'store'])->middleware('can:create-inventory');

    // ===== Sales Details =====
    Route::get('/sales-details', [SalesDetailsController::class, 'index'])->middleware('can:view-sales-details');

    // ===== Customers =====
    Route::get('/customers', [CustomersController::class, 'index'])->middleware('can:view-customers');

    // ===== Categories =====
    Route::get('/categories', [CategoryController::class, 'index'])->middleware('can:view-categories');
    Route::post('/categories', [CategoryController::class, 'store'])->middleware('can:create-categories');
    Route::get('/categories/{id}', [CategoryController::class, 'show'])->middleware('can:view-categories');
    Route::put('/categories/{id}', [CategoryController::class, 'update'])->middleware('can:edit-categories');
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->middleware('can:delete-categories');

    // ===== Purchases =====
    Route::prefix('parchases')->group(function () {
        Route::get('/', [ParchasesController::class, 'index'])->middleware('can:view-purchases');
        Route::post('/', [ParchasesController::class, 'store'])->middleware('can:create-purchases');
        Route::get('/{parchaseid}', [ParchasesController::class, 'show'])->middleware('can:view-purchases');
        Route::put('/{parchaseid}', [ParchasesController::class, 'update'])->middleware('can:edit-purchases');
        Route::delete('/{parchaseid}', [ParchasesController::class, 'destroy'])->middleware('can:delete-purchases');
    });

    // ===== Notifications =====
    Route::get('/notifications', [NotificationController::class, 'index'])->middleware('can:view-notifications');

    // ===== Sales CRUD =====
    Route::get('/sales', [SalesController::class, 'index'])->middleware('can:view-sales');
    Route::post('/sales', [SalesController::class, 'store'])->middleware('can:create-sales');
    Route::put('/sales/{sales_id}', [SalesController::class, 'update'])->middleware('can:edit-sales');
    Route::delete('/sales/{sales_id}', [SalesController::class, 'destroy'])->middleware('can:delete-sales');

    // ===== Journals =====
    Route::get('/journals', [JournalController::class, 'index'])->middleware('can:view-journals');
    Route::get('/journals/{id}', [JournalController::class, 'show'])->middleware('can:view-journals');
    Route::post('/journals', [JournalController::class, 'store'])->middleware('can:create-journals');
    Route::put('/journals/{id}', [JournalController::class, 'update'])->middleware('can:edit-journals');
    Route::post('journals/upsert/{id?}', [JournalController::class, 'upsert'])->middleware('can:edit-journals');

    // ===== Reports / Views =====
    Route::get('/view-inventory', [ViewInventoryController::class, 'index'])->middleware('can:view-inventory');
    Route::get('/view-medications', [ViewMedicationsController::class, 'index'])->middleware('can:view-medications');
    Route::get('/account-summary', [AccountSummaryController::class, 'index'])->middleware('can:view-account-summary');
    Route::get('/view-profit-loss', [ViewProfitLossController::class, 'index'])->middleware('can:view-profit-loss');
    Route::get('/view-supplier-purchases', [ViewSupplierPurchasesController::class, 'index'])->middleware('can:view-supplier-purchases');
    Route::get('/hospital-reports', [HospitalReportController::class, 'index'])->middleware('can:view-hospital-reports');
    Route::get('/reports/medication-stock', function () {
        return DB::table('vw_medication_status')->get();
    })->middleware('can:view-stock');
    Route::get('/reports/medication-stock', [StockReportController::class, 'medicationStock'])->middleware('can:view-stock');
    Route::get('/dashboard-daily', function () {
        return DB::table('view_dashboard_daily')->get();
    })->middleware('can:view-dashboard');
    Route::get('/benefits', [BenefitController::class, 'index'])->middleware('can:view-benefits');
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