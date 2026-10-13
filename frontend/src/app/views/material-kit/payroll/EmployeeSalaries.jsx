// src/app/routes/payroll/EmployeeSalaries.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, CircularProgress,
  Alert, Tooltip, Tabs, Tab, Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import api from "../../../../api";

export default function EmployeeSalaries() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all"); // all | user | account

  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]); // برای انتخاب یوزر در فرم
  const [departments, setDepartments] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({
    userId: null,
    baseSalary: "",
    allowances: "",
    deductions: "",
    bankAccount: "",
    hireDate: "",
  });

  // ============================================================
  // ✅ دریافت کارمندان (users + accounts)
  // ============================================================
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search) params.search = search;
      if (departmentFilter !== "all") params.department = departmentFilter;
      if (sourceFilter !== "all") params.source = sourceFilter;

      const res = await api.get("/payroll/employees", { params });

      if (res.data?.success) {
        setEmployees(res.data.data || []);

        // استخراج دپارتمان‌های یکتا
        const uniqueDepts = [
          ...new Set(
            (res.data.data || [])
              .map((e) => e.department)
              .filter(Boolean)
          ),
        ];
        setDepartments(uniqueDepts);
      } else {
        setError(res.data?.message || "خطا در دریافت اطلاعات");
      }
    } catch (err) {
      console.error("getEmployees error:", err);
      setError(err.response?.data?.message || err.message || "خطا در ارتباط");
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, sourceFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ============================================================
  // ✅ دریافت کاربران (برای فرم افزودن)
  // ============================================================
  const fetchUsers = async (query = "") => {
    try {
      const res = await api.get("/users", {
        params: { search: query, per_page: 50 },
      });
      const list = res.data?.data?.data || res.data?.data || res.data || [];
      setUsers(
        (Array.isArray(list) ? list : []).map((u) => ({
          id: u.id,
          name: u.name,
          department: u.department?.name || "",
        }))
      );
    } catch (err) {
      console.error("fetchUsers error:", err);
    }
  };

  // ============================================================
  // ✅ فرم
  // ============================================================
  const handleOpenDialog = (employee = null) => {
    if (employee && employee.source === "user") {
      setSelectedEmployee(employee);
      setFormData({
        userId: employee.userId,
        baseSalary: employee.baseSalary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        bankAccount: employee.bankAccount || "",
        hireDate: employee.hireDate || "",
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        userId: null,
        baseSalary: "",
        allowances: "",
        deductions: "",
        bankAccount: "",
        hireDate: "",
      });
      fetchUsers();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  // ============================================================
  // ✅ ذخیره (فقط برای users)
  // ============================================================
  const handleSave = async () => {
    if (!selectedEmployee && !formData.userId) {
      alert("لطفاً کاربر را انتخاب کنید");
      return;
    }
    if (!formData.baseSalary) {
      alert("معاش پایه الزامی است");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        userId: formData.userId,
        baseSalary: Number(formData.baseSalary) || 0,
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0,
        bankAccount: formData.bankAccount,
        hireDate: formData.hireDate,
      };

      let res;
      if (selectedEmployee) {
        res = await api.put(
          `/payroll/employees/${selectedEmployee.id}`,
          payload
        );
      } else {
        res = await api.post("/payroll/employees", payload);
      }

      if (res.data?.success) {
        handleCloseDialog();
        fetchEmployees();
      }
    } catch (err) {
      alert(err.response?.data?.message || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ✅ حذف
  // ============================================================
  const handleDelete = async (employee) => {
    if (employee.source === "account") {
      alert("کارمندان طرف‌حساب از جدول حسابات مدیریت می‌شوند");
      return;
    }

    if (!window.confirm(`آیا از حذف اطلاعات معاش «${employee.fullName}» مطمئن هستید؟`)) {
      return;
    }

    try {
      await api.delete(`/payroll/employees/${employee.id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || "خطا در حذف");
    }
  };

  // ============================================================
  // ✅ محاسبات
  // ============================================================
  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const filtered = employees;

  const totalNetSalary = useMemo(
    () =>
      filtered.reduce((sum, e) => {
        return sum + (e.baseSalary || 0) + (e.allowances || 0) - (e.deductions || 0);
      }, 0),
    [filtered]
  );

  const userCount = filtered.filter((e) => e.source === "user").length;
  const accountCount = filtered.filter((e) => e.source === "account").length;

  // ============================================================
  // ✅ RENDER
  // ============================================================
  if (loading && employees.length === 0) {
    return (
      <Box display="flex" justifyContent="center" minHeight="400px" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          👥 معاشات کارمندان
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchEmployees}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* فیلترها */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="جستجو در نام، ایمیل، کد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="بخش"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="all">همه بخش‌ها</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="منبع کارمند"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="user">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon fontSize="small" /> کاربران سیستم
                  </Box>
                </MenuItem>
                <MenuItem value="account">
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon fontSize="small" /> طرف‌حساب‌ها
                  </Box>
                </MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2} sx={{ textAlign: "left" }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                افزودن
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* خلاصه */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "primary.50", borderLeft: "4px solid", borderColor: "primary.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                تعداد کل
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {filtered.length} نفر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "info.50", borderLeft: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                کاربران سیستم
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {userCount} نفر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "secondary.50", borderLeft: "4px solid", borderColor: "secondary.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                طرف‌حساب‌ها
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                {accountCount} نفر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "success.50", borderLeft: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                مجموع معاش خالص
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(totalNetSalary)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>#</TableCell>
              <TableCell>نام کامل</TableCell>
              <TableCell>منبع</TableCell>
              <TableCell>کد کارمند</TableCell>
              <TableCell>بخش</TableCell>
              <TableCell>معاش پایه</TableCell>
              <TableCell>مزایا</TableCell>
              <TableCell>کسرات</TableCell>
              <TableCell>معاش خالص</TableCell>
              <TableCell>وضعیت</TableCell>
              <TableCell>عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    هیچ کارمندی یافت نشد
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e, idx) => {
                const net =
                  (e.baseSalary || 0) + (e.allowances || 0) - (e.deductions || 0);

                return (
                  <TableRow key={`${e.source}-${e.id}`} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell fontWeight="bold">{e.fullName}</TableCell>
                    <TableCell>
                      <Chip
                        icon={e.source === "user" ? <PersonIcon /> : <BusinessIcon />}
                        label={e.sourceLabel}
                        size="small"
                        color={e.source === "user" ? "info" : "secondary"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {e.employeeCode || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{e.department || "—"}</TableCell>
                    <TableCell>{formatCurrency(e.baseSalary)}</TableCell>
                    <TableCell sx={{ color: "success.main" }}>
                      +{formatCurrency(e.allowances)}
                    </TableCell>
                    <TableCell sx={{ color: "error.main" }}>
                      -{formatCurrency(e.deductions)}
                    </TableCell>
                    <TableCell>
                      <strong>{formatCurrency(net)}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={e.status}
                        size="small"
                        color={e.statusRaw === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {e.source === "user" ? (
                        <>
                          <Tooltip title="ویرایش">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(e)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(e)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="از جدول حسابات مدیریت می‌شود">
                          <Chip label="حسابات" size="small" variant="outlined" />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* دیالوگ افزودن/ویرایش (فقط کاربران سیستم) */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedEmployee ? "ویرایش اطلاعات معاش" : "افزودن اطلاعات معاش"}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            💡 کارمندانی که در جدول حسابات هستند (طرف‌حساب) از همان‌جا مدیریت می‌شوند.
            این فرم فقط برای کاربران سیستم است.
          </Alert>

          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12}>
              <Autocomplete
                options={users}
                getOptionLabel={(o) => `${o.name} ${o.department ? `(${o.department})` : ""}`}
                value={users.find((u) => u.id === formData.userId) || null}
                onChange={(_, v) =>
                  setFormData({ ...formData, userId: v?.id || null })
                }
                disabled={!!selectedEmployee}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="کاربر سیستم *"
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="معاش پایه *"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">؋</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="مزایا"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">؋</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="کسرات"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">؋</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="شماره حساب بانکی"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="تاریخ استخدام"
                placeholder="1403/01/01"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>انصراف</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}