<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('followups');

        Schema::create('followups', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('reg_id')
                ->comment('FK → registrations.reg_id');

            $table->unsignedBigInteger('patient_id')->nullable()
                ->comment('FK → patients.id');

            $table->unsignedBigInteger('doctor_id')->nullable()
                ->comment('FK → users.id');

            // 📅 اطلاعات مراجعه بعدی
            $table->date('follow_up_date');
            $table->time('follow_up_time')->nullable();
            $table->text('reason')->nullable();
            $table->text('instructions')->nullable();
            $table->string('priority', 20)->default('normal')
                ->comment('normal | urgent | emergency');

            // 📊 وضعیت
            $table->string('status', 30)->default('pending')
                ->comment('pending | confirmed | completed | cancelled | no_show');

            // 📝 یادداشت‌ها
            $table->text('doctor_notes')->nullable();
            $table->text('patient_notes')->nullable();

            // 🔔 یادآوری
            $table->boolean('reminder_sent')->default(false);
            $table->timestamp('reminder_sent_at')->nullable();

            // 🎯 ملاقات واقعی
            $table->timestamp('actual_visit_at')->nullable();
            $table->unsignedBigInteger('actual_reg_id')->nullable()
                ->comment('اگر مریض آمد، reg_id جدید');

            // 🧾 PDF و بارکد
            $table->string('pdf_file')->nullable();
            $table->string('barcode', 100)->nullable();

            // 👤 متادیتا
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // 🔍 ایندکس‌ها
            $table->index('reg_id');
            $table->index('patient_id');
            $table->index('doctor_id');
            $table->index('follow_up_date');
            $table->index('status');
            $table->index('priority');
            $table->index(['reg_id', 'status']);
            $table->index(['follow_up_date', 'status']);
            $table->index(['doctor_id', 'follow_up_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('followups');
    }
};