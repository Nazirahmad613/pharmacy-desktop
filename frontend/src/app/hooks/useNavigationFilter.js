// hooks/useNavigationFilter.js
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

export const useNavigationFilter = () => {
  const { user } = useAuth();

  const hasAccess = (item) => {
    if (!user) return false;

    // بررسی نقش‌ها
    if (item.roles && item.roles.length > 0) {
      const userRoles = user.role_names || [];
      const hasRole = item.roles.some(role => userRoles.includes(role));
      if (!hasRole) return false;
    }

    // بررسی پرمیشن‌ها
    if (item.permissions && item.permissions.length > 0) {
      const userPermissions = user.all_permissions || [];
      const hasPermission = item.permissions.some(perm => userPermissions.includes(perm));
      if (!hasPermission) return false;
    }

    return true;
  };

  const filterNavigations = (navItems) => {
    return navItems
      .map((item) => {
        // Clone item
        const filteredItem = { ...item };
        
        // فیلتر کردن children
        if (filteredItem.children && filteredItem.children.length > 0) {
          filteredItem.children = filterNavigations(filteredItem.children);
          // اگر بعد از فیلتر کردن، children خالی شد، این آیتم را حذف کن
          if (filteredItem.children.length === 0) {
            return null;
          }
        }
        
        // بررسی دسترسی خود آیتم
        if (!hasAccess(filteredItem)) {
          return null;
        }
        
        return filteredItem;
      })
      .filter(Boolean); // حذف کردن آیتم‌های null
  };

  return { filterNavigations, hasAccess, user };
};