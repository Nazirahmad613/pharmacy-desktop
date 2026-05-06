import { useMemo, useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { prefixer } from "stylis";

import useSettings from "app/hooks/useSettings";
import { useTranslation } from "react-i18next";
 

// 🔹 cache برای RTL
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

// 🔹 cache عادی
const cacheLtr = createCache({
  key: "muiltr",
});

export default function MatxTheme({ children }) {
  const { settings } = useSettings();
  const { i18n } = useTranslation();

  // 🔥 تعیین direction بر اساس زبان
  const direction = i18n.language === "fa" ? "rtl" : "ltr";

  // 🔥 ساخت theme داینامیک
  const theme = useMemo(() => {
    let baseTheme = settings.themes[settings.activeTheme];
    return {
      ...baseTheme,
      direction: direction,
    };
  }, [settings, direction]);

  // 🔥 تنظیم direction روی body
  useEffect(() => {
    document.body.dir = direction;
  }, [direction]);

  return (
    <CacheProvider value={direction === "rtl" ? cacheRtl : cacheLtr}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}