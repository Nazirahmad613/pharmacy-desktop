// src/app/material/emergency/patients/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Button, Stack,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "app/contexts/AuthContext";
import TriagePriorityChip from "../components/TriagePriorityChip";

export default function EmergencyPatientsPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setIsMounted(true); }, []);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/active");
      const payload = res?.data?.data || res?.data || [];
      setPatients(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Failed to load emergency patients", err);
      setError(err?.response?.data?.message || "خطا در دریافت لیست مریضان");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (!isMounted) return null;

  if (authLoading) {
    return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gutterBottom>
        <Typography variant="h4" fontWeight="bold">
          <GroupsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          مریضان اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPatients} disabled={loading}>
          بروزرسانی
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Paper sx={{ p: 3, mt: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress size={24} /></Box>
        ) : patients.length === 0 ? (
          <Alert severity="info">مریض فعالی در بخش اضطراری وجود ندارد.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد پرونده</TableCell>
                  <TableCell>نام مریض</TableCell>
                  <TableCell>سن</TableCell>
                  <TableCell>شکایت اصلی</TableCell>
                  <TableCell>اولویت</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((p) => {
                  const name = p.patient?.name || p.patient_name ||
                    (p.patient?.first_name ? `${p.patient.first_name} ${p.patient.last_name || ""}` : "—");
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>{p.emergency_id || p.case_number || `#${p.id}`}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell>{p.patient?.age ?? p.age ?? "—"}</TableCell>
                      <TableCell>{p.chief_complaint || "—"}</TableCell>
                      <TableCell><TriagePriorityChip priority={p.triage_level} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}