import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Button,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import navigationsData from "app/navigations";

const renderIcon = (icon, size = 48) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return (
      <Box sx={{ fontSize: size, display: "flex", justifyContent: "center" }}>
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

export default function NavigationHub() {
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);

  const navigations = useMemo(() => {
    if (!Array.isArray(navigationsData)) return [];

    const translateItems = (items) =>
      items.map((item) => ({
        ...item,
        name: item.name ? t(item.name) : undefined,
        label: item.label ? t(item.label) : undefined,
        iconText: item.iconText ? t(item.iconText) : undefined,
        children: Array.isArray(item.children)
          ? translateItems(item.children)
          : undefined,
      }));

    return translateItems(navigationsData);
  }, [t]);

  const topLevelGroups = useMemo(() => {
    const groups = [];
    navigations.forEach((item) => {
      if (item.children && item.children.length > 0 && item.type !== "label") {
        groups.push(item);
      } else if (item.path && !item.children && item.name !== "صفحه ناوبری") {
        groups.push(item);
      }
    });
    return groups;
  }, [navigations]);

  const handleGroupClick = (group) => {
    if (group.children && group.children.length > 0) {
      setNavigationStack([...navigationStack, selectedGroup].filter(Boolean));
      setSelectedGroup(group);
    } else if (group.path) {
      window.location.href = group.path;
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

  const currentItems = selectedGroup ? selectedGroup.children : topLevelGroups;

  if (topLevelGroups.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        هیچ گروه ناوبری یافت نشد.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2, direction: "rtl" }}>
      {(selectedGroup || navigationStack.length > 0) && (
        <Box sx={{ display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
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
          <Typography variant="h5" sx={{ mr: 2 }}>
            {selectedGroup ? selectedGroup.name : "دسته‌بندی اصلی"}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {currentItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isLink = item.path && !hasChildren;

          if (isLink) {
            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.path}>
                <Card
                  component={Link}
                  to={item.path}
                  sx={{
                    textDecoration: "none",
                    transition: "0.2s",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    cursor: "pointer",
                    p: 1,
                  }}
                >
                  <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                    <Box sx={{ fontSize: 40, mb: 1, color: "secondary.main" }}>   
                      {renderIcon(item.icon, 40)}
                    </Box>
                    <Typography variant="body1" fontWeight="bold" sx={{ fontSize: "1rem" }}>
                      {item.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          } else if (hasChildren) {
            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.name}>
                <Card
                  onClick={() => handleGroupClick(item)}
                  sx={{
                    textDecoration: "none",
                    transition: "0.2s",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    cursor: "pointer",
                    p: 1,
                  }}
                >
                  <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                    <Box sx={{ fontSize: 48, mb: 1, color: "primary.main" }}>
                      {renderIcon(item.icon, 48)}
                    </Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.2rem" }}>
                      {item.name}
                    </Typography>
                    <Chip
                      label={`${item.children.length} زیرمجموعه`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
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