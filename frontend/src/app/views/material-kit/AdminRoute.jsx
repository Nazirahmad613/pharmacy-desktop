import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "app/contexts/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useAuth();

  // ✅ اگر نقش کاربر admin نیست
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard/default" replace />; // می‌ریزه روی داشبورد یا صفحه خطا
  }

  // ✅ اگر admin بود
  return children ? children : <Outlet />;
}