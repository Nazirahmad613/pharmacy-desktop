// src/app/components/Sidenav.jsx
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "@mui/material/styles/styled";
import { keyframes } from "@mui/system";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";

import { useNavigation } from "app/contexts/NavigationContext";
import { useAuth } from "app/contexts/AuthContext";
import useBackNavigation from "../hooks/useBackNavigation";
import defaultNavigations, { getLogicalParentPath } from "app/navigations";

// انیمیشن تاب خوردن ملایم فانوس هنگام حرکت
const swingAnimation = keyframes`
  0% { transform: rotate(0deg); }
  25% { transform: rotate(6deg); }
  50% { transform: rotate(-5deg); }
  75% { transform: rotate(2.5deg); }
  100% { transform: rotate(0deg); }
`;

// انیمیشن لرزش شعله داخل فانوس
const flickerAnimation = keyframes`
  0%, 100% { opacity: 0.95; transform: scale(1); }
  50% { opacity: 0.78; transform: scale(0.94); }
`;

const LanternViewport = styled(Box)(() => ({
  position: "relative",
  height: "calc(100vh - 80px)",
  overflow: "hidden",
  userSelect: "none",
  touchAction: "none",
  paddingLeft: "12px",
  paddingRight: "12px",
}));

// کامپوننت SVG فانوس کلاسیک آویزان
function HangingLanternSVG({ isSwinging, isDragging }) {
  return (
    <Box
      sx={{
        transformOrigin: "top center",
        animation: isSwinging ? `${swingAnimation} 0.85s ease-out` : "none",
        transform: isDragging ? "scale(1.08)" : "scale(1)",
        transition: "transform 0.15s ease",
        filter: isDragging
          ? "drop-shadow(0 10px 28px rgba(100, 116, 139, 0.95))"
          : "drop-shadow(0 8px 22px rgba(71, 85, 105, 0.65))",
      }}
    >
      <svg width="36" height="58" viewBox="0 0 36 58" fill="none">
        <circle cx="18" cy="4" r="3" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M11 12L18 7L25 12H11Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
        <rect x="9" y="12" width="18" height="3" rx="1.5" fill="#334155" />
        <rect
          x="11"
          y="15"
          width="14"
          height="24"
          rx="2"
          fill="url(#lanternGlow)"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <line x1="15" y1="15" x2="15" y2="39" stroke="#1e293b" strokeWidth="1.2" />
        <line x1="21" y1="15" x2="21" y2="39" stroke="#1e293b" strokeWidth="1.2" />
        <ellipse
          cx="18"
          cy="28"
          rx="3.2"
          ry="5.5"
          fill="#ffffff"
          style={{ animation: `${flickerAnimation} 1.8s infinite ease-in-out` }}
        />
        <rect x="9" y="39" width="18" height="3" rx="1.5" fill="#334155" />
        <path d="M12 42L18 47L24 42H12Z" fill="#1e293b" />
        <defs>
          <radialGradient id="lanternGlow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#94a3b8" />
            <stop offset="85%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
        </defs>
      </svg>
    </Box>
  );
}

const normalizeRole = (role) => {
  if (!role) return "";
  if (typeof role === "object") role = role.name || role.role || "";
  return String(role).trim().toLowerCase();
};

const normalizePath = (p) => {
  if (!p) return "";
  return p.replace(/\/+$/, "") || "/";
};

// ساخت کلید یکتا و پایدار برای هر آیتم (چه گروه و چه صفحه)
const getItemUniqueKey = (item) => {
  if (!item) return "";
  return item.path ? normalizePath(item.path) : `GROUP:${item.name}`;
};

/**
 * پیدا کردن تمام کلیدهای والد (گروه‌ها) که یک مسیر در زیرمجموعه آن‌ها قرار دارد
 */
