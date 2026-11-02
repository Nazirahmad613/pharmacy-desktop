// src/app/material/emergency/history/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, CircularProgress, Alert, Button, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Chip,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import TriagePriorityChip from "../components/TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

export default function EmergencyHistoryPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setIsMounted(true); }, []);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/history");
      const payload = res?.data?.data || res?.data || [];
      setRows(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch (err) {
      setError(err?.response?.data?.message || "خطا در دریافت تاریخچه");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          تاریخچه مریضان اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchHistory} disabled={loading}>
          بروزرسانی
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress size={24} /></Box>
        ) : rows.length === 0 ? (
          <Alert severity="info">تاریچه‌ای موجود نیست.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد</TableCell><TableCell>نام</TableCell><TableCell>شکایت</TableCell>
                  <TableCell>اولویت</TableCell><TableCell>وضعیت</TableCell>
                  <TableCell>زمان ورود</TableCell><TableCell>زمان ترخیص</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.emergency_id || `#${r.id}`}</TableCell>
                    <TableCell>{r.patient?.name || "—"}</TableCell>
                    <TableCell>{r.chief_complaint || "—"}</TableCell>
                    <TableCell><TriagePriorityChip priority={r.triage_level} /></TableCell>
                    <TableCell><Chip size="small" label={r.status} /></TableCell>
                    <TableCell>{r.arrival_at ? new Date(r.arrival_at).toLocaleString("fa-IR") : "—"}</TableCell>
                    <TableCell>{r.discharged_at ? new Date(r.discharged_at).toLocaleString("fa-IR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}