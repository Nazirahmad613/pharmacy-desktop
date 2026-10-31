// src/app/routes/payroll/SalaryPayment.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, Divider, CircularProgress, Tooltip,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// ✅ مسیر اصلاح شد: دو سطح بالا (src/app/) نه سه سطح (src/)
import useBackNavigation from "../../../hooks/useBackNavigation";
import api from "../../../../api";

const MONTHS = ["حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله", "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"];

const ACCOUNT_TYPE_FA = {
  asset: "دارایی", liability: "بدهی", equity: "سرمایه",
  income: "درآمد", expense: "هزینه", receivable: "مطالبات",
  payable: "بدهی‌ها", employee: "کارمندان",
};

// ✅ نوعیت حساب
const getAccountTypeDisplay = (row) => {
  if (!row) return "—";
  return (
    row.accountTypeLabel
    || ACCOUNT_TYPE_FA[row.accountType]
    || row.accountType
    || "—"
  );
};

// ✅ بخش
const resolveDepartment = (row) => {
  if (!row) return "—";
  const dept = row.department || "";
  if (dept && dept !== "—") return dept;
  return row.accountCategoryLabel || "—";
};

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

const normalizeSalaryRow = (e = {}) => {
  const tax = pickNumber(e, ["tax", "taxAmount", "incomeTax", "tax_value", "deduction_tax", "tax_deduction"]);
  const insurance = pickNumber(e, ["insurance", "insuranceAmount", "insurance_value", "insuranceDeduction", "socialSecurity", "social_security", "deduction_insurance"]);
  const advanceDeduction = pickNumber(e, ["advanceDeduction", "advance_deduction", "advance", "advanceAmount", "loanDeduction", "loan_deduction"]);
  const baseSalary = pickNumber(e, ["baseSalary", "base_salary", "basicSalary"]);
  const allowances = pickNumber(e, ["allowances", "allowance", "bonuses"]);
  const deductions = pickNumber(e, ["deductions", "otherDeductions", "manualDeductions"]);

  const grossSalary = pickNumber(e, ["grossSalary", "gross_salary"]) || baseSalary + allowances;
  const netSalary = pickNumber(e, ["netSalary", "net_salary"]) || grossSalary - deductions - tax - insurance - advanceDeduction;

  const normalized = {
    ...e,
    baseSalary, allowances, deductions, tax, insurance, advanceDeduction,
    grossSalary, netSalary,
    paid: e.paymentStatus === "paid" || e.paid === true,
    paymentStatus: e.paymentStatus ?? e.payment_status ?? "pending",

    tazkiraNumber:        e.tazkiraNumber        ?? e.tazkira_number        ?? null,
    accountType:          e.accountType          ?? e.account_type          ?? null,
    accountCategory:      e.accountCategory      ?? e.account_category      ?? null,
    accountTypeLabel:     e.accountTypeLabel     ?? e.account_type_label    ?? null,
    accountCategoryLabel: e.accountCategoryLabel ?? e.account_category_label ?? null,
    accountId:            e.accountId            ?? e.account_id            ?? null,
    userId:               e.userId               ?? e.user_id               ?? null,
    employeeCode:         e.employeeCode         ?? e.employee_code         ?? null,
  };

  normalized.department = resolveDepartment(normalized);
  return normalized;
};

