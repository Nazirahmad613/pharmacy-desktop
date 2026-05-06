 <?php
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
use Illuminate\Support\Facades\Route;

// مسیر گرفتن CSRF cookie برای Sanctum
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

// مسیر اصلی لاراول (اختیاری)
Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

// فایل auth.php شامل مسیرهای login/register/api
require __DIR__.'/auth.php';

// 🔹 Fallback برای تمام مسیرهای غیر API → React SPA
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
