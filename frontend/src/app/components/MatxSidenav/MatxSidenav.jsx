import Box from "@mui/material/Box";
import styled from "@mui/material/styles/styled";
import useMediaQuery from "@mui/material/useMediaQuery";
import useTheme from "@mui/material/styles/useTheme";

// STYLED COMPONENTS
const SideNav = styled("div")(({ theme, width }) => ({
  zIndex: 91,
  width: width,
  overflow: "hidden",
  position: "relative",
  transition: "width 250ms ease",
  // پس‌زمینه تیره عمیق برای کنتراست با نور فانوس
  background: "linear-gradient(180deg, #1e293b 0%, #0f172a 55%, #020617 100%)",
  borderRight: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "6px 0 30px rgba(2, 6, 23, 0.8)",
  [theme.breakpoints.down("sm")]: {
    top: 0,
    left: 0,
    bottom: 0,
    position: "absolute",
  },
}));

const SideNavOverlay = styled("div")(() => ({
  zIndex: 90,
  width: "100%",
  height: "100%",
  position: "absolute",
  background: "rgba(2, 6, 23, 0.8)",
  backdropFilter: "blur(3px)",
}));

export default function MatxSidenav({
  sx,
  open,
  children,
  toggleSidenav,
  width = "240px",
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box height="100%" display="flex">
      <SideNav sx={sx} width={open || !isMobile ? width : "0px"}>
        {children}
      </SideNav>

      {open && isMobile && <SideNavOverlay onClick={toggleSidenav} />}
    </Box>
  );
}