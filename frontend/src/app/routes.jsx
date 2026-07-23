// routes.js
import { lazy } from "react";
import { Navigate } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";
import { authRoles } from "./auth/authRoles";

import Loadable from "./components/Loadable";
import MatxLayout from "./components/MatxLayout/MatxLayout";
import sessionRoutes from "./views/sessions/session-routes";
import materialRoutes from "app/views/material-kit/MaterialRoutes";
import { useAuth } from "./contexts/AuthContext"; // اضافه کنید

// Pages
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

// Settings page
const Settings = Loadable(
  lazy(() => import("./views/settings/settings"))
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
    import(
      "app/views/material-kit/reports/dashboard/DashboardDailyTable"
    )
  )
);

const BenefitsReport = Loadable(
  lazy(() =>
    import("./views/material-kit/reports/BenefitsReport")
  )
);

const BenefitsChart = Loadable(
  lazy(() =>
    import("./views/material-kit/reports/BenefitsChart")
  )
);

const SalesTable = Loadable(
  lazy(() =>
    import("app/views/material-kit/reports/sales/SalesTable")
  )
);

// AdminGuard کامپوننت داخل همین فایل
const AdminGuardComponent = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('AdminGuard in routes - Full user:', JSON.stringify(user, null, 2));
  
  if (loading) {
    return <div>Loading admin check...</div>;
  }

  if (!user) {
    console.log('No user in AdminGuard');
    return <Navigate to="/session/signin" replace />;
  }

  // بررسی ساده - هر کاربری که لاگین کرده اجازه دارد (برای تست)
  // بعد از تست، شرط زیر را فعال کنید
  const hasAdminAccess = true; // موقتاً همه را قبول کن
  
  // شرط واقعی (بعد از تست، خط بالا را کامنت و این را فعال کنید)
  /*
  const hasAdminAccess = 
    user.roles?.some(role => 
      role.name === 'admin' || 
      role.name === 'super_admin'
    ) ||
    user.role_name === 'admin' ||
    user.role_name === 'super_admin';
  */
  
  if (!hasAdminAccess) {
    console.log('Access denied');
    return <Navigate to="/dashboard/default" replace />;
  }

  return children;
};

const routes = [
  {
    path: "/",
    element: <Navigate to="/dashboard/default" replace />,
  },

  {
    element: (
      <AuthGuard>
        <MatxLayout />
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

      // ✅ مسیر users با AdminGuard
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

      // Profile Routes
      {
        path: "profile",
        element: <UserProfile />,
      },

      {
        path: "user/profile",
        element: <UserProfile />,
      },

      {
        path: "user/user-profile",
        element: <UserProfile />,
      },

      // Settings Route
      {
        path: "settings",
        element: <Settings />,
      },

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

      {
        path: "reports/benefits",
        element: <BenefitsReport />,
      },

      {
        path: "reports/benefits-chart",
        element: <BenefitsChart />,
      },

      {
        path: "reports/benefits-Report",
        element: <BenefitsChart />,
      },

      {
        path: "reports/sales-table",
        element: <SalesTable />,
      },
    ],
  },

  ...sessionRoutes,
];

export default routes;