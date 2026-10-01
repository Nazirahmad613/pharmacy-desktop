// src/app/navigations.jsx
import DashboardIcon from "@mui/icons-material/Dashboard";
import LoginIcon from "@mui/icons-material/Login";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CategoryIcon from "@mui/icons-material/Category";
import PaymentIcon from "@mui/icons-material/Payment";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BarChartIcon from "@mui/icons-material/BarChart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import InventoryIcon from "@mui/icons-material/Inventory";
import ScienceIcon from "@mui/icons-material/Science";
import RadioIcon from "@mui/icons-material/Radio";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import BusinessIcon from "@mui/icons-material/Business";

// ============================================================
// ✅ رول‌ها - نام‌ها باید با دیتابیس شما یکسان باشند
// ============================================================
export const ROLES = {
  Admin: "Admin",
  SUPER_ADMIN: "super_admin",
  HOSPITAL_HEAD: "hospital_head",
  DOCTOR: "Doctor",
  PHARMACIST: "Pharmacist",
  LAB_TECHNICIAN: "LabTechnician",
  RADIOLOGIST: "Radiologist",
  RECEPTIONIST: "Receptionist",
  ACCOUNTANT: "Accountant",
  USER: "User",
};

// ============================================================
// ✅ Permissionها (اختیاری - اگر Permission-based کار می‌کنید)
// ============================================================
export const PERMISSIONS = {
  LAB_VIEW: "lab.view",
  LAB_MANAGE: "lab.manage",
  RADIOLOGY_VIEW: "radiology.view",
  RADIOLOGY_MANAGE: "radiology.manage",
  PHARMACY_VIEW: "pharmacy.view",
  PHARMACY_MANAGE: "pharmacy.manage",
  EXAM_VIEW: "examination.view",
  EXAM_MANAGE: "examination.manage",
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  REPORTS_VIEW: "reports.view",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
};

