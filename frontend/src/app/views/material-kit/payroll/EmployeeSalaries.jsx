// src/app/routes/payroll/EmployeeSalaries.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useAuth } from "app/contexts/AuthContext";

const BASE_SALARY = 0;

export default function EmployeeSalaries() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // فرم جدید
  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    position: "",
    baseSalary: "",
    allowances: "",
    deductions: "",
    bankAccount: "",
    hireDate: "",
  });

  const departments = [
    "مدیریت",
    "لابراتوار",
    "دواخانه",
    "رادیولوژی",
    "استقبال",
    "حسابداری",
    "پرستاری",
    "داکتر",
  ];

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        // TODO: جایگزین با API واقعی
        // const res = await axios.get("/api/payroll/employees");
        setTimeout(() => {
          setEmployees([
            { id: 1, fullName: "احمد رضایی", department: "لابراتوار", position: "تکنیشن لابراتوار", baseSalary: 35000, allowances: 5000, deductions: 2000, bankAccount: "1234567890", hireDate: "1400/01/15", status: "فعال" },
            { id: 2, fullName: "فاطمه احمدی", department: "دواخانه", position: "دواساز", baseSalary: 42000, allowances: 6000, deductions: 3000, bankAccount: "0987654321", hireDate: "1399/06/20", status: "فعال" },
            { id: 3, fullName: "محمد کریمی", department: "رادیولوژی", position: "تکنیشن رادیولوژی", baseSalary: 38000, allowances: 4500, deductions: 2500, bankAccount: "1122334455", hireDate: "1401/03/10", status: "فعال" },
            { id: 4, fullName: "زهرا نوری", department: "استقبال", position: "مسئول استقبال", baseSalary: 32000, allowances: 3000, deductions: 1500, bankAccount: "5566778899", hireDate: "1402/01/05", status: "فعال" },
            { id: 5, fullName: "علی حسینی", department: "مدیریت", position: "مدیر اجرایی", baseSalary: 55000, allowances: 10000, deductions: 4000, bankAccount: "9988776655", hireDate: "1398/09/01", status: "فعال" },
            { id: 6, fullName: "مریم صادقی", department: "پرستاری", position: "پرستار ارشد", baseSalary: 40000, allowances: 5500, deductions: 2800, bankAccount: "2233445566", hireDate: "1400/11/12", status: "فعال" },
          ]);
          setLoading(false);
        }, 600);
      } catch (err) {
        setError("خطا در دریافت اطلاعات");
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const formatCurrency = (n) =>
    new Intl.NumberFormat("fa-AF").format(n) + " ؋";

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        !search ||
        e.fullName.includes(search) ||
        e.position.includes(search) ||
        e.department.includes(search);
      const matchDept =
        departmentFilter === "all" || e.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, departmentFilter]);

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({ ...employee });
    } else {
      setSelectedEmployee(null);
      setFormData({
        fullName: "",
        department: "",
        position: "",
        baseSalary: "",
        allowances: "",
        deductions: "",
        bankAccount: "",
        hireDate: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  const handleSave = () => {
    if (!formData.fullName || !formData.department || !formData.baseSalary) {
      alert("لطفاً فیلدهای اجباری را پر کنید");
      return;
    }
    if (selectedEmployee) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === selectedEmployee.id ? { ...e, ...formData } : e
        )
      );
    } else {
      setEmployees((prev) => [
        ...prev,
        { ...formData, id: Date.now(), status: "فعال" },
      ]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm("آیا از حذف این کارمند مطمئن هستید؟")) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const totalNetSalary = filteredEmployees.reduce((sum, e) => {
    const base = Number(e.baseSalary) || 0;
    const allow = Number(e.allowances) || 0;
    const ded = Number(e.deductions) || 0;
    return sum + (base + allow - ded);
  }, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" minHeight="400px" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: "rtl" }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        👥 معاشات کارمندان
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* نوار فیلتر و جستجو */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="جستجوی کارمند..."
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
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5} sx={{ textAlign: "left" }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                افزودن کارمند
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* خلاصه */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "primary.50", borderLeft: "4px solid", borderColor: "primary.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                تعداد کارمندان
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {filteredEmployees.length} نفر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: "warning.50", borderLeft: "4px solid", borderColor: "warning.main" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                میانگین معاش
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {filteredEmployees.length
                  ? formatCurrency(Math.round(totalNetSalary / filteredEmployees.length))
                  : formatCurrency(0)}
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
              <TableCell>بخش</TableCell>
              <TableCell>وظیفه</TableCell>
              <TableCell>معاش پایه</TableCell>
              <TableCell>مزایا</TableCell>
              <TableCell>کسرات</TableCell>
              <TableCell>معاش خالص</TableCell>
              <TableCell>وضعیت</TableCell>
              <TableCell>عملیات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    هیچ کارمندی یافت نشد
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((e, idx) => {
                const net =
                  (Number(e.baseSalary) || 0) +
                  (Number(e.allowances) || 0) -
                  (Number(e.deductions) || 0);
                return (
                  <TableRow key={e.id} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell fontWeight="bold">{e.fullName}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.position}</TableCell>
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
                        label={e.status || "فعال"}
                        size="small"
                        color={e.status === "فعال" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="مشاهده">
                        <IconButton size="small" color="info">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                          onClick={() => handleDelete(e.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* دیالوگ افزودن/ویرایش */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedEmployee ? "ویرایش کارمند" : "افزودن کارمند جدید"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="نام کامل *"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="بخش *"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="وظیفه"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="شماره حساب بانکی"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>انصراف</Button>
          <Button variant="contained" onClick={handleSave}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}