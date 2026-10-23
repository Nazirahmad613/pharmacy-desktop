// src/app/routes/payroll/PayrollReports.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, CircularProgress, Alert,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../../../../api";

const MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

// ✅ انتخاب اولین فیلد عددی موجود
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

// ✅ نرمال‌سازی ردیف گزارش (تجمیعی)
const normalizeReportRow = (row = {}) => ({
  ...row,
  department: row.department || "بدون بخش",
  employees: Number(row.employees) || 0,
  totalSalary: Number(row.totalSalary) || 0,
  paid: Number(row.paid) || 0,
  pending: Number(row.pending) || 0,
  totalTax: pickNumber(row, ["totalTax", "tax", "total_tax", "taxTotal"]),
  totalInsurance: pickNumber(row, [
    "totalInsurance", "insurance", "total_insurance", "insuranceTotal",
  ]),
  totalAdvance: pickNumber(row, [
    "totalAdvance", "advanceDeduction", "advance", "total_advance",
  ]),
});

export default function PayrollReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(MONTHS[4]);
  const [year, setYear] = useState("1403");
  const [reportData, setReportData] = useState([]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/payroll/reports", { params: { month, year } });
      if (res.data?.success) {
        // ✅ نرمال‌سازی ردیف‌ها
        setReportData((res.data.data || []).map(normalizeReportRow));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "خطا در دریافت");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const totalEmployees = reportData.reduce((s, d) => s + (Number(d.employees) || 0), 0);
  const totalSalary = reportData.reduce((s, d) => s + (Number(d.totalSalary) || 0), 0);
  const totalPaid = reportData.reduce((s, d) => s + (Number(d.paid) || 0), 0);
  const totalPending = reportData.reduce((s, d) => s + (Number(d.pending) || 0), 0);
  const totalTax = reportData.reduce((s, d) => s + (Number(d.totalTax) || 0), 0);
  const totalInsurance = reportData.reduce((s, d) => s + (Number(d.totalInsurance) || 0), 0);
  const totalAdvance = reportData.reduce((s, d) => s + (Number(d.totalAdvance) || 0), 0);

  const handleExportCSV = () => {
    const headers = [
      "#", "بخش", "تعداد کارمندان", "مجموع معاش",
      "مالیه", "بیمه", "پیش‌پرداخت",
      "پرداخت شده", "باقی‌مانده", "درصد",
    ];
    const rows = reportData.map((row, i) => {
      const pct = row.totalSalary ? Math.round((row.paid / row.totalSalary) * 100) : 0;
      return [
        i + 1, row.department, row.employees, row.totalSalary,
        row.totalTax, row.totalInsurance, row.totalAdvance,
        row.paid, row.pending, `${pct}%`,
      ];
    });

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${month}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

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
        <Typography variant="h4" fontWeight="bold">📊 گزارشات معاشات</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchReports}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth select size="small" label="ماه"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth size="small" label="سال"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={7} sx={{ textAlign: "left" }}>
              <Button
                startIcon={<FileDownloadIcon />}
                sx={{ mr: 1 }}
                onClick={handleExportCSV}
              >
                خروجی Excel
              </Button>
              <Button startIcon={<PrintIcon />} color="info" onClick={handlePrint}>
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
              <Typography variant="body2">تعداد کل کارمندان</Typography>
              <Typography variant="h5" fontWeight="bold">{totalEmployees} نفر</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "info.50", borderRight: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع معاشات</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatCurrency(totalSalary)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "success.50", borderRight: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2">پرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "warning.50", borderRight: "4px solid", borderColor: "warning.main" }}>
            <CardContent>
              <Typography variant="body2">باقی‌مانده</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {formatCurrency(totalPending)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* ✅ کارت‌های جدید: مالیه و بیمه */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: "error.50", borderRight: "4px solid", borderColor: "error.main" }}>
            <CardContent>
              <Typography variant="body2">مجموع مالیه</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(totalTax)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: "warning.50", borderRight: "4px solid", borderColor: "warning.dark" }}>
            <CardContent>
              <Typography variant="body2">مجموع بیمه</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.dark">
                {formatCurrency(totalInsurance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>
            گزارش معاشات بخش‌ها - {month} {year}
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            💡 این گزارش فقط کاربران سیستم را بر اساس دپارتمان نشان می‌دهد.
            کارمندان طرف‌حساب (حسابات) بدون دپارتمان محاسبه می‌شوند.
          </Alert>

          {reportData.length === 0 ? (
            <Alert severity="warning">
              هیچ داده‌ای برای این دوره یافت نشد. ابتدا معاشات را از صفحه «پرداخت معاش» تولید کنید.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table dir="rtl">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell align="right">#</TableCell>
                    <TableCell align="right">بخش</TableCell>
                    <TableCell align="right">تعداد کارمندان</TableCell>
                    <TableCell align="right">مجموع معاش</TableCell>
                    <TableCell align="right">مالیه</TableCell>
                    <TableCell align="right">بیمه</TableCell>
                    <TableCell align="right">پیش‌پرداخت</TableCell>
                    <TableCell align="right">پرداخت شده</TableCell>
                    <TableCell align="right">باقی‌مانده</TableCell>
                    <TableCell align="right">درصد پرداخت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row, idx) => {
                    const pct = row.totalSalary
                      ? Math.round((row.paid / row.totalSalary) * 100)
                      : 0;
                    return (
                      <TableRow key={idx} hover>
                        <TableCell align="right">{idx + 1}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold" }}>{row.department}</TableCell>
                        <TableCell align="right">{row.employees}</TableCell>
                        <TableCell align="right">{formatCurrency(row.totalSalary)}</TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          {row.totalTax > 0 ? `-${formatCurrency(row.totalTax)}` : "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          {row.totalInsurance > 0 ? `-${formatCurrency(row.totalInsurance)}` : "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "warning.main" }}>
                          {row.totalAdvance > 0 ? `-${formatCurrency(row.totalAdvance)}` : "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "success.main" }}>
                          {formatCurrency(row.paid)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "warning.main" }}>
                          {formatCurrency(row.pending)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${pct}%`}
                            size="small"
                            color={pct === 100 ? "success" : pct > 70 ? "info" : "warning"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: "grey.100", fontWeight: "bold" }}>
                    <TableCell align="right" colSpan={2}>جمع کل</TableCell>
                    <TableCell align="right">{totalEmployees}</TableCell>
                    <TableCell align="right">{formatCurrency(totalSalary)}</TableCell>
                    <TableCell align="right">{formatCurrency(totalTax)}</TableCell>
                    <TableCell align="right">{formatCurrency(totalInsurance)}</TableCell>
                    <TableCell align="right">{formatCurrency(totalAdvance)}</TableCell>
                    <TableCell align="right">{formatCurrency(totalPaid)}</TableCell>
                    <TableCell align="right">{formatCurrency(totalPending)}</TableCell>
                    <TableCell align="right">
                      {totalSalary > 0
                        ? `${Math.round((totalPaid / totalSalary) * 100)}%`
                        : "0%"}
                    </TableCell>
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