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

export default function JournalPage() {
  const { api } = useAuth();

  const [journals, setJournals] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [transactions, setTransactions] = useState({ sale: [], parchase: [] });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    journal_date: "",
    description: "",
    entry_type: "debit",
    amount: "",
    ref_type: "",
    ref_id: "",
    tazkira_number: "",
  });

  const [filterType, setFilterType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  const inputClass =
    "bg-[#111] text-white border border-gray-600 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-600";

  const fetchData = async () => {
    try {
      const [journalsRes, registrationsRes, salesRes, parchaseRes] =
        await Promise.allSettled([
          api.get("/journals", {
            params: {
              type: filterType || undefined,
              from_date: fromDate || undefined,
              to_date: toDate || undefined,
            },
          }),
          api.get("/registrations"),
          api.get("/sales"),
          api.get("/parchases"),
        ]);

      const journalsData =
        journalsRes.status === "fulfilled" ? journalsRes.value.data ?? [] : [];

      const regs =
        registrationsRes.status === "fulfilled" ? registrationsRes.value.data ?? [] : [];

      const sales =
        salesRes.status === "fulfilled" ? salesRes.value.data ?? [] : [];

      const parchases =
        parchaseRes.status === "fulfilled" ? parchaseRes.value.data ?? [] : [];

      setJournals(Array.isArray(journalsData) ? journalsData.reverse() : []);
      setRegistrations(Array.isArray(regs) ? regs : []);
      setTransactions({
        sale: Array.isArray(sales) ? sales : [],
        parchase: Array.isArray(parchases) ? parchases : [],
      });

      setCurrentPage(1);
    } catch (err) {
      toast.error("خطا در دریافت داده‌ها");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, fromDate, toDate]);

  const registrationMap = useMemo(() => {
    const map = {};
    registrations.forEach((r) => {
      map[`${r.reg_type}_${r.reg_id}`] = r;
    });
    return map;
  }, [registrations]);

  const getRef = (type, id) => registrationMap[`${type}_${id}`] ?? null;
const filteredRefs = useMemo(() => {
  if (!form.ref_type) return [];

  // برای sale و parchase از transactions استفاده کن
  if (form.ref_type === 'sale' || form.ref_type === 'parchase') {
    return Array.isArray(transactions[form.ref_type]) ? transactions[form.ref_type] : [];
  }

  // بقیه موارد (اشخاص و مصارف) از registrations
  return registrations.filter((r) => r.reg_type === form.ref_type);
}, [form.ref_type, registrations, transactions]);
 
  const combinedRows = useMemo(() => {
    if (!journals.length) return [];

    return journals
      .map((j) => {
        let amount = Number(j.total_amount ?? j.amount ?? 0);
        let paid = Number(j.paid_amount ?? (j.entry_type === "credit" ? j.amount : 0));
        let remaining = Number(j.due_amount ?? (j.entry_type === "debit" ? j.amount : 0));

        let description = j.description ?? "-";

        if (j.ref_type === "sale") {
          description = `فروش شماره ${j.ref_id}`;
        } else if (j.ref_type === "parchase") {
          description = `خرید شماره ${j.ref_id}`;
        } else if (j.ref_type === "patient" && description.includes("نسخه شماره")) {
          const match = description.match(/نسخه شماره (\d+)/);
          const presNum = match ? match[1] : j.ref_id;
          description = `نسخه شماره ${presNum}`;
          remaining = 0;
          paid = amount;
        }

        let source_name = "-";
        let tazkira_number = j.tazkira_number ?? "-";
        const ref = getRef(j.ref_type, j.ref_id);

        if (ref) {
          source_name =
            ref.full_name ||
            ref.customer_name ||
            ref.supplier_name ||
            ref.name ||
            `شماره ${ref.reg_id || j.ref_id}`;

          tazkira_number = ref.tazkira_number ?? j.tazkira_number ?? "-";
        } else {
          source_name = j.full_name ?? j.display_name ?? `شماره ${j.ref_id}`;
        }

        return {
          id: j.id,
          date: j.journal_date ? formatDateToFa(j.journal_date) : "-",
          entry_type: j.entry_type,
          description,
          amount,
          paid,
          remaining,
          source_type: j.ref_type,
          source_name,
          tazkira_number,
        };
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [journals, registrationMap, transactions]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "ref_type" ? { ref_id: "" } : {}),
    }));
  };

  // ✅ تابع جدید برای انصراف از ویرایش
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      journal_date: "",
      description: "",
      entry_type: "debit",
      amount: "",
      ref_type: "",
      ref_id: "",
      tazkira_number: "",
    });
    toast.info("✏️ ویرایش لغو شد");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("مبلغ باید بزرگتر از صفر باشد");
    if (!form.ref_type || !form.ref_id)
      return toast.error("نوع منبع و نام منبع الزامی است");

    try {
      const url = editingId ? `/journals/upsert/${editingId}` : "/journals/upsert";
      const method = "post";

      await api[method](url, {
        ...form,
        amount: Number(form.amount),
        ref_id: Number(form.ref_id),
      });

      toast.success(editingId ? "ژورنال بروز رسانی شد" : "ذخیره شد");

      // پاک کردن فرم و ID بعد از ثبت
      setForm({
        journal_date: "",
        description: "",
        entry_type: "debit",
        amount: "",
        ref_type: "",
        ref_id: "",
        tazkira_number: "",
      });
      setEditingId(null);

      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "خطا در ذخیره");
    }
  };

  const handleEdit = (id) => {
    const journal = journals.find((j) => j.id === id);
    if (!journal) return;

    setForm({
      journal_date: journal.journal_date,
      description: journal.description,
      entry_type: journal.entry_type,
      amount: journal.amount ?? journal.total_amount ?? 0,
      ref_type: journal.ref_type,
      ref_id: journal.ref_id,
      tazkira_number: journal.tazkira_number ?? "",
    });

    setEditingId(id); // ⚡ ست کردن ID برای آپدیت
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

  return (
    <MainLayoutjur>
      {/* ✅ ToastContainer با استایل مناسب */}
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={5}
        style={{ 
          zIndex: 9999999,
          position: 'fixed',
          top: '20px',
          right: '20px',
          left: 'auto',
          width: 'auto',
          maxWidth: '350px',
          transform: 'none'
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
        <input type="text" placeholder="جستجو..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClass} />
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
          <input
            type="text"
            name="tazkira_number"
            value={form.tazkira_number}
            onChange={handleChange}
            placeholder="شماره تذکره"
            className={inputClass}
          />
          <select name="ref_type" value={form.ref_type} onChange={handleChange} className={inputClass} required>
            <option value="">نوع منبع</option>
            <optgroup label="اشخاص">
              <option value="patient">مریض</option>
              <option value="doctor">داکتر</option>
              <option value="visitor">مراجع</option>
              <option value="customer">مشتری</option>
              <option value="staff">کارمند</option>
              <option value="supplier">تأمین‌کننده</option>
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
            <optgroup label="خدمات">
              <option value="laboratory">لابراتوار</option>
              <option value="transport">ترانسپورت</option>
              <option value="consultation">مشاوره</option>
            </optgroup>
            <optgroup label="دیگر">
              <option value="expense">مصرف عمومی</option>
              <option value="income">درآمد</option>
              <option value="other">سایر</option>
            </optgroup>
          </select>

          <select name="ref_id" value={form.ref_id} onChange={handleChange} disabled={!form.ref_type} className={inputClass} required>
            <option value="">نام منبع</option>
            {filteredRefs.map((r) => {
              const id = r.sales_id || r.parchase_id || r.id || r.reg_id;
              const name =
                r.full_name || r.customer_name || r.supplier_name || r.name || `شماره ${id}`;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>

          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              className="bg-blue-700 text-white rounded-xl py-2 hover:bg-blue-800"
              style={{ flex: editingId ? "1" : "1" }}
            >
              {editingId ? "بروزرسانی" : "ثبت"}
            </button>

            {/* ✅ دکمه انصراف - فقط در حالت ویرایش نمایش داده می‌شود */}
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: "#6c757d",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  flex: "0.5"
                }}
              >
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
                  <tr key={row.id} style={{ backgroundColor: bgColor, transition: "0.2s", color: "#fff" }}>
                    <td className="flex gap-1">
                      <button 
  onClick={() => handleEdit(row.id)}  
  style={{ 
    backgroundColor: "#dcc215", 
    color: "#000",
    padding: "5px 12px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    marginLeft: "5px",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
  }}
>
  تصحیح
</button>

<button 
  onClick={() => handlePrint(row)}   
  style={{ 
    backgroundColor: "#0da62f", 
    color: "#fff",
    padding: "5px 12px",
    borderRadius: "5px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
  }}
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
                    <td>{REF_TYPE_FA[row.source_type] || row.source_type || "-"}</td>
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50">
            قبلی
          </button>
          <span className="px-4 py-2">
            {currentPage} / {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50">
            بعدی
          </button>
        </div>
      )}
    </MainLayoutjur>
  );
}