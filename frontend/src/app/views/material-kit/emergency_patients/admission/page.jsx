// src/app/material/emergency/admission/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, IconButton, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Stack, Tooltip, CircularProgress,
} from "@mui/material";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "app/contexts/AuthContext";
import TriagePriorityChip from "../TriagePriorityChip";

// ✅ triage_score عددی — مطابق بک‌اند (1..5)
const triageOptions = [
  { value: 1, label: "بحرانی — نیاز فوری به معالجه" },
  { value: 2, label: "فوری — نیاز به معالجه در اسرع وقت" },
  { value: 3, label: "نیمه‌فوری — قابل تأخیر کوتاه" },
  { value: 4, label: "غیرفوری — قابل تأخیر" },
];

// ✅ وضعیت‌ها — مطابق migration جدید emergency_cases
const statusOptions = [
  { value: "waiting",       label: "در انتظار" },
  { value: "in_triage",     label: "در حال تریاژ" },
  { value: "in_treatment",  label: "زیر معالجه" },
  { value: "admitted",      label: "بستر شده" },
  { value: "discharged",    label: "ترخیص" },
  { value: "transferred",   label: "منتقل شده" },
];

const emptyForm = {
  firstName: "", lastName: "", age: "", gender: "", phone: "",
  chiefComplaint: "", triageScore: 2,
};

