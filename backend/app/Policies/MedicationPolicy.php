<?php
// app/Policies/MedicationPolicy.php

namespace App\Policies;

use App\Models\User;
use App\Models\Medication;

class MedicationPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // همه می‌توانند ببینند
    }

    public function view(User $user, Medication $medication): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isPharmacist();
    }

    public function update(User $user, Medication $medication): bool
    {
        return $user->isAdmin() || $user->isPharmacist();
    }

    public function delete(User $user, Medication $medication): bool
    {
        return $user->isAdmin();
    }
}