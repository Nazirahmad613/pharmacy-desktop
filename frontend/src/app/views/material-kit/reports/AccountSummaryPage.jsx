import { useState, useEffect, useMemo } from "react";
import { useAuth } from "app/contexts/AuthContext";
import ReportLayout from "../../../../components/ReportLayout";

import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Button,
  InputAdornment,
  Divider,
} from "@mui/material";

/* ✅ RTL MUI */
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { prefixer } from "stylis";

/* ===== آیکون‌ها ===== */
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BadgeIcon from "@mui/icons-material/Badge";

/* ============================================================
 *  کش RTL برای MUI
 * ============================================================ */
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

/* ============================================================
 *  پالت رنگ
 * ============================================================ */
const COLORS = {
  bg: "#f1f5f9",
  cardBg: "#ffffff",
  cardBorder: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  primaryLight: "#eef2ff",
  success: "#059669",
  successBg: "#ecfdf5",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
};

/* ============================================================
 *  منوی Select راست‌به‌چپ
 * ============================================================ */
const rtlMenuProps = {
  PaperProps: {
    sx: {
      direction: "rtl",
      textAlign: "right",
      borderRadius: "12px",
      mt: 0.5,
      boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
      border: `1px solid ${COLORS.cardBorder}`,
      "& .MuiMenuItem-root": {
        fontFamily: "'Vazirmatn', 'Segoe UI', Tahoma, sans-serif",
        fontSize: 13.5,
        fontWeight: 600,
        justifyContent: "flex-start",
        textAlign: "right",
        py: 1,
        px: 2,
        borderRadius: "8px",
        mx: 0.8,
        my: 0.3,
        "&:hover": {
          background: COLORS.primaryLight,
          color: COLORS.primaryDark,
        },
        "&.Mui-selected": {
          background: `${COLORS.primaryLight} !important`,
          color: COLORS.primaryDark,
          fontWeight: 800,
        },
      },
    },
  },
};

/* ============================================================
 *  استایل‌ها — کاملاً RTL
 * ============================================================ */
