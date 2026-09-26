// app/views/material-kit/departments/DepartmentsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  MenuItem,
  InputAdornment,
  Avatar,
  Divider,
  Stack,
  Fade,
  Zoom,
  Skeleton,
  alpha,
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import BusinessIcon from "@mui/icons-material/Business";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import CategoryIcon from "@mui/icons-material/Category";
import SaveIcon from "@mui/icons-material/Save";
import InfoIcon from "@mui/icons-material/Info";

// ============================================================
// ✅ آدرس API
// ============================================================
const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:8000/api";
const DEPARTMENTS_URL = `${API_BASE}/departments`;

const emptyForm = { name: "", code: "", description: "", status: "Active" };

// ============================================================
// 🎨 کامپوننت‌های استایل‌شده
// ============================================================
const GradientCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  overflow: "hidden",
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: "#fff",
  position: "relative",
  boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
  },
}));

const StatCard = styled(Card)(({ theme, accent }) => ({
  borderRadius: 16,
  padding: theme.spacing(2.5),
  border: `1px solid ${alpha(accent || theme.palette.primary.main, 0.15)}`,
  background: `linear-gradient(135deg, ${alpha(
    accent || theme.palette.primary.main,
    0.08
  )} 0%, ${alpha(accent || theme.palette.primary.main, 0.02)} 100%)`,
  transition: "all .3s cubic-bezier(.4,0,.2,1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: `0 12px 32px ${alpha(
      accent || theme.palette.primary.main,
      0.25
    )}`,
    borderColor: alpha(accent || theme.palette.primary.main, 0.4),
  },
}));

const ModernTableRow = styled(TableRow)(({ theme }) => ({
  transition: "background .2s ease",
  "&:hover": {
    background: alpha(theme.palette.primary.main, 0.04),
    "& .action-buttons": {
      opacity: 1,
      transform: "translateX(0)",
    },
  },
  "& .action-buttons": {
    opacity: 0.7,
    transform: "translateX(4px)",
    transition: "all .25s ease",
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 14,
    background: theme.palette.background.paper,
    transition: "all .2s ease",
    "&:hover": {
      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
    "&.Mui-focused": {
      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}));

// رنگ‌های اختصاصی برای هر بخش بر اساس کد
const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#f97316", // orange
];

const colorFromString = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function DepartmentsPage() {
  const theme = useTheme();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnack = (message, severity = "success") =>
    setSnack({ open: true, message, severity });

  // ============================================================
  // 📊 آمار
  // ============================================================
  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.status === "Active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [departments]);

  // ============================================================
  // 🔍 فیلتر لیست
  // ============================================================
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((d) => {
      const matchSearch =
        !q ||
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [departments, search, statusFilter]);

  // ============================================================
  // 🌐 دریافت لیست
  // ============================================================
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(DEPARTMENTS_URL, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("خطا در دریافت لیست بخش‌ها");
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : [];
      setDepartments(list);
    } catch (err) {
      showSnack(err.message || "خطای شبکه", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ============================================================
  // باز کردن دیالوگ‌ها
  // ============================================================
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingId(dept.id);
    setForm({
      name: dept.name || "",
      code: dept.code || "",
      description: dept.description || "",
      status: dept.status || "Active",
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setForm(emptyForm);
    setErrors({});
    setEditingId(null);
  };

  // ============================================================
  // 💾 ذخیره
  // ============================================================
  const handleSave = async () => {
    const localErrors = {};
    if (!form.name.trim()) localErrors.name = "نام بخش الزامی است";
    if (!form.code.trim()) localErrors.code = "کد بخش الزامی است";
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const url = editingId
        ? `${DEPARTMENTS_URL}/${editingId}`
        : DEPARTMENTS_URL;
      const method = editingId ? "PUT" : "POST";

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description?.trim() || null,
        status: form.status || "Active",
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.status === 422) {
        const validationErrors = resData.errors || {};
        const mapped = {};
        Object.keys(validationErrors).forEach((key) => {
          mapped[key] = Array.isArray(validationErrors[key])
            ? validationErrors[key][0]
            : validationErrors[key];
        });
        setErrors(mapped);
        showSnack(resData.message || "خطا در اعتبارسنجی اطلاعات", "warning");
        return;
      }

      if (!res.ok) {
        throw new Error(resData.message || "خطا در ذخیره‌سازی");
      }

      showSnack(
        resData.message ||
          (editingId ? "بخش با موفقیت ویرایش شد" : "بخش با موفقیت اضافه شد")
      );
      handleCloseDialog();
      fetchDepartments();
    } catch (err) {
      showSnack(err.message || "خطا در ذخیره‌سازی", "error");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 🗑 حذف
  // ============================================================
  const handleDelete = async (id, name) => {
    if (!window.confirm(`آیا از حذف بخش «${name}» مطمئن هستید؟`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${DEPARTMENTS_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || "خطا در حذف بخش");

      showSnack(resData.message || "بخش با موفقیت حذف شد");
      fetchDepartments();
    } catch (err) {
      showSnack(err.message || "خطا در حذف", "error");
    }
  };

  // ============================================================
  // 🎨 رندر
  // ============================================================
  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        p: { xs: 2, md: 4 },
        background: `linear-gradient(180deg, ${alpha(
          theme.palette.primary.main,
          0.03
        )} 0%, transparent 300px)`,
      }}
    >
      {/* ============ هدر گرادیانی ============ */}
      <Zoom in timeout={400}>
        <GradientCard sx={{ mb: 4 }}>
          <CardContent
            sx={{
              p: { xs: 3, md: 4 },
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2.5}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                <BusinessIcon sx={{ fontSize: 34 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ mb: 0.5, letterSpacing: "-0.5px" }}
                >
                  مدیریت بخش‌ها
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.9, fontSize: 14 }}
                >
                  افزودن، ویرایش و حذف بخش‌های سازمان در یک نگاه
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Tooltip title="بروزرسانی">
                <span>
                  <IconButton
                    onClick={fetchDepartments}
                    disabled={loading}
                    sx={{
                      color: "#fff",
                      bgcolor: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                    }}
                  >
                    <RefreshIcon
                      sx={{
                        animation: loading
                          ? "spin 1s linear infinite"
                          : "none",
                        "@keyframes spin": {
                          "0%": { transform: "rotate(0deg)" },
                          "100%": { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                  </IconButton>
                </span>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{
                  bgcolor: "#fff",
                  color: theme.palette.primary.main,
                  px: 3,
                  py: 1.2,
                  fontWeight: 700,
                  borderRadius: 3,
                  textTransform: "none",
                  fontSize: 14,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
                  },
                }}
              >
                افزودن بخش
              </Button>
            </Stack>
          </CardContent>
        </GradientCard>
      </Zoom>

      {/* ============ کارت‌های آماری ============ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Fade in timeout={500}>
          <StatCard accent="#6366f1">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: alpha("#6366f1", 0.15),
                  color: "#6366f1",
                  width: 52,
                  height: 52,
                }}
              >
                <CategoryIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  کل بخش‌ها
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#6366f1">
                  {stats.total}
                </Typography>
              </Box>
            </Stack>
          </StatCard>
        </Fade>

        <Fade in timeout={600}>
          <StatCard accent="#10b981">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: alpha("#10b981", 0.15),
                  color: "#10b981",
                  width: 52,
                  height: 52,
                }}
              >
                <CheckCircleIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  بخش‌های فعال
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#10b981">
                  {stats.active}
                </Typography>
              </Box>
            </Stack>
          </StatCard>
        </Fade>

        <Fade in timeout={700}>
          <StatCard accent="#ef4444">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: alpha("#ef4444", 0.15),
                  color: "#ef4444",
                  width: 52,
                  height: 52,
                }}
              >
                <BlockIcon />
              </Avatar>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  بخش‌های غیرفعال
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#ef4444">
                  {stats.inactive}
                </Typography>
              </Box>
            </Stack>
          </StatCard>
        </Fade>
      </Box>

      {/* ============ کارت اصلی با جدول ============ */}
      <Card
        sx={{
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* نوار ابزار جستجو */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <SearchField
            placeholder="جستجو بر اساس نام، کد یا توضیحات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              minWidth: 160,
              "& .MuiOutlinedInput-root": { borderRadius: 3 },
            }}
          >
            <MenuItem value="All">همه وضعیت‌ها</MenuItem>
            <MenuItem value="Active">فقط فعال</MenuItem>
            <MenuItem value="Inactive">فقط غیرفعال</MenuItem>
          </TextField>
        </Box>

        {/* محتوای جدول */}
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box p={3}>
              {[1, 2, 3, 4].map((i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Skeleton variant="circular" width={44} height={44} />
                  <Skeleton variant="text" width="30%" height={28} />
                  <Skeleton variant="rounded" width={80} height={28} />
                  <Skeleton variant="text" width="25%" />
                  <Skeleton variant="rounded" width={70} height={28} />
                </Stack>
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 10,
                px: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Avatar
                sx={{
                  width: 90,
                  height: 90,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  mb: 2,
                }}
              >
                <BusinessIcon sx={{ fontSize: 48 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {search || statusFilter !== "All"
                  ? "نتیجه‌ای یافت نشد"
                  : "هنوز بخشی ثبت نشده"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {search || statusFilter !== "All"
                  ? "فیلترها را تغییر دهید یا جستجو را پاک کنید"
                  : "برای شروع، اولین بخش سازمان را اضافه کنید"}
              </Typography>
              {!search && statusFilter === "All" && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAdd}
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    px: 3,
                    fontWeight: 700,
                  }}
                >
                  افزودن اولین بخش
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}
                  >
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                      width={60}
                    >
                      #
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                    >
                      بخش
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                      width={140}
                    >
                      کد
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                    >
                      توضیحات
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                      width={120}
                    >
                      وضعیت
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, fontSize: 13 }}
                      width={130}
                    >
                      عملیات
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filtered.map((dept, idx) => {
                    const color = colorFromString(dept.code || dept.name);
                    const isActive = dept.status === "Active";
                    return (
                      <ModernTableRow key={dept.id}>
                        <TableCell align="right">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                          >
                            {idx + 1}
                          </Typography>
                        </TableCell>

                        {/* نام بخش با آواتار */}
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                          >
                            <Avatar
                              sx={{
                                width: 42,
                                height: 42,
                                bgcolor: alpha(color, 0.15),
                                color: color,
                                fontWeight: 800,
                                fontSize: 16,
                                border: `2px solid ${alpha(color, 0.25)}`,
                              }}
                            >
                              {(dept.name || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{ lineHeight: 1.3 }}
                              >
                                {dept.name}
                              </Typography>
                              {dept.uuid && (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{
                                    fontFamily: "monospace",
                                    fontSize: 10,
                                  }}
                                >
                                  {String(dept.uuid).slice(0, 8)}…
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* کد */}
                        <TableCell align="right">
                          <Chip
                            label={dept.code || "—"}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontFamily: "monospace",
                              bgcolor: alpha(color, 0.1),
                              color: color,
                              border: `1px solid ${alpha(color, 0.25)}`,
                              borderRadius: 2,
                            }}
                          />
                        </TableCell>

                        {/* توضیحات */}
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={
                              dept.description
                                ? "text.primary"
                                : "text.disabled"
                            }
                            sx={{
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dept.description || "—"}
                          </Typography>
                        </TableCell>

                        {/* وضعیت */}
                        <TableCell align="right">
                          <Chip
                            icon={
                              isActive ? (
                                <CheckCircleIcon
                                  sx={{ fontSize: 16, color: "#fff !important" }}
                                />
                              ) : (
                                <BlockIcon
                                  sx={{ fontSize: 16, color: "#fff !important" }}
                                />
                              )
                            }
                            label={isActive ? "فعال" : "غیرفعال"}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: isActive ? "#10b981" : "#9ca3af",
                              color: "#fff",
                              borderRadius: 2,
                              "& .MuiChip-icon": { ml: 1 },
                            }}
                          />
                        </TableCell>

                        {/* عملیات */}
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            className="action-buttons"
                          >
                            <Tooltip title="ویرایش">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(dept)}
                                sx={{
                                  color: theme.palette.primary.main,
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.08
                                  ),
                                  "&:hover": {
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.18
                                    ),
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleDelete(dept.id, dept.name)
                                }
                                sx={{
                                  color: "#ef4444",
                                  bgcolor: alpha("#ef4444", 0.08),
                                  "&:hover": {
                                    bgcolor: alpha("#ef4444", 0.18),
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </ModernTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ============ دیالوگ افزودن / ویرایش ============ */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          },
        }}
      >
        {/* هدر دیالوگ */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: "#fff",
            p: 3,
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ position: "relative", zIndex: 2 }}
          >
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                width: 52,
                height: 52,
              }}
            >
              {editingId ? <EditIcon /> : <AddIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {editingId ? "ویرایش بخش" : "افزودن بخش جدید"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {editingId
                  ? "اطلاعات بخش را به‌روزرسانی کنید"
                  : "اطلاعات بخش جدید را وارد کنید"}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="نام بخش"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
              required
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />

            <TextField
              label="کد بخش"
              fullWidth
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              error={!!errors.code}
              helperText={errors.code || "مثال: LAB, RAD, PHAR"}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <InfoIcon color="action" />
                  </InputAdornment>
                ),
                style: { fontFamily: "monospace", fontWeight: 700 },
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />

            <TextField
              label="توضیحات"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              error={!!errors.description}
              helperText={errors.description}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />

            <TextField
              select
              label="وضعیت"
              fullWidth
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            >
              <MenuItem value="Active">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircleIcon sx={{ color: "#10b981", fontSize: 18 }} />
                  <span>فعال</span>
                </Stack>
              </MenuItem>
              <MenuItem value="Inactive">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <BlockIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  <span>غیرفعال</span>
                </Stack>
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              color: "text.secondary",
            }}
          >
            انصراف
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />
            }
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
              px: 4,
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              "&:hover": {
                boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
              },
            }}
          >
            {editingId ? "ذخیره تغییرات" : "افزودن بخش"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============ Snackbar ============ */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          variant="filled"
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}