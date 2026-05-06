<?php

namespace App\Http\Controllers;
use App\Models\Sales;
use App\Models\Medication;
use App\Models\Sales_details;

use Illuminate\Http\Request;

class SalesDetailsController extends Controller
{
    public function sales_details_insert(){

        $saless = Sales::all();
        $medicate = Medication::all();

        return view('sales_d_insert', compact('saless','medicate'));

    }

        public function sales_details_store(Request $request){

            $request->validate([
                'sale_id' => 'required|exists:sales,sale_id',  
                'med_id' => 'required|exists:medications,med_id',  
                'quantity' => 'required|numeric',
                'unit_price' => 'required|numeric',
            ]);
                
                Sales_details::create($request->all());
                
            return redirect()->route('sales_details_insert')->with('save','معلومات موفقانه ثبت گردید ');
            
            }

            public function sales_details_view()
            {   
                $salesd = Sales_details::with('Sales','Medication')->orderBy('sales_d_id', 'desc')->paginate(10);

                    return view('sales_d_view', compact('salesd'));

            }


                public function sales_details_edit($sales_d_id){

                $salesd = Sales_details::where('sales_d_id', $sales_d_id)->firstOrFail();

                $sales = Sales::all();
                $medicate = Medication::all();

                    return view('sales_d_edit',compact('salesd','sales','medicate'));
                }





             public function sales_d_update(Request $request,$sales_d_id){


                $request->validate([
                    'sale_id' => 'required|exists:sales,sale_id',  
                    'med_id' => 'required|exists:medications,med_id',  
                    'quantity' => 'required|numeric',
                    'unit_price' => 'required|numeric',
                ]);



                $salesd = Sales_details::findOrFail($sales_d_id);

                $salesd->update($request->all());

                return redirect()->route('sales_details_view')->with('up','معلومات موفقانه بروز رسانی گردید');

             }

             public function destroy($sales_d_id){

                $salesdd = Sales_details::findOrFail($sales_d_id);
                $salesdd->delete();
                    
                return redirect()->route('sales_details_view')->with('del','معلومات موفقانه بروز رسانی گردید');
             }
    
}
