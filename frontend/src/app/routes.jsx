 import { lazy } from "react";
import { Navigate } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";
import { authRoles } from "./auth/authRoles";

import Loadable from "./components/Loadable";
import MatxLayout from "./components/MatxLayout/MatxLayout";
import sessionRoutes from "./views/sessions/session-routes";
import materialRoutes from "app/views/material-kit/MaterialRoutes";
import UsersPage from "../app/views/material-kit/users/UsersPage";

// Pages
const AppEchart = Loadable(lazy(() => import("app/views/charts/echarts/AppEchart")));
const Analytics = Loadable(lazy(() => import("app/views/dashboard/Analytics")));
const UserProfile = Loadable(lazy(() => import("../app/views/material-kit/users/UserProfile")));

const MedicationStockTable = Loadable(
  lazy(() => import("app/views/material-kit/reports/medication-stock/MedicationStockTable"))
);

const MedicationStockChart = Loadable(
  lazy(() => import("../app/views/material-kit/reports/medication-stock/MedicationStockChart"))
);

const DashboardDailyTable = Loadable(
  lazy(() => import("app/views/material-kit/reports/dashboard/DashboardDailyTable"))
);

const BenefitsReport = Loadable(lazy(() => import("./views/material-kit/reports/BenefitsReport")));
const BenefitsChart = Loadable(lazy(() => import("./views/material-kit/reports/BenefitsChart")));
const SalesTable = Loadable(lazy(() => import("../app/views/material-kit/reports/sales/SalesTable")));

const routes = [
  // Redirect root
  { path: "/", element: <Navigate to="/dashboard/default" replace /> },

  {
    element: (
      <AuthGuard>
        <MatxLayout />
      </AuthGuard>
    ),
    children: [
      ...materialRoutes,

      { path: "dashboard/default", element: <Analytics />, auth: authRoles.admin },
      { path: "charts/echarts", element: <AppEchart />, auth: authRoles.editor },
      { path: "users", element: <UsersPage />, auth: authRoles.admin },

      // Profile routes
      { path: "profile", element: <UserProfile />, auth: authRoles.admin },
      { path: "user/profile", element: <UserProfile />, auth: authRoles.admin },
      { path: "user/user-profile", element: <UserProfile />, auth: authRoles.admin },

      // Stock reports
      { path: "reports/MedicationStockTable", element: <MedicationStockTable />, auth: authRoles.admin },
      { path: "reports/medication-stock", element: <MedicationStockTable />, auth: authRoles.admin },
      { path: "reports/medication-stock-chart", element: <MedicationStockChart />, auth: authRoles.admin },

      // Dashboard reports
      { path: "reports/DashboardDailyTable", element: <DashboardDailyTable />, auth: authRoles.admin },

      // Benefits
      { path: "reports/benefits", element: <BenefitsReport />, auth: authRoles.admin },
      { path: "reports/benefits-chart", element: <BenefitsChart />, auth: authRoles.admin },
      { path: "reports/benefits-Report", element: <BenefitsChart />, auth: authRoles.admin },

      // Sales
      { path: "reports/sales-table", element: <SalesTable />, auth: authRoles.admin },
    ],
  },

  ...sessionRoutes,
];

export default routes;