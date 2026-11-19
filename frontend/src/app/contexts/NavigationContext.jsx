// src/app/contexts/NavigationContext.jsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import navigationsData, { getLogicalParentPath } from "app/navigations";

const NavigationContext = createContext(null);

const normalizePath = (p) => {
  if (!p) return "";
  return p.replace(/\/+$/, "") || "/";
};

// ============================================================
// پیدا کردن همه گروه‌های والد برای یک path (برای باز کردن سایدبار و Breadcrumb)
// ============================================================
export const findParentChain = (items, targetPath, chain = []) => {
  const cleanTarget = normalizePath(targetPath);
  for (const item of items) {
    if (item.path && normalizePath(item.path) === cleanTarget) {
      return chain;
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      const found = findParentChain(item.children, cleanTarget, [
        ...chain,
        item,
      ]);
      if (found) return found;
    }
  }
  return null;
};

export function NavigationProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // زنجیره گروه‌های انتخاب‌شده (هم برای وسط صفحه، هم برای همگام‌سازی سایدبار)
  const [groupStack, setGroupStack] = useState([]);

  // همگام‌سازی خودکار با تغییر URL
  useEffect(() => {
    const cleanPath = normalizePath(location.pathname);
    let chain = findParentChain(navigationsData, cleanPath);

    // اگر مسیر دقیق در منو نبود (مثل صفحات جزئیات/ویرایش)، والد منطقی را بررسی کن
    if (!chain) {
      const parentPath = getLogicalParentPath(cleanPath);
      if (parentPath) {
        chain = findParentChain(navigationsData, parentPath);
      }
    }

    if (chain) {
      setGroupStack(chain);
    } else if (cleanPath === "/dashboard/default" || cleanPath === "/navigation-hub") {
      setGroupStack([]);
    }
  }, [location.pathname]);

  // ورود به یک زیرگروه (با کلیک روی کارت در وسط صفحه)
  const pushGroup = useCallback((group) => {
    if (!group) return;
    setGroupStack((prev) => {
      const last = prev[prev.length - 1];
      if (last && (last.path || last.name) === (group.path || group.name)) {
        return prev;
      }
      return [...prev, group];
    });
  }, []);

  // بازگشت یک مرحله
  const popGroup = useCallback(() => {
    setGroupStack((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy.pop();
      return copy;
    });
  }, []);

  // بازگشت به ابتدا
  const resetToTop = useCallback(() => {
    setGroupStack([]);
    navigate("/navigation-hub");
  }, [navigate]);

  const breadcrumb = useMemo(() => groupStack, [groupStack]);

  const selectedGroup = useMemo(
    () => (groupStack.length > 0 ? groupStack[groupStack.length - 1] : null),
    [groupStack]
  );

  const value = {
    groupStack,
    breadcrumb,
    selectedGroup,
    pushGroup,
    popGroup,
    resetToTop,
    setGroupStack,
    navigationsData,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}