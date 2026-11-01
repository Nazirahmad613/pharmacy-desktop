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

// ===== ✅ Payroll (مدیریت معاشات) =====
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

// ============================================================
// ===== ✅ Emergency (مریضان اضطراری) — مطابق ساختار واقعی =====
// فولدر: views/material-kit/emergency_patients/
//   ├── page.jsx                  → Dashboard
//   ├── admission/page.jsx
//   ├── patients/page.jsx         (⚠️ باید ساخته شود)
//   ├── triage/page.jsx
//   ├── treatment/page.jsx
//   ├── EmergencyStatsCards.jsx   (کامپوننت، نه Route)
//   ├── PatientTable.jsx          (کامپوننت، نه Route)
//   └── TriagePriorityChip.jsx    (کامپوننت، نه Route)
// ============================================================
const AppEmergencyDashboard = Loadable(
  lazy(() => import("./emergency_patients/page"))
);
const AppEmergencyAdmission = Loadable(
  lazy(() => import("./emergency_patients/admission/page"))
);
const AppEmergencyPatients = Loadable(
  lazy(() => import("./emergency_patients/patients/page"))
);
const AppEmergencyTriage = Loadable(
  lazy(() => import("./emergency_patients/triage/page"))
);
const AppEmergencyTreatment = Loadable(
  lazy(() => import("./emergency_patients/treatment/page"))
);
// ⚠️ AppEmergencyHistory حذف شد — فولدر history/page.jsx وجود ندارد.

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

  // ============================================================
  // ===== ✅ Emergency Routes (مریضان اضطراری) =====
  // ============================================================
  {
    path: "/material/emergency",
    element: (
      <RoleRoute
        allowedRoles={[
          ROLES.ADMIN,
          ROLES.RECEPTIONIST,
          ROLES.DOCTOR,
          ROLES.EMERGENCY_NURSE,
        ]}
      >
        <AppEmergencyDashboard />
      </RoleRoute>
    ),
  },
  {
    path: "/material/emergency/admission",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.EMERGENCY_NURSE]}
      >
        <AppEmergencyAdmission />
      </RoleRoute>
    ),
  },
  {
    path: "/material/emergency/patients",
    element: (
      <RoleRoute
        allowedRoles={[
          ROLES.ADMIN,
          ROLES.RECEPTIONIST,
          ROLES.DOCTOR,
          ROLES.EMERGENCY_NURSE,
        ]}
      >
        <AppEmergencyPatients />
      </RoleRoute>
    ),
  },
  {
    path: "/material/emergency/triage",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.EMERGENCY_NURSE]}
      >
        <AppEmergencyTriage />
      </RoleRoute>
    ),
  },
  {
    path: "/material/emergency/treatment",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
        <AppEmergencyTreatment />
      </RoleRoute>
    ),
  },
  // ⚠️ Route /material/emergency/history حذف شد چون فایل مربوطه وجود ندارد.

  // ============================================================
  // ===== ✅ Payroll Routes (مدیریت معاشات) =====
  // ============================================================
  {
    path: "/material/payroll",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppPayrollDashboard />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/employees",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppEmployeeSalaries />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/payment",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalaryPayment />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/advances",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalaryAdvances />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/reports",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppPayrollReports />
      </RoleRoute>
    ),
  },
  {
    path: "/material/payroll/settings",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppSalarySettings />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Pharmacy Routes (فارمسی) =====
  // ============================================================
  {
    path: "/material/pharmacy",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
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
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR]}
      >
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
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
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

  // ============================================================
  // ===== ✅ Stock Routes (گدام) =====
  // ============================================================
  {
    path: "/material/stock",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}
      >
        <AppStock />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Laboratory Routes (لابراتوار) =====
  // ============================================================
  {
    path: "/material/laboratory/hematology",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECH]}>
        <AppLabHematology />
      </RoleRoute>
    ),
  },
  {
    path: "/material/laboratory/results",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECH]}
      >
        <AppLabResults />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Radiology Routes (رادیولوژی) =====
  // ============================================================
  {
    path: "/material/radiology",
    element: (
      <RoleRoute
        allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RADIOLOGIST]}
      >
        <AppRadiology />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Accounts Routes (حسابات) =====
  // ============================================================
  {
    path: "/material/accounts",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAccounts />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/account-summary",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppAccountSummaryPage />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Reports Routes (راپورها) =====
  // ============================================================
  {
    path: "/material/reports/hospital",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]}>
        <AppHospital_report />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/medication-stock/table",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
        <AppMedicationStockTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/medication-stock/chart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PHARMACIST, ROLES.ACCOUNTANT]}>
        <AppMedicationStockChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/sales/table",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalesTable />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/sales/chart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
        <AppSalesChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/dashboard/daily-chart",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyChart />
      </RoleRoute>
    ),
  },
  {
    path: "/material/reports/dashboard/daily-table",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.ACCOUNTANT]}>
        <AppDashboardDailyTable />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Users & Permissions (کاربران و صلاحیت‌ها) =====
  // ============================================================
  {
    path: "/material/users",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppUsersPage />
      </RoleRoute>
    ),
  },
  {
    path: "/material/users/roles-permissions",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppRolesPermissionsPage />
      </RoleRoute>
    ),
  },

  // ============================================================
  // ===== ✅ Departments Routes (بخش‌ها) =====
  // ============================================================
  {
    path: "/material/departments",
    element: (
      <RoleRoute allowedRoles={[ROLES.ADMIN]}>
        <AppDepartmentsPage />
      </RoleRoute>
    ),
  },
];

export default materialRoutes;