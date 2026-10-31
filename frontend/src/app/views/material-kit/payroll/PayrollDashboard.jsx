// src/app/routes/payroll/PayrollDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip,
  CircularProgress, Alert, LinearProgress, Divider, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, MenuItem, TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useLocation, useNavigate } from "react-router-dom";
import { getLogicalParentPath } from "app/navigations";
import api from "../../../../api";

const ACCOUNT_TYPE_FA = {
  asset: "دارایی", liability: "بدهی", equity: "سرمایه",
  income: "درآمد", expense: "هزینه", receivable: "مطالبات",
  payable: "بدهی‌ها", employee: "کارمندان",
};

const MONTHS = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت",
];

// ✅ تبدیل تاریخ میلادی به شمسی
const getJalaliDate = (date = new Date()) => {
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

  if (jDayOfYear <= 0) {
    jy--;
    jDayOfYear += 365 + (isLeap ? 1 : 0);
  }

  let jm = 0;
  let remaining = jDayOfYear;
  while (remaining > jDaysInMonth[jm]) {
    remaining -= jDaysInMonth[jm];
    jm++;
    if (jm > 11) { jm = 0; jy++; }
  }

  return {
    year: jy,
    month: jm + 1,
    day: remaining,
    monthName: MONTHS[jm],
    yearStr: String(jy),
  };
};

// ✅ لیست سال‌های قابل انتخاب (از سال جاری شمسی تا ۵ سال قبل)
const buildYearOptions = (currentYear) => {
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    years.push(String(y));
  }
  return years;
};

const getAccountTypeDisplay = (row) => {
  if (!row) return "—";
  return (
    row.accountTypeLabel
    || ACCOUNT_TYPE_FA[row.accountType]
    || row.accountType
    || "—"
  );
};

