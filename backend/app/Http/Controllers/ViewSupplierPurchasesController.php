<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\view_supplier_purchases;

class ViewSupplierPurchasesController extends Controller
{
    public function view_supplier(){

        $supp = view_supplier_purchases::all();
        
        return view('view_supplier',compact('supp'));


    }
}
