// src/app/routes/payroll/SalaryAdvances.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Alert, Snackbar, CircularProgress, Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../../../../api";

export default function SalaryAdvances() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [advances, setAdvances] = useState([]);
  const [stats, setStats] = useState({
    totalAdvances: 0, totalRepaid: 0, remaining: 0,
  });

  const [open, setOpen] = useState(false);
  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  const [form, setForm] = useState({
    employeeId: null,
    employee: "",
    department: "",
    amount: "",
    reason: "",
    date: "",
    repaymentMonths: 1,
  });

  const [snackbar, setSnackbar] = useState({
    open: false, msg: "", severity: "success",
  });

  // ============================================================
  // ✅ دریافت پیش‌پرداخت‌ها
  // ============================================================
  const fetchAdvances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/advances");

      if (res.data?.success) {
        setAdvances(res.data.data || []);
        setStats(res.data.stats || { totalAdvances: 0, totalRepaid: 0, remaining: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "خطا در دریافت");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  // ============================================================
  // ✅ دریافت کاربران برای Autocomplete
  // ============================================================
  const fetchUsers = async (query = "") => {
    try {
      setUserLoading(true);
      const res = await api.get("/users", {
        params: { search: query, per_page: 50 },
      });
      const users = res.data?.data || res.data || [];
      setUserOptions(
        (Array.isArray(users) ? users : []).map((u) => ({
          id: u.id,
          full_name: u.full_name || u.name || u.username,
          department: u.department?.name || u.department_name || "",
        }))
      );
    } catch (err) {
      console.error("fetch users error:", err);
    } finally {
      setUserLoading(false);
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(n || 0) + " ؋";

  // ============================================================
  // ✅ ایجاد پیش‌پرداخت
  // ============================================================
  const handleSave = async () => {
    if (!form.employeeId || !form.amount) {
      setSnackbar({
        open: true, msg: "کارمند و مبلغ الزامی است", severity: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/payroll/advances", {
        employeeId: form.employeeId,
        amount: Number(form.amount) || 0,
        reason: form.reason,
        date: form.date || new Date().toISOString().slice(0, 10),
        repaymentMonths: Number(form.repaymentMonths) || 1,
      });

      if (res.data?.success) {
        setSnackbar({ open: true, msg: "✅ درخواست ثبت شد", severity: "success" });
        setForm({
          employeeId: null, employee: "", department: "",
          amount: "", reason: "", date: "", repaymentMonths: 1,
        });
        setOpen(false);
        fetchAdvances();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در ثبت",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ✅ تأیید / رد
  // ============================================================
  const handleApprove = async (id) => {
    try {
      await api.patch(`/payroll/advances/${id}/approve`);
      setSnackbar({ open: true, msg: "✅ تأیید شد", severity: "success" });
      fetchAdvances();
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در تأیید",
        severity: "error",
      });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("آیا از رد این درخواست مطمئن هستید؟")) return;
    try {
      await api.patch(`/payroll/advances/${id}/reject`);
      setSnackbar({ open: true, msg: "❌ رد شد", severity: "info" });
      fetchAdvances();
    } catch (err) {
      setSnackbar({
        open: true,
        msg: err.response?.data?.message || "خطا در رد",
        severity: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📉 مدیریت پیش‌پرداخت معاش
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdvances}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "info.50", borderLeft: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع پیش‌پرداخت‌ها</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatCurrency(stats.totalAdvances)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "success.50", borderLeft: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2">بازپرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(stats.totalRepaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "warning.50", borderLeft: "4px solid", borderColor: "warning.main" }}>
            <CardContent>
              <Typography variant="body2">باقی‌مانده</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {formatCurrency(stats.remaining)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mb={2}>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setOpen(true); fetchUsers(); }}>
          درخواست پیش‌پرداخت جدید
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>#</TableCell>
              <TableCell>کارمند</TableCell>
              <TableCell>بخش</TableCell>
              <TableCell>مبلغ</TableCell>
              <TableCell>دلیل</TableCell>
              <TableCell>تاریخ</TableCell>
              <TableCell>وضعیت</TableCell>
              <TableCell>بازپرداخت شده</TableCell>
              <TableCell>باقی‌مانده</TableCell>
              <TableCell>عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {advances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    هیچ درخواست پیش‌پرداختی یافت نشد
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              advances.map((a, idx) => (
                <TableRow key={a.id} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell fontWeight="bold">{a.employee}</TableCell>
                  <TableCell>{a.department}</TableCell>
                  <TableCell>{formatCurrency(a.amount)}</TableCell>
                  <TableCell>{a.reason}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>
                    <Chip label={a.status} size="small"
                      color={
                        a.statusRaw === "approved" ? "success"
                        : a.statusRaw === "rejected" ? "error"
                        : a.statusRaw === "repaid" ? "info"
                        : "warning"
                      } />
                  </TableCell>
                  <TableCell>{formatCurrency(a.repaid)}</TableCell>
                  <TableCell>{formatCurrency(a.remaining)}</TableCell>
                  <TableCell>
                    {a.statusRaw === "pending" && (
                      <>
                        <Button size="small" color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApprove(a.id)}>
                          تأیید
                        </Button>
                        <Button size="small" color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleReject(a.id)}>
                          رد
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>درخواست پیش‌پرداخت معاش</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12}>
              <Autocomplete
                options={userOptions}
                getOptionLabel={(o) => o.full_name || ""}
                loading={userLoading}
                onInputChange={(_, v) => { if (v.length > 1) fetchUsers(v); }}
                onChange={(_, v) => {
                  if (v) setForm({ ...form, employeeId: v.id, employee: v.full_name, department: v.department || "" });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="انتخاب کارمند *" required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {userLoading && <CircularProgress color="inherit" size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="بخش" value={form.department} disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="مبلغ *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="تعداد اقساط"
                value={form.repaymentMonths}
                onChange={(e) => setForm({ ...form, repaymentMonths: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="تاریخ" placeholder="1403/05/15"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="دلیل"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>انصراف</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "در حال ثبت..." : "ثبت درخواست"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.msg} />
    </Box>
  );
}