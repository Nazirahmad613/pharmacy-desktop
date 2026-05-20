import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";

const AuthGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log("AUTH GUARD:", { user, loading });

  // جلوگیری از loading بی‌نهایت
  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "20px"
      }}>
        Loading...
      </div>
    );
  }

  // اگر لاگین نبود
  if (!user) {
    return (
      <Navigate
        to="/session/signin"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default AuthGuard;