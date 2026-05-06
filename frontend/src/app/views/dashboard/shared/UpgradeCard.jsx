import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import { alpha, styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

// STYLED COMPONENTS
const CardRoot = styled(Card)(({ theme }) => ({
  marginBottom: "24px",
  padding: "24px !important",
  [theme.breakpoints.down("sm")]: { paddingLeft: "16px !important" }
}));

const StyledCard = styled(Card)(({ theme }) => ({
  boxShadow: "none",
  textAlign: "center",
  position: "relative",
  padding: "24px !important",
  backgroundColor: alpha(theme.palette.primary.main, 0.15),
  [theme.breakpoints.down("sm")]: { padding: "16px !important" }
}));

const Paragraph = styled("p")(({ theme }) => ({
  margin: 0,
  paddingTop: "24px",
  paddingBottom: "24px",
  color: theme.palette.text.secondary
}));

export default function UpgradeCard() {
  const { t } = useTranslation();

  return (
    <CardRoot>
      <StyledCard elevation={0}>
        <img src="/assets/images/illustrations/upgrade.svg" alt={t("upgrade")} />

        <Paragraph>
          {t("upgrade_message")}
        </Paragraph>

        <Button
          size="large"
          color="primary"
          variant="contained"
          sx={{ textTransform: "uppercase" }}>
          {t("upgrade_now")}
        </Button>
      </StyledCard>
    </CardRoot>
  );
}
