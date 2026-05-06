<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaymentController extends Controller
{



public function summary($id)
{
    $sale = DB::table('sales_full_details')
        ->where('sale_id', $id)
        ->select(
            'sale_id',
            'customer_name',
            'sales_date',
            DB::raw('SUM(total_sales) as total_sales'),
            DB::raw('SUM(total_paid) as total_paid'),
            DB::raw('SUM(remaining_amount) as remaining')
        )
        ->groupBy('sale_id', 'customer_name', 'sales_date')
        ->first();

    return response()->json($sale);
}



    public function store(Request $request)
{
    $request->validate([
        'sales_id' => 'required|exists:sales,id',
        'amount' => 'required|numeric|min:1',
        'payment_date' => 'required|date',
    ]);

    Payment::create($request->all());


    return response()->json([
        'message' => 'پرداخت با موفقیت ثبت شد'
    ]);
}

}
