import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import styled from "@mui/material/styles/styled";
import IconButton from "@mui/material/IconButton";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import Notifications from "@mui/icons-material/Notifications";
import Clear from "@mui/icons-material/Clear";

import useSettings from "app/hooks/useSettings";
import useNotification from "app/hooks/useNotification";
import { getTimeDifference } from "app/utils/utils.js";
import { sideNavWidth, topBarHeight } from "app/utils/constant";
import { themeShadows } from "../MatxTheme/themeColors";
import { Paragraph, Small } from "../Typography";

const Notification = styled("div")(() => ({
  padding: "16px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  height: topBarHeight,
  boxShadow: themeShadows[6],
  "& h5": {
    marginLeft: "8px",
    marginTop: 0,
    marginBottom: 0,
    fontWeight: "500"
  }
}));

const NotificationCard = styled(Box)(({ theme }) => ({
  position: "relative",
  "&:hover": {
    "& .messageTime": { display: "none" },
    "& .deleteButton": { opacity: "1" }
  },
  "& .messageTime": { color: theme.palette.text.secondary },
  "& .icon": { fontSize: "1.25rem" }
}));

export default function NotificationBar({ container }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const { deleteNotification, clearNotifications, notifications = [] } = useNotification();

  const handleDrawerToggle = () => setPanelOpen(!panelOpen);

  return (
    <Fragment>
      <IconButton onClick={handleDrawerToggle}>
        <Badge color="secondary" badgeContent={Array.isArray(notifications) ? notifications.length : 0}>
          <Notifications sx={{ color: "text.primary" }} />
        </Badge>
      </IconButton>

      <ThemeProvider theme={settings.themes[settings.activeTheme]}>
        <Drawer
          width={"100px"}
          container={container}
          variant="temporary"
          anchor={"right"}
          open={panelOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}>
          <Box sx={{ width: sideNavWidth }}>
            <Notification>
              <Notifications color="primary" />
              <h5>{t("notifications.title")}</h5>
            </Notification>

            {Array.isArray(notifications) && notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationCard key={notification.id}>
                  <IconButton
                    size="small"
                    className="deleteButton"
                    onClick={() => deleteNotification(notification.id)}>
                    <Clear className="icon" />
                  </IconButton>

                  <Link to={`/${notification.path}`} onClick={handleDrawerToggle} style={{ textDecoration: "none" }}>
                    <Card sx={{ mx: 2, mb: 3 }} elevation={3}>
                      <Box display="flex" alignItems="center" p={2}>
                        <Icon className="icon" color={notification.icon?.color}>{notification.icon?.name}</Icon>
                        <span>{t(notification.heading)}</span>
                      </Box>
                      <Box px={2} pt={1} pb={2}>
                        <Paragraph m={0}>{t(notification.title)}</Paragraph>
                        <Small color="text.secondary">{t(notification.subtitle)}</Small>
                      </Box>
                    </Card>
                  </Link>
                </NotificationCard>
              ))
            ) : (
              <Box textAlign="center" p={2}>
                <Small color="text.secondary">{t("notifications.empty")}</Small>
              </Box>
            )}

            {Array.isArray(notifications) && notifications.length > 0 && (
              <Button fullWidth onClick={clearNotifications}>
                {t("notifications.clear")}
              </Button>
            )}
          </Box>
        </Drawer>
      </ThemeProvider>
    </Fragment>
  );
}
