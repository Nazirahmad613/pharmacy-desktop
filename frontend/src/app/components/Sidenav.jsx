import { Fragment, useMemo } from "react";
import Scrollbar from "react-perfect-scrollbar";
import styled from "@mui/material/styles/styled";

import { MatxVerticalNav } from "app/components";
import useSettings from "app/hooks/useSettings";
import { useTranslation } from "react-i18next";
import navigationsData from "app/navigations";

const StyledScrollBar = styled(Scrollbar)(() => ({
  paddingLeft: "1rem",
  paddingRight: "1rem",
  position: "relative",
  height: "100vh",
}));

export default function Sidenav({ children }) {
  const { settings } = useSettings();
  const { t } = useTranslation();

  // فقط ترجمه — بدون هیچ فیلتر role
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

  return (
    <Fragment>
      <StyledScrollBar options={{ suppressScrollX: true }}>
        {children}
        <MatxVerticalNav items={navigations} />
      </StyledScrollBar>
    </Fragment>
  );
}