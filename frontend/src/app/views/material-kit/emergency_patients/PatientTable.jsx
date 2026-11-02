// src/app/material/emergency/components/EmergencyStatsCards.jsx
"use client";

import { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from "@mui/material";
import EmergencyIcon from "@mui/icons-material/Emergency";
import PeopleIcon from "@mui/icons-material/People";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import HealingIcon from "@mui/icons-material/Healing";
import { useAuth } from "app/contexts/AuthContext";

export default function EmergencyStatsCards() {
  const { api, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/emergency/statistics");
        if (!cancelled) setStats(res.data || {});
      } catch (e) {
        console.error("Failed to load emergency statistics", e);
        if (!cancelled) setStats({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, user]);

  const cards = [
    { title: "کل موارد",        value: stats?.total ?? "—",       icon: <PeopleIcon />,       color: "#1976d2" },
    { title: "در انتظار",        value: stats?.waiting ?? "—",     icon: <PriorityHighIcon />, color: "#ed6c02" },
    { title: "در حال معالجه",   value: stats?.in_treatment ?? "—",icon: <HealingIcon />,      color: "#2e7d32" },
    { title: "موارد بحرانی",    value: stats?.critical ?? "—",    icon: <EmergencyIcon />,    color: "#d32f2f" },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3} mb={2}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((stat) => (
        <Grid item xs={12} sm={6} md={3} key={stat.title}>
          <Card sx={{ borderLeft: `4px solid ${stat.color}` }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{stat.title}</Typography>
                  <Typography variant="h4" fontWeight="bold">{stat.value}</Typography>
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