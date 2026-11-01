// src/app/views/material-kit/emergency/EmergencyHistory.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "app/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, Grid, Typography, CircularProgress, Alert, Chip,
  TextField, MenuItem, Button, IconButton, Tooltip, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Avatar, InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  LocalHospital as EmergencyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Hotel as HotelIcon,
  Cancel as CancelIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";

// ============================================================
// ✅ پیکربندی رنگ و متن سطح تریاژ
// ============================================================
const TRIAGE_META = {
  1: { label: "بحرانی",   color: "error",   bg: "#FFEBEE", text: "#B71C1C" },
  2: { label: "فوری",     color: "warning", bg: "#FFF3E0", text: "#E65100" },
  3: { label: "متوسط",    color: "info",    bg: "#E3F2FD", text: "#0D47A1" },
  4: { label: "کم",       color: "success", bg: "#E8F5E9", text: "#1B5E20" },
  5: { label: "غیرفوری",  color: "default", bg: "#F5F5F5", text: "#424242" },
};

const STATUS_META = {
  active:     { label: "فعال",      color: "error",   icon: <EmergencyIcon fontSize="small" /> },
  admitted:   { label: "بستری‌شده", color: "warning", icon: <HotelIcon fontSize="small" /> },
  discharged: { label: "ترخیص‌شده", color: "success", icon: <CheckCircleIcon fontSize="small" /> },
  cancelled:  { label: "لغو‌شده",   color: "default", icon: <CancelIcon fontSize="small" /> },
};

const TRIAGE_FILTER_OPTIONS = [
  { value: "",           label: "همه سطوح" },
  { value: "critical",   label: "بحرانی (۱)" },
  { value: "urgent",     label: "فوری (۲)" },
  { value: "moderate",   label: "متوسط (۳)" },
  { value: "low",        label: "کم (۴)" },
  { value: "non_urgent", label: "غیرفوری (۵)" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "",           label: "همه وضعیت‌ها" },
  { value: "active",     label: "فعال" },
  { value: "admitted",   label: "بستری‌شده" },
  { value: "discharged", label: "ترخیص‌شده" },
  { value: "cancelled",  label: "لغو‌شده" },
];

const toLocalDateInput = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString("fa-IR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return value;
  }
};

