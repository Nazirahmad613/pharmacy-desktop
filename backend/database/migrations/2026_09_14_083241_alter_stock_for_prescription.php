```php
<?php

// database/migrations/2026_09_14_083241_alter_stock_for_prescription.php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Stock
        |--------------------------------------------------------------------------
        |
        | تغییرات مورد نیاز stock قبلاً در Migration مربوط به stock
        | اعمال شده‌اند.
        |
        | بنابراین برای جلوگیری از rebuild شدن جدول stock در SQLite
        | هیچ عملیات Schema::table روی stock انجام نمی‌دهیم.
        |
        */
    }

    public function down(): void
    {
        /*
        |--------------------------------------------------------------------------
        | هیچ تغییری برنمی‌گردانیم
        |--------------------------------------------------------------------------
        |
        | ساختار فعلی stock متعلق به Migrationهای دیگر است.
        |
        */
    }
};
