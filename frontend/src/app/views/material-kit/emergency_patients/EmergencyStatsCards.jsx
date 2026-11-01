// src/app/material/emergency/components/EmergencyStatsCards.jsx
"use client";

import { Grid, Card, CardContent, Typography, Box } from "@mui/material";
import EmergencyIcon from "@mui/icons-material/Emergency";
import PeopleIcon from "@mui/icons-material/People";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import HealingIcon from "@mui/icons-material/Healing";

const stats = [
  { title: "کل مریضان امروز", value: "۲۴", icon: <PeopleIcon />, color: "#1976d2" },
  { title: "در انتظار اولویت‌بندی", value: "۵", icon: <PriorityHighIcon />, color: "#ed6c02" },
  { title: "در حال معالجه", value: "۱۲", icon: <HealingIcon />, color: "#2e7d32" },
  { title: "موارد بحرانی", value: "۳", icon: <EmergencyIcon />, color: "#d32f2f" },
];

export default function EmergencyStatsCards() {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Grid item xs={12} sm={6} md={3} key={stat.title}>
          <Card sx={{ borderLeft: `4px solid ${stat.color}` }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Box sx={{ color: stat.color, fontSize: 40 }}>{stat.icon}</Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}