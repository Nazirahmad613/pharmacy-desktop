import { memo, useEffect, useState, useCallback } from "react";
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

// ====================== Styled ======================
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

const TopbarRoot = styled("div")(({ theme, dir }) => ({
  top: 0,
  zIndex: 96,
  height: topBarHeight,
  boxShadow: themeShadows[8],
  transition: "all 0.3s ease",
  direction: dir,
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

  [theme.breakpoints.down("sm")]: {
    paddingLeft: 16,
    paddingRight: 16,
  },

  [theme.breakpoints.down("xs")]: {
    paddingLeft: 14,
    paddingRight: 16,
  },
}));

// ====================== Component ======================
const Layout1Topbar = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useSettings();
  const { user, loading, logout } = useAuth(); // اضافه کردن logout
  const isMdScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [avatarSrc, setAvatarSrc] = useState("");
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);

  // ====================== ساخت آدرس آواتار ======================
  const getAvatarUrl = useCallback(() => {
    if (!user) return "";
    
    // اولویت با avatar_url که در AuthContext پردازش شده
    if (user.avatar_url) {
      return user.avatar_url;
    }
    
    // اگر avatar مستقیم وجود داشت
    if (user.avatar) {
      const cleanPath = user.avatar.replace(/^\/+/, "");
      if (cleanPath.startsWith("http")) {
        return cleanPath;
      }
      return `http://localhost:8000/storage/${cleanPath}`;
    }
    
    return "";
  }, [user]);

  // ====================== بارگذاری آواتار ======================
  useEffect(() => {
    if (!user) {
      setAvatarSrc("");
      setIsAvatarLoaded(false);
      return;
    }

    const url = getAvatarUrl();
    
    if (url) {
      // اضافه کردن timestamp برای جلوگیری از کش
      const finalUrl = `${url}?t=${Date.now()}`;
      setAvatarSrc(finalUrl);
      
      // تست کردن آدرس
      const img = new Image();
      img.onload = () => {
        console.log("Avatar loaded successfully:", finalUrl);
        setIsAvatarLoaded(true);
      };
      img.onerror = () => {
        console.error("Avatar failed to load:", finalUrl);
        setIsAvatarLoaded(false);
        // تلاش با آدرس بدون timestamp
        const fallbackUrl = url;
        setAvatarSrc(fallbackUrl);
      };
      img.src = finalUrl;
    } else {
      setAvatarSrc("");
      setIsAvatarLoaded(false);
    }
  }, [user, getAvatarUrl]);

  // ====================== رندر مجدد بعد از لود کامل ======================
  useEffect(() => {
    if (!loading && user && !isAvatarLoaded) {
      const timer = setTimeout(() => {
        const url = getAvatarUrl();
        if (url) {
          setAvatarSrc(`${url}?t=${Date.now() + 1}`);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, isAvatarLoaded, getAvatarUrl]);

  // ====================== Sidebar ======================
  const updateSidebarMode = (sidebarSettings) => {
    updateSettings({
      layout1Settings: {
        leftSidebar: {
          ...sidebarSettings,
        },
      },
    });
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

  // ====================== Render ======================
  return (
    <TopbarRoot dir={i18n.language === "fa" ? "rtl" : "ltr"}>
      <TopbarContainer>
        {/* LEFT */}
        <Box display="flex">
          <StyledIconButton onClick={handleSidebarToggle}>
            <Menu />
          </StyledIconButton>
        </Box>

        {/* RIGHT */}
        <Box display="flex" alignItems="center">
          <MatxSearchBox />

          <NotificationProvider>
            <NotificationBar />
          </NotificationProvider>

          <ShoppingCart />

          <MatxMenu
            menuButton={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <Span>
                  {t("hi")}{" "}
                  <strong>{user?.name || "User"}</strong>
                </Span>

                {avatarSrc && isAvatarLoaded ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid white",
                      cursor: "pointer",
                    }}
                    onError={(e) => {
                      console.error("Img tag error:", avatarSrc);
                      e.target.style.display = "none";
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                
                <Avatar
                  sx={{
                    width: 42,
                    height: 42,
                    cursor: "pointer",
                    border: "2px solid white",
                    display: avatarSrc && isAvatarLoaded ? "none" : "flex",
                    bgcolor: "primary.dark",
                  }}
                >
                  <FaUserCircle size={26} />
                </Avatar>
              </div>
            }
          >
            {/* HOME */}
            <MenuItem>
              <Link
                to="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Home />
                <Span sx={{ marginInlineStart: 1 }}>
                  {t("home")}
                </Span>
              </Link>
            </MenuItem>

            {/* PROFILE */}
            <MenuItem
              onClick={() => navigate("/user/user-profile")}
            >
              <Person />
              <Span sx={{ marginInlineStart: 1 }}>
                {t("profile")}
              </Span>
            </MenuItem>

            {/* SETTINGS */}
            <MenuItem>
              <Link
                to="/settings"
                style={{
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Settings />
                <Span sx={{ marginInlineStart: 1 }}>
                  {t("settings")}
                </Span>
              </Link>
            </MenuItem>

            {/* LOGOUT */}
            <MenuItem onClick={logout}>
              <PowerSettingsNew />
              <Span sx={{ marginInlineStart: 1 }}>
                {t("logout")}
              </Span>
            </MenuItem>
          </MatxMenu>
        </Box>
      </TopbarContainer>
    </TopbarRoot>
  );
};

export default memo(Layout1Topbar);