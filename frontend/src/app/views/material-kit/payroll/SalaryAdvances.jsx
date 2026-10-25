// src/app/routes/payroll/SalaryAdvances.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Alert, Snackbar, CircularProgress, Autocomplete,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import api from "../../../../api";

const MONTHS = ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"];

const ACCOUNT_TYPE_FA = {
  asset: "دارایی", liability: "بدهی", equity: "سرمایه",
  income: "درآمد", expense: "هزینه", receivable: "مطالبات",
  payable: "بدهی‌ها", employee: "کارمندان",
};

// ✅ نوعیت حساب: اولویت با نوع کلی (مثلاً «کارمندان»)
const getAccountTypeDisplay = (row) => {
  if (!row) return "—";
  return (
    row.accountTypeLabel
    || ACCOUNT_TYPE_FA[row.accountType]
    || row.accountType
    || "—"
  );
};

// ✅ بخش: اولویت با department (که برای accounts = categoryLabel است)
const resolveDepartment = (row) => {
  if (!row) return "—";
  const dept = row.department || "";
  if (dept) return dept;
  return row.accountCategoryLabel || "—";
};

const toGregorian = (jalaliStr) => {
  if (!jalaliStr) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(jalaliStr)) return jalaliStr;
  const parts = jalaliStr.split("/").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date().toISOString().slice(0, 10);
  const [jy, jm, jd] = parts;
  let gy = jy + 621;
  const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let jDayOfYear = jd;
  for (let i = 0; i < jm - 1; i++) jDayOfYear += jDaysInMonth[i];
  const gDayOfYear = jDayOfYear + 79;
  let gMonth = 0;
  let remaining = gDayOfYear;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  if (isLeap) gDaysInMonth[1] = 29;
  while (remaining > gDaysInMonth[gMonth]) {
    remaining -= gDaysInMonth[gMonth];
    gMonth++;
    if (gMonth > 11) { gMonth = 0; gy++; }
  }
  return `${gy}-${String(gMonth + 1).padStart(2, "0")}-${String(remaining).padStart(2, "0")}`;
};

const toJalali = (gregorianStr) => {
  if (!gregorianStr) return "";
  const date = new Date(gregorianStr);
  if (isNaN(date.getTime())) return gregorianStr;
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  if (isLeap) gDaysInMonth[1] = 29;
  let gDayOfYear = gd;
  for (let i = 0; i < gm - 1; i++) gDayOfYear += gDaysInMonth[i];
  let jDayOfYear = gDayOfYear - 79;
  let jy = gy - 621;
  if (jDayOfYear <= 0) { jy--; jDayOfYear += 365 + (isLeap ? 1 : 0); }
  let jm = 0;
  let remaining = jDayOfYear;
  while (remaining > jDaysInMonth[jm]) {
    remaining -= jDaysInMonth[jm];
    jm++;
    if (jm > 11) { jm = 0; jy++; }
  }
  return `${jy}/${String(jm + 1).padStart(2, "0")}/${String(remaining).padStart(2, "0")}`;
};

