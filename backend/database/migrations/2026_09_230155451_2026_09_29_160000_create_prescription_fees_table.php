<?php
// database/migrations/xxxx_xx_xx_xxxxxx_add_ref_and_patient_fields_to_prescription_fees_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * افزودن ستون‌های گم‌شده برای ذخیره اطلاعات بیمار، داکتر و مرجع فیس
     */
    public function up(): void
    {
        Schema::table('prescription_fees', function (Blueprint $table) {

            // ============================================================
            // فیلدهای مرجع (ref_type, ref_id) - برای تفکیک داخلی/بیرونی
            // ============================================================
            if (!Schema::hasColumn('prescription_fees', 'ref_type')) {
                $table->string('ref_type', 50)->nullable()->after('patient_id')
                    ->comment('prescription_fee (داخلی) | external_prescription (بیرونی)');
            }

            if (!Schema::hasColumn('prescription_fees', 'ref_id')) {
                $table->unsignedBigInteger('ref_id')->nullable()->after('ref_type')
                    ->comment('شناسه نسخه داخلی (pharmacy_executions.id) یا بیرونی (external_prescriptions.id)');
            }

            if (!Schema::hasColumn('prescription_fees', 'source_type')) {
                $table->string('source_type', 20)->nullable()->after('ref_id')
                    ->comment('internal | external');
            }

            // ============================================================
            // اطلاعات بیمار (Denormalized برای نمایش سریع)
            // ============================================================
            if (!Schema::hasColumn('prescription_fees', 'patient_name')) {
                $table->string('patient_name')->nullable()->after('source_type')
                    ->comment('نام بیمار (کپی از patients یا external_prescriptions)');
            }

            if (!Schema::hasColumn('prescription_fees', 'patient_phone')) {
                $table->string('patient_phone', 30)->nullable()->after('patient_name')
                    ->comment('شماره تماس بیمار');
            }

            if (!Schema::hasColumn('prescription_fees', 'tazkira_number')) {
                $table->string('tazkira_number', 50)->nullable()->after('patient_phone')
                    ->comment('شماره تذکره');
            }

            // ============================================================
            // اطلاعات داکتر
            // ============================================================
            if (!Schema::hasColumn('prescription_fees', 'doctor_name')) {
                $table->string('doctor_name')->nullable()->after('tazkira_number')
                    ->comment('نام داکتر (کپی از users.name)');
            }

            // ============================================================
            // ایندکس ترکیبی برای جستجو سریع
            // ============================================================
            $table->index(['ref_type', 'ref_id'], 'pf_ref_idx');
        });
    }

    public function down(): void
    {
        Schema::table('prescription_fees', function (Blueprint $table) {
            $table->dropIndex('pf_ref_idx');
            $table->dropColumn([
                'ref_type',
                'ref_id',
                'source_type',
                'patient_name',
                'patient_phone',
                'tazkira_number',
                'doctor_name',
            ]);
        });
    }
};