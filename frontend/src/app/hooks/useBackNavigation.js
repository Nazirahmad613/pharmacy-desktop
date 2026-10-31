// src/app/hooks/useBackNavigation.js
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLogicalParentPath } from "app/navigations";

/**
 * هوک بازگشت استاندارد (Logical Parent):
 * - دکمه بازگشت همیشه به «والد منطقی» صفحه فعلی برمی‌گردد (طبق ساختار منو).
 * - در صفحات ریشه (dashboard, /material/payroll, /material/pharmacy, ...) دکمه مخفی است.
 * - در زیرصفحه‌ها، والد منطقی از PARENT_OVERRIDES یا ساختار children منو استخراج می‌شود.
 *
 * مثال:
 *  /material/payroll/payment → /material/payroll
 *  /material/payroll         → null (مخفی)
 *  /material/lab-results     → /material/lab-hematology
 *  /material/users           → null (مخفی)
 */
export default function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const parentPath = useMemo(
    () => getLogicalParentPath(location.pathname),
    [location.pathname]
  );

  const canGoBack = parentPath !== null && parentPath !== undefined;

  const goBack = useCallback(() => {
    if (parentPath) {
      navigate(parentPath);
    }
  }, [navigate, parentPath]);

  return { canGoBack, goBack };
}