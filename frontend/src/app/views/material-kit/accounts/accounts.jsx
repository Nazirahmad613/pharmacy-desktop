import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import MainLayoutjur from "../../../../components/Mainlayoutjur";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountTree as AccountTreeIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// ============================================================
// ترجمه‌های فارسی برای انواع حساب
// ============================================================
const ACCOUNT_TYPE_LABELS = {
  asset: "دارایی",
  liability: "بدهی",
  equity: "سرمایه",
  income: "درآمد",
  expense: "هزینه",
  receivable: "مطالبات",
  payable: "بدهی‌ها",
};

// ============================================================
// ترجمه‌های فارسی برای دسته‌بندی‌ها
// ============================================================
const CATEGORY_LABELS = {
  // Assets
  cash: "نقدی",
  bank: "بانکی",
  medicine_inventory: "موجودی ادویه",
  laboratory_inventory: "موجودی لابراتوار",
  consumable_inventory: "موجودی مصرفی",
  medical_equipment: "تجهیزات طبی",
  office_equipment: "تجهیزات دفتری",
  tools_and_supplies: "ابزار و لوازم",
  building: "ساختمان",
  land: "زمین",
  vehicle: "وسیله نقلیه",
  furniture: "فرنیچر",
  prepayments: "پیش‌پرداخت‌ها",
  deposits: "سپرده‌ها",
  other_assets: "سایر دارایی‌ها",
  // Liabilities
  suppliers: "تأمین‌کنندگان",
  medicine_purchase_payable: "بدهی خرید ادویه",
  equipment_purchase_payable: "بدهی خرید تجهیزات",
  laboratory_material_payable: "بدهی مواد لابراتوار",
  salary_payable: "بدهی معاشات",
  tax_payable: "بدهی مالیه",
  loans: "قرض‌ها",
  bank_loans: "قرض بانکی",
  contractual_liabilities: "تعهدات قراردادی",
  other_liabilities: "سایر بدهی‌ها",
  // Equity
  initial_capital: "سرمایه اولیه",
  owner_capital: "سرمایه مالک",
  partners_capital: "سرمایه شرکا",
  retained_earnings: "سود انباشته",
  retained_losses: "ضرر انباشته",
  owner_drawings: "برداشت مالک",
  other_equity: "سایر سرمایه",
  // Income
  medical_services_income: "درآمد خدمات طبی",
  consultation_income: "درآمد مشاوره",
  laboratory_income: "درآمد لابراتوار",
  radiology_income: "درآمد رادیولوژی",
  operation_income: "درآمد عملیات",
  admission_income: "درآمد بستر",
  pharmacy_income: "درآمد دواخانه",
  goods_sales_income: "درآمد فروش اجناس",
  operation_room_income: "درآمد اتاق عملیات",
  other_services_income: "درآمد سایر خدمات",
  non_operating_income: "درآمد غیرعملیاتی",
  rent_income: "درآمد کرایه",
  other_income: "سایر درآمدها",
  // Expense
  salary_expense: "مصرف معاشات",
  rent_expense: "مصرف کرایه",
  electricity_expense: "مصرف برق",
  water_expense: "مصرف آب",
  internet_expense: "مصرف انترنت",
  telephone_expense: "مصرف تلیفون",
  transportation_expense: "مصرف ترانسپورت",
  consumable_material_expense: "مصرف مواد مصرفی",
  medical_material_expense: "مصرف مواد طبی",
  laboratory_material_expense: "مصرف مواد لابراتوار",
  cleaning_material_expense: "مصرف مواد پاک‌کاری",
  repair_expense: "مصرف تعمیرات",
  medical_equipment_repair_expense: "مصرف تعمیر تجهیزات طبی",
  building_repair_expense: "مصرف تعمیر ساختمان",
  fuel_expense: "مصرف سوخت",
  stationery_expense: "مصرف قرطاسیه",
  administrative_expense: "مصرف اداری",
  marketing_expense: "مصرف بازاریابی",
  legal_expense: "مصرف حقوقی",
  tax_and_duty_expense: "مصرف مالیه و عوارض",
  insurance_expense: "مصرف بیمه",
  bank_charge_expense: "مصرف کمیشن بانکی",
  depreciation_expense: "مصرف استهلاک",
  other_expense: "سایر مصارف",
  // Receivable
  insurance_companies: "شرکت‌های بیمه",
  contracting_institutions: "مؤسسات قراردادی",
  companies: "شرکت‌ها",
  corporate_customers: "مشتریان شرکتی",
  miscellaneous_receivables: "مطالبات متفرقه",
  other_receivables: "سایر مطالبات",
  // Payable
  medicine_suppliers: "تأمین‌کنندگان ادویه",
  medical_equipment_suppliers: "تأمین‌کنندگان تجهیزات طبی",
  laboratory_material_suppliers: "تأمین‌کنندگان مواد لابراتوار",
  consumable_material_suppliers: "تأمین‌کنندگان مواد مصرفی",
  vendors: "فروشندگان",
  contractors: "پیمانکاران",
  salary_payables: "معاشات قابل پرداخت",
  tax_payables: "مالیات قابل پرداخت",
  bank_payables: "بدهی بانکی",
  other_creditors: "سایر طلبکاران",
};

