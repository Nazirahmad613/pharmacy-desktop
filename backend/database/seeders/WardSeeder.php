<?php
// database/seeders/WardSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Ward;

class WardSeeder extends Seeder
{
    public function run()
    {
        $wards = [
            // ============ بخش‌های عمومی ============
            [
                'name' => 'بخش داخلی',
                'code' => 'INT',
                'type' => 'general',
                'total_beds' => 20,
                'available_beds' => 15,
                'description' => 'بخش داخلی بیمارستان - پذیرش بیماران با بیماری‌های داخلی',
                'location' => 'طبقه دوم',
                'floor' => '2',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1001',
                'is_active' => true
            ],
            [
                'name' => 'بخش جراحی عمومی',
                'code' => 'SUR',
                'type' => 'surgical',
                'total_beds' => 15,
                'available_beds' => 10,
                'description' => 'بخش جراحی عمومی - اعمال جراحی عمومی و تخصصی',
                'location' => 'طبقه سوم',
                'floor' => '3',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1002',
                'is_active' => true
            ],

            // ============ بخش‌های تخصصی ============
            [
                'name' => 'بخش قلب و عروق',
                'code' => 'CAR',
                'type' => 'medical',
                'total_beds' => 12,
                'available_beds' => 8,
                'description' => 'بخش تخصصی قلب و عروق - مراقبت از بیماران قلبی و عروقی',
                'location' => 'طبقه چهارم',
                'floor' => '4',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1003',
                'is_active' => true
            ],
            [
                'name' => 'بخش مغز و اعصاب',
                'code' => 'NEU',
                'type' => 'medical',
                'total_beds' => 10,
                'available_beds' => 6,
                'description' => 'بخش تخصصی مغز و اعصاب - درمان بیماری‌های عصبی و مغزی',
                'location' => 'طبقه پنجم',
                'floor' => '5',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1004',
                'is_active' => true
            ],
            [
                'name' => 'بخش ارتوپدی',
                'code' => 'ORT',
                'type' => 'surgical',
                'total_beds' => 12,
                'available_beds' => 9,
                'description' => 'بخش تخصصی ارتوپدی - درمان بیماری‌های استخوان و مفاصل',
                'location' => 'طبقه سوم',
                'floor' => '3',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1005',
                'is_active' => true
            ],

            // ============ بخش‌های ویژه ============
            [
                'name' => 'بخش آی‌سی‌یو (مراقبت‌های ویژه)',
                'code' => 'ICU',
                'type' => 'icu',
                'total_beds' => 8,
                'available_beds' => 4,
                'description' => 'بخش مراقبت‌های ویژه - بیماران بدحال و نیازمند مراقبت ویژه',
                'location' => 'طبقه چهارم',
                'floor' => '4',
                'building' => 'ساختمان غربی',
                'phone' => '021-2211-1006',
                'is_active' => true
            ],
            [
                'name' => 'بخش سی‌سی‌یو (مراقبت‌های قلبی)',
                'code' => 'CCU',
                'type' => 'ccu',
                'total_beds' => 6,
                'available_beds' => 3,
                'description' => 'بخش مراقبت‌های ویژه قلبی - بیماران قلبی بدحال',
                'location' => 'طبقه چهارم',
                'floor' => '4',
                'building' => 'ساختمان غربی',
                'phone' => '021-2211-1007',
                'is_active' => true
            ],
            [
                'name' => 'بخش اورژانس',
                'code' => 'ER',
                'type' => 'general',
                'total_beds' => 10,
                'available_beds' => 5,
                'description' => 'بخش اورژانس - پذیرش و درمان بیماران اورژانسی',
                'location' => 'طبقه همکف',
                'floor' => '0',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1008',
                'is_active' => true
            ],

            // ============ بخش‌های زنان و کودکان ============
            [
                'name' => 'بخش زنان و زایمان',
                'code' => 'MAT',
                'type' => 'maternity',
                'total_beds' => 10,
                'available_beds' => 6,
                'description' => 'بخش زنان و زایمان - مراقبت از مادران باردار و زایمان',
                'location' => 'طبقه دوم',
                'floor' => '2',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1009',
                'is_active' => true
            ],
            [
                'name' => 'بخش کودکان',
                'code' => 'PED',
                'type' => 'pediatric',
                'total_beds' => 12,
                'available_beds' => 8,
                'description' => 'بخش کودکان - درمان بیماری‌های کودکان و نوزادان',
                'location' => 'طبقه اول',
                'floor' => '1',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1010',
                'is_active' => true
            ],
            [
                'name' => 'بخش نوزادان (NICU)',
                'code' => 'NICU',
                'type' => 'pediatric',
                'total_beds' => 8,
                'available_beds' => 5,
                'description' => 'بخش مراقبت‌های ویژه نوزادان - نوزادان نارس و بیمار',
                'location' => 'طبقه اول',
                'floor' => '1',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1011',
                'is_active' => true
            ],

            // ============ بخش‌های سرپایی و درمانی ============
            [
                'name' => 'بخش فیزیوتراپی',
                'code' => 'PT',
                'type' => 'general',
                'total_beds' => 6,
                'available_beds' => 4,
                'description' => 'بخش فیزیوتراپی - توانبخشی و فیزیوتراپی بیماران',
                'location' => 'طبقه همکف',
                'floor' => '0',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1012',
                'is_active' => true
            ],
            [
                'name' => 'بخش دیالیز',
                'code' => 'DIA',
                'type' => 'general',
                'total_beds' => 8,
                'available_beds' => 6,
                'description' => 'بخش دیالیز - انجام دیالیز برای بیماران کلیوی',
                'location' => 'طبقه همکف',
                'floor' => '0',
                'building' => 'ساختمان غربی',
                'phone' => '021-2211-1013',
                'is_active' => true
            ],

            // ============ بخش‌های جراحی تخصصی ============
            [
                'name' => 'بخش جراحی قلب',
                'code' => 'CS',
                'type' => 'surgical',
                'total_beds' => 8,
                'available_beds' => 5,
                'description' => 'بخش جراحی قلب - اعمال جراحی قلب باز و عروق',
                'location' => 'طبقه چهارم',
                'floor' => '4',
                'building' => 'ساختمان غربی',
                'phone' => '021-2211-1014',
                'is_active' => true
            ],
            [
                'name' => 'بخش جراحی مغز و اعصاب',
                'code' => 'NS',
                'type' => 'surgical',
                'total_beds' => 8,
                'available_beds' => 5,
                'description' => 'بخش جراحی مغز و اعصاب - اعمال جراحی مغز و ستون فقرات',
                'location' => 'طبقه پنجم',
                'floor' => '5',
                'building' => 'ساختمان اصلی',
                'phone' => '021-2211-1015',
                'is_active' => true
            ],

            // ============ بخش‌های روانپزشکی ============
            [
                'name' => 'بخش روانپزشکی',
                'code' => 'PSY',
                'type' => 'general',
                'total_beds' => 10,
                'available_beds' => 7,
                'description' => 'بخش روانپزشکی - درمان بیماری‌های روانی و اعصاب',
                'location' => 'طبقه پنجم',
                'floor' => '5',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1016',
                'is_active' => true
            ],

            // ============ بخش‌های توانبخشی ============
            [
                'name' => 'بخش توانبخشی',
                'code' => 'REH',
                'type' => 'general',
                'total_beds' => 8,
                'available_beds' => 6,
                'description' => 'بخش توانبخشی - توانبخشی بیماران پس از سکته و حوادث',
                'location' => 'طبقه همکف',
                'floor' => '0',
                'building' => 'ساختمان شرقی',
                'phone' => '021-2211-1017',
                'is_active' => true
            ],
        ];

        foreach ($wards as $ward) {
            Ward::create($ward);
        }

        $this->command->info('✅ ' . count($wards) . ' بخش با موفقیت ایجاد شدند!');
    }
}