// app/constants/modules.js
// ✅ لیست کامل ماژول‌ها — مطابق با routes/api.php

export const AVAILABLE_MODULES = [
  // ==================== اصلی ====================
  {
    key: "dashboard",
    label: "داشبورد",
    path: "/dashboard",
    icon: "Dashboard",
    group: "اصلی",
  },
  {
    key: "notifications",
    label: "اطلاعیه‌ها",
    path: "/notifications",
    icon: "Notifications",
    group: "اصلی",
  },

  // ==================== مریضان و ثبت‌نام ====================
  {
    key: "patients",
    label: "مریضان",
    path: "/patients",
    icon: "People",
    group: "مریضان",
  },
  {
    key: "registrations",
    label: "ثبت‌نام مریضان",
    path: "/registrations",
    icon: "HowToReg",
    group: "مریضان",
  },
  {
    key: "follow-ups",
    label: "پیگیری مریضان",
    path: "/follow-ups",
    icon: "EventRepeat",
    group: "مریضان",
  },
  {
    key: "treatment-history",
    label: "تاریخچه معالجه",
    path: "/treatment-history",
    icon: "HistoryEdu",
    group: "مریضان",
  },

  // ==================== داکتر و معاینات ====================
  {
    key: "doctor",
    label: "داکتر / معالجه",
    path: "/doctor",
    icon: "MedicalServices",
    group: "کلینیک",
  },
  {
    key: "examinations",
    label: "معاینات",
    path: "/examinations",
    icon: "Assignment",
    group: "کلینیک",
  },
  {
    key: "departments",
    label: "بخش‌ها / دیپارتمنت‌ها",
    path: "/departments",
    icon: "Apartment",
    group: "کلینیک",
  },

  // ==================== لابراتوار ====================
  {
    key: "laboratory",
    label: "لابراتوار",
    path: "/laboratory",
    icon: "Science",
    group: "لابراتوار و رادیولوژی",
  },
  {
    key: "laboratory-requests",
    label: "درخواست‌های لابراتوار",
    path: "/laboratory-requests",
    icon: "AssignmentTurnedIn",
    group: "لابراتوار و رادیولوژی",
  },
  {
    key: "laboratory-results",
    label: "نتایج لابراتوار",
    path: "/laboratory-results",
    icon: "FactCheck",
    group: "لابراتوار و رادیولوژی",
  },
  {
    key: "laboratory-fees",
    label: "فیس لابراتوار",
    path: "/laboratory-fees",
    icon: "Paid",
    group: "لابراتوار و رادیولوژی",
  },

  // ==================== رادیولوژی ====================
  {
    key: "radiology-requests",
    label: "درخواست‌های رادیولوژی",
    path: "/radiology-requests",
    icon: "ImageSearch",
    group: "لابراتوار و رادیولوژی",
  },
  {
    key: "radiology-results",
    label: "نتایج رادیولوژی",
    path: "/radiology-results",
    icon: "PhotoCamera",
    group: "لابراتوار و رادیولوژی",
  },
  {
    key: "radiology-fees",
    label: "فیس رادیولوژی",
    path: "/radiology-fees",
    icon: "RequestQuote",
    group: "لابراتوار و رادیولوژی",
  },

  // ==================== عملیات ====================
  {
    key: "operations",
    label: "عملیات‌ها",
    path: "/operations",
    icon: "LocalHospital",
    group: "عملیات و بستری",
  },
  {
    key: "operation-fees",
    label: "فیس عملیات",
    path: "/operation-fees",
    icon: "Receipt",
    group: "عملیات و بستری",
  },

  // ==================== بستری ====================
  {
    key: "admissions",
    label: "بستری",
    path: "/admissions",
    icon: "Hotel",
    group: "عملیات و بستری",
  },
  {
    key: "admission-fees",
    label: "فیس بستری",
    path: "/admission-fees",
    icon: "Payments",
    group: "عملیات و بستری",
  },
  {
    key: "wards",
    label: "وارد‌ها",
    path: "/wards",
    icon: "Domain",
    group: "عملیات و بستری",
  },
  {
    key: "beds",
    label: "تخت‌ها",
    path: "/beds",
    icon: "Bed",
    group: "عملیات و بستری",
  },

  // ==================== اضطراری ====================
  {
    key: "emergency",
    label: "مریضان اضطراری",
    path: "/emergency",
    icon: "Emergency",
    group: "اضطراری",
  },
  {
    key: "emergency-triage",
    label: "تریاژ اضطراری",
    path: "/emergency/triage",
    icon: "PriorityHigh",
    group: "اضطراری",
  },

  // ==================== دواخانه / نسخه ====================
  {
    key: "prescriptions",
    label: "نسخه‌ها",
    path: "/prescriptions",
    icon: "Description",
    group: "دواخانه",
  },
  {
    key: "external-prescriptions",
    label: "نسخه‌های بیرونی",
    path: "/external-prescriptions",
    icon: "NoteAlt",
    group: "دواخانه",
  },
  {
    key: "prescription-fees",
    label: "فیس نسخه",
    path: "/prescription-fees",
    icon: "AttachMoney",
    group: "دواخانه",
  },
  {
    key: "pharmacy-executions",
    label: "اجراآت دواخانه",
    path: "/pharmacy-executions",
    icon: "LocalPharmacy",
    group: "دواخانه",
  },
  {
    key: "medications",
    label: "ادویه‌جات",
    path: "/medications",
    icon: "Medication",
    group: "دواخانه",
  },

  // ==================== گدام و خرید ====================
  {
    key: "stock",
    label: "گدام",
    path: "/stock",
    icon: "Inventory2",
    group: "گدام و خرید",
  },
  {
    key: "inventory",
    label: "موجودی گدام",
    path: "/inventory",
    icon: "Warehouse",
    group: "گدام و خرید",
  },
  {
    key: "purchases",
    label: "خریداری",
    path: "/purchases",
    icon: "ShoppingCart",
    group: "گدام و خرید",
  },
  {
    key: "categories",
    label: "دسته‌بندی‌ها",
    path: "/categories",
    icon: "Category",
    group: "گدام و خرید",
  },

  // ==================== فروش ====================
  {
    key: "sales",
    label: "فروش",
    path: "/sales",
    icon: "PointOfSale",
    group: "فروش",
  },
  {
    key: "customers",
    label: "مشتریان",
    path: "/customers",
    icon: "Groups",
    group: "فروش",
  },

  // ==================== مالی و حسابداری ====================
  {
    key: "accounts",
    label: "حساب‌ها",
    path: "/accounts",
    icon: "AccountBalance",
    group: "مالی",
  },
  {
    key: "account-summary",
    label: "خلاصه حساب‌ها",
    path: "/account-summary",
    icon: "Summarize",
    group: "مالی",
  },
  {
    key: "journal",
    label: "روزنامچه",
    path: "/journal",
    icon: "MenuBook",
    group: "مالی",
  },
  {
    key: "journal-ref-sources",
    label: "منابع مرجع روزنامچه",
    path: "/journal-ref-sources",
    icon: "Source",
    group: "مالی",
  },
  {
    key: "benefits",
    label: "مزایا",
    path: "/benefits",
    icon: "CardGiftcard",
    group: "مالی",
  },
  {
    key: "profit-loss",
    label: "سود و زیان",
    path: "/profit-loss",
    icon: "TrendingUp",
    group: "مالی",
  },

  // ==================== معاشات ====================
  {
    key: "payroll",
    label: "معاشات",
    path: "/payroll",
    icon: "Payments",
    group: "معاشات",
  },

  // ==================== گزارش‌ها ====================
  {
    key: "reports-hospital",
    label: "گزارش شفاخانه",
    path: "/reports/hospital",
    icon: "Assessment",
    group: "گزارش‌ها",
  },
  {
    key: "stock-reports",
    label: "گزارش گدام",
    path: "/stock-reports",
    icon: "BarChart",
    group: "گزارش‌ها",
  },

  // ==================== مدیریت سیستم ====================
  {
    key: "users",
    label: "کاربران",
    path: "/users",
    icon: "AdminPanelSettings",
    group: "مدیریت سیستم",
  },
  {
    key: "roles",
    label: "نقش‌ها",
    path: "/roles",
    icon: "Badge",
    group: "مدیریت سیستم",
  },
  {
    key: "permissions",
    label: "دسترسی‌ها",
    path: "/permissions",
    icon: "Key",
    group: "مدیریت سیستم",
  },
  {
    key: "logs",
    label: "لاگ‌ها",
    path: "/logs",
    icon: "History",
    group: "مدیریت سیستم",
  },
  {
    key: "settings",
    label: "تنظیمات",
    path: "/settings",
    icon: "Settings",
    group: "مدیریت سیستم",
  },
];

// ============================================================
// ✅ گروه‌بندی ماژول‌ها برای نمایش در Setup
// ============================================================
export const MODULE_GROUPS = AVAILABLE_MODULES.reduce((acc, mod) => {
  if (!acc[mod.group]) acc[mod.group] = [];
  acc[mod.group].push(mod);
  return acc;
}, {});

// ============================================================
// ✅ ماژول‌های پیشنهادی پیش‌فرض (برای انتخاب سریع)
// ============================================================
export const DEFAULT_MODULES = [
  "dashboard",
  "patients",
  "registrations",
  "doctor",
  "prescriptions",
  "medications",
  "stock",
  "sales",
  "users",
  "logs",
  "settings",
];

// ============================================================
// ✅ تابع کمکی: پیدا کردن ماژول با key
// ============================================================
export const getModuleByKey = (key) =>
  AVAILABLE_MODULES.find((m) => m.key === key);