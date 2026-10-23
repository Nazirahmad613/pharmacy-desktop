// src/app/routes/payroll/EmployeeSalaries.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, CircularProgress,
  Alert, Tooltip, Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import api from "../../../../api";

// ✅ انتخاب اولین فیلد عددی موجود از میان چند نام جایگزین
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

// ✅ نرمال‌سازی ردیف معاش
const normalizeSalaryRow = (e = {}) => {
  const tax = pickNumber(e, [
    "tax", "taxAmount", "incomeTax", "tax_value",
    "deduction_tax", "tax_deduction",
  ]);
  const insurance = pickNumber(e, [
    "insurance", "insuranceAmount", "insurance_value",
    "insuranceDeduction", "socialSecurity", "social_security",
    "deduction_insurance",
  ]);
  const advanceDeduction = pickNumber(e, [
    "advanceDeduction", "advance_deduction", "advance",
    "advanceAmount", "loanDeduction", "loan_deduction",
  ]);
  const baseSalary = pickNumber(e, ["baseSalary", "base_salary", "basicSalary"]);
  const allowances = pickNumber(e, ["allowances", "allowance", "bonuses"]);
  const deductions = pickNumber(e, ["deductions", "otherDeductions", "manualDeductions"]);

  const grossSalary =
    pickNumber(e, ["grossSalary", "gross_salary"]) ||
    baseSalary + allowances;

  const netSalary =
    pickNumber(e, ["netSalary", "net_salary"]) ||
    grossSalary - deductions - tax - insurance - advanceDeduction;

  return {
    ...e,
    baseSalary,
    allowances,
    deductions,
    tax,
    insurance,
    advanceDeduction,
    grossSalary,
    netSalary,
  };
};