export default function SalaryPayment() {
  // ✅ فقط دکمه بازگشت استاندارد
  const { canGoBack, goBack } = useBackNavigation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[4]);
  const [selectedYear, setSelectedYear] = useState("1403");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ حساب پرداخت‌کننده (صندوق/بانک) — اختیاری
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [periodId, setPeriodId] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [confirmDialog, setConfirmDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" });

  /* ============================================================
   *  دریافت معاشات (که پیش‌پرداخت را از ژورنال می‌خواند)
   * ============================================================ */
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

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  /* ============================================================
   *  دریافت حساب‌های پرداخت (صندوق/بانک) — اختیاری
   * ============================================================ */
  useEffect(() => {
    let isMounted = true;
    const loadAccounts = async () => {
      try {
        // از همان endpoint ژورنال استفاده می‌کنیم (همه حساب‌ها)
        const res = await api.get("/journals/ref-sources-dynamic", {
          params: { type: "account", limit: 200 },
        });
        if (!isMounted) return;
        const list = res.data?.data || [];
        // فیلتر فقط حساب‌های نقدی/بانکی
        const filtered = list.filter((a) =>
          ["cash", "bank"].includes(a.category)
        );
        setPaymentAccounts(filtered.length ? filtered : list);
      } catch (err) {
        console.warn("load payment accounts failed:", err);
      }
    };
    loadAccounts();
    return () => { isMounted = false; };
  }, []);

  /* ============================================================
   *  تولید معاشات
   * ============================================================ */
  const handleGenerate = async () => {
    if (!window.confirm(
      `تولید معاشات برای ${selectedMonth} ${selectedYear}؟\n` +
      `این کار برای همه کارمندان فعال (کاربران سیستم + طرف‌حساب‌ها) معاش ایجاد می‌کند.\n` +
      `مقدار پیش‌پرداخت هر کارمند از مانده ژورنال حسابش خوانده می‌شود.`
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
          msg: `✅ ${res.data.generated} معاش تولید شد (پیش‌پرداخت‌ها از ژورنال محاسبه شدند)`,
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

  /* ============================================================
   *  بازخوانی صرفاً پیش‌پرداخت‌ها (refresh و دوباره fetch)
   * ============================================================ */
  const handleRefreshAdvances = async () => {
    try {
      setLoading(true);
      await fetchSalaries();
      setSnackbar({
        open: true,
        msg: "♻️ پیش‌پرداخت‌ها از ژورنال بازخوانی شدند",
        severity: "info",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department && e.department !== "—") set.add(e.department);
    });
    return ["all", ...Array.from(set)];
  }, [employees]);

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) => departmentFilter === "all" || e.department === departmentFilter
      ),
    [employees, departmentFilter]
  );

  const calcNet = (e) => e.netSalary || 0;

  const toggleSelect = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const unpaidIds = useMemo(
    () => filtered.filter((e) => !e.paid).map((e) => e.id),
    [filtered]
  );

  const toggleAll = () => {
    if (selectedEmployees.length === unpaidIds.length) setSelectedEmployees([]);
    else setSelectedEmployees(unpaidIds);
  };

  const totalSelected = filtered
    .filter((e) => selectedEmployees.includes(e.id))
    .reduce((sum, e) => sum + calcNet(e), 0);

  const totalAdvancesSelected = filtered
    .filter((e) => selectedEmployees.includes(e.id))
    .reduce((sum, e) => sum + (e.advanceDeduction || 0), 0);

  /* ============================================================
   *  پرداخت معاش
   * ============================================================ */
  const handlePayment = async () => {
    try {
      setSaving(true);
      const payload = {
        salaryIds: selectedEmployees,
        paymentDate: new Date().toISOString().slice(0, 10),
        method: "bank_transfer",
      };

      if (paymentAccountId) {
        payload.accountId = Number(paymentAccountId);
      }

      const res = await api.post("/payroll/salaries/pay-bulk", payload);

      if (res.data?.success) {
        setSnackbar({
          open: true,
          msg:
            res.data.message
            || `✅ ${res.data.paid} معاش پرداخت شد؛ پیش‌پرداخت‌ها از حساب کسر و ژورنال تسویه ثبت شد`,
          severity: "success",
        });
        setSelectedEmployees([]);
        // ✅ بازخوانی برای نمایش پیش‌پرداخت باقی‌مانده جدید از ژورنال
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
      {/* ✅ دکمه بازگشت استاندارد */}
      {canGoBack && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={goBack}
          >
            بازگشت به صفحه قبلی
          </Button>
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">💵 پرداخت معاش</Typography>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<PlayArrowIcon />}
            variant="outlined"
            onClick={handleGenerate}
            disabled={saving}
          >
            تولید معاشات
          </Button>
          <Button
            startIcon={<AccountBalanceWalletIcon />}
            variant="outlined"
            color="warning"
            onClick={handleRefreshAdvances}
            disabled={loading}
            title="پیش‌پرداخت‌ها دوباره از مانده ژورنال حساب‌ها خوانده می‌شوند"
          >
            بازخوانی پیش‌پرداخت‌ها
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={fetchSalaries}
            disabled={loading}
          >
            بازخوانی
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ==================== فیلترها ==================== */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2}>
              <TextField fullWidth select size="small" label="ماه"
                value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={1.5}>
              <TextField fullWidth size="small" label="سال"
                value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <TextField fullWidth select size="small" label="بخش"
                value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="all">همه بخش‌ها</MenuItem>
                {departments.filter((d) => d !== "all").map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth select size="small" label="وضعیت"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="pending">در انتظار</MenuItem>
                <MenuItem value="partial">جزئی</MenuItem>
                <MenuItem value="paid">پرداخت شده</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <TextField fullWidth select size="small" label="حساب پرداخت (اختیاری)"
                value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>
                <MenuItem value="">— حساب پیش‌فرض —</MenuItem>
                {paymentAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.code || a.id})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={1.5} sx={{ textAlign: "left" }}>
              <Button variant="contained" color="success" startIcon={<PaymentIcon />}
                disabled={selectedEmployees.length === 0 || saving}
                onClick={() => setConfirmDialog(true)} fullWidth>
                پرداخت ({selectedEmployees.length})
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ==================== هشدار انتخاب ==================== */}
      {selectedEmployees.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>{selectedEmployees.length}</strong> کارمند انتخاب شده — مجموع معاش:{" "}
          <strong>{formatCurrency(totalSelected)}</strong>
          {" "}— مجموع پیش‌پرداخت‌های قابل کسر (از ژورنال):{" "}
          <strong style={{ color: "#ed6c02" }}>{formatCurrency(totalAdvancesSelected)}</strong>
        </Alert>
      )}

      {/* ==================== جدول ==================== */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table dir="rtl" size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell padding="checkbox" align="right">
                  <input type="checkbox"
                    checked={
                      unpaidIds.length > 0 &&
                      selectedEmployees.length === unpaidIds.length
                    }
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell align="right">#</TableCell>
                <TableCell align="right">نام کارمند</TableCell>
                <TableCell align="right">تذکره</TableCell>
                <TableCell align="right">نوعیت حساب</TableCell>
                <TableCell align="right">منبع</TableCell>
                <TableCell align="right">بخش</TableCell>
                <TableCell align="right">معاش پایه</TableCell>
                <TableCell align="right">مزایا</TableCell>
                <TableCell align="right">کسرات</TableCell>
                <TableCell align="right">مالیه</TableCell>
                <TableCell align="right">بیمه</TableCell>
                <TableCell align="right" sx={{ bgcolor: "warning.50" }}>
                  پیش‌پرداخت
                  <div style={{ fontSize: 10, color: "#888", fontWeight: "normal" }}>
                    (از ژورنال)
                  </div>
                </TableCell>
                <TableCell align="right">معاش خالص</TableCell>
                <TableCell align="right">وضعیت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      هیچ معاشی برای این ماه یافت نشد.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e, idx) => (
                  <TableRow
                    key={`${e.source}-${e.id}`}
                    hover
                    sx={{ opacity: e.paid ? 0.6 : 1 }}
                  >
                    <TableCell padding="checkbox" align="right">
                      <input type="checkbox" disabled={e.paid}
                        checked={selectedEmployees.includes(e.id)}
                        onChange={() => toggleSelect(e.id)} />
                    </TableCell>
                    <TableCell align="right">{idx + 1}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {e.fullName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {e.tazkiraNumber || "—"}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={getAccountTypeDisplay(e)} size="small" color="primary" variant="outlined" />
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
                      {e.tax > 0 ? `-${formatCurrency(e.tax)}` : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      {e.insurance > 0 ? `-${formatCurrency(e.insurance)}` : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ bgcolor: "warning.50" }}>
                      {e.advanceDeduction > 0 ? (
                        <Tooltip
                          title={`مانده پیش‌پرداخت از ژورنال حساب کارمند (credit − debit)`}
                          arrow
                        >
                          <span style={{ color: "#ed6c02", fontWeight: "bold" }}>
                            -{formatCurrency(e.advanceDeduction)}
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ color: "#aaa" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(calcNet(e))}</strong>
                    </TableCell>
                    <TableCell align="right">
                      {e.paid ? (
                        <Chip icon={<CheckCircleIcon />} label="پرداخت شده" size="small" color="success" />
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

      {/* ==================== دیالوگ تأیید پرداخت ==================== */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تأیید پرداخت معاش</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            آیا از پرداخت معاش <strong>{selectedEmployees.length}</strong> کارمند
            به مبلغ <strong>{formatCurrency(totalSelected)}</strong> در ماه{" "}
            <strong>{selectedMonth} {selectedYear}</strong> مطمئن هستید؟
          </Typography>

          {totalAdvancesSelected > 0 && (
            <Alert severity="warning" sx={{ my: 2 }}>
              مبلغ <strong>{formatCurrency(totalAdvancesSelected)}</strong> بابت
              پیش‌پرداخت از معاش کسر می‌شود و ژورنال تسویه روی حساب هر کارمند ثبت
              خواهد شد.
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            این عملیات قابل بازگشت نیست.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-start", px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialog(false)} disabled={saving}>
            انصراف
          </Button>
          <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
            onClick={handlePayment} disabled={saving}>
            {saving ? "در حال پرداخت..." : "تأیید پرداخت"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}