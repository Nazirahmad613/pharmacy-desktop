// app/routes/RoleRoute.jsx
import { Navigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import { useAuth } from "app/contexts/AuthContext";

// ============================================================
// نرمال‌سازی نام رول
// ============================================================
const normalizeRole = (role) => {
  if (!role) return "";
  if (typeof role === "object") {
    role = role.name || role.role || "";
  }
  return String(role).trim().toLowerCase();
};

/**
 * محافظت از مسیرها بر اساس رول یا Permission
 */
export default function RoleRoute({
  allowedRoles = [],
  allowedPermissions = [],
  children,
}) {
  const { user, loading } = useAuth();

  // ===== Loading =====
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">در حال بارگذاری...</Alert>
      </Box>
    );
  }

  // ===== لاگین نکرده =====
  if (!user) {
    return <Navigate to="/session/signin" replace />;
  }

  // ============================================================
  // ✅ استخراج رول‌های کاربر (از هر ساختاری)
  // ============================================================
  const userRoles = new Set();

  if (Array.isArray(user.role_names)) {
    user.role_names.forEach((r) => {
      const n = normalizeRole(r);
      if (n) userRoles.add(n);
    });
  }

  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      const n = normalizeRole(r);
      if (n) userRoles.add(n);
    });
  }

  if (user.role) {
    const n = normalizeRole(user.role);
    if (n) userRoles.add(n);
  }

  const userRolesArray = Array.from(userRoles);

  // ============================================================
  // ✅ Admin/SuperAdmin همیشه دسترسی دارد
  // ============================================================
  if (
    user.isAdmin === true ||
    user.isSuperAdmin === true ||
    userRolesArray.includes("admin") ||
    userRolesArray.includes("super_admin")
  ) {
    return children;
  }

  // ============================================================
  // ✅ چک رول
  // ============================================================
  let roleOk = true;
  if (allowedRoles.length > 0) {
    const allowedNorm = allowedRoles.map(normalizeRole);
    roleOk = allowedNorm.some((r) => userRolesArray.includes(r));
  }

  // ============================================================
  // ✅ چک Permission
  // ============================================================
  let permOk = true;
  if (allowedPermissions.length > 0) {
    const userPerms = Array.isArray(user.all_permissions)
      ? user.all_permissions.map(normalizeRole)
      : [];

    const allowedPermsNorm = allowedPermissions.map(normalizeRole);
    permOk = allowedPermsNorm.some((p) => userPerms.includes(p));
  }

  const hasAccess = roleOk && permOk;

  if (!hasAccess) {
    // ===== لاگ دیباگ (در کنسول مرورگر) =====
    console.warn("=== RoleRoute ACCESS DENIED ===");
    console.warn("user:", user);
    console.warn("userRolesArray:", userRolesArray);
    console.warn("allowedRoles:", allowedRoles);
    console.warn("allowedRoles normalized:", allowedRoles.map(normalizeRole));
    console.warn("=================================");

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          شما به این بخش دسترسی ندارید.
          <br />
          نقش‌های شما: {userRolesArray.join(", ") || "نامشخص"}
          <br />
          نقش‌های مجاز: {allowedRoles.join(", ") || "نامشخص"}
        </Alert>
      </Box>
    );
  }

  return children;
}