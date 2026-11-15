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
  // گرادیانت آبی کبود (Slate) عمیق
  background: "linear-gradient(180deg, #334155 0%, #1e293b 55%, #0f172a 100%)",
  borderRight: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "6px 0 30px rgba(8, 15, 28, 0.65)",
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
  background: "rgba(15, 23, 42, 0.76)",
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