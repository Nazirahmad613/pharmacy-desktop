// src/app/material/emergency/admission/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  Tooltip,
} from "@mui/material";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { addAdmission, removeAdmission, updateAdmissionStatus } from "@/lib/emergencyStore";
import { useEmergencyAdmissions } from "@/lib/useEmergencyAdmissions";

const triageOptions = [
  { value: "critical", label: "بحرانی — نیاز فوری به معالجه", color: "error" },
  { value: "urgent", label: "فوری — نیاز به معالجه در اسرع وقت", color: "warning" },
  { value: "semi_urgent", label: "نیمه‌فوری — قابل تأخیر کوتاه", color: "info" },
  { value: "non_urgent", label: "غیرفوری — قابل تأخیر", color: "success" },
];

const statusOptions = [
  { value: "waiting", label: "در انتظار" },
  { value: "in_treatment", label: "زیر معالجه" },
  { value: "admitted", label: "بستر شده" },
  { value: "discharged", label: "ترخیص" },
];

const emptyForm = {
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  phone: "",
  chiefComplaint: "",
  triageLevel: "urgent",
};

const triageMeta = Object.fromEntries(triageOptions.map((o) => [o.value, o]));
const statusMeta = Object.fromEntries(statusOptions.map((o) => [o.value, o]));

export default function EmergencyAdmissionPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const admissions = useEmergencyAdmissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleOpenConfirm = useCallback(() => {
    if (!form.firstName || !form.lastName || !form.chiefComplaint) {
      setSnackbar({
        open: true,
        message: "لطفاً فیلدهای الزامی (نام، تخلص، شکایت اصلی) را پر کنید",
        severity: "error",
      });
      return;
    }
    setConfirmOpen(true);
  }, [form]);

  const handleCloseConfirm = useCallback(() => setConfirmOpen(false), []);

  const handleSubmit = useCallback(() => {
    addAdmission(form); // ← ذخیره‌ی واقعی
    setConfirmOpen(false);
    setForm(emptyForm);
    setSnackbar({ open: true, message: "مریض با موفقیت پذیرش شد", severity: "success" });
  }, [form]);

  const handleDelete = useCallback((id) => {
    removeAdmission(id);
    setSnackbar({ open: true, message: "رکورد حذف شد", severity: "info" });
  }, []);

  const handleStatusChange = useCallback((id, status) => {
    updateAdmissionStatus(id, status);
    setSnackbar({ open: true, message: "وضعیت به‌روزرسانی شد", severity: "success" });
  }, []);

  const stats = useMemo(() => {
    return {
      total: admissions.length,
      waiting: admissions.filter((a) => a.status === "waiting").length,
      critical: admissions.filter((a) => a.triageLevel === "critical").length,
    };
  }, [admissions]);

  if (!isMounted) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <AppRegistrationIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        پذیرش مریض اضطراری
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="نام" name="firstName" value={form.firstName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="تخلص" name="lastName" value={form.lastName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="سن" name="age" type="number" value={form.age} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="جنسیت" name="gender" value={form.gender} onChange={handleChange}>
              <MenuItem value="male">مذکر</MenuItem>
              <MenuItem value="female">مؤنث</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="شماره تماس" name="phone" value={form.phone} onChange={handleChange} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="شکایت اصلی" name="chiefComplaint" value={form.chiefComplaint} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth select label="سطح اولویت (Triage)" name="triageLevel" value={form.triageLevel} onChange={handleChange}>
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

      {/* لیست مریضان اضطراری ثبت‌شده */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">مریضان پذیرش‌شده</Typography>
          <Chip label={`مجموع: ${stats.total}`} />
          <Chip color="warning" label={`در انتظار: ${stats.waiting}`} />
          <Chip color="error" label={`بحرانی: ${stats.critical}`} />
        </Stack>

        {admissions.length === 0 ? (
          <Alert severity="info">هنوز مریضی پذیرش نشده است. فرم بالا را پر کنید.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد</TableCell>
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
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{a.firstName} {a.lastName}</TableCell>
                    <TableCell>
                      {a.age || "-"} / {a.gender === "male" ? "مذکر" : a.gender === "female" ? "مؤنث" : "-"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Tooltip title={a.chiefComplaint}><span>{a.chiefComplaint}</span></Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={triageMeta[a.triageLevel]?.color || "default"} label={triageMeta[a.triageLevel]?.label?.split(" — ")[0] || a.triageLevel} />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        sx={{ minWidth: 130 }}
                      >
                        {statusOptions.map((s) => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>{new Date(a.createdAt).toLocaleString("fa-IR")}</TableCell>
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
          <IconButton aria-label="close" onClick={handleCloseConfirm} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            آیا از پذیرش مریض <strong>{form.firstName} {form.lastName}</strong> با اولویت انتخاب‌شده اطمینان دارید؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} variant="outlined">انصراف</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">تأیید و ثبت</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}