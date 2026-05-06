<?php

namespace App\Http\Controllers;
use App\Models\customer;
use Illuminate\Http\Request;

class CustomersController extends Controller
{

  public function index()
  {
      return response()->json(Customer::all());
  }
  






























// public function customer_insert(){


//         return view('cust_insert');
// }



// public function  customer_store (request $request){
//    $request->validate([
 
//     'cust_name' => 'required|string|max:255',
//     'cust_last_name' => 'required|string|max:255',
//     'cust_phone_num' => 'required|numeric|min:0',
//     'cust_email' => 'required|string|max:255',
//     'cust_address' => 'required|string|max:255',

//    ]);

//     $store = new Customer;

//     $store->cust_name = $request->cust_name;
//     $store->cust_last_name = $request->cust_last_name;
//     $store->cust_phone_num = $request->cust_phone_num;
//     $store->cust_email = $request->cust_email;
//     $store->cust_address = $request->cust_address;
//     $store->save();

// return redirect('customer_insert')->with('save','اطلاعات شما موفقانه ثبت گرددید');

// }



// public function customer_view(){


// $view = Customers::orderBy('customer_id', 'desc')->paginate(10);

// return  view('cust_view',compact('view'));



// }

// public function customer_edit($customer_id)
// {
//     $custi = Customers::where('customer_id', $customer_id)->firstOrFail(); 
//     return view('cust_edit', compact('custi'));
// }

// public function customer_update(request $request,$customer_id){

//     $request->validate([
 
//         'cust_name' => 'required|string|max:255',
//         'cust_last_name' => 'required|string|max:255',
//         'cust_phone_num' => 'required|numeric|min:0',
//         'cust_email' =>  'required|string|max:255',
//         'cust_address' => 'required|string|max:255',
    
//        ]);
//     //    $custi = Customers::findOrFail($customer_id);
//     //   $custi->cust_name = $request->cust_name;
//     //   $custi->cust_last_name = $request->cust_last_name;
//     //   $custi->cust_phone_num = $request->cust_phone_num;
//     //   $custi->cust_email = $request->cust_email;
//     //   $custi->cust_address = $request->cust_address;
//     //   $custi->save();
        
//       $custi = Customer::findOrFail($customer_id);
//       $custi->update($request->all());
//   return redirect()->route('customer_view')->with('success', 'اطلاعات با موفقیت ویرایش شد.');
        



     

// }






 }
