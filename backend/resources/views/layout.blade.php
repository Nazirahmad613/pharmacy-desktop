<!DOCTYPE html>
<html lang="fa">

<head>
    <meta charset="utf-8">
 
    <style>
       body {
            font-family: Tahoma, sans-serif;  
            direction: rtl;   
            text-align: right;   
            margin: 20px;  
            background-color: #f9f9f9; 
       }
       .owl-carousel .owl-item img {
            transition: transform 0.5s ease-in-out;
       }
       .owl-carousel .owl-item.active img {
            transform: scale(1.1);
       }
    </style>
    
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta content="" name="keywords">
    <meta content="" name="description">

    <link href="img/favicon.ico" rel="icon">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600&family=Inter:wght@700;800&display=swap" rel="stylesheet">
    
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.4.1/font/bootstrap-icons.css" rel="stylesheet">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="lib/owlcarousel/assets/owl.carousel.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>

<body>
    <div class="container-xxl bg-white p-0">
        <div id="spinner" class="show bg-white position-fixed translate-middle w-100 vh-100 top-50 start-50 d-flex align-items-center justify-content-center">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="sr-only">در حال بارگیری...</span>
            </div>
        </div>

        <div class="container-fluid nav-bar bg-transparent">
            <nav class="navbar navbar-expand-lg bg-white navbar-light py-0 px-4">
                <a href="index.html" class="navbar-brand d-flex align-items-center text-center">
                    <div class="icon p-2 me-2">
                        <img class="img-fluid" src="img/icon-deal.png" alt="آیکون" style="width: 30px; height: 30px;">
                    </div>
                    <h1 class="m-0 text-primary">دواخانه الفلاح</h1>
                </a>
                <button type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto">
                        <a href="{{ route('main') }}" class="nav-item nav-link active">صفحه اصلی</a>
                        <a href="{{ route('about') }}" class="nav-item nav-link">مدیریت دواها</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link"> مدیریت شرکت های سازنده دوا</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link"> مدیریت مشتریان</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link">مدیریت فروش و فاکتورها</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link">گزارشات و تحلیل‌ها</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link">تنظیمات</a>
                        <a href="{{ route('view_med') }}" class="nav-item nav-link"> ورود وثبت نام </a>
                        <div class="nav-item dropdown">
                            {{-- <a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">اضافه کردن اطلاعات</a>
                            <div class="dropdown-menu rounded-0 m-0">
                                <a href="{{ route('medications.create') }}" class="dropdown-item">اضافه کردن محصول جدید</a>
                                <a href="{{ route('view_med') }}" class="dropdown-item">دواها</a>
                            </div> --}}
                            
                        </div>
                        <a href="{{ route('contact') }}" class="nav-item nav-link">تماس با ما</a>
                    </div>
                </div>
            </nav>
        </div>

        <div class="container-fluid header bg-white p-0">
            <div class="row g-0 align-items-center flex-column-reverse flex-md-row">
                <div class="col-md-6 p-5 mt-lg-5">
                    <h1 class="display-5 animated fadeIn mb-4">مکان <span class="text-primary">قابل اعتماد</span> برای دریافت محصولات مطمئن</h1>
                    <p class="animated fadeIn mb-4 pb-2">ای مردم! به یقین برای شما از جانب پروردگارتان اندرزی و درمانی برای آنچه در سینه‌هاست، و رهنمود و رحمتی برای مؤمنان آمده است.</p>
                </div>
                <div class="col-md-6 animated fadeIn">
                    <div class="owl-carousel header-carousel">
                        <div class="owl-carousel-item">
                            <img class="img-fluid" src="img/carousel-1.jpg" alt="">
                        </div>
                        <div class="owl-carousel-item">
                            <img class="img-fluid" src="img/carousel-2.jpg" alt="">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container-fluid bg-primary mb-5 wow fadeIn" data-wow-delay="0.1s" style="padding: 35px;">
            <div class="container">
                <div class="row g-2">
                    <div class="col-md-10">
                        <div class="row g-2">
                            <div class="col-md-4">
                                <input type="text" class="form-control border-0 py-3" placeholder="جستجو">
                            </div>
                            <div class="col-md-4">
                                <select class="form-select border-0 py-3">
                                    <option selected>انواع محصول</option>
                                    <option value="1">داروهای هورمونی</option>
                                    <option value="2">داروهای تنفسی</option>
                                    <option value="3">داروهای قلبی</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-dark border-0 w-100 py-3">جستجو</button>
                    </div>
                </div>
            </div>
        </div>

      
    </div>
    <script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="lib/owlcarousel/owl.carousel.min.js"></script>
    <script src="js/main.js"></script>
    <script>
        $(document).ready(function(){
            $(".header-carousel").owlCarousel({
                items: 1,
                loop: true,
                autoplay: true,
                autoplayTimeout: 3000,
                animateOut: 'fadeOut',
                animateIn: 'fadeIn',
                smartSpeed: 1000
            });
        });
    </script>
</body>
@yield('content')
</html>
