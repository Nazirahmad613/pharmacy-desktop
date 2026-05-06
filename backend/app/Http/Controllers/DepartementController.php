<?php

namespace App\Http\Controllers;

use App\Models\Departement;
use Illuminate\Http\Request;

class DepartementController extends Controller
{
    // لیست همه بخش‌ها
    public function index()
    {
        $departments = Departement::all();
        return response()->json($departments);
    }
}