export default function EmployeeSalaries() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({
    userId: null,
    accountId: null,
    source: null,
    baseSalary: "",
    allowances: "",
    deductions: "",
    bankAccount: "",
    hireDate: "",
  });

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
        // ✅ نرمال‌سازی برای نمایش درست مالیات/بیمه/خالص
        const list = (res.data.data || []).map(normalizeSalaryRow);
        setEmployees(list);
        const uniqueDepts = [
          ...new Set(list.map((e) => e.department).filter(Boolean)),
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
          role: u.role || "",
          department: u.department?.name || "",
        }))
      );
    } catch (err) {
      console.error("fetchUsers error:", err);
    }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({
        userId: employee.userId || null,
        accountId: employee.accountId || null,
        source: employee.source || null,
        baseSalary: employee.baseSalary ?? "",
        allowances: employee.allowances ?? "",
        deductions: employee.deductions ?? "",
        bankAccount: employee.bankAccount || "",
        hireDate: employee.hireDate || "",
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        userId: null,
        accountId: null,
        source: null,
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

  const handleSave = async () => {
    if (!selectedEmployee && !formData.userId && !formData.accountId) {
      alert("لطفاً کاربر یا طرف‌حساب را انتخاب کنید");
      return;
    }
    if (!formData.baseSalary) {
      alert("معاش پایه الزامی است");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId: formData.userId || null,
        accountId: formData.accountId || null,
        source: formData.source || (formData.userId ? "user" : "account"),
        baseSalary: Number(formData.baseSalary) || 0,
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0,
        bankAccount: formData.bankAccount,
        hireDate: formData.hireDate,
      };

      let res;
      if (selectedEmployee) {
        res = await api.put(`/payroll/employees/${selectedEmployee.id}`, payload);
      } else {
        res = await api.post("/payroll/employees", payload);
      }

      if (res.data?.success) {
        handleCloseDialog();
        fetchEmployees();
      } else {
        alert(res.data?.message || "خطا در ذخیره");
      }
    } catch (err) {
      alert(err.response?.data?.message || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

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

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(Number(n) || 0) + " ؋";

  const filtered = employees;

  const totalNetSalary = useMemo(
    () => filtered.reduce((sum, e) => sum + (e.netSalary || 0), 0),
    [filtered]
  );

  const userCount = filtered.filter((e) => e.source === "user").length;
  const accountCount = filtered.filter((e) => e.source === "account").length;

  if (loading && employees.length === 0) {
    return (
      <Box display="flex" justifyContent="center" minHeight="400px" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">👥 معاشات کارمندان</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchEmployees}>
          بازخوانی
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center" dir="rtl">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="جستجو در نام، ایمیل، کد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth select size="small" label="بخش"
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
                fullWidth select size="small" label="منبع کارمند"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="user">کاربران سیستم</MenuItem>
                <MenuItem value="account">طرف‌حساب‌ها</MenuItem>
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

      <Grid container spacing={2} mb={3} dir="rtl">
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "primary.50", borderRight: "4px solid", borderColor: "primary.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">تعداد کل</Typography>
              <Typography variant="h5" fontWeight="bold">{filtered.length} نفر</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "info.50", borderRight: "4px solid", borderColor: "info.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">کاربران سیستم</Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">{userCount} نفر</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "secondary.50", borderRight: "4px solid", borderColor: "secondary.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">طرف‌حساب‌ها</Typography>
              <Typography variant="h5" fontWeight="bold" color="secondary.main">{accountCount} نفر</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: "success.50", borderRight: "4px solid", borderColor: "success.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">مجموع معاش خالص</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(totalNetSalary)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table dir="rtl">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell align="right">#</TableCell>
              <TableCell align="right">نام کامل</TableCell>
              <TableCell align="right">منبع</TableCell>
              <TableCell align="right">کد کارمند</TableCell>
              <TableCell align="right">بخش</TableCell>
              <TableCell align="right">معاش پایه</TableCell>
              <TableCell align="right">مزایا</TableCell>
              <TableCell align="right">کسرات</TableCell>
              <TableCell align="right">مالیه</TableCell>
              <TableCell align="right">بیمه</TableCell>
              <TableCell align="right">معاش خالص</TableCell>
              <TableCell align="right">وضعیت</TableCell>
              <TableCell align="right">عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">هیچ کارمندی یافت نشد</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e, idx) => (
                <TableRow key={`${e.source}-${e.id}`} hover>
                  <TableCell align="right">{idx + 1}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>{e.fullName}</TableCell>
                  <TableCell align="right">
                    <Chip
                      icon={e.source === "user" ? <PersonIcon /> : <BusinessIcon />}
                      label={e.sourceLabel}
                      size="small"
                      color={e.source === "user" ? "info" : "secondary"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{e.employeeCode || "—"}</TableCell>
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
                  <TableCell align="right">
                    <strong>{formatCurrency(e.netSalary)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={e.status}
                      size="small"
                      color={e.statusRaw === "active" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="ویرایش معاش">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(e)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {e.source === "user" && (
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(e)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    {e.source === "account" && (
                      <Tooltip title="حذف از جدول حسابات مدیریت می‌شود">
                        <Chip label="حساب" size="small" variant="outlined" />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          {selectedEmployee
            ? `ویرایش اطلاعات معاش - ${selectedEmployee.fullName}`
            : "افزودن اطلاعات معاش"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEmployee && (
            <Alert
              severity={selectedEmployee.source === "user" ? "info" : "warning"}
              sx={{ mb: 2 }}
            >
              {selectedEmployee.source === "user"
                ? "👤 این کارمند از کاربران سیستم است."
                : "🏢 این کارمند از طرف‌حساب‌ها است. با ذخیره این فرم، اطلاعات معاش برای این حساب ثبت/به‌روز می‌شود."}
            </Alert>
          )}

          {!selectedEmployee && (
            <Alert severity="info" sx={{ mb: 2 }}>
              💡 برای افزودن معاش به کاربر سیستم، از این فرم استفاده کن.
              طرف‌حساب‌ها به‌صورت خودکار در لیست هستند و با زدن دکمه ویرایش روی آن‌ها می‌توانی معاش تعیین کنی.
            </Alert>
          )}

          <Grid container spacing={2} mt={0.5} dir="rtl">
            {!selectedEmployee && (
              <Grid item xs={12}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(o) =>
                    `${o.name}${o.role ? ` - ${o.role}` : ""}${
                      o.department ? ` (${o.department})` : ""
                    }`
                  }
                  value={users.find((u) => u.id === formData.userId) || null}
                  onChange={(_, v) =>
                    setFormData({
                      ...formData,
                      userId: v?.id || null,
                      source: "user",
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="کاربر سیستم *" required />
                  )}
                />
              </Grid>
            )}

            {selectedEmployee && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="کارمند"
                  value={selectedEmployee.fullName || ""}
                  disabled
                />
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="معاش پایه *"
                value={formData.baseSalary}
                onChange={(e) =>
                  setFormData({ ...formData, baseSalary: e.target.value })
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="مزایا"
                value={formData.allowances}
                onChange={(e) =>
                  setFormData({ ...formData, allowances: e.target.value })
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="کسرات"
                value={formData.deductions}
                onChange={(e) =>
                  setFormData({ ...formData, deductions: e.target.value })
                }
                InputProps={{
                  endAdornment: <InputAdornment position="end">؋</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="شماره حساب بانکی"
                value={formData.bankAccount}
                onChange={(e) =>
                  setFormData({ ...formData, bankAccount: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="تاریخ استخدام"
                placeholder="1403/01/01"
                value={formData.hireDate}
                onChange={(e) =>
                  setFormData({ ...formData, hireDate: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-start", px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={saving}>
            انصراف
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}