const styles = {
  page: {
    padding: { xs: "16px 12px", sm: "28px 24px" },
    maxWidth: 1440,
    margin: "0 auto",
    background: `linear-gradient(180deg, #f8fafc 0%, ${COLORS.bg} 100%)`,
    minHeight: "100vh",
    fontFamily: "'Vazirmatn', 'Segoe UI', Tahoma, sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2.5,
    padding: "16px 22px",
    borderRadius: "16px",
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
    flexWrap: "wrap",
    gap: 1.5,
  },
  title: {
    fontSize: { xs: 18, sm: 21 },
    fontWeight: 800,
    color: COLORS.textPrimary,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
  },
  titleBar: {
    display: "inline-block",
    width: 6,
    height: 26,
    borderRadius: 4,
    background: `linear-gradient(180deg, ${COLORS.primary} 0%, #7c3aed 100%)`,
    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.35)",
  },
  countBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primaryDark,
    background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    border: "1px solid #c7d2fe",
    padding: "6px 16px",
    borderRadius: "999px",
    boxShadow: "0 1px 3px rgba(79, 70, 229, 0.08)",
    display: "flex",
    alignItems: "center",
    gap: 0.8,
  },

  filterSection: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    flexWrap: "wrap",
    padding: "16px 20px",
    marginBottom: 3,
    borderRadius: "16px",
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.04)",
  },
  searchBox: {
    flex: 1,
    minWidth: { xs: "100%", sm: 260 },
    "& .MuiOutlinedInput-root": {
      height: 42,
      background: "#f8fafc",
      borderRadius: "11px",
      fontSize: 13.5,
      "& fieldset": { borderColor: COLORS.cardBorder },
      "&:hover": { background: "#ffffff" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused": {
        background: "#ffffff",
        boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.12)",
      },
      "&.Mui-focused fieldset": {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
      },
    },
  },
  selectBox: {
    minWidth: { xs: "100%", sm: 210 },
    "& .MuiOutlinedInput-root": {
      height: 42,
      background: "#f8fafc",
      borderRadius: "11px",
      fontSize: 13.5,
      "& fieldset": { borderColor: COLORS.cardBorder },
      "&:hover": { background: "#ffffff" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused": {
        background: "#ffffff",
        boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.12)",
      },
      "&.Mui-focused fieldset": {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
      },
    },
  },
  clearBtn: {
    height: 42,
    px: 2.2,
    borderRadius: "11px",
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    fontSize: 13,
    textTransform: "none",
    fontWeight: 700,
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "#fee2e2",
      borderColor: "#f87171",
      transform: "translateY(-1px)",
    },
  },

  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    gap: 2,
    background: COLORS.cardBg,
    borderRadius: "16px",
    border: `1px solid ${COLORS.cardBorder}`,
  },
  errorBox: {
    padding: "16px 22px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
    border: "1px solid #fecdd3",
    color: "#be123c",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    boxShadow: "0 2px 8px rgba(225, 29, 72, 0.06)",
  },
  emptyBox: {
    padding: "70px 20px",
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: 600,
    background: COLORS.cardBg,
    borderRadius: "16px",
    border: `2px dashed ${COLORS.cardBorder}`,
  },

  /* ===== گرید ===== */
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      md: "repeat(3, 1fr)",
      lg: "repeat(4, 1fr)",
    },
    gap: 2.2,
    alignItems: "stretch",
  },

  /* ===== کارت ===== */
  card: {
    position: "relative",
    overflow: "hidden",
    padding: "20px 18px 16px",
    borderRadius: "16px",
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      right: 0,
      left: 0,
      height: "4px",
      background: `linear-gradient(270deg, ${COLORS.primary} 0%, #8b5cf6 100%)`,
      opacity: 0.85,
      transition: "opacity 0.25s ease",
    },
    "&:hover": {
      borderColor: "#c7d2fe",
      transform: "translateY(-4px)",
      boxShadow: "0 14px 28px -6px rgba(79, 70, 229, 0.14)",
      "&::before": { opacity: 1 },
    },
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1,
  },
  accountName: {
    fontSize: 15.5,
    fontWeight: 800,
    color: COLORS.textPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    lineHeight: 1.5,
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.6,
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: 11.5,
    fontWeight: 700,
    background: "#f1f5f9",
    color: COLORS.primaryDark,
    border: "1px solid #e2e8f0",
    flexShrink: 0,
  },

  divider: {
    borderColor: "#f1f5f9",
    margin: "2px 0",
  },

  statsRow: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    background: "#f8fafc",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
  },
  statRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 800,
    color: COLORS.textPrimary,
    fontVariantNumeric: "tabular-nums",
  },
  statValueSuccess: {
    color: COLORS.success,
  },

  balanceBox: (positive) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "11px 14px",
    borderRadius: "12px",
    background: positive
      ? "linear-gradient(270deg, #ecfdf5 0%, #d1fae5 100%)"
      : "linear-gradient(270deg, #fef2f2 0%, #fee2e2 100%)",
    border: `1px solid ${positive ? "#6ee7b7" : "#fca5a5"}`,
    marginTop: "auto",
  }),
  balanceLabel: (positive) => ({
    fontSize: 12.5,
    fontWeight: 700,
    color: positive ? "#065f46" : "#991b1b",
    display: "flex",
    alignItems: "center",
    gap: 0.6,
  }),
  balanceValue: (positive) => ({
    display: "flex",
    alignItems: "center",
    gap: 0.6,
    fontSize: 15.5,
    fontWeight: 900,
    color: positive ? "#047857" : "#b91c1c",
    fontVariantNumeric: "tabular-nums",
  }),

  tazkiraRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    paddingTop: 1,
    marginTop: 0.2,
    borderTop: `1px dashed ${COLORS.cardBorder}`,
  },
  tazkiraValue: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.textSecondary,
    background: "#f1f5f9",
    padding: "2px 8px",
    borderRadius: "6px",
    fontFamily: "monospace",
    direction: "ltr",
  },

  paginationWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
    marginTop: 4,
    padding: "14px 20px",
    borderRadius: "16px",
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.05)",
    flexWrap: "wrap",
  },
  pageButton: (active) => ({
    minWidth: 40,
    height: 40,
    borderRadius: "10px",
    padding: "0 8px",
    fontSize: 13.5,
    fontWeight: 800,
    fontFamily: "inherit",
    textTransform: "none",
    transition: "all 0.2s ease",
    color: active ? "#ffffff" : COLORS.textSecondary,
    background: active
      ? `linear-gradient(135deg, ${COLORS.primary} 0%, #7c3aed 100%)`
      : "#f8fafc",
    border: active ? "none" : `1px solid ${COLORS.cardBorder}`,
    boxShadow: active ? "0 4px 12px rgba(79, 70, 229, 0.35)" : "none",
    "&:hover": {
      background: active
        ? `linear-gradient(135deg, ${COLORS.primaryDark} 0%, #6d28d9 100%)`
        : "#eef2ff",
      borderColor: active ? "none" : "#c7d2fe",
      color: active ? "#ffffff" : COLORS.primaryDark,
      transform: "translateY(-1px)",
    },
    "&.Mui-disabled": {
      color: COLORS.textMuted,
      background: "#f8fafc",
    },
  }),
  navButton: {
    height: 40,
    borderRadius: "10px",
    padding: "0 18px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    textTransform: "none",
    color: COLORS.textPrimary,
    background: "#f8fafc",
    border: `1px solid ${COLORS.cardBorder}`,
    transition: "all 0.2s ease",
    "&:hover": {
      background: "#eef2ff",
      borderColor: "#c7d2fe",
      color: COLORS.primaryDark,
      transform: "translateY(-1px)",
    },
    "&.Mui-disabled": {
      color: COLORS.textMuted,
      background: "#f8fafc",
      borderColor: "#f1f5f9",
    },
  },
  pageInfo: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: 700,
    padding: "8px 14px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: `1px solid ${COLORS.cardBorder}`,
    display: "flex",
    alignItems: "center",
    gap: 0.6,
  },
};

