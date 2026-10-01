// app/routes/materialRoutes.js
import { lazy } from "react";
import Loadable from "app/components/Loadable";
import AdminRoute from "./AdminRoute";
import RoleRoute from "./RoleRoute";
import { ROLES } from "app/navigations";

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
const AppExpansionPanel = Loadable(
  lazy(() => import("./expansion-panel/AppExpansionPanel"))
);

// ===== Forms & Data Entry =====
const AppAddcatagory = Loadable(lazy(() => import("./addcatagory/addcatagory")));
const AppAddmedication = Loadable(
  lazy(() => import("./addinformation/addmedication"))
);
const AppUsersPage = Loadable(lazy(() => import("./users/UsersPage")));
const AppRolesPermissionsPage = Loadable(
  lazy(() => import("./users/RolesPermissionsPage"))
);
const AppAddchanges = Loadable(lazy(() => import("./changes/addchanges")));
const AppAddprescriptions = Loadable(
  lazy(() => import("./pres_insert/pres_insert"))
);
const AppAddsales = Loadable(lazy(() => import("./sales_insert/sales_insert")));
const AppAddparchases = Loadable(lazy(() => import("./parchases/parchases")));
const AppRegistrationForm = Loadable(
  lazy(() => import("./registrations/RegistrationForm"))
);

// ===== Reports =====
const AppHospital_report = Loadable(
  lazy(() => import("./reports/Hospital_Report"))
);
const AppAccountSummaryPage = Loadable(
  lazy(() => import("./reports/AccountSummaryPage.jsx"))
);
const AppAddlogs = Loadable(lazy(() => import("./logs/logs")));
const AppMedicationStockTable = Loadable(
  lazy(() => import("./reports/medication-stock/MedicationStockTable"))
);
const AppMedicationStockChart = Loadable(
  lazy(() => import("./reports/medication-stock/MedicationStockChart"))
);
const AppSalesTable = Loadable(
  lazy(() => import("./reports/sales/SalesTable"))
);
const AppSalesChart = Loadable(
  lazy(() => import("./reports/sales/SalesChart"))
);
const AppDashboardDailyChart = Loadable(
  lazy(() => import("./reports/dashboard/DashboardDailyChart"))
);
const AppDashboardDailyTable = Loadable(
  lazy(() => import("./reports/dashboard/DashboardDailyTable"))
);
const ExaminationPage = Loadable(
  lazy(() => import("./examinations/ExaminationPage"))
);

// ===== Stock =====
const AppStock = Loadable(lazy(() => import("./stock/Stock")));

// ===== Laboratory =====
const AppLabHematology = Loadable(
  lazy(() => import("./laboratory/LabHematology"))
);
const AppLabResults = Loadable(lazy(() => import("./laboratory/LabResults")));

// ===== Radiology =====
const AppRadiology = Loadable(lazy(() => import("./radiology/Radiology")));

// ===== Accounts =====
const AppAccounts = Loadable(lazy(() => import("./accounts/accounts")));

// ===== Pharmacy =====
const AppPharmacy = Loadable(lazy(() => import("./pharmacy/pharmacy")));
const AppPharmacySales = Loadable(
  lazy(() => import("./pharmacy/sales/PharmacySales"))
);
const AppPharmacyPrescriptions = Loadable(
  lazy(() => import("./pharmacy/prescriptions/PharmacyPrescriptions"))
);
const AppPharmacyInventory = Loadable(
  lazy(() => import("./pharmacy/inventory/inventory"))
);
const AppPharmacyMedications = Loadable(
  lazy(() => import("./pharmacy/medications/PharmacyMedications"))
);
const AppPharmacyHistory = Loadable(
  lazy(() => import("./pharmacy/history/PharmacyHistory"))
);
const AppPharmacyExecutions = Loadable(
  lazy(() => import("./pharmacy/executions/PharmacyPrescriptionExecutions"))
);

// ===== Departments =====
const AppDepartmentsPage = Loadable(
  lazy(() => import("./departments/DepartmentsPage"))
);

