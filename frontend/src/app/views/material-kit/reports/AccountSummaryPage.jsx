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
  Chip,
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
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BadgeIcon from "@mui/icons-material/Badge";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

/* ============================================================
 *  کش RTL برای MUI
 * ============================================================ */
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

/* ============================================================
 *  ✅ پالت رنگ با تفکیک منطقی:
 *  - باقی‌مانده روی مریض (balance > 0) → سرخ
 *  - تسویه (balance === 0)             → سبز
 *  - شفاخانه قرضدار است (balance < 0) → زرد
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

  /* ✅ سرخ — باقی روی مریض */
  red: "#dc2626",
  redDark: "#991b1b",
  redBg: "#fef2f2",

  /* ✅ سبز — تسویه */
  green: "#059669",
  greenDark: "#065f46",
  greenBg: "#ecfdf5",

  /* ✅ زرد — شفاخانه قرضدار است */
  yellow: "#d97706",
  yellowDark: "#92400e",
  yellowBg: "#fffbeb",

  /* ✅ آبی — اطلاعات عمومی */
  info: "#0284c7",
  infoDark: "#075985",
  infoBg: "#f0f9ff",
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
 *  استایل‌ها
 * ============================================================ */
const styles = {
  page: {
    padding: { xs: "16px 12px", sm: "28px 24px" },
    maxWidth: 1600,
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
    marginBottom: 2,
    borderRadius: "16px",
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.04)",
  },

  quickFilterBar: {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexWrap: "wrap",
    padding: "12px 16px",
    marginBottom: 3,
    borderRadius: "14px",
    background: `linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
  },
  quickFilterLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: 0.6,
    ml: 1,
  },
  quickFilterChip: (active, color = COLORS.primary) => ({
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 700,
    height: 34,
    borderRadius: "10px",
    border: `1.5px solid ${active ? color : COLORS.cardBorder}`,
    background: active ? `${color}15` : "#ffffff",
    color: active ? color : COLORS.textSecondary,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      background: `${color}10`,
      borderColor: color,
      transform: "translateY(-1px)",
    },
    "& .MuiChip-icon": {
      color: active ? color : COLORS.textMuted,
    },
  }),

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

  /* ============================================================
   *  ✅ نمایش هر حساب در یک ردیف
   * ============================================================ */
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
  },

  /* ✅ رنگ نوار کناری بر اساس وضعیت */
  rowCard: (variant = "info") => {
    const palette = {
      red: `linear-gradient(180deg, ${COLORS.red} 0%, #b91c1c 100%)`,
      green: `linear-gradient(180deg, ${COLORS.green} 0%, #047857 100%)`,
      yellow: `linear-gradient(180deg, ${COLORS.yellow} 0%, #b45309 100%)`,
      info: `linear-gradient(180deg, ${COLORS.primary} 0%, #8b5cf6 100%)`,
    };
    const sidebar = palette[variant] ?? palette.info;

    return {
      position: "relative",
      overflow: "hidden",
      padding: "14px 20px",
      borderRadius: "14px",
      background: COLORS.cardBg,
      border: `1px solid ${COLORS.cardBorder}`,
      boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.05)",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "minmax(180px, 1.3fr) minmax(130px, 0.9fr) minmax(130px, 0.9fr) minmax(160px, 1.1fr) minmax(160px, 1.1fr)",
      },
      alignItems: "center",
      gap: { xs: 1.5, sm: 2.5 },
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "6px",
        background: sidebar,
        opacity: 0.95,
        transition: "opacity 0.25s ease",
      },
      "&:hover": {
        borderColor: "#c7d2fe",
        transform: "translateY(-2px)",
        boxShadow: "0 10px 24px -8px rgba(79, 70, 229, 0.16)",
      },
    };
  },

  /* ✅ ستون اول: هویت */
  colIdentity: {
    display: "flex",
    flexDirection: "column",
    gap: 0.5,
    minWidth: 0,
  },
  accountName: {
    fontSize: 15.5,
    fontWeight: 800,
    color: COLORS.textPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    lineHeight: 1.4,
  },
  identityMeta: {
    display: "flex",
    alignItems: "center",
    gap: 0.8,
    flexWrap: "wrap",
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    padding: "3px 9px",
    borderRadius: "7px",
    fontSize: 11,
    fontWeight: 700,
    background: "#f1f5f9",
    color: COLORS.primaryDark,
    border: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  tazkiraChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.4,
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.textSecondary,
    background: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: "6px",
    fontFamily: "monospace",
    direction: "ltr",
    border: "1px solid #e2e8f0",
  },

  /* ✅ ستون‌های آماری */
  colStat: {
    display: "flex",
    flexDirection: "column",
    gap: 0.4,
    padding: "0 4px",
    borderRight: { sm: `1px solid ${COLORS.cardBorder}` },
    paddingRight: { sm: 2 },
  },
  colStatLabel: {
    fontSize: 11.5,
    fontWeight: 700,
    color: COLORS.textSecondary,
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  },
  colStatValue: {
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.textPrimary,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.3,
    letterSpacing: "-0.2px",
  },
  colStatValuePrimary: {
    color: COLORS.primaryDark,
  },
  colStatValueGreen: {
    color: COLORS.greenDark,
  },
  colStatValueRed: {
    color: COLORS.redDark,
  },
  colStatValueYellow: {
    color: COLORS.yellowDark,
  },

  /* ✅ ستون آخر: وضعیت */
  colStatus: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 0.5,
    paddingRight: { sm: 2 },
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.textSecondary,
  },

  /* ✅ بج‌های وضعیت با رنگ‌بندی واضح */
  statusBadge: (variant) => {
    const palette = {
      /* ✅ سرخ — باقی روی مریض */
      red: {
        bg: `linear-gradient(135deg, ${COLORS.redBg} 0%, #fee2e2 100%)`,
        border: "#fca5a5",
        color: COLORS.redDark,
        icon: COLORS.red,
      },
      /* ✅ سبز — تسویه */
      green: {
        bg: `linear-gradient(135deg, ${COLORS.greenBg} 0%, #d1fae5 100%)`,
        border: "#6ee7b7",
        color: COLORS.greenDark,
        icon: COLORS.green,
      },
      /* ✅ زرد — شفاخانه قرضدار است */
      yellow: {
        bg: `linear-gradient(135deg, ${COLORS.yellowBg} 0%, #fef3c7 100%)`,
        border: "#fcd34d",
        color: COLORS.yellowDark,
        icon: COLORS.yellow,
      },
      /* ✅ آبی — اطلاعات عمومی */
      info: {
        bg: `linear-gradient(135deg, ${COLORS.infoBg} 0%, #e0f2fe 100%)`,
        border: "#7dd3fc",
        color: COLORS.infoDark,
        icon: COLORS.info,
      },
    };
    const p = palette[variant] ?? palette.info;

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 0.6,
      padding: "7px 14px",
      borderRadius: "10px",
      fontSize: 13,
      fontWeight: 900,
      background: p.bg,
      border: `1.5px solid ${p.border}`,
      color: p.color,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
      boxShadow: `0 2px 6px -1px ${p.border}40`,
    };
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
  const iconProps = { sx: { fontSize: 13 } };
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
  external_prescription: "نسخه بیرونی",
  prescription_fee: "فیس نسخه",
  sale: "فروش",
  parchase: "خرید",
};
const translateAccountType = (type) => TYPE_MAP[type] || type;

