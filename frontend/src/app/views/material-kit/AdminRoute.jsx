import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/dashboard/default" replace />;
  }

  if (!user.hasPermission?.("view-users") && !user.hasRole?.("admin")) {
    return <Navigate to="/dashboard/default" replace />;
  }

  return children ? children : <Outlet />;
}