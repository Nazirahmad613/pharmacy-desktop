// app/components/SetupGuard.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "app/contexts/AuthContext";

export default function SetupGuard({ children }) {
  const { api, user, hospitalSettings, setHospitalSettings } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

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

  if (!isConfigured && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (isConfigured && location.pathname === "/setup") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}