/* ============================================================
 *  فیلترهای سریع
 * ============================================================ */
const QUICK_FILTERS = [
  {
    key: "all",
    label: "همه حساب‌ها",
    icon: <AccountBalanceIcon sx={{ fontSize: 16 }} />,
    color: COLORS.primary,
  },
  {
    key: "top_debtors",
    label: "بیشترین قرض‌دهنده‌ها",
    hint: "کسانی که بیشترین قرض را از شفاخانه دارند",
    icon: <ArrowUpwardIcon sx={{ fontSize: 16 }} />,
    color: COLORS.red,
  },
  {
    key: "top_creditors",
    label: "بیشترین قرض‌داران شفاخانه",
    hint: "حساب‌هایی که شفاخانه از آن‌ها بیشتر قرضدار است",
    icon: <ArrowDownwardIcon sx={{ fontSize: 16 }} />,
    color: COLORS.yellow,
  },
  {
    key: "old_debts",
    label: "قرض‌های طولانی‌مدت",
    hint: "حساب‌هایی که مدتی طولانی است قرض خود را پرداخت نکرده‌اند",
    icon: <HourglassBottomIcon sx={{ fontSize: 16 }} />,
    color: COLORS.red,
  },
];

const OLD_DEBT_DAYS = 30;

/* ============================================================
 *  ✅ محاسبه وضعیت برای هر ردیف
 *  - balance > 0  → red    (باقی روی مریض)
 *  - balance = 0  → green  (تسویه)
 *  - balance < 0  → yellow (شفاخانه قرضدار است)
 * ============================================================ */
