// src/app/routes/payroll/SalaryPayment.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, Divider, CircularProgress,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import api from "../../../../api";

const MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

export default function SalaryPayment() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[4]);
  const [selectedYear, setSelectedYear] = useState("1403");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [employees, setEmployees] = useState([]);
  const [periodId, setPeriodId] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [confirmDialog, setConfirmDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false, msg: "", severity: "success",
  });

  // ============================================================
  // ✅ دریافت معاشات از API
  // ============================================================
  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        month: selectedMonth,
        year: selectedYear,
      };
      if (departmentFilter !== "all") params.department = departmentFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/payroll/salaries", { params });

      if (res.data?.success) {
        setEmployees(res.data.data || []);
        setPeriodId(res.data.period?.id || null);
      } else {
        setError(res.data?.message || "خطا در دریافت معاشات");
      }
    } catch (err) {
      console.error("getSalaries error:", err);
      setError(err.response?.data?.message || err.message || "خطا در ارتباط");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  // ============================================================
  // ✅ تولید معاشات برای این دوره
  // ============================================================
  const handleGenerate = async () => {
    if (!window.confirm(
      `تولید معاشات برای ${selectedMonth} ${selectedYear}؟\n` +
      `این کار برای همه کارمندان فعال معاش ایجاد می‌کند.`
    )) return;

    try {
      setSaving(true);
      const res = await api.post("/payroll/salaries/generate", {
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success) {
        setSnackbar({
          open: true,
          msg: `✅ ${res.data.generated} معاش تولید شد`,
          severity: "success",
        });
        fetchSalaries();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در تولید",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(n || 0) + " ؋";

  const departments = ["all", ...new Set(employees.map((e) => e.department))];

  const filtered = employees.filter(
    (e) => departmentFilter === "all" || e.department === departmentFilter
  );

  const calcNet = (e) =>
    (e.baseSalary || 0) + (e.allowances || 0) -
    (e.deductions || 0) - (e.advance || 0);

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

  // ============================================================
  // ✅ پرداخت دسته‌ای
  // ============================================================
  const handlePayment = async () => {
    try {
      setSaving(true);
      const res = await api.post("/payroll/salaries/pay-bulk", {
        salaryIds: selectedEmployees,
        paymentDate: new Date().toISOString().slice(0, 10),
        method: "bank_transfer",
      });

      if (res.data?.success) {
        setSnackbar({
          open: true,
          msg: res.data.message || `✅ ${res.data.paid} معاش پرداخت شد`,
          severity: "success",
        });
        setSelectedEmployees([]);
        fetchSalaries();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در پرداخت",
        severity: "error",
      });
    } finally {
      setSaving(false);
      setConfirmDialog(false);
    }
  };

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">💵 پرداخت معاش</Typography>
        <Box>
          <Button startIcon={<PlayArrowIcon />} variant="outlined"
            onClick={handleGenerate} disabled={saving} sx={{ mr: 1 }}>
            تولید معاشات
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined"
            onClick={fetchSalaries} disabled={loading}>
            بازخوانی
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="ماه"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}>
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" label="سال"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="بخش"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="all">همه بخش‌ها</MenuItem>
                {departments.filter((d) => d !== "all").map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth select size="small" label="وضعیت"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="pending">در انتظار</MenuItem>
                <MenuItem value="paid">پرداخت شده</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ textAlign: "left" }}>
              <Button variant="contained" color="success"
                startIcon={<PaymentIcon />}
                disabled={selectedEmployees.length === 0 || saving}
                onClick={() => setConfirmDialog(true)}>
                پرداخت ({selectedEmployees.length})
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedEmployees.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>{selectedEmployees.length}</strong> کارمند انتخاب شده - مجموع:{" "}
          <strong>{formatCurrency(totalSelected)}</strong>
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell padding="checkbox">
                  <input type="checkbox"
                    checked={selectedEmployees.length > 0 &&
                      selectedEmployees.length ===
                      filtered.filter((e) => !e.paid).length}
                    onChange={toggleAll} />
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      هیچ معاشی برای این دوره یافت نشد. ابتدا «تولید معاشات» را بزنید.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e, idx) => (
                  <TableRow key={e.id} hover sx={{ opacity: e.paid ? 0.6 : 1 }}>
                    <TableCell padding="checkbox">
                      <input type="checkbox" disabled={e.paid}
                        checked={selectedEmployees.includes(e.id)}
                        onChange={() => toggleSelect(e.id)} />
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
                    <TableCell><strong>{formatCurrency(calcNet(e))}</strong></TableCell>
                    <TableCell>
                      {e.paid ? (
                        <Chip icon={<CheckCircleIcon />} label="پرداخت شده"
                          size="small" color="success" />
                      ) : (
                        <Chip label="در انتظار" size="small" color="warning" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
            این عملیات قابل بازگشت نیست.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={saving}>انصراف</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
            onClick={handlePayment} disabled={saving}>
            {saving ? "در حال پرداخت..." : "تأیید پرداخت"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.msg} />
    </Box>
  );
}