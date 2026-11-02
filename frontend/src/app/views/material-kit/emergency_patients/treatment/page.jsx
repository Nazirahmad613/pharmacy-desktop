// src/app/material/emergency/treatment/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Paper, TextField, Button, Divider,
  List, ListItem, ListItemText, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
  CircularProgress, MenuItem, Stack,
} from "@mui/material";
import HealingIcon from "@mui/icons-material/Healing";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import TriagePriorityChip from "../TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

const TREATMENT_TYPES = [
  { value: "medication",  label: "دارو" },
  { value: "procedure",   label: "پروسیجر" },
  { value: "surgery",     label: "جراحی" },
  { value: "observation", label: "مشاهده" },
  { value: "referral",    label: "ارجاع" },
  { value: "lab",         label: "لابراتوار" },
  { value: "imaging",     label: "تصویربرداری" },
  { value: "other",       label: "سایر" },
];

const EMPTY_FORM = () => ({
  treatment_type: "medication",
  title: "",
  description: "",
  performed_at: new Date().toISOString().slice(0, 16),
  is_billable: false,
});

function extractError(err) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(" | ");
  return data?.message || "خطای نامشخص";
}

export default function EmergencyTreatmentPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const fetchActive = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/active");
      const payload = res?.data?.data || res?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      setPatients(list);
      if (!selectedPatient && list.length > 0) setSelectedPatient(list[0]);
    } catch (err) {
      setError(extractError(err));
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [api, user, selectedPatient]);

  const fetchTreatments = useCallback(async (caseId) => {
    if (!caseId) return;
    try {
      const res = await api.get("/emergency/treatments", { params: { case_id: caseId } });
      const list = res?.data?.data || [];
      setTreatments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load treatments", err);
      setTreatments([]);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (selectedPatient?.id) fetchTreatments(selectedPatient.id);
  }, [selectedPatient, fetchTreatments]);

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setForm(EMPTY_FORM());
  }, []);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleOpenSaveDialog = useCallback(() => {
    if (!form.title.trim()) {
      setSnackbar({ open: true, message: "عنوان معالجه الزامی است", severity: "error" });
      return;
    }
    setSaveDialogOpen(true);
  }, [form]);

  const handleCloseSaveDialog = useCallback(() => setSaveDialogOpen(false), []);

  const handleConfirmSave = useCallback(async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      await api.post("/emergency/treatments", {
        case_id: selectedPatient.id,
        ...form,
      });
      setSaveDialogOpen(false);
      setForm(EMPTY_FORM());
      setSnackbar({ open: true, message: "معالجه با موفقیت ثبت شد", severity: "success" });
      await fetchTreatments(selectedPatient.id);
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [api, selectedPatient, form, fetchTreatments]);

  const handleCloseSnackbar = useCallback((_e, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  const patientName = (p) => p?.patient?.name || p?.patient_name || "—";

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          <HealingIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          معالجه اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchActive} disabled={loading}>
          بروزرسانی
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>مریضان فعال</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}><CircularProgress size={24} /></Box>
            ) : patients.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                مریض فعالی وجود ندارد.
              </Typography>
            ) : (
              <List>
                {patients.map((p) => (
                  <ListItem key={p.id} onClick={() => handleSelectPatient(p)}
                    sx={{
                      borderRadius: 1, mb: 1, cursor: "pointer",
                      bgcolor: selectedPatient?.id === p.id ? "action.selected" : "transparent",
                    }}>
                    <ListItemText
                      primary={patientName(p)}
                      secondary={`${p.emergency_id || `#${p.id}`} — ${p.chief_complaint || ""}`}
                    />
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">{patientName(selectedPatient)}</Typography>
                  <TriagePriorityChip priority={selectedPatient.triage_level} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  پرونده: {selectedPatient.emergency_id || `#${selectedPatient.id}`} | سن: {selectedPatient.patient?.age ?? "—"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  شکایت اصلی: {selectedPatient.chief_complaint || "—"}
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ثبت معالجه جدید</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select size="small" label="نوع معالجه"
                      name="treatment_type" value={form.treatment_type} onChange={handleChange}>
                      {TREATMENT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" type="datetime-local" label="زمان انجام"
                      name="performed_at" value={form.performed_at} onChange={handleChange}
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth required size="small" label="عنوان معالجه"
                      name="title" value={form.title} onChange={handleChange}
                      placeholder="مثلاً: تزریق کتورولاک ۳۰ میلی‌گرم" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} size="small" label="توضیحات"
                      name="description" value={form.description} onChange={handleChange} />
                  </Grid>
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                  <Button variant="contained" startIcon={<HealingIcon />}
                    onClick={handleOpenSaveDialog} disabled={saving}>
                    ثبت معالجه
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>معالجات ثبت‌شده</Typography>
                {treatments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">معالجه‌ای ثبت نشده است.</Typography>
                ) : (
                  <List dense>
                    {treatments.map((t) => (
                      <ListItem key={t.id} divider>
                        <ListItemText
                          primary={`${t.title} (${t.treatment_type})`}
                          secondary={`${t.performed_at || ""} — ${t.description || ""}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            ) : (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  برای ثبت معالجه، یک مریض را از لیست انتخاب کنید.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={saveDialogOpen} onClose={handleCloseSaveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          تأیید ثبت معالجه
          <IconButton onClick={handleCloseSaveDialog} sx={{ position: "absolute", left: 8, top: 8 }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2"><strong>مریض:</strong> {patientName(selectedPatient)}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>نوع:</strong> {TREATMENT_TYPES.find(t => t.value === form.treatment_type)?.label}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>عنوان:</strong> {form.title}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>زمان:</strong> {form.performed_at}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseSaveDialog} disabled={saving}>انصراف</Button>
          <Button variant="contained" onClick={handleConfirmSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}>
            {saving ? "در حال ثبت..." : "تأیید و ثبت"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}