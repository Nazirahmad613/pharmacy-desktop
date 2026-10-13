// src/app/routes/payroll/SalaryPayment.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  InputAdornment,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PrintIcon from "@mui/icons-material/Print";

const MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

export default function SalaryPayment() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[4]);
  const [selectedYear, setSelectedYear] = useState("1403");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });

  useEffect(() => {
    // TODO: API واقعی
    setTimeout(() => {
      setEmployees([
        { id: 1, fullName: "احمد رضایی", department: "لابراتوار", baseSalary: 35000, allowances: 5000, deductions: 2000, advance: 0, paid: false },
        { id: 2, fullName: "فاطمه احمدی", department: "دواخانه", baseSalary: 42000, allowances: 6000, deductions: 3000, advance: 5000, paid: false },
        { id: 3, fullName: "محمد کریمی", department: "رادیولوژی", baseSalary: 38000, allowances: 4500, deductions: 2500, advance: 0, paid: true },
        { id: 4, fullName: "زهرا نوری", department: "استقبال", baseSalary: 32000, allowances: 3000, deductions: 1500, advance: 0, paid: false },
        { id: 5, fullName: "علی حسینی", department: "مدیریت", baseSalary: 55000, allowances: 10000, deductions: 4000, advance: 10000, paid: false },
      ]);
    }, 500);
  }, []);

  const departments = ["all", ...new Set(employees.map((e) => e.department))];

  const formatCurrency = (n) => new Intl.NumberFormat("fa-AF").format(n) + " ؋";

  const filtered = employees.filter(
    (e) => departmentFilter === "all" || e.department === departmentFilter
  );

  const calcNet = (e) =>
    (e.baseSalary || 0) + (e.allowances || 0) - (e.deductions || 0) - (e.advance || 0);

  const toggleSelect = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const unpaidIds = filtered.filter((e) => !e.paid).map((e) => e.id);
    if (selectedEmployees.length === unpaidIds.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(unpaidIds);
    }
  };

  const totalSelected = filtered
    .filter((e) => selectedEmployees.includes(e.id))
    .reduce((sum, e) => sum + calcNet(e), 0);

  const handlePayment = () => {
    setEmployees((prev) =>
      prev.map((e) =>
        selectedEmployees.includes(e.id) ? { ...e, paid: true } : e
      )
    );
    setSelectedEmployees([]);
    setConfirmDialog(false);
    setSnackbar({
      open: true,
      msg: "✅ پرداخت معاش با موفقیت ثبت شد",
      severity: "success",
    });
  };

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        💵 پرداخت معاش
      </Typography>

      {/* انتخاب دوره */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="ماه"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="سال"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="بخش"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="all">همه بخش‌ها</MenuItem>
                {departments.filter((d) => d !== "all").map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ textAlign: "left" }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<PaymentIcon />}
                disabled={selectedEmployees.length === 0}
                onClick={() => setConfirmDialog(true)}
              >
                پرداخت معاش ({selectedEmployees.length} نفر)
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* خلاصه انتخاب */}
      {selectedEmployees.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>{selectedEmployees.length}</strong> کارمند انتخاب شده - مجموع:{" "}
          <strong>{formatCurrency(totalSelected)}</strong>
        </Alert>
      )}

      {/* جدول */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={
                    selectedEmployees.length > 0 &&
                    selectedEmployees.length ===
                      filtered.filter((e) => !e.paid).length
                  }
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>#</TableCell>
              <TableCell>نام کارمند</TableCell>
              <TableCell>بخش</TableCell>
              <TableCell>معاش پایه</TableCell>
              <TableCell>مزایا</TableCell>
              <TableCell>کسرات</TableCell>
              <TableCell>پیش‌پرداخت</TableCell>
              <TableCell>معاش خالص</TableCell>
              <TableCell>وضعیت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((e, idx) => (
              <TableRow key={e.id} hover sx={{ opacity: e.paid ? 0.6 : 1 }}>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    disabled={e.paid}
                    checked={selectedEmployees.includes(e.id)}
                    onChange={() => toggleSelect(e.id)}
                  />
                </TableCell>
                <TableCell>{idx + 1}</TableCell>
                <TableCell fontWeight="bold">{e.fullName}</TableCell>
                <TableCell>{e.department}</TableCell>
                <TableCell>{formatCurrency(e.baseSalary)}</TableCell>
                <TableCell sx={{ color: "success.main" }}>
                  +{formatCurrency(e.allowances)}
                </TableCell>
                <TableCell sx={{ color: "error.main" }}>
                  -{formatCurrency(e.deductions)}
                </TableCell>
                <TableCell sx={{ color: "warning.main" }}>
                  {e.advance ? `-${formatCurrency(e.advance)}` : "—"}
                </TableCell>
                <TableCell>
                  <strong>{formatCurrency(calcNet(e))}</strong>
                </TableCell>
                <TableCell>
                  {e.paid ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="پرداخت شده"
                      size="small"
                      color="success"
                    />
                  ) : (
                    <Chip label="در انتظار" size="small" color="warning" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* دیالوگ تأیید */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>تأیید پرداخت معاش</DialogTitle>
        <DialogContent>
          <Typography>
            آیا از پرداخت معاش <strong>{selectedEmployees.length}</strong> کارمند
            به مبلغ <strong>{formatCurrency(totalSelected)}</strong> در ماه{" "}
            <strong>{selectedMonth} {selectedYear}</strong> مطمئن هستید؟
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            این عملیات قابل بازگشت نیست و در سیستم ثبت خواهد شد.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>انصراف</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handlePayment}
          >
            تأیید پرداخت
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.msg}
      />
    </Box>
  );
}