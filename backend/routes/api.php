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
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesDetailsController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ViewInventoryController;
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
| Stock Routes (PUBLIC - بدون احراز هویت برای تست)
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

/*
|--------------------------------------------------------------------------
| Sales Stock Check Routes (بدون احراز هویت برای تست)
|--------------------------------------------------------------------------
*/
// ✅ این Route ها باید خارج از گروه stock باشند
Route::post('/sales/check-stock', [SalesController::class, 'checkStockBeforeSale']);
Route::post('/sales/check-multiple-stock', [SalesController::class, 'checkMultipleStockBeforeSale']);
    Route::get('/low-stock', [StockController::class, 'lowStock']);
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

    // ===== Registrations =====
    Route::post('/registrations', [RegistrationsController::class, 'store']);
    Route::get('/registrations', [RegistrationsController::class, 'index']);
    Route::delete('/registrations/{reg_id}', [RegistrationsController::class, 'destroy']);
    Route::put('/registrations/{reg_id}', [RegistrationsController::class, 'update']);

    // ===== Dashboard =====
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ===== Medications =====
    Route::get('/medications', [MedicationController::class, 'index']);
    Route::post('/medications', [MedicationController::class, 'store']);
    Route::get('/medications/{med_id}', [MedicationController::class, 'show']);
    Route::put('/medications/{med_id}', [MedicationController::class, 'update']);
    Route::delete('/medications/{med_id}', [MedicationController::class, 'destroy']);

    // ===== Doctors =====
    Route::get('/doctors', [DoctorController::class, 'index']);
    Route::post('/doctors', [DoctorController::class, 'store']);

    // ===== Prescriptions =====
    Route::get('/prescriptions', [PrescriptionController::class, 'index']);
    Route::post('/prescriptions', [PrescriptionController::class, 'store']);
    Route::put('/prescriptions/{pres_id}', [PrescriptionController::class, 'update']);
    Route::delete('/prescriptions/{pres_id}', [PrescriptionController::class, 'destroy']);

    // ===== Stock & Sales Reports =====
    Route::get('/salesd', [SalesFullDetailsController::class, 'index']);

    // ===== Inventory =====
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);

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

    // ===== Sales CRUD =====
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);
    Route::put('/sales/{sales_id}', [SalesController::class, 'update']);
    Route::delete('/sales/{sales_id}', [SalesController::class, 'destroy']);

    // ===== Journals =====
    Route::get('/journals', [JournalController::class, 'index']);
    Route::get('/journals/{id}', [JournalController::class, 'show']);
    Route::post('/journals', [JournalController::class, 'store']);
    Route::put('/journals/{id}', [JournalController::class, 'update']);
    Route::post('journals/upsert/{id?}', [JournalController::class, 'upsert']);

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