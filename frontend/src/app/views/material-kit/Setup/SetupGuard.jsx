import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "app/contexts/AuthContext";

export default function SetupGuard({ children }) {
  const { api, user, hospitalSettings, setHospitalSettings } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // تشخیص سوپر ادمین با هر دو فرمت (super-admin و super_admin)
  const isSuperAdmin =
    user?.role === "super-admin" ||
    user?.role === "super_admin" ||
    user?.role_name === "super-admin" ||
    user?.role_name === "super_admin" ||
    (Array.isArray(user?.roles) &&
      user.roles.some((r) => {
        const name = typeof r === "string" ? r : r.name;
        return name === "super-admin" || name === "super_admin";
      }));

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (hospitalSettings) {
        setIsConfigured(true);
        setChecking(false);
        return;
      }

      try {
        const res = await api.get("/hospital-settings/status");
        if (!mounted) return;

        if (res.data?.is_configured) {
          setHospitalSettings?.({
            hospital_name: res.data.setting?.hospital_name,
            enabled_modules: res.data.setting?.enabled_modules || [],
            logo_url: res.data.logo_url,
          });
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      } catch (err) {
        console.error("Setup status check failed:", err);
        setIsConfigured(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    if (user) check();
    else setChecking(false);

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (checking) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // اگر تنظیمات انجام نشده و کاربر سوپر ادمین است -> برو به /setup
  if (!isConfigured && isSuperAdmin && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  // اگر تنظیمات قبلاً انجام شده -> برو به داشبورد اصلی پروژه
  if (isConfigured && location.pathname === "/setup") {
    return <Navigate to="/dashboard/default" replace />;
  }

  return children;
}