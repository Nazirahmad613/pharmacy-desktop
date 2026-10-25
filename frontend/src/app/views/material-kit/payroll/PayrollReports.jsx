// src/app/routes/payroll/PayrollReports.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, CircularProgress, Alert, InputAdornment,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import api from "../../../../api";

const ACCOUNT_TYPE_FA = {
  asset: "دارایی", liability: "بدهی", equity: "سرمایه",
  income: "درآمد", expense: "هزینه", receivable: "مطالبات",
  payable: "بدهی‌ها", employee: "کارمندان",
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

const normalizeSalaryRow = (row = {}) => ({
  ...row,
  baseSalary:       pickNumber(row, ["baseSalary", "base_salary", "basicSalary"]),
  allowances:       pickNumber(row, ["allowances", "allowance", "bonuses"]),
  deductions:       pickNumber(row, ["deductions", "deduction", "otherDeductions"]),
  tax:              pickNumber(row, ["tax", "tax_amount", "taxAmount"]),
  insurance:        pickNumber(row, ["insurance", "insurance_amount", "insuranceAmount"]),
  advanceDeduction: pickNumber(row, ["advanceDeduction", "advance_deduction", "advance"]),
  grossSalary:      pickNumber(row, ["grossSalary", "gross_salary"]),
  netSalary:        pickNumber(row, ["netSalary", "net_salary"]),
  paidAmount:       pickNumber(row, ["paidAmount", "paid_amount"]),
  paid:             row.paymentStatus === "paid" || row.paid === true,
  // ✅ جدید
  tazkiraNumber:    row.tazkiraNumber ?? row.tazkira_number ?? null,
  accountType:      row.accountType ?? row.account_type ?? null,
});

export default function PayrollReports() {
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState(null);

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    employees: 0, totalSalary: 0, paid: 0, pending: 0,
    totalTax: 0, totalInsurance: 0, totalAdvance: 0,
    totalBase: 0, totalAllowances: 0, totalDeductions: 0, totalGross: 0,
    countPaid: 0, countPending: 0, countPartial: 0,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchPeriods = useCallback(async () => {
    try {
      setLoadingPeriods(true);
      const res = await api.get("/payroll/report-periods");
      if (res.data?.success) {
        const list = res.data.data || [];
        setPeriods(list);
        if (list.length > 0 && !selectedPeriodId) setSelectedPeriodId(list[0].id);
      }
    } catch (err) {
      console.error("fetchPeriods error:", err);
      setPeriods([]);
    } finally {
      setLoadingPeriods(false);
    }
  }, [selectedPeriodId]);

  const fetchReports = useCallback(async () => {
    if (!selectedPeriodId) return;
    const period = periods.find((p) => p.id === selectedPeriodId);
    if (!period) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/reports", { params: { month: period.month, year: period.year } });

      if (res.data?.success) {
        const list = (res.data.data || []).map(normalizeSalaryRow);
        setRows(list);

        const bt = res.data.totals;
        if (bt && typeof bt === "object") {
          setTotals({
            employees:       Number(bt.employees) || list.length,
            totalSalary:     Number(bt.totalSalary) || 0,
            paid:            Number(bt.paid) || 0,
            pending:         Number(bt.pending) || 0,
            totalTax:        Number(bt.totalTax) || 0,
            totalInsurance:  Number(bt.totalInsurance) || 0,
            totalAdvance:    Number(bt.totalAdvance) || 0,
            totalBase:       Number(bt.totalBase) || 0,
            totalAllowances: Number(bt.totalAllowances) || 0,
            totalDeductions: Number(bt.totalDeductions) || 0,
            totalGross:      Number(bt.totalGross) || 0,
            countPaid:       Number(bt.countPaid) || 0,
            countPending:    Number(bt.countPending) || 0,
            countPartial:    Number(bt.countPartial) || 0,
          });
        }
      } else {
        setError(res.data?.message || "خطا در دریافت گزارش");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "خطا در دریافت");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, periods]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  useEffect(() => { if (selectedPeriodId) fetchReports(); }, [selectedPeriodId, fetchReports]);

  const formatCurrency = (n) => new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const filteredRows = rows.filter((r) => {
    if (statusFilter === "paid" && !r.paid) return false;
    if (statusFilter === "pending" && r.paid) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (r.fullName || "").toLowerCase();
      const dept = (r.department || "").toLowerCase();
      const code = (r.employeeCode || "").toLowerCase();
      const tazkira = (r.tazkiraNumber || "").toLowerCase();
      if (!name.includes(q) && !dept.includes(q) && !code.includes(q) && !tazkira.includes(q)) return false;
    }
    return true;
  });

  const filteredTotals = {
    employees:       filteredRows.length,
    totalBase:       filteredRows.reduce((s, r) => s + r.baseSalary, 0),
    totalAllowances: filteredRows.reduce((s, r) => s + r.allowances, 0),
    totalDeductions: filteredRows.reduce((s, r) => s + r.deductions, 0),
    totalTax:        filteredRows.reduce((s, r) => s + r.tax, 0),
    totalInsurance:  filteredRows.reduce((s, r) => s + r.insurance, 0),
    totalAdvance:    filteredRows.reduce((s, r) => s + r.advanceDeduction, 0),
    totalSalary:     filteredRows.reduce((s, r) => s + r.netSalary, 0),
  };

  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
  const periodLabel = currentPeriod ? `${currentPeriod.month} ${currentPeriod.year}` : "";

  const handleExportCSV = () => {
    if (filteredRows.length === 0) { alert("داده‌ای برای خروجی وجود ندارد"); return; }

    const headers = [
      "#", "نام کارمند", "تذکره", "نوعیت حساب", "بخش", "منبع", "کد کارمند",
      "معاش پایه", "مزایا", "کسرات", "مالیه", "بیمه", "پیش‌پرداخت",
      "معاش ناخالص", "معاش خالص", "تاریخ پرداخت", "وضعیت",
    ];
    const data = filteredRows.map((r, i) => [
      i + 1,
      r.fullName || "—",
      r.tazkiraNumber || "—",                                 // ✅ جدید
      ACCOUNT_TYPE_FA[r.accountType] || r.accountType || "—", // ✅ جدید
      r.department || "—",
      r.sourceLabel || (r.source === "user" ? "کاربر" : "حساب"),
      r.employeeCode || "—",
      r.baseSalary, r.allowances, r.deductions,
      r.tax, r.insurance, r.advanceDeduction,
      r.grossSalary || (r.baseSalary + r.allowances),
      r.netSalary,
      r.paymentDate || "—",
      r.paid ? "پرداخت شده" : "در انتظار",
    ]);

    data.push([
      "جمع کل", "", "", "", "", "", "",
      filteredTotals.totalBase, filteredTotals.totalAllowances, filteredTotals.totalDeductions,
      filteredTotals.totalTax, filteredTotals.totalInsurance, filteredTotals.totalAdvance,
      filteredTotals.totalBase + filteredTotals.totalAllowances, filteredTotals.totalSalary,
      "", "",
    ]);

    const csvContent = "\uFEFF" + [headers, ...data].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${currentPeriod?.month || ""}-${currentPeriod?.year || ""}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  if (loadingPeriods) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  if (periods.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">📊 گزارشات معاشات</Typography>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchPeriods}>بازخوانی</Button>
        </Box>
        <Alert severity="info">هنوز هیچ معاشی ثبت نشده است. ابتدا از صفحه «پرداخت معاش» معاشات را تولید کنید.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">📊 گزارشات معاشات</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchPeriods}>بازخوانی دوره‌ها</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select size="small" label="دوره معاش (ماه / سال)"
                value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}
                helperText={`${periods.length} دوره موجود`}>
                {periods.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.month} {p.year}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth select size="small" label="وضعیت"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">همه ({rows.length})</MenuItem>
                <MenuItem value="paid">پرداخت شده ({rows.filter(r => r.paid).length})</MenuItem>
                <MenuItem value="pending">در انتظار ({rows.filter(r => !r.paid).length})</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" placeholder="جستجو در نام، بخش، کد، تذکره..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ textAlign: "left" }}>
              <Button startIcon={<FileDownloadIcon />} onClick={handleExportCSV}
                disabled={filteredRows.length === 0} sx={{ mr: 1 }} size="small">
                Excel
              </Button>
              <Button startIcon={<PrintIcon />} color="info" onClick={handlePrint} size="small">
                چاپ
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "primary.50", borderRight: "4px solid", borderColor: "primary.main" }}>
            <CardContent>
              <Typography variant="body2">تعداد کل معاشات</Typography>
              <Typography variant="h5" fontWeight="bold">{totals.employees} نفر</Typography>
              <Typography variant="caption" color="text.secondary">
                {totals.countPaid} پرداخت‌شده • {totals.countPending} در انتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "info.50", borderRight: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع معاشات خالص</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">{formatCurrency(totals.totalSalary)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "success.50", borderRight: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2">پرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(totals.paid)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "warning.50", borderRight: "4px solid", borderColor: "warning.main" }}>
            <CardContent>
              <Typography variant="body2">باقی‌مانده</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">{formatCurrency(totals.pending)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">لیست معاشات - {periodLabel}</Typography>
            <Chip label={`${filteredRows.length} ردیف نمایش داده شده`} color="primary" variant="outlined" size="small" />
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : filteredRows.length === 0 ? (
            <Alert severity="warning">هیچ معاشی با این فیلترها یافت نشد.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table dir="rtl" size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell align="right">#</TableCell>
                    <TableCell align="right">نام کارمند</TableCell>
                    <TableCell align="right">تذکره</TableCell>{/* ✅ جدید */}
                    <TableCell align="right">نوعیت حساب</TableCell>{/* ✅ جدید */}
                    <TableCell align="right">بخش</TableCell>
                    <TableCell align="right">منبع</TableCell>
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
                  {filteredRows.map((r, idx) => (
                    <TableRow key={r.id || idx} hover sx={{ opacity: r.paid ? 0.7 : 1 }}>
                      <TableCell align="right">{idx + 1}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>{r.fullName || "—"}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                        {r.tazkiraNumber || "—"}{/* ✅ جدید */}
                      </TableCell>
                      <TableCell align="right">
                        {r.accountType ? (/* ✅ جدید */
                          <Chip label={ACCOUNT_TYPE_FA[r.accountType] || r.accountType}
                            size="small" color="primary" variant="outlined" />
                        ) : "—"}
                      </TableCell>
                      <TableCell align="right">{r.department || "—"}</TableCell>
                      <TableCell align="right">
                        <Chip
                          icon={r.source === "user" ? <PersonIcon /> : <BusinessIcon />}
                          label={r.sourceLabel || (r.source === "user" ? "کاربر" : "حساب")}
                          size="small"
                          color={r.source === "user" ? "info" : "secondary"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(r.baseSalary)}</TableCell>
                      <TableCell align="right" sx={{ color: "success.main" }}>+{formatCurrency(r.allowances)}</TableCell>
                      <TableCell align="right" sx={{ color: "error.main" }}>-{formatCurrency(r.deductions)}</TableCell>
                      <TableCell align="right" sx={{ color: "error.main" }}>
                        {r.tax > 0 ? `-${formatCurrency(r.tax)}` : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "error.main" }}>
                        {r.insurance > 0 ? `-${formatCurrency(r.insurance)}` : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "warning.main" }}>
                        {r.advanceDeduction > 0 ? `-${formatCurrency(r.advanceDeduction)}` : "—"}
                      </TableCell>
                      <TableCell align="right"><strong>{formatCurrency(r.netSalary)}</strong></TableCell>
                      <TableCell align="right">
                        {r.paid ? (
                          <Chip icon={<CheckCircleIcon />} label="پرداخت شده" size="small" color="success" />
                        ) : (
                          <Chip label="در انتظار" size="small" color="warning" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow sx={{ bgcolor: "grey.200", fontWeight: "bold" }}>
                    <TableCell align="right" colSpan={6}>
                      جمع کل ({filteredTotals.employees} نفر)
                    </TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalBase)}</TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalAllowances)}</TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalDeductions)}</TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalTax)}</TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalInsurance)}</TableCell>
                    <TableCell align="right">{formatCurrency(filteredTotals.totalAdvance)}</TableCell>
                    <TableCell align="right"><strong>{formatCurrency(filteredTotals.totalSalary)}</strong></TableCell>
                    <TableCell align="right">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          button, .MuiButton-root, .MuiIconButton-root, .MuiChip-root { display: none !important; }
          .MuiCard-root { box-shadow: none !important; border: 1px solid #ddd !important; }
          body { margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </Box>
  );
}