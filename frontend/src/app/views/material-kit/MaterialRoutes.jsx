import { lazy } from "react";
import Loadable from "app/components/Loadable";
import AdminRoute from "./AdminRoute";

// ===== Material UI Samples =====
const AppForm = Loadable(lazy(() => import("./forms/AppForm")));
const AppMenu = Loadable(lazy(() => import("./menu/AppMenu")));
const AppIcon = Loadable(lazy(() => import("./icons/AppIcon")));
const AppProgress = Loadable(lazy(() => import("./AppProgress")));
const AppRadio = Loadable(lazy(() => import("./radio/AppRadio")));
const AppSwitch = Loadable(lazy(() => import("./switch/AppSwitch")));
const AppSlider = Loadable(lazy(() => import("./slider/AppSlider")));
const AppDialog = Loadable(lazy(() => import("./dialog/AppDialog")));
const AppCheckbox = Loadable(lazy(() => import("./checkbox/AppCheckbox")));
const AppSnackbar = Loadable(lazy(() => import("./snackbar/AppSnackbar")));
const AppExpansionPanel = Loadable(lazy(() => import("./expansion-panel/AppExpansionPanel")));

// ===== Forms & Data Entry =====
const AppAddcatagory = Loadable(lazy(() => import("./addcatagory/addcatagory")));
const AppAddmedication = Loadable(lazy(() => import("./addinformation/addmedication")));
const AppUsersPage = Loadable(lazy(() => import("./users/UsersPage")));
const AppRolesPermissionsPage = Loadable(lazy(() => import("./users/RolesPermissionsPage")));
const AppAddchanges = Loadable(lazy(() => import("./changes/addchanges")));
const AppAddprescriptions = Loadable(lazy(() => import("./pres_insert/pres_insert")));
const AppAddsales = Loadable(lazy(() => import("./sales_insert/sales_insert")));
const AppAddparchases = Loadable(lazy(() => import("./parchases/parchases")));
const AppRegistrationForm = Loadable(lazy(() => import("./registrations/RegistrationForm")));

// ===== Reports =====
const AppHospital_report = Loadable(lazy(() => import("./reports/Hospital_Report")));
const AppAccountSummaryPage = Loadable(lazy(() => import("./reports/AccountSummaryPage.jsx")));
const AppAddlogs = Loadable(lazy(() => import("./logs/logs")));
const AppMedicationStockTable = Loadable(lazy(() => import("./reports/medication-stock/MedicationStockTable")));
const AppMedicationStockChart = Loadable(lazy(() => import("./reports/medication-stock/MedicationStockChart")));
const AppSalesTable = Loadable(lazy(() => import("./reports/sales/SalesTable")));
const AppSalesChart = Loadable(lazy(() => import("./reports/sales/SalesChart")));
const AppDashboardDailyChart = Loadable(lazy(() => import("./reports/dashboard/DashboardDailyChart")));
const AppDashboardDailyTable = Loadable(lazy(() => import("./reports/dashboard/DashboardDailyTable")));
const ExaminationPage = Loadable(lazy(() => import("./examinations/ExaminationPage")));

// ===== Stock =====
const AppStock = Loadable(lazy(() => import("./stock/Stock")));

// ============================================================
// ===== ✅ صفحات لابراتوار =====
// ============================================================
const AppLabHematology = Loadable(lazy(() => import("./laboratory/LabHematology")));
const AppLabUrine = Loadable(lazy(() => import("./laboratory/LabUrine")));
const AppLabBiochemistry = Loadable(lazy(() => import("./laboratory/LabBiochemistry")));
const AppLabBloodSugar = Loadable(lazy(() => import("./laboratory/LabBloodSugar")));
const AppLabHIV = Loadable(lazy(() => import("./laboratory/LabHIV")));
const AppLabHepatitisB = Loadable(lazy(() => import("./laboratory/LabHepatitisB")));
const AppLabHepatitisC = Loadable(lazy(() => import("./laboratory/LabHepatitisC")));
const AppLabMalaria = Loadable(lazy(() => import("./laboratory/LabMalaria")));
const AppLabBloodGroup = Loadable(lazy(() => import("./laboratory/LabBloodGroup")));
const AppLabResults = Loadable(lazy(() => import("./laboratory/LabResults")));

// ===== Routes =====
const materialRoutes = [
  // ===== Material UI Samples =====
  { path: "/material/form", element: <AppForm /> },
  { path: "/material/icons", element: <AppIcon /> },
  { path: "/material/progress", element: <AppProgress /> },
  { path: "/material/menu", element: <AppMenu /> },
  { path: "/material/checkbox", element: <AppCheckbox /> },
  { path: "/material/switch", element: <AppSwitch /> },
  { path: "/material/radio", element: <AppRadio /> },
  { path: "/material/slider", element: <AppSlider /> },
  { path: "/material/expansion-panel", element: <AppExpansionPanel /> },
  { path: "/material/dialog", element: <AppDialog /> },
  { path: "/material/snackbar", element: <AppSnackbar /> },
  { path: "/material/examinations", element: <ExaminationPage /> },

  // ===== Forms & Data Entry =====
  { path: "/material/addinformation", element: <AppAddmedication /> },
  { path: "/material/changes", element: <AppAddchanges /> },
  { path: "/material/pres_insert", element: <AppAddprescriptions /> },
  { path: "/material/sales_insert", element: <AppAddsales /> },
  { path: "/material/parchases", element: <AppAddparchases /> },
  { path: "/material/addcatagory", element: <AppAddcatagory /> },
  { path: "/material/registrations", element: <AppRegistrationForm /> },
  { path: "/material/logs", element: <AppAddlogs /> },

  // ===== Reports =====
  { path: "/material/hospital-report", element: <AppHospital_report /> },
  { path: "/material/AcountSummaryPage", element: <AppAccountSummaryPage /> },
  { path: "/material/MedicationStockTable", element: <AppMedicationStockTable /> },
  { path: "/material/MedicationStockChart", element: <AppMedicationStockChart /> },
  { path: "/material/SalesTable", element: <AppSalesTable /> },
  { path: "/material/SalesChart", element: <AppSalesChart /> },
  { path: "/material/dashboard-daily-chart", element: <AppDashboardDailyChart /> },
  { path: "/material/dashboard-daily-table", element: <AppDashboardDailyTable /> },

  // ===== Stock =====
  { path: "/material/stock", element: <AppStock /> },

  // ============================================================
  // ===== ✅ صفحات لابراتوار =====
  // ============================================================
  { path: "/material/lab-hematology", element: <AppLabHematology /> },
  { path: "/material/lab-urine", element: <AppLabUrine /> },
  { path: "/material/lab-biochemistry", element: <AppLabBiochemistry /> },
  { path: "/material/lab-blood-sugar", element: <AppLabBloodSugar /> },
  { path: "/material/lab-hiv", element: <AppLabHIV /> },
  { path: "/material/lab-hepatitis-b", element: <AppLabHepatitisB /> },
  { path: "/material/lab-hepatitis-c", element: <AppLabHepatitisC /> },
  { path: "/material/lab-malaria", element: <AppLabMalaria /> },
  { path: "/material/lab-blood-group", element: <AppLabBloodGroup /> },
  { path: "/material/lab-results", element: <AppLabResults /> },

  // ===== Users Management (Admin Only) =====
  {
    path: "/material/users",
    element: (
      <AdminRoute>
        <AppUsersPage />
      </AdminRoute>
    ),
  },
  {
    path: "/material/roles-permissions",
    element: (
      <AdminRoute>
        <AppRolesPermissionsPage />
      </AdminRoute>
    ),
  },
];

export default materialRoutes;