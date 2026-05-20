import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/dashboard/default" replace />;
  }

  // اصلاح بررسی دسترسی
  const hasAccess = user.role_name === 'Admin' || 
                    user.role_name === 'super_admin' ||
                    user.roles?.some(role => ['Admin', 'super_admin'].includes(role.name));

  if (!hasAccess) {
    console.log('Access denied for user:', user.name, 'Role:', user.role_name);
    return <Navigate to="/dashboard/default" replace />;
  }

  return children ? children : <Outlet />;
}