<?php

namespace App\Http\Controllers;
use App\Models\Inventory;
use App\Models\Supplier;
use App\Models\Medication;

use Illuminate\Http\Request;

class InventoryController extends Controller
{

    public function index()
    {
        return Inventory::with(['medications', 'suppliers'])->get();
    }

























   public function inventory_insert(){

        $suppliers = Supplier::all();
        $medicat = Medication::all();

        return view('invent_insert',compact('suppliers','medicat'));

        
   }
   public function inventory_store(Request $request)
   {
       $request->validate([
           'supplier_id' => 'required|exists:suppliers,supplier_id',
           'med_id' => 'required|exists:medications,med_id',
            
       ]);
   
       Inventory::create($request->all()); 
       
 
//     dd($request->all());
 

   
       return redirect()->route('inventory_insert')->with('save', 'معلومات موفقانه ثبت گردید');
   }
   

        public function inventory_view(){


   $inventor = Inventory::with('supplier','medication')->orderBy('invent_id', 'desc')->paginate(10);

                        return view('invent_view',compact('inventor'));

        }

        public  function inventory_edit($invent_id){


                $inventor = Inventory::where('invent_id', $invent_id)->firstOrFail(); 

                $suppliers = Supplier::all();
                $medications = Medication::all();

                return view('invent_edit',compact('inventor','suppliers','medications'));

        }
        
       public function inventory_update(request $request,$invent_id){
        $request->validate([
                'supplier_id' => 'required|exists:suppliers,supplier_id',
                'med_id' => 'required|exists:medications,med_id',
                // 'quantity' => 'nullable|integer|min:0',
                // 'unit_price' => 'required|numeric|min:0',
            ]);     
                $inventor = Inventory::findOrFail($invent_id);
                $inventor->update($request->all());

                // return redirect()->route('inventory_view')->with('up','معلومات موفقانه ویرایش گردید');
                return redirect()->route('inventory_view')->with('up', 'اطلاعات دارو با موفقیت به‌روزرسانی شد.');

       } 


       public function inventory_destroy ($invent_id)
       {
           $inventor = Inventory::findOrFail($invent_id); 
           $inventor->delete(); 
           return redirect()->route('inventory_view')->with('del', 'اطلاعات با موفقیت حذف گردید');
       }



}
