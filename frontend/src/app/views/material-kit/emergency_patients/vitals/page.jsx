// src/app/material/emergency/vitals/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Paper, TextField, Button, Divider,
  List, ListItem, ListItemText, Alert, Snackbar, Stack,
  CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
} from "@mui/material";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import RefreshIcon from "@mui/icons-material/Refresh";
import TriagePriorityChip from "../TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

const EMPTY_FORM = () => ({
  recorded_at: new Date().toISOString().slice(0, 16),
  temperature: "", heart_rate: "", blood_pressure: "", respiratory_rate: "",
  oxygen_saturation: "", blood_sugar: "", pain_scale: "", notes: "",
});

function extractError(err) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(" | ");
  return data?.message || "خطای نامشخص";
}

export default function EmergencyVitalsPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/emergency/active");
      const list = res?.data?.data || [];
      setPatients(Array.isArray(list) ? list : []);
      if (!selectedPatient && list.length > 0) setSelectedPatient(list[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, user, selectedPatient]);

  const fetchVitals = useCallback(async (caseId) => {
    if (!caseId) return;
    try {
      const res = await api.get("/emergency/vitals", { params: { case_id: caseId } });
      setVitals(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      setVitals([]);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => { if (selectedPatient?.id) fetchVitals(selectedPatient.id); }, [selectedPatient, fetchVitals]);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const payload = { case_id: selectedPatient.id };
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== null) payload[k] = v;
      });
      await api.post("/emergency/vitals", payload);
      setForm(EMPTY_FORM());
      setSnackbar({ open: true, message: "علائم حیاتی ثبت شد", severity: "success" });
      await fetchVitals(selectedPatient.id);
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [api, selectedPatient, form, fetchVitals]);

  const patientName = (p) => p?.patient?.name || "—";

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          <MonitorHeartIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          علائم حیاتی اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPatients} disabled={loading}>بروزرسانی</Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>مریضان فعال</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}><CircularProgress size={24} /></Box>
            ) : patients.length === 0 ? (
              <Typography variant="body2" color="text.secondary">مریض فعالی وجود ندارد.</Typography>
            ) : (
              <List>
                {patients.map((p) => (
                  <ListItem key={p.id} onClick={() => setSelectedPatient(p)}
                    sx={{ borderRadius: 1, mb: 1, cursor: "pointer",
                      bgcolor: selectedPatient?.id === p.id ? "action.selected" : "transparent" }}>
                    <ListItemText primary={patientName(p)} secondary={p.emergency_id || `#${p.id}`} />
                    <TriagePriorityChip priority={p.triage_level} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {selectedPatient ? (
              <>
                <Typography variant="h6" gutterBottom>{patientName(selectedPatient)}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="datetime-local" label="زمان ثبت" name="recorded_at"
                      value={form.recorded_at} onChange={handleChange} size="small"
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="دما (°C)" name="temperature" type="number"
                      value={form.temperature} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="نبض (bpm)" name="heart_rate" type="number"
                      value={form.heart_rate} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="فشار خون" name="blood_pressure" placeholder="120/80"
                      value={form.blood_pressure} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="تنفس" name="respiratory_rate" type="number"
                      value={form.respiratory_rate} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="SpO₂ (%)" name="oxygen_saturation" type="number"
                      value={form.oxygen_saturation} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="قند خون" name="blood_sugar" type="number"
                      value={form.blood_sugar} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="درد (0-10)" name="pain_scale" type="number"
                      value={form.pain_scale} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="یادداشت" name="notes"
                      value={form.notes} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" onClick={handleSubmit} disabled={saving}
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <MonitorHeartIcon />}>
                      {saving ? "در حال ثبت..." : "ثبت علائم"}
                    </Button>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>سابقه ثبت‌شده</Typography>
                {vitals.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">هنوز علائمی ثبت نشده است.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>زمان</TableCell><TableCell>دما</TableCell><TableCell>نبض</TableCell>
                          <TableCell>فشار</TableCell><TableCell>تنفس</TableCell><TableCell>SpO₂</TableCell>
                          <TableCell>قند</TableCell><TableCell>درد</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vitals.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{v.recorded_at ? new Date(v.recorded_at).toLocaleString("fa-IR") : "—"}</TableCell>
                            <TableCell>{v.temperature ?? "—"}</TableCell>
                            <TableCell>{v.heart_rate ?? "—"}</TableCell>
                            <TableCell>{v.blood_pressure ?? "—"}</TableCell>
                            <TableCell>{v.respiratory_rate ?? "—"}</TableCell>
                            <TableCell>{v.oxygen_saturation ?? "—"}</TableCell>
                            <TableCell>{v.blood_sugar ?? "—"}</TableCell>
                            <TableCell>{v.pain_scale ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
                یک مریض را انتخاب کنید.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}