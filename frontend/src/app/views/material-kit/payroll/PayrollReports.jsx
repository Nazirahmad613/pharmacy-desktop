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

export default function PayrollReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(MONTHS[4]);
  const [year, setYear] = useState("1403");
  const [reportData, setReportData] = useState([]);

  // ============================================================
  // ✅ دریافت گزارش‌ها
  // ============================================================
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/payroll/reports", {
        params: { month, year },
      });

      if (res.data?.success) {
        setReportData(res.data.data || []);
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
    new Intl.NumberFormat("fa-AF").format(n || 0) + " ؋";

  // ============================================================
  // Totals
  // ============================================================
  const totalEmployees = reportData.reduce((s, d) => s + (d.employees || 0), 0);
  const totalSalary = reportData.reduce((s, d) => s + (d.totalSalary || 0), 0);
  const totalPaid = reportData.reduce((s, d) => s + (d.paid || 0), 0);
  const totalPending = reportData.reduce((s, d) => s + (d.pending || 0), 0);

  // ============================================================
  // Export CSV
  // ============================================================
  const handleExportCSV = () => {
    const headers = ["#", "بخش", "تعداد کارمندان", "مجموع معاش", "پرداخت شده", "باقی‌مانده", "درصد"];
    const rows = reportData.map((row, i) => {
      const pct = row.totalSalary
        ? Math.round((row.paid / row.totalSalary) * 100)
        : 0;
      return [i + 1, row.department, row.employees, row.totalSalary, row.paid, row.pending, `${pct}%`];
    });

    const csvContent =
      "\uFEFF" + // BOM برای UTF-8
      [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${month}-${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
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
              <TextField fullWidth select size="small" label="ماه"
                value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" label="سال"
                value={year} onChange={(e) => setYear(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={7} sx={{ textAlign: "left" }}>
              <Button startIcon={<FileDownloadIcon />} sx={{ mr: 1 }}
                onClick={handleExportCSV}>
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
          <Card sx={{ bgcolor: "primary.50" }}>
            <CardContent>
              <Typography variant="body2">تعداد کل کارمندان</Typography>
              <Typography variant="h5" fontWeight="bold">{totalEmployees} نفر</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "info.50" }}>
            <CardContent>
              <Typography variant="body2">مجموع معاشات</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {formatCurrency(totalSalary)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "success.50" }}>
            <CardContent>
              <Typography variant="body2">پرداخت شده</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "warning.50" }}>
            <CardContent>
              <Typography variant="body2">باقی‌مانده</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {formatCurrency(totalPending)}
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

          {reportData.length === 0 ? (
            <Alert severity="info">
              هیچ داده‌ای برای این دوره یافت نشد. ابتدا معاشات را از صفحه «پرداخت معاش» تولید کنید.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell>#</TableCell>
                    <TableCell>بخش</TableCell>
                    <TableCell>تعداد کارمندان</TableCell>
                    <TableCell>مجموع معاش</TableCell>
                    <TableCell>پرداخت شده</TableCell>
                    <TableCell>باقی‌مانده</TableCell>
                    <TableCell>درصد پرداخت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((row, idx) => {
                    const pct = row.totalSalary
                      ? Math.round((row.paid / row.totalSalary) * 100)
                      : 0;
                    return (
                      <TableRow key={idx} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell fontWeight="bold">{row.department}</TableCell>
                        <TableCell>{row.employees}</TableCell>
                        <TableCell>{formatCurrency(row.totalSalary)}</TableCell>
                        <TableCell sx={{ color: "success.main" }}>
                          {formatCurrency(row.paid)}
                        </TableCell>
                        <TableCell sx={{ color: "warning.main" }}>
                          {formatCurrency(row.pending)}
                        </TableCell>
                        <TableCell>
                          <Chip label={`${pct}%`} size="small"
                            color={pct === 100 ? "success" : pct > 70 ? "info" : "warning"} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: "grey.100", fontWeight: "bold" }}>
                    <TableCell colSpan={2}>جمع کل</TableCell>
                    <TableCell>{totalEmployees}</TableCell>
                    <TableCell>{formatCurrency(totalSalary)}</TableCell>
                    <TableCell>{formatCurrency(totalPaid)}</TableCell>
                    <TableCell>{formatCurrency(totalPending)}</TableCell>
                    <TableCell>
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