function findAncestorKeys(items, targetPath, parents = []) {
  const cleanTarget = normalizePath(targetPath);
  for (const item of items) {
    const key = getItemUniqueKey(item);
    if (item.path && normalizePath(item.path) === cleanTarget) {
      return parents;
    }
    if (Array.isArray(item.children) && item.children.length > 0) {
      const found = findAncestorKeys(item.children, cleanTarget, [...parents, key]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * فیلتر کردن آیتم‌های منو بر اساس نقش کاربر
 */
function filterNavByRoles(items, userRolesSet, isAdminOrSuper) {
  if (isAdminOrSuper) return items;
  return items
    .map((item) => {
      if (item.roles && Array.isArray(item.roles) && item.roles.length > 0) {
        const allowed = item.roles.some((r) => userRolesSet.has(normalizeRole(r)));
        if (!allowed) return null;
      }
      if (Array.isArray(item.children)) {
        const filteredChildren = filterNavByRoles(item.children, userRolesSet, isAdminOrSuper);
        if (filteredChildren.length === 0 && !item.path) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean);
}

/**
 * محاسبه دقیق مرکز عمودی یک المان نسبت به کانتینر محتوای سایدبار (بدون خطای Collapse)
 */
function getRelativeNodeCenter(contentEl, nodeEl) {
  if (!contentEl || !nodeEl) return 0;
  const contentRect = contentEl.getBoundingClientRect();
  const nodeRect = nodeEl.getBoundingClientRect();
  return nodeRect.top - contentRect.top + nodeRect.height / 2;
}

function NavItem({
  item,
  level = 0,
  openMap,
  setOpenMap,
  onLeafClick,
  onGroupToggle,
  currentPath,
  litKey,
}) {
  const { t } = useTranslation();
  const key = getItemUniqueKey(item);
  const isOpen = !!openMap[key];
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActive = item.path && normalizePath(currentPath) === normalizePath(item.path);
  const isLit = litKey === key || isActive;

  const handleClick = (e) => {
    const clickedEl = e.currentTarget;
    if (hasChildren) {
      const nextState = !isOpen;
      setOpenMap((prev) => ({ ...prev, [key]: nextState }));
      if (onGroupToggle) {
        onGroupToggle(clickedEl, key, nextState);
      }
    } else if (item.path) {
      onLeafClick(item, clickedEl);
    }
  };

  const textAlpha = isLit ? 1 : 0.35;
  const navPathAttr = item.path ? normalizePath(item.path) : `GROUP:${item.name}`;

  if (item.type === "label" || item.label) {
    return (
      <Typography
        variant="caption"
        sx={{
          display: "block",
          px: 2,
          pt: 2.2,
          pb: 0.6,
          pl: "44px",
          color: "rgba(255,255,255,0.28)",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: 1.2,
          transition: "color 0.2s ease",
        }}
      >
        {(t(item.label || item.name || "") || "").toUpperCase()}
      </Typography>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        data-nav-key={key}
        data-nav-path={navPathAttr}
        data-nav-has-children={hasChildren ? "1" : "0"}
        sx={{
          borderRadius: "10px",
          my: 0.35,
          pl: `${42 + level * 14}px`,
          pr: 1.5,
          py: 0.95,
          position: "relative",
          color: `rgba(255, 255, 255, ${textAlpha})`,
          textShadow: isLit ? "0 0 14px rgba(255,255,255,0.85)" : "none",
          background: isActive
            ? "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 100%)"
            : isLit
            ? "linear-gradient(90deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 100%)"
            : "transparent",
          boxShadow: isActive
            ? "inset 3px 0 0 #ffffff"
            : isLit
            ? "inset 2px 0 0 rgba(255,255,255,0.7)"
            : "none",
          transition:
            "color 0.2s ease, text-shadow 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            textShadow: "0 0 12px rgba(255,255,255,0.85)",
          },
        }}
      >
        {item.icon && (
          <ListItemIcon
            sx={{
              color: `rgba(255, 255, 255, ${textAlpha})`,
              minWidth: 32,
              filter: isLit
                ? "drop-shadow(0 0 8px rgba(200, 220, 255, 0.9))"
                : "none",
              transition: "color 0.2s ease, filter 0.2s ease",
              "& .MuiSvgIcon-root": { fontSize: 20 },
            }}
          >
            {item.icon}
          </ListItemIcon>
        )}

        <ListItemText
          primary={t(item.name)}
          primaryTypographyProps={{
            fontSize: level === 0 ? "0.92rem" : "0.84rem",
            fontWeight: isLit ? 700 : 400,
            color: "#ffffff",
            noWrap: true,
          }}
        />

        {isActive && (
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: "#ffffff",
              boxShadow: "0 0 12px 2px rgba(255, 255, 255, 0.95)",
              ml: 1,
            }}
          />
        )}

        {hasChildren && (
          <Box
            sx={{
              ml: 0.5,
              display: "flex",
              color: "#ffffff",
              opacity: textAlpha,
              transition: "opacity 0.2s ease",
            }}
          >
            {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={isOpen} timeout={200} unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child, idx) => (
              <NavItem
                key={getItemUniqueKey(child) || idx}
                item={child}
                level={level + 1}
                openMap={openMap}
                setOpenMap={setOpenMap}
                onLeafClick={onLeafClick}
                onGroupToggle={onGroupToggle}
                currentPath={currentPath}
                litKey={litKey}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

/**
 * پیدا کردن المان DOM متناظر با مسیر یا کلید فعلی
 */
function resolveSyncTarget(container, rawPathOrKey) {
  if (!container || !rawPathOrKey) return { targetNode: null, targetKey: null };

  const queryByAttr = (attr, val) => {
    try {
      return container.querySelector(`[${attr}="${CSS.escape(val)}"]`);
    } catch {
      return null;
    }
  };

  // اگر کلید مستقیم گروه باشد (مثلاً GROUP:مدیریت مالی)
  if (rawPathOrKey.startsWith("GROUP:")) {
    const byKey = queryByAttr("data-nav-key", rawPathOrKey);
    if (byKey) {
      return { targetNode: byKey, targetKey: rawPathOrKey };
    }
  }

  const path = normalizePath(rawPathOrKey);

  // ۱. تطبیق دقیق با مسیر فعلی
  const exact = queryByAttr("data-nav-path", path);
  if (exact) {
    return {
      targetNode: exact,
      targetKey: exact.getAttribute("data-nav-key"),
    };
  }

  // ۲. تطبیق با والد منطقی
  const parentPath = getLogicalParentPath(path);
  if (parentPath) {
    const byParent = queryByAttr("data-nav-path", normalizePath(parentPath));
    if (byParent) {
      return {
        targetNode: byParent,
        targetKey: byParent.getAttribute("data-nav-key"),
      };
    }
  }

  // ۳. تطبیق پیشوندی (طولانی‌ترین مسیر مشترک برای صفحات جزئیات)
  const allNodes = Array.from(container.querySelectorAll("[data-nav-path]"));
  let bestPrefix = null;
  let bestLen = -1;
  for (const el of allNodes) {
    const np = el.getAttribute("data-nav-path") || "";
    if (np.startsWith("GROUP:")) continue;
    if ((path === np || path.startsWith(np + "/")) && np.length > bestLen) {
      bestPrefix = el;
      bestLen = np.length;
    }
  }
  if (bestPrefix) {
    return {
      targetNode: bestPrefix,
      targetKey: bestPrefix.getAttribute("data-nav-key"),
    };
  }

  return { targetNode: null, targetKey: null };
}

export default function Sidenav({ children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { navigationsData, groupStack } = useNavigation();
  const { canGoBack, goBack } = useBackNavigation();

  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  const [openMap, setOpenMap] = useState({});
  const [lanternY, setLanternY] = useState(20);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isSwinging, setIsSwinging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [litKey, setLitKey] = useState(null);

  const swingTimeout = useRef(null);
  const dragStartY = useRef(0);
  const dragStartLanternY = useRef(20);

  // نگهداری آخرین هدف همگام‌سازی تا در صورت تغییر ارتفاع (باز شدن Collapse) فانوس دقیق روی آن بماند
  const activeSyncTargetRef = useRef(null);

  const triggerSwing = useCallback(() => {
    setIsSwinging(true);
    if (swingTimeout.current) clearTimeout(swingTimeout.current);
    swingTimeout.current = setTimeout(() => setIsSwinging(false), 850);
  }, []);

  // محاسبه آیتم نزدیک به نور فانوس هنگام درگ یا اسکرول دستی
  const highlightItemNearLantern = useCallback((currentLanternY, currentScroll) => {
    if (!contentRef.current) return;
    const beamCenterInContent = currentScroll + currentLanternY + 28;
    const nodes = contentRef.current.querySelectorAll("[data-nav-key]");
    let closestKey = null;
    let minDiff = Infinity;

    nodes.forEach((node) => {
      const nodeCenter = getRelativeNodeCenter(contentRef.current, node);
      const diff = Math.abs(nodeCenter - beamCenterInContent);
      if (diff < minDiff) {
        minDiff = diff;
        closestKey = node.getAttribute("data-nav-key");
      }
    });

    if (closestKey && minDiff < 45) {
      setLitKey(closestKey);
    }
  }, []);

  const updatePositionByLantern = useCallback(
    (rawLanternY) => {
      if (!viewportRef.current || !contentRef.current) return;

      const viewportHeight = viewportRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;

      const minY = 16;
      const maxY = Math.max(60, viewportHeight - 85);
      const clampedY = Math.min(maxY, Math.max(minY, rawLanternY));

      const progress = maxY > minY ? (clampedY - minY) / (maxY - minY) : 0;
      const maxScroll = Math.max(0, contentHeight - viewportHeight + 60);
      const syncedScroll = progress * maxScroll;

      setLanternY(clampedY);
      setScrollOffset(syncedScroll);
      highlightItemNearLantern(clampedY, syncedScroll);
    },
    [highlightItemNearLantern]
  );

  // حرکت دادن خودکار فانوس و اسکرول دقیق به سمت یک المان DOM مشخص
  const moveLanternToNode = useCallback(
    (targetNode, targetKey, withSwing = true) => {
      if (!viewportRef.current || !contentRef.current || !targetNode) return;

      const viewportHeight = viewportRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;
      const maxScroll = Math.max(0, contentHeight - viewportHeight + 60);

      const nodeCenter = getRelativeNodeCenter(contentRef.current, targetNode);

      const idealViewportY = Math.min(Math.max(nodeCenter, 80), viewportHeight * 0.45);
      const desiredScroll = Math.min(maxScroll, Math.max(0, nodeCenter - idealViewportY));

      const minY = 16;
      const maxY = Math.max(60, viewportHeight - 85);
      const exactLanternY = Math.min(maxY, Math.max(minY, nodeCenter - desiredScroll - 28));

      setScrollOffset(desiredScroll);
      setLanternY(exactLanternY);
      if (targetKey) setLitKey(targetKey);
      if (withSwing) triggerSwing();
    },
    [triggerSwing]
  );

  // درگ فانوس
  const handleLanternPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    activeSyncTargetRef.current = null;
    setIsDragging(true);
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartLanternY.current = lanternY;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartY.current;
      updatePositionByLantern(dragStartLanternY.current + deltaY);
      triggerSwing();
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging, updatePositionByLantern, triggerSwing]);

  const handleTrackClick = (e) => {
    if (!viewportRef.current) return;
    activeSyncTargetRef.current = null;
    const rect = viewportRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top - 28;
    updatePositionByLantern(clickY);
    triggerSwing();
  };

  const handleWheel = (e) => {
    activeSyncTargetRef.current = null;
    const step = e.deltaY * 0.25;
    updatePositionByLantern(lanternY + step);
    triggerSwing();
  };

  // کلیک روی گروه در سایدبار -> فانوس دقیقاً روی همان گروه قرار گیرد
  const handleGroupToggle = useCallback(
    (clickedEl, key) => {
      activeSyncTargetRef.current = key;
      setLitKey(key);
      if (clickedEl) {
        moveLanternToNode(clickedEl, key, true);
      }
    },
    [moveLanternToNode]
  );

  // استخراج رول‌های کاربر
  const userRoles = useMemo(() => {
    if (!user) return [];
    const set = new Set();
    (user.role_names || []).forEach((r) => {
      const n = normalizeRole(r);
      if (n) set.add(n);
    });
    (user.roles || []).forEach((r) => {
      const n = normalizeRole(r);
      if (n) set.add(n);
    });
    if (user.role) {
      const n = normalizeRole(user.role);
      if (n) set.add(n);
    }
    return Array.from(set);
  }, [user]);

  const filteredNavigations = useMemo(() => {
    const source =
      Array.isArray(navigationsData) && navigationsData.length > 0
        ? navigationsData
        : defaultNavigations;
    const roleSet = new Set(userRoles);
    const isAdminOrSuper =
      roleSet.has("admin") || roleSet.has("super_admin") || roleSet.size === 0;
    return filterNavByRoles(source, roleSet, isAdminOrSuper);
  }, [navigationsData, userRoles]);

  // ✅ ۱. کلیک روی آیتم صفحه در سایدبار
  const handleLeafClick = useCallback(
    (item, clickedEl) => {
      if (!item?.path) return;
      const key = getItemUniqueKey(item);
      activeSyncTargetRef.current = key;
      setLitKey(key);
      if (clickedEl) {
        moveLanternToNode(clickedEl, key, true);
      }
      if (normalizePath(location.pathname) !== normalizePath(item.path)) {
        navigate(item.path);
      }
    },
    [location.pathname, moveLanternToNode, navigate]
  );

  // ✅ ۲. همگام‌سازی یکپارچه با مسیر فعلی (صفحات فرعی) و گروه انتخاب‌شده در وسط صفحه
  useEffect(() => {
    const currentPath = normalizePath(location.pathname);

    // الف) اولویت اول: اگر مسیر فعلی خود یک صفحه مشخص در منو است (مثل /material/parchases)،
    // حتماً والدهای آن را باز کن و چراغ را به خود صفحه فرعی ببر (نه سرگروه!)
    const directMatch = resolveSyncTarget(contentRef.current, currentPath);
    const targetPathForAncestors =
      directMatch.targetNode?.getAttribute("data-nav-path") ||
      getLogicalParentPath(currentPath) ||
      currentPath;

    const pathAncestors =
      findAncestorKeys(filteredNavigations, currentPath) ||
      findAncestorKeys(filteredNavigations, targetPathForAncestors);

    // ب) گروه‌های بازشده از طریق کارت‌های وسط صفحه (NavigationHub)
    const stackKeys = Array.isArray(groupStack)
      ? groupStack.map((grp) => getItemUniqueKey(grp)).filter(Boolean)
      : [];

    const allKeysToOpen = new Set([...(pathAncestors || []), ...stackKeys]);

    if (allKeysToOpen.size > 0) {
      setOpenMap((prev) => {
        const next = { ...prev };
        let changed = false;
        allKeysToOpen.forEach((k) => {
          if (!next[k]) {
            next[k] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    // تعیین هدف نهایی برای چراغ فانوس:
    // اگر در یک صفحه فرعی/برگ هستیم (مثل /material/parchases)، هدف خود آن صفحه است.
    // فقط زمانی که در صفحه هاب (/navigation-hub یا /dashboard/default) هستیم و روی کارت گروه کلیک شده، هدف آخرین گروه است.
    const isHubOrDashboard =
      currentPath === "/navigation-hub" || currentPath === "/dashboard/default";

    const desiredTarget =
      isHubOrDashboard && stackKeys.length > 0
        ? stackKeys[stackKeys.length - 1]
        : currentPath;

    activeSyncTargetRef.current = desiredTarget;

    const syncLantern = (withSwing = true) => {
      const { targetNode, targetKey } = resolveSyncTarget(
        contentRef.current,
        desiredTarget
      );
      if (targetNode) {
        moveLanternToNode(targetNode, targetKey, withSwing);
      }
    };

    // اجرای فوری + اجرای مجدد بعد از باز شدن انیمیشن Collapse (230ms)
    syncLantern(true);
    const timer = setTimeout(() => syncLantern(false), 230);

    return () => clearTimeout(timer);
  }, [location.pathname, groupStack, filteredNavigations, moveLanternToNode]);

  // ✅ ۳. پایش تغییر ارتفاع محتوای سایدبار (هنگام باز/بسته شدن زیرمنوها) برای تثبیت دقیق جای چراغ
  useEffect(() => {
    if (!contentRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const target = activeSyncTargetRef.current;
      if (!target || isDragging) return;
      const { targetNode, targetKey } = resolveSyncTarget(contentRef.current, target);
      if (targetNode) {
        moveLanternToNode(targetNode, targetKey, false);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isDragging, moveLanternToNode]);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#0f294a",
        color: "#ffffff",
      }}
    >
      {/* دکمه بازگشت منطقی در بالای سایدبار */}
      {canGoBack && (
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <ListItemButton
            onClick={goBack}
            sx={{
              borderRadius: "8px",
              py: 0.75,
              bgcolor: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              "&:hover": { bgcolor: "rgba(255,255,255,0.16)" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "#ffffff" }}>
              <ArrowBackIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t("back") || "بازگشت"}
              primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }}
            />
          </ListItemButton>
          <Divider sx={{ mt: 1, borderColor: "rgba(255,255,255,0.12)" }} />
        </Box>
      )}

      {/* محوطه منو و فانوس */}
      <LanternViewport ref={viewportRef} onWheel={handleWheel}>
        {/* ریل عمودی حرکت فانوس */}
        <Box
          onClick={handleTrackClick}
          sx={{
            position: "absolute",
            left: 16,
            top: 12,
            bottom: 12,
            width: 16,
            cursor: "pointer",
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "2px",
              height: "100%",
              bgcolor: "rgba(255,255,255,0.14)",
              borderRadius: "2px",
            }}
          />
        </Box>

        {/* فانوس قابل درگ */}
        <Box
          onMouseDown={handleLanternPointerDown}
          onTouchStart={handleLanternPointerDown}
          sx={{
            position: "absolute",
            left: 6,
            top: `${lanternY}px`,
            zIndex: 20,
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "top 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <HangingLanternSVG isSwinging={isSwinging} isDragging={isDragging} />
        </Box>

        {/* محتوای اسکرول‌شونده منوها */}
        <Box
          ref={contentRef}
          sx={{
            transform: `translateY(-${scrollOffset}px)`,
            transition: isDragging
              ? "none"
              : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
            pb: 6,
          }}
        >
          {children}
          <List component="nav" disablePadding>
            {filteredNavigations.map((item, index) => (
              <NavItem
                key={getItemUniqueKey(item) || item.label || index}
                item={item}
                openMap={openMap}
                setOpenMap={setOpenMap}
                onLeafClick={handleLeafClick}
                onGroupToggle={handleGroupToggle}
                currentPath={location.pathname}
                litKey={litKey}
              />
            ))}
          </List>
        </Box>
      </LanternViewport>
    </Box>
  );
}