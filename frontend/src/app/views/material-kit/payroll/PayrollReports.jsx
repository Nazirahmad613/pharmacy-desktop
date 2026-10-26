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

// ✅ نوعیت حساب: اولویت با نوع کلی
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
  if (dept) return dept;
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

const normalizeSalaryRow = (row = {}) => {
  const normalized = {
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

    tazkiraNumber:        row.tazkiraNumber        ?? row.tazkira_number        ?? null,
    accountType:          row.accountType          ?? row.account_type          ?? null,
    accountCategory:      row.accountCategory      ?? row.account_category      ?? null,
    accountTypeLabel:     row.accountTypeLabel     ?? row.account_type_label    ?? null,
    accountCategoryLabel: row.accountCategoryLabel ?? row.account_category_label ?? null,
  };

  normalized.department = resolveDepartment(normalized);
  return normalized;
};

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
      r.tazkiraNumber || "—",
      getAccountTypeDisplay(r),
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

  // ✅ چاپ اختصاصی: پنجره‌ی چاپ مستقل با HTML و استایل مخصوص
  const handlePrint = () => {
    if (filteredRows.length === 0) {
      alert("داده‌ای برای چاپ وجود ندارد");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      alert("لطفاً پنجره‌های پاپ‌آپ را برای این سایت فعال کنید");
      return;
    }

    const formatNum = (n) => new Intl.NumberFormat("fa-AF").format(Number(n) || 0);
    const esc = (s) => String(s ?? "—").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

    const totalGross = filteredTotals.totalBase + filteredTotals.totalAllowances;

    const rowsHtml = filteredRows.map((r, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="name">${esc(r.fullName)}</td>
        <td class="mono">${esc(r.tazkiraNumber)}</td>
        <td>${esc(getAccountTypeDisplay(r))}</td>
        <td>${esc(r.department)}</td>
        <td class="center">${esc(r.sourceLabel || (r.source === "user" ? "کاربر" : "حساب"))}</td>
        <td class="num">${formatNum(r.baseSalary)}</td>
        <td class="num pos">${formatNum(r.allowances)}</td>
        <td class="num neg">${formatNum(r.deductions)}</td>
        <td class="num neg">${r.tax > 0 ? formatNum(r.tax) : "—"}</td>
        <td class="num neg">${r.insurance > 0 ? formatNum(r.insurance) : "—"}</td>
        <td class="num warn">${r.advanceDeduction > 0 ? formatNum(r.advanceDeduction) : "—"}</td>
        <td class="num strong">${formatNum(r.netSalary)}</td>
        <td class="center">
          <span class="badge ${r.paid ? "badge-paid" : "badge-pending"}">
            ${r.paid ? "پرداخت شده" : "در انتظار"}
          </span>
        </td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8" />
<title>گزارش معاشات - ${esc(periodLabel)}</title>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Vazirmatn", "Tahoma", "Segoe UI", sans-serif;
    color: #111827;
    font-size: 10.5px;
    line-height: 1.5;
    padding: 8px;
  }

  /* هدر گزارش */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1e3a8a;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .header .brand h1 { margin: 0; font-size: 19px; color: #1e3a8a; font-weight: 800; }
  .header .brand .sub { margin-top: 3px; font-size: 11px; color: #4b5563; }
  .header .meta { text-align: left; font-size: 10px; color: #4b5563; line-height: 1.8; }
  .header .meta strong { color: #111827; }

  /* کارت‌های خلاصه */
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .summary .box {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 8px 10px;
    background: #f9fafb;
  }
  .summary .box .label { font-size: 9.5px; color: #6b7280; }
  .summary .box .value { font-size: 13px; font-weight: 800; margin-top: 2px; }
  .summary .box .value.primary { color: #1e3a8a; }
  .summary .box .value.success { color: #047857; }
  .summary .box .value.warning { color: #b45309; }

  /* جدول */
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  thead { display: table-header-group; } /* تکرار هدر در صفحات بعدی */
  tfoot { display: table-row-group; }
  thead th {
    background: #1e3a8a;
    color: #fff;
    padding: 7px 5px;
    text-align: right;
    font-weight: 700;
    border: 1px solid #1e3a8a;
    white-space: nowrap;
    font-size: 9.5px;
  }
  tbody td {
    padding: 5px;
    border: 1px solid #d1d5db;
    text-align: right;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) { background: #f3f4f6; }
  tbody tr { page-break-inside: avoid; }
  tbody td.name { font-weight: 700; white-space: nowrap; }
  .center { text-align: center !important; }
  .num { text-align: left !important; font-family: "Courier New", monospace; direction: ltr; white-space: nowrap; }
  .mono { font-family: "Courier New", monospace; direction: ltr; text-align: center !important; font-size: 8.5px; }
  .pos { color: #047857; }
  .neg { color: #b91c1c; }
  .warn { color: #b45309; }
  .strong { font-weight: 800; color: #1e3a8a; }

  /* نشان وضعیت */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 8.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .badge-paid { background: #d1fae5; color: #047857; border: 1px solid #6ee7b7; }
  .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }

  /* جمع کل */
  tfoot td {
    background: #e5e7eb;
    font-weight: 800;
    padding: 7px 5px;
    border: 1px solid #9ca3af;
    text-align: right;
  }

  /* امضاها */
  .sign {
    margin-top: 30px;
    display: flex;
    justify-content: space-around;
    page-break-inside: avoid;
  }
  .sign div { text-align: center; font-size: 10px; color: #374151; }
  .sign .line { border-top: 1px solid #374151; width: 160px; margin-top: 36px; }

  /* فوتر */
  .footer {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6b7280;
    border-top: 1px dashed #d1d5db;
    padding-top: 8px;
  }

  @media print {
    body { padding: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>📊 گزارش معاشات</h1>
      <div class="sub">دوره: <strong>${esc(periodLabel)}</strong> — تعداد ردیف: <strong>${filteredRows.length}</strong></div>
    </div>
    <div class="meta">
      تاریخ چاپ: <strong>${esc(new Date().toLocaleDateString("fa-AF"))}</strong><br/>
      وضعیت فیلتر: <strong>${statusFilter === "all" ? "همه" : statusFilter === "paid" ? "پرداخت شده" : "در انتظار"}</strong>
    </div>
  </div>

  <div class="summary">
    <div class="box"><div class="label">تعداد معاشات</div><div class="value">${filteredTotals.employees} نفر</div></div>
    <div class="box"><div class="label">معاش ناخالص</div><div class="value primary">${formatNum(totalGross)} ؋</div></div>
    <div class="box"><div class="label">معاش خالص</div><div class="value primary">${formatNum(filteredTotals.totalSalary)} ؋</div></div>
    <div class="box"><div class="label">باقی‌مانده کل</div><div class="value warning">${formatNum(totals.pending)} ؋</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>نام کارمند</th>
        <th class="center">تذکره</th>
        <th>نوعیت حساب</th>
        <th>بخش</th>
        <th class="center">منبع</th>
        <th>معاش پایه</th>
        <th>مزایا</th>
        <th>کسرات</th>
        <th>مالیه</th>
        <th>بیمه</th>
        <th>پیش‌پرداخت</th>
        <th>معاش خالص</th>
        <th class="center">وضعیت</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">جمع کل (${filteredTotals.employees} نفر)</td>
        <td class="num">${formatNum(filteredTotals.totalBase)}</td>
        <td class="num">${formatNum(filteredTotals.totalAllowances)}</td>
        <td class="num">${formatNum(filteredTotals.totalDeductions)}</td>
        <td class="num">${formatNum(filteredTotals.totalTax)}</td>
        <td class="num">${formatNum(filteredTotals.totalInsurance)}</td>
        <td class="num">${formatNum(filteredTotals.totalAdvance)}</td>
        <td class="num strong">${formatNum(filteredTotals.totalSalary)}</td>
        <td class="center">—</td>
      </tr>
    </tfoot>
  </table>

  <div class="sign">
    <div>تهیه‌کننده<div class="line"></div></div>
    <div>مدیر مالی<div class="line"></div></div>
    <div>مدیر عمومی<div class="line"></div></div>
  </div>

  <div class="footer">
    <span>این گزارش توسط سیستم مدیریت معاشات تولید شده است.</span>
    <span>${esc(new Date().toLocaleString("fa-AF"))}</span>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      setTimeout(function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      }, 300);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

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
                    <TableCell align="right">تذکره</TableCell>
                    <TableCell align="right">نوعیت حساب</TableCell>
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
                        {r.tazkiraNumber || "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={getAccountTypeDisplay(r)} size="small" color="primary" variant="outlined" />
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
    </Box>
  );
}