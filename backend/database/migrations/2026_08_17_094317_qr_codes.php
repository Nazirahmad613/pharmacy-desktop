   <?php
// database/migrations/2024_01_01_create_qr_codes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('laboratory_fee_id')->constrained('laboratory_fees')->onDelete('cascade');
            $table->foreignId('laboratory_request_id')->nullable()->constrained('laboratory_requests')->onDelete('set null');
            $table->foreignId('patient_id')->nullable()->constrained('patients')->onDelete('set null');
            $table->foreignId('registration_id')->nullable()->constrained('registrations')->onDelete('set null');
            $table->string('qr_code_path');
            $table->json('qr_code_data');
            $table->string('qr_code_type')->default('laboratory_fee');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('qr_codes');
    }
};