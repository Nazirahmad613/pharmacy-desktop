import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  Tooltip,
  Divider,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ComputerIcon from "@mui/icons-material/Computer";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";

import ReportLayout from "../../../../components/ReportLayout";
import { useAuth } from "app/contexts/AuthContext";

const ACTION_CONFIG = {
  create: {
    label: "ایجاد",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: <AddCircleOutlineIcon sx={{ fontSize: 15 }} />,
  },
  update: {
    label: "ویرایش",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: <EditOutlinedIcon sx={{ fontSize: 15 }} />,
  },
  delete: {
    label: "حذف",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: <DeleteOutlineIcon sx={{ fontSize: 15 }} />,
  },
  login: {
    label: "ورود",
    color: "#0f766e",
    bg: "#f0fdfa",
    border: "#99f6e4",
    icon: <LoginIcon sx={{ fontSize: 15 }} />,
  },
  logout: {
    label: "خروج",
    color: "#6b21a8",
    bg: "#faf5ff",
    border: "#e9d5ff",
    icon: <LogoutIcon sx={{ fontSize: 15 }} />,
  },
};

export default function LogsPage() {
  const { api } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [filters, setFilters] = useState({
    action: "",
    user_id: "",
  });

  const [usersMap, setUsersMap] = useState({});

  // ---------- دریافت لیست کاربران ----------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users");
      const usersArray = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      const map = {};
      usersArray.forEach((user) => {
        map[user.id] = user.name;
      });
      setUsersMap(map);
    } catch (error) {
      console.warn(
        "خطا در دریافت کاربران (احتمالاً بدون دسترسی):",
        error?.response?.status
      );
    }
  }, [api]);

  // ---------- دریافت لاگ‌ها ----------
  const fetchLogsWithFilters = useCallback(
    async (pageNumber, filterValues) => {
      setLoading(true);
      setErrorMsg("");
      try {
        const params = new URLSearchParams();
        params.append("page", pageNumber);
        if (filterValues.action) params.append("action", filterValues.action);
        if (filterValues.user_id) params.append("user_id", filterValues.user_id);

        const res = await api.get(`/logs?${params.toString()}`);

        const payload = res.data || {};
        const list = Array.isArray(payload.data) ? payload.data : [];

        setLogs(list);
        setPage(payload.current_page || 1);
        setLastPage(payload.last_page || 1);
      } catch (error) {
        const status = error?.response?.status;
        const message = error?.response?.data?.message;

        if (status === 403) {
          setErrorMsg(
            message ||
              "شما دسترسی لازم برای مشاهده لاگ‌ها را ندارید (view-logs)."
          );
        } else if (status === 401) {
          setErrorMsg("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.");
        } else {
          setErrorMsg(
            message || "خطا در دریافت لاگ‌ها. لطفاً دوباره تلاش کنید."
          );
        }
        console.error("fetchLogs error:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const fetchLogs = useCallback(
    (pageNumber = 1) => {
      fetchLogsWithFilters(pageNumber, filters);
    },
    [fetchLogsWithFilters, filters]
  );

  useEffect(() => {
    fetchLogs(1);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const applyFilters = () => {
    fetchLogs(1);
  };

  const resetFilters = () => {
    const empty = { action: "", user_id: "" };
    setFilters(empty);
    fetchLogsWithFilters(1, empty);
  };

  const getUserLabel = (log) => {
    if (log.user?.name) return log.user.name;
    if (usersMap[log.user_id]) return usersMap[log.user_id];
    if (log.user_id === null || log.user_id === undefined) return "سیستم";
    return `کاربر #${log.user_id}`;
  };

  const renderActionBadge = (action) => {
    const key = String(action || "").toLowerCase();
    const cfg = ACTION_CONFIG[key];
    if (!cfg) {
      return (
        <Chip
          label={action || "نامشخص"}
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: "0.78rem",
            bgcolor: "#f1f5f9",
            color: "#334155",
            border: "1px solid #e2e8f0",
          }}
        />
      );
    }

    return (
      <Chip
        icon={cfg.icon}
        label={cfg.label}
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: "0.78rem",
          color: cfg.color,
          bgcolor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          px: 0.5,
          "& .MuiChip-icon": {
            color: cfg.color,
            marginRight: "4px",
            marginLeft: "-2px",
          },
        }}
      />
    );
  };

  return (
    <ReportLayout>
      <Box
        dir="rtl"
        sx={{
          minHeight: "100%",
          bgcolor: "#ffffff",
          p: { xs: 2, md: 3.5 },
          color: "#1e293b",
          fontFamily: "inherit",
        }}
      >
        {/* هدر صفحه */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "#eff6ff",
                border: "1px solid #dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1d4ed8",
              }}
            >
              <HistoryIcon />
            </Box>
            <Box sx={{ pr: 1 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#0f172a", fontSize: "1.35rem" }}
              >
                لاگ‌ها و تاریخچه فعالیت‌های سیستم
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#64748b", mt: 0.25, fontSize: "0.85rem" }}
              >
                مشاهده و رهگیری دقیق تغییرات، ورودها و عملیات کاربران در سیستم
              </Typography>
            </Box>
          </Stack>

          <Chip
            label={`صفحه ${page} از ${lastPage}`}
            variant="outlined"
            sx={{
              bgcolor: "#f8fafc",
              borderColor: "#e2e8f0",
              color: "#475569",
              fontWeight: 600,
            }}
          />
        </Box>

        {/* پیام خطا */}
        {errorMsg && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: "12px",
              border: "1px solid #fecaca",
              bgcolor: "#fef2f2",
            }}
          >
            {errorMsg}
          </Alert>
        )}

        {/* کارت فیلترها */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            bgcolor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            <FormControl
              size="small"
              dir="rtl"
              sx={{ minWidth: 200, bgcolor: "#ffffff" }}
            >
              <InputLabel id="action-filter-label">نوع عملیات</InputLabel>
              <Select
                labelId="action-filter-label"
                name="action"
                value={filters.action}
                label="نوع عملیات"
                onChange={handleFilterChange}
                sx={{ borderRadius: "10px" }}
              >
                <MenuItem value="">همه عملیات</MenuItem>
                <MenuItem value="create">ایجاد</MenuItem>
                <MenuItem value="update">ویرایش</MenuItem>
                <MenuItem value="delete">حذف</MenuItem>
                <MenuItem value="login">ورود</MenuItem>
                <MenuItem value="logout">خروج</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              size="small"
              dir="rtl"
              sx={{ minWidth: 220, bgcolor: "#ffffff" }}
            >
              <InputLabel id="user-filter-label">کاربر</InputLabel>
              <Select
                labelId="user-filter-label"
                name="user_id"
                value={filters.user_id}
                label="کاربر"
                onChange={handleFilterChange}
                sx={{ borderRadius: "10px" }}
              >
                <MenuItem value="">همه کاربران</MenuItem>
                {Object.entries(usersMap).map(([id, name]) => (
                  <MenuItem key={id} value={id}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1.5} sx={{ mr: { sm: "auto" } }}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<FilterAltIcon sx={{ ml: 0.5 }} />}
                onClick={applyFilters}
                sx={{
                  borderRadius: "10px",
                  px: 2.5,
                  py: 0.9,
                  fontWeight: 600,
                  bgcolor: "#1e3a8a",
                  "&:hover": { bgcolor: "#172554" },
                }}
              >
                اعمال فیلتر
              </Button>

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon sx={{ ml: 0.5 }} />}
                onClick={resetFilters}
                sx={{
                  borderRadius: "10px",
                  px: 2,
                  py: 0.9,
                  fontWeight: 600,
                  color: "#475569",
                  borderColor: "#cbd5e1",
                  bgcolor: "#ffffff",
                  "&:hover": {
                    bgcolor: "#f8fafc",
                    borderColor: "#94a3b8",
                  },
                }}
              >
                پاک کردن
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* جدول لاگ‌ها */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
          }}
        >
          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "#f8fafc",
                    "& th": {
                      fontWeight: 700,
                      color: "#334155",
                      fontSize: "0.84rem",
                      borderBottom: "1px solid #e2e8f0",
                      py: 1.8,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell align="center" width={80}>
                    آی دی نمبر
                  </TableCell>
                  <TableCell align="center">کاربر</TableCell>
                  <TableCell align="center" width={120}>
                    عملیات
                  </TableCell>
                  <TableCell align="center" width={150}>
                    مدل / بخش
                  </TableCell>
                  {/* ✅ هدر توضیحات — وسط‌چین */}
                  <TableCell align="center">توضیحات</TableCell>
                  <TableCell align="center" width={140}>
                    آدرس IP
                  </TableCell>
                  <TableCell align="center" width={175}>
                    تاریخ و زمان
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                      <CircularProgress size={30} sx={{ color: "#1e3a8a" }} />
                      <Typography
                        variant="body2"
                        sx={{ mt: 1.5, color: "#64748b", fontWeight: 500 }}
                      >
                        در حال بارگذاری اطلاعات لاگ‌ها...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                      <HistoryIcon
                        sx={{ fontSize: 40, color: "#cbd5e1", mb: 1 }}
                      />
                      <Typography
                        variant="body1"
                        sx={{ color: "#475569", fontWeight: 600 }}
                      >
                        هیچ لاگی یافت نشد
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#94a3b8", mt: 0.5 }}
                      >
                        با تغییر فیلترها می‌توانید نتایج دیگر را بررسی کنید.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const userLabel = getUserLabel(log);
                    const isSystem =
                      log.user_id === null || log.user_id === undefined;

                    return (
                      <TableRow
                        key={log.id}
                        hover
                        sx={{
                          bgcolor: "#ffffff",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            bgcolor: "#f8fafc !important",
                          },
                          "& td": {
                            borderBottom: "1px solid #f1f5f9",
                            py: 1.6,
                            fontSize: "0.86rem",
                            color: "#1e293b",
                          },
                        }}
                      >
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: "#64748b",
                              fontFamily: "monospace",
                            }}
                          >
                            #{log.id}
                          </Typography>
                        </TableCell>

                        {/* ✅ ستون کاربر — وسط‌چین */}
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            spacing={1.2}
                          >
                            <Avatar
                              sx={{
                                width: 30,
                                height: 30,
                                fontSize: "0.8rem",
                                bgcolor: isSystem ? "#f1f5f9" : "#e0e7ff",
                                color: isSystem ? "#64748b" : "#1e3a8a",
                              }}
                            >
                              <PersonOutlineIcon sx={{ fontSize: 17 }} />
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: "#0f172a" }}
                            >
                              {userLabel}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          {renderActionBadge(log.action)}
                        </TableCell>

                        <TableCell align="center">
                          {log.model ? (
                            <Chip
                              label={log.model}
                              size="small"
                              sx={{
                                bgcolor: "#f8fafc",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                                fontFamily: "monospace",
                                fontSize: "0.78rem",
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="#94a3b8">
                              —
                            </Typography>
                          )}
                        </TableCell>

                        {/* ✅ ستون توضیحات — وسط‌چین */}
                        <TableCell align="center" sx={{ maxWidth: 320 }}>
                          <Tooltip title={log.description || ""} arrow>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#334155",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textAlign: "center",
                                width: "100%",
                              }}
                            >
                              {log.description || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell align="center">
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            spacing={0.5}
                          >
                            <ComputerIcon
                              sx={{ fontSize: 15, color: "#94a3b8" }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                color: "#475569",
                                fontSize: "0.82rem",
                              }}
                            >
                              {log.ip || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="center">
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            spacing={0.5}
                          >
                            <AccessTimeIcon
                              sx={{ fontSize: 15, color: "#94a3b8" }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: "#475569", fontSize: "0.82rem" }}
                            >
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString(
                                    "fa-IR"
                                  )
                                : "—"}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ borderColor: "#f1f5f9" }} />

          {/* صفحه‌بندی (Pagination) */}
          <Box
            sx={{
              px: 2.5,
              py: 1.8,
              bgcolor: "#ffffff",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              نمایش صفحه <strong>{page}</strong> از <strong>{lastPage}</strong>
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                disabled={page === 1 || loading}
                onClick={() => fetchLogs(page - 1)}
                startIcon={<ChevronRightIcon />}
                sx={{
                  borderRadius: "8px",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                  px: 1.5,
                  "&:hover": {
                    bgcolor: "#f8fafc",
                    borderColor: "#94a3b8",
                  },
                }}
              >
                قبلی
              </Button>

              <Button
                size="small"
                variant="outlined"
                disabled={page === lastPage || loading}
                onClick={() => fetchLogs(page + 1)}
                endIcon={<ChevronLeftIcon />}
                sx={{
                  borderRadius: "8px",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                  px: 1.5,
                  "&:hover": {
                    bgcolor: "#f8fafc",
                    borderColor: "#94a3b8",
                  },
                }}
              >
                بعدی
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </ReportLayout>
  );
}