/* ============================================================
 *  نقشه نوع حساب → آیکون
 * ============================================================ */
const getTypeIcon = (type) => {
  const iconProps = { sx: { fontSize: 14 } };
  switch (type) {
    case "patient":
      return <LocalHospitalIcon {...iconProps} />;
    case "doctor":
      return <PersonIcon {...iconProps} />;
    case "customer":
    case "supplier":
      return <StorefrontIcon {...iconProps} />;
    default:
      return <AccountBalanceWalletIcon {...iconProps} />;
  }
};

/* ============================================================
 *  صفحه‌بندی هوشمند
 * ============================================================ */
const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);

  return pages;
};

/* ============================================================
 *  ترجمه نوع حساب
 * ============================================================ */
const TYPE_MAP = {
  patient: "مریض",
  doctor: "داکتر",
  visitor: "مراجع",
  customer: "مشتری",
  staff: "کارمند",
  supplier: "تأمین‌کننده",
  rent: "کرایه",
  electricity: "برق",
  water: "آب",
  internet: "انترنت",
  salary: "معاش",
  fuel: "سوخت",
  maintenance: "ترمیمات",
  laboratory: "لابراتوار",
  transport: "ترانسپورت",
  consultation: "مشاوره",
  expense: "مصرف عمومی",
  income: "درآمد",
  other: "سایر",
};
const translateAccountType = (type) => TYPE_MAP[type] || type;

/* ============================================================
 *  محتوای اصلی (داخل CacheProvider)
 * ============================================================ */
