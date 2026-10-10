// app/components/NavigationHub.jsx
import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grid,
  Card,
  Typography,
  Box,
  Alert,
  Button,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";
import navigationsData from "app/navigations";
import { useAuth } from "app/contexts/AuthContext";
import { useNavigation } from "app/contexts/NavigationContext";

// ============================================================
const renderIcon = (icon, size = 48) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return (
      <Box
        sx={{
          fontSize: size,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          lineHeight: 1,
        }}
      >
        {icon}
      </Box>
    );
  }
  if (typeof icon === "string") {
    return (
      <i className="material-icons" style={{ fontSize: size }}>
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

// ============================================================
export default function NavigationHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const {
    breadcrumb,
    pushGroup,
    popGroup,
    resetToTop,
  } = useNavigation();

  // ============================================================
  // رول‌ها
  // ============================================================
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

  // ============================================================
  // فیلتر و ترجمه منو
  // ============================================================
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
  }, [t, user, userRoles, isAdminUser]);

  // ============================================================
  // topLevelItems
  // ============================================================
  const topLevelItems = useMemo(() => {
    const items = [];
    navigations.forEach((item) => {
      if (item.type === "label") return;
      if ((item.children && item.children.length > 0) || item.path) {
        items.push(item);
      }
    });
    return items;
  }, [navigations]);

  // ============================================================
  // آیتم‌های نمایش‌داده‌شده بر اساس آخرین گروه breadcrumb
  // ============================================================
  const currentItems = useMemo(() => {
    if (breadcrumb.length === 0) return topLevelItems;
    const current = breadcrumb[breadcrumb.length - 1];
    if (current && Array.isArray(current.children)) {
      return current.children.filter((c) => c.type !== "label");
    }
    return topLevelItems;
  }, [breadcrumb, topLevelItems]);

  // ============================================================
  // کلیک روی کارت
  // ============================================================
  const handleItemClick = (item) => {
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
      // فقط پشته را زیاد کن — سایدبار خودکار هم‌گام می‌شود
      pushGroup(item);
    } else if (item.path) {
      // صفحه را عوض کن — Context با useEffect خودش هم‌گام می‌شود
      navigate(item.path);
    }
  };

  // ============================================================
  // Loading / No user
  // ============================================================
  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">در حال بارگذاری...</Alert>
      </Box>
    );

  if (!user)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">لطفاً وارد شوید.</Alert>
      </Box>
    );

  if (currentItems.length === 0)
    return (
      <Box sx={{ p: 3, direction: "rtl" }}>
        <Alert severity="warning">
          هیچ گروه ناوبری برای نقش شما یافت نشد.
          <br />
          نقش‌های شما: {userRoles.join(", ") || "نامشخص"}
        </Alert>
      </Box>
    );

  // ============================================================
  // رندر
  // ============================================================
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
          onClick={resetToTop}
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
          return isLast ? (
            <Typography key={idx} color="text.primary">
              {grp.name}
            </Typography>
          ) : (
            <MuiLink
              key={idx}
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => {
                const stepsBack = breadcrumb.length - 1 - idx;
                for (let i = 0; i < stepsBack; i++) popGroup();
              }}
              sx={{
                cursor: "pointer",
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

      {/* ===== نوار بازگشت ===== */}
      {breadcrumb.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={popGroup}
            variant="outlined"
          >
            بازگشت
          </Button>
          <Button onClick={resetToTop} variant="text">
            بازگشت به ابتدا
          </Button>
          <Typography variant="h5" sx={{ mr: 2, fontWeight: "bold" }}>
            {breadcrumb[breadcrumb.length - 1]?.name || "دسته‌بندی اصلی"}
          </Typography>
        </Box>
      )}

      {/* ===== کارت‌ها ===== */}
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
          const hasChildren = item.children && item.children.length > 0;
          const isLink = item.path && !hasChildren;
          const key = item.path || item.name || `item-${index}`;

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
                {...(isLink
                  ? { component: Link, to: item.path }
                  : { onClick: () => handleItemClick(item) })}
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
                    fontSize: 40,
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
                  {item.name}
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