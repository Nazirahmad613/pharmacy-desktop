// app/components/NavigationHub.jsx
import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import navigationsData from "app/navigations";
import { useAuth } from "app/contexts/AuthContext";

// ============================================================
// رندر آیکون
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

// ============================================================
// نرمال‌سازی نام رول
// ============================================================
const normalizeRole = (role) => {
  if (!role) return "";
  if (typeof role === "object") {
    role = role.name || role.role || "";
  }
  return String(role).trim().toLowerCase();
};

// ============================================================
// کامپوننت اصلی
// ============================================================
export default function NavigationHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);

  // ============================================================
  // استخراج رول‌های کاربر
  // ============================================================
  const userRoles = useMemo(() => {
    if (!user) return [];
    const rolesSet = new Set();

    if (Array.isArray(user.role_names)) {
      user.role_names.forEach((r) => {
        const n = normalizeRole(r);
        if (n) rolesSet.add(n);
      });
    }

    if (Array.isArray(user.roles)) {
      user.roles.forEach((r) => {
        const n = normalizeRole(r);
        if (n) rolesSet.add(n);
      });
    }

    if (user.role) {
      const n = normalizeRole(user.role);
      if (n) rolesSet.add(n);
    }

    return Array.from(rolesSet);
  }, [user]);

  // ============================================================
  // چک ادمین بودن
  // ============================================================
  const isAdminUser = useMemo(() => {
    return (
      user?.isAdmin === true ||
      user?.isSuperAdmin === true ||
      userRoles.includes("admin") ||
      userRoles.includes("super_admin")
    );
  }, [user, userRoles]);

  // ============================================================
  // فیلتر و ترجمه منو (label ها کاملاً حذف می‌شوند)
  // ============================================================
  const navigations = useMemo(() => {
    if (!Array.isArray(navigationsData)) return [];
    if (!user) return [];

    const hasAccess = (item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (isAdminUser) return true;
      const itemRolesNorm = item.roles.map(normalizeRole);
      return itemRolesNorm.some((r) => userRoles.includes(r));
    };

    const translateItems = (items) => {
      const result = [];

      for (const item of items) {
        if (!hasAccess(item)) continue;

        // ✅ label ها را کاملاً نادیده بگیر
        if (item.type === "label") continue;

        const translated = {
          ...item,
          name: item.name ? t(item.name) : undefined,
          label: item.label ? t(item.label) : undefined,
          iconText: item.iconText ? t(item.iconText) : undefined,
          children: Array.isArray(item.children)
            ? translateItems(item.children)
            : undefined,
        };

        // حذف گروه خالی
        if (
          translated.children &&
          translated.children.length === 0 &&
          !translated.path
        ) {
          continue;
        }

        result.push(translated);
      }

      return result;
    };

    return translateItems(navigationsData);
  }, [t, user, userRoles, isAdminUser]);

  // ============================================================
  // آیتم‌های سطح بالا (بدون label)
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
  // هندلرها
  // ============================================================
  const handleGroupClick = (group) => {
    const groupName = group.name || "";

    // لابراتوار → مستقیم به صفحه
    if (groupName === "لابراتوار" || groupName === "Laboratory") {
      if (group.path) {
        navigate(group.path);
        return;
      }
    }

    // رادیولوژی → مستقیم به صفحه
    if (groupName === "رادیولوژی" || groupName === "Radiology") {
      if (group.path) {
        navigate(group.path);
        return;
      }
    }

    // گروه با فرزند → ورود به زیرمجموعه
    if (group.children && group.children.length > 0) {
      setNavigationStack([...navigationStack, selectedGroup].filter(Boolean));
      setSelectedGroup(group);
      return;
    }

    // لینک مستقیم
    if (group.path) {
      navigate(group.path);
    }
  };

  const handleBack = () => {
    const prevGroup = navigationStack.pop();
    setSelectedGroup(prevGroup || null);
    setNavigationStack([...navigationStack]);
  };

  const handleBackToTop = () => {
    setSelectedGroup(null);
    setNavigationStack([]);
  };

  // ============================================================
  // آیتم‌های نمایش‌داده‌شده
  // ============================================================
  const currentItems = selectedGroup
    ? (selectedGroup.children || []).filter((item) => item.type !== "label")
    : topLevelItems;

  // ============================================================
  // Loading / No user / Empty
  // ============================================================
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

  // ============================================================
  // ✅ رندر: همه کارت‌ها در یک Grid وسط‌چین
  // ============================================================
  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      {/* ===== نوار بازگشت ===== */}
      {(selectedGroup || navigationStack.length > 0) && (
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
            onClick={handleBack}
            variant="outlined"
          >
            بازگشت
          </Button>
          {navigationStack.length > 0 && (
            <Button onClick={handleBackToTop} variant="text">
              بازگشت به ابتدا
            </Button>
          )}
          <Typography variant="h5" sx={{ mr: 2, fontWeight: "bold" }}>
            {selectedGroup ? selectedGroup.name : "دسته‌بندی اصلی"}
          </Typography>
        </Box>
      )}

      {/* ===== همه کارت‌ها در یک Grid وسط‌چین ===== */}
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

          // ===== لینک مستقیم =====
          if (isLink) {
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
                  component={Link}
                  to={item.path}
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
                      color: "secondary.main",
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
                </Card>
              </Grid>
            );
          }

          // ===== کارت گروه =====
          if (hasChildren) {
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
                  onClick={() => handleGroupClick(item)}
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
                      color: "primary.main",
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
                  <Chip
                    label={`${item.children.length} زیرمجموعه`}
                    size="small"
                    sx={{
                      mt: 0.5,
                      fontSize: "0.7rem",
                      height: 20,
                    }}
                  />
                </Card>
              </Grid>
            );
          }

          return null;
        })}
      </Grid>
    </Box>
  );
}