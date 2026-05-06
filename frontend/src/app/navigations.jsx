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
    roles: ["user", "admin", "super_admin"],
    children: [
      {
        name: "RegistationForm",
        path: "/material/registrations",
        icon: <AppRegistrationIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "addmedication",
        path: "/material/addinformation",
        icon: <VaccinesIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "addchanges",
        path: "/material/changes",
        icon: <ChangeCircleIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "pres_insert",
        path: "/material/pres_insert",
        icon: <DescriptionIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "sales_insert",
        path: "/material/sales_insert",
        icon: <PointOfSaleIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "parchases",
        path: "/material/parchases",
        icon: <ShoppingCartIcon />,
        roles: ["admin", "user", "super_admin"],
      },
      {
        name: "addcatagory",
        path: "/material/addcatagory",
        icon: <CategoryIcon />,
        roles: ["admin", "user", "super_admin"],
      },
   {
  name: "logs",
  path: "/material/logs",
  icon: <DescriptionIcon />,   // ✅ یا هر آیکون دیگر
  roles: ["admin", "user", "super_admin"],
},
      {
        name: "PaymentForm",
        path: "/material/payment",
        icon: <PaymentIcon />,
        roles: ["admin", "user", "super_admin"],
      },
     
    ],
  },

  { label: "کاربران", type: "label", roles: ["admin", "super_admin"] },

  {
    name: "مدیریت کاربران",
    icon: <PeopleIcon />,
    roles: ["admin", "super_admin"],
    children: [
      {
        name: "مدیریت کاربران",
        path: "/material/users",
        icon: <PeopleIcon />,
        roles: ["admin", "super_admin"],
      },
      {
        name: "مدیریت رول‌ها و پرمیشن‌ها",
        path: "/material/roles-permissions",
        icon: <PeopleIcon />,
        roles: ["admin", "super_admin"], // فقط ادمین و سوپر ادمین
      },
    ],
  },

  { label: "نمایش اطلاعات", type: "label" },

  {
    name: "گزارش ها",
    icon: <AssessmentIcon />,
    roles: ["user", "admin", "super_admin", "hospital_head"],
    children: [
      {
        name: "hospital_Report",
        path: "/material/hospital-report",
        icon: <LocalHospitalIcon />,
        roles: ["user", "admin", "super_admin"],
      },
      {
        name: "AccountSummaryPage",
        path: "/material/AcountSummaryPage",
        icon: <AccountBalanceIcon />,
        roles: ["user", "admin", "super_admin"],
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
  icon: "bar_chart",
  children: [
    {
      name: "فواید (جدول)",
      path: "/reports/benefits"
    },
   
  ]
}



    ],
  },

  {
    name: "charts",
    icon: <BarChartIcon />,
    roles: ["admin", "user", "super_admin"],
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

  {
    name: "documentation",
    icon: <MenuBookIcon />,
    roles: ["admin", "user", "super_admin"],
  },
];

export default navigations;