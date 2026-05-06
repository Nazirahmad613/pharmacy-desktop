<?php
// app/Policies/ReportPolicy.php

namespace App\Policies;

use App\Models\User;

class ReportPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // همه می‌توانند گزارشات را ببینند
    }

    public function export(User $user): bool
    {
        return $user->isAdmin() || $user->isHospitalHead();
    }
}