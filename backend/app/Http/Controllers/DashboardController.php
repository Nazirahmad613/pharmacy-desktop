<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{ 
    public function index()
    {
        $data = [
            ['id' => 1, 'name' => 'محصول ۱'],
            ['id' => 2, 'name' => 'محصول ۲'],
            ['id' => 3, 'name' => 'محصول ۳'],
        ];

        return response()->json($data);
    }




}
