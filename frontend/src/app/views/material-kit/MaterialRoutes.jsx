// src/app/routes/materialRoutes.js
import { lazy } from "react";
import Loadable from "app/components/Loadable";
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

// ===== ✅ Payroll =====
const AppPayrollDashboard = Loadable(
  lazy(() => import("./payroll/PayrollDashboard"))
);
const AppEmployeeSalaries = Loadable(
  lazy(() => import("./payroll/EmployeeSalaries"))
);
const AppSalaryPayment = Loadable(
  lazy(() => import("./payroll/SalaryPayment"))
);
const AppSalaryAdvances = Loadable(
  lazy(() => import("./payroll/SalaryAdvances"))
);
const AppPayrollReports = Loadable(
  lazy(() => import("./payroll/PayrollReports"))
);
const AppSalarySettings = Loadable(
  lazy(() => import("./payroll/SalarySettings"))
);

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

const ADMINS = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// ============================================================
// ===== Routes =====
// ============================================================
const materialRoutes = [
  // ===== Material UI Samples (فقط Admin) =====
  {
    path: "/material/form",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppForm />
      </RoleRoute>
    ),
  },
  {
    path: "/material/icons",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppIcon />
      </RoleRoute>
    ),
  },
  {
    path: "/material/progress",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppProgress />
      </RoleRoute>
    ),
  },
  {
    path: "/material/menu",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppMenu />
      </RoleRoute>
    ),
  },
  {
    path: "/material/checkbox",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppCheckbox />
      </RoleRoute>
    ),
  },
  {
    path: "/material/switch",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppSwitch />
      </RoleRoute>
    ),
  },
  {
    path: "/material/radio",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppRadio />
      </RoleRoute>
    ),
  },
  {
    path: "/material/slider",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppSlider />
      </RoleRoute>
    ),
  },
  {
    path: "/material/expansion-panel",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppExpansionPanel />
      </RoleRoute>
    ),
  },
  {
    path: "/material/dialog",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppDialog />
      </RoleRoute>
    ),
  },
  {
    path: "/material/snackbar",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppSnackbar />
      </RoleRoute>
    ),
  },

  // ===== Examinations (Admin + Doctor) =====
  {
    path: "/material/examinations",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR]}>
        <ExaminationPage />
      </RoleRoute>
    ),
  },

  // ===== Forms & Data Entry =====
  {
    path: "/material/addinformation",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppAddmedication />
      </RoleRoute>
    ),
  },
  {
    path: "/material/changes",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppAddchanges />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pres_insert",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR]}>
        <AppAddprescriptions />
      </RoleRoute>
    ),
  },
  {
    path: "/material/sales_insert",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppAddsales />
      </RoleRoute>
    ),
  },
  {
    path: "/material/parchases",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppAddparchases />
      </RoleRoute>
    ),
  },
  {
    path: "/material/addcatagory",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppAddcatagory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/registrations",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.RECEPTIONIST]}>
        <AppRegistrationForm />
      </RoleRoute>
    ),
  },
  {
    path: "/material/logs",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppAddlogs />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Payroll Routes =====
  // ============================================================
  {
    path: "/material/payroll",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppPayrollDashboard />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/employees",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppEmployeeSalaries />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/payment",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppSalaryPayment />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/advances",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppSalaryAdvances />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/reports",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppPayrollReports />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/settings",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppSalarySettings />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Pharmacy Routes =====
  // ============================================================
  {
    path: "/material/pharmacy",
    element: (
      <RoleRoute
        allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
        <AppPharmacy />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/sales",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST]}>
        <AppPharmacySales />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/prescriptions",
    element: (
      <RoleRoute
        allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.DOCTOR]}
      >
        <AppPharmacyPrescriptions />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/inventory",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST]}>
        <AppPharmacyInventory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/medications",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST]}>
        <AppPharmacyMedications />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/history",
    element: (
      <RoleRoute
        allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
        <AppPharmacyHistory />
      </RoleRoute>
    ),
  },
  {
    path: "/material/pharmacy/executions",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST]}>
        <AppPharmacyExecutions />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Stock Routes =====
  // ============================================================
  {
    path: "/material/stock",
    element: (
      <RoleRoute
        allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
        <AppStock />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Laboratory Routes =====
  // ============================================================
  {
    path: "/material/laboratory/hematology",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR, ROLES.LAB_TECH]}>
        <AppLabHematology />
      </RoleRoute>
    ),
  },
  {
    path: "/material/laboratory/results",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR, ROLES.LAB_TECH]}>
        <AppLabResults />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Radiology Routes =====
  // ============================================================
  {
    path: "/material/radiology",
    element: (
      <RoleRoute
        allowedRoles={[...ADMINS, ROLES.DOCTOR, ROLES.RADIOLOGIST]}
      >
        <AppRadiology />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Accounts Routes =====
  // ============================================================
  {
    path: "/material/accounts",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppAccounts />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/account-summary",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppAccountSummaryPage />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Reports Routes =====
  // ============================================================
  {
    path: "/material/reports/hospital",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR]}>
        <AppHospital_report />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/medication-stock/table",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
        <AppMedicationStockTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/medication-stock/chart",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
        <AppMedicationStockChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/sales/table",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppSalesTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/sales/chart",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.ACCOUNTANT]}>
        <AppSalesChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/dashboard/daily-chart",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/dashboard/daily-table",
    element: (
      <RoleRoute allowedRoles={[...ADMINS, ROLES.DOCTOR, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyTable />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Users & Permissions =====
  // ============================================================
  {
    path: "/material/users",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppUsersPage />
      </RoleRoute>
    ),
  },
  {
    path: "/material/users/roles-permissions",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppRolesPermissionsPage />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Departments Routes =====
  // ============================================================
  {
    path: "/material/departments",
    element: (
      <RoleRoute allowedRoles={ADMINS}>
        <AppDepartmentsPage />
      </RoleRoute>
    ),
  },
];

export default materialRoutes;