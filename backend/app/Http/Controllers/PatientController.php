<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index()
    {
        return Patient::latest()->paginate(20);
    }

    public function store(Request $request)
    {

    }

    public function show(Patient $patient)
    {
        return $patient;
    }

    public function update(Request $request, Patient $patient)
    {

    }

    public function destroy(Patient $patient)
    {

    }
}