// src/app/components/Sidenav.jsx
import React, { Fragment, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Scrollbar from "react-perfect-scrollbar";
import styled from "@mui/material/styles/styled";
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

const StyledScrollBar = styled(Scrollbar)(() => ({
  paddingLeft: "0.5rem",
  paddingRight: "0.5rem",
  position: "relative",
  height: "calc(100vh - 80px)",
  overflowX: "hidden",
}));

const normalizeRole = (role) => {
  if (!role) return "";
  if (typeof role === "object") role = role.name || role.role || "";
  return String(role).trim().toLowerCase();
};

function NavItem({ item, level = 0, openMap, setOpenMap, onLeafClick }) {
  const key = item.name || item.path;
  const isOpen = !!openMap[key];
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const paddingRight = 8 + level * 14;

  const handleClick = () => {
    if (hasChildren) {
      setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
    } else if (item.path) {
      onLeafClick(item);
    }
  };

  if (item.type === "label" || item.label) {
    return (
      <Typography
        variant="caption"
        sx={{
          display: "block",
          px: 2,
          pt: 2,
          pb: 0.5,
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {(item.label || item.name || "").toUpperCase()}
      </Typography>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          my: 0.25,
          pr: `${paddingRight}px`,
          color: "#fff",
          "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
        }}
      >
        {item.icon && (
          <ListItemIcon
            sx={{
              color: "#fff",
              minWidth: 36,
              "& .MuiSvgIcon-root": { fontSize: 22 },
            }}
          >
            {item.icon}
          </ListItemIcon>
        )}
        <ListItemText
          primary={item.name}
          primaryTypographyProps={{
            fontSize: level === 0 ? "0.95rem" : "0.88rem",
            fontWeight: level === 0 ? 600 : 400,
            noWrap: true,
          }}
        />
        {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child, idx) => (
              <NavItem
                key={child.path || child.name || idx}
                item={child}
                level={level + 1}
                openMap={openMap}
                setOpenMap={setOpenMap}
                onLeafClick={onLeafClick}
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

  // ✅ تنها دکمه بازگشت — فقط بر اساس تاریخچه واقعی مرورگر (navigate(-1))
  const { canGoBack, goBack } = useBackNavigation();

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

  // openMap: گروه‌های باز در سایدبار — بر اساس pathname فعلی
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

  const [localOpenMap, setLocalOpenMap] = React.useState({});
  const mergedOpenMap = { ...autoOpenMap, ...localOpenMap };

  const handleLeafClick = (item) => {
    if (item.path) navigate(item.path);
  };

  return (
    <Fragment>
      <StyledScrollBar options={{ suppressScrollX: true }}>
        {children}

        {/* ===== ✅ تنها یک دکمه بازگشت — به همان صفحه‌ای که از آن آمده‌اید ===== */}
        {canGoBack && (
          <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
            <ListItemButton
              onClick={goBack}
              sx={{
                borderRadius: 1,
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.08)",
                mb: 0.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.14)" },
              }}
            >
              <ListItemIcon sx={{ color: "#fff", minWidth: 36 }}>
                <ArrowBackIcon />
              </ListItemIcon>
              <ListItemText
                primary="بازگشت به صفحه قبلی"
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </ListItemButton>
            <Divider sx={{ bgcolor: "rgba(255,255,255,0.15)", my: 1 }} />
          </Box>
        )}

        <List
          component="nav"
          sx={{
            pr: 0.5,
            "& .MuiListItemText-primary": { color: "#fff" },
          }}
        >
          {navigations.map((item, idx) => (
            <NavItem
              key={item.path || item.name || idx}
              item={item}
              level={0}
              openMap={mergedOpenMap}
              setOpenMap={setLocalOpenMap}
              onLeafClick={handleLeafClick}
            />
          ))}
        </List>
      </StyledScrollBar>
    </Fragment>
  );
}