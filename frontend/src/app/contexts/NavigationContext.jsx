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
import navigationsData from "app/navigations";

const NavigationContext = createContext(null);

// ============================================================
// پیدا کردن زنجیره‌ی گروه‌ها برای یک path مشخص
// خروجی: آرایه‌ای از گروه‌ها از ریشه تا گروهی که path در آن است
// ============================================================
export const findChainByPath = (items, targetPath, chain = []) => {
  for (const item of items) {
    // اگر خود آیتم path دارد و منطبق است
    if (item.path === targetPath) {
      return chain;
    }
    // اگر فرزند دارد، عمیق‌تر جستجو کن
    if (Array.isArray(item.children) && item.children.length > 0) {
      const found = findChainByPath(item.children, targetPath, [
        ...chain,
        item,
      ]);
      if (found) return found;
    }
  }
  return null;
};

// ============================================================
// پیدا کردن همه گروه‌های والد برای یک path (برای باز کردن سایدبار)
// ============================================================
export const findParentChain = (items, targetPath, chain = []) => {
  for (const item of items) {
    if (item.path === targetPath) return chain;
    if (Array.isArray(item.children) && item.children.length > 0) {
      const found = findParentChain(item.children, targetPath, [
        ...chain,
        item,
      ]);
      if (found) return found;
    }
  }
  return null;
};

// ============================================================
// Provider
// ============================================================
export function NavigationProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // گروه‌های انتخاب‌شده (زنجیره از ریشه تا گروه فعلی) — هم برای وسط صفحه، هم برای سایدبار
  const [groupStack, setGroupStack] = useState([]);

  // ============================================================
  // هر وقت مسیر عوض شد، گروه‌ها را بر اساس path هم‌گام کن
  // ============================================================
  useEffect(() => {
    const chain = findParentChain(navigationsData, location.pathname);
    if (chain) {
      setGroupStack(chain);
    } else {
      // اگر path در منو نیست (مثلاً /dashboard/default) → ریست کن
      setGroupStack([]);
    }
  }, [location.pathname]);

  // ============================================================
  // ورود به یک زیرگروه (با کلیک روی کارت در وسط صفحه)
  // ============================================================
  const pushGroup = useCallback((group) => {
    if (!group) return;
    setGroupStack((prev) => {
      // جلوگیری از تکراری
      if (prev.length > 0 && prev[prev.length - 1] === group) return prev;
      return [...prev, group];
    });
  }, []);

  // ============================================================
  // بازگشت یک مرحله
  // ============================================================
  const popGroup = useCallback(() => {
    setGroupStack((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy.pop();
      return copy;
    });
  }, []);

  // ============================================================
  // بازگشت به ابتدا
  // ============================================================
  const resetToTop = useCallback(() => {
    setGroupStack([]);
    navigate("/navigation-hub");
  }, [navigate]);

  // ============================================================
  // Breadcrumb
  // ============================================================
  const breadcrumb = useMemo(() => groupStack, [groupStack]);

  // گروه فعلی = آخرین عضو پشته
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