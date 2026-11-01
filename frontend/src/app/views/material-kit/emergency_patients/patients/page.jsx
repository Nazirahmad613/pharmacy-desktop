"use client";

import { Box, Typography, Paper } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

export default function EmergencyPatientsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <GroupsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        مریضان اضطراری
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography color="text.secondary">
          لیست مریضان اضطراری — در حال آماده‌سازی
        </Typography>
      </Paper>
    </Box>
  );
}