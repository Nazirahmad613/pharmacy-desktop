import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/dashboard/default" replace />;
  }

  // ✅ بررسی کامل دسترسی ادمین - پشتیبانی از همه ساختارها
  const hasAccess =
    user.isAdmin === true ||                                   // از AuthContext (محاسبه‌شده)
    user.hasRole?.("admin") ||                                 // helper
    user.hasRole?.("Admin") ||
    user.hasRole?.("super_admin") ||
    user.role === "admin" ||                                   // ستون role در users
    user.role_name === "admin" ||                              // از مدل User
    user.role_name === "Admin" ||
    user.role_name === "super_admin" ||
    (Array.isArray(user.role_names) && (
      user.role_names.includes("admin") ||
      user.role_names.includes("Admin") ||
      user.role_names.includes("super_admin")
    )) ||
    (Array.isArray(user.roles) && user.roles.some(role => {
      const name = typeof role === "string" ? role : role.name;
      return name === "admin" || name === "Admin" || name === "super_admin";
    }));

  if (!hasAccess) {
    console.warn("AdminRoute: Access denied for user:", user.name);
    return <Navigate to="/dashboard/default" replace />;
  }

  return children ? children : <Outlet />;
}