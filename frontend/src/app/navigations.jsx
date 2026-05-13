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
import HubIcon from '@mui/icons-material/Hub';

const navigations = [
  {
    name: "dashboard",
    path: "/dashboard/default",
    icon: <DashboardIcon />,
    permissions: ["view-dashboard"], // ✅ اضافه کردن پرمیشن
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

  { label: "ثبت معلومات", type: "label" },

  {
    name: "ثبت معلومات جدید",
    icon: <AppRegistrationIcon />,
    permissions: ["create-medications", "create-prescriptions", "create-sales", "create-purchases", "create-registrations"], // ✅ پرمیشن‌های مورد نیاز
    children: [
      {
        name: "RegistationForm",
        path: "/material/registrations",
        icon: <AppRegistrationIcon />,
        permissions: ["create-registrations"],
      },
      {
        name: "addmedication",
        path: "/material/addinformation",
        icon: <VaccinesIcon />,
        permissions: ["create-medications"],
      },
      {
        name: "addchanges",
        path: "/material/changes",
        icon: <ChangeCircleIcon />,
        permissions: ["edit-medications"],
      },
      {
        name: "pres_insert",
        path: "/material/pres_insert",
        icon: <DescriptionIcon />,
        permissions: ["create-prescriptions"],
      },
      {
        name: "sales_insert",
        path: "/material/sales_insert",
        icon: <PointOfSaleIcon />,
        permissions: ["create-sales"],
      },
      {
        name: "parchases",
        path: "/material/parchases",
        icon: <ShoppingCartIcon />,
        permissions: ["create-purchases"],
      },
      {
        name: "addcatagory",
        path: "/material/addcatagory",
        icon: <CategoryIcon />,
        permissions: ["create-categories"],
      },
      {
        name: "logs",
        path: "/material/logs",
        icon: <DescriptionIcon />,
        permissions: ["view-logs"],
      },
      {
        name: "PaymentForm",
        path: "/material/payment",
        icon: <PaymentIcon />,
        permissions: ["create-payments"],
      },
    ],
  },

  // ✅ اصلاح شده: اضافه کردن roles و permissions
  { 
    label: "کاربران", 
    type: "label", 
    roles: ["Admin"],  // ✅ فقط ادمین می‌تواند ببیند
    permissions: ["view-users", "view-roles"]  // ✅ پرمیشن‌های مورد نیاز
  },
{ 
  label: "کاربران", 
  type: "label", 
  roles: ["Admin"],  // ✅ فقط ادمین
},

{
  name: "مدیریت کاربران",
  icon: <PeopleIcon />,
  roles: ["Admin"],  // ✅ فقط ادمین
  permissions: ["view-users"],  // ✅ با پرمیشن view-users
  children: [
    {
      name: "مدیریت کاربران",
      path: "/material/users",
      icon: <PeopleIcon />,
      permissions: ["view-users"],  // ✅ نیاز به view-users
    },
    {
      name: "مدیریت رول‌ها و پرمیشن‌ها",
      path: "/material/roles-permissions",
      icon: <PeopleIcon />,
      permissions: ["view-roles"],  // ✅ نیاز به view-roles
    },
  ],
},
   

  { label: "نمایش اطلاعات", type: "label" },

  {
    name: "گزارش ها",
    icon: <AssessmentIcon />,
    permissions: ["view-hospital-reports", "view-account-summary", "view-stock", "view-sales", "view-profit-loss"],
    children: [
      {
        name: "hospital_Report",
        path: "/material/hospital-report",
        icon: <LocalHospitalIcon />,
        permissions: ["view-hospital-reports"],
      },
      {
        name: "AccountSummaryPage",
        path: "/material/AcountSummaryPage",
        icon: <AccountBalanceIcon />,
        permissions: ["view-account-summary"],
      },
      {
        name: "MedicationStockTable",
        path: "/material/MedicationStockTable",
        icon: <BarChartIcon />,
        permissions: ["view-stock"],
      },
      {
        name: "SalesTable",
        path: "/material/SalesTable",
        icon: <BarChartIcon />,
        permissions: ["view-sales"],
      },
      {
        name: "گزارش روزانه (جدول)",
        path: "/material/dashboard-daily-table",
        icon: <BarChartIcon />,
        permissions: ["view-dashboard"],
      },
      {
        name: "گزارشات مالی",
        icon: "bar_chart",
        permissions: ["view-profit-loss"],
        children: [
          {
            name: "فواید (جدول)",
            path: "/reports/benefits",
            permissions: ["view-benefits"],
          },
        ]
      }
    ],
  },

  {
    name: "charts",
    icon: <BarChartIcon />,
    permissions: ["view-dashboard", "view-sales", "view-benefits", "view-stock"],
    children: [
      {
        name: "فواید (گراف)",
        path: "/reports/benefits-chart",
        icon: <BarChartIcon />,
        permissions: ["view-benefits"],
      },
      {
        name: "گزارش روزانه (چارت)",
        path: "/material/dashboard-daily-chart",
        icon: <BarChartIcon />,
        permissions: ["view-dashboard"],
      },
      {
        name: "SalesChart",
        path: "/material/SalesChart",
        icon: <BarChartIcon />,
        permissions: ["view-sales"],
      },
      {
        name: "MedicationStockChart",
        path: "/material/MedicationStockChart",
        icon: <BarChartIcon />,
        permissions: ["view-stock"],
      },
    ],
  },

  {
    name: "documentation",
    icon: <MenuBookIcon />,
    permissions: ["view-documentation"],
  },
];

export default navigations;