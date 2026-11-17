// src/app/hooks/useBackNavigation.js
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLogicalParentPath } from "app/navigations";

export default function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const parentPath = useMemo(
    () => getLogicalParentPath(location.pathname),
    [location.pathname]
  );

  const canGoBack = parentPath !== null;

  const goBack = useCallback(() => {
    if (parentPath) {
      navigate(parentPath);
    } else {
      navigate("/dashboard/default");
    }
  }, [navigate, parentPath]);

  return { canGoBack, goBack, parentPath };
}