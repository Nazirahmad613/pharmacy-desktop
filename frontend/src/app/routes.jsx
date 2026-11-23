// src/routes.js
import { lazy } from "react";
import { Navigate } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";
import { authRoles } from "./auth/authRoles";

import Loadable from "./components/Loadable";
import MatxLayout from "./components/MatxLayout/MatxLayout";
import sessionRoutes from "./views/sessions/session-routes";
import materialRoutes from "app/views/material-kit/MaterialRoutes";
import { useAuth } from "./contexts/AuthContext";

// =====================================================
// SETUP GUARD
// =====================================================

import SetupGuard from "../../src/app/views/material-kit/Setup/SetupGuard";

// =====================================================
// SETUP WIZARD
// =====================================================

const SetupWizard = Loadable(
  lazy(() => import("../app/views/material-kit/Setup/SetupWizard"))
);

// =====================================================
// PAGES
// =====================================================

const AppEchart = Loadable(
  lazy(() => import("app/views/charts/echarts/AppEchart"))
);

const Analytics = Loadable(
  lazy(() => import("app/views/dashboard/Analytics"))
);

const UserProfile = Loadable(
  lazy(() => import("app/views/material-kit/users/UserProfile"))
);

const UsersPage = Loadable(
  lazy(() => import("app/views/material-kit/users/UsersPage"))
);

const Settings = Loadable(
  lazy(() => import("./views/settings/settings"))
);

const LogsPage = Loadable(
  lazy(() => import("../app/views/material-kit/logs/logs"))
);

// Stock reports
const MedicationStockTable = Loadable(
  lazy(() =>
    import(
      "app/views/material-kit/reports/medication-stock/MedicationStockTable"
    )
  )
);

const MedicationStockChart = Loadable(
  lazy(() =>
    import(
      "app/views/material-kit/reports/medication-stock/MedicationStockChart"
    )
  )
);

const DashboardDailyTable = Loadable(
  lazy(() =>
    import("app/views/material-kit/reports/dashboard/DashboardDailyTable")
  )
);

const BenefitsReport = Loadable(
  lazy(() => import("./views/material-kit/reports/BenefitsReport"))
);

const BenefitsChart = Loadable(
  lazy(() => import("./views/material-kit/reports/BenefitsChart"))
);

const SalesTable = Loadable(
  lazy(() => import("app/views/material-kit/reports/sales/SalesTable"))
);

// =====================================================
// ADMIN GUARD
// =====================================================

const AdminGuardComponent = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading admin check...</div>;
  }

  if (!user) {
    return <Navigate to="/session/signin" replace />;
  }

  const hasAdminAccess =
    user.isAdmin === true ||
    user.hasRole?.("admin") ||
    user.hasRole?.("Admin") ||
    user.hasRole?.("super_admin") ||
    user.role === "admin" ||
    user.role_name === "admin" ||
    (Array.isArray(user.role_names) &&
      (user.role_names.includes("admin") ||
        user.role_names.includes("Admin") ||
        user.role_names.includes("super_admin"))) ||
    (Array.isArray(user.roles) &&
      user.roles.some((role) => {
        const name = typeof role === "string" ? role : role.name;
        return (
          name === "admin" ||
          name === "Admin" ||
          name === "super_admin"
        );
      }));

  if (!hasAdminAccess) {
    console.warn("AdminGuard: Access denied for user", user);
    return <Navigate to="/dashboard/default" replace />;
  }

  return children;
};

// =====================================================
// ROUTES
// =====================================================

const routes = [
  // ===================================================
  // صفحه setup — مستقل و بدون Layout اصلی
  // ===================================================
  {
    path: "/setup",
    element: (
      <AuthGuard>
        <SetupGuard>
          <SetupWizard />
        </SetupGuard>
      </AuthGuard>
    ),
  },

  // ===================================================
  // ریشه — هدایت به داشبورد
  // ===================================================
  {
    path: "/",
    element: <Navigate to="/dashboard/default" replace />,
  },

  // ===================================================
  // Layout اصلی — تمام صفحات داخل این گروه
  // ===================================================
  {
    element: (
      <AuthGuard>
        <SetupGuard>
          <MatxLayout />
        </SetupGuard>
      </AuthGuard>
    ),
    children: [
      ...materialRoutes,

      {
        path: "dashboard/default",
        element: <Analytics />,
        auth: authRoles.admin,
      },

      {
        path: "charts/echarts",
        element: <AppEchart />,
        auth: authRoles.editor,
      },

      // ✅ Users
      {
        path: "users",
        element: (
          <AdminGuardComponent>
            <UsersPage />
          </AdminGuardComponent>
        ),
      },

      {
        path: "material/users",
        element: (
          <AdminGuardComponent>
            <UsersPage />
          </AdminGuardComponent>
        ),
      },

      // Profile
      { path: "profile", element: <UserProfile /> },
      { path: "user/profile", element: <UserProfile /> },
      { path: "user/user-profile", element: <UserProfile /> },

      // Settings
      { path: "settings", element: <Settings /> },

      // Logs
      { path: "logs", element: <LogsPage /> },

      // Reports
      {
        path: "reports/MedicationStockTable",
        element: <MedicationStockTable />,
      },
      {
        path: "reports/medication-stock",
        element: <MedicationStockTable />,
      },
      {
        path: "reports/medication-stock-chart",
        element: <MedicationStockChart />,
      },
      {
        path: "reports/DashboardDailyTable",
        element: <DashboardDailyTable />,
      },
      { path: "reports/benefits", element: <BenefitsReport /> },
      { path: "reports/benefits-chart", element: <BenefitsChart /> },
      { path: "reports/benefits-Report", element: <BenefitsChart /> },
      { path: "reports/sales-table", element: <SalesTable /> },
    ],
  },

  // ===================================================
  // Session routes
  // ===================================================
  ...sessionRoutes,
];

export default routes;