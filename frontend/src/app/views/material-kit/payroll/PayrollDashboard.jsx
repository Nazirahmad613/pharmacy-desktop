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
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import api from "../../../../api";

const MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

// ✅ ترجمه نوعیت حساب برای نمایش
const ACCOUNT_TYPE_FA = {
  asset: "دارایی",
  liability: "بدهی",
  equity: "سرمایه",
  income: "درآمد",
  expense: "هزینه",
  receivable: "مطالبات",
  payable: "بدهی‌ها",
  employee: "کارمندان",
};

// ✅ انتخاب اولین فیلد عددی موجود از میان چند نام جایگزین
const pickNumber = (obj, keys, fallback = 0) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
};

// ✅ نرمال‌سازی ردیف معاش (شامل تذکره و نوعیت حساب)
const normalizeSalaryRow = (e = {}) => {
  const tax = pickNumber(e, [
    "tax", "taxAmount", "incomeTax", "tax_value",
    "deduction_tax", "tax_deduction",
  ]);
  const insurance = pickNumber(e, [
    "insurance", "insuranceAmount", "insurance_value",
    "insuranceDeduction", "socialSecurity", "social_security",
    "deduction_insurance",
  ]);
  const advanceDeduction = pickNumber(e, [
    "advanceDeduction", "advance_deduction", "advance",
    "advanceAmount", "loanDeduction", "loan_deduction",
  ]);
  const baseSalary = pickNumber(e, ["baseSalary", "base_salary", "basicSalary"]);
  const allowances = pickNumber(e, ["allowances", "allowance", "bonuses"]);
  const deductions = pickNumber(e, ["deductions", "otherDeductions", "manualDeductions"]);

  const grossSalary =
    pickNumber(e, ["grossSalary", "gross_salary"]) ||
    baseSalary + allowances;

  const netSalary =
    pickNumber(e, ["netSalary", "net_salary"]) ||
    grossSalary - deductions - tax - insurance - advanceDeduction;

  return {
    ...e,
    baseSalary,
    allowances,
    deductions,
    tax,
    insurance,
    advanceDeduction,
    grossSalary,
    netSalary,
    paid: e.paymentStatus === "paid" || e.paid === true,

    // ✅ جدید: تذکره و نوعیت حساب (پشتیبانی از camelCase و snake_case)
    tazkiraNumber: e.tazkiraNumber ?? e.tazkira_number ?? null,
    accountType:   e.accountType   ?? e.account_type   ?? null,
  };
};

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

  const fetchSalaries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { month: selectedMonth, year: selectedYear };
      if (departmentFilter !== "all") params.department = departmentFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/payroll/salaries", { params });

      if (res.data?.success) {
        const list = (res.data.data || []).map(normalizeSalaryRow);
        setEmployees(list);
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
    new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const departments = ["all", ...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = employees.filter(
    (e) => departmentFilter === "all" || e.department === departmentFilter
  );

  const calcNet = (e) => Number(e.netSalary) || 0;

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
    <Box sx={{ p: 3 }}>
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
                <MenuItem value="partial">جزئی</MenuItem>
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
          <Table dir="rtl" size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell padding="checkbox" align="right">
                  <input type="checkbox"
                    checked={selectedEmployees.length > 0 &&
                      selectedEmployees.length ===
                      filtered.filter((e) => !e.paid).length}
                    onChange={toggleAll} />
                </TableCell>
                <TableCell align="right">#</TableCell>
                <TableCell align="right">نام کارمند</TableCell>
                {/* ✅ ستون‌های جدید */}
                <TableCell align="right">تذکره</TableCell>
                <TableCell align="right">نوعیت حساب</TableCell>
                <TableCell align="right">منبع</TableCell>
                <TableCell align="right">بخش</TableCell>
                <TableCell align="right">معاش پایه</TableCell>
                <TableCell align="right">مزایا</TableCell>
                <TableCell align="right">کسرات</TableCell>
                <TableCell align="right">مالیه</TableCell>
                <TableCell align="right">بیمه</TableCell>
                <TableCell align="right">پیش‌پرداخت</TableCell>
                <TableCell align="right">معاش خالص</TableCell>
                <TableCell align="right">وضعیت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      هیچ معاشی برای این دوره یافت نشد. ابتدا «تولید معاشات» را بزنید.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e, idx) => (
                  <TableRow key={`${e.source}-${e.id}`} hover sx={{ opacity: e.paid ? 0.6 : 1 }}>
                    <TableCell padding="checkbox" align="right">
                      <input type="checkbox" disabled={e.paid}
                        checked={selectedEmployees.includes(e.id)}
                        onChange={() => toggleSelect(e.id)} />
                    </TableCell>
                    <TableCell align="right">{idx + 1}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{e.fullName}</TableCell>

                    {/* ✅ تذکره */}
                    <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {e.tazkiraNumber || "—"}
                    </TableCell>

                    {/* ✅ نوعیت حساب */}
                    <TableCell align="right">
                      {e.accountType ? (
                        <Chip
                          label={ACCOUNT_TYPE_FA[e.accountType] || e.accountType}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : "—"}
                    </TableCell>

                    <TableCell align="right">
                      <Chip
                        icon={e.source === "user" ? <PersonIcon /> : <BusinessIcon />}
                        label={e.sourceLabel || (e.source === "user" ? "کاربر" : "حساب")}
                        size="small"
                        color={e.source === "user" ? "info" : "secondary"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{e.department || "—"}</TableCell>
                    <TableCell align="right">{formatCurrency(e.baseSalary)}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>
                      +{formatCurrency(e.allowances)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      -{formatCurrency(e.deductions)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      {e.tax ? `-${formatCurrency(e.tax)}` : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      {e.insurance ? `-${formatCurrency(e.insurance)}` : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "warning.main", fontWeight: "bold" }}>
                      {e.advanceDeduction ? `-${formatCurrency(e.advanceDeduction)}` : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(calcNet(e))}</strong>
                    </TableCell>
                    <TableCell align="right">
                      {e.paid ? (
                        <Chip icon={<CheckCircleIcon />} label="پرداخت شده"
                          size="small" color="success" />
                      ) : e.paymentStatus === "partial" ? (
                        <Chip label="جزئی" size="small" color="info" />
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
        <DialogActions sx={{ justifyContent: "flex-start", px: 3, pb: 2 }}>
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