const navigations = [
  {
    name: "dashboard",
    path: "/dashboard/default",
    icon: <DashboardIcon />,
    // بدون roles → برای همه
  },

  {
    label: "pages",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
  },

  {
    name: "session_auth",
    icon: <LoginIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
    children: [
      {
        name: "sign_in",
        path: "/session/signin",
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "sign_up",
        path: "/session/signup",
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "forgot_password",
        path: "/session/forgot-password",
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "error",
        path: "/session/404",
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
    ],
  },

  // ============================================================
  // کاربران
  // ============================================================
  {
    label: "کاربران",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
  },

  {
    name: "مدیریت کاربران",
    icon: <PeopleIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
    children: [
      {
        name: "مدیریت کاربران",
        path: "/material/users",
        icon: <PeopleIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "مدیریت رول‌ها و پرمیشن‌ها",
        path: "/material/roles-permissions",
        icon: <PeopleIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
    ],
  },

  // ============================================================
  // ثبت نام
  // ============================================================
  {
    label: "ثبت نام",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  },

  {
    name: "ثبت نام",
    icon: <AppRegistrationIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
    children: [
      {
        name: "RegistationForm",
        path: "/material/registrations",
        icon: <AppRegistrationIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
      },
    ],
  },

  // ============================================================
  // ✅ لابراتوار
  // ============================================================
  {
    label: "لابراتوار",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.LAB_TECHNICIAN],
  },

  {
    name: "🧪 لابراتوار",
    icon: <ScienceIcon />,
    path: "/material/lab-hematology",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.LAB_TECHNICIAN],
  },

  // ============================================================
  // ✅ رادیولوژی
  // ============================================================
  {
    label: "رادیولوژی",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.RADIOLOGIST],
  },

  {
    name: "📷 رادیولوژی",
    icon: <RadioIcon />,
    path: "/material/radiology",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.RADIOLOGIST],
  },

  // ============================================================
  // ✅ دواخانه
  // ============================================================
  {
    label: "دواخانه",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
  },

  {
    name: "💊 دواخانه",
    icon: <LocalPharmacyIcon />,
    path: "/material/pharmacy",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
  },

  // ============================================================
  // مدیریت مالی
  // ============================================================
  {
    label: "مدیریت مالی",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
  },

  {
    name: "مدیریت مالی",
    icon: <PaymentIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
    children: [
      {
        name: "parchases",
        path: "/material/parchases",
        icon: <ShoppingCartIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
      },
      {
        name: "sales_insert",
        path: "/material/sales_insert",
        icon: <PointOfSaleIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
      },
      {
        name: "addchanges",
        path: "/material/changes",
        icon: <ChangeCircleIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
      },
      {
        name: "PaymentForm",
        path: "/material/payment",
        icon: <PaymentIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
      },
    ],
  },

  // ============================================================
  // تنظیمات
  // ============================================================
  {
    label: "تنظیمات",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
  },

  {
    name: "تنظیمات",
    icon: <CategoryIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
    children: [
      {
        name: "addmedication",
        path: "/material/addinformation",
        icon: <VaccinesIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "addcatagory",
        path: "/material/addcatagory",
        icon: <CategoryIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "مدیریت بخش‌ها",
        path: "/material/departments",
        icon: <BusinessIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
      {
        name: "logs",
        path: "/material/logs",
        icon: <DescriptionIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
      },
    ],
  },

  // ============================================================
  // مدیریت سیستم
  // ============================================================
  {
    label: "مدیریت سیستم",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
  },

  {
    name: "مدیریت سیستم",
    icon: <DashboardIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
    children: [
      {
        name: "مدیریت استاک",
        icon: <InventoryIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
        children: [
          {
            name: "لیست موجودی",
            path: "/material/stock",
            icon: <InventoryIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
          },
        ],
      },

      {
        name: "مدیریت حساب‌ها",
        icon: <AccountBalanceWalletIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
        children: [
          {
            name: "حساب‌ها",
            path: "/material/accounts",
            icon: <AccountBalanceWalletIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
        ],
      },

      {
        name: "گزارش ها",
        icon: <AssessmentIcon />,
        roles: [
          ROLES.Admin,
          ROLES.SUPER_ADMIN,
          ROLES.ACCOUNTANT,
          ROLES.DOCTOR,
        ],
        children: [
          {
            name: "hospital_Report",
            path: "/material/hospital-report",
            icon: <LocalHospitalIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.DOCTOR],
          },
          {
            name: "AccountSummaryPage",
            path: "/material/AcountSummaryPage",
            icon: <AccountBalanceIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "MedicationStockTable",
            path: "/material/MedicationStockTable",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
          },
          {
            name: "SalesTable",
            path: "/material/SalesTable",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "گزارش روزانه (جدول)",
            path: "/material/dashboard-daily-table",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "گزارشات مالی",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
            children: [
              {
                name: "فواید (جدول)",
                path: "/reports/benefits",
                roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
              },
            ],
          },
        ],
      },

      {
        name: "charts",
        icon: <BarChartIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
        children: [
          {
            name: "فواید (گراف)",
            path: "/reports/benefits-chart",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "گزارش روزانه (چارت)",
            path: "/material/dashboard-daily-chart",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "SalesChart",
            path: "/material/SalesChart",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT],
          },
          {
            name: "MedicationStockChart",
            path: "/material/MedicationStockChart",
            icon: <BarChartIcon />,
            roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.PHARMACIST],
          },
        ],
      },
    ],
  },

  // ============================================================
  // معالجه
  // ============================================================
  {
    label: "معالجه",
    type: "label",
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.DOCTOR],
  },

  {
    name: "معالجه",
    icon: <LocalHospitalIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.DOCTOR],
    children: [
      {
        name: "معالجه داکتر",
        path: "/material/examinations",
        icon: <LocalHospitalIcon />,
        roles: [ROLES.Admin, ROLES.SUPER_ADMIN, ROLES.DOCTOR],
      },
    ],
  },

  {
    name: "documentation",
    icon: <MenuBookIcon />,
    roles: [ROLES.Admin, ROLES.SUPER_ADMIN],
  },
];

export default navigations;