import { CssBaseline } from "@mui/material";
import AnimatedBackground from "../../../frontend/../frontend/src/components/AnimatedBackground";
import routes from "./routes";
import { MatxTheme } from "./components";
import SettingsProvider from "./contexts/SettingsContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import NavigationHub from "../modules/NavigationHub";

import {
  HashRouter,
  useRoutes,
  Navigate
} from "react-router-dom";

import "react-toastify/dist/ReactToastify.css";
import "./i18n";

// ================= کامپوننت DebugAuth =================
const DebugAuth = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      background: '#333', 
      color: 'white', 
      padding: '8px 12px', 
      fontSize: 11, 
      zIndex: 9999,
      borderRadius: '8px 0 0 0',
      fontFamily: 'monospace',
      opacity: 0.8,
      pointerEvents: 'none'
    }}>
      <div>👤 {user.name}</div>
      <div>🎭 Roles: {user.role_names?.join(', ') || 'none'}</div>
      <div>🔑 Permissions: {user.all_permissions?.length || 0}</div>
      <div>👑 Is Admin: {user.isAdmin ? '✅ Yes' : '❌ No'}</div>
    </div>
  );
};
// ====================================================

/* 🔹 Protected Route */
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/session/signin" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === "hospital_head") {
      return <Navigate to="/material/hospital-report" replace />;
    }
    return <Navigate to="/dashboard/default" replace />;
  }

  return children;
}

/* 🔹 Router */
function AppRouter() {
  const element = useRoutes([
    ...routes,

    {
      path: "/navigation-hub",
      element: <NavigationHub />,
    }
  ]);

  return element;
}

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const savedLanguage = localStorage.getItem("i18nextLng") || "fa";
    i18n.changeLanguage(savedLanguage);

    document.documentElement.setAttribute(
      "dir",
      savedLanguage === "fa" ? "rtl" : "ltr"
    );
    document.documentElement.setAttribute("lang", savedLanguage);
  }, [i18n]);

  return (
    <HashRouter>
      <SettingsProvider>
        <AuthProvider>
          <MatxTheme>
            <CssBaseline />

            <div style={{ direction: i18n.language === "fa" ? "rtl" : "ltr" }}>
              <AnimatedBackground>
                <AppRouter />
                <DebugAuth />
              </AnimatedBackground>
            </div>

          </MatxTheme>
        </AuthProvider>
      </SettingsProvider>
    </HashRouter>
  );
}