import { Box, Typography } from "@mui/material";
import "./report-layout.css";

export default function ReportLayout({ title, children }) {
  return (
    <Box className="report-wrapper">
      {/* Header */}
      <Box className="report-header">
        <Typography variant="h5" className="report-title">
          {title}
        </Typography>
      </Box>

      {/* Content */}
      <Box className="report-content">
        {children}
      </Box>
    </Box>
  );
}