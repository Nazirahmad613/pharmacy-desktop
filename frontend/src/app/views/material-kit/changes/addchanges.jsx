import { useState, useEffect, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import MainLayoutjur from "../../../../components/MainLayoutjur";

/* ✅ DatePicker فارسی افغانی */
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";

/* ============================================================
 *  ✅ تبدیل ایمن هر مقدار به رشته
 * ============================================================ */
const safeStr = (v, fallback = "-") => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    return (
      v.name ?? v.full_name ?? v.account_name ?? v.patient_name ?? v.title ?? fallback
    );
  }
  return fallback;
};

/* ============================================================ 
 *  ✅ Locale سفارشی افغانستان
 * ============================================================ */
const afghanistanLocale = {
  ...persian_fa,
  name: "afghanistan",
  months: [
    ["حمل", "حمل"], ["ثور", "ثور"], ["جوزا", "جوزا"], ["سرطان", "سرطان"],
    ["اسد", "اسد"], ["سنبله", "سنبله"], ["میزان", "میزان"], ["عقرب", "عقرب"],
    ["قوس", "قوس"], ["جدی", "جدی"], ["دلو", "دلو"], ["حوت", "حوت"],
  ],
  weekDays: [
    ["شنبه", "ش"], ["یکشنبه", "ی"], ["دوشنبه", "د"],
    ["سه‌شنبه", "س"], ["چهارشنبه", "چ"], ["پنجشنبه", "پ"], ["جمعه", "ج"],
  ],
  digits: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  meridiems: [["قبل از ظهر", "ق.ظ"], ["بعد از ظهر", "ب.ظ"]],
};

/* ============================================================ 
 *  ثابت‌ها
 * ============================================================ */
const ENTRY_TYPE_FA = { debit: "اخذ پول", credit: "پرداخت پول" };

const REF_TYPE_FA = {
  patient: "مریض", doctor: "داکتر", nurse: "نرس", receptionist: "منشی",
  accountant: "محاسب", pharmacist: "دواساز", laboratorist: "لابراتوار",
  radiologist: "رادیولوژیست", staff: "کارمند", visitor: "مراجع",
  customer: "مشتری", supplier: "تأمین‌کننده", company: "شرکت",
  vendor: "فروشنده", drug_company: "شرکت دوا", rent: "کرایه",
  electricity: "برق", water: "آب", internet: "انترنت", salary: "معاش",
  fuel: "سوخت", maintenance: "ترمیمات", transport: "ترانسپورت",
  consultation: "مشاوره", laboratory: "لابراتوار", expense: "مصرف عمومی",
  income: "درآمد", other: "سایر", sale: "فروش", parchase: "خرید",
  prescription_fee: "فیس نسخه", external_prescription: "نسخه بیرونی",
  pharmacy_fee: "فیس دواخانه", laboratory_fee: "فیس لابراتوار",
  radiology_fee: "فیس رادیولوژی", operation_fee: "فیس عملیات",
  admission_fee: "فیس بستری", registration_fee: "فیس مراجعه",
  consultation_fee: "فیس مشاوره",
  customer_account: "مشتری (حساب)", corporate_customer: "مشتری شرکتی",
  insurance_company: "شرکت بیمه", supplier_account: "تأمین‌کننده (حساب)",
  medicine_supplier: "تأمین‌کننده ادویه", equipment_supplier: "تأمین‌کننده تجهیزات",
  laboratory_material_supplier: "تأمین‌کننده مواد لابراتوار",
  consumable_material_supplier: "تأمین‌کننده مواد مصرفی",
  customer_income: "درآمد از مشتریان", account: "حساب (همه حساب‌ها)",
};

const SALARY_REF_META = {
  salary_generation:    { label: "تولید معاش (هزینه)",       kindLabel: "یوزر" },
  salary_payable:       { label: "معاش قابل پرداخت",          kindLabel: "یوزر" },
  salary_payment:       { label: "پرداخت معاش (صندوق/بانک)",  kindLabel: "یوزر" },
  salary_payment_debit: { label: "تسویه معاش",                kindLabel: "یوزر" },
  salary_advance:       { label: "پیش‌پرداخت معاش",            kindLabel: "حساب" },
  salary_advance_debit: { label: "ثبت پیش‌پرداخت",             kindLabel: "حساب" },
};

const isSalaryRefType = (t) => Object.prototype.hasOwnProperty.call(SALARY_REF_META, t);

const NO_REF_TYPES = [
  "rent", "electricity", "water", "internet", "salary",
  "fuel", "maintenance", "transport", "expense", "income", "other",
];

const ACCOUNT_REF_TYPES = [
  "customer_account", "corporate_customer", "insurance_company",
  "supplier_account", "medicine_supplier", "equipment_supplier",
  "laboratory_material_supplier", "consumable_material_supplier",
  "customer_income", "account",
];

const ACCOUNT_CATEGORY_PREFIX = "account:";
const USER_ROLE_PREFIX = "user_role:";

const isDynamicAccountRef = (refType) =>
  typeof refType === "string" &&
  refType.startsWith(ACCOUNT_CATEGORY_PREFIX) &&
  refType.length > ACCOUNT_CATEGORY_PREFIX.length;

const isDynamicUserRoleRef = (refType) =>
  typeof refType === "string" &&
  refType.startsWith(USER_ROLE_PREFIX) &&
  refType.length > USER_ROLE_PREFIX.length;

const isAccountRefType = (refType) =>
  ACCOUNT_REF_TYPES.includes(refType) || isDynamicAccountRef(refType);

