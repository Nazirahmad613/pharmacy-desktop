import { memo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import styled from "@mui/material/styles/styled";
import useTheme from "@mui/material/styles/useTheme";
import useMediaQuery from "@mui/material/useMediaQuery";
import Home from "@mui/icons-material/Home";
import Menu from "@mui/icons-material/Menu";
import Person from "@mui/icons-material/Person";
import Settings from "@mui/icons-material/Settings";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import useAuth from "app/hooks/useAuth";
import useSettings from "app/hooks/useSettings";
import { NotificationProvider } from "app/contexts/NotificationContext";
import { Span } from "app/components/Typography";
import ShoppingCart from "app/components/ShoppingCart";
import { MatxMenu, MatxSearchBox } from "app/components";
import { NotificationBar } from "app/components/NotificationBar";
import { themeShadows } from "app/components/MatxTheme/themeColors";
import { topBarHeight } from "app/utils/constant";
import { FaUserCircle } from "react-icons/fa";

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary
}));

const TopbarRoot = styled("div")(({ theme, dir }) => ({
  top: 0,
  zIndex: 96,
  height: topBarHeight,
  boxShadow: themeShadows[8],
  transition: "all 0.3s ease",
  direction: dir
}));

const TopbarContainer = styled("div")(({ theme }) => ({
  padding: "8px",
  paddingLeft: 18,
  paddingRight: 20,
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: theme.palette.primary.main,
  [theme.breakpoints.down("sm")]: { paddingLeft: 16, paddingRight: 16 },
  [theme.breakpoints.down("xs")]: { paddingLeft: 14, paddingRight: 16 }
}));

const Layout1Topbar = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useSettings();
  const { logout, user } = useAuth();
  const isMdScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);
  
  useEffect(() => {
    console.log("User object in Topbar:", user);
    if (user) {
      console.log("User avatar:", user.avatar);
      console.log("User avatar_url:", user.avatar_url);
    }
  }, [user]);
  
  const updateSidebarMode = (sidebarSettings) => {
    updateSettings({ layout1Settings: { leftSidebar: { ...sidebarSettings } } });
  };

  const handleSidebarToggle = () => {
    let { layout1Settings } = settings;
    let mode;
    if (isMdScreen) {
      mode = layout1Settings.leftSidebar.mode === "close" ? "mobile" : "close";
    } else {
      mode = layout1Settings.leftSidebar.mode === "full" ? "close" : "full";
    }
    updateSidebarMode({ mode });
  };

  const getAvatarUrl = () => {
    if (!user) return null;
    
    if (user.avatar_url) {
      return user.avatar_url;
    }
    
    if (user.avatar) {
      if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
        return user.avatar;
      }
      
      if (user.avatar.startsWith('/storage/')) {
        return window.location.origin + user.avatar;
      }
      
      if (user.avatar.startsWith('avatars/')) {
        return `${window.location.origin}/storage/${user.avatar}`;
      }
      
      return `${window.location.origin}/storage/${user.avatar}`;
    }
    
    return null;
  };

  const handleAvatarError = () => {
    console.error("Avatar failed to load:", avatarUrl);
    setAvatarError(true);
  };

  const avatarUrl = getAvatarUrl();

  return (
    <TopbarRoot dir={i18n.language === "fa" ? "rtl" : "ltr"}>
      <TopbarContainer>
        <Box display="flex">
          <StyledIconButton onClick={handleSidebarToggle}>
            <Menu />
          </StyledIconButton>
        </Box>

        <Box display="flex" alignItems="center">
          <MatxSearchBox />

          <NotificationProvider>
            <NotificationBar />
          </NotificationProvider>

          <ShoppingCart />

          <MatxMenu
            menuButton={
              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <Span>
                  {t("hi")} <strong>{user?.name || ""}</strong>
                </Span>
                <Avatar 
                  src={!avatarError ? avatarUrl : null} 
                  sx={{ cursor: "pointer", width: 40, height: 40 }}
                  onError={handleAvatarError}
                >
                  {(avatarError || !avatarUrl) && <FaUserCircle style={{ fontSize: 24 }} />}
                </Avatar>
              </div>
            }>
            <MenuItem>
              <Link to="/">
                <Home />
                <Span sx={{ marginInlineStart: 1 }}>{t("home")}</Span>
              </Link>
            </MenuItem>

            <MenuItem onClick={() => navigate("/user/user-profile")}>
              <Person />
              <Span sx={{ marginInlineStart: 1 }}>{t("profile")}</Span>
            </MenuItem>

            <MenuItem>
              <Link to="/settings">
                <Settings />
                <Span sx={{ marginInlineStart: 1 }}>{t("settings")}</Span>
              </Link>
            </MenuItem>

            <MenuItem onClick={logout}>
              <PowerSettingsNew />
              <Span sx={{ marginInlineStart: 1 }}>{t("logout")}</Span>
            </MenuItem>
          </MatxMenu>
        </Box>
      </TopbarContainer>
    </TopbarRoot>
  );
};

export default memo(Layout1Topbar);