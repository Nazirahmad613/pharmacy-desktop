// src/app/material/emergency/treatment/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import HealingIcon from "@mui/icons-material/Healing";
import CloseIcon from "@mui/icons-material/Close";
import TriagePriorityChip from "../components/TriagePriorityChip";

const patientsForTreatment = [
  { id: 1, caseNumber: "EMG-001", name: "احمد رضایی", age: "۴۵", chiefComplaint: "درد قفسه سینه", triageLevel: "critical" },
  { id: 2, caseNumber: "EMG-002", name: "مریم حسینی", age: "۳۲", chiefComplaint: "تنگی نفس", triageLevel: "urgent" },
];

export default function EmergencyTreatmentPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(patientsForTreatment[0]);
  const [notes, setNotes] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setNotes("");
  }, []);

  const handleOpenSaveDialog = useCallback(() => {
    if (!notes.trim()) {
      setSnackbar({ open: true, message: "لطفاً یادداشت معالجه را وارد کنید", severity: "error" });
      return;
    }
    setSaveDialogOpen(true);
  }, [notes]);

  const handleCloseSaveDialog = useCallback(() => {
    setSaveDialogOpen(false);
  }, []);

  const handleDialogExited = useCallback(() => {
    // پاک‌سازی در صورت نیاز
  }, []);

  const handleConfirmSave = useCallback(() => {
    // در پروژه واقعی: ارسال به API
    console.log("Treatment notes for", selectedPatient.id, ":", notes);
    setSaveDialogOpen(false);
    setNotes("");
    setSnackbar({ open: true, message: "یادداشت معالجه ذخیره شد", severity: "success" });
  }, [notes, selectedPatient]);

  const handleCloseSnackbar = useCallback((event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  if (!isMounted) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <HealingIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        معالجه اضطراری
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>مریضان در انتظار معالجه</Typography>
            <List>
              {patientsForTreatment.map((p) => (
                <ListItem
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    cursor: "pointer",
                    bgcolor: selectedPatient?.id === p.id ? "action.selected" : "transparent",
                  }}
                >
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.caseNumber} — ${p.chiefComplaint}`}
                  />
                  <TriagePriorityChip priority={p.triageLevel} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {selectedPatient ? (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">{selectedPatient.name}</Typography>
                  <TriagePriorityChip priority={selectedPatient.triageLevel} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  پرونده: {selectedPatient.caseNumber} | سن: {selectedPatient.age}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  شکایت اصلی: {selectedPatient.chiefComplaint}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="یادداشت معالجه / دستورات درمانی"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تشخیص، داروهای تجویز شده، اقدامات انجام شده..."
                />
                <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                  <Button variant="contained" color="primary" onClick={handleOpenSaveDialog}>
                    ثبت معالجه
                  </Button>
                  <Button variant="outlined" color="inherit">
                    ارجاع به بخش
                  </Button>
                </Box>
              </>
            ) : (
              <Typography color="text.secondary">مریضی انتخاب نشده است</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={saveDialogOpen}
        onClose={handleCloseSaveDialog}
        maxWidth="xs"
        fullWidth
        aria-labelledby="confirm-treatment-dialog-title"
        disableRestoreFocus
        closeAfterTransition={false}
        onExited={handleDialogExited}
      >
        <DialogTitle id="confirm-treatment-dialog-title" sx={{ pr: 6 }}>
          تأیید ثبت معالجه
          <IconButton
            aria-label="close"
            onClick={handleCloseSaveDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            آیا از ثبت یادداشت معالجه برای مریض <strong>{selectedPatient?.name}</strong> اطمینان دارید؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog} variant="outlined">انصراف</Button>
          <Button onClick={handleConfirmSave} variant="contained" color="primary">تأیید و ثبت</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}