const isUserOrAccountRefType = (refType) =>
  isAccountRefType(refType) || isDynamicUserRoleRef(refType);

const needsRefId = (refType) => {
  if (!refType) return false;
  return !NO_REF_TYPES.includes(refType);
};

const needsManualAmount = (entryType, refType) => {
  if (entryType === "credit") return true;
  if (NO_REF_TYPES.includes(refType)) return true;
  if (isDynamicUserRoleRef(refType)) return true;
  if (isAccountRefType(refType)) return false;
  return false;
};

const resolveSourceColumnLabel = (row) => {
  if (!row) return "-";
  if (isDynamicUserRoleRef(row.source_type)) return "یوزر";
  if (isSalaryRefType(row.source_type)) {
    if (row.source_kind === "user") return "یوزر";
    if (row.source_kind === "account") return "حساب";
    const meta = SALARY_REF_META[row.source_type];
    if (meta) return meta.kindLabel;
  }
  if (isAccountRefType(row.source_type)) return "حساب";
  return REF_TYPE_FA[row.source_type] || safeStr(row.source_type);
};

const resolveSourceTypeLabel = (row) => {
  if (!row) return "-";
  if (row.source_type_label) return safeStr(row.source_type_label);
  if (isAccountRefType(row.source_type)) {
    if (row.accountCategoryLabel) return safeStr(row.accountCategoryLabel);
    return "حساب";
  }
  return REF_TYPE_FA[row.source_type] || safeStr(row.source_type);
};

const resolveSourceName = (j) => {
  if (!j) return "-";
  const primary = safeStr(j.source_name || j.full_name || j.display_name, "");
  if (primary && primary !== "-") return primary;

  if (isSalaryRefType(j.ref_type) && j.description) {
    const m = String(j.description).match(
      /(?:معاش|پیش‌پرداخت|معاش قابل پرداخت|تولید معاش)\s*-\s*([^\-()]+)/u
    );
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }

  if (j.description) {
    const d = String(j.description);
    const m =
      d.match(/بیمار\s*:\s*([^\-()]+)/u) ||
      d.match(/مریض\s*:\s*([^\-()]+)/u);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return "-";
};

const ACCOUNT_REF_GROUPS = [
  { label: "🏦 همه حساب‌ها", options: [{ value: "account", label: "همه حساب‌ها (انتخاب آزاد)" }] },
  {
    label: "👥 مشتریان و مطالبات",
    options: [
      { value: "customer_account", label: "مشتری" },
      { value: "corporate_customer", label: "مشتری شرکتی" },
      { value: "insurance_company", label: "شرکت بیمه" },
    ],
  },
  {
    label: "📦 تأمین‌کنندگان و بدهی‌ها",
    options: [
      { value: "supplier_account", label: "تأمین‌کننده" },
      { value: "medicine_supplier", label: "تأمین‌کننده ادویه" },
      { value: "equipment_supplier", label: "تأمین‌کننده تجهیزات" },
      { value: "laboratory_material_supplier", label: "تأمین‌کننده مواد لابراتوار" },
      { value: "consumable_material_supplier", label: "تأمین‌کننده مواد مصرفی" },
    ],
  },
  { label: "💰 درآمدها", options: [{ value: "customer_income", label: "درآمد از مشتریان" }] },
];

const REF_TYPE_GROUPS = [
  {
    label: "اشخاص",
    options: [
      { value: "patient", label: "مریض" },
      { value: "doctor", label: "داکتر" },
      { value: "nurse", label: "نرس" },
      { value: "staff", label: "کارمند" },
      { value: "receptionist", label: "منشی" },
      { value: "accountant", label: "محاسب" },
      { value: "pharmacist", label: "دواساز" },
      { value: "laboratorist", label: "لابراتوار" },
      { value: "radiologist", label: "رادیولوژیست" },
    ],
  },
  {
    label: "طرف‌های حساب",
    options: [
      { value: "supplier", label: "تأمین‌کننده" },
      { value: "customer", label: "مشتری" },
      { value: "company", label: "شرکت" },
      { value: "vendor", label: "فروشنده" },
      { value: "drug_company", label: "شرکت دوا" },
    ],
  },
  {
    label: "فروش و خرید",
    options: [
      { value: "sale", label: "فروش" },
      { value: "parchase", label: "خرید" },
    ],
  },
  {
    label: "فیس‌ها",
    options: [
      { value: "external_prescription", label: "نسخه بیرونی (دواخانه)" },
      { value: "prescription_fee", label: "فیس نسخه داخلی" },
      { value: "pharmacy_fee", label: "فیس دواخانه" },
      { value: "laboratory_fee", label: "فیس لابراتوار" },
      { value: "radiology_fee", label: "فیس رادیولوژی" },
      { value: "operation_fee", label: "فیس عملیات" },
      { value: "admission_fee", label: "فیس بستری" },
      { value: "registration_fee", label: "فیس مراجعه" },
      { value: "consultation_fee", label: "فیس مشاوره" },
    ],
  },
  {
    label: "مصارف",
    options: [
      { value: "rent", label: "کرایه" },
      { value: "electricity", label: "برق" },
      { value: "water", label: "آب" },
      { value: "internet", label: "انترنت" },
      { value: "salary", label: "معاش" },
      { value: "fuel", label: "سوخت" },
      { value: "maintenance", label: "ترمیمات" },
      { value: "transport", label: "ترانسپورت" },
      { value: "consultation", label: "مشاوره" },
      { value: "laboratory", label: "لابراتوار" },
    ],
  },
  {
    label: "دیگر",
    options: [
      { value: "expense", label: "مصرف عمومی" },
      { value: "income", label: "درآمد" },
      { value: "other", label: "سایر" },
    ],
  },
];

const EMPTY_FORM = {
  journal_date: "",
  description: "",
  entry_type: "debit",
  amount: "",
  ref_type: "",
  ref_id: "",
  tazkira_number: "",
  reg_id: "",
};

const ROWS_PER_PAGE = 10;

const inputClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 w-full text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 placeholder:text-slate-500";

const datePickerInputClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 w-full text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 placeholder:text-slate-500 h-[38px]";

const datePickerFilterClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 h-[38px] w-[150px]";

const btnStyle = {
  edit: {
    background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
    color: "#111827", padding: "5px 12px", borderRadius: "6px", border: "none",
    cursor: "pointer", fontSize: "12px", fontWeight: "700", marginLeft: "5px",
    boxShadow: "0 2px 5px rgba(234,179,8,0.25)", transition: "all 0.15s",
  },
  print: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff", padding: "5px 12px", borderRadius: "6px", border: "none",
    cursor: "pointer", fontSize: "12px", fontWeight: "700",
    boxShadow: "0 2px 5px rgba(16,185,129,0.25)", transition: "all 0.15s",
  },
  cancel: {
    background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    color: "white", padding: "10px 20px", borderRadius: "10px", border: "none",
    cursor: "pointer", flex: "0.5", fontWeight: "600",
    boxShadow: "0 2px 8px rgba(100,116,139,0.3)", transition: "all 0.15s",
  },
};

