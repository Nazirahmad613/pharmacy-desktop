// src/app/components/BackButton.jsx
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useBackNavigation from "../hooks/useBackNavigation";

export default function BackButton() {
  const { canGoBack, goBack } = useBackNavigation();

  if (!canGoBack) return null;

  return (
    <Tooltip title="بازگشت به صفحه قبلی">
      <IconButton onClick={goBack} size="small" aria-label="back">
        <ArrowBackIcon />
      </IconButton>
    </Tooltip>
  );
}