// ✅ استخراج خطای دقیق شامل نام فیلد
function extractError(err) {
  const data = err?.response?.data;
  if (data?.errors) {
    return Object.entries(data.errors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
      .join(" | ");
  }
  return data?.message || "خطای نامشخص در ارتباط با سرور";
}

// ✅ نام کامل مریض از first_name + last_name
const patientName = (p) => {
  if (!p) return "—";
  if (p.patient?.first_name || p.patient?.last_name) {
    return `${p.patient.first_name || ""} ${p.patient.last_name || ""}`.trim() || "—";
  }
  if (p.first_name || p.last_name) {
    return `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—";
  }
  return p.patient_name || "—";
};

const patientAge = (p) =>
  p?.patient?.age ?? p?.patient_age ?? p?.age ?? "—";

const patientGenderLabel = (p) => {
  const g = p?.patient?.gender ?? p?.patient_gender ?? p?.gender;
  if (g === "Male" || g === "male") return "مذکر";
  if (g === "Female" || g === "female") return "مؤنث";
  return "—";
};

export default function EmergencyAdmissionPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const fetchAdmissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/emergency/active");
      const payload = res?.data?.data || res?.data || [];
      setAdmissions(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Failed to load admissions", err);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchAdmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleOpenConfirm = useCallback(() => {
    // ✅ lastName در بک‌اند nullable است — حذف از فیلدهای الزامی
    if (!form.firstName || !form.chiefComplaint) {
      setSnackbar({ open: true, message: "لطفاً نام و شکایت اصلی را پر کنید", severity: "error" });
      return;
    }
    setConfirmOpen(true);
  }, [form]);

  const handleCloseConfirm = useCallback(() => setConfirmOpen(false), []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      // ✅ ارسال triage_score (نه triage_level) — مطابق بک‌اند
      await api.post("/emergency/admit", {
        first_name:      form.firstName,
        last_name:       form.lastName || null,
        age:             form.age ? Number(form.age) : null,
        gender:          form.gender || null,
        phone:           form.phone || null,
        chief_complaint: form.chiefComplaint,
        triage_score:    Number(form.triageScore),
      });
      setConfirmOpen(false);
      setForm(emptyForm);
      setSnackbar({ open: true, message: "مریض با موفقیت پذیرش شد", severity: "success" });
      await fetchAdmissions();
    } catch (err) {
      console.error("Failed to create admission:", err);
      console.error("Full error payload:", JSON.stringify(err?.response?.data, null, 2));
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [api, form, fetchAdmissions]);

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/emergency/${id}`);
      setSnackbar({ open: true, message: "رکورد حذف شد", severity: "info" });
      await fetchAdmissions();
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    }
  }, [api, fetchAdmissions]);

  const handleStatusChange = useCallback(async (id, status) => {
    try {
      if (status === "discharged")      await api.post(`/emergency/${id}/discharge`);
      else if (status === "admitted")   await api.post(`/emergency/${id}/admit`);
      else                              await api.put(`/emergency/${id}`, { status });
      setSnackbar({ open: true, message: "وضعیت به‌روزرسانی شد", severity: "success" });
      await fetchAdmissions();
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    }
  }, [api, fetchAdmissions]);

  const stats = useMemo(() => ({
    total:    admissions.length,
    waiting:  admissions.filter((a) => (a.status || "waiting") === "waiting").length,
    critical: admissions.filter((a) => Number(a.triage_score) === 1).length,
  }), [admissions]);

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gutterBottom>
        <Typography variant="h4" fontWeight="bold">
          <AppRegistrationIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          پذیرش مریض اضطراری
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAdmissions} disabled={loading}>
          بروزرسانی
        </Button>
      </Stack>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="نام" name="firstName" value={form.firstName} onChange={handleChange} required size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="تخلص" name="lastName" value={form.lastName} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="سن" name="age" type="number" value={form.age} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="جنسیت" name="gender" value={form.gender} onChange={handleChange} size="small">
              <MenuItem value="Male">مذکر</MenuItem>
              <MenuItem value="Female">مؤنث</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="شماره تماس" name="phone" value={form.phone} onChange={handleChange} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="شکایت اصلی" name="chiefComplaint" value={form.chiefComplaint} onChange={handleChange} required size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth select label="سطح اولویت (Triage)" name="triageScore" value={form.triageScore} onChange={handleChange} size="small">
              {triageOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" size="large" startIcon={<AppRegistrationIcon />} onClick={handleOpenConfirm}>
              ثبت پذیرش
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">مریضان پذیرش‌شده</Typography>
          <Chip label={`مجموع: ${stats.total}`} />
          <Chip color="warning" label={`در انتظار: ${stats.waiting}`} />
          <Chip color="error" label={`بحرانی: ${stats.critical}`} />
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress size={24} /></Box>
        ) : admissions.length === 0 ? (
          <Alert severity="info">هنوز مریضی پذیرش نشده است.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد پرونده</TableCell>
                  <TableCell>نام</TableCell>
                  <TableCell>سن/جنسیت</TableCell>
                  <TableCell>شکایت</TableCell>
                  <TableCell>اولویت</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>زمان ثبت</TableCell>
                  <TableCell align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admissions.map((a) => (
                  <TableRow key={a.id} hover>
                    {/* ✅ emergency_no به‌جای emergency_id */}
                    <TableCell>{a.emergency_no || `#${a.id}`}</TableCell>

                    {/* ✅ نام کامل از first_name/last_name */}
                    <TableCell>{patientName(a)}</TableCell>

                    <TableCell>
                      {patientAge(a)} / {patientGenderLabel(a)}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Tooltip title={a.chief_complaint || ""}><span>{a.chief_complaint || "—"}</span></Tooltip>
                    </TableCell>

                    {/* ✅ triage_score عددی */}
                    <TableCell><TriagePriorityChip priority={a.triage_score} /></TableCell>

                    <TableCell>
                      <TextField select size="small" value={a.status || "waiting"}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)} sx={{ minWidth: 130 }}>
                        {statusOptions.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                      </TextField>
                    </TableCell>

                    {/* ✅ arrival_time به‌جای arrival_at */}
                    <TableCell>{a.arrival_time ? new Date(a.arrival_time).toLocaleString("fa-IR") : "—"}</TableCell>

                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={confirmOpen} onClose={handleCloseConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          تأیید پذیرش
          <IconButton onClick={handleCloseConfirm} sx={{ position: "absolute", right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            آیا از پذیرش مریض <strong>{form.firstName} {form.lastName}</strong> با اولویت انتخاب‌شده اطمینان دارید؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} variant="outlined" disabled={saving}>انصراف</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}>
            {saving ? "در حال ثبت..." : "تأیید و ثبت"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={8000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}