/* ============================================================
 *  ✅ تبدیل DateObject فارسی → رشته شمسی "YYYY/MM/DD"
 * ============================================================ */
const dateObjectToShamsi = (dateObj) => {
  if (!dateObj) return "";
  try {
    if (dateObj instanceof DateObject) {
      const year = dateObj.year;
      const month = typeof dateObj.month === "object" ? dateObj.month.number : dateObj.month;
      const day = dateObj.day;

      const result = `${String(year).padStart(4, "0")}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
      console.log("[dateObjectToShamsi]", { year, month, day, result });
      return result;
    }

    if (typeof dateObj === "string") {
      if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(dateObj)) {
        const parts = dateObj.substring(0, 10).split(/[\/\-]/);
        return `${parts[0].padStart(4, "0")}/${parts[1].padStart(2, "0")}/${parts[2].padStart(2, "0")}`;
      }
    }

    if (dateObj instanceof Date) {
      const dObj = new DateObject({ date: dateObj, calendar: persian, locale: afghanistanLocale });
      return dateObjectToShamsi(dObj);
    }
    return "";
  } catch (e) {
    console.error("dateObjectToShamsi error:", e);
    return "";
  }
};

/* ============================================================
 *  ✅ تبدیل رشته شمسی "YYYY/MM/DD" → DateObject فارسی
 * ============================================================ */
const shamsiToDateObject = (shamsi) => {
  if (!shamsi) return "";
  try {
    if (typeof shamsi === "string" && /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(shamsi)) {
      const parts = shamsi.substring(0, 10).split(/[\/\-]/);
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);

      return new DateObject({ year, month, day, calendar: persian, locale: afghanistanLocale });
    }
    if (shamsi instanceof DateObject) return shamsi;
    return "";
  } catch (e) {
    console.error("shamsiToDateObject error:", e);
    return "";
  }
};

/* ============================================================
 *  ✅ نرمال‌سازی هر تاریخ به رشته شمسی "YYYY/MM/DD"
 *  (اگر میلادی بود → به شمسی، اگر شمسی بود → همان)
 * ============================================================ */
const ensureShamsiDisplay = (dateValue) => {
  if (!dateValue) return "-";
  const raw = String(dateValue).trim();
  if (!raw) return "-";

  let datePart = raw;
  if (datePart.includes("T")) datePart = datePart.split("T")[0];
  if (datePart.includes(" ")) datePart = datePart.split(" ")[0];
  datePart = datePart.replace(/-/g, "/");

  const m = datePart.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return raw;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  if (year >= 1900) {
    try {
      const gDate = new DateObject({ year, month, day, calendar: gregorian });
      const shamsiDate = gDate.convert(persian, afghanistanLocale);

      const sy = shamsiDate.year;
      const sm = typeof shamsiDate.month === "object" ? shamsiDate.month.number : shamsiDate.month;
      const sd = shamsiDate.day;

      return `${String(sy).padStart(4, "0")}/${String(sm).padStart(2, "0")}/${String(sd).padStart(2, "0")}`;
    } catch (e) {
      console.error("ensureShamsiDisplay convert error:", e);
      return datePart;
    }
  }

  return `${String(year).padStart(4, "0")}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
};

/* ============================================================
 *  ✅ مقایسه‌ی تاریخ شمسی YYYY/MM/DD (رشته‌ای = تاریخی)
 * ============================================================ */
const shamsiCompare = (a, b) => {
  const sa = String(a || "").padStart(10, "0");
  const sb = String(b || "").padStart(10, "0");
  return sa.localeCompare(sb);
};

/* ============================================================
 *  ✅ بررسی اینکه آیا یک ردیف در بازه‌ی تاریخ انتخاب‌شده است
 * ============================================================ */
const isRowInDateRange = (rawDate, fromDate, toDate) => {
  if (!rawDate || rawDate === "-") return !fromDate && !toDate;
  const d = rawDate; // rawDate خودش شمسی نرمال‌شده است
  if (fromDate && shamsiCompare(d, fromDate) < 0) return false;
  if (toDate && shamsiCompare(d, toDate) > 0) return false;
  return true;
};

const buildRefSourceGroups = (sources) => {
  if (!Array.isArray(sources) || sources.length === 0) return [];
  const hasGroupInfo = sources.some((s) => s.group_type || s.group_category);
  if (!hasGroupInfo) return [{ label: null, items: sources }];

  const map = new Map();
  for (const s of sources) {
    const key = `${s.group_type || "other"}::${s.group_category || "other"}`;
    if (!map.has(key)) {
      map.set(key, {
        type: s.group_type || "other",
        typeLabel: s.group_type_label || "سایر",
        category: s.group_category || "other",
        categoryLabel: s.category_label || s.group_category || "سایر",
        items: [],
      });
    }
    map.get(key).items.push(s);
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return (a.categoryLabel || "").localeCompare(b.categoryLabel || "");
  });

  return groups.map((g) => ({
    label: `${g.typeLabel} • ${g.categoryLabel}`,
    items: g.items,
  }));
};

const getRowColor = (sourceType) => {
  if (typeof sourceType === "string" && sourceType.startsWith(ACCOUNT_CATEGORY_PREFIX)) return "#2d3748";
  if (typeof sourceType === "string" && sourceType.startsWith(USER_ROLE_PREFIX)) return "#374151";

  switch (sourceType) {
    case "sale": return "#1a4a70";
    case "parchase": return "#701a1a";
    case "patient": return "#1a701a";
    case "external_prescription": return "#6b3fa0";
    case "prescription_fee": return "#1a701a";
    case "customer_account": return "#0d5c4a";
    case "corporate_customer": return "#0d5c4a";
    case "insurance_company": return "#0d5c4a";
    case "supplier_account": return "#5c0d3a";
    case "medicine_supplier": return "#5c0d3a";
    case "equipment_supplier": return "#5c0d3a";
    case "laboratory_material_supplier": return "#5c0d3a";
    case "consumable_material_supplier": return "#5c0d3a";
    case "customer_income": return "#0d4a5c";
    case "account": return "#2d3748";
    default: return "#1a1a1a";
  }
};

/* ============================================================
 *  کامپوننت اصلی
 * ============================================================ */
export default function JournalPage() {
  const { api } = useAuth();

  const [journals, setJournals] = useState([]);
  const [refSources, setRefSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [dynamicAccountGroups, setDynamicAccountGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [userRoleGroups, setUserRoleGroups] = useState([]);
  const [loadingUserRoleGroups, setLoadingUserRoleGroups] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const refIdRequired = needsRefId(form.ref_type);
  const manualAmount = needsManualAmount(form.entry_type, form.ref_type);
  const isAccountSource = isAccountRefType(form.ref_type);
  const isUserRoleSource = isDynamicUserRoleRef(form.ref_type);

  /* ============================================================
   *  ✅ دریافت ژورنال‌ها — بدون فیلتر تاریخ در بک‌اند
   *  (فیلتر تاریخ در فرانت‌اند با دقت بیشتری اعمال می‌شود)
   * ============================================================ */
  const fetchJournals = useCallback(async () => {
    try {
      const res = await api.get("/journals", {
        params: {
          type: filterType || undefined,
          /* ⚠️ تاریخ را به بک‌اند نمی‌فرستیم تا مسئله‌ی تبدیل شمسی/میلادی پیش نیاید */
        },
      });

      const data = res.data ?? [];
      setJournals(Array.isArray(data) ? [...data].reverse() : []);
      setCurrentPage(1);
    } catch (err) {
      console.error("fetchJournals error:", err);
      toast.error("خطا در دریافت ژورنال‌ها");
    }
  }, [api, filterType]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  useEffect(() => {
    let isMounted = true;
    const loadGroups = async () => {
      setLoadingGroups(true);
      try {
        const res = await api.get("/journals/account-ref-groups");
        if (!isMounted) return;
        if (res.data?.success) setDynamicAccountGroups(res.data.data || []);
      } catch (err) {
        if (!isMounted) return;
        console.error("fetch account ref groups failed:", err);
      } finally {
        if (isMounted) setLoadingGroups(false);
      }
    };
    loadGroups();
    return () => { isMounted = false; };
  }, [api]);

  useEffect(() => {
    let isMounted = true;
    const loadUserRoleGroups = async () => {
      setLoadingUserRoleGroups(true);
      try {
        const res = await api.get("/journals/user-role-groups");
        if (!isMounted) return;
        if (res.data?.success) setUserRoleGroups(res.data.data || []);
      } catch (err) {
        if (!isMounted) return;
        console.error("fetch user role groups failed:", err);
      } finally {
        if (isMounted) setLoadingUserRoleGroups(false);
      }
    };
    loadUserRoleGroups();
    return () => { isMounted = false; };
  }, [api]);

  useEffect(() => {
    let isMounted = true;
    const loadSources = async () => {
      if (!form.ref_type || !needsRefId(form.ref_type)) {
        setRefSources([]);
        return;
      }
      setLoadingSources(true);
      try {
        const res = await api.get("/journals/ref-sources-dynamic", {
          params: { type: form.ref_type, limit: 500 },
        });
        if (!isMounted) return;
        const list = res.data?.data ?? [];
        setRefSources(Array.isArray(list) ? list : []);

        if (
          (isAccountRefType(form.ref_type) || isDynamicUserRoleRef(form.ref_type)) &&
          (!list || list.length === 0)
        ) {
          let label = REF_TYPE_FA[form.ref_type];
          if (!label) {
            if (isDynamicAccountRef(form.ref_type)) {
              label = form.ref_type.replace(ACCOUNT_CATEGORY_PREFIX, "");
            } else if (isDynamicUserRoleRef(form.ref_type)) {
              label = form.ref_type.replace(USER_ROLE_PREFIX, "");
            } else {
              label = form.ref_type;
            }
          }
          toast.warning(
            `هیچ منبعی برای «${label}» یافت نشد. لطفاً ابتدا حساب/کاربر مناسب ایجاد کنید.`
          );
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("خطا در دریافت منابع:", err);
        toast.error(err.response?.data?.message || "خطا در دریافت لیست منابع");
        setRefSources([]);
      } finally {
        if (isMounted) setLoadingSources(false);
      }
    };
    loadSources();
    return () => { isMounted = false; };
  }, [api, form.ref_type]);

  const refSourceGroups = useMemo(() => buildRefSourceGroups(refSources), [refSources]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "entry_type" || name === "ref_type") {
        updated.ref_id = "";
        updated.reg_id = "";
        updated.tazkira_number = "";
      }

      if (name === "ref_id") {
        const found = refSources.find((r) => String(r.id) === String(value));
        if (found) {
          updated.reg_id = found.reg_id ?? "";
          if (found.national_id) updated.tazkira_number = safeStr(found.national_id, "");
          const foundName = safeStr(found.name, "");

          if (form.entry_type === "debit") {
            if (form.ref_type === "external_prescription") {
              if (foundName) updated.description = `فیس نسخه بیرونی - ${foundName}`;
              if (found.total_amount !== undefined) {
                const total = Number(found.total_amount || 0);
                const discount = Number(found.discount || 0);
                const paid = Number(found.paid_amount || 0);
                const remaining = Math.max(0, total - discount - paid);
                updated.amount = remaining > 0 ? remaining : total - discount;
              }
            } else {
              if (!updated.description && foundName) updated.description = foundName;
              if (!updated.amount && found.total_amount) updated.amount = found.total_amount;
            }
          } else {
            if (!updated.description && foundName) updated.description = foundName;
          }
        }
      }
      return updated;
    });
  };

  const handleJournalDateChange = (dateObj) => {
    const shamsi = dateObjectToShamsi(dateObj);
    console.log("[handleJournalDateChange] selected:", dateObj, "→ shamsi:", shamsi);
    setForm((prev) => ({ ...prev, journal_date: shamsi }));
  };

  const handleFromDateChange = (dateObj) => {
    setFromDate(dateObjectToShamsi(dateObj));
  };

  const handleToDateChange = (dateObj) => {
    setToDate(dateObjectToShamsi(dateObj));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.journal_date) return toast.error("تاریخ ژورنال الزامی است");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("مبلغ باید بزرگتر از صفر باشد");
    if (!form.ref_type) return toast.error("نوع منبع الزامی است");
    if (needsRefId(form.ref_type) && !form.ref_id) return toast.error("نام منبع الزامی است");

    try {
      const url = editingId ? `/journals/upsert/${editingId}` : "/journals/upsert";

      const payload = {
        ...form,
        amount: Number(form.amount),
        ref_id: form.ref_id ? Number(form.ref_id) : 0,
        reg_id: form.reg_id ? Number(form.reg_id) : null,
        account_id: isAccountRefType(form.ref_type) && form.ref_id
            ? Number(form.ref_id)
            : undefined,
      };

      console.log("[handleSubmit] payload:", payload);
      console.log("[handleSubmit] journal_date (shamsi) being sent:", payload.journal_date);

      await api.post(url, payload);
      toast.success(editingId ? "✅ ژورنال بروز رسانی شد" : "✅ ژورنال ذخیره شد");

      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchJournals();
    } catch (err) {
      console.error("handleSubmit error:", err);
      toast.error(err.response?.data?.message || "خطا در ذخیره");
    }
  };

  const handleEdit = (id) => {
    const journal = journals.find((j) => j.id === id);
    if (!journal) return;

    let resolvedRefId = "";
    if (isDynamicUserRoleRef(journal.ref_type)) {
      resolvedRefId = journal.ref_id ?? "";
    } else if (isAccountRefType(journal.ref_type)) {
      resolvedRefId = journal.account_id ?? journal.ref_id ?? "";
    } else {
      resolvedRefId = journal.ref_id ?? "";
    }

    const shamsiDate = ensureShamsiDisplay(journal.journal_date);

    console.log("[handleEdit] journal:", {
      id: journal.id,
      journal_date_raw: journal.journal_date,
      journal_date_shamsi: shamsiDate,
      ref_type: journal.ref_type,
    });

    setForm({
      journal_date: shamsiDate === "-" ? "" : shamsiDate,
      description: safeStr(journal.description, ""),
      entry_type: journal.entry_type ?? "debit",
      amount: journal.amount ?? journal.total_amount ?? "",
      ref_type: journal.ref_type ?? "",
      ref_id: resolvedRefId,
      tazkira_number: safeStr(journal.tazkira_number, ""),
      reg_id: journal.reg_id ?? "",
    });

    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = (row) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html dir="rtl">
        <head><title>ژورنال شماره ${safeStr(row.id)}</title>
          <style>body { font-family: Tahoma, sans-serif; padding: 20px; } h3 { text-align: center; } p { margin: 8px 0; }</style>
        </head>
        <body>
          <h3>ژورنال شماره ${safeStr(row.id)}</h3>
          <p>تاریخ: ${safeStr(row.date)}</p>
          <p>نوع: ${ENTRY_TYPE_FA[row.entry_type] || "-"}</p>
          <p>توضیحات: ${safeStr(row.description)}</p>
          <p>مبلغ کل: ${safeStr(row.amount)}</p>
          <p>پرداخت شده: ${safeStr(row.paid)}</p>
          <p>باقی‌مانده: ${safeStr(row.remaining)}</p>
          <p>منبع: ${safeStr(row.source_label)}</p>
          <p>نوعیت منبع: ${safeStr(row.source_type_label)}</p>
          <p>نام منبع: ${safeStr(row.source_name)}</p>
          <p>شماره تذکره: ${safeStr(row.tazkira_number)}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintSearchResults = () => {
    const rows = filteredRows;
    if (!rows.length) {
      toast.warning("هیچ سابقه‌ای برای پرینت وجود ندارد");
      return;
    }

    const totalDebit = rows
      .filter((r) => r.entry_type === "debit")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCredit = rows
      .filter((r) => r.entry_type === "credit")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const net = totalDebit - totalCredit;

    const filterText = [
      filterType ? `نوع: ${ENTRY_TYPE_FA[filterType] || filterType}` : null,
      fromDate ? `از تاریخ: ${fromDate}` : null,
      toDate ? `تا تاریخ: ${toDate}` : null,
      searchTerm ? `جستجو: ${searchTerm}` : null,
    ].filter(Boolean).join(" — ") || "همه سوابق";

    const tableRows = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${safeStr(r.date)}</td>
        <td>${ENTRY_TYPE_FA[r.entry_type] || "-"}</td>
        <td>${safeStr(r.description)}</td>
        <td>${Number(r.amount || 0).toLocaleString("fa-IR")}</td>
        <td>${Number(r.paid || 0).toLocaleString("fa-IR")}</td>
        <td>${Number(r.remaining || 0).toLocaleString("fa-IR")}</td>
        <td>${safeStr(r.source_label)}</td>
        <td>${safeStr(r.source_type_label)}</td>
        <td>${safeStr(r.source_name)}</td>
        <td>${safeStr(r.tazkira_number)}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>سوابق مالی — ${rows.length} ردیف</title>
          <style>
            body { font-family: Tahoma, sans-serif; padding: 15px; font-size: 11px; }
            h2 { text-align: center; margin: 0 0 5px; }
            .meta { text-align: center; font-size: 11px; color: #444; margin-bottom: 10px; }
            .totals {
              display: flex; justify-content: space-around;
              border: 1px solid #999; border-radius: 6px;
              padding: 8px; margin-bottom: 12px;
              background: #f5f5f5;
            }
            .totals div { text-align: center; }
            .totals div span { display: block; font-size: 12px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: right; }
            th { background: #e0e0e0; font-size: 11px; }
            td { font-size: 10.5px; }
            .debit { color: #166534; font-weight: bold; }
            .credit { color: #b91c1c; font-weight: bold; }
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <h2>گزارش سوابق مالی ژورنال</h2>
          <div class="meta">${filterText} — تعداد ردیف: ${rows.length.toLocaleString("fa-IR")} — تاریخ چاپ: ${new Date().toLocaleString("fa-IR")}</div>

          <div class="totals">
            <div>مجموع اخذ پول<span class="debit">${totalDebit.toLocaleString("fa-IR")} ؋</span></div>
            <div>مجموع پرداخت پول<span class="credit">${totalCredit.toLocaleString("fa-IR")} ؋</span></div>
            <div>مانده خالص<span>${net.toLocaleString("fa-IR")} ؋</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th><th>تاریخ</th><th>نوع</th><th>توضیحات</th>
                <th>مبلغ کل</th><th>پرداخت شده</th><th>باقی‌مانده</th>
                <th>منبع</th><th>نوعیت منبع</th><th>نام منبع</th><th>تذکره</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  /* ============================================================
   *  ✅ combinedRows — تمام ردیف‌ها (بدون فیلتر تاریخ)
   * ============================================================ */
  const combinedRows = useMemo(() => {
    if (!journals.length) return [];
    return journals
      .map((j) => {
        const amount = Number(j.total_amount ?? j.amount ?? 0);
        let paid = Number(j.paid_amount ?? amount);
        let remaining = Number(j.due_amount ?? 0);

        if (j.paid_amount !== null && j.paid_amount !== undefined) paid = Number(j.paid_amount);
        if (j.due_amount !== null && j.due_amount !== undefined) remaining = Number(j.due_amount);

        let description = safeStr(j.description);

        if (j.ref_type === "sale") description = `فروش شماره ${safeStr(j.ref_id)}`;
        else if (j.ref_type === "parchase") description = `خرید شماره ${safeStr(j.ref_id)}`;
        else if (j.ref_type === "external_prescription") {
          const patientName = safeStr(j.source_name || j.full_name || j.display_name, "");
          description = patientName ? `فیس نسخه بیرونی - ${patientName}` : `نسخه بیرونی #${safeStr(j.ref_id)}`;
        } else if (
          j.ref_type === "patient" &&
          typeof description === "string" &&
          description.includes("نسخه شماره")
        ) {
          const match = description.match(/نسخه شماره (\d+)/);
          const presNum = match ? match[1] : j.ref_id;
          description = `نسخه شماره ${safeStr(presNum)}`;
          remaining = 0;
          paid = amount;
        }

        const sourceLabel = resolveSourceColumnLabel({ source_type: j.ref_type, source_kind: j.source_kind });
        const sourceTypeLabel = resolveSourceTypeLabel({
          source_type: j.ref_type,
          source_type_label: j.source_type_label,
          accountCategoryLabel: j.source_account_category_label,
        });
        const sourceName = resolveSourceName(j);

        /* ✅ همه‌ی تاریخ‌ها به شمسی YYYY/MM/DD نرمال می‌شوند */
        const shamsiDate = ensureShamsiDisplay(j.journal_date);

        return {
          id: j.id,
          raw_date: shamsiDate,
          date: shamsiDate,
          entry_type: j.entry_type,
          description: safeStr(description),
          amount, paid, remaining,
          source_type: safeStr(j.ref_type),
          source_label: sourceLabel,
          source_type_label: sourceTypeLabel,
          source_name: sourceName,
          tazkira_number: safeStr(j.tazkira_number),
          reg_id: j.reg_id ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.raw_date || a.raw_date === "-") return 1;
        if (!b.raw_date || b.raw_date === "-") return -1;
        return b.raw_date.localeCompare(a.raw_date);
      });
  }, [journals]);

  /* ============================================================
   *  ✅ filteredRows — فیلتر نوع + تاریخ + جستجو (همه در فرانت‌اند)
   * ============================================================ */
  const filteredRows = useMemo(() => {
    let rows = combinedRows;

    /* ۱) فیلتر نوع (debit/credit) */
    if (filterType && filterType !== "all") {
      rows = rows.filter((r) => r.entry_type === filterType);
    }

    /* ۲) فیلتر تاریخ — با مقایسه‌ی رشته‌ی شمسی */
    if (fromDate || toDate) {
      rows = rows.filter((r) => isRowInDateRange(r.raw_date, fromDate, toDate));
    }

    /* ۳) جستجو در نام/توضیحات/تذکره/نوعیت */
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      rows = rows.filter(
        (row) =>
          row.source_name?.toLowerCase().includes(term) ||
          row.description?.toLowerCase().includes(term) ||
          row.tazkira_number?.toLowerCase().includes(term) ||
          row.source_type_label?.toLowerCase().includes(term)
      );
    }

    return rows;
  }, [combinedRows, filterType, fromDate, toDate, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE) || 1;
  const currentRows = filteredRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, fromDate, toDate]);

  return (
    <MainLayoutjur>
      <ToastContainer
        position="top-right" autoClose={3000} rtl={true} theme="colored" limit={5}
        style={{ zIndex: 9999999, position: "fixed", top: "20px", right: "20px" }}
      />

      <div className="px-4 py-4 max-w-[1500px] mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded bg-gradient-to-b from-indigo-400 to-purple-500"></span>
            ثبت و مدیریت محاسبات
          </h2>
          <span className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-md px-2.5 py-1">
            {filteredRows.length.toLocaleString("fa-IR")} ردیف
          </span>
        </div>

        {/* ==================== فیلترها ==================== */}
        <div className="form-container mb-5 flex gap-2 flex-wrap p-3 bg-slate-900/60 border border-slate-800/70 rounded-xl items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`${inputClass} !w-auto min-w-[140px]`}
          >
            <option value="">همه نوع‌ها</option>
            {Object.entries(ENTRY_TYPE_FA).map(([k, v]) => (
              <option key={`filter-${k}`} value={k}>{v}</option>
            ))}
          </select>

          <DatePicker
            value={shamsiToDateObject(fromDate)}
            onChange={handleFromDateChange}
            calendar={persian}
            locale={afghanistanLocale}
            calendarPosition="bottom-right"
            inputClass={datePickerFilterClass}
            placeholder="از تاریخ"
            containerClassName="inline-block"
            format="YYYY/MM/DD"
          />

          <DatePicker
            value={shamsiToDateObject(toDate)}
            onChange={handleToDateChange}
            calendar={persian}
            locale={afghanistanLocale}
            calendarPosition="bottom-right"
            inputClass={datePickerFilterClass}
            placeholder="تا تاریخ"
            containerClassName="inline-block"
            format="YYYY/MM/DD"
          />

          <input
            type="text"
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} flex-1 min-w-[200px]`}
          />

          <button
            type="button"
            onClick={handlePrintSearchResults}
            disabled={!filteredRows.length}
            className="text-[12px] font-bold text-white rounded-lg px-3 py-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            }}
            title="پرینت سوابق مالی همین جستجو"
          >
            🖨️ پرینت سوابق ({filteredRows.length.toLocaleString("fa-IR")})
          </button>

          {(filterType || fromDate || toDate || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFilterType("");
                setFromDate("");
                setToDate("");
                setSearchTerm("");
              }}
              className="text-[12px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg px-3 py-2 transition-colors"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* ==================== فرم ==================== */}
        <div className="form-container mb-5 p-4 bg-slate-900/60 border border-slate-800/70 rounded-xl shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800/70">
            <div className={`w-1.5 h-1.5 rounded-full ${editingId ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span className="text-[13px] font-bold text-slate-100">
              {editingId ? "ویرایش معامله" : "ثبت معامله جدید"}
            </span>
            {editingId && (
              <span className="text-[10.5px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                #{editingId}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="form-grid gap-3">
            <DatePicker
              key={`dp-form-${editingId ?? "new"}`}
              value={shamsiToDateObject(form.journal_date)}
              onChange={handleJournalDateChange}
              calendar={persian}
              locale={afghanistanLocale}
              calendarPosition="bottom-right"
              inputClass={datePickerInputClass}
              placeholder="تاریخ (شمسی)"
              containerClassName="w-full"
              format="YYYY/MM/DD"
            />

            <select
              name="entry_type"
              value={form.entry_type}
              onChange={handleChange}
              className={inputClass}
              required
            >
              {Object.entries(ENTRY_TYPE_FA).map(([k, v]) => (
                <option key={`entry-${k}`} value={k}>{v}</option>
              ))}
            </select>

            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder={manualAmount ? "مبلغ (خودتان وارد کنید)" : "مبلغ (از منبع خوانده می‌شود)"}
              className={inputClass}
              required
            />

            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="توضیحات"
              className={inputClass}
            />

            <input
              type="text"
              name="tazkira_number"
              value={form.tazkira_number}
              onChange={handleChange}
              placeholder="شماره تذکره"
              className={inputClass}
            />

            <select
              name="ref_type"
              value={form.ref_type}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">نوع منبع</option>

              {dynamicAccountGroups.length > 0 && (
                <optgroup label="🏦 حساب‌ها بر اساس کتگوری (داینامیک)">
                  {dynamicAccountGroups.map((g) => (
                    <option key={`dyn-${g.ref_type}`} value={g.ref_type}>
                      {g.account_type_label} • {g.account_category_label} ({g.total})
                    </option>
                  ))}
                </optgroup>
              )}

              {userRoleGroups.length > 0 && (
                <optgroup label="👥 کاربران سیستم (بر اساس نقش)">
                  {userRoleGroups.map((g) => (
                    <option key={`usr-role-${g.role}`} value={g.ref_type}>
                      {g.role_label} ({g.total})
                    </option>
                  ))}
                </optgroup>
              )}

              {ACCOUNT_REF_GROUPS.map((group) => (
                <optgroup key={`acc-group-${group.label}`} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={`acc-opt-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}

              {REF_TYPE_GROUPS.map((group) => (
                <optgroup key={`group-${group.label}`} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={`opt-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {refIdRequired && (
              <select
                name="ref_id"
                value={form.ref_id}
                onChange={handleChange}
                disabled={!form.ref_type || loadingSources}
                className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">
                  {loadingSources
                    ? "در حال بارگذاری..."
                    : refSources.length
                    ? "نام منبع را انتخاب کنید"
                    : form.ref_type
                    ? "منبعی یافت نشد"
                    : "ابتدا نوع منبع را انتخاب کنید"}
                </option>
                {refSourceGroups.map((group, gIdx) => (
                  <optgroup
                    key={`src-group-${gIdx}-${group.label || "flat"}`}
                    label={group.label || "منابع"}
                  >
                    {group.items.map((r, idx) => {
                      const nameStr = safeStr(r.name, "");
                      const codeStr = safeStr(r.code, "");
                      const natStr = safeStr(r.national_id, "");
                      const catLabel = safeStr(r.category_label, "");

                      return (
                        <option
                          key={`src-${safeStr(r.id, idx)}-${safeStr(r.reg_id, "x")}`}
                          value={r.id}
                        >
                          {nameStr}
                          {codeStr ? ` (${codeStr})` : ""}
                          {natStr ? ` - ${natStr}` : ""}
                          {catLabel && !group.label ? ` — ${catLabel}` : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="submit"
                className="text-white rounded-xl py-2 font-bold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  flex: "1",
                  background: editingId
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                  boxShadow: editingId
                    ? "0 4px 12px rgba(245,158,11,0.3)"
                    : "0 4px 12px rgba(124,58,237,0.3)",
                  fontSize: "13px",
                }}
              >
                {editingId ? "بروزرسانی" : "ثبت"}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} style={btnStyle.cancel}>
                  انصراف
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ==================== جدول ==================== */}
        <div className="table-container rounded-xl overflow-hidden border border-slate-800/70 shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-700/70">
                  {["عملیات", "تاریخ", "نوع", "توضیحات", "مبلغ کل", "پرداخت شده", "باقی‌مانده", "منبع", "نوعیت منبع", "نام منبع", "شماره تذکره"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.length ? (
                  currentRows.map((row) => {
                    const bgColor = getRowColor(row.source_type);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-800/50 transition-all duration-150 hover:brightness-125"
                        style={{ backgroundColor: bgColor, color: "#fff" }}
                      >
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(row.id)} style={btnStyle.edit} className="hover:brightness-110 active:scale-95">تصحیح</button>
                            <button onClick={() => handlePrint(row)} style={btnStyle.print} className="hover:brightness-110 active:scale-95">پرینت</button>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">{safeStr(row.date)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                            style={{
                              background: row.entry_type === "debit" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
                              color: row.entry_type === "debit" ? "#86efac" : "#fca5a5",
                            }}>
                            {ENTRY_TYPE_FA[row.entry_type] || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate text-[12px]">{safeStr(row.description)}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px]">{Number(row.amount || 0).toLocaleString("fa-IR")}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px] text-emerald-300 font-semibold">{Number(row.paid || 0).toLocaleString("fa-IR")}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px] text-amber-300 font-semibold">{Number(row.remaining || 0).toLocaleString("fa-IR")}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">{safeStr(row.source_label)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                            style={{ background: "rgba(99,102,241,0.25)", color: "#c7d2fe" }}>
                            {safeStr(row.source_type_label)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">{safeStr(row.source_name)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">{safeStr(row.tazkira_number)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="px-3 py-12 text-center">
                      <span className="text-slate-500 text-[13px]">نتیجه‌ای یافت نشد</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-900/70 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-[11.5px] text-slate-400">
                صفحه {currentPage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
              </span>
              <div className="flex items-center gap-1.5">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-700/60">
                  قبلی
                </button>
                <span className="text-[12px] text-slate-200 px-3 py-1 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 font-semibold shadow">
                  {currentPage.toLocaleString("fa-IR")} / {totalPages.toLocaleString("fa-IR")}
                </span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-700/60">
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayoutjur>
  );
}