const getRowStatus = (item) => {
  const balance = Number(item.balance || 0);

  /* ✅ سرخ — باقی روی مریض */
  if (balance > 0) {
    const daysSince = item.last_journal_date
      ? Math.floor(
          (Date.now() - new Date(item.last_journal_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    if (daysSince !== null && daysSince >= OLD_DEBT_DAYS) {
      return {
        variant: "red",
        label: `بدهی معوق ${daysSince.toLocaleString("fa-IR")} روز`,
        icon: <WarningAmberIcon sx={{ fontSize: 15 }} />,
        hasOldDebt: true,
      };
    }

    if (daysSince !== null && daysSince >= 15) {
      return {
        variant: "red",
        label: `باقی ${daysSince.toLocaleString("fa-IR")} روز`,
        icon: <HourglassBottomIcon sx={{ fontSize: 15 }} />,
        hasOldDebt: false,
      };
    }

    return {
      variant: "red",
      label: "باقی روی مریض",
      icon: <WarningAmberIcon sx={{ fontSize: 15 }} />,
      hasOldDebt: false,
    };
  }

  /* ✅ سبز — تسویه */
  if (balance === 0) {
    return {
      variant: "green",
      label: "تسویه",
      icon: <CheckCircleIcon sx={{ fontSize: 15 }} />,
      hasOldDebt: false,
    };
  }

  /* ✅ زرد — شفاخانه قرضدار است */
  return {
    variant: "yellow",
    label: "شفاخانه قرضدار است",
    icon: <TrendingUpIcon sx={{ fontSize: 15 }} />,
    hasOldDebt: false,
  };
};

/* ============================================================
 *  محتوای اصلی
 * ============================================================ */
function AccountSummaryContent() {
  const { api, user, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
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

  /* ===== فیلترها ===== */
  const filteredData = useMemo(() => {
    let temp = [...data];

    if (filterType) {
      temp = temp.filter((i) => i.account_type === filterType);
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      temp = temp.filter((i) =>
        (i.account_name || "").toLowerCase().includes(term)
      );
    }

    if (quickFilter === "top_debtors") {
      temp = temp
        .filter((i) => Number(i.balance || 0) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance));
    } else if (quickFilter === "top_creditors") {
      temp = temp
        .filter((i) => Number(i.balance || 0) < 0)
        .sort((a, b) => Number(a.balance) - Number(b.balance));
    } else if (quickFilter === "old_debts") {
      temp = temp
        .filter((i) => {
          const status = getRowStatus(i);
          return status.hasOldDebt;
        })
        .sort((a, b) => Number(b.balance) - Number(a.balance));
    } else {
      temp = temp.sort((a, b) => {
        if (a.account_type < b.account_type) return -1;
        if (a.account_type > b.account_type) return 1;
        if (a.account_name < b.account_name) return -1;
        if (a.account_name > b.account_name) return 1;
        return 0;
      });
    }

    return temp;
  }, [search, filterType, data, quickFilter]);

  /* ===== صفحه‌بندی ===== */
  const currentItems = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, quickFilter]);

  /* ===== Loading اولیه ===== */
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
            <MenuItem value="rent">کرایه</MenuItem>
            <MenuItem value="salary">معاش</MenuItem>
            <MenuItem value="expense">مصرف عمومی</MenuItem>
          </Select>
        </FormControl>

        {(search || filterType || quickFilter !== "all") && (
          <Button
            onClick={() => {
              setSearch("");
              setFilterType("");
              setQuickFilter("all");
            }}
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            sx={styles.clearBtn}
          >
            پاک کردن
          </Button>
        )}
      </Box>

      {/* ========== فیلترهای سریع ========== */}
      <Box sx={styles.quickFilterBar}>
        <Typography sx={styles.quickFilterLabel}>
          <WarningAmberIcon sx={{ fontSize: 16 }} />
          فیلترهای ویژه:
        </Typography>

        {QUICK_FILTERS.map((f) => (
          <Chip
            key={f.key}
            icon={f.icon}
            label={f.label}
            title={f.hint}
            onClick={() => setQuickFilter(f.key)}
            sx={styles.quickFilterChip(quickFilter === f.key, f.color)}
          />
        ))}
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

      {/* ========== ردیف‌ها ========== */}
      {!loading && !error && currentItems.length > 0 && (
        <Box sx={styles.cardsList}>
          {currentItems.map((item) => {
            const balance = Number(item.balance || 0);
            const totalCredit = Number(item.total_credit || 0);
            const totalDebit = Number(item.total_debit || 0);
            const key =
              item.account_key || `${item.account_type}_${item.account_id}`;
            const status = getRowStatus(item);

            /* ✅ رنگ باقی‌مانده بر اساس وضعیت */
            let balanceColorSx;
            if (balance > 0) {
              /* ✅ سرخ — باقی روی مریض */
              balanceColorSx = {
                ...styles.colStatValue,
                ...styles.colStatValueRed,
              };
            } else if (balance < 0) {
              /* ✅ زرد — شفاخانه قرضدار است */
              balanceColorSx = {
                ...styles.colStatValue,
                ...styles.colStatValueYellow,
              };
            } else {
              /* ✅ سبز — تسویه */
              balanceColorSx = {
                ...styles.colStatValue,
                ...styles.colStatValueGreen,
              };
            }

            return (
              <Box key={key} sx={styles.rowCard(status.variant)}>
                {/* ========== ستون ۱: هویت ========== */}
                <Box sx={styles.colIdentity}>
                  <Typography
                    sx={styles.accountName}
                    title={item.account_name}
                  >
                    {item.account_name || "—"}
                  </Typography>

                  <Box sx={styles.identityMeta}>
                    <Box sx={styles.typeBadge}>
                      {getTypeIcon(item.account_type)}
                      {translateAccountType(item.account_type)}
                    </Box>

                    {item.tazkira_number && (
                      <Box sx={styles.tazkiraChip}>
                        <BadgeIcon sx={{ fontSize: 12 }} />
                        {item.tazkira_number}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* ========== ستون ۲: مجموع حساب ========== */}
                <Box sx={styles.colStat}>
                  <Typography sx={styles.colStatLabel}>
                    <ReceiptLongIcon sx={{ fontSize: 13 }} />
                    مجموع حساب
                  </Typography>
                  <Typography
                    sx={{
                      ...styles.colStatValue,
                      ...styles.colStatValuePrimary,
                    }}
                  >
                    {totalCredit.toLocaleString("fa-IR")}
                  </Typography>
                </Box>

                {/* ========== ستون ۳: پرداخت شده ========== */}
                <Box sx={styles.colStat}>
                  <Typography sx={styles.colStatLabel}>
                    <PaymentsIcon sx={{ fontSize: 13 }} />
                    پرداخت شده
                  </Typography>
                  <Typography
                    sx={{
                      ...styles.colStatValue,
                      ...styles.colStatValueGreen,
                    }}
                  >
                    {totalDebit.toLocaleString("fa-IR")}
                  </Typography>
                </Box>

                {/* ========== ستون ۴: باقی‌مانده ========== */}
                <Box sx={styles.colStat}>
                  <Typography sx={styles.colStatLabel}>
                    <AccountBalanceWalletIcon sx={{ fontSize: 13 }} />
                    باقی‌مانده
                  </Typography>
                  <Typography sx={balanceColorSx}>
                    {balance > 0 ? "+" : balance < 0 ? "−" : ""}
                    {Math.abs(balance).toLocaleString("fa-IR")}
                  </Typography>
                </Box>

                {/* ========== ستون ۵: وضعیت ========== */}
                <Box sx={styles.colStatus}>
                  <Typography sx={styles.statusLabel}>وضعیت</Typography>
                  <Box sx={styles.statusBadge(status.variant)}>
                    {status.icon}
                    {status.label}
                  </Box>
                </Box>
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
 *  export اصلی
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