export default function SalaryAdvances() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [advances, setAdvances] = useState([]);
  const [stats, setStats] = useState({ totalAdvances: 0, totalRepaid: 0, remaining: 0 });

  const [open, setOpen] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [form, setForm] = useState({
    employeeId: null, userId: null, accountId: null,
    employee: "", department: "", source: "",
    amount: "", reason: "", date: "",
    targetMonth: MONTHS[4], targetYear: "1403", repaymentMonths: 1,
  });

  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });

  const fetchAdvances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/advances");
      if (res.data?.success) {
        const normalizedData = (res.data.data || []).map((a) => {
          const row = {
            id: a.id,
            employee: a.employee || "—",
            employeeId: a.employeeId || a.userId || a.accountId,
            userId: a.userId || null,
            accountId: a.accountId || null,
            source: a.source || (a.userId ? "user" : "account"),
            sourceLabel: a.sourceLabel || "",
            department: a.department || "—",
            amount: Number(a.amount) || 0,
            reason: a.reason || "",
            date: a.date || a.requestDate || "",
            targetMonth: a.targetMonth || "",
            targetYear: a.targetYear || "",
            status: a.status || "—",
            statusRaw: a.statusRaw || "pending",
            repaid: Number(a.repaid ?? a.repaidAmount ?? 0),
            remaining: Number(a.remaining ?? a.remainingAmount ?? 0),
            repaymentMonths: Number(a.repaymentMonths) || 1,
            monthlyDeduction: Number(a.monthlyDeduction) || 0,

            tazkiraNumber:        a.tazkiraNumber        ?? a.tazkira_number        ?? null,
            accountType:          a.accountType          ?? a.account_type          ?? null,
            accountCategory:      a.accountCategory      ?? a.account_category      ?? null,
            accountTypeLabel:     a.accountTypeLabel     ?? a.account_type_label    ?? null,
            accountCategoryLabel: a.accountCategoryLabel ?? a.account_category_label ?? null,
          };
          // ✅ بخش نهایی
          row.department = resolveDepartment(row);
          return row;
        });

        setAdvances(normalizedData);
        setStats(res.data.stats || { totalAdvances: 0, totalRepaid: 0, remaining: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "خطا در دریافت");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const fetchEmployees = async (query = "") => {
    try {
      setEmployeeLoading(true);
      const params = { per_page: 100 };
      if (query) params.search = query;

      const res = await api.get("/payroll/employees", { params });
      const list = res.data?.data || [];
      setEmployeeOptions((Array.isArray(list) ? list : []).map((e) => ({
        id: e.id,
        userId: e.userId || null,
        accountId: e.accountId || null,
        full_name: e.fullName || e.full_name || "—",
        department: e.department || "",
        source: e.source,
        sourceLabel: e.sourceLabel,
        employeeCode: e.employeeCode || "",
        tazkiraNumber: e.tazkiraNumber || e.tazkira_number || "",
        accountType: e.accountType || e.account_type || "",
        accountTypeLabel: e.accountTypeLabel || "",
        accountCategoryLabel: e.accountCategoryLabel || "",
      })));
    } catch (err) {
      console.error("fetchEmployees error:", err);
      setSnackbar({ open: true, msg: "خطا در دریافت لیست کارمندان", severity: "error" });
    } finally {
      setEmployeeLoading(false);
    }
  };

  const formatCurrency = (n) => new Intl.NumberFormat("fa-AF").format(n || 0) + " ؋";

  const handleSave = async () => {
    if (!form.employeeId || !form.amount) {
      setSnackbar({ open: true, msg: "کارمند و مبلغ الزامی است", severity: "warning" });
      return;
    }
    if (!form.targetMonth || !form.targetYear) {
      setSnackbar({ open: true, msg: "ماه و سال هدف الزامی است", severity: "warning" });
      return;
    }

    try {
      setSaving(true);
      const gregorianDate = toGregorian(form.date);
      const payload = {
        employeeId: form.employeeId,
        userId: form.userId || null,
        accountId: form.accountId || null,
        amount: Number(form.amount) || 0,
        reason: form.reason || "",
        date: gregorianDate,
        targetMonth: form.targetMonth,
        targetYear: form.targetYear,
        repaymentMonths: Number(form.repaymentMonths) || 1,
      };

      const res = await api.post("/payroll/advances", payload);
      if (res.data?.success) {
        setSnackbar({ open: true, msg: "✅ درخواست ثبت شد", severity: "success" });
        setForm({
          employeeId: null, userId: null, accountId: null,
          employee: "", department: "", source: "",
          amount: "", reason: "", date: "",
          targetMonth: MONTHS[4], targetYear: "1403", repaymentMonths: 1,
        });
        setOpen(false);
        fetchAdvances();
      } else {
        setSnackbar({ open: true, msg: res.data?.message || "خطا در ثبت", severity: "error" });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
        "خطا در ثبت";
      setSnackbar({ open: true, msg: errMsg, severity: "error" });
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
      setSnackbar({ open: true, msg: err.response?.data?.message || "خطا در تأیید", severity: "error" });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("آیا از رد این درخواست مطمئن هستید؟")) return;
    try {
      await api.patch(`/payroll/advances/${id}/reject`);
      setSnackbar({ open: true, msg: "❌ رد شد", severity: "info" });
      fetchAdvances();
    } catch (err) {
      setSnackbar({ open: true, msg: err.response?.data?.message || "خطا در رد", severity: "error" });
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">📉 مدیریت پیش‌پرداخت معاش</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdvances}>بازخوانی</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "info.50", borderRight: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع پیش‌پرداخت‌ها</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">{formatCurrency(stats.totalAdvances)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "success.50", borderRight: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2">بازپرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(stats.totalRepaid)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "warning.50", borderRight: "4px solid", borderColor: "warning.main" }}>
            <CardContent>
              <Typography variant="body2">باقی‌مانده</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">{formatCurrency(stats.remaining)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setOpen(true); fetchEmployees(); }}>
          درخواست پیش‌پرداخت جدید
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table dir="rtl" size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell align="right">#</TableCell>
              <TableCell align="right">کارمند</TableCell>
              <TableCell align="right">تذکره</TableCell>
              <TableCell align="right">نوعیت حساب</TableCell>
              <TableCell align="right">منبع</TableCell>
              <TableCell align="right">بخش</TableCell>
              <TableCell align="right">مبلغ</TableCell>
              <TableCell align="right">دلیل</TableCell>
              <TableCell align="right">تاریخ درخواست</TableCell>
              <TableCell align="right">ماه هدف</TableCell>
              <TableCell align="right">قسط ماهانه</TableCell>
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">بازپرداخت شده</TableCell>
              <TableCell align="right">باقی‌مانده</TableCell>
              <TableCell align="right">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {advances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">هیچ درخواست پیش‌پرداختی یافت نشد</Typography>
                </TableCell>
              </TableRow>
            ) : (
              advances.map((a, idx) => (
                <TableRow key={a.id} hover>
                  <TableCell align="right">{idx + 1}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>{a.employee}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                    {a.tazkiraNumber || "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={getAccountTypeDisplay(a)} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      icon={a.source === "user" ? <PersonIcon /> : <BusinessIcon />}
                      label={a.sourceLabel || (a.source === "user" ? "کاربر" : "حساب")}
                      size="small"
                      color={a.source === "user" ? "info" : "secondary"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{a.department}</TableCell>
                  <TableCell align="right">{formatCurrency(a.amount)}</TableCell>
                  <TableCell align="right">{a.reason}</TableCell>
                  <TableCell align="right">{a.date ? toJalali(a.date) : "—"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: "primary.main" }}>
                    {a.targetMonth && a.targetYear ? `${a.targetMonth} ${a.targetYear}` : "—"}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(a.monthlyDeduction)}</TableCell>
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
                        <Button size="small" color="success" startIcon={<CheckCircleIcon />}
                          onClick={() => handleApprove(a.id)}>تأیید</Button>
                        <Button size="small" color="error" startIcon={<CancelIcon />}
                          onClick={() => handleReject(a.id)}>رد</Button>
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
                options={employeeOptions}
                getOptionLabel={(o) =>
                  `${o.full_name}${o.department ? ` (${o.department})` : ""}${o.employeeCode ? ` - ${o.employeeCode}` : ""}${o.tazkiraNumber ? ` • تذکره: ${o.tazkiraNumber}` : ""}`
                }
                loading={employeeLoading}
                onInputChange={(_, v) => { if (v.length > 1) fetchEmployees(v); }}
                onChange={(_, v) => {
                  if (v) {
                    setForm({
                      ...form,
                      employeeId: v.id, userId: v.userId, accountId: v.accountId,
                      employee: v.full_name, department: v.department || "", source: v.source,
                    });
                  } else {
                    setForm({ ...form, employeeId: null, userId: null, accountId: null, employee: "", department: "", source: "" });
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
                        <Typography variant="body2" fontWeight="bold">{option.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.sourceLabel}
                          {option.department ? ` • ${option.department}` : ""}
                          {option.employeeCode ? ` • ${option.employeeCode}` : ""}
                          {option.tazkiraNumber ? ` • تذکره: ${option.tazkiraNumber}` : ""}
                          {(option.accountCategoryLabel || option.accountTypeLabel)
                            ? ` • ${option.accountCategoryLabel || option.accountTypeLabel}`
                            : ""}
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
                    }}
                  />
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
                InputProps={{ endAdornment: <InputAdornment position="end">؋</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="ماه هدف (کسر از معاش این ماه) *"
                value={form.targetMonth}
                onChange={(e) => setForm({ ...form, targetMonth: e.target.value })} required>
                {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="سال هدف *" value={form.targetYear}
                onChange={(e) => setForm({ ...form, targetYear: e.target.value })} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="تعداد اقساط"
                value={form.repaymentMonths}
                onChange={(e) => setForm({ ...form, repaymentMonths: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="تاریخ درخواست (شمسی)" placeholder="1403/05/15"
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
        onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.msg} />
    </Box>
  );
}