<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;
use Illuminate\Support\Str;

class DepartmentSeeder extends Seeder
{
    /**
     * بخش‌های شفاخانه - گروه‌بندی‌شده
     */
    public function run(): void
    {
        $departments = [

            // ============================================================
            // 1. بخش‌های کلینیکی (Clinical Departments)
            // ============================================================
            [
                'code' => 'INTERNAL',
                'name' => 'داخله',
                'description' => 'تشخیص و درمان بیماری‌های داخلی بزرگسالان',
                'group' => 'clinical',
            ],
            [
                'code' => 'SURGERY',
                'name' => 'جراحی عمومی',
                'description' => 'اعمال جراحی عمومی و ترمیمی',
                'group' => 'clinical',
            ],
            [
                'code' => 'ORTHO',
                'name' => 'ارتوپدی',
                'description' => 'درمان بیماری‌ها و شکستگی‌های استخوان و مفاصل',
                'group' => 'clinical',
            ],
            [
                'code' => 'NEURO',
                'name' => 'عصب‌شناسی (نورولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های مغز، نخاع و اعصاب',
                'group' => 'clinical',
            ],
            [
                'code' => 'NEUROSURG',
                'name' => 'جراحی اعصاب',
                'description' => 'اعمال جراحی مغز، نخاع و اعصاب محیطی',
                'group' => 'clinical',
            ],
            [
                'code' => 'CARD',
                'name' => 'قلب و عروق',
                'description' => 'تشخیص و درمان بیماری‌های قلبی و عروقی',
                'group' => 'clinical',
            ],
            [
                'code' => 'CARDIO_SURG',
                'name' => 'جراحی قلب و عروق',
                'description' => 'اعمال جراحی قلب باز و عروق',
                'group' => 'clinical',
            ],
            [
                'code' => 'PULMO',
                'name' => 'رئوی (پولمونولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های تنفسی و ریه',
                'group' => 'clinical',
            ],
            [
                'code' => 'GASTRO',
                'name' => 'معدی و روده (گاستروانترولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های گوارشی',
                'group' => 'clinical',
            ],
            [
                'code' => 'NEPHRO',
                'name' => 'امراض کلیوی (نفرولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های کلیه',
                'group' => 'clinical',
            ],
            [
                'code' => 'UROLOGY',
                'name' => 'امراض بولی (یورولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های دستگاه ادراری',
                'group' => 'clinical',
            ],
            [
                'code' => 'ENDO',
                'name' => 'غدد درون‌ریز (اندوکرینولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های هورمونی و غدد',
                'group' => 'clinical',
            ],
            [
                'code' => 'RHEUM',
                'name' => 'روماتولوژی',
                'description' => 'تشخیص و درمان بیماری‌های روماتیسمی و خودایمنی',
                'group' => 'clinical',
            ],
            [
                'code' => 'HEMA',
                'name' => 'امراض خون (هماتولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های خون',
                'group' => 'clinical',
            ],
            [
                'code' => 'ONCO',
                'name' => 'انکولوژی (سرطان)',
                'description' => 'تشخیص و درمان بیماری‌های سرطانی',
                'group' => 'clinical',
            ],
            [
                'code' => 'INFECT',
                'name' => 'امراض عفونی',
                'description' => 'تشخیص و درمان بیماری‌های عفونی و واگیردار',
                'group' => 'clinical',
            ],
            [
                'code' => 'DERM',
                'name' => 'جلدی (درماتولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های پوست، مو و ناخن',
                'group' => 'clinical',
            ],
            [
                'code' => 'PSYCH',
                'name' => 'روانی (سایکیاتری)',
                'description' => 'تشخیص و درمان بیماری‌های روانی و رفتاری',
                'group' => 'clinical',
            ],
            [
                'code' => 'PSYCHOL',
                'name' => 'روان‌شناسی',
                'description' => 'مشاوره و ارزیابی روان‌شناختی',
                'group' => 'clinical',
            ],
            [
                'code' => 'PHYSIO',
                'name' => 'فزیوتراپی',
                'description' => 'درمان فیزیکی و توان‌بخشی',
                'group' => 'clinical',
            ],
            [
                'code' => 'REHAB',
                'name' => 'توان‌بخشی',
                'description' => 'بازتوانی و توان‌بخشی بیماران',
                'group' => 'clinical',
            ],

            // ============================================================
            // 2. بخش‌های تخصصی زنان و اطفال
            // ============================================================
            [
                'code' => 'GYNE',
                'name' => 'نسائی و ولادی (نسائی ولادی)',
                'description' => 'تشخیص و درمان بیماری‌های زنان و زایمان',
                'group' => 'clinical',
            ],
            [
                'code' => 'OBST',
                'name' => 'ولادی (زایمان)',
                'description' => 'مراقبت‌های دوران بارداری و زایمان',
                'group' => 'clinical',
            ],
            [
                'code' => 'PEDIA',
                'name' => 'اطفال',
                'description' => 'تشخیص و درمان بیماری‌های کودکان',
                'group' => 'clinical',
            ],
            [
                'code' => 'NEO',
                'name' => 'نوزادان (نواناتولوژی)',
                'description' => 'مراقبت‌های ویژه نوزادان',
                'group' => 'clinical',
            ],
            [
                'code' => 'PEDIA_SURG',
                'name' => 'جراحی اطفال',
                'description' => 'اعمال جراحی مخصوص کودکان',
                'group' => 'clinical',
            ],

            // ============================================================
            // 3. بخش‌های چشم، گوش، حلق و بینی
            // ============================================================
            [
                'code' => 'OPHTH',
                'name' => 'چشم (افتالمولوژی)',
                'description' => 'تشخیص و درمان بیماری‌های چشم',
                'group' => 'clinical',
            ],
            [
                'code' => 'ENT',
                'name' => 'گوش، حلق و بینی',
                'description' => 'تشخیص و درمان بیماری‌های گوش، حلق و بینی',
                'group' => 'clinical',
            ],
            [
                'code' => 'DENT',
                'name' => 'دندان (ستوماتولوژی)',
                'description' => 'درمان بیماری‌های دهان و دندان',
                'group' => 'clinical',
            ],
            [
                'code' => 'MAXFAX',
                'name' => 'فک و صورت',
                'description' => 'جراحی فک و صورت',
                'group' => 'clinical',
            ],

            // ============================================================
            // 4. بخش‌های اورژانسی و مراقبت‌های ویژه
            // ============================================================
            [
                'code' => 'EMERG',
                'name' => 'عاجل (اورژانس)',
                'description' => 'خدمات فوری و اورژانسی',
                'group' => 'emergency',
            ],
            [
                'code' => 'ICU',
                'name' => 'مراقبت‌های ویژه (ICU)',
                'description' => 'مراقبت‌های ویژه بزرگسالان',
                'group' => 'emergency',
            ],
            [
                'code' => 'NICU',
                'name' => 'مراقبت‌های ویژه نوزادان (NICU)',
                'description' => 'مراقبت‌های ویژه نوزادان',
                'group' => 'emergency',
            ],
            [
                'code' => 'CCU',
                'name' => 'مراقبت‌های ویژه قلبی (CCU)',
                'description' => 'مراقبت‌های ویژه بیماران قلبی',
                'group' => 'emergency',
            ],
            [
                'code' => 'PICU',
                'name' => 'مراقبت‌های ویژه اطفال (PICU)',
                'description' => 'مراقبت‌های ویژه کودکان',
                'group' => 'emergency',
            ],
            [
                'code' => 'BURN',
                'name' => 'سوختگی',
                'description' => 'درمان بیماران سوختگی',
                'group' => 'emergency',
            ],

            // ============================================================
            // 5. بخش‌های پاراکلینیکی (تشخیصی)
            // ============================================================
            [
                'code' => 'LAB',
                'name' => 'لابراتوار',
                'description' => 'آزمایشات طبی و تشخیصی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'RADIO',
                'name' => 'رادیولوژی',
                'description' => 'تصویربرداری با اشعه ایکس، CT، MRI',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'SONO',
                'name' => 'سونوگرافی',
                'description' => 'تصویربرداری با امواج اولتراسوند',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'CT',
                'name' => 'سی‌تی اسکن (CT Scan)',
                'description' => 'تصویربرداری مقطعی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'MRI',
                'name' => 'ام‌آر‌آی (MRI)',
                'description' => 'تصویربرداری با تشدید مغناطیسی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'PATHO',
                'name' => 'پاتولوژی',
                'description' => 'آسیب‌شناسی و تشخیص بافتی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'BIO',
                'name' => 'بیوشیمی',
                'description' => 'آزمایشات بیوشیمیایی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'MICRO',
                'name' => 'میکروبیولوژی',
                'description' => 'آزمایشات میکروبی و کشت',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'IMMUNO',
                'name' => 'ایمونولوژی',
                'description' => 'آزمایشات ایمنی‌شناسی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'ENDO_SCOPY',
                'name' => 'اندوسکوپی',
                'description' => 'معاینه داخلی با اندوسکوپ',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'ECG',
                'name' => 'نوار قلب (ECG)',
                'description' => 'ثبت فعالیت الکتریکی قلب',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'ECHO',
                'name' => 'اکوکاردیوگرافی',
                'description' => 'تصویربرداری از قلب با امواج صوتی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'EEG',
                'name' => 'نوار مغز (EEG)',
                'description' => 'ثبت فعالیت الکتریکی مغز',
                'group' => 'paraclinical',
            ],

            // ============================================================
            // 6. بخش‌های دارویی و اجرایی
            // ============================================================
            [
                'code' => 'PHARM',
                'name' => 'دواخانه (فارمسی)',
                'description' => 'تهیه و توزیع دارو',
                'group' => 'support',
            ],
            [
                'code' => 'STORE',
                'name' => 'انبار',
                'description' => 'مدیریت انبار دارو و تجهیزات',
                'group' => 'support',
            ],
            [
                'code' => 'ADMIN',
                'name' => 'اداری',
                'description' => 'امور اداری و مدیریتی',
                'group' => 'support',
            ],
            [
                'code' => 'FINANCE',
                'name' => 'مالی',
                'description' => 'امور مالی و حسابداری',
                'group' => 'support',
            ],
            [
                'code' => 'HR',
                'name' => 'منابع بشری',
                'description' => 'مدیریت منابع انسانی',
                'group' => 'support',
            ],
            [
                'code' => 'IT',
                'name' => 'تکنالوژی معلوماتی',
                'description' => 'مدیریت سیستم‌های معلوماتی',
                'group' => 'support',
            ],
            [
                'code' => 'RECEPT',
                'name' => 'استقبال (رجیستریشن)',
                'description' => 'پذیرش بیماران و ثبت معلومات',
                'group' => 'support',
            ],
            [
                'code' => 'CASH',
                'name' => 'صندوق',
                'description' => 'امور صندوق و دریافت هزینه‌ها',
                'group' => 'support',
            ],

            // ============================================================
            // 7. بخش‌های بستری و پرستاری
            // ============================================================
            [
                'code' => 'WARD_M',
                'name' => 'بخش بستری مردان',
                'description' => 'بستری بیماران مرد',
                'group' => 'inpatient',
            ],
            [
                'code' => 'WARD_F',
                'name' => 'بخش بستری زنان',
                'description' => 'بستری بیماران زن',
                'group' => 'inpatient',
            ],
            [
                'code' => 'WARD_P',
                'name' => 'بخش بستری اطفال',
                'description' => 'بستری کودکان',
                'group' => 'inpatient',
            ],
            [
                'code' => 'WARD_MAT',
                'name' => 'بخش بستری ولادی',
                'description' => 'بستری مادران باردار',
                'group' => 'inpatient',
            ],
            [
                'code' => 'NURSING',
                'name' => 'پرستاری',
                'description' => 'خدمات پرستاری و مراقبت',
                'group' => 'inpatient',
            ],
            [
                'code' => 'MIDWIFE',
                'name' => 'قابله‌گی',
                'description' => 'خدمات قابله‌گی و مامایی',
                'group' => 'inpatient',
            ],

            // ============================================================
            // 8. بخش‌های تشخیصی تخصصی
            // ============================================================
            [
                'code' => 'GENETIC',
                'name' => 'جنتیک',
                'description' => 'مشاوره و آزمایشات جنتیکی',
                'group' => 'paraclinical',
            ],
            [
                'code' => 'IMMUNO_SUPP',
                'name' => 'ایمونوتراپی',
                'description' => 'درمان‌های ایمنی‌شناسی',
                'group' => 'clinical',
            ],
            [
                'code' => 'NUTRITION',
                'name' => 'تغذیه',
                'description' => 'مشاوره تغذیه و رژیم درمانی',
                'group' => 'clinical',
            ],
            [
                'code' => 'SOCIAL',
                'name' => 'خدمات اجتماعی',
                'description' => 'حمایت‌های اجتماعی بیماران',
                'group' => 'support',
            ],

            // ============================================================
            // 9. بخش‌های آموزشی و تحقیقاتی
            // ============================================================
            [
                'code' => 'TRAINING',
                'name' => 'آموزش',
                'description' => 'آموزش کارمندان و دانشجویان',
                'group' => 'education',
            ],
            [
                'code' => 'RESEARCH',
                'name' => 'تحقیقات',
                'description' => 'تحقیقات علمی و پزشکی',
                'group' => 'education',
            ],
            [
                'code' => 'LIBRARY',
                'name' => 'کتابخانه',
                'description' => 'منابع علمی و کتابخانه',
                'group' => 'education',
            ],
        ];

        $created = 0;
        $updated = 0;

        foreach ($departments as $dept) {
            $existing = Department::where('code', $dept['code'])->first();

            if ($existing) {
                $existing->update([
                    'name'        => $dept['name'],
                    'description' => $dept['description'],
                    'status'      => 'Active',
                ]);
                $updated++;
                $this->command->info("🔄 Updated: {$dept['code']} - {$dept['name']}");
            } else {
                Department::create([
                    'uuid'        => (string) Str::uuid(),
                    'code'        => $dept['code'],
                    'name'        => $dept['name'],
                    'description' => $dept['description'],
                    'status'      => 'Active',
                ]);
                $created++;
                $this->command->info("✅ Created: {$dept['code']} - {$dept['name']}");
            }
        }

        $this->command->info("");
        $this->command->info("========================================");
        $this->command->info("📊 Summary:");
        $this->command->info("   ✅ Created: {$created}");
        $this->command->info("   🔄 Updated: {$updated}");
        $this->command->info("   📁 Total:   " . Department::count());
        $this->command->info("========================================");
    }
}