// ============================================================
// ===== Routes =====
// ============================================================
const materialRoutes = [
  // ===== Material UI Samples (فقط Admin) =====
  {
    path: "/material/form",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppForm />
      </RoleRoute>
    ),
  },
  {
    path: "/material/icons",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppIcon />
      </RoleRoute>
    ),
  },
  {
    path: "/material/progress",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppProgress />
      </RoleRoute>
    ),
  },
  {
    path: "/material/menu",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppMenu />
      </RoleRoute>
    ),
  },
  {
    path: "/material/checkbox",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppCheckbox />
      </RoleRoute>
    ),
  },
  {
    path: "/material/switch",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppSwitch />
      </RoleRoute>
    ),
  },
  {
    path: "/material/radio",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppRadio />
      </RoleRoute>
    ),
  },
  {
    path: "/material/slider",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppSlider />
      </RoleRoute>
    ),
  },
  {
    path: "/material/expansion-panel",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppExpansionPanel />
      </RoleRoute>
    ),
  },
  {
    path: "/material/dialog",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppDialog />
      </RoleRoute>
    ),
  },
  {
    path: "/material/snackbar",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppSnackbar />
      </RoleRoute>
    ),
  },

  // ===== Examinations (Admin + Doctor) =====
  {
    path: "/material/examinations",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
        <ExaminationPage />
      </RoleRoute>
    ),
  },

  // ===== Forms & Data Entry =====
  {
    path: "/material/addinformation",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppAddmedication />
      </RoleRoute>
    ),
  },
  {
    path: "/material/changes",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAddchanges />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pres_insert",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
        <AppAddprescriptions />
      </RoleRoute>
    ),
  },
  {
    path: "/material/sales_insert",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAddsales />
      </RoleRoute>
    ),
  },
  {
    path: "/material/parchases",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAddparchases />
      </RoleRoute>
    ),
  },
  {
    path: "/material/addcatagory",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppAddcatagory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/registrations",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RECEPTIONIST]}>
        <AppRegistrationForm />
      </RoleRoute>
    ),
  },
  {
    path: "/material/logs",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppAddlogs />
      </RoleRoute>
    ),
  },

  // ===== Reports =====
  {
    path: "/material/hospital-report",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
        <AppHospital_report />
      </RoleRoute>
    ),
  },
  {
    path: "/material/AcountSummaryPage",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAccountSummaryPage />
      </RoleRoute>
    ),
  },
  {
    path: "/material/MedicationStockTable",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppMedicationStockTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/MedicationStockChart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppMedicationStockChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/SalesTable",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalesTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/SalesChart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalesChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/dashboard-daily-chart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/dashboard-daily-table",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyTable />
      </RoleRoute>
    ),
  },

  // ===== Stock (Admin + Pharmacist) =====
  {
    path: "/material/stock",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppStock />
      </RoleRoute>
    ),
  },

  // ===== Accounts (Admin + Accountant) =====
  {
    path: "/material/accounts",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAccounts />
      </RoleRoute>
    ),
  },

  // ===== Laboratory (Admin + LabTechnician) =====
  {
    path: "/material/lab-hematology",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.LAB_TECHNICIAN]}>
        <AppLabHematology />
      </RoleRoute>
    ),
  },
  {
    path: "/material/lab-results",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.LAB_TECHNICIAN]}>
        <AppLabResults />
      </RoleRoute>
    ),
  },

  // ===== Radiology (Admin + Radiologist) =====
  {
    path: "/material/radiology",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.RADIOLOGIST]}>
        <AppRadiology />
      </RoleRoute>
    ),
  },

  // ===== Pharmacy (Admin + Pharmacist) =====
  {
    path: "/material/pharmacy",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacy />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/sales",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacySales />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/prescriptions",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacyPrescriptions />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/inventory",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacyInventory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/medications",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacyMedications />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/history",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacyHistory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/executions",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST]}>
        <AppPharmacyExecutions />
      </RoleRoute>
    ),
  },

  // ===== Departments (فقط Admin) =====
  {
    path: "/material/departments",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppDepartmentsPage />
      </RoleRoute>
    ),
  },

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