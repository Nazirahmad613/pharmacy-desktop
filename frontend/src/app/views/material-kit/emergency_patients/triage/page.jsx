// src/app/material/emergency/triage/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Chip, Divider,
  Alert, Snackbar, CircularProgress, Stack, Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import TriagePriorityChip from "../TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

const priorities = [
  { value: 1, label: "بحرانی",   color: "error" },
  { value: 2, label: "فوری",     color: "warning" },
  { value: 3, label: "متوسط",    color: "info" },
  { value: 4, label: "کم",       color: "success" },
  { value: 5, label: "غیرفوری",  color: "default" },
];

export default function EmergencyTriagePage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/triage/queue");
      const payload = res?.data?.data || res?.data || [];
      setPatients(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Failed to load triage queue", err);
      setError(
        err?.response?.data?.message ||
        "خطا در دریافت صف تریاژ"
      );
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchQueue();
  }, [authLoading, user, fetchQueue]);

  const setPriority = useCallback(async (caseId, level) => {
    setSavingId(caseId);
    try {
      await api.put(`/emergency/triage/${caseId}`, { triage_level: level });
      setPatients((prev) =>
        prev.map((p) => (p.id === caseId ? { ...p, triage_level: level } : p))
      );
      setSnackbar({ open: true, message: "اولویت تعیین شد", severity: "success" });
    } catch (err) {
      console.error("Failed to set triage level", err);
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || "خطا در تعیین اولویت",
        severity: "error",
      });
    } finally {
      setSavingId(null);
    }
  }, [api]);

  const handleCloseSnackbar = useCallback((_e, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🚦 اولویت‌بندی مریضان (Triage)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            سطح فوریت هر مریض را تعیین کنید
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchQueue} disabled={loading}>
          بروزرسانی
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : patients.length === 0 ? (
        <Alert severity="info">صف تریاژ خالی است.</Alert>
      ) : (
        <Grid container spacing={2}>
          {patients.map((patient) => {
            const name =
              patient.patient?.name ||
              patient.patient_name ||
              (patient.patient?.first_name
                ? `${patient.patient.first_name} ${patient.patient.last_name || ""}`
                : "—");
            const age = patient.patient?.age ?? patient.age ?? "—";
            const caseNumber =
              patient.emergency_id || patient.case_number || `#${patient.id}`;

            return (
              <Grid item xs={12} md={6} lg={4} key={patient.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{name}</Typography>
                      {patient.triage_level && (
                        <TriagePriorityChip priority={patient.triage_level} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      پرونده: {caseNumber} | سن: {age}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      شکایت: {patient.chief_complaint || "—"}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      تعیین اولویت:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                      {priorities.map((p) => (
                        <Chip
                          key={p.value}
                          label={p.label}
                          color={p.color}
                          variant={Number(patient.triage_level) === p.value ? "filled" : "outlined"}
                          onClick={() => setPriority(patient.id, p.value)}
                          disabled={savingId === patient.id}
                          clickable
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}