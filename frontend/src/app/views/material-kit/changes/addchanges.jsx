import { useState, useEffect, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { formatDateToFa } from "../../../../utils/dateHelper";

/* ✅ DatePicker فارسی افغانی */
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

/* ============================================================
 *  ✅ Locale سفارشی افغانستان — نام ماه‌های افغانی
 * ============================================================ */
const afghanistanLocale = {
  ...persian_fa,
  name: "afghanistan",
  months: [
    ["حمل", "حمل"],
    ["ثور", "ثور"],
    ["جوزا", "جوزا"],
    ["سرطان", "سرطان"],
    ["اسد", "اسد"],
    ["سنبله", "سنبله"],
    ["میزان", "میزان"],
    ["عقرب", "عقرب"],
    ["قوس", "قوس"],
    ["جدی", "جدی"],
    ["دلو", "دلو"],
    ["حوت", "حوت"],
  ],
  weekDays: [
    ["شنبه", "ش"],
    ["یکشنبه", "ی"],
    ["دوشنبه", "د"],
    ["سه‌شنبه", "س"],
    ["چهارشنبه", "چ"],
    ["پنجشنبه", "پ"],
    ["جمعه", "ج"],
  ],
  digits: ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"],
  meridiems: [
    ["قبل از ظهر", "ق.ظ"],
    ["بعد از ظهر", "ب.ظ"],
  ],
};

/* ============================================================
 *  ثابت‌ها
 * ============================================================ */
const ENTRY_TYPE_FA = {
  debit: "اخذ پول",
  credit: "پرداخت پول",
};

const REF_TYPE_FA = {
  patient: "مریض",
  doctor: "داکتر",
  nurse: "نرس",
  receptionist: "منشی",
  accountant: "محاسب",
  pharmacist: "دواساز",
  laboratorist: "لابراتوار",
  radiologist: "رادیولوژیست",
  staff: "کارمند",
  visitor: "مراجع",
  customer: "مشتری",
  supplier: "تأمین‌کننده",
  company: "شرکت",
  vendor: "فروشنده",
  drug_company: "شرکت دوا",
  rent: "کرایه",
  electricity: "برق",
  water: "آب",
  internet: "انترنت",
  salary: "معاش",
  fuel: "سوخت",
  maintenance: "ترمیمات",
  transport: "ترانسپورت",
  consultation: "مشاوره",
  laboratory: "لابراتوار",
  expense: "مصرف عمومی",
  income: "درآمد",
  other: "سایر",
  sale: "فروش",
  parchase: "خرید",
  prescription_fee: "فیس نسخه",
  external_prescription: "نسخه بیرونی",
  pharmacy_fee: "فیس دواخانه",
  laboratory_fee: "فیس لابراتوار",
  radiology_fee: "فیس رادیولوژی",
  operation_fee: "فیس عملیات",
  admission_fee: "فیس بستری",
  registration_fee: "فیس مراجعه",
  consultation_fee: "فیس مشاوره",
};

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

/* ============================================================
 *  استایل‌های مشترک
 * ============================================================ */
const inputClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 w-full text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 placeholder:text-slate-500";

const datePickerInputClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 w-full text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 placeholder:text-slate-500 h-[38px]";

const datePickerFilterClass =
  "bg-slate-900/70 text-slate-100 border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 hover:border-slate-600 h-[38px] w-[150px]";

const btnStyle = {
  edit: {
    background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
    color: "#111827",
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
    marginLeft: "5px",
    boxShadow: "0 2px 5px rgba(234,179,8,0.25)",
    transition: "all 0.15s",
  },
  print: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
    boxShadow: "0 2px 5px rgba(16,185,129,0.25)",
    transition: "all 0.15s",
  },
  cancel: {
    background: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    color: "white",
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    flex: "0.5",
    fontWeight: "600",
    boxShadow: "0 2px 8px rgba(100,116,139,0.3)",
    transition: "all 0.15s",
  },
};

/* ============================================================
 *  توابع کمکی تاریخ
 * ============================================================ */

/** تبدیل DateObject فارسی به رشته YYYY-MM-DD میلادی برای ارسال به بک‌اند */
const dateObjectToISO = (dateObj) => {
  if (!dateObj) return "";
  try {
    // اگر DateObject باشد (از DatePicker)
    if (typeof dateObj?.toDate === "function") {
      return dateObj.toDate().toISOString().split("T")[0];
    }
    // اگر Date معمولی باشد
    if (dateObj instanceof Date) {
      return dateObj.toISOString().split("T")[0];
    }
    return "";
  } catch {
    return "";
  }
};

/** تبدیل رشته میلادی YYYY-MM-DD به Date برای DatePicker */
const isoToDateObject = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso);
  } catch {
    return "";
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

  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ============================================================
   *  دریافت ژورنال‌ها
   * ============================================================ */
  const fetchJournals = useCallback(async () => {
    try {
      const res = await api.get("/journals", {
        params: {
          type: filterType || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });

      const data = res.data ?? [];
      setJournals(Array.isArray(data) ? [...data].reverse() : []);
      setCurrentPage(1);
    } catch (err) {
      console.error("fetchJournals error:", err);
      toast.error("خطا در دریافت ژورنال‌ها");
    }
  }, [api, filterType, fromDate, toDate]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  /* ============================================================
   *  دریافت منابع بر اساس نوع
   * ============================================================ */
  useEffect(() => {
    let isMounted = true;

    const loadSources = async () => {
      if (!form.ref_type) {
        setRefSources([]);
        return;
      }

      setLoadingSources(true);
      try {
        const res = await api.get("/journals/ref-sources", {
          params: { type: form.ref_type, limit: 500 },
        });

        if (!isMounted) return;

        const list = res.data?.data ?? [];
        setRefSources(Array.isArray(list) ? list : []);

        if (list.length === 0) {
          console.warn(`منبعی برای type=${form.ref_type} یافت نشد`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("خطا در دریافت منابع:", err);
        toast.error("خطا در دریافت لیست منابع");
        setRefSources([]);
      } finally {
        if (isMounted) setLoadingSources(false);
      }
    };

    loadSources();

    return () => {
      isMounted = false;
    };
  }, [api, form.ref_type]);

  /* ============================================================
   *  مدیریت فرم
   * ============================================================ */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "ref_type") {
        updated.ref_id = "";
        updated.reg_id = "";
        updated.tazkira_number = "";
        updated.description = "";
        updated.amount = "";
      }

      if (name === "ref_id") {
        const found = refSources.find(
          (r) => String(r.id) === String(value)
        );

        if (found) {
          updated.reg_id = found.reg_id ?? "";

          if (found.national_id) {
            updated.tazkira_number = found.national_id;
          }

          if (form.ref_type === "external_prescription") {
            if (found.name) {
              updated.description = `فیس نسخه بیرونی - ${found.name}`;
            }

            if (found.total_amount !== undefined) {
              const total = Number(found.total_amount || 0);
              const discount = Number(found.discount || 0);
              const paid = Number(found.paid_amount || 0);
              const remaining = Math.max(0, total - discount - paid);
              updated.amount = remaining > 0 ? remaining : total - discount;
            }
          } else {
            if (!updated.description && found.name) {
              updated.description = found.name;
            }
            if (!updated.amount && found.total_amount) {
              updated.amount = found.total_amount;
            }
          }
        }
      }

      return updated;
    });
  };

  const handleJournalDateChange = (dateObj) => {
    setForm((prev) => ({
      ...prev,
      journal_date: dateObjectToISO(dateObj),
    }));
  };

  const handleFromDateChange = (dateObj) => {
    setFromDate(dateObjectToISO(dateObj));
  };

  const handleToDateChange = (dateObj) => {
    setToDate(dateObjectToISO(dateObj));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.journal_date)
      return toast.error("تاریخ ژورنال الزامی است");
    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("مبلغ باید بزرگتر از صفر باشد");
    if (!form.ref_type)
      return toast.error("نوع منبع الزامی است");
    if (!form.ref_id)
      return toast.error("نام منبع الزامی است");

    try {
      const url = editingId
        ? `/journals/upsert/${editingId}`
        : "/journals/upsert";

      const payload = {
        ...form,
        amount: Number(form.amount),
        ref_id: Number(form.ref_id),
        reg_id: form.reg_id ? Number(form.reg_id) : null,
      };

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

    setForm({
      journal_date: journal.journal_date ?? "",
      description: journal.description ?? "",
      entry_type: journal.entry_type ?? "debit",
      amount: journal.amount ?? journal.total_amount ?? "",
      ref_type: journal.ref_type ?? "",
      ref_id: journal.ref_id ?? "",
      tazkira_number: journal.tazkira_number ?? "",
      reg_id: journal.reg_id ?? "",
    });

    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = (row) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>ژورنال شماره ${row.id}</title>
          <style>
            body { font-family: Tahoma, sans-serif; padding: 20px; }
            h3 { text-align: center; }
            p { margin: 8px 0; }
          </style>
        </head>
        <body>
          <h3>ژورنال شماره ${row.id}</h3>
          <p>تاریخ: ${row.date}</p>
          <p>نوع: ${ENTRY_TYPE_FA[row.entry_type] || "-"}</p>
          <p>توضیحات: ${row.description}</p>
          <p>مبلغ کل: ${row.amount}</p>
          <p>پرداخت شده: ${row.paid}</p>
          <p>باقی‌مانده: ${row.remaining}</p>
          <p>منبع: ${REF_TYPE_FA[row.source_type] || row.source_type || "-"}</p>
          <p>نام منبع: ${row.source_name}</p>
          <p>شماره تذکره: ${row.tazkira_number}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  /* ============================================================
   *  ردیف‌های جدول
   * ============================================================ */
  const combinedRows = useMemo(() => {
    if (!journals.length) return [];

    return journals
      .map((j) => {
        const amount = Number(j.total_amount ?? j.amount ?? 0);

        let paid = Number(j.paid_amount ?? amount);
        let remaining = Number(j.due_amount ?? 0);

        if (j.paid_amount !== null && j.paid_amount !== undefined) {
          paid = Number(j.paid_amount);
        }
        if (j.due_amount !== null && j.due_amount !== undefined) {
          remaining = Number(j.due_amount);
        }

        let description = j.description ?? "-";

        if (j.ref_type === "sale") {
          description = `فروش شماره ${j.ref_id}`;
        } else if (j.ref_type === "parchase") {
          description = `خرید شماره ${j.ref_id}`;
        } else if (j.ref_type === "external_prescription") {
          const patientName = j.source_name || j.full_name || j.display_name;
          description = patientName
            ? `فیس نسخه بیرونی - ${patientName}`
            : `نسخه بیرونی #${j.ref_id}`;
        } else if (
          j.ref_type === "patient" &&
          typeof description === "string" &&
          description.includes("نسخه شماره")
        ) {
          const match = description.match(/نسخه شماره (\d+)/);
          const presNum = match ? match[1] : j.ref_id;
          description = `نسخه شماره ${presNum}`;
          remaining = 0;
          paid = amount;
        }

        return {
          id: j.id,
          raw_date: j.journal_date,
          date: j.journal_date ? formatDateToFa(j.journal_date) : "-",
          entry_type: j.entry_type,
          description,
          amount,
          paid,
          remaining,
          source_type: j.ref_type,
          source_name:
            j.source_name || j.full_name || j.display_name || "-",
          tazkira_number: j.tazkira_number ?? "-",
          reg_id: j.reg_id ?? null,
        };
      })
      .sort((a, b) => {
        const da = a.raw_date ? new Date(a.raw_date).getTime() : 0;
        const db = b.raw_date ? new Date(b.raw_date).getTime() : 0;
        return db - da;
      });
  }, [journals]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return combinedRows;
    const term = searchTerm.toLowerCase().trim();
    return combinedRows.filter(
      (row) =>
        row.source_name?.toLowerCase().includes(term) ||
        row.description?.toLowerCase().includes(term) ||
        row.tazkira_number?.toLowerCase().includes(term)
    );
  }, [combinedRows, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE) || 1;
  const currentRows = filteredRows.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, fromDate, toDate]);

  /* ============================================================
   *  رنگ ردیف بر اساس نوع منبع (بدون تغییر)
   * ============================================================ */
  const getRowColor = (sourceType) => {
    switch (sourceType) {
      case "sale":                  return "#1a4a70";
      case "parchase":              return "#701a1a";
      case "patient":               return "#1a701a";
      case "external_prescription": return "#6b3fa0";
      case "prescription_fee":      return "#1a701a";
      default:                      return "#1a1a1a";
    }
  };

  /* ============================================================
   *  رندر
   * ============================================================ */
  return (
    <MainLayoutjur>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        rtl={true}
        theme="colored"
        limit={5}
        style={{
          zIndex: 9999999,
          position: "fixed",
          top: "20px",
          right: "20px",
        }}
      />

      <div className="px-4 py-4 max-w-[1500px] mx-auto" dir="rtl">
        {/* ==================== عنوان صفحه ==================== */}
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
              <option key={`filter-${k}`} value={k}>
                {v}
              </option>
            ))}
          </select>

          {/* ✅ فیلتر از تاریخ — تقویم افغانستان */}
          <DatePicker
            value={isoToDateObject(fromDate)}
            onChange={handleFromDateChange}
            calendar={persian}
            locale={afghanistanLocale}
            calendarPosition="bottom-right"
            inputClass={datePickerFilterClass}
            placeholder="از تاریخ"
            containerClassName="inline-block"
          />

          {/* ✅ فیلتر تا تاریخ — تقویم افغانستان */}
          <DatePicker
            value={isoToDateObject(toDate)}
            onChange={handleToDateChange}
            calendar={persian}
            locale={afghanistanLocale}
            calendarPosition="bottom-right"
            inputClass={datePickerFilterClass}
            placeholder="تا تاریخ"
            containerClassName="inline-block"
          />

          <input
            type="text"
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} flex-1 min-w-[200px]`}
          />

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
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                editingId ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
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
            {/* ✅ تاریخ ژورنال — تقویم افغانستان */}
            <DatePicker
              value={isoToDateObject(form.journal_date)}
              onChange={handleJournalDateChange}
              calendar={persian}
              locale={afghanistanLocale}
              calendarPosition="bottom-right"
              inputClass={datePickerInputClass}
              placeholder="تاریخ (شمسی)"
              containerClassName="w-full"
            />

            <select
              name="entry_type"
              value={form.entry_type}
              onChange={handleChange}
              className={inputClass}
              required
            >
              {Object.entries(ENTRY_TYPE_FA).map(([k, v]) => (
                <option key={`entry-${k}`} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="مبلغ"
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
              {REF_TYPE_GROUPS.map((group) => (
                <optgroup key={`group-${group.label}`} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={`opt-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              name="ref_id"
              value={form.ref_id}
              onChange={handleChange}
              disabled={!form.ref_type || loadingSources}
              className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              required
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
              {refSources.map((r) => (
                <option key={`src-${r.id}-${r.reg_id ?? "x"}`} value={r.id}>
                  {r.name}
                  {r.code ? ` (${r.code})` : ""}
                  {r.national_id ? ` - ${r.national_id}` : ""}
                </option>
              ))}
            </select>

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
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={btnStyle.cancel}
                >
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
                  {[
                    "عملیات",
                    "تاریخ",
                    "نوع",
                    "توضیحات",
                    "مبلغ کل",
                    "پرداخت شده",
                    "باقی‌مانده",
                    "منبع",
                    "نام منبع",
                    "شماره تذکره",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider"
                    >
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
                            <button
                              onClick={() => handleEdit(row.id)}
                              style={btnStyle.edit}
                              className="hover:brightness-110 active:scale-95"
                            >
                              تصحیح
                            </button>
                            <button
                              onClick={() => handlePrint(row)}
                              style={btnStyle.print}
                              className="hover:brightness-110 active:scale-95"
                            >
                              پرینت
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">
                          {row.date || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                            style={{
                              background:
                                row.entry_type === "debit"
                                  ? "rgba(34,197,94,0.25)"
                                  : "rgba(239,68,68,0.25)",
                              color:
                                row.entry_type === "debit"
                                  ? "#86efac"
                                  : "#fca5a5",
                            }}
                          >
                            {ENTRY_TYPE_FA[row.entry_type] || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate text-[12px]">
                          {row.description || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px]">
                          {Number(row.amount || 0).toLocaleString("fa-IR")}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px] text-emerald-300 font-semibold">
                          {Number(row.paid || 0).toLocaleString("fa-IR")}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[12px] text-amber-300 font-semibold">
                          {Number(row.remaining || 0).toLocaleString("fa-IR")}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">
                          {REF_TYPE_FA[row.source_type] ||
                            row.source_type ||
                            "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">
                          {row.source_name || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[12px]">
                          {row.tazkira_number || "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="px-3 py-12 text-center">
                      <span className="text-slate-500 text-[13px]">
                        نتیجه‌ای یافت نشد
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ==================== صفحه‌بندی ==================== */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-900/70 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-[11.5px] text-slate-400">
                صفحه {currentPage.toLocaleString("fa-IR")} از{" "}
                {totalPages.toLocaleString("fa-IR")}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-700/60"
                >
                  قبلی
                </button>

                <span className="text-[12px] text-slate-200 px-3 py-1 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 font-semibold shadow">
                  {currentPage.toLocaleString("fa-IR")} /{" "}
                  {totalPages.toLocaleString("fa-IR")}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-700/60"
                >
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