import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import styled from "@mui/material/styles/styled";
import { useTranslation } from "react-i18next";
import { Small } from "./Typography";

// STYLED COMPONENT
const CustomLinearProgress = styled(LinearProgress)(() => ({
  borderRadius: 2,
  background: "rgba(0, 0, 0, 0.1)"
}));

export default function MatxProgressBar({
  text = "",
  value = 75,
  spacing = 2,
  color = "primary",
  coloredText = false
}) {
  const { t } = useTranslation(); // اضافه کردن ترجمه

  return (
    <Grid container spacing={spacing} alignItems="center">
      <Grid item xs={text ? 8 : 12}>
        <CustomLinearProgress color={color} value={value} variant="determinate" />
      </Grid>

      {text && (
        <Grid item xs={4}>
          <Typography color={color}>
            <Small sx={{ color: coloredText ? "auto" : "text.secondary" }}>
              {t(text)}
            </Small>
          </Typography>
        </Grid>
      )}
    </Grid>
  );
}
