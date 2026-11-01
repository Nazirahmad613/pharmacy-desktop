// src/app/material/emergency/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmergencyStatsCards from "./EmergencyStatsCards";
import PatientTable from "./PatientTable";
import TriagePriorityChip from "./TriagePriorityChip";

// داده نمونه — در پروژه واقعی از API می‌آید
const recentPatients = [
  {
    id: 1,
    caseNumber: "EMG-001",
    name: "احمد رضایی",
    age: "۴۵",
    chiefComplaint: "درد قفسه سینه",
    triageLevel: "critical",
    admissionTime: "۰۸:۳۰",
  },
  {
    id: 2,
    caseNumber: "EMG-002",
    name: "مریم حسینی",
    age: "۳۲",
    chiefComplaint: "تنگی نفس",
    triageLevel: "urgent",
    admissionTime: "۰۸:۴۵",
  },
  {
    id: 3,
    caseNumber: "EMG-003",
    name: "علی کریمی",
    age: "۲۸",
    chiefComplaint: "زخم سطحی",
    triageLevel: "non_urgent",
    admissionTime: "۰۹:۱۰",
  },
];

export default function EmergencyDashboardPage() {
  // ============================================================
  // ✅ تمام هوک‌ها بدون شرط در بالای کامپوننت تعریف می‌شوند
  // ============================================================
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // اطمینان از mount شدن در کلاینت (جلوگیری از خطای Hydration در Next.js)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // باز کردن مودال
  const handleOpenDialog = useCallback((patient) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  }, []);

  // بستن مودال — بدون setTimeout برای جلوگیری از خطای state update on unmounted
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // پاک‌سازی selectedPatient پس از پایان انیمیشن بستن
  // (با استفاده از onExited خود Dialog انجام می‌شود، نه setTimeout)
  const handleDialogExited = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  // ✅ return شرطی فقط بعد از تعریف تمام هوک‌ها
  if (!isMounted) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        🚨 داشبورد اضطراری
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        نمای کلی وضعیت بخش اورژانس
      </Typography>

      <EmergencyStatsCards />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              آخرین مریضان پذیرش‌شده
            </Typography>
            <PatientTable patients={recentPatients} onView={handleOpenDialog} />
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              توزیع اولویت‌ها
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TriagePriorityChip priority="critical" />
                <Typography fontWeight="bold">۳ نفر</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TriagePriorityChip priority="urgent" />
                <Typography fontWeight="bold">۵ نفر</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TriagePriorityChip priority="semi_urgent" />
                <Typography fontWeight="bold">۸ نفر</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TriagePriorityChip priority="non_urgent" />
                <Typography fontWeight="bold">۸ نفر</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ============================================================
          ✅ مودال با پراپ‌های اصلاح‌کننده خطای aria-hidden و focus
          ============================================================ */}
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
                <strong>نام:</strong> {selectedPatient.name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>شماره پرونده:</strong> {selectedPatient.caseNumber}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>سن:</strong> {selectedPatient.age}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>شکایت اصلی:</strong> {selectedPatient.chiefComplaint}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>زمان پذیرش:</strong> {selectedPatient.admissionTime}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <strong>اولویت:</strong>
                <TriagePriorityChip priority={selectedPatient.triageLevel} />
              </Box>
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