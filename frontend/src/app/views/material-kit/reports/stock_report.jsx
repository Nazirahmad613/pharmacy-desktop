 import React, { useEffect, useState, useMemo } from "react";
import api from "../../../../api";
import MainLayout from "../../../../components/mainlayout"; //  

export default function StockReport() {


  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/stock");
        const data = Array.isArray(res.data) ? res.data : res.data.data || res.data;
        setRows(data);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "خطا در دریافت گزارش استاک");
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  // فیلتر و جست‌وجو
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.gen_name} ${r.dosage} ${r.category_name} ${r.supplier_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "low") return Number(r.stock_quantity) <= 10;
      if (filter === "expiring") {
        const exp = new Date(r.exp_date);
        const now = new Date();
        const in30 = new Date();
        in30.setDate(now.getDate() + 30);
        return exp >= now && exp <= in30;
      }
      if (filter === "expired") {
        const exp = new Date(r.exp_date);
        return exp < new Date();
      }
      return true;
    });
  }, [rows, query, filter]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Export CSV
  const downloadCSV = () => {
    const header = [
      "med_id",
      "gen_name",
      "dosage",
      "stock_quantity",
      "exp_date",
      "category_name",
      "supplier_name",
      "stock_status",
      "expiry_status",
    ];

    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [
          r.med_id,
          `"${(r.gen_name || "").replace(/"/g, '""')}"`,
          `"${(r.dosage || "").replace(/"/g, '""')}"`,
          r.stock_quantity,
          r.exp_date,
          `"${(r.category_name || "").replace(/"/g, '""')}"`,
          `"${(r.supplier_name || "").replace(/"/g, '""')}"`,
          r.stock_status,
          r.expiry_status,
        ].join(",")
      )
    );

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="گزارش اقلام موجود">
      <div className="max-w-6xl mx-auto">
        {/* دکمه دانلود CSV */}
        <div className="flex items-center justify-between mb-6">
          <div></div> {/* عنوان در Layout هست */}
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="px-3 py-2 bg-blue-600 text-white rounded shadow-sm"
            >
              دانلود CSV
            </button>
          </div>
        </div>

        {/* جستجو و فیلتر */}
        <div className="flex gap-3 mb-4 items-center">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="جست‌و‌جو نام، کتگوری یا سپلایر..."
            className="flex-1 border p-2 rounded"
          />
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="border p-2 rounded"
          >
            <option value="all">همه</option>
            <option value="low">کمیاب / کمبود (≤10)</option>
            <option value="expiring">نزدیک انقضا (۳۰ روز)</option>
            <option value="expired">تاریخ گذشته</option>
          </select>
        </div>

        {/* جدول */}
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-right">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">نام دوا</th>
                <th className="p-3">دوز</th>
                <th className="p-3">موجودی</th>
                <th className="p-3">وضعیت موجودی</th>
                <th className="p-3">تاریخ انقضا</th>
                <th className="p-3">وضعیت انقضا</th>
                <th className="p-3">کتگوری</th>
                <th className="p-3">سپلایر</th>
              </tr>
            </thead>
            <tbody className="text-right">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center">در حال بارگذاری...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-red-600">{error}</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center">هیچ داده‌ای پیدا نشد</td>
                </tr>
              ) : (
                paginated.map((r, idx) => (
                  <tr key={r.med_id} className="border-t">
                    <td className="p-3">{(page - 1) * perPage + idx + 1}</td>
                    <td className="p-3">{r.gen_name}</td>
                    <td className="p-3">{r.dosage}</td>
                    <td className="p-3">{r.stock_quantity}</td>
                    <td className="p-3">{r.stock_status}</td>
                    <td className="p-3">{r.exp_date}</td>
                    <td className="p-3">{r.expiry_status}</td>
                    <td className="p-3">{r.category_name}</td>
                    <td className="p-3">{r.supplier_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <small className="text-gray-200">
              نمایش {Math.min((page - 1) * perPage + 1, total)} - {Math.min(page * perPage, total)} از {total}
            </small>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border"
            >
              قبلی
            </button>
            <div className="px-3 py-1 rounded border">{page} / {pages}</div>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1 rounded border"
            >
              بعدی
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
