import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import ButtonBase from "@mui/material/ButtonBase";
import styled from "@mui/material/styles/styled";

import useSettings from "app/hooks/useSettings";
import { Paragraph, Span } from "../Typography";
import MatxVerticalNavExpansionPanel from "./MatxVerticalNavExpansionPanel";
import { useAuth } from "app/contexts/AuthContext";

// STYLED COMPONENTS
const ListLabel = styled(Paragraph)(({ theme, mode }) => ({
  fontSize: "12px",
  marginTop: "20px",
  marginLeft: "15px",
  marginBottom: "10px",
  textTransform: "uppercase",
  display: mode === "compact" && "none",
  color: theme.palette.text.secondary,
}));

const InternalLink = styled(Box)(({ theme }) => ({
  "& a": {
    display: "flex",
    borderRadius: "4px",
    height: 44,
    whiteSpace: "pre",
    textDecoration: "none",
    color: theme.palette.text.primary,
    alignItems: "center",
    transition: "all 150ms ease-in",
    "&:hover": { background: "rgba(255, 255, 255, 0.08)" },
  },
  "& .navItemActive": {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
}));

const StyledText = styled(Span)(({ mode }) => ({
  fontSize: "0.875rem",
  paddingLeft: "0.8rem",
  display: mode === "compact" && "none",
}));

const BadgeValue = styled("div")(() => ({
  padding: "1px 8px",
  overflow: "hidden",
  borderRadius: "300px",
}));

export default function MatxVerticalNav({ items }) {
  const { settings } = useSettings();
  const { mode } = settings.layout1Settings.leftSidebar;
  const { t } = useTranslation();
  const { user } = useAuth();

  // فیلتر آیتم‌ها بر اساس نقش کاربر
  const filterItemsByRole = (data) => {
    return data
      .filter(item => !item.roles || item.roles.includes(user?.role))
      .map(item => ({
        ...item,
        children: item.children ? filterItemsByRole(item.children) : undefined,
      }));
  };

  const filteredItems = Array.isArray(items) ? filterItemsByRole(items) : [];

  const renderLevels = (data) => {
    return data.map((item, index) => {
      if (item.type === "label")
        return (
          <ListLabel key={index} mode={mode} className="sidenavHoverShow">
            {t(item.label)}
          </ListLabel>
        );

      if (item.children && item.children.length > 0) {
        return (
          <MatxVerticalNavExpansionPanel mode={mode} item={item} key={index}>
            {renderLevels(item.children)}
          </MatxVerticalNavExpansionPanel>
        );
      } else {
        return (
          <InternalLink key={index}>
            <NavLink
              to={item.path}
              className={({ isActive }) => (isActive ? `navItemActive` : "")}
            >
              <ButtonBase key={item.name} sx={{ width: "100%" }}>
                {/* ✅ اصلاح شده: بررسی نوع icon و تبدیل به string در صورت نیاز */}
                {item.icon && (
                  typeof item.icon === 'string' ? (
                    <Icon className={item.icon} />
                  ) : (
                    // اگر icon از نوع object است، آن را نادیده بگیر یا آیکون پیش‌فرض نمایش بده
                    <Icon className="default-icon" />
                  )
                )}
                <StyledText mode={mode} className="sidenavHoverShow">
                  {t(item.name)}
                </StyledText>
                {item.badge && <BadgeValue>{t(item.badge.value)}</BadgeValue>}
              </ButtonBase>
            </NavLink>
          </InternalLink>
        );
      }
    });
  };

  return (
    <div className="navigation" style={{ overflowY: "auto", maxHeight: "100vh" }}>
      {renderLevels(filteredItems)}
    </div>
  );
}