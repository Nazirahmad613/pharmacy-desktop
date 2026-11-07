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

const NUMERIC_FIELDS = [
  "temperature", "heart_rate", "respiratory_rate",
  "oxygen_saturation", "blood_sugar", "pain_scale",
];

function extractError(err) {
  const data = err?.response?.data;
  if (data?.errors) {
    return Object.entries(data.errors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
      .join(" | ");
  }
  return data?.message || `HTTP ${err?.response?.status || ""} — خطای نامشخص`;
}

const patientName = (p) => {
  if (!p) return "—";
  if (p.patient_name) return p.patient_name;
  if (p.patient?.first_name || p.patient?.last_name) {
    return `${p.patient.first_name || ""} ${p.patient.last_name || ""}`.trim() || "—";
  }
  return "—";
};

const patientAge = (p) => p?.patient_age ?? p?.age_display ?? p?.patient?.age ?? "—";

const patientGenderLabel = (p) => {
  const g = p?.patient_gender ?? p?.patient?.gender ?? p?.gender;
  if (g === "Male" || g === "male") return "مذکر";
  if (g === "Female" || g === "female") return "مؤنث";
  return "—";
};

// ⚠️ نکته: case_id باید id واقعی جدول emergency_cases باشد (نه emergency_id)
// اگر بک‌اند id را برنمی‌گرداند، باید در بک‌اند اضافه شود.
const caseIdOf = (p) => {
  if (!p) return null;
  if (typeof p === "number" || typeof p === "string") return p;
  return (
    p.case_id ??      // اگر بک‌اند فرستاد
    p.id ??           // ⚠️ مهم‌ترین: id واقعی جدول
    p.emergency_id ?? // fallback (اگر emergency_id همان id است)
    null
  );
};

export default function EmergencyVitalsPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/emergency/active");
      let list = [];
      if (Array.isArray(res?.data?.data)) list = res.data.data;
      else if (Array.isArray(res?.data)) list = res.data;

      // ✅ لاگ تشخیصی: بررسی وجود id
      if (list.length > 0) {
        console.log("[vitals] first patient keys:", Object.keys(list[0]));
        console.log("[vitals] id?", list[0].id, "| emergency_id?", list[0].emergency_id);
      }

      setPatients(list);
      setSelectedPatient((prev) => {
        const prevId = caseIdOf(prev);
        if (prevId != null) {
          const found = list.find((x) => caseIdOf(x) === prevId);
          if (found) return found;
        }
        return list[0] || null;
      });
    } catch (err) {
      console.error("Failed to load active patients:", err?.response?.status, err?.response?.data || err);
      setPatients([]);
      setSelectedPatient(null);
      setSnackbar({ open: true, severity: "error", message: extractError(err) });
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  const fetchVitals = useCallback(async (caseId) => {
    if (!caseId) { setVitals([]); return; }
    setVitalsLoading(true);
    try {
      const res = await api.get("/emergency/vitals", { params: { case_id: caseId } });
      let list = [];
      if (Array.isArray(res?.data?.data)) list = res.data.data;
      else if (Array.isArray(res?.data)) list = res.data;
      setVitals(list);
    } catch (err) {
      console.error("Failed to load vitals:", err?.response?.status, err?.response?.data || err);
      setVitals([]);
    } finally {
      setVitalsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    const id = caseIdOf(selectedPatient);
    if (id) fetchVitals(id);
    else setVitals([]);
  }, [selectedPatient, fetchVitals]);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const caseId = caseIdOf(selectedPatient);
    if (!caseId) {
      setSnackbar({
        open: true,
        severity: "error",
        message: "شناسه پرونده اضطراری پیدا نشد. کنسول را بررسی کنید.",
      });
      return;
    }

    // ✅ اعتبارسنجی سمت کلاینت + تبدیل به عدد
    const payload = { case_id: Number(caseId) };
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === null || v === undefined) continue;
      if (NUMERIC_FIELDS.includes(k)) {
        const num = Number(v);
        if (Number.isNaN(num)) {
          setSnackbar({
            open: true,
            severity: "error",
            message: `مقدار فیلد ${k} عددی نیست.`,
          });
          return;
        }
        payload[k] = num;
      } else {
        payload[k] = v;
      }
    }

    // ✅ محدوده‌های بک‌اند را قبل از ارسال چک کن
    const ranges = {
      temperature: [25, 50],
      heart_rate: [20, 300],
      respiratory_rate: [5, 80],
      oxygen_saturation: [0, 100],
      blood_sugar: [0, 900],
      pain_scale: [0, 10],
    };
    for (const [field, [min, max]] of Object.entries(ranges)) {
      if (payload[field] != null && (payload[field] < min || payload[field] > max)) {
        setSnackbar({
          open: true,
          severity: "error",
          message: `مقدار ${field} باید بین ${min} و ${max} باشد.`,
        });
        return;
      }
    }

    console.log("[vitals] POST payload:", payload);

    setSaving(true);
    try {
      await api.post("/emergency/vitals", payload);
      setForm(EMPTY_FORM());
      setSnackbar({ open: true, message: "علائم حیاتی ثبت شد", severity: "success" });
      await fetchVitals(caseId);
    } catch (err) {
      const status = err?.response?.status;
      console.error("[vitals] POST failed:", status, err?.response?.data || err);
      setSnackbar({
        open: true,
        severity: "error",
        message: status === 500
          ? `خطای سرور (500): ${extractError(err)}`
          : extractError(err),
      });
    } finally {
      setSaving(false);
    }
  }, [api, selectedPatient, form, fetchVitals]);

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          <MonitorHeartIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          علائم حیاتی اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchPatients} disabled={loading}>
          بروزرسانی
        </Button>
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
                {patients.map((p, idx) => {
                  const pid = caseIdOf(p);
                  const safeKey = pid != null ? `case-${pid}` : `row-${idx}`;
                  const isSelected = pid != null && caseIdOf(selectedPatient) === pid;
                  return (
                    <ListItem
                      key={safeKey}
                      onClick={() => setSelectedPatient(p)}
                      sx={{
                        borderRadius: 1, mb: 1, cursor: "pointer",
                        bgcolor: isSelected ? "action.selected" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={patientName(p)}
                        secondary={
                          <>
                            {p.emergency_no || (pid != null ? `#${pid}` : "—")}
                            {" · "}
                            {patientAge(p)} / {patientGenderLabel(p)}
                          </>
                        }
                      />
                      <TriagePriorityChip priority={p.triage_score ?? p.triage_level} />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {selectedPatient ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {patientName(selectedPatient)}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({selectedPatient.emergency_no || `#${caseIdOf(selectedPatient) ?? "—"}`} — {patientAge(selectedPatient)} / {patientGenderLabel(selectedPatient)})
                  </Typography>
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="datetime-local" label="زمان ثبت" name="recorded_at"
                      value={form.recorded_at} onChange={handleChange} size="small"
                      InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="دما (°C)" name="temperature" type="number" inputProps={{ min: 25, max: 50, step: "0.1" }}
                      value={form.temperature} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="نبض (bpm)" name="heart_rate" type="number" inputProps={{ min: 20, max: 300 }}
                      value={form.heart_rate} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="فشار خون" name="blood_pressure" placeholder="120/80"
                      value={form.blood_pressure} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="تنفس" name="respiratory_rate" type="number" inputProps={{ min: 5, max: 80 }}
                      value={form.respiratory_rate} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="SpO₂ (%)" name="oxygen_saturation" type="number" inputProps={{ min: 0, max: 100 }}
                      value={form.oxygen_saturation} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="قند خون" name="blood_sugar" type="number" inputProps={{ min: 0, max: 900 }}
                      value={form.blood_sugar} onChange={handleChange} size="small" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth label="درد (0-10)" name="pain_scale" type="number" inputProps={{ min: 0, max: 10 }}
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

                {vitalsLoading ? (
                  <Box display="flex" justifyContent="center" p={2}><CircularProgress size={22} /></Box>
                ) : vitals.length === 0 ? (
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
                        {vitals.map((v, idx) => (
                          <TableRow key={v.id ?? `v-${idx}`}>
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

      <Snackbar open={snackbar.open} autoHideDuration={8000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}