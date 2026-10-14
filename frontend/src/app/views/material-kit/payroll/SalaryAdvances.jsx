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
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
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
  const [employeeOptions, setEmployeeOptions] = useState([]); // ✅ هم users هم accounts
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [form, setForm] = useState({
    employeeId: null,        // user_id
    accountId: null,         // account_id
    employee: "",
    department: "",
    source: "",              // "user" | "account"
    amount: "",
    reason: "",
    date: "",
    repaymentMonths: 1,
  });

  const [snackbar, setSnackbar] = useState({
    open: false, msg: "", severity: "success",
  });

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
  // ✅ دریافت کارمندان (هم users هم accounts) از endpoint payroll
  // ============================================================
  const fetchEmployees = async (query = "") => {
    try {
      setEmployeeLoading(true);
      const params = { per_page: 100 };
      if (query) params.search = query;

      // از endpoint خود payroll استفاده می‌کنیم که هر دو منبع را برمی‌گرداند
      const res = await api.get("/payroll/employees", { params });

      const list = res.data?.data || [];
      setEmployeeOptions(
        (Array.isArray(list) ? list : []).map((e) => ({
          id: e.id,
          userId: e.userId || null,
          accountId: e.accountId || null,
          full_name: e.fullName,
          department: e.department || "",
          source: e.source,           // "user" | "account"
          sourceLabel: e.sourceLabel, // "کاربر" | "حساب"
          employeeCode: e.employeeCode || "",
        }))
      );
    } catch (err) {
      console.error("fetchEmployees error:", err);
      setSnackbar({
        open: true,
        msg: "خطا در دریافت لیست کارمندان",
        severity: "error",
      });
    } finally {
      setEmployeeLoading(false);
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(n || 0) + " ؋";

  // ============================================================
  // ✅ ذخیره پیش‌پرداخت (پشتیبانی از user و account)
  // ============================================================
  const handleSave = async () => {
    if (!form.employeeId || !form.amount) {
      setSnackbar({ open: true, msg: "کارمند و مبلغ الزامی است", severity: "warning" });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        employeeId: form.employeeId,        // ✅ همیشه user_id یا account_id کارمند
        amount: Number(form.amount) || 0,
        reason: form.reason,
        date: form.date || new Date().toISOString().slice(0, 10),
        repaymentMonths: Number(form.repaymentMonths) || 1,
      };
      const res = await api.post("/payroll/advances", payload);
      if (res.data?.success) {
        setSnackbar({ open: true, msg: "✅ درخواست ثبت شد", severity: "success" });
        setForm({
          employeeId: null, accountId: null,
          employee: "", department: "", source: "",
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
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">📉 مدیریت پیش‌پرداخت معاش</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdvances}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "info.50", borderRight: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع پیش‌پرداخت‌ها</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatCurrency(stats.totalAdvances)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "success.50", borderRight: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2">بازپرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(stats.totalRepaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "warning.50", borderRight: "4px solid", borderColor: "warning.main" }}>
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
          onClick={() => { setOpen(true); fetchEmployees(); }}>
          درخواست پیش‌پرداخت جدید
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell align="right">#</TableCell>
              <TableCell align="right">کارمند</TableCell>
              <TableCell align="right">بخش</TableCell>
              <TableCell align="right">مبلغ</TableCell>
              <TableCell align="right">دلیل</TableCell>
              <TableCell align="right">تاریخ</TableCell>
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">بازپرداخت شده</TableCell>
              <TableCell align="right">باقی‌مانده</TableCell>
              <TableCell align="right">عملیات</TableCell>
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
                  <TableCell align="right">{idx + 1}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>{a.employee}</TableCell>
                  <TableCell align="right">{a.department}</TableCell>
                  <TableCell align="right">{formatCurrency(a.amount)}</TableCell>
                  <TableCell align="right">{a.reason}</TableCell>
                  <TableCell align="right">{a.date}</TableCell>
                  <TableCell align="right">
                    <Chip label={a.status} size="small"
                      color={
                        a.statusRaw === "approved" ? "success"
                        : a.statusRaw === "rejected" ? "error"
                        : a.statusRaw === "repaid" ? "info"
                        : "warning"
                      } />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(a.repaid)}</TableCell>
                  <TableCell align="right">{formatCurrency(a.remaining)}</TableCell>
                  <TableCell align="right">
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
              {/* ✅ Autocomplete جدید: هم user هم account */}
              <Autocomplete
                options={employeeOptions}
                getOptionLabel={(o) =>
                  `${o.full_name} ${o.department ? `(${o.department})` : ""} ${
                    o.employeeCode ? `- ${o.employeeCode}` : ""
                  }`
                }
                loading={employeeLoading}
                onInputChange={(_, v) => { if (v.length > 1) fetchEmployees(v); }}
                onChange={(_, v) => {
                  if (v) {
                    setForm({
                      ...form,
                      employeeId: v.id,           // id کارمند در payroll
                      userId: v.userId,
                      accountId: v.accountId,
                      employee: v.full_name,
                      department: v.department || "",
                      source: v.source,
                    });
                  } else {
                    setForm({
                      ...form,
                      employeeId: null, userId: null, accountId: null,
                      employee: "", department: "", source: "",
                    });
                  }
                }}
                renderOption={(props, option) => (
                  <li {...props} key={`${option.source}-${option.id}`}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      {option.source === "user" ? (
                        <PersonIcon fontSize="small" color="info" />
                      ) : (
                        <BusinessIcon fontSize="small" color="secondary" />
                      )}
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {option.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.sourceLabel}
                          {option.department ? ` • ${option.department}` : ""}
                          {option.employeeCode ? ` • ${option.employeeCode}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="انتخاب کارمند (کاربر یا طرف‌حساب) *" required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {employeeLoading && <CircularProgress color="inherit" size={20} />}
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
        <DialogActions sx={{ justifyContent: "flex-start", px: 3, pb: 2 }}>
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