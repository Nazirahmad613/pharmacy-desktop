// src/app/material/emergency/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, Alert,
  Chip, Stack, Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import EmergencyStatsCards from "./EmergencyStatsCards";
import PatientTable from "./PatientTable";
import TriagePriorityChip from "./TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

const STATUS_LABEL = {
  waiting: "در انتظار",
  in_triage: "در تریاژ",
  in_treatment: "زیر معالجه",
  admitted: "بستری",
  discharged: "ترخیص",
  completed: "تکمیل",
  cancelled: "لغو",
};

export default function EmergencyDashboardPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const fetchActive = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/active");
      const payload = res?.data?.data || res?.data || [];
      setPatients(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Failed to load active emergencies", err);
      setError(
        err?.response?.data?.message ||
        "خطا در دریافت لیست مریضان اضطراری"
      );
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchActive();
  }, [authLoading, user, fetchActive]);

  const handleOpenDialog = useCallback((patient) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleDialogExited = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="warning">لطفاً ابتدا وارد سیستم شوید.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🚨 داشبورد اضطراری
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نمای کلی وضعیت بخش اورژانس
          </Typography>
        </Box>
        <IconButton onClick={fetchActive} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      <EmergencyStatsCards />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              آخرین مریضان فعال
            </Typography>
            <PatientTable
              patients={patients}
              loading={loading}
              onView={handleOpenDialog}
              onTreat={handleOpenDialog}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              توزیع اولویت‌ها (فعال)
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              {[1, 2, 3, 4, 5].map((lvl) => {
                const count = patients.filter((p) => Number(p.triage_level) === lvl).length;
                return (
                  <Box
                    key={lvl}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <TriagePriorityChip priority={lvl} />
                    <Typography fontWeight="bold">{count} نفر</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        aria-labelledby="patient-detail-dialog-title"
        disableRestoreFocus
        closeAfterTransition={false}
        onExited={handleDialogExited}
      >
        <DialogTitle id="patient-detail-dialog-title" sx={{ pr: 6 }}>
          جزئیات مریض
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedPatient ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>شماره پرونده:</strong>{" "}
                {selectedPatient.emergency_id || selectedPatient.case_number || `#${selectedPatient.id}`}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>نام:</strong>{" "}
                {selectedPatient.patient?.name ||
                  selectedPatient.patient_name ||
                  (selectedPatient.patient?.first_name
                    ? `${selectedPatient.patient.first_name} ${selectedPatient.patient.last_name || ""}`
                    : "—")}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>سن:</strong>{" "}
                {selectedPatient.patient?.age ?? selectedPatient.age ?? "—"}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>شکایت اصلی:</strong>{" "}
                {selectedPatient.chief_complaint || "—"}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>زمان پذیرش:</strong>{" "}
                {selectedPatient.arrival_at
                  ? new Date(selectedPatient.arrival_at).toLocaleString("fa-IR")
                  : "—"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <strong>اولویت:</strong>
                <TriagePriorityChip priority={selectedPatient.triage_level} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <strong>وضعیت:</strong>
                <Chip
                  size="small"
                  label={STATUS_LABEL[selectedPatient.status] || selectedPatient.status || "—"}
                />
              </Box>
              {selectedPatient.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>یادداشت:</strong> {selectedPatient.notes}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            <Typography>در حال بارگذاری...</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            بستن
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}