// ============================================================
// ✅ کامپوننت اصلی
// ============================================================
export default function EmergencyHistory() {
  const { api, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ===== فیلترها =====
  const today = useMemo(() => toLocalDateInput(new Date()), []);
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalDateInput(d);
  }, []);

  const [filters, setFilters] = useState({
    from_date: monthAgo,
    to_date: today,
    status: "",
    triage_level: "",
    search: "",
    per_page: 15,
    page: 1,
    sort_by: "arrival_time",
    sort_dir: "desc",
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 15 });
  const [summary, setSummary] = useState({ total: 0, active: 0, discharged: 0, admitted: 0, cancelled: 0, critical: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ===== Fetch =====
  const fetchHistory = useCallback(async (opts = {}) => {
    if (!user) return;
    const params = { ...filters, ...opts };
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/emergency/history", { params });
      const payload = res?.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setMeta(payload.meta || { total: 0, current_page: 1, last_page: 1, per_page: 15 });
      setSummary(payload.summary || { total: 0, active: 0, discharged: 0, admitted: 0, cancelled: 0, critical: 0 });
    } catch (err) {
      console.error("EmergencyHistory fetch error:", err);
      setError(
        err?.response?.data?.message ||
        "خطا در دریافت تاریخ مریضان اضطراری"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, user, filters]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("❌ لطفاً ابتدا وارد سیستم شوید");
      return;
    }
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // ===== تغییر فیلتر =====
  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => fetchHistory({ page: 1 });

  const clearFilters = () => {
    const reset = {
      from_date: monthAgo,
      to_date: today,
      status: "",
      triage_level: "",
      search: "",
      per_page: filters.per_page,
      page: 1,
      sort_by: "arrival_time",
      sort_dir: "desc",
    };
    setFilters(reset);
    fetchHistory(reset);
  };

  // ===== مرتب‌سازی =====
  const handleSort = (column) => {
    const newDir = filters.sort_by === column && filters.sort_dir === "desc" ? "asc" : "desc";
    const next = { ...filters, sort_by: column, sort_dir: newDir, page: 1 };
    setFilters(next);
    fetchHistory(next);
  };

  // ===== صفحه‌بندی =====
  const handleChangePage = (_e, newPage) => {
    const next = { ...filters, page: newPage + 1 };
    setFilters(next);
    fetchHistory(next);
  };

  const handleChangeRowsPerPage = (e) => {
    const next = { ...filters, per_page: parseInt(e.target.value, 10), page: 1 };
    setFilters(next);
    fetchHistory(next);
  };

  // ===== خروجی =====
  const handleExport = async () => {
    try {
      const res = await api.get("/emergency/history/export", {
        params: filters,
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emergency_history_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("خطا در خروجی گرفتن");
    }
  };

  // ===== ناوبری =====
  const goToCase = (row) => {
    navigate(`/emergency/${row.id}`);
  };

  // ===== کارت‌های خلاصه =====
  const summaryCards = [
    { key: "total",      label: "کل موارد",       value: summary.total,      color: "#1976D2", bg: "#E3F2FD", icon: <EmergencyIcon /> },
    { key: "active",     label: "فعال",           value: summary.active,     color: "#D32F2F", bg: "#FFEBEE", icon: <EmergencyIcon /> },
    { key: "critical",   label: "بحرانی",         value: summary.critical,   color: "#B71C1C", bg: "#FFCDD2", icon: <WarningIcon /> },
    { key: "admitted",   label: "بستری‌شده",     value: summary.admitted,   color: "#E65100", bg: "#FFF3E0", icon: <HotelIcon /> },
    { key: "discharged", label: "ترخیص‌شده",     value: summary.discharged, color: "#2E7D32", bg: "#E8F5E9", icon: <CheckCircleIcon /> },
    { key: "cancelled",  label: "لغو‌شده",        value: summary.cancelled,  color: "#616161", bg: "#F5F5F5", icon: <CancelIcon /> },
  ];

  // ===== رندر =====
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      {/* عنوان */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ bgcolor: "#D32F2F" }}>
            <EmergencyIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">تاریخ مریضان اضطراری</Typography>
            <Typography variant="caption" color="text.secondary">
              مشاهده و فیلتر سابقه کامل موارد اضطراری
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="بروزرسانی">
            <IconButton onClick={() => fetchHistory()} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            disabled={loading || rows.length === 0}
          >
            خروجی CSV
          </Button>
        </Stack>
      </Stack>

      {/* کارت‌های خلاصه */}
      <Grid container spacing={2} mb={2}>
        {summaryCards.map((c) => (
          <Grid item xs={6} sm={4} md={2} key={c.key}>
            <Card sx={{ p: 1.5, bgcolor: c.bg, borderLeft: `5px solid ${c.color}` }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ color: c.color }}>{c.icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: c.color }}>
                    {c.value}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* فیلترها */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">فیلترها</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="از تاریخ"
              value={filters.from_date}
              onChange={(e) => setFilter("from_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="تا تاریخ"
              value={filters.to_date}
              onChange={(e) => setFilter("to_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" select label="وضعیت"
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" select label="سطح تریاژ"
              value={filters.triage_level}
              onChange={(e) => setFilter("triage_level", e.target.value)}
            >
              {TRIAGE_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <TextField
              fullWidth size="small" label="جستجو (نام، شماره تماس، شماره پرونده، شکایت)"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilter("search", "")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={applyFilters}>
                اعمال فیلتر
              </Button>
              <Button variant="outlined" startIcon={<ClearIcon />} onClick={clearFilters}>
                پاک کردن
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* خطا */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* جدول */}
      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box textAlign="center" p={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              سابقه‌ای یافت نشد
            </Typography>
            <Typography variant="body2" color="text.secondary">
              بازه تاریخ یا فیلترها را تغییر دهید.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F5F5F5" }}>
                    <TableCell>#</TableCell>
                    <TableCell>شماره پرونده</TableCell>
                    <TableCell>مریض</TableCell>
                    <TableCell>داکتر</TableCell>
                    <TableCell sortDirection={filters.sort_by === "arrival_time" ? filters.sort_dir : false}>
                      <TableSortLabel
                        active={filters.sort_by === "arrival_time"}
                        direction={filters.sort_by === "arrival_time" ? filters.sort_dir : "desc"}
                        onClick={() => handleSort("arrival_time")}
                      >
                        زمان ورود
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>سطح تریاژ</TableCell>
                    <TableCell>شکایت اصلی</TableCell>
                    <TableCell>وضعیت</TableCell>
                    <TableCell sortDirection={filters.sort_by === "discharge_time" ? filters.sort_dir : false}>
                      <TableSortLabel
                        active={filters.sort_by === "discharge_time"}
                        direction={filters.sort_by === "discharge_time" ? filters.sort_dir : "desc"}
                        onClick={() => handleSort("discharge_time")}
                      >
                        زمان ترخیص
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, idx) => {
                    const triage = TRIAGE_META[r.triage_level] || { label: "—", bg: "#EEE", text: "#555" };
                    const status = STATUS_META[r.status] || { label: r.status, color: "default" };
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>{(meta.current_page - 1) * meta.per_page + idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {r.case_number || `#${r.id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 28, height: 28, bgcolor: "#D32F2F", fontSize: 12 }}>
                              {(r.patient_name || "?").charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{r.patient_name || "—"}</Typography>
                              {r.patient_phone && (
                                <Typography variant="caption" color="text.secondary">
                                  {r.patient_phone}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.doctor_name || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDateTime(r.arrival_time)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={triage.label}
                            size="small"
                            sx={{ bgcolor: triage.bg, color: triage.text, fontWeight: "bold" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={r.chief_complaint || ""}
                          >
                            {r.chief_complaint || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={status.color}
                            icon={status.icon}
                            label={status.label}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDateTime(r.discharge_time)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="مشاهده جزئیات">
                            <IconButton size="small" color="primary" onClick={() => goToCase(r)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={meta.total}
              page={(meta.current_page || 1) - 1}
              onPageChange={handleChangePage}
              rowsPerPage={meta.per_page}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 15, 25, 50, 100]}
              labelRowsPerPage="تعداد در صفحه"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} از ${count !== -1 ? count : `بیش از ${to}`}`
              }
            />
          </>
        )}
      </Card>
    </Box>
  );
}