<?php

use Illuminate\Support\Facades\Route;
 
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CustomersController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SalesDetailsController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\DaySalesController;
use App\Http\Controllers\ViewDoctorPrescriptionsController;
use App\Http\Controllers\ViewInventoryController;
use App\Http\Controllers\ViewMedicationsController;
use App\Http\Controllers\ViewMounthlySales;
use App\Http\Controllers\ViewProfitLossController;
use App\Http\Controllers\ViewSupplierPurchasesController;
Route::get('/', function () {
    return view('welcome');
});
 
 

//medications table
Route::get('/medications/create', [MedicationController::class, 'create'])->name('medications.create');
Route::post('/medications/store', [MedicationController::class, 'store'])->name('medications.store');
Route::get('/view_med',[MedicationController::class,'view_med'])->name('view_med');
Route::get('/medications_edit/{med_id}/edit', [MedicationController::class, 'medications_edit'])->name('medications_edit');
Route::put('/medications_update/{med_id}/update', [MedicationController::class, 'medications_update'])->name('medications_update');
Route::delete('/medications_destroy/{med_id}/', [MedicationController::class, 'destroy'] )->name('medications_destroy');

// suppliers table
Route::delete('/supplier/{supplier_id}', [SupplierController::class, 'destroy'])->name('supplier_destroy');
Route::get('/supplier/{supplier_id}/edit', [SupplierController::class, 'suppliers_edit'])->name('suppliers_edit');
Route::post('/supplier/{supplier_id}/update', [SupplierController::class, 'suppliers_update'])->name('suppliers_update');
Route::get('/supp_view', [SupplierController::class, 'supp_view'])->name('supp_view');
Route::post('/supp_store', [SupplierController::class, 'supp_store'])->name('supp_store');
Route::get('/supplier_insert', [SupplierController::class, 'supplier_insert'])->name('supplier_insert');

// مشتریان
Route::get('/customer_insert',[CustomersController::class,'customer_insert'])->name('customer_insert');
Route::post('/customer_store',[CustomersController::class,'customer_store'])->name('customer_store');
Route::get('/customer_view',[CustomersController::class,'customer_view'])->name('customer_view');
Route::get('/customer/{customer_id}/edit',[CustomersController::class,'customer_edit'])->name('customer_edit');
Route::post('/customer_update/{customer_id}/update',[CustomersController::class,'customer_update'])->name('customer_update');
Route::get('/customer_destroy',[CustomersController::class,'customer_destroy'])->name('customer_destroy');


// داکتر ها 
Route::get('/doctor_insert',[DoctorController::class,'doctor_insert'])->name('doctor_insert');
Route::post('/doctor_store',[DoctorController::class,'doctor_store'])->name('doctor_store');
Route::get('/doctor_view',[DoctorController::class,'doctor_view'])->name('doctor_view');
Route::get('/doctor_edit/{doc_id}/edit',[DoctorController::class,'doctor_edit'])->name('doctor_edit');
Route::post('/doctor_update/{doc_id}/update',[DoctorController::class,'doctor_update'])->name('doctor_update');
Route::delete('/doctor_destroy/{doc_id}',[DoctorController::class,'doctor_destroy'])->name('doctor_destroy');
 

// کمپنی
Route::get('/company_insert',[CustomersController::class,'company_insert'])->name('company_insert');
Route::get('/company_store',[CustomersController::class,'company_store'])->name('company_store');
Route::post('/company_view',[CustomersController::class,'company_view'])->name('company_view');
Route::get('/company_edit/{company_id}/edit',[CustomersController::class,'company_edit'])->name('company_edit');
Route::get('/company_update/{company_id}/update',[CustomersController::class,'company_update'])->name('company_update');
Route::get('/company_destroy',[CustomersController::class,'company_destroy'])->name('company_destroy');

// فروشات 
Route::get('/sales_insert',[SalesController::class,'sales_insert'])->name('sales_insert');
Route::post('/sales_store',[SalesController::class,'sales_store'])->name('sales_store');
Route::get('/sales_view',[SalesController::class,'sales_view'])->name('sales_view');
Route::get('/sales_edit/{sales_id}/edit',[SalesController::class,'sales_edit'])->name('sales_edit');
Route::get('/sales_update/{sales_id}/update',[SalesController::class,'sales_update'])->name('sales_update');
Route::get('/sales_destroy',[SalesController::class,'sales_destroy'])->name('sales_destroy');
// جزیات فروشات 
Route::get('/sales_details_insert',[SalesDetailsController::class,'sales_details_insert'])->name('sales_details_insert');
Route::post('/sales_details_store',[SalesDetailsController::class,'sales_details_store'])->name('sales_details_store');
Route::get('/sales_details_view',[SalesDetailsController::class,'sales_details_view'])->name('sales_details_view');
Route::get('/sales_details_edit/{sales_d_id}/edit',[SalesDetailsController::class,'sales_details_edit'])->name('sales_details_edit');
Route::post('/sales_d_update/{sales_d_id}/update',[SalesDetailsController::class,'sales_d_update'])->name('sales_d_update');
Route::delete('/saled_d_destroy/{sales_d_id}',[SalesDetailsController::class,'destroy'])->name('sales_details_destroy');
//گدام
Route::get('/inventory_insert',[InventoryController::class,'inventory_insert'])->name('inventory_insert');
Route::post('/inventory_store',[InventoryController::class,'inventory_store'])->name('inventory_store');
Route::get('/inventory_view',[InventoryController::class,'inventory_view'])->name('inventory_view');
Route::get('/inventory_edit/{invent_id}/edit',[InventoryController::class,'inventory_edit'])->name('inventory_edit');
Route::post('/inventory_update/{invent_id}/update',[InventoryController::class,'inventory_update'])->name('inventory_update');
Route::delete('/inventory_destroy/{invent_id}',[InventoryController::class,'inventory_destroy'])->name('inventory_destroy');

//  

Route::get('/pres_insert',[PrescriptionController::class,'pres_insert'])->name('pres_insert');
Route::post('/pres_store',[PrescriptionController::class,'pres_store'])->name('pres_store');
Route::get('/pres_view',[PrescriptionController::class,'pres_view'])->name('pres_view');
Route::get('/pres_edit/{pre_id}/edit',[PrescriptionController::class,'pres_edit'])->name('pres_edit');
Route::post('/pres_update/{pre_id}/update',[PrescriptionController::class,'pres_update'])->name('pres_update');
Route::delete('/pres_destroy/{pre_id}',[PrescriptionController::class,'pres_destroy'])->name('pres_destroy');


// views
Route::get('/day_sales', [DaySalesController::class, 'day_sales']);
Route::get('/doctor_presc', [ViewDoctorPrescriptionsController::class, 'doctor_presc']);
Route::get('/view_invent', [ViewInventoryController::class, 'view_invent']);
// Route::get('/view_med', [ViewMedicationsController::class, 'view_med']);
// Route::get('/view_m_sales', [ViewMounthlySalesController::class, 'view_m_sales']);
Route::get('/view_profit', [ViewProfitLossController::class, 'view_profit']);
Route::get('/view_supplier', [ViewSupplierPurchasesController::class, 'view_supplier']);

 

