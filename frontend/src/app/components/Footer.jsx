import { useTranslation } from "react-i18next";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { ThemeProvider, styled, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import useSettings from "app/hooks/useSettings";
import { topBarHeight } from "app/utils/constant";

// STYLED COMPONENTS
const AppFooter = styled(Toolbar)(() => ({
  display: "flex",
  alignItems: "center",
  minHeight: topBarHeight,
  padding: "1rem 0",
  "@media (max-width: 499px)": {
    display: "table",
    width: "100%",
    minHeight: "auto",
    padding: "1rem",
    "& .container": {
      flexDirection: "column !important",
      gap: "1rem"
    }
  }
}));

const FooterContent = styled("div")(() => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "1.5rem",
  padding: "0px 1rem",
  maxWidth: "1170px",
  margin: "0 auto",
  "@media (max-width: 768px)": {
    flexDirection: "column",
    textAlign: "center"
  }
}));

const InfoItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  "& svg": {
    color: theme.palette.secondary.main,
    fontSize: "1.25rem"
  },
  "& a": {
    color: "inherit",
    textDecoration: "none",
    transition: "color 0.2s",
    "&:hover": {
      color: theme.palette.secondary.main
    }
  }
}));

export default function Footer() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const footerTheme = settings.themes[settings.footer.theme] || theme;

  // Hospital information
  const hospitalInfo = {
    name: "شفاخانهٔ معالجوی الفلاح",
    address: "کابل_افعانستان",
    phones: ["+93 78 123 4567", "+93 79 987 6543"],
    whatsapp: "+93 78 123 4567",
    email: "info@al-falahhospital.af"
  };

  return (
    <ThemeProvider theme={footerTheme}>
      <AppBar color="primary" position="static" sx={{ zIndex: 96 }}>
        <AppFooter>
          <FooterContent>
            {/* Hospital Name */}
            <Typography variant="h6" fontWeight="bold">
              {hospitalInfo.name}
            </Typography>

            {/* Address */}
            <InfoItem>
              <LocationOnIcon />
              <Typography variant="body2">{hospitalInfo.address}</Typography>
            </InfoItem>

            {/* Phone Numbers */}
            <Stack direction="row" spacing={1.5}>
              {hospitalInfo.phones.map((phone, idx) => (
                <InfoItem key={idx}>
                  <PhoneIcon />
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                </InfoItem>
              ))}
            </Stack>

            {/* WhatsApp */}
            <InfoItem>
              <WhatsAppIcon />
              <a
                href={`https://wa.me/${hospitalInfo.whatsapp.replace(/\s/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hospitalInfo.whatsapp}
              </a>
            </InfoItem>

            {/* Email */}
            <InfoItem>
              <EmailIcon />
              <a href={`mailto:${hospitalInfo.email}`}>{hospitalInfo.email}</a>
            </InfoItem>
          </FooterContent>
        </AppFooter>
      </AppBar>
    </ThemeProvider>
  );
}