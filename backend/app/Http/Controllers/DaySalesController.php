<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\day_sales;

class DaySalesController extends Controller
{
    public function day_sales()
    {
        $sales = Day_sales::all(); 
        return view('day_sales', compact('sales')); 
    }
}
