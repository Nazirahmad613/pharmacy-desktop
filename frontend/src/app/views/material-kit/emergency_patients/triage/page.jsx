// src/app/material/emergency/triage/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import TriagePriorityChip from "../components/TriagePriorityChip";

const initialPatients = [
  { id: 1, caseNumber: "EMG-006", name: "حسن احمدی", age: "۶۲", chiefComplaint: "تنگی نفس شدید", currentPriority: null },
  { id: 2, caseNumber: "EMG-007", name: "زهرا کاظمی", age: "۳۵", chiefComplaint: "درد شکم", currentPriority: null },
  { id: 3, caseNumber: "EMG-008", name: "محمد جعفری", age: "۴۸", chiefComplaint: "سرگیجه و تهوع", currentPriority: null },
];

const priorities = [
  { value: "critical", label: "بحرانی", color: "error" },
  { value: "urgent", label: "فوری", color: "warning" },
  { value: "semi_urgent", label: "نیمه‌فوری", color: "info" },
  { value: "non_urgent", label: "غیرفوری", color: "success" },
];

export default function EmergencyTriagePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [patients, setPatients] = useState(initialPatients);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const setPriority = useCallback((patientId, priority) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, currentPriority: priority } : p))
    );
    setSnackbar({ open: true, message: "اولویت تعیین شد", severity: "success" });
  }, []);

  if (!isMounted) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        🚦 اولویت‌بندی مریضان (Triage)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        سطح فوریت هر مریض را تعیین کنید
      </Typography>

      <Grid container spacing={2}>
        {patients.map((patient) => (
          <Grid item xs={12} md={6} lg={4} key={patient.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{patient.name}</Typography>
                  {patient.currentPriority && <TriagePriorityChip priority={patient.currentPriority} />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  پرونده: {patient.caseNumber} | سن: {patient.age}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  شکایت: {patient.chiefComplaint}
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
                      variant={patient.currentPriority === p.value ? "filled" : "outlined"}
                      onClick={() => setPriority(patient.id, p.value)}
                      clickable
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}