const getDepartmentDisplay = (row) => {
  if (!row) return "—";
  const dept = row.department || "";
  if (dept) return dept;
  return row.accountCategoryLabel || "—";
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

const formatNumber = (n) =>
  new Intl.NumberFormat("fa-AF").format(Number(n) || 0);

// ✅ کارت آمار
function StatCard({ title, value, subtitle, icon, color = "#3b82f6" }) {
  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        border: `1px solid ${color}40`,
        borderRadius: "12px",
        transition: "all 0.2s",
        height: "100%",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 24px ${color}30`,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography sx={{ color: "#94a3b8", fontSize: "13px", mb: 1 }}>
              {title}
            </Typography>
            <Typography sx={{ color: color, fontSize: "24px", fontWeight: "bold", mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography sx={{ color: "#64748b", fontSize: "12px" }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: `${color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function PayrollDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const parentPath = getLogicalParentPath(location.pathname);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  // ✅ دوره جاری شمسی (برای مقدار اولیه)
  const currentJalali = getJalaliDate();

  // ✅ فیلتر ماه و سال
  const [selectedMonth, setSelectedMonth] = useState(currentJalali.monthName);
  const [selectedYear, setSelectedYear] = useState(currentJalali.yearStr);

  // ✅ گزینه‌های سال
  const yearOptions = buildYearOptions(currentJalali.year);

  // ✅ آیا فیلتر روی دوره جاری است؟
  const isCurrentPeriod =
    selectedMonth === currentJalali.monthName &&
    selectedYear === currentJalali.yearStr;

  const fetchDashboard = useCallback(async (month, year) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/payroll/dashboard", {
        params: {
          month: month,
          year: year,
        },
      });

      if (res.data?.success) {
        setDashboard(res.data);
      } else {
        setError(res.data?.message || "خطا در دریافت داشبورد");
      }
    } catch (err) {
      console.error("getDashboard error:", err);
      setError(err.response?.data?.message || err.message || "خطا در ارتباط");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ وقتی ماه یا سال تغییر کرد، دوباره fetch کن
  useEffect(() => {
    fetchDashboard(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard(selectedMonth, selectedYear);
  };

  const handleGoToCurrentPeriod = () => {
    const p = getJalaliDate();
    setSelectedMonth(p.monthName);
    setSelectedYear(p.yearStr);
  };

  if (loading && !dashboard) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={handleRefresh}>
          تلاش مجدد
        </Button>
      </Box>
    );
  }

  if (!dashboard) return null;

  const stats = dashboard.stats || {};
  const recentPayments = dashboard.recentPayments || [];

  return (
    <Box dir="rtl" sx={{ p: 3, background: "#0f172a", minHeight: "100vh" }}>
      {parentPath && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(parentPath)}
            sx={{
              color: "#60a5fa",
              borderColor: "#3b82f6",
              "&:hover": { borderColor: "#60a5fa", background: "rgba(59,130,246,0.1)" },
            }}
          >
            بازگشت به صفحه قبلی
          </Button>
        </Box>
      )}

      {/* هدر */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#fff" }}>
            📊 داشبورد معاشات
          </Typography>
          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.75 }}>
            <CalendarMonthIcon sx={{ color: "#60a5fa", fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              دوره انتخابی:
            </Typography>
            <Chip
              label={`${selectedMonth} ${selectedYear}`}
              size="small"
              sx={{
                background: isCurrentPeriod
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            />
            {!isCurrentPeriod && (
              <Button
                size="small"
                onClick={handleGoToCurrentPeriod}
                sx={{ color: "#60a5fa", fontSize: "11px", textTransform: "none" }}
              >
                (برگشت به دوره جاری)
              </Button>
            )}
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={handleRefresh}
          disabled={loading}
          sx={{
            color: "#60a5fa",
            borderColor: "#3b82f6",
            "&:hover": {
              borderColor: "#60a5fa",
              background: "rgba(59, 130, 246, 0.1)",
            },
          }}
        >
          {loading ? "در حال بروزرسانی..." : "بروزرسانی"}
        </Button>
      </Box>

      {/* فیلتر ماه و سال */}
      <Card
        sx={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          mb: 3,
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="ماه"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#fff",
                    background: "#0f172a",
                    "& fieldset": { borderColor: "#334155" },
                    "&:hover fieldset": { borderColor: "#60a5fa" },
                    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                  },
                  "& .MuiInputLabel-root": { color: "#94a3b8" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                }}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="سال"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#fff",
                    background: "#0f172a",
                    "& fieldset": { borderColor: "#334155" },
                    "&:hover fieldset": { borderColor: "#60a5fa" },
                    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                  },
                  "& .MuiInputLabel-root": { color: "#94a3b8" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#60a5fa" },
                }}
              >
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoToCurrentPeriod}
                disabled={isCurrentPeriod}
                sx={{
                  color: isCurrentPeriod ? "#64748b" : "#10b981",
                  borderColor: isCurrentPeriod ? "#334155" : "#10b981",
                  "&:hover": {
                    borderColor: "#10b981",
                    background: "rgba(16, 185, 129, 0.1)",
                  },
                }}
              >
                دوره جاری
              </Button>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: "right", md: "left" } }}>
              <Typography sx={{ color: "#94a3b8", fontSize: "13px" }}>
                {isCurrentPeriod
                  ? "✅ در حال مشاهده دوره جاری"
                  : `📅 در حال مشاهده ${selectedMonth} ${selectedYear}`}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {/* کارت‌های آمار اصلی */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تعداد کارمندان"
            value={formatNumber(stats.totalEmployees)}
            subtitle="کاربران + طرف‌حساب‌ها"
            icon={<PeopleIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="مجموع معاشات ماهانه"
            value={formatCurrency(stats.totalSalaries)}
            subtitle="حقوق پایه + مزایا − کسورات"
            icon={<AccountBalanceWalletIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="پرداخت شده این ماه"
            value={formatCurrency(stats.paidThisMonth)}
            subtitle={`${stats.paymentProgress || 0}% از مجموع`}
            icon={<CheckCircleIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="در انتظار پرداخت"
            value={formatCurrency(stats.pendingPayments)}
            subtitle="باقی‌مانده پرداخت‌نشده"
            icon={<PendingIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      {/* کارت‌های دوم */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="مجموع پیش‌پرداخت‌ها"
            value={formatCurrency(stats.totalAdvances)}
            subtitle="در انتظار + تأییدشده"
            icon={<TrendingDownIcon />}
            color="#ec4899"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid #334155",
              borderRadius: "12px",
              height: "100%",
            }}
          >
            <CardContent>
              <Typography sx={{ color: "#94a3b8", fontSize: "13px", mb: 1.5 }}>
                پیشرفت پرداخت — {selectedMonth} {selectedYear}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={1.5}>
                <Typography sx={{ color: "#10b981", fontSize: "26px", fontWeight: "bold" }}>
                  {stats.paymentProgress || 0}%
                </Typography>
                <TrendingUpIcon sx={{ color: "#10b981" }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, stats.paymentProgress || 0)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#334155",
                  "& .MuiLinearProgress-bar": {
                    background: "linear-gradient(90deg, #10b981, #059669)",
                  },
                }}
              />
              <Typography sx={{ color: "#64748b", fontSize: "12px", mt: 1.5 }}>
                از {formatCurrency(stats.totalSalaries)} مجموع معاشات ماهانه
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid #334155",
              borderRadius: "12px",
              height: "100%",
            }}
          >
            <CardContent>
              <Typography sx={{ color: "#94a3b8", fontSize: "13px", mb: 2 }}>
                خلاصه وضعیت
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PaymentsIcon sx={{ color: "#10b981", fontSize: 18 }} />
                    <Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>
                      پرداخت شده
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#10b981", fontWeight: "bold", fontSize: "13px" }}>
                    {formatCurrency(stats.paidThisMonth)}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: "#334155" }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PendingIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                    <Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>
                      در انتظار
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#f59e0b", fontWeight: "bold", fontSize: "13px" }}>
                    {formatCurrency(stats.pendingPayments)}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: "#334155" }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingDownIcon sx={{ color: "#ec4899", fontSize: 18 }} />
                    <Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>
                      پیش‌پرداخت‌ها
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#ec4899", fontWeight: "bold", fontSize: "13px" }}>
                    {formatCurrency(stats.totalAdvances)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* آخرین پرداخت‌ها */}
      <Card
        sx={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <ReceiptLongIcon sx={{ color: "#60a5fa" }} />
            <Typography variant="h6" sx={{ color: "#fff", fontWeight: "bold" }}>
              آخرین پرداخت‌ها
            </Typography>
            <Chip
              label={`${selectedMonth} ${selectedYear}`}
              size="small"
              sx={{
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                fontWeight: "bold",
                fontSize: "11px",
                ml: 1,
              }}
            />
          </Box>
          <Divider sx={{ borderColor: "#334155", mb: 2 }} />

          {recentPayments.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              هیچ پرداختی برای دوره {selectedMonth} {selectedYear} ثبت نشده است.
              ابتدا از صفحه «پرداخت معاش» معاشات این دوره را تولید کنید.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ background: "transparent", boxShadow: "none" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: "#0f172a" }}>
                    <TableCell sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      کارمند
                    </TableCell>
                    <TableCell sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      تذکره
                    </TableCell>
                    <TableCell sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      نوعیت حساب
                    </TableCell>
                    <TableCell sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      بخش
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      مبلغ
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      تاریخ
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#60a5fa", fontWeight: "bold", borderBottom: "1px solid #334155" }}>
                      وضعیت
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow
                      key={p.id}
                      sx={{
                        "&:hover": { background: "#0f172a" },
                        transition: "background 0.2s",
                      }}
                    >
                      <TableCell sx={{ color: "#fff", borderBottom: "1px solid #1e293b" }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: "#8b5cf6", fontSize: 13 }}>
                            {(p.name || "?")[0]}
                          </Avatar>
                          <Typography sx={{ color: "#fff", fontSize: "13px", fontWeight: "bold" }}>
                            {p.name || "—"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "#e2e8f0", borderBottom: "1px solid #1e293b", fontFamily: "monospace", fontSize: "12px" }}>
                        {p.tazkiraNumber || "—"}
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #1e293b" }}>
                        <Chip
                          label={getAccountTypeDisplay(p)}
                          size="small"
                          sx={{ background: "#3b82f6", color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#e2e8f0", borderBottom: "1px solid #1e293b", fontSize: "13px" }}>
                        {getDepartmentDisplay(p)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#10b981", borderBottom: "1px solid #1e293b", fontWeight: "bold", fontSize: "13px" }}>
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#94a3b8", borderBottom: "1px solid #1e293b", fontSize: "12px" }}>
                        {p.date || "—"}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: "1px solid #1e293b" }}>
                        <Chip
                          icon={p.status === "پرداخت شده" ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <PendingIcon sx={{ fontSize: 14 }} />}
                          label={p.status}
                          size="small"
                          sx={{
                            background: p.status === "پرداخت شده" ? "#10b981" : "#f59e0b",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "11px",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}