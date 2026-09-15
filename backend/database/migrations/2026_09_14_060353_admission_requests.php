<?php
// database/migrations/2026_09_14_060353_admission_requests.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ============ اگر جدول وجود ندارد، بساز ============
        if (!Schema::hasTable('admission_requests')) {
            Schema::create('admission_requests', function (Blueprint $table) {
                $table->id();
                
                // ارتباط با رجیستریشن
                $table->unsignedBigInteger('reg_id');
                
                // ارتباط با بیمار و دکتر
                $table->unsignedBigInteger('patient_id');
                $table->unsignedBigInteger('doctor_id')->nullable();
                
                // بخش و تخت
                $table->unsignedBigInteger('ward_id')->nullable();
                $table->unsignedBigInteger('bed_id')->nullable();
                $table->string('location')->nullable();
                $table->string('room_number')->nullable();
                $table->string('bed_number')->nullable();
                
                // تاریخ بستری
                $table->date('admission_date');
                $table->string('admission_type', 50)->default('emergency');
                $table->timestamp('request_date')->nullable();
                
                // ============ فیلدهای ترخیص ============
                $table->date('discharge_date')->nullable();
                $table->time('discharge_time')->nullable();
                $table->string('discharge_type', 50)->nullable();
                $table->text('discharge_reason')->nullable();
                $table->text('discharge_notes')->nullable();
                $table->unsignedBigInteger('discharged_by_user_id')->nullable();
                $table->datetime('discharged_at')->nullable();
                $table->datetime('cancelled_at')->nullable();
                
                // تشخیص و دستورالعمل‌ها
                $table->string('diagnosis')->nullable();
                $table->text('admission_instructions')->nullable();
                $table->text('special_notes')->nullable();
                
                // وضعیت
                $table->string('status', 50)->default('pending');
                $table->string('priority', 50)->default('normal');
                
                // هشدار فیس
                $table->timestamp('last_fee_alert_at')->nullable();
                $table->integer('fee_alert_count')->default(0);
                
                // زمان تکمیل
                $table->datetime('completed_at')->nullable();
                
                $table->timestamps();
                $table->softDeletes();
                
                // ایندکس‌ها
                $table->index('reg_id');
                $table->index('patient_id');
                $table->index('doctor_id');
                $table->index('ward_id');
                $table->index('status');
                $table->index('admission_date');
                $table->index('discharge_date');
            });
        } else {
            // ============ اگر جدول وجود دارد، فقط ستون‌های جدید را اضافه کن ============
            Schema::table('admission_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('admission_requests', 'discharge_date')) {
                    $table->date('discharge_date')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'discharge_time')) {
                    $table->time('discharge_time')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'discharge_type')) {
                    $table->string('discharge_type', 50)->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'discharge_reason')) {
                    $table->text('discharge_reason')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'discharge_notes')) {
                    $table->text('discharge_notes')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'discharged_by_user_id')) {
                    $table->unsignedBigInteger('discharged_by_user_id')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'admission_type')) {
                    $table->string('admission_type', 50)->default('emergency');
                }
                if (!Schema::hasColumn('admission_requests', 'bed_id')) {
                    $table->unsignedBigInteger('bed_id')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'location')) {
                    $table->string('location')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'room_number')) {
                    $table->string('room_number')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'bed_number')) {
                    $table->string('bed_number')->nullable();
                }
                if (!Schema::hasColumn('admission_requests', 'request_date')) {
                    $table->timestamp('request_date')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // در صورت rollback، جدول را حذف نکن (چون داده از دست می‌رود)
        // فقط ستون‌های جدید را حذف کن
        if (Schema::hasTable('admission_requests')) {
            Schema::table('admission_requests', function (Blueprint $table) {
                $columnsToDrop = [
                    'discharge_date',
                    'discharge_time',
                    'discharge_type',
                    'discharge_reason',
                    'discharge_notes',
                    'discharged_by_user_id',
                    'admission_type',
                    'bed_id',
                    'location',
                    'room_number',
                    'bed_number',
                    'request_date',
                ];
                
                foreach ($columnsToDrop as $column) {
                    if (Schema::hasColumn('admission_requests', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};