 // src/app/components/Sidenav.jsx
import React, { Fragment, useMemo, useState, useRef, useEffect, useCallback } from "react";
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

// شعاع اثر نور فانوس (هرچه بیشتر، بخش‌های بیشتری روشن می‌مانند)
const LIGHT_SPAN = 170;

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

function NavItem({
  item,
  level = 0,
  openMap,
  setOpenMap,
  onLeafClick,
  onGroupToggle,
  currentPath,
  lanternY,
  scrollOffset,
}) {
  const key = item.name || item.path;
  const isOpen = !!openMap[key];
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActive = item.path && currentPath === item.path;
  const itemRef = useRef(null);
  // پیش‌فرض: کمترین روشنایی (نزدیک به تاریکی کامل) تا افکت محسوس باشد
  const [brightness, setBrightness] = useState(0.2);

  // محاسبه شدت روشنایی بر اساس فاصله عمودی از فانوس
  useEffect(() => {
    if (!itemRef.current) return;
    const el = itemRef.current;
    const itemCenterY = el.offsetTop - scrollOffset + el.offsetHeight / 2;
    const flameY = lanternY + 28;
    const distance = Math.abs(itemCenterY - flameY);

    // نرخ کاهش به صورت غیرخطی: هرچه دورتر، سریع‌تر تاریک می‌شود
    const ratio = Math.max(0, 1 - distance / LIGHT_SPAN);

    // range از 0.18 (تاریک) تا 1.0 (روشن کامل)
    const boosted = Math.pow(ratio, 1.25);
    const computed = 0.18 + boosted * 0.82;

    setBrightness(computed);
  }, [lanternY, scrollOffset, isOpen]);

  const handleClick = (e) => {
    const clickedEl = e.currentTarget;
    if (hasChildren) {
      const nextState = !isOpen;
      setOpenMap((prev) => ({ ...prev, [key]: nextState }));
      if (onGroupToggle) {
        onGroupToggle(clickedEl, nextState);
      }
    } else if (item.path) {
      onLeafClick(item, clickedEl);
    }
  };

  // شدت تابش: آیتم فعال همیشه 100% روشن است
  const effectiveLight = isActive ? 1 : brightness;

  // اختلاف با حالت روشن کامل: هرچه دورتر، تیره‌تر
  const glow = Math.max(0, effectiveLight - 0.55);

  // رنگ متن: از تاریکی تا سفید کامل
  const textAlpha = Math.min(1, 0.28 + effectiveLight * 0.72);

  if (item.type === "label" || item.label) {
    return (
      <Typography
        ref={itemRef}
        variant="caption"
        sx={{
          display: "block",
          px: 2,
          pt: 2.2,
          pb: 0.6,
          pl: "44px",
          color: `rgba(255, 255, 255, ${textAlpha * 0.9})`,
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: 1.2,
          transition: "color 0.25s ease",
        }}
      >
        {(item.label || item.name || "").toUpperCase()}
      </Typography>
    );
  }

  return (
    <>
      <ListItemButton
        ref={itemRef}
        onClick={handleClick}
        sx={{
          borderRadius: "10px",
          my: 0.35,
          pl: `${42 + level * 14}px`,
          pr: 1.5,
          py: 0.95,
          position: "relative",
          color: isActive ? "#ffffff" : `rgba(255, 255, 255, ${textAlpha})`,
          textShadow:
            glow > 0.05
              ? `0 0 ${6 + glow * 18}px rgba(255, 255, 255, ${glow * 0.95})`
              : "none",
          background: isActive
            ? `linear-gradient(90deg, rgba(255,255,255,${0.12 + glow * 0.25}) 0%, rgba(255,255,255,0.02) 100%)`
            : glow > 0.05
            ? `linear-gradient(90deg, rgba(255,255,255,${glow * 0.08}) 0%, transparent 100%)`
            : "transparent",
          boxShadow:
            glow > 0.15
              ? `inset 2px 0 0 rgba(255,255,255,${glow * 0.9})`
              : "none",
          transition:
            "color 0.25s ease, text-shadow 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
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
              color: isActive
                ? "#ffffff"
                : `rgba(255, 255, 255, ${textAlpha})`,
              minWidth: 32,
              filter:
                glow > 0.1
                  ? `drop-shadow(0 0 ${4 + glow * 10}px rgba(200, 220, 255, ${glow}))`
                  : "none",
              transition: "color 0.25s ease, filter 0.25s ease",
              "& .MuiSvgIcon-root": { fontSize: 20 },
            }}
          >
            {item.icon}
          </ListItemIcon>
        )}

        <ListItemText
          primary={item.name}
          primaryTypographyProps={{
            fontSize: level === 0 ? "0.92rem" : "0.84rem",
            fontWeight: isActive || effectiveLight > 0.85 ? 700 : effectiveLight > 0.5 ? 500 : 400,
            color: "#ffffff",
            noWrap: true,
          }}
        />

        {(isActive || glow > 0.4) && (
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: "#ffffff",
              boxShadow: `0 0 ${6 + glow * 12}px ${1 + glow * 3}px rgba(255, 255, 255, ${0.6 + glow * 0.4})`,
              ml: 1,
              opacity: 0.3 + effectiveLight * 0.7,
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
              transition: "opacity 0.25s ease",
            }}
          >
            {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={isOpen} timeout={240} unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child, idx) => (
              <NavItem
                key={child.path || child.name || idx}
                item={child}
                level={level + 1}
                openMap={openMap}
                setOpenMap={setOpenMap}
                onLeafClick={onLeafClick}
                onGroupToggle={onGroupToggle}
                currentPath={currentPath}
                lanternY={lanternY}
                scrollOffset={scrollOffset}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export default function Sidenav({ children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { navigationsData } = useNavigation();
  const { canGoBack, goBack } = useBackNavigation();

  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  const [lanternY, setLanternY] = useState(20);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isSwinging, setIsSwinging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const swingTimeout = useRef(null);
  const dragStartY = useRef(0);
  const dragStartLanternY = useRef(20);

  const triggerSwing = useCallback(() => {
    setIsSwinging(true);
    if (swingTimeout.current) clearTimeout(swingTimeout.current);
    swingTimeout.current = setTimeout(() => setIsSwinging(false), 850);
  }, []);

  const updatePositionByLantern = useCallback((rawLanternY) => {
    if (!viewportRef.current || !contentRef.current) return;

    const viewportHeight = viewportRef.current.clientHeight;
    const contentHeight = contentRef.current.scrollHeight;

    const minY = 16;
    const maxY = Math.max(60, viewportHeight - 85);
    const clampedY = Math.min(maxY, Math.max(minY, rawLanternY));

    const progress = maxY > minY ? (clampedY - minY) / (maxY - minY) : 0;
    const maxScroll = Math.max(0, contentHeight - viewportHeight + 50);
    const syncedScroll = progress * maxScroll;

    setLanternY(clampedY);
    setScrollOffset(syncedScroll);
  }, []);

  const handleLanternPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
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
    const rect = viewportRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top - 28;
    updatePositionByLantern(clickY);
    triggerSwing();
  };

  const handleWheel = (e) => {
    const step = e.deltaY * 0.25;
    updatePositionByLantern(lanternY + step);
    triggerSwing();
  };

  const handleGroupToggle = useCallback(() => {
    setTimeout(() => {
      updatePositionByLantern(lanternY);
      triggerSwing();
    }, 260);
  }, [lanternY, updatePositionByLantern, triggerSwing]);

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

  const isAdminUser = useMemo(
    () =>
      user?.isAdmin === true ||
      user?.isSuperAdmin === true ||
      userRoles.includes("admin") ||
      userRoles.includes("super_admin"),
    [user, userRoles]
  );

  const navigations = useMemo(() => {
    if (!Array.isArray(navigationsData)) return [];
    if (!user) return [];

    const hasAccess = (item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (isAdminUser) return true;
      return item.roles.map(normalizeRole).some((r) => userRoles.includes(r));
    };

    const translate = (items) => {
      const out = [];
      for (const item of items) {
        if (!hasAccess(item)) continue;
        const translated = {
          ...item,
          name: item.name ? t(item.name) : undefined,
          label: item.label ? t(item.label) : undefined,
          children: Array.isArray(item.children)
            ? translate(item.children)
            : undefined,
        };
        if (
          translated.children &&
          translated.children.length === 0 &&
          !translated.path
        )
          continue;
        out.push(translated);
      }
      return out;
    };

    return translate(navigationsData);
  }, [t, user, userRoles, isAdminUser, navigationsData]);

  const autoOpenMap = useMemo(() => {
    const map = {};
    const path = (location.pathname || "").replace(/\/+$/, "");
    if (!path) return map;
    const segments = path.split("/").filter(Boolean);
    for (let i = 1; i <= segments.length; i++) {
      const partial = "/" + segments.slice(0, i).join("/");
      map[partial] = true;
    }
    return map;
  }, [location.pathname]);

  const [localOpenMap, setLocalOpenMap] = useState({});
  const mergedOpenMap = { ...autoOpenMap, ...localOpenMap };

  const handleLeafClick = (item) => {
    if (item.path) navigate(item.path);
  };

  return (
    <Fragment>
      <LanternViewport ref={viewportRef} onWheel={handleWheel}>
        {/* هاله نور فانوس - قوی‌تر و بزرگ‌تر */}
        <Box
          sx={{
            position: "absolute",
            left: "-60px",
            top: `${lanternY - 100}px`,
            width: "340px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(210, 225, 255, 0.32) 0%, rgba(148, 163, 184, 0.18) 30%, rgba(71, 85, 105, 0.06) 55%, transparent 75%)",
            pointerEvents: "none",
            transition: isDragging ? "none" : "top 0.16s ease-out",
            zIndex: 1,
          }}
        />

        {/* میله عمودی فانوس */}
        <Box
          onClick={handleTrackClick}
          sx={{
            position: "absolute",
            left: "12px",
            top: 0,
            bottom: 0,
            width: "28px",
            cursor: "pointer",
            zIndex: 3,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "2px",
              height: "100%",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 100%)",
            }}
          />
        </Box>

        {/* فانوس آویزان */}
        <Box
          onMouseDown={handleLanternPointerDown}
          onTouchStart={handleLanternPointerDown}
          title="فانوس را بگیرید و به پایین بکشید"
          sx={{
            position: "absolute",
            left: "8px",
            top: `${lanternY}px`,
            zIndex: 4,
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "top 0.16s ease-out",
            padding: "2px",
          }}
        >
          <HangingLanternSVG isSwinging={isSwinging} isDragging={isDragging} />
        </Box>

        {/* محتوای منوها */}
        <Box
          ref={contentRef}
          sx={{
            position: "relative",
            zIndex: 2,
            transform: `translateY(-${scrollOffset}px)`,
            transition: isDragging ? "none" : "transform 0.16s ease-out",
            pt: 1,
            pb: 6,
          }}
        >
          {children}

          {canGoBack && (
            <Box sx={{ pl: "36px", pr: 1, pt: 1, pb: 0.5 }}>
              <ListItemButton
                onClick={goBack}
                sx={{
                  borderRadius: "10px",
                  color: "#ffffff",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  mb: 0.5,
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                }}
              >
                <ListItemIcon sx={{ color: "#ffffff", minWidth: 32 }}>
                  <ArrowBackIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="بازگشت به صفحه قبلی"
                  primaryTypographyProps={{ fontSize: "0.82rem", color: "#ffffff" }}
                />
              </ListItemButton>
              <Divider sx={{ bgcolor: "rgba(255,255,255,0.12)", my: 1 }} />
            </Box>
          )}

          <List component="nav" disablePadding>
            {navigations.map((item, idx) => (
              <NavItem
                key={item.path || item.name || idx}
                item={item}
                level={0}
                openMap={mergedOpenMap}
                setOpenMap={setLocalOpenMap}
                onLeafClick={handleLeafClick}
                onGroupToggle={handleGroupToggle}
                currentPath={location.pathname}
                lanternY={lanternY}
                scrollOffset={scrollOffset}
              />
            ))}
          </List>
        </Box>
      </LanternViewport>
    </Fragment>
  );
}