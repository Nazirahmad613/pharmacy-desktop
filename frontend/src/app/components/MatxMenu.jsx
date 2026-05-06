import { Fragment, useState, Children } from "react";
import Menu from "@mui/material/Menu";
import { ThemeProvider, styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import useSettings from "app/hooks/useSettings";

// STYLED COMPONENT
const MenuButton = styled("div")(({ theme }) => ({
  display: "inline-block",
  color: theme.palette.text.primary,
  "& div:hover": { backgroundColor: theme.palette.action.hover }
}));

export default function MatxMenu(props) {
  const { settings } = useSettings();
  const { t } = useTranslation(); // اضافه کردن ترجمه
  const [anchorEl, setAnchorEl] = useState(null);

  const children = Children.toArray(props.children);
  let { shouldCloseOnItemClick = true, horizontalPosition = "left" } = props;

  const handleClose = () => setAnchorEl(null);
  const handleClick = (event) => setAnchorEl(event.currentTarget);

  return (
    <Fragment>
      <MenuButton onClick={handleClick} aria-label={t("menu.open")}>
        {props.menuButton}
      </MenuButton>
      <ThemeProvider theme={settings.themes[settings.activeTheme]}>
        <Menu
          elevation={8}
          open={!!anchorEl}
          anchorEl={anchorEl}
          onClose={handleClose}
          getContentAnchorEl={null}
          anchorOrigin={{ vertical: "bottom", horizontal: horizontalPosition }}
          transformOrigin={{ vertical: "top", horizontal: horizontalPosition }}
          aria-label={t("menu.options")}>
          {children.map((child, index) => (
            <div
              onClick={shouldCloseOnItemClick ? handleClose : () => {}}
              key={index}
              aria-label={t("menu.item", { index: index + 1 })}>
              {child}
            </div>
          ))}
        </Menu>
      </ThemeProvider>
    </Fragment>
  );
}
