// app/navigations.js
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
import AssignmentIcon from "@mui/icons-material/Assignment";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import WaterIcon from "@mui/icons-material/Water";
import BiotechIcon from "@mui/icons-material/Biotech";
import HealingIcon from "@mui/icons-material/Healing";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import FactCheckIcon from "@mui/icons-material/FactCheck";

const navigations = [
  {
    name: "dashboard",
    path: "/dashboard/default",
    icon: <DashboardIcon />,
  },

  { label: "pages", type: "label" },

  {
    name: "session_auth",
    icon: <LoginIcon />,
    children: [
      { name: "sign_in", path: "/session/signin" },
      { name: "sign_up", path: "/session/signup" },
      { name: "forgot_password", path: "/session/forgot-password" },
      { name: "error", path: "/session/404" },
    ],
  },

  {
    label: "کاربران",
    type: "label",
    roles: ["Admin"],
  },

  {
    name: "مدیریت کاربران",
    icon: <PeopleIcon />,
    roles: ["Admin"],
    children: [
      {
        name: "مدیریت کاربران",
        path: "/material/users",
        icon: <PeopleIcon />,
        roles: ["Admin"],
      },
      {
        name: "مدیریت رول‌ها و پرمیشن‌ها",
        path: "/material/roles-permissions",
        icon: <PeopleIcon />,
        roles: ["Admin"],
      },
    ],
  },

  {
    label: "ثبت نام",
    type: "label",
  },

  {
    name: "ثبت نام",
    icon: <AppRegistrationIcon />,
    children: [
      {
        name: "RegistationForm",
        path: "/material/registrations",
        icon: <AppRegistrationIcon />,
      },
    ],
  },

  {
    label: "لابراتوار",
    type: "label",
  },

  {
    name: "لابراتوار",
    icon: <ScienceIcon />,
    children: [
      {
        name: "🧪 آزمایش خون",
        path: "/material/lab-hematology",
        icon: <BloodtypeIcon />,
      },
      {
        name: "💧 آنالیز ادرار",
        path: "/material/lab-urine",
        icon: <WaterIcon />,
      },
      {
        name: "🧬 بیوشیمی خون",
        path: "/material/lab-biochemistry",
        icon: <BiotechIcon />,
      },
      {
        name: "🩸 قند خون (Blood Sugar)",
        path: "/material/lab-blood-sugar",
        icon: <MonitorHeartIcon />,
      },
      {
        name: "🧫 تست HIV / AIDS",
        path: "/material/lab-hiv",
        icon: <HealingIcon />,
      },
      {
        name: "🧪 تست هپاتیت B",
        path: "/material/lab-hepatitis-b",
        icon: <HealingIcon />,
      },
      {
        name: "🧪 تست هپاتیت C",
        path: "/material/lab-hepatitis-c",
        icon: <HealingIcon />,
      },
      {
        name: "🦟 تست مالاریا",
        path: "/material/lab-malaria",
        icon: <HealingIcon />,
      },
      {
        name: "🩸 گروپ خون",
        path: "/material/lab-blood-group",
        icon: <BloodtypeIcon />,
      },
      {
        name: "📄 ثبت نتایج آزمایش",
        path: "/material/lab-results",
        icon: <FactCheckIcon />,
      },
    ],
  },

  {
    label: "رادیولوژی",
    type: "label",
  },

  {
    name: "رادیولوژی",
    icon: <LocalHospitalIcon />,
    children: [
      {
        name: "درخواست‌های رادیولوژی",
        path: "/material/radiology-request",
        icon: <AssignmentIcon />,
      },
      {
        name: "X-Ray",
        path: "/material/radiology-xray",
        icon: <LocalHospitalIcon />,
      },
      {
        name: "Ultrasound",
        path: "/material/radiology-ultrasound",
        icon: <LocalHospitalIcon />,
      },
      {
        name: "CT Scan",
        path: "/material/radiology-ct",
        icon: <LocalHospitalIcon />,
      },
      {
        name: "MRI",
        path: "/material/radiology-mri",
        icon: <LocalHospitalIcon />,
      },
      {
        name: "ثبت نتایج رادیولوژی",
        path: "/material/radiology-results",
        icon: <DescriptionIcon />,
      },
    ],
  },

  {
    label: "مدیریت مالی",
    type: "label",
  },

  {
    name: "مدیریت مالی",
    icon: <PaymentIcon />,
    children: [
      {
        name: "parchases",
        path: "/material/parchases",
        icon: <ShoppingCartIcon />,
      },
      {
        name: "sales_insert",
        path: "/material/sales_insert",
        icon: <PointOfSaleIcon />,
      },
      {
        name: "addchanges",
        path: "/material/changes",
        icon: <ChangeCircleIcon />,
      },
      {
        name: "PaymentForm",
        path: "/material/payment",
        icon: <PaymentIcon />,
      },
    ],
  },

  {
    label: "تنظیمات",
    type: "label",
  },

  {
    name: "تنظیمات",
    icon: <CategoryIcon />,
    children: [
      {
        name: "addmedication",
        path: "/material/addinformation",
        icon: <VaccinesIcon />,
      },
      {
        name: "addcatagory",
        path: "/material/addcatagory",
        icon: <CategoryIcon />,
      },
      {
        name: "logs",
        path: "/material/logs",
        icon: <DescriptionIcon />,
      },
    ],
  },

  {
    label: "مدیریت سیستم",
    type: "label",
  },

  {
    name: "مدیریت سیستم",
    icon: <DashboardIcon />,
    children: [
      {
        name: "مدیریت استاک",
        icon: <InventoryIcon />,
        children: [
          {
            name: "لیست موجودی",
            path: "/material/stock",
            icon: <InventoryIcon />,
          },
        ],
      },

      {
        name: "گزارش ها",
        icon: <AssessmentIcon />,
        children: [
          {
            name: "hospital_Report",
            path: "/material/hospital-report",
            icon: <LocalHospitalIcon />,
          },
          {
            name: "AccountSummaryPage",
            path: "/material/AcountSummaryPage",
            icon: <AccountBalanceIcon />,
          },
          {
            name: "MedicationStockTable",
            path: "/material/MedicationStockTable",
            icon: <BarChartIcon />,
          },
          {
            name: "SalesTable",
            path: "/material/SalesTable",
            icon: <BarChartIcon />,
          },
          {
            name: "گزارش روزانه (جدول)",
            path: "/material/dashboard-daily-table",
            icon: <BarChartIcon />,
          },
          {
            name: "گزارشات مالی",
            icon: <BarChartIcon />,
            children: [
              {
                name: "فواید (جدول)",
                path: "/reports/benefits",
              },
            ],
          },
        ],
      },

      {
        name: "charts",
        icon: <BarChartIcon />,
        children: [
          {
            name: "فواید (گراف)",
            path: "/reports/benefits-chart",
            icon: <BarChartIcon />,
          },
          {
            name: "گزارش روزانه (چارت)",
            path: "/material/dashboard-daily-chart",
            icon: <BarChartIcon />,
          },
          {
            name: "SalesChart",
            path: "/material/SalesChart",
            icon: <BarChartIcon />,
          },
          {
            name: "MedicationStockChart",
            path: "/material/MedicationStockChart",
            icon: <BarChartIcon />,
          },
        ],
      },
    ],
  },

  {
    name: "معالجه",
    icon: <LocalHospitalIcon />,
    children: [
      {
        name: "معالجه داکتر",
        path: "/material/examinations",
        icon: <LocalHospitalIcon />,
      },
    ],
  },

  {
    name: "documentation",
    icon: <MenuBookIcon />,
  },
];

export default navigations;