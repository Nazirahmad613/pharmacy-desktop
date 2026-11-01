// src/app/material/emergency/admission/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import CloseIcon from "@mui/icons-material/Close";

const triageOptions = [
  { value: "critical", label: "بحرانی — نیاز فوری به معالجه" },
  { value: "urgent", label: "فوری — نیاز به معالجه در اسرع وقت" },
  { value: "semi_urgent", label: "نیمه‌فوری — قابل تأخیر کوتاه" },
  { value: "non_urgent", label: "غیرفوری — قابل تأخیر" },
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

export default function EmergencyAdmissionPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleOpenConfirm = useCallback(() => {
    if (!form.firstName || !form.lastName || !form.chiefComplaint) {
      setSnackbar({ open: true, message: "لطفاً فیلدهای الزامی (نام، تخلص، شکایت اصلی) را پر کنید", severity: "error" });
      return;
    }
    setConfirmOpen(true);
  }, [form]);

  const handleCloseConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const handleConfirmExited = useCallback(() => {
    // پاک‌سازی در صورت نیاز
  }, []);

  const handleSubmit = useCallback(() => {
    // در پروژه واقعی: ارسال به API
    console.log("Admission data:", form);
    setConfirmOpen(false);
    setForm(emptyForm);
    setSnackbar({ open: true, message: "مریض با موفقیت پذیرش شد", severity: "success" });
  }, [form]);

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

      <Dialog
        open={confirmOpen}
        onClose={handleCloseConfirm}
        maxWidth="xs"
        fullWidth
        aria-labelledby="confirm-admission-dialog-title"
        disableRestoreFocus
        closeAfterTransition={false}
        onExited={handleConfirmExited}
      >
        <DialogTitle id="confirm-admission-dialog-title" sx={{ pr: 6 }}>
          تأیید پذیرش
          <IconButton
            aria-label="close"
            onClick={handleCloseConfirm}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
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