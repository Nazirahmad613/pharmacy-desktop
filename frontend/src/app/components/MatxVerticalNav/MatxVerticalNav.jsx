// MatxVerticalNav.jsx

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

  const hasRoleAccess = (itemRoles = []) => {
    if (!itemRoles || itemRoles.length === 0) return true;

    if (!user) return false;

    const userRoles =
      user.role_names ||
      user.roles?.map((role) =>
        typeof role === "object" ? role.name : role
      ) ||
      [];

    return itemRoles.some((role) => userRoles.includes(role));
  };

  const hasPermissionAccess = (itemPermissions = []) => {
    if (!itemPermissions || itemPermissions.length === 0) {
      return true;
    }

    if (!user) return false;

    if (user.isAdmin === true) {
      return true;
    }

    const allPermissions = user.all_permissions || [];

    return itemPermissions.some((perm) =>
      allPermissions.includes(perm)
    );
  };

  const filterItems = (data) => {
    return data.reduce((acc, item) => {
      const roleAccess = hasRoleAccess(item.roles);
      const permissionAccess = hasPermissionAccess(item.permissions);

      if (!roleAccess || !permissionAccess) {
        return acc;
      }

      const clonedItem = { ...item };

      if (clonedItem.children) {
        clonedItem.children = filterItems(clonedItem.children);

        if (
          clonedItem.children.length === 0 &&
          !clonedItem.path
        ) {
          return acc;
        }
      }

      acc.push(clonedItem);
      return acc;
    }, []);
  };

  const filteredItems = Array.isArray(items)
    ? filterItems(items)
    : [];

  const renderLevels = (data) => {
    return data.map((item, index) => {
      if (item.type === "label") {
        return (
          <ListLabel
            key={index}
            mode={mode}
            className="sidenavHoverShow"
          >
            {t(item.label)}
          </ListLabel>
        );
      }

      if (item.children && item.children.length > 0) {
        return (
          <MatxVerticalNavExpansionPanel
            mode={mode}
            item={item}
            key={index}
          >
            {renderLevels(item.children)}
          </MatxVerticalNavExpansionPanel>
        );
      }

      return (
        <InternalLink key={index}>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              isActive ? "navItemActive" : ""
            }
          >
            <ButtonBase sx={{ width: "100%" }}>
              {item.icon}

              <StyledText
                mode={mode}
                className="sidenavHoverShow"
              >
                {t(item.name)}
              </StyledText>

              {item.badge && (
                <BadgeValue>
                  {t(item.badge.value)}
                </BadgeValue>
              )}
            </ButtonBase>
          </NavLink>
        </InternalLink>
      );
    });
  };

  return (
    <div
      className="navigation"
      style={{
        overflowY: "auto",
        maxHeight: "100vh",
      }}
    >
      {renderLevels(filteredItems)}
    </div>
  );
}