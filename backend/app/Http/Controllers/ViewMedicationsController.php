<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\view_medications;

class ViewMedicationsController extends Controller
{
    public function view_medication(){

        $medicate = View_medications::orderBy('medication_id', 'desc')->paginate(10);

        return view('view_medications', compact('medicate'));


    }








    
}