function AccountSummaryContent() {
  const { api, user, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 12;

  /* ===== دریافت ===== */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("❌ ابتدا وارد سیستم شوید تا حساب‌ها نمایش داده شوند");
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/account-summary");
        const apiData =
          res.data?.data && Array.isArray(res.data.data)
            ? res.data.data
            : Array.isArray(res.data)
            ? res.data
            : [];

        if (!apiData.length) setError("هیچ حسابی یافت نشد");
        setData(apiData);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        setError("خطا در دریافت داده‌ها. لطفاً API و توکن را بررسی کنید.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, user, authLoading]);

  /* ===== فیلتر ===== */
  const filteredData = useMemo(() => {
    let temp = [...data];

    if (filterType) temp = temp.filter((i) => i.account_type === filterType);

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      temp = temp.filter((i) =>
        (i.account_name || "").toLowerCase().includes(term)
      );
    }

    return temp.sort((a, b) => {
      if (a.account_type < b.account_type) return -1;
      if (a.account_type > b.account_type) return 1;
      if (a.account_name < b.account_name) return -1;
      if (a.account_name > b.account_name) return 1;
      return 0;
    });
  }, [search, filterType, data]);

  /* ===== صفحه‌بندی ===== */
  const currentItems = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  /* ===== Loading ===== */
  if (authLoading) {
    return (
      <Box sx={styles.loading}>
        <CircularProgress sx={{ color: COLORS.primary }} />
        <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>
          در حال بارگذاری اطلاعات کاربر...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={styles.page}>
      {/* ========== هدر ========== */}
      <Box sx={styles.header}>
        <Typography sx={styles.title}>
          <span style={styles.titleBar} />
          <ReceiptLongIcon sx={{ fontSize: 24, color: COLORS.primary }} />
          گزارش حساب‌ها
        </Typography>

        <Box sx={styles.countBadge}>
          <AccountBalanceIcon sx={{ fontSize: 16 }} />
          {filteredData.length.toLocaleString("fa-IR")} حساب
        </Box>
      </Box>

      {/* ========== فیلترها ========== */}
      <Box sx={styles.filterSection}>
        <TextField
          label="جستجوی نام حساب"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={styles.searchBox}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: COLORS.textMuted, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl sx={styles.selectBox} size="small">
          <InputLabel>فیلتر نوع حساب</InputLabel>
          <Select
            value={filterType}
            label="فیلتر نوع حساب"
            onChange={(e) => setFilterType(e.target.value)}
            MenuProps={rtlMenuProps}
          >
            <MenuItem value="">همه</MenuItem>
            <MenuItem value="doctor">داکتر</MenuItem>
            <MenuItem value="patient">مریض</MenuItem>
            <MenuItem value="customer">مشتری</MenuItem>
            <MenuItem value="supplier">تأمین‌کننده</MenuItem>
          </Select>
        </FormControl>

        {(search || filterType) && (
          <Button
            onClick={() => {
              setSearch("");
              setFilterType("");
            }}
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            sx={styles.clearBtn}
          >
            پاک کردن
          </Button>
        )}
      </Box>

      {/* ========== Loading ========== */}
      {loading && (
        <Box sx={styles.loading}>
          <CircularProgress sx={{ color: COLORS.primary }} />
          <Typography sx={{ color: COLORS.textSecondary, fontSize: 13 }}>
            در حال دریافت داده‌ها...
          </Typography>
        </Box>
      )}

      {/* ========== خطا ========== */}
      {!loading && error && <Box sx={styles.errorBox}>{error}</Box>}

      {/* ========== کارت‌ها ========== */}
      {!loading && !error && currentItems.length > 0 && (
        <Box sx={styles.cardsGrid}>
          {currentItems.map((item) => {
            const balance = Number(item.balance || 0);
            const positive = balance >= 0;
            const key =
              item.account_key || `${item.account_type}_${item.account_id}`;

            return (
              <Box key={key} sx={styles.card}>
                {/* هدر */}
                <Box sx={styles.cardHeader}>
                  <Typography sx={styles.accountName} title={item.account_name}>
                    {item.account_name || "—"}
                  </Typography>

                  <Box sx={styles.typeBadge}>
                    {getTypeIcon(item.account_type)}
                    {translateAccountType(item.account_type)}
                  </Box>
                </Box>

                <Divider sx={styles.divider} />

                {/* آمار */}
                <Box sx={styles.statsRow}>
                  <Box sx={styles.statRow}>
                    <Typography sx={styles.statLabel}>
                      <ReceiptLongIcon sx={{ fontSize: 14 }} />
                      مجموع حساب
                    </Typography>
                    <Typography sx={styles.statValue}>
                      {Number(item.total_credit || 0).toLocaleString("fa-IR")}
                    </Typography>
                  </Box>

                  <Box sx={styles.statRow}>
                    <Typography sx={styles.statLabel}>
                      <PaymentsIcon sx={{ fontSize: 14 }} />
                      پرداخت شده
                    </Typography>
                    <Typography
                      sx={{ ...styles.statValue, ...styles.statValueSuccess }}
                    >
                      {Number(item.total_debit || 0).toLocaleString("fa-IR")}
                    </Typography>
                  </Box>
                </Box>

                {/* باقی‌مانده */}
                <Box sx={styles.balanceBox(positive)}>
                  <Typography sx={styles.balanceLabel(positive)}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 15 }} />
                    باقی‌مانده
                  </Typography>
                  <Typography sx={styles.balanceValue(positive)}>
                    {positive ? (
                      <TrendingUpIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <TrendingDownIcon sx={{ fontSize: 18 }} />
                    )}
                    {Math.abs(balance).toLocaleString("fa-IR")}
                  </Typography>
                </Box>

                {/* تذکره */}
                {item.tazkira_number && (
                  <Box sx={styles.tazkiraRow}>
                    <Typography sx={styles.statLabel}>
                      <BadgeIcon sx={{ fontSize: 14 }} />
                      شماره تذکره
                    </Typography>
                    <Typography sx={styles.tazkiraValue}>
                      {item.tazkira_number}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ========== خالی ========== */}
      {!loading && !error && currentItems.length === 0 && (
        <Box sx={styles.emptyBox}>نتیجه‌ای برای نمایش وجود ندارد</Box>
      )}

      {/* ========== صفحه‌بندی ========== */}
      {!loading && !error && filteredData.length > itemsPerPage && (
        <Box sx={styles.paginationWrapper}>
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            sx={styles.navButton}
          >
            ← قبلی
          </Button>

          {getPageNumbers(currentPage, totalPages).map((p, idx) =>
            p === "..." ? (
              <Box
                key={`ellipsis-${idx}`}
                sx={{
                  color: COLORS.textMuted,
                  px: 0.5,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                …
              </Box>
            ) : (
              <Button
                key={p}
                onClick={() => setCurrentPage(p)}
                sx={styles.pageButton(currentPage === p)}
              >
                {p.toLocaleString("fa-IR")}
              </Button>
            )
          )}

          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            sx={styles.navButton}
          >
            بعدی →
          </Button>

          <Box sx={styles.pageInfo}>
            <ReceiptLongIcon sx={{ fontSize: 14, color: COLORS.textMuted }} />
            صفحه {currentPage.toLocaleString("fa-IR")} از{" "}
            {totalPages.toLocaleString("fa-IR")}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* ============================================================
 *  export اصلی با CacheProvider
 * ============================================================ */
export default function AccountSummaryText() {
  return (
    <CacheProvider value={cacheRtl}>
      <div dir="rtl">
        <ReportLayout title="گزارش حساب‌ها">
          <AccountSummaryContent />
        </ReportLayout>
      </div>
    </CacheProvider>
  );
}