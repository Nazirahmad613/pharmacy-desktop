// app/components/NavigationHub.jsx
import React, { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grid,
  Card,
  Typography,
  Box,
  Alert,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import navigationsData, { getLogicalParentPath } from "app/navigations";
import { useAuth } from "app/contexts/AuthContext";
import { useNavigation } from "app/contexts/NavigationContext";

// ===== Helpers =====

const renderIcon = (icon, size = 48) => {
  if (!icon) return null;

  // اگر Element باشد
  if (React.isValidElement(icon)) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          fontSize: size,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          lineHeight: 1,
          "& svg": { fontSize: size, width: size, height: size },
        }}
      >
        {icon}
      </Box>
    );
  }

  // اگر رشته باشد (material-icons)
  if (typeof icon === "string") {
    return (
      <i className="material-icons" style={{ fontSize: size, lineHeight: 1 }}>
        {icon}
      </i>
    );
  }

  return null;
};

const normalizeRole = (role) => {
  if (!role) return "";
  if (typeof role === "object") role = role.name || role.role || "";
  return String(role).trim().toLowerCase();
};

// فیلتر آیتم‌های واقعی (نه label و نه parent خالی)
const isRenderable = (item) => {
  if (!item || item.type === "label") return false;
  return Boolean(item.path) || (Array.isArray(item.children) && item.children.length > 0);
};

// ===== Component =====

export default function NavigationHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { breadcrumb, pushGroup } = useNavigation();

  // والد منطقی صفحه فعلی — فقط برای Breadcrumb (نه برای Back)
  const logicalParent = useMemo(
    () => getLogicalParentPath(location.pathname),
    [location.pathname]
  );

  // ===== نقش‌های کاربر =====
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

  // ===== فیلتر و ترجمه بر اساس دسترسی =====
  const navigations = useMemo(() => {
    if (!Array.isArray(navigationsData) || !user) return [];

    const hasAccess = (item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (isAdminUser) return true;
      return item.roles.map(normalizeRole).some((r) => userRoles.includes(r));
    };

    const translate = (items) => {
      const out = [];

      for (const item of items) {
        if (!item) continue;

        // labelها را رد نمی‌کنیم؛ اما فقط اگر فرزند قابل نمایش داشته باشند حفظ می‌شوند
        const translated = {
          ...item,
          name: item.name ? t(item.name) : undefined,
          label: item.label ? t(item.label) : undefined,
          children: Array.isArray(item.children)
            ? translate(item.children)
            : undefined,
        };

        // اگر label یا parent بدون فرزند قابل نمایش و بدون path → حذف
        if (
          translated.type !== "label" &&
          translated.children &&
          translated.children.length === 0 &&
          !translated.path
        ) {
          continue;
        }

        // بررسی دسترسی
        if (translated.type !== "label" && !hasAccess(item)) {
          continue;
        }

        out.push(translated);
      }

      return out;
    };

    return translate(navigationsData);
  }, [t, user, userRoles, isAdminUser]);

  // ===== آیتم‌های سطح بالا (ریشه) =====
  const topLevelItems = useMemo(
    () => navigations.filter(isRenderable),
    [navigations]
  );

  // ===== آیتم‌های نمایشی جاری =====
  const currentItems = useMemo(() => {
    if (!breadcrumb || breadcrumb.length === 0) return topLevelItems;

    const current = breadcrumb[breadcrumb.length - 1];
    if (current && Array.isArray(current.children)) {
      return current.children.filter(isRenderable);
    }
    return topLevelItems;
  }, [breadcrumb, topLevelItems]);

  // ===== ناوبری امن =====
  const safeNavigate = useCallback(
    (targetPath) => {
      if (!targetPath) return;
      navigate(targetPath);
    },
    [navigate]
  );

  // ===== کلیک روی آیتم =====
  const handleItemClick = useCallback(
    (item) => {
      if (!item) return;
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;

      if (hasChildren) {
        pushGroup(item);
      } else if (item.path) {
        safeNavigate(item.path);
      }
    },
    [pushGroup, safeNavigate]
  );

  // ===== حالت‌های خالی =====
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">در حال بارگذاری...</Alert>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">لطفاً وارد شوید.</Alert>
      </Box>
    );
  }

  if (currentItems.length === 0) {
    return (
      <Box sx={{ p: 3, direction: "rtl" }}>
        <Alert severity="warning">
          هیچ گروه ناوبری برای نقش شما یافت نشد.
          <br />
          نقش‌های شما: {userRoles.join(", ") || "نامشخص"}
        </Alert>
      </Box>
    );
  }

  // ===== رندر =====
  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      {/* ===== Breadcrumb ===== */}
      <Breadcrumbs
        separator="›"
        sx={{ mb: 2, direction: "rtl", fontSize: "0.9rem" }}
      >
        <MuiLink
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate("/dashboard/default")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            background: "none",
            border: "none",
            font: "inherit",
          }}
        >
          <HomeIcon fontSize="small" />
          خانه
        </MuiLink>

        {breadcrumb.map((grp, idx) => {
          const isLast = idx === breadcrumb.length - 1;
          const targetPath = grp.path || logicalParent;

          if (isLast) {
            return (
              <Typography key={`bc-${idx}`} color="text.primary">
                {grp.name}
              </Typography>
            );
          }

          return (
            <MuiLink
              key={`bc-${idx}`}
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => {
                if (targetPath) safeNavigate(targetPath);
              }}
              sx={{
                cursor: targetPath ? "pointer" : "default",
                background: "none",
                border: "none",
                font: "inherit",
              }}
            >
              {grp.name}
            </MuiLink>
          );
        })}
      </Breadcrumbs>

      {/* ===== عنوان گروه ===== */}
      {breadcrumb.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {breadcrumb[breadcrumb.length - 1]?.name || "دسته‌بندی اصلی"}
          </Typography>
        </Box>
      )}

      {/* ===== کارت‌های ناوبری ===== */}
      <Grid
        container
        spacing={2}
        sx={{
          direction: "rtl",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {currentItems.map((item, index) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0;
          const key =
            item.path ||
            `${item.name || "item"}-${index}`;

          return (
            <Grid
              item
              xs={6}
              sm={4}
              md={3}
              lg={2}
              key={key}
              sx={{ display: "flex" }}
            >
              <Card
                onClick={() => handleItemClick(item)}
                sx={{
                  textDecoration: "none",
                  transition: "0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                  width: "100%",
                  height: 140,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    mb: 1,
                    color: hasChildren ? "primary.main" : "secondary.main",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {renderIcon(item.icon, 40)}
                </Box>

                <Typography
                  variant="body1"
                  fontWeight="bold"
                  sx={{
                    fontSize: "0.95rem",
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  {item.name || item.label}
                </Typography>

                {hasChildren && (
                  <Chip
                    label={`${item.children.length} زیرمجموعه`}
                    size="small"
                    sx={{ mt: 0.5, fontSize: "0.7rem", height: 20 }}
                  />
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}