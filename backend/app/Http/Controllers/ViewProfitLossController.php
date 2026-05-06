<?php

namespace App\Http\Controllers;
use App\Models\view_profit_loss;

class ViewProfitLossController extends Controller
{
        public function view_profit(){

            $profit = view_profit_loss::all();
        
            return view('view_profit',compact('profit'));
    


        }


}
