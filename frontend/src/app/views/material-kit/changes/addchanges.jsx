import { useState, useEffect, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { formatDateToFa } from "../../../../utils/dateHelper";

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
  "bg-[#111] text-white border border-gray-600 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-600";

const btnStyle = {
  edit: {
    backgroundColor: "#dcc215",
    color: "#000",
    padding: "5px 12px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    marginLeft: "5px",
  },
  print: {
    backgroundColor: "#0da62f",
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
  },
  cancel: {
    backgroundColor: "#6c757d",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    flex: "0.5",
  },
};

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

        // ✅ اگر خالی بود، پیام هشدار
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

          if (!updated.description && found.name) {
            updated.description = found.name;
          }
        }
      }

      return updated;
    });
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

      <h2 style={{ textAlign: "center" }}>ثبت و مدیریت محاسبات</h2>

      {/* ===== فیلترها ===== */}
      <div className="form-container mb-6 flex gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={inputClass}
        >
          <option value="">همه نوع‌ها</option>
          {Object.entries(ENTRY_TYPE_FA).map(([k, v]) => (
            <option key={`filter-${k}`} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="جستجو..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* ===== فرم ===== */}
      <div className="form-container mb-10">
        <form onSubmit={handleSubmit} className="form-grid gap-3">
          <input
            type="date"
            name="journal_date"
            value={form.journal_date}
            onChange={handleChange}
            className={inputClass}
            required
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
            className={inputClass}
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
              className="bg-blue-700 text-white rounded-xl py-2 hover:bg-blue-800"
              style={{ flex: "1" }}
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

      {/* ===== جدول ===== */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>عملیات</th>
              <th>تاریخ</th>
              <th>نوع</th>
              <th>توضیحات</th>
              <th>مبلغ کل</th>
              <th>پرداخت شده</th>
              <th>باقی‌مانده</th>
              <th>منبع</th>
              <th>نام منبع</th>
              <th>شماره تذکره</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length ? (
              currentRows.map((row) => {
                let bgColor = "#1a1a1a";
                if (row.source_type === "sale") bgColor = "#1a4a70";
                else if (row.source_type === "parchase") bgColor = "#701a1a";
                else if (row.source_type === "patient") bgColor = "#1a701a";

                return (
                  <tr
                    key={row.id}
                    style={{ backgroundColor: bgColor, color: "#fff" }}
                  >
                    <td className="flex gap-1">
                      <button
                        onClick={() => handleEdit(row.id)}
                        style={btnStyle.edit}
                      >
                        تصحیح
                      </button>
                      <button
                        onClick={() => handlePrint(row)}
                        style={btnStyle.print}
                      >
                        پرینت
                      </button>
                    </td>
                    <td>{row.date || "-"}</td>
                    <td>{ENTRY_TYPE_FA[row.entry_type] || "-"}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.amount ?? 0}</td>
                    <td>{row.paid ?? 0}</td>
                    <td>{row.remaining ?? 0}</td>
                    <td>
                      {REF_TYPE_FA[row.source_type] ||
                        row.source_type ||
                        "-"}
                    </td>
                    <td>{row.source_name || "-"}</td>
                    <td>{row.tazkira_number || "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: "center" }}>
                  نتیجه‌ای یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== صفحه‌بندی ===== */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
          >
            قبلی
          </button>
          <span className="px-4 py-2">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
          >
            بعدی
          </button>
        </div>
      )}
    </MainLayoutjur>
  );
}