// src/app/material/emergency/treatment/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Grid, Paper, TextField, Button, Divider,
  List, ListItemButton, ListItemText, Alert, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
  CircularProgress, MenuItem, Stack, Chip, Card, CardContent,
  Tooltip, FormControlLabel, Checkbox, Avatar,
} from "@mui/material";
import HealingIcon from "@mui/icons-material/Healing";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import MedicationIcon from "@mui/icons-material/Medication";
import ScienceIcon from "@mui/icons-material/Science";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import TriagePriorityChip from "../TriagePriorityChip";
import { useAuth } from "app/contexts/AuthContext";

/* ============================================================
 *  تبدیل تاریخ شمسی (جلالی) ↔ میلادی ↔ ISO (افغانستان UTC+4:30)
 * ============================================================ */

const AF_TZ_OFFSET_MIN = 270; // UTC+4:30

const JALALI_MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

function toGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0, 31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    if (gd <= sal_a[gm]) break;
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
}

function isoToJalaliParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const af = new Date(d.getTime() + AF_TZ_OFFSET_MIN * 60 * 1000);
  const [jy, jm, jd] = toJalali(af.getUTCFullYear(), af.getUTCMonth() + 1, af.getUTCDate());
  return {
    jy, jm, jd,
    hour: af.getUTCHours(),
    minute: af.getUTCMinutes(),
  };
}

function jalaliPartsToIso({ jy, jm, jd, hour = 0, minute = 0 }) {
  const [gy, gm, gd] = toGregorian(Number(jy), Number(jm), Number(jd));
  const utcMs =
    Date.UTC(gy, gm - 1, gd, Number(hour), Number(minute), 0) -
    AF_TZ_OFFSET_MIN * 60 * 1000;
  return new Date(utcMs).toISOString();
}

function formatFaDateTime(iso) {
  const p = isoToJalaliParts(iso);
  if (!p) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.jy}/${pad(p.jm)}/${pad(p.jd)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/* ============================================================
 *  ثابت‌ها و پیکربندی نوع معالجه
 * ============================================================ */

const TREATMENT_TYPES = [
  { value: "medication",  label: "دارو",          color: "primary",   icon: <MedicationIcon fontSize="small" /> },
  { value: "procedure",   label: "پروسیجر",       color: "info",      icon: <LocalHospitalIcon fontSize="small" /> },
  { value: "surgery",     label: "جراحی",         color: "error",     icon: <HealingIcon fontSize="small" /> },
  { value: "observation", label: "مشاهده",        color: "warning",   icon: <VisibilityIcon fontSize="small" /> },
  { value: "referral",    label: "ارجاع",         color: "secondary", icon: <AssignmentTurnedInIcon fontSize="small" /> },
  { value: "lab",         label: "لابراتوار",     color: "success",   icon: <ScienceIcon fontSize="small" /> },
  { value: "imaging",     label: "تصویربرداری",  color: "default",   icon: <VisibilityIcon fontSize="small" /> },
  { value: "other",       label: "سایر",          color: "default",   icon: <HealingIcon fontSize="small" /> },
];

function nowJalaliParts() {
  return isoToJalaliParts(new Date().toISOString()) || { jy: 1403, jm: 1, jd: 1, hour: 12, minute: 0 };
}

const EMPTY_FORM = () => {
  const p = nowJalaliParts();
  return {
    treatment_type: "medication",
    title: "",
    description: "",
    jy: p.jy,
    jm: p.jm,
    jd: p.jd,
    hour: p.hour,
    minute: p.minute,
    is_billable: false,
  };
};

function extractError(err) {
  const data = err?.response?.data;
  if (data?.errors) {
    return Object.entries(data.errors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
      .join(" | ");
  }
  return data?.message || `HTTP ${err?.response?.status || ""} — خطای نامشخص`;
}

/* ============================================================
 *  کامپوننت اصلی
 * ============================================================ */

export default function EmergencyTreatmentPage() {
  const { api, user, loading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // دیالوگ‌ها
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => { setIsMounted(true); }, []);

  const caseIdOf = (p) => {
    if (!p) return null;
    return p.emergency_id ?? p.id ?? p.case_id ?? null;
  };

  const treatmentIdOf = (t) => t?.treatment_id ?? t?.id ?? null;

  const fetchActive = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/active");
      let list = [];
      if (Array.isArray(res?.data?.data)) list = res.data.data;
      else if (Array.isArray(res?.data)) list = res.data;
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
      setError(extractError(err));
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  const fetchTreatments = useCallback(async (caseId) => {
    if (!caseId) { setTreatments([]); return; }
    try {
      const res = await api.get("/emergency/treatments", { params: { case_id: caseId } });
      let list = [];
      if (Array.isArray(res?.data?.data)) list = res.data.data;
      else if (Array.isArray(res?.data)) list = res.data;
      setTreatments(list);
    } catch (err) {
      console.error("Failed to load treatments:", err?.response?.data || err);
      setTreatments([]);
    }
  }, [api]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchActive();
  }, [authLoading, user, fetchActive]);

  useEffect(() => {
    const id = caseIdOf(selectedPatient);
    if (id) fetchTreatments(id);
    else setTreatments([]);
  }, [selectedPatient, fetchTreatments]);

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setForm(EMPTY_FORM());
    setEditingId(null);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const handleOpenSaveDialog = useCallback(() => {
    if (!form.title.trim()) {
      setSnackbar({ open: true, message: "عنوان معالجه الزامی است", severity: "error" });
      return;
    }
    setSaveDialogOpen(true);
  }, [form.title]);

  const previewIso = useMemo(() => {
    try {
      return jalaliPartsToIso(form);
    } catch {
      return null;
    }
  }, [form]);

  const previewFa = previewIso ? formatFaDateTime(previewIso) : "—";

  // شروع حالت تصحیح
  const handleStartEdit = useCallback((treatment) => {
    const p = isoToJalaliParts(treatment.performed_at) || nowJalaliParts();
    setForm({
      treatment_type: treatment.treatment_type || "medication",
      title: treatment.title || "",
      description: treatment.description || "",
      jy: p.jy,
      jm: p.jm,
      jd: p.jd,
      hour: p.hour,
      minute: p.minute,
      is_billable: Boolean(treatment.is_billable),
    });
    setEditingId(treatmentIdOf(treatment));
    window.scrollTo({ top: 120, behavior: "smooth" });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM());
  }, []);

  // ثبت یا ویرایش
  const handleConfirmSave = useCallback(async () => {
    const caseId = caseIdOf(selectedPatient);
    if (!caseId) {
      setSnackbar({ open: true, message: "ابتدا یک مریض انتخاب کنید", severity: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        case_id: Number(caseId),
        treatment_type: form.treatment_type,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        performed_at: jalaliPartsToIso(form),
        is_billable: Boolean(form.is_billable),
      };

      if (editingId) {
        await api.put(`/emergency/treatments/${editingId}`, payload);
        setSnackbar({ open: true, message: "معالجه با موفقیت تصحیح شد", severity: "success" });
      } else {
        await api.post("/emergency/treatments", payload);
        setSnackbar({ open: true, message: "معالجه با موفقیت ثبت شد", severity: "success" });
      }

      setSaveDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM());
      await fetchTreatments(caseId);
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [api, selectedPatient, form, editingId, fetchTreatments]);

  // درخواست حذف
  const handlePromptDelete = useCallback((treatment) => {
    setItemToDelete(treatment);
    setDeleteDialogOpen(true);
  }, []);

  // تأیید حذف
  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const tid = treatmentIdOf(itemToDelete);
    const caseId = caseIdOf(selectedPatient);

    setDeleting(true);
    try {
      await api.delete(`/emergency/treatments/${tid}`);
      setSnackbar({ open: true, message: "معالجه با موفقیت حذف شد", severity: "success" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      if (editingId === tid) handleCancelEdit();
      await fetchTreatments(caseId);
    } catch (err) {
      setSnackbar({ open: true, message: extractError(err), severity: "error" });
    } finally {
      setDeleting(false);
    }
  }, [api, itemToDelete, selectedPatient, editingId, handleCancelEdit, fetchTreatments]);

  const patientName = (p) =>
    p?.patient_name || p?.patient?.name ||
    (p?.patient?.first_name || p?.first_name
      ? `${p.patient?.first_name || p.first_name || ""} ${p.patient?.last_name || p.last_name || ""}`.trim()
      : "نامشخص");

  if (!isMounted) return null;
  if (authLoading) return <Box display="flex" justifyContent="center" p={8}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: "rtl", maxWidth: 1400, mx: "auto" }}>
      {/* سربرگ اصلی */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
              <HealingIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">معالجه و تداوی اضطراری</Typography>
              <Typography variant="caption" color="text.secondary">مدیریت پروسیجرها، تجویزات و معاینات عاجل مریضان</Typography>
            </Box>
          </Stack>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchActive} disabled={loading} sx={{ borderRadius: 2 }}>
            بروزرسانی لست
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* ستون راست: لست مریضان فعال */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">مریضان فعال عاجل</Typography>
              <Chip label={`${patients.length} نفر`} size="small" color="primary" variant="outlined" />
            </Stack>

            {loading ? (
              <Box display="flex" justifyContent="center" py={6}><CircularProgress size={30} /></Box>
            ) : patients.length === 0 ? (
              <Box textAlign="center" py={6}>
                <PersonIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">مریض فعالی در بخش عاجل ثبت نیست.</Typography>
              </Box>
            ) : (
              <List sx={{ maxHeight: 680, overflowY: "auto", pr: 0.5 }}>
                {patients.map((p, idx) => {
                  const pid = caseIdOf(p);
                  const isSelected = pid != null && caseIdOf(selectedPatient) === pid;
                  return (
                    <ListItemButton
                      key={pid != null ? `case-${pid}` : `row-${idx}`}
                      onClick={() => handleSelectPatient(p)}
                      selected={isSelected}
                      sx={{
                        borderRadius: 2.5,
                        mb: 1.5,
                        p: 1.5,
                        border: "1px solid",
                        borderColor: isSelected ? "primary.main" : "transparent",
                        bgcolor: isSelected ? "action.selected" : "background.default",
                        transition: "all 0.2s",
                        "&:hover": { borderColor: "primary.light" },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight="bold">
                            {patientName(p)}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            پرونده: {p.emergency_no || p.emergency_id || (pid ? `#${pid}` : "—")}
                            {p.chief_complaint ? ` | ${p.chief_complaint}` : ""}
                          </Typography>
                        }
                      />
                      <TriagePriorityChip priority={p.triage_score ?? p.triage_level} />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* ستون چپ: جزئیات مریض، فرم ثبت/ویرایش و نمایش کارت‌های معالجه */}
        <Grid item xs={12} md={8}>
          {selectedPatient ? (
            <Stack spacing={3}>
              {/* خلاصه وضعیت مریض */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                      {patientName(selectedPatient)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      شماره دوسیه: <strong>{selectedPatient.emergency_no || selectedPatient.emergency_id || `#${caseIdOf(selectedPatient)}`}</strong>
                      {" | "}سن: {selectedPatient.patient_age ?? selectedPatient.patient?.age ?? "—"} سال
                      {" | "}شکایت اولیه: {selectedPatient.chief_complaint || "—"}
                    </Typography>
                  </Box>
                  <TriagePriorityChip priority={selectedPatient.triage_score ?? selectedPatient.triage_level} />
                </Stack>
              </Paper>

              {/* کارت فرم ثبت / ویرایش معالجه */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: editingId ? "primary.main" : "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold" color={editingId ? "primary.main" : "text.primary"}>
                    {editingId ? "✏️ تصحیح و ویرایش معالجه" : "➕ ثبت معالجه جدید"}
                  </Typography>
                  {editingId && (
                    <Button size="small" color="inherit" onClick={handleCancelEdit}>
                      انصراف از ویرایش
                    </Button>
                  )}
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select size="small" label="نوع معالجه" name="treatment_type" value={form.treatment_type} onChange={handleChange}>
                      {TREATMENT_TYPES.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {t.icon}
                            <span>{t.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.is_billable} onChange={handleChange} name="is_billable" color="primary" />}
                      label="شامل بل / قابل محاسبه مالی"
                    />
                  </Grid>

                  {/* فیلدهای زمان شمسی */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      زمان انجام معالجه (شمسی — به وقت افغانستان)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <TextField select size="small" label="روز" name="jd" value={form.jd} onChange={handleChange} sx={{ minWidth: 75 }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </TextField>
                      <TextField select size="small" label="ماه" name="jm" value={form.jm} onChange={handleChange} sx={{ minWidth: 110 }}>
                        {JALALI_MONTHS.map((m, i) => (
                          <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                        ))}
                      </TextField>
                      <TextField size="small" type="number" label="سال" name="jy" value={form.jy} onChange={handleChange} sx={{ minWidth: 95 }} inputProps={{ min: 1300, max: 1500 }} />
                      <TextField size="small" type="number" label="ساعت" name="hour" value={form.hour} onChange={handleChange} sx={{ minWidth: 75 }} inputProps={{ min: 0, max: 23 }} />
                      <TextField size="small" type="number" label="دقیقه" name="minute" value={form.minute} onChange={handleChange} sx={{ minWidth: 75 }} inputProps={{ min: 0, max: 59 }} />
                    </Stack>
                    <Typography variant="caption" sx={{ mt: 1, display: "inline-block", color: "primary.main" }}>
                      پیش‌نمایش زمان: {previewFa}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth required size="small" label="عنوان معالجه یا اقدام طبی" name="title" value={form.title} onChange={handleChange} placeholder="مثلاً: تطبیق سرم رینگر ۱۰۰۰ سی‌سی + پانسمان زخم" />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2.5} size="small" label="جزئیات و ملاحظات بیشتر (دوز، وضعیت مریض و...)" name="description" value={form.description} onChange={handleChange} />
                  </Grid>
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5, gap: 1 }}>
                  {editingId && (
                    <Button variant="outlined" color="inherit" onClick={handleCancelEdit}>
                      انصراف
                    </Button>
                  )}
                  <Button variant="contained" startIcon={<HealingIcon />} onClick={handleOpenSaveDialog} disabled={saving} sx={{ px: 3, borderRadius: 2 }}>
                    {editingId ? "ثبت تغییرات" : "ثبت نهایی معالجه"}
                  </Button>
                </Box>
              </Paper>

              {/* بخش نمایش معالجات ثبت‌شده به‌صورت کارت‌های شیک */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    معالجات ثبت‌شده برای این مریض
                  </Typography>
                  <Chip label={`${treatments.length} مورد`} size="small" variant="filled" />
                </Stack>

                {treatments.length === 0 ? (
                  <Box textAlign="center" py={6} sx={{ bgcolor: "background.default", borderRadius: 2 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">تا کنون هیچ معالجه‌ای برای این مریض درج نشده است.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {treatments.map((t) => {
                      const tid = treatmentIdOf(t);
                      const tConfig = TREATMENT_TYPES.find((x) => x.value === t.treatment_type) || {
                        label: t.treatment_type_label || t.treatment_type || "سایر",
                        color: "default",
                        icon: <HealingIcon fontSize="small" />,
                      };

                      return (
                        <Card
                          key={tid}
                          elevation={0}
                          sx={{
                            borderRadius: 2.5,
                            border: "1px solid",
                            borderColor: editingId === tid ? "primary.main" : "divider",
                            transition: "box-shadow 0.2s",
                            "&:hover": { boxShadow: 2 },
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Grid container alignItems="center" spacing={1}>
                              {/* عنوان و آیکن معالجه */}
                              <Grid item xs={12} sm={8}>
                                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                                  <Chip
                                    icon={tConfig.icon}
                                    label={tConfig.label}
                                    size="small"
                                    color={tConfig.color}
                                    variant="outlined"
                                    sx={{ fontWeight: "bold" }}
                                  />
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {t.title}
                                  </Typography>
                                  {t.is_billable && (
                                    <Chip label="شامل بل" size="small" color="success" sx={{ height: 20, fontSize: "0.7rem" }} />
                                  )}
                                </Stack>
                              </Grid>

                              {/* دکمه‌های تصحیح و حذف */}
                              <Grid item xs={12} sm={4}>
                                <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                                  <Tooltip title="تصحیح و ویرایش">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleStartEdit(t)}
                                      sx={{ bgcolor: "action.hover" }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="حذف معالجه">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handlePromptDelete(t)}
                                      sx={{ bgcolor: "action.hover" }}
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Grid>

                              {/* زمان ثبت معالجه */}
                              <Grid item xs={12}>
                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ color: "text.secondary", mt: 0.5 }}>
                                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                                  <Typography variant="caption">
                                    زمان انجام: {formatFaDateTime(t.performed_at)}
                                  </Typography>
                                </Stack>
                              </Grid>

                              {/* توضیحات در صورت وجود */}
                              {t.description && (
                                <Grid item xs={12}>
                                  <Box sx={{ mt: 1, p: 1.2, bgcolor: "background.default", borderRadius: 1.5, borderLeft: "3px solid", borderColor: "primary.light" }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {t.description}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            </Stack>
          ) : (
            <Paper elevation={0} sx={{ p: 8, borderRadius: 3, border: "1px dashed", borderColor: "divider", textAlign: "center" }}>
              <HealingIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">هیچ مریضی انتخاب نشده است</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                لطفاً از لیست سمت راست یک مریض فعال را جهت ثبت و مدیریت معالجات انتخاب کنید.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* مودال تأیید ذخیره / ویرایش */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 3, pl: 3, pt: 2.5 }}>
          {editingId ? "تأیید ویرایش معالجه" : "تأیید ثبت معالجه جدید"}
          <IconButton onClick={() => setSaveDialogOpen(false)} sx={{ position: "absolute", left: 10, top: 10 }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2"><strong>مریض:</strong> {patientName(selectedPatient)}</Typography>
            <Typography variant="body2"><strong>نوع معالجه:</strong> {TREATMENT_TYPES.find((t) => t.value === form.treatment_type)?.label}</Typography>
            <Typography variant="body2"><strong>عنوان:</strong> {form.title}</Typography>
            <Typography variant="body2"><strong>زمان:</strong> {previewFa}</Typography>
            {form.description && <Typography variant="body2"><strong>توضیحات:</strong> {form.description}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>انصراف</Button>
          <Button variant="contained" onClick={handleConfirmSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? "در حال ثبت..." : "تأیید"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* مودال تأیید حذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>حذف معالجه</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            آیا از حذف معالجه <strong>«{itemToDelete?.title}»</strong> اطمینان دارید؟ این عمل غیرقابل بازگشت است.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>انصراف</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting} startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}>
            {deleting ? "در حال حذف..." : "حذف قطعی"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* اسنک‌بار پیام‌ها */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={(_e, reason) => reason !== "clickaway" && setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}