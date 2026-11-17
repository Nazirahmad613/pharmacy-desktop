import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import useSettings from "app/hooks/useSettings";
import { useMemo } from "react";

export default function SidenavTheme({ children }) {
  const theme = useTheme();
  const { settings } = useSettings();
  const baseTheme =
    settings.themes[settings.layout1Settings.leftSidebar.theme] || theme;

  const lanternTheme = useMemo(
    () =>
      createTheme({
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          mode: "dark",
          background: {
            ...baseTheme.palette.background,
            default: "#1e293b", // آبی کبود تیره (Slate)
            paper: "#334155",   // آبی کبود روشن‌تر
          },
          text: {
            primary: "#ffffff",
            secondary: "rgba(255, 255, 255, 0.8)",
          },
          primary: {
            ...baseTheme.palette.primary,
            main: "#031240", // رنگ اکسنت آبی کبود
          },
        },
      }),
    [baseTheme]
  );

  return <ThemeProvider theme={lanternTheme}>{children}</ThemeProvider>;
}