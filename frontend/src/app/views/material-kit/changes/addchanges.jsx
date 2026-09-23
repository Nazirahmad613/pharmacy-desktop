import { useState, useEffect, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { formatDateToFa } from "../../../../utils/dateHelper";

const ENTRY_TYPE_FA = {
  debit: "اخذ پول",
  credit: "پرداخت پول",
};

const REF_TYPE_FA = {
  patient: "مریض",
  doctor: "داکتر",
  nurse: "نرس",
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
  sale: "مشتری",
  parchase: "شرکت دوا",
};

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

export default function JournalPage() {
  const { api } = useAuth();

  const [journals, setJournals] = useState([]);
  const [refSources, setRefSources] = useState([]); // ✅ منابع از API جدید
  const [loadingSources, setLoadingSources] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const inputClass =
    "bg-[#111] text-white border border-gray-600 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-600";

  /* ============================================================
   *  دریافت ژورنال‌ها
   * ============================================================ */
  const fetchJournals = async () => {
    try {
      const res = await api.get("/journals", {
        params: {
          type: filterType || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });

      const data = res.data ?? [];
      setJournals(Array.isArray(data) ? data.reverse() : []);
      setCurrentPage(1);
    } catch (err) {
      toast.error("خطا در دریافت ژورنال‌ها");
    }
  };

  useEffect(() => {
    fetchJournals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, fromDate, toDate]);

  /* ============================================================
   *  ✅ دریافت منابع بر اساس نوع انتخاب‌شده
   * ============================================================ */
  useEffect(() => {
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
        setRefSources(res.data?.data ?? []);
      } catch (err) {
        console.error("خطا در دریافت منابع:", err);
        setRefSources([]);
      } finally {
        setLoadingSources(false);
      }
    };

    loadSources();
  }, [form.ref_type]);

  /* ============================================================
   *  پیدا کردن reg_id از منبع انتخاب‌شده
   * ============================================================ */
  const findRegIdForRef = (type, refId) => {
    if (!type || !refId) return "";
    if (["sale", "parchase"].includes(type)) return "";

    // برای patient و سایر، از API استفاده می‌شود
    // reg_id در registrations جداست و از این‌جا قابل استخراج نیست.
    return "";
  };

  /* ============================================================
   *  مدیریت فرم
   * ============================================================ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "ref_type" ? { ref_id: "", reg_id: "" } : {}),
    }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("مبلغ باید بزرگتر از صفر باشد");
    if (!form.ref_type || !form.ref_id)
      return toast.error("نوع منبع و نام منبع الزامی است");

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
      toast.success(editingId ? "ژورنال بروز رسانی شد" : "ذخیره شد");

      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchJournals();
    } catch (err) {
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
    printWindow.document.write(`<h3>ژورنال شماره ${row.id}</h3>`);
    printWindow.document.write(`<p>تاریخ: ${row.date}</p>`);
    printWindow.document.write(`<p>نوع: ${ENTRY_TYPE_FA[row.entry_type]}</p>`);
    printWindow.document.write(`<p>توضیحات: ${row.description}</p>`);
    printWindow.document.write(`<p>مبلغ کل: ${row.amount}</p>`);
    printWindow.document.write(`<p>پرداخت شده: ${row.paid}</p>`);
    printWindow.document.write(`<p>باقی‌مانده: ${row.remaining}</p>`);
    printWindow.document.write(`<p>منبع: ${REF_TYPE_FA[row.source_type]}</p>`);
    printWindow.document.write(`<p>نام منبع: ${row.source_name}</p>`);
    printWindow.document.write(`<p>شماره تذکره: ${row.tazkira_number}</p>`);
    printWindow.document.close();
    printWindow.print();
  };

  /* ============================================================
   *  ساخت ردیف‌های جدول
   * ============================================================ */
  const combinedRows = useMemo(() => {
  if (!journals.length) return [];

  return journals
    .map((j) => {
      const amount = Number(j.total_amount ?? j.amount ?? 0);

      // ✅ منطق اصلاح‌شده: هر تراکنش (debit یا credit) پول پرداخت‌شده است
      let paid = Number(j.paid_amount ?? amount);
      let remaining = Number(j.due_amount ?? 0);

      // اگر مقادیر از بک‌اند آمده، از آن‌ها استفاده کن (sale/parchase)
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
        source_name: j.source_name || j.full_name || j.display_name || "-",
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
    const term = searchTerm.toLowerCase();
    return combinedRows.filter(
      (row) =>
        row.source_name?.toLowerCase().includes(term) ||
        row.description?.toLowerCase().includes(term) ||
        row.tazkira_number?.toLowerCase().includes(term)
    );
  }, [combinedRows, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
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

      <div className="form-container mb-6 flex gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={inputClass}
        >
          <option value="">همه نوع‌ها</option>
          {Object.keys(ENTRY_TYPE_FA).map((t) => (
            <option key={t} value={t}>
              {ENTRY_TYPE_FA[t]}
            </option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
        <input
          type="text"
          placeholder="جستجو..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="form-container mb-10">
        <form onSubmit={handleSubmit} className="form-grid gap-3">
          <input type="date" name="journal_date" value={form.journal_date} onChange={handleChange} className={inputClass} required />
          <select name="entry_type" value={form.entry_type} onChange={handleChange} className={inputClass} required>
            {Object.keys(ENTRY_TYPE_FA).map((t) => (
              <option key={t} value={t}>{ENTRY_TYPE_FA[t]}</option>
            ))}
          </select>
          <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="مبلغ" className={inputClass} required />
          <input type="text" name="description" value={form.description} onChange={handleChange} placeholder="توضیحات" className={inputClass} />
          <input type="text" name="tazkira_number" value={form.tazkira_number} onChange={handleChange} placeholder="شماره تذکره" className={inputClass} />

          <select name="ref_type" value={form.ref_type} onChange={handleChange} className={inputClass} required>
            <option value="">نوع منبع</option>
            <optgroup label="اشخاص">
              <option value="patient">مریض</option>
              <option value="doctor">داکتر</option>
              <option value="nurse">نرس</option>
              <option value="staff">کارمند</option>
              <option value="receptionist">منشی</option>
              <option value="accountant">محاسب</option>
              <option value="pharmacist">دواساز</option>
              <option value="laboratorist">لابراتوار</option>
              <option value="radiologist">رادیولوژیست</option>
            </optgroup>
            <optgroup label="طرف‌های حساب">
              <option value="supplier">تأمین‌کننده</option>
              <option value="customer">مشتری</option>
              <option value="company">شرکت</option>
              <option value="vendor">فروشنده</option>
            </optgroup>
            <optgroup label="فروش و خرید">
              <option value="sale">فروش</option>
              <option value="parchase">خرید</option>
            </optgroup>
            <optgroup label="مصارف">
              <option value="rent">کرایه</option>
              <option value="electricity">برق</option>
              <option value="water">آب</option>
              <option value="internet">انترنت</option>
              <option value="salary">معاش</option>
              <option value="fuel">سوخت</option>
              <option value="maintenance">ترمیمات</option>
            </optgroup>
            <optgroup label="دیگر">
              <option value="expense">مصرف عمومی</option>
              <option value="income">درآمد</option>
              <option value="other">سایر</option>
            </optgroup>
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
              {loadingSources ? "در حال بارگذاری..." : "نام منبع"}
            </option>
            {refSources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.code ? ` (${r.code})` : ""}
                {r.national_id ? ` - ${r.national_id}` : ""}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="bg-blue-700 text-white rounded-xl py-2 hover:bg-blue-800" style={{ flex: "1" }}>
              {editingId ? "بروزرسانی" : "ثبت"}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} style={{ backgroundColor: "#6c757d", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", flex: "0.5" }}>
                انصراف
              </button>
            )}
          </div>
        </form>
      </div>

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
                  <tr key={row.id} style={{ backgroundColor: bgColor, color: "#fff" }}>
                    <td className="flex gap-1">
                      <button onClick={() => handleEdit(row.id)} style={{ backgroundColor: "#dcc215", color: "#000", padding: "5px 12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold", marginLeft: "5px" }}>
                        تصحیح
                      </button>
                      <button onClick={() => handlePrint(row)} style={{ backgroundColor: "#0da62f", color: "#fff", padding: "5px 12px", borderRadius: "5px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                        پرینت
                      </button>
                    </td>
                    <td>{row.date || "-"}</td>
                    <td>{ENTRY_TYPE_FA[row.entry_type] || "-"}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.amount ?? 0}</td>
                    <td>{row.paid ?? 0}</td>
                    <td>{row.remaining ?? 0}</td>
                    <td>{REF_TYPE_FA[row.source_type] || row.source_type || "-"}</td>
                    <td>{row.source_name || "-"}</td>
                    <td>{row.tazkira_number || "-"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: "center" }}>نتیجه‌ای یافت نشد</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50">قبلی</button>
          <span className="px-4 py-2">{currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50">بعدی</button>
        </div>
      )}
    </MainLayoutjur>
  );
}