// ============================================================
// ✅ دسته‌بندی‌های استاتیک بر اساس نوع حساب
// (مطابق migration جدول accounts)
// ============================================================
const STATIC_CATEGORIES = {
  asset: [
    "cash",
    "bank",
    "medicine_inventory",
    "laboratory_inventory",
    "consumable_inventory",
    "medical_equipment",
    "office_equipment",
    "tools_and_supplies",
    "building",
    "land",
    "vehicle",
    "furniture",
    "prepayments",
    "deposits",
    "other_assets",
  ],
  liability: [
    "suppliers",
    "medicine_purchase_payable",
    "equipment_purchase_payable",
    "laboratory_material_payable",
    "salary_payable",
    "tax_payable",
    "loans",
    "bank_loans",
    "contractual_liabilities",
    "other_liabilities",
  ],
  equity: [
    "initial_capital",
    "owner_capital",
    "partners_capital",
    "retained_earnings",
    "retained_losses",
    "owner_drawings",
    "other_equity",
  ],
  income: [
    "medical_services_income",
    "consultation_income",
    "laboratory_income",
    "radiology_income",
    "operation_income",
    "admission_income",
    "pharmacy_income",
    "goods_sales_income",
    "operation_room_income",
    "other_services_income",
    "non_operating_income",
    "rent_income",
    "other_income",
  ],
  expense: [
    "salary_expense",
    "rent_expense",
    "electricity_expense",
    "water_expense",
    "internet_expense",
    "telephone_expense",
    "transportation_expense",
    "consumable_material_expense",
    "medical_material_expense",
    "laboratory_material_expense",
    "cleaning_material_expense",
    "repair_expense",
    "medical_equipment_repair_expense",
    "building_repair_expense",
    "fuel_expense",
    "stationery_expense",
    "administrative_expense",
    "marketing_expense",
    "legal_expense",
    "tax_and_duty_expense",
    "insurance_expense",
    "bank_charge_expense",
    "depreciation_expense",
    "other_expense",
  ],
  receivable: [
    "insurance_companies",
    "contracting_institutions",
    "companies",
    "corporate_customers",
    "miscellaneous_receivables",
    "other_receivables",
  ],
  payable: [
    "medicine_suppliers",
    "medical_equipment_suppliers",
    "laboratory_material_suppliers",
    "consumable_material_suppliers",
    "vendors",
    "contractors",
    "salary_payables",
    "tax_payables",
    "bank_payables",
    "other_creditors",
  ],
};

// ============================================================
// ✅ تابع کمکی: دریافت دسته‌بندی‌ها بر اساس نوع (استاتیک)
// ============================================================
const getCategoriesByType = (accountType) => {
  if (!accountType) return [];
  return STATIC_CATEGORIES[accountType] || [];
};

// ============================================================
// رنگ‌ها بر اساس نوع حساب
// ============================================================
const TYPE_COLORS = {
  asset: "#10b981",
  liability: "#ef4444",
  equity: "#8b5cf6",
  income: "#3b82f6",
  expense: "#f59e0b",
  receivable: "#06b6d4",
  payable: "#ec4899",
};

const CURRENCIES = ["AFN", "USD", "EUR", "PKR", "IRR", "AED"];

// ============================================================
// فرم خالی
// ============================================================
const emptyForm = {
  account_code: "",
  account_name: "",
  account_type: "",
  account_category: "",
  parent_id: "",
  opening_balance: 0,
  opening_balance_type: "",
  currency: "AFN",
  description: "",
  is_system: false,
  allow_transactions: true,
  is_control_account: false,
  is_active: true,
};

export default function Accounts() {
  const { api: authApi } = useAuth();
  const api = authApi;

  // ========== State ها ==========
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [parents, setParents] = useState([]);
  const [types, setTypes] = useState([]);

  // فیلترها
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // دیالوگ‌ها
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // تب
  const [tabValue, setTabValue] = useState(0);

  // ========== بارگذاری داده‌ها ==========
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
      };
      if (search) params.search = search;
      if (filterType) params.account_type = filterType;
      if (filterCategory) params.account_category = filterCategory;
      if (filterStatus !== "") params.is_active = filterStatus;

      const res = await api.get("/accounts", { params });
      const data = res.data.data;

      setAccounts(data.data || data);
      setTotalPages(data.last_page || 1);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("❌ خطا در بارگذاری حساب‌ها");
    } finally {
      setLoading(false);
    }
  }, [api, page, perPage, search, filterType, filterCategory, filterStatus]);

  const loadSummary = async () => {
    try {
      const res = await api.get("/accounts/summary");
      setSummary(res.data.data);
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  };

  const loadTypes = async () => {
    try {
      const res = await api.get("/accounts/types");
      setTypes(res.data.data || []);
    } catch (error) {
      console.error("Error loading types:", error);
      // ✅ در صورت خطا، از ثابت‌های داخلی استفاده کن
      setTypes(Object.keys(ACCOUNT_TYPE_LABELS));
    }
  };

  const loadParents = async (accountType = "") => {
    try {
      const params = {};
      if (accountType) params.account_type = accountType;
      const res = await api.get("/accounts/parents", { params });
      setParents(res.data.data || []);
    } catch (error) {
      console.error("Error loading parents:", error);
      setParents([]);
    }
  };

  // ========== Effects ==========
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadSummary();
    loadTypes();
    loadParents();
  }, []);

  // ========== هندلرها ==========
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setCategories([]); // ✅ خالی چون نوع حساب انتخاب نشده
    loadParents();
    setOpenForm(true);
  };

  const handleOpenEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      account_code: account.account_code || "",
      account_name: account.account_name || "",
      account_type: account.account_type || "",
      account_category: account.account_category || "",
      parent_id: account.parent_id || "",
      opening_balance: account.opening_balance || 0,
      opening_balance_type: account.opening_balance_type || "",
      currency: account.currency || "AFN",
      description: account.description || "",
      is_system: account.is_system || false,
      allow_transactions: account.allow_transactions ?? true,
      is_control_account: account.is_control_account || false,
      is_active: account.is_active ?? true,
    });
    setFormErrors({});
    // ✅ استفاده از دسته‌بندی‌های استاتیک
    setCategories(getCategoriesByType(account.account_type));
    loadParents(account.account_type);
    setOpenForm(true);
  };

  const handleOpenView = (account) => {
    setSelectedAccount(account);
    setOpenView(true);
  };

  const handleOpenDelete = (account) => {
    setSelectedAccount(account);
    setOpenDelete(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const handleFormChange = (field, value) => {
    const updated = { ...formData, [field]: value };

    if (field === "account_type") {
      updated.account_category = ""; // ریست دسته‌بندی
      updated.parent_id = "";
      // ✅ استفاده از دسته‌بندی‌های استاتیک
      setCategories(getCategoriesByType(value));
      loadParents(value);
    }

    setFormData(updated);

    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: null });
    }
  };

  const handleSave = async () => {
    // اعتبارسنجی ساده
    const errors = {};
    if (!formData.account_code?.trim()) errors.account_code = "کد حساب الزامی است";
    if (!formData.account_name?.trim()) errors.account_name = "نام حساب الزامی است";
    if (!formData.account_type) errors.account_type = "نوع حساب الزامی است";
    if (!formData.account_category) errors.account_category = "دسته‌بندی الزامی است";
    if (!formData.currency) errors.currency = "واحد پول الزامی است";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("❌ لطفاً فیلدهای الزامی را تکمیل کنید");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...formData,
        parent_id: formData.parent_id || null,
        opening_balance: Number(formData.opening_balance) || 0,
      };

      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        toast.success("✅ حساب با موفقیت ویرایش شد");
      } else {
        await api.post("/accounts", payload);
        toast.success("✅ حساب با موفقیت ایجاد شد");
      }

      handleCloseForm();
      loadAccounts();
      loadSummary();
    } catch (error) {
      console.error("Error saving account:", error);
      if (error.response?.data?.errors) {
        const errs = error.response.data.errors;
        const formatted = {};
        Object.entries(errs).forEach(([k, v]) => {
          formatted[k] = Array.isArray(v) ? v[0] : v;
        });
        setFormErrors(formatted);
        toast.error("❌ خطاهای اعتبارسنجی");
      } else {
        toast.error(error.response?.data?.message || "❌ خطا در ذخیره حساب");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (account) => {
    try {
      await api.post(`/accounts/${account.id}/toggle-status`);
      toast.success(
        account.is_active
          ? "✅ حساب غیرفعال شد"
          : "✅ حساب فعال شد"
      );
      loadAccounts();
      loadSummary();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(
        error.response?.data?.message || "❌ خطا در تغییر وضعیت"
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      await api.delete(`/accounts/${selectedAccount.id}`);
      toast.success("✅ حساب با موفقیت حذف شد");
      setOpenDelete(false);
      setSelectedAccount(null);
      loadAccounts();
      loadSummary();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error.response?.data?.message || "❌ خطا در حذف حساب"
      );
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterCategory("");
    setFilterStatus("");
    setPage(1);
  };

  // ========== محاسبات ==========
  // ✅ دسته‌بندی‌های موجود برای فیلتر (استاتیک)
  const availableCategories = useMemo(() => {
    if (!filterType) return [];
    return STATIC_CATEGORIES[filterType] || [];
  }, [filterType]);

  // ========== استایل‌ها ==========
  const styles = {
    pageContainer: {
      padding: "20px",
      background: "#0f172a",
      minHeight: "100vh",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "15px",
    },
    title: {
      color: "#fff",
      fontSize: "24px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    summaryCard: {
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #334155",
      textAlign: "center",
    },
    summaryNumber: {
      fontSize: "28px",
      fontWeight: "bold",
      marginBottom: "5px",
    },
    summaryLabel: {
      fontSize: "13px",
      color: "#94a3b8",
    },
    filterCard: {
      background: "#1e293b",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
      border: "1px solid #334155",
    },
    tableContainer: {
      background: "#1e293b",
      borderRadius: "12px",
      border: "1px solid #334155",
      overflow: "hidden",
    },
    tableHead: {
      background: "#0f172a",
    },
    tableHeadCell: {
      color: "#60a5fa",
      fontWeight: "bold",
      fontSize: "13px",
      borderBottom: "1px solid #334155",
      whiteSpace: "nowrap",
    },
    tableCell: {
      color: "#e2e8f0",
      fontSize: "13px",
      borderBottom: "1px solid #1e293b",
    },
    typeChip: (type) => ({
      background: TYPE_COLORS[type] || "#6b7280",
      color: "#fff",
      fontWeight: "bold",
      fontSize: "11px",
    }),
    statusChip: (isActive) => ({
      background: isActive ? "#10b981" : "#ef4444",
      color: "#fff",
      fontWeight: "bold",
      fontSize: "11px",
    }),
    actionBtn: {
      minWidth: "32px",
      width: "32px",
      height: "32px",
      padding: 0,
    },
    dialog: {
      "& .MuiDialog-paper": {
        background: "#1e293b",
        color: "#fff",
        borderRadius: "12px",
      },
    },
    dialogTitle: {
      background: "#0f172a",
      color: "#fff",
      fontWeight: "bold",
      borderBottom: "1px solid #334155",
    },
    dialogContent: {
      padding: "20px",
    },
    dialogActions: {
      padding: "15px 20px",
      borderTop: "1px solid #334155",
      gap: "10px",
    },
    input: {
      "& .MuiOutlinedInput-root": {
        color: "#fff",
        background: "#0f172a",
        "& fieldset": {
          borderColor: "#334155",
        },
        "&:hover fieldset": {
          borderColor: "#60a5fa",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#3b82f6",
        },
      },
      "& .MuiInputLabel-root": {
        color: "#94a3b8",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "#60a5fa",
      },
      "& .MuiFormHelperText-root": {
        color: "#ef4444",
      },
    },
  };

  // ========== رندر ==========
  return (
    <MainLayoutjur>
      <Box sx={styles.pageContainer}>
        {/* ===== هدر ===== */}
        <Box sx={styles.header}>
          <Typography sx={styles.title}>
            <AccountBalanceWalletIcon sx={{ fontSize: 32, color: "#10b981" }} />
            مدیریت حساب‌ها
          </Typography>
          <Box sx={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadAccounts();
                loadSummary();
              }}
              sx={{
                color: "#60a5fa",
                borderColor: "#3b82f6",
                "&:hover": {
                  borderColor: "#60a5fa",
                  background: "rgba(59, 130, 246, 0.1)",
                },
              }}
            >
              بروزرسانی
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                "&:hover": {
                  background: "linear-gradient(135deg, #059669, #047857)",
                },
              }}
            >
              حساب جدید
            </Button>
          </Box>
        </Box>

        {/* ===== کارت‌های خلاصه ===== */}
        {summary && (
          <Grid container spacing={2} sx={{ marginBottom: "20px" }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={styles.summaryCard}>
                <Typography sx={{ ...styles.summaryNumber, color: "#3b82f6" }}>
                  {summary.total}
                </Typography>
                <Typography sx={styles.summaryLabel}>کل حساب‌ها</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={styles.summaryCard}>
                <Typography sx={{ ...styles.summaryNumber, color: "#10b981" }}>
                  {summary.active}
                </Typography>
                <Typography sx={styles.summaryLabel}>حساب‌های فعال</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={styles.summaryCard}>
                <Typography sx={{ ...styles.summaryNumber, color: "#ef4444" }}>
                  {summary.inactive}
                </Typography>
                <Typography sx={styles.summaryLabel}>حساب‌های غیرفعال</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={styles.summaryCard}>
                <Typography sx={{ ...styles.summaryNumber, color: "#8b5cf6" }}>
                  {summary.system}
                </Typography>
                <Typography sx={styles.summaryLabel}>حساب‌های سیستمی</Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* ===== تب‌ها ===== */}
        <Box sx={{ marginBottom: "20px" }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{
              "& .MuiTab-root": { color: "#94a3b8" },
              "& .Mui-selected": { color: "#60a5fa !important" },
              "& .MuiTabs-indicator": { background: "#3b82f6" },
            }}
          >
            <Tab label="لیست حساب‌ها" />
            <Tab label="خلاصه بر اساس نوع" />
          </Tabs>
        </Box>

        {/* ===== تب 1: لیست ===== */}
        {tabValue === 0 && (
          <>
            {/* ===== فیلترها ===== */}
            <Box sx={styles.filterCard}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <FilterListIcon sx={{ color: "#60a5fa" }} />
                <Typography sx={{ color: "#fff", fontWeight: "bold" }}>
                  فیلترها
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="جستجو..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#94a3b8" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={styles.input}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" sx={styles.input}>
                    <InputLabel>نوع حساب</InputLabel>
                    <Select
                      value={filterType}
                      label="نوع حساب"
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setFilterCategory("");
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">همه</MenuItem>
                      {(types.length > 0 ? types : Object.keys(ACCOUNT_TYPE_LABELS)).map((t) => (
                        <MenuItem key={t} value={t}>
                          {ACCOUNT_TYPE_LABELS[t] || t}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small" sx={styles.input} disabled={!filterType}>
                    <InputLabel>دسته‌بندی</InputLabel>
                    <Select
                      value={filterCategory}
                      label="دسته‌بندی"
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">همه</MenuItem>
                      {availableCategories.map((c) => (
                        <MenuItem key={c} value={c}>
                          {CATEGORY_LABELS[c] || c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small" sx={styles.input}>
                    <InputLabel>وضعیت</InputLabel>
                    <Select
                      value={filterStatus}
                      label="وضعیت"
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value="">همه</MenuItem>
                      <MenuItem value="true">فعال</MenuItem>
                      <MenuItem value="false">غیرفعال</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleResetFilters}
                    sx={{
                      color: "#ef4444",
                      borderColor: "#ef4444",
                      height: "40px",
                      "&:hover": {
                        borderColor: "#dc2626",
                        background: "rgba(239, 68, 68, 0.1)",
                      },
                    }}
                  >
                    پاک کردن
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* ===== جدول ===== */}
            <TableContainer component={Paper} sx={styles.tableContainer}>
              <Table>
                <TableHead sx={styles.tableHead}>
                  <TableRow>
                    <TableCell sx={styles.tableHeadCell}>#</TableCell>
                    <TableCell sx={styles.tableHeadCell}>کد حساب</TableCell>
                    <TableCell sx={styles.tableHeadCell}>نام حساب</TableCell>
                    <TableCell sx={styles.tableHeadCell}>نوع</TableCell>
                    <TableCell sx={styles.tableHeadCell}>دسته‌بندی</TableCell>
                    <TableCell sx={styles.tableHeadCell}>حساب مادر</TableCell>
                    <TableCell sx={styles.tableHeadCell}>واحد پول</TableCell>
                    <TableCell sx={styles.tableHeadCell}>وضعیت</TableCell>
                    <TableCell sx={styles.tableHeadCell}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ padding: "40px" }}>
                        <CircularProgress sx={{ color: "#3b82f6" }} />
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ ...styles.tableCell, padding: "40px" }}>
                        <Typography sx={{ color: "#94a3b8" }}>
                          هیچ حسابی یافت نشد
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account, idx) => (
                      <TableRow
                        key={account.id}
                        sx={{
                          "&:hover": { background: "#0f172a" },
                          transition: "background 0.2s",
                        }}
                      >
                        <TableCell sx={styles.tableCell}>
                          {(page - 1) * perPage + idx + 1}
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Typography sx={{ fontFamily: "monospace", fontWeight: "bold", color: "#fcd34d" }}>
                            {account.account_code}
                          </Typography>
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {account.is_system && (
                              <Tooltip title="حساب سیستمی">
                                <AccountTreeIcon sx={{ fontSize: 16, color: "#8b5cf6" }} />
                              </Tooltip>
                            )}
                            <Typography sx={{ color: "#fff" }}>
                              {account.account_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Chip
                            label={ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                            size="small"
                            sx={styles.typeChip(account.account_type)}
                          />
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          {CATEGORY_LABELS[account.account_category] || account.account_category}
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          {account.parent ? (
                            <Typography sx={{ fontSize: "12px", color: "#60a5fa" }}>
                              {account.parent.account_name}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "12px", color: "#64748b" }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Chip
                            label={account.currency}
                            size="small"
                            sx={{ background: "#334155", color: "#e2e8f0" }}
                          />
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Chip
                            label={account.is_active ? "فعال" : "غیرفعال"}
                            size="small"
                            sx={styles.statusChip(account.is_active)}
                          />
                        </TableCell>
                        <TableCell sx={styles.tableCell}>
                          <Box sx={{ display: "flex", gap: "4px" }}>
                            <Tooltip title="مشاهده">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenView(account)}
                                sx={{ ...styles.actionBtn, color: "#60a5fa", "&:hover": { background: "rgba(59,130,246,0.2)" } }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ویرایش">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(account)}
                                sx={{ ...styles.actionBtn, color: "#f59e0b", "&:hover": { background: "rgba(245,158,11,0.2)" } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={account.is_active ? "غیرفعال کردن" : "فعال کردن"}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleStatus(account)}
                                sx={{
                                  ...styles.actionBtn,
                                  color: account.is_active ? "#ef4444" : "#10b981",
                                  "&:hover": {
                                    background: account.is_active
                                      ? "rgba(239,68,68,0.2)"
                                      : "rgba(16,185,129,0.2)",
                                  },
                                }}
                              >
                                {account.is_active ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {!account.is_system && (
                              <Tooltip title="حذف">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDelete(account)}
                                  sx={{ ...styles.actionBtn, color: "#ef4444", "&:hover": { background: "rgba(239,68,68,0.2)" } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ===== Pagination ===== */}
            {totalItems > 0 && (
              <Box sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}>
                <Typography sx={{ color: "#94a3b8", fontSize: "14px" }}>
                  نمایش {(page - 1) * perPage + 1} تا {Math.min(page * perPage, totalItems)} از {totalItems}
                </Typography>
                <Box sx={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    sx={{ color: "#60a5fa" }}
                  >
                    قبلی
                  </Button>
                  <Typography sx={{ color: "#fff" }}>
                    صفحه {page} از {totalPages}
                  </Typography>
                  <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    sx={{ color: "#60a5fa" }}
                  >
                    بعدی
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}

        {/* ===== تب 2: خلاصه ===== */}
        {tabValue === 1 && summary?.by_type && (
          <Grid container spacing={2}>
            {summary.by_type.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.account_type}>
                <Card sx={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: `2px solid ${TYPE_COLORS[item.account_type] || "#334155"}`,
                  borderRadius: "12px",
                }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography sx={{ color: "#94a3b8", fontSize: "13px", marginBottom: "5px" }}>
                          {ACCOUNT_TYPE_LABELS[item.account_type] || item.account_type}
                        </Typography>
                        <Typography sx={{ color: TYPE_COLORS[item.account_type], fontSize: "32px", fontWeight: "bold" }}>
                          {item.total}
                        </Typography>
                      </Box>
                      <Box sx={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: `${TYPE_COLORS[item.account_type]}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        {["asset", "receivable"].includes(item.account_type) ? (
                          <TrendingUpIcon sx={{ color: TYPE_COLORS[item.account_type], fontSize: 32 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: TYPE_COLORS[item.account_type], fontSize: 32 }} />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* ===== دیالوگ فرم ===== */}
        <Dialog
          open={openForm}
          onClose={handleCloseForm}
          maxWidth="md"
          fullWidth
          sx={styles.dialog}
        >
          <DialogTitle sx={styles.dialogTitle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: "bold" }}>
                {editingId ? "✏️ ویرایش حساب" : "➕ ایجاد حساب جدید"}
              </Typography>
              <IconButton onClick={handleCloseForm} sx={{ color: "#fff" }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={styles.dialogContent}>
            <Grid container spacing={2} sx={{ marginTop: "5px" }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="کد حساب *"
                  value={formData.account_code}
                  onChange={(e) => handleFormChange("account_code", e.target.value)}
                  error={!!formErrors.account_code}
                  helperText={formErrors.account_code}
                  sx={styles.input}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="نام حساب *"
                  value={formData.account_name}
                  onChange={(e) => handleFormChange("account_name", e.target.value)}
                  error={!!formErrors.account_name}
                  helperText={formErrors.account_name}
                  sx={styles.input}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={styles.input} error={!!formErrors.account_type}>
                  <InputLabel>نوع حساب *</InputLabel>
                  <Select
                    value={formData.account_type}
                    label="نوع حساب *"
                    onChange={(e) => handleFormChange("account_type", e.target.value)}
                  >
                    {(types.length > 0 ? types : Object.keys(ACCOUNT_TYPE_LABELS)).map((t) => (
                      <MenuItem key={t} value={t}>
                        {ACCOUNT_TYPE_LABELS[t] || t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  size="small"
                  sx={styles.input}
                  error={!!formErrors.account_category}
                  disabled={!formData.account_type}
                >
                  <InputLabel>دسته‌بندی *</InputLabel>
                  <Select
                    value={formData.account_category}
                    label="دسته‌بندی *"
                    onChange={(e) => handleFormChange("account_category", e.target.value)}
                  >
                    {categories.length === 0 ? (
                      <MenuItem value="" disabled>
                        ابتدا نوع حساب را انتخاب کنید
                      </MenuItem>
                    ) : (
                      categories.map((c) => (
                        <MenuItem key={c} value={c}>
                          {CATEGORY_LABELS[c] || c}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={styles.input}>
                  <InputLabel>حساب مادر</InputLabel>
                  <Select
                    value={formData.parent_id}
                    label="حساب مادر"
                    onChange={(e) => handleFormChange("parent_id", e.target.value)}
                  >
                    <MenuItem value="">— بدون حساب مادر —</MenuItem>
                    {parents
                      .filter((p) => p.id !== editingId)
                      .map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.account_code} - {p.account_name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={styles.input}>
                  <InputLabel>واحد پول *</InputLabel>
                  <Select
                    value={formData.currency}
                    label="واحد پول *"
                    onChange={(e) => handleFormChange("currency", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="موجودی اولیه"
                  value={formData.opening_balance}
                  onChange={(e) => handleFormChange("opening_balance", e.target.value)}
                  sx={styles.input}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={styles.input}>
                  <InputLabel>نوع موجودی اولیه</InputLabel>
                  <Select
                    value={formData.opening_balance_type}
                    label="نوع موجودی اولیه"
                    onChange={(e) => handleFormChange("opening_balance_type", e.target.value)}
                  >
                    <MenuItem value="">— خودکار —</MenuItem>
                    <MenuItem value="debit">بدهکار (Debit)</MenuItem>
                    <MenuItem value="credit">بستانکار (Credit)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="توضیحات"
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  sx={styles.input}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_transactions}
                      onChange={(e) => handleFormChange("allow_transactions", e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#10b981" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: "#10b981" },
                      }}
                    />
                  }
                  label={<Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>اجازه تراکنش</Typography>}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_control_account}
                      onChange={(e) => handleFormChange("is_control_account", e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#8b5cf6" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: "#8b5cf6" },
                      }}
                    />
                  }
                  label={<Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>حساب کنترلی</Typography>}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => handleFormChange("is_active", e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#10b981" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: "#10b981" },
                      }}
                    />
                  }
                  label={<Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>فعال</Typography>}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={styles.dialogActions}>
            <Button
              onClick={handleCloseForm}
              sx={{ color: "#94a3b8" }}
            >
              انصراف
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
              sx={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                "&:hover": {
                  background: "linear-gradient(135deg, #059669, #047857)",
                },
              }}
            >
              {saving ? "در حال ذخیره..." : editingId ? "ویرایش" : "ایجاد"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ===== دیالوگ مشاهده ===== */}
        <Dialog
          open={openView}
          onClose={() => setOpenView(false)}
          maxWidth="sm"
          fullWidth
          sx={styles.dialog}
        >
          <DialogTitle sx={styles.dialogTitle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: "bold" }}>👁️ جزئیات حساب</Typography>
              <IconButton onClick={() => setOpenView(false)} sx={{ color: "#fff" }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={styles.dialogContent}>
            {selectedAccount && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>کد حساب</Typography>
                    <Typography sx={{ color: "#fcd34d", fontWeight: "bold", fontFamily: "monospace" }}>
                      {selectedAccount.account_code}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>وضعیت</Typography>
                    <Chip
                      label={selectedAccount.is_active ? "فعال" : "غیرفعال"}
                      size="small"
                      sx={styles.statusChip(selectedAccount.is_active)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>نام حساب</Typography>
                    <Typography sx={{ color: "#fff", fontWeight: "bold" }}>
                      {selectedAccount.account_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>نوع حساب</Typography>
                    <Chip
                      label={ACCOUNT_TYPE_LABELS[selectedAccount.account_type] || selectedAccount.account_type}
                      size="small"
                      sx={styles.typeChip(selectedAccount.account_type)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>دسته‌بندی</Typography>
                    <Typography sx={{ color: "#e2e8f0" }}>
                      {CATEGORY_LABELS[selectedAccount.account_category] || selectedAccount.account_category}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>واحد پول</Typography>
                    <Chip label={selectedAccount.currency} size="small" sx={{ background: "#334155", color: "#e2e8f0" }} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>ماهیت عادی</Typography>
                    <Typography sx={{ color: "#e2e8f0" }}>
                      {selectedAccount.normal_balance === "debit" ? "بدهکار" : "بستانکار"}
                    </Typography>
                  </Grid>
                  {selectedAccount.parent && (
                    <Grid item xs={12}>
                      <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>حساب مادر</Typography>
                      <Typography sx={{ color: "#60a5fa" }}>
                        {selectedAccount.parent.account_code} - {selectedAccount.parent.account_name}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>اجازه تراکنش</Typography>
                    <Typography sx={{ color: "#e2e8f0" }}>
                      {selectedAccount.allow_transactions ? "✅ بله" : "❌ خیر"}
                    </Typography>
                  </Grid>
                  {selectedAccount.description && (
                    <Grid item xs={12}>
                      <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>توضیحات</Typography>
                      <Typography sx={{ color: "#e2e8f0", fontSize: "13px" }}>
                        {selectedAccount.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={styles.dialogActions}>
            <Button onClick={() => setOpenView(false)} sx={{ color: "#94a3b8" }}>
              بستن
            </Button>
          </DialogActions>
        </Dialog>

        {/* ===== دیالوگ حذف ===== */}
        <Dialog
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          maxWidth="sm"
          fullWidth
          sx={styles.dialog}
        >
          <DialogTitle sx={{ ...styles.dialogTitle, color: "#ef4444" }}>
            ⚠️ تأیید حذف
          </DialogTitle>
          <DialogContent sx={styles.dialogContent}>
            <Typography sx={{ color: "#e2e8f0", marginTop: "10px" }}>
              آیا از حذف حساب <strong style={{ color: "#fcd34d" }}>{selectedAccount?.account_name}</strong> مطمئن هستید؟
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px", marginTop: "10px" }}>
              این عملیات قابل بازگشت نیست.
            </Typography>
          </DialogContent>
          <DialogActions sx={styles.dialogActions}>
            <Button onClick={() => setOpenDelete(false)} sx={{ color: "#94a3b8" }}>
              انصراف
            </Button>
            <Button
              variant="contained"
              onClick={handleDelete}
              sx={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                "&:hover": {
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                },
              }}
            >
              حذف
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayoutjur>
  );
}