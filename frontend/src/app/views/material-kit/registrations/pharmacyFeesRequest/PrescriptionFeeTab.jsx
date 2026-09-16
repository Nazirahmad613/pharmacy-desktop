// src/app/views/material-kit/pharmacy/PharmacyFeeTab.jsx
// یا: src/app/views/material-kit/registrations/PharmacyFeeTab.jsx
// این کامپوننت را در تب Registration استفاده کنید

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function PharmacyFeeTab({ api }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    paid: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0,
    today: 0,
    today_amount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectData, setCollectData] = useState({
    discount: 0,
    paid_amount: 0,
    payment_method: "cash",
    note: "",
  });

  // ============ Effects ============
  useEffect(() => {
    fetchExecutions();
  }, [filter]);

  // ============ Fetch ============
  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "all") params.status = filter;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get("/pharmacy-executions", { params });
      const data = response?.data?.data || [];
      setExecutions(Array.isArray(data) ? data : []);

      // محاسبه آمار
      calculateStats(data);
    } catch (err) {
      console.error("خطا در دریافت فیس‌ها:", err);
      toast.error("❌ خطا در دریافت فیس‌های دواخانه");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (list) => {
    const totalAmount = list.reduce((s, e) => s + Number(e.total_amount || 0), 0);
    const totalPaid = list
      .filter((e) => e.status === "paid")
      .reduce((s, e) => s + Number(e.paid_amount || 0), 0);
    const totalRemaining = list
      .filter((e) => e.status !== "paid")
      .reduce((s, e) => s + Number(e.total_amount || 0), 0);

    const today = new Date().toDateString();
    const todayList = list.filter(
      (e) => new Date(e.created_at).toDateString() === today
    );

    setStats({
      total: list.length,
      pending: list.filter((e) => e.status === "pending").length,
      sent: list.filter((e) => e.status === "sent_to_registration").length,
      paid: list.filter((e) => e.status === "paid").length,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_remaining: totalRemaining,
      today: todayList.length,
      today_amount: todayList.reduce((s, e) => s + Number(e.total_amount || 0), 0),
    });
  };

  // ============ Actions ============
  const handleOpenCollect = (execution) => {
    setSelectedExecution(execution);
    setCollectData({
      discount: Number(execution.discount || 0),
      paid_amount: Number(execution.total_amount || 0) - Number(execution.discount || 0),
      payment_method: "cash",
      note: "",
    });
    setShowCollectModal(true);
  };

  const handleCollectFee = async () => {
    if (!selectedExecution) return;
    if (collectData.paid_amount <= 0) {
      toast.warning("مبلغ پرداخت شده باید بیشتر از صفر باشد");
      return;
    }

    try {
      const response = await api.post(
        `/pharmacy-executions/${selectedExecution.id}/collect-fee`,
        {
          discount: collectData.discount,
          paid_amount: collectData.paid_amount,
          payment_method: collectData.payment_method,
          note: collectData.note,
        }
      );

      if (response.data?.success) {
        toast.success("✅ فیس با موفقیت دریافت شد");
        setShowCollectModal(false);
        setSelectedExecution(null);
        await fetchExecutions();
      } else {
        toast.error(response.data?.message || "خطا در دریافت فیس");
      }
    } catch (err) {
      console.error("خطا:", err);
      toast.error(err.response?.data?.message || "خطا در دریافت فیس");
    }
  };

  const handlePrint = async (execution) => {
    try {
      const response = await api.get(`/pharmacy-executions/${execution.id}/print`);
      const data = response.data.data;
      const e = data.execution;

      const w = window.open("", "_blank", "width=800,height=700");
      if (w) {
        w.document.write(`
          <html dir="rtl">
            <head>
              <title>رسید فیس دواخانه</title>
              <style>
                body { font-family: Tahoma, sans-serif; padding: 30px; }
                .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
                .title { font-size: 26px; color: #10b981; font-weight: bold; }
                .section { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
                .section-title { font-weight: bold; color: #374151; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
                .label { color: #6b7280; font-weight: bold; }
                .value { color: #000; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
                th { background: #f5f5f5; }
                .total { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; margin-top: 20px; }
                .total-amount { font-size: 30px; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px dashed #ccc; font-size: 12px; color: #666; }
                .signature { display: flex; justify-content: space-between; margin-top: 40px; }
                .sig-box { width: 200px; text-align: center; }
                .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">💊 رسید فیس دواخانه</div>
                <div>${data.hospital_name || 'بیمارستان'}</div>
              </div>
              <div class="section">
                <div class="section-title">👤 معلومات بیمار</div>
                <div class="info-grid">
                  <div class="row"><span class="label">نام بیمار:</span><span class="value">${e.patient_name || '-'}</span></div>
                  <div class="row"><span class="label">شماره تذکره:</span><span class="value">${e.tazkira_number || '-'}</span></div>
                  <div class="row"><span class="label">سن:</span><span class="value">${e.patient_age ? e.patient_age + ' سال' : '-'}</span></div>
                  <div class="row"><span class="label">جنسیت:</span><span class="value">${e.patient_gender === 'male' ? 'مرد' : e.patient_gender === 'female' ? 'زن' : '-'}</span></div>
                  <div class="row"><span class="label">شماره تماس:</span><span class="value">${e.patient_phone || '-'}</span></div>
                  <div class="row"><span class="label">شماره مراجعه:</span><span class="value">#${e.reg_id || '-'}</span></div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">👨‍⚕️ معلومات داکتر</div>
                <div class="info-grid">
                  <div class="row"><span class="label">نام داکتر:</span><span class="value">${e.doctor_name || '-'}</span></div>
                  <div class="row"><span class="label">شماره رسید:</span><span class="value">${e.receipt_number || '-'}</span></div>
                  <div class="row"><span class="label">تاریخ:</span><span class="value">${new Date(e.created_at).toLocaleDateString('fa-IR')}</span></div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">💊 اقلام</div>
                <table>
                  <thead><tr><th>#</th><th>نام دوا</th><th>نوعیت</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
                  <tbody>
                    ${(e.items || []).map((it, i) => `
                      <tr>
                        <td>${i + 1}</td>
                        <td>${it.medication_name || '-'}</td>
                        <td>${it.medication_type || '-'}</td>
                        <td>${it.quantity || 0}</td>
                        <td>${Number(it.unit_price || 0).toLocaleString()}</td>
                        <td><b>${Number(it.total_price || 0).toLocaleString()}</b></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div class="total">
                <div>💰 مبلغ کل</div>
                <div class="total-amount">${Number(e.total_amount || 0).toLocaleString()} AFN</div>
              </div>
              <div class="signature">
                <div class="sig-box"><div class="sig-line">امضای دواخانه</div></div>
                <div class="sig-box"><div class="sig-line">امضای رسپشن</div></div>
              </div>
              <div class="footer">
                <p>تاریخ چاپ: ${data.print_date}</p>
              </div>
              <script>window.onload = function() { window.print(); }<\/script>
            </body>
          </html>
        `);
        w.document.close();
      }
    } catch (err) {
      console.error("خطای پرینت:", err);
      toast.error("خطا در پرینت");
    }
  };

  // ============ Filters ============
  const filteredExecutions = executions.filter((e) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (e.patient_name || "").toLowerCase().includes(s) ||
      (e.receipt_number || "").toLowerCase().includes(s) ||
      (e.tazkira_number || "").includes(s) ||
      (e.patient_phone || "").includes(s)
    );
  });

  // ============ Helpers ============
  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: "#fef3c7", color: "#92400e", text: "⏳ در انتظار پرداخت" },
      sent_to_registration: { bg: "#dbeafe", color: "#1e40af", text: "📤 ارسال به رسپشن" },
      paid: { bg: "#d1fae5", color: "#065f46", text: "✅ پرداخت شده" },
      cancelled: { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status };
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("fa-IR"); }
    catch { return "-"; }
  };

  const formatTime = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    } catch { return "-"; }
  };

  const getGenderLabel = (g) => {
    if (!g) return "-";
    const map = { male: "مرد", female: "زن", Male: "مرد", Female: "زن" };
    return map[g] || g;
  };

  // ============ Styles ============
  const styles = {
    container: { padding: "8px" },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
      borderRadius: "10px",
    },
    statBox: { textAlign: "center" },
    statValue: { fontSize: "20px", fontWeight: "bold" },
    statLabel: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    filters: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    filterBtn: {
      padding: "8px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      background: "white",
      transition: "all 0.2s",
    },
    filterBtnActive: {
      background: "#10b981",
      color: "white",
      borderColor: "#10b981",
    },
    searchInput: {
      padding: "8px 16px",
      border: "1px solid #374151",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "250px",
      flex: 1,
      background: "#1a1a2e",
      color: "white",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
      background: "white",
      borderRadius: "10px",
      overflow: "hidden",
    },
    th: {
      padding: "12px",
      textAlign: "right",
      background: "#f9fafb",
      color: "#374151",
      fontSize: "13px",
      fontWeight: "bold",
      borderBottom: "2px solid #e5e7eb",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #f3f4f6",
      color: "#1f2937",
    },
    btn: {
      padding: "6px 12px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
      marginRight: "4px",
    },
    modal: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      padding: "16px",
    },
    modalContent: {
      background: "white",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "600px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#374151",
      fontWeight: "bold",
      marginBottom: "6px",
      marginTop: "12px",
    },
  };

  // ============ Render ============
  return (
    <div style={styles.container}>
      {/* آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{stats.total}</div>
          <div style={styles.statLabel}>مجموع</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>{stats.pending}</div>
          <div style={styles.statLabel}>در انتظار</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{stats.sent}</div>
          <div style={styles.statLabel}>ارسال شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>{stats.paid}</div>
          <div style={styles.statLabel}>پرداخت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#10b981", fontSize: "16px" }}>
            {stats.total_amount.toLocaleString()}
          </div>
          <div style={styles.statLabel}>مبلغ کل</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#16a34a", fontSize: "16px" }}>
            {stats.total_paid.toLocaleString()}
          </div>
          <div style={styles.statLabel}>دریافت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ef4444", fontSize: "16px" }}>
            {stats.total_remaining.toLocaleString()}
          </div>
          <div style={styles.statLabel}>باقیمانده</div>
        </div>
      </div>

      {/* فیلترها */}
      <div style={styles.filters}>
        {[
          { key: "all", label: "📋 همه" },
          { key: "pending", label: "⏳ در انتظار" },
          { key: "sent_to_registration", label: "📤 ارسال شده" },
          { key: "paid", label: "✅ پرداخت شده" },
        ].map((f) => (
          <button
            key={f.key}
            style={{
              ...styles.filterBtn,
              ...(filter === f.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="🔍 جستجوی نام، تذکره، رسید..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
          onClick={fetchExecutions}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* لیست */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>هیچ فیس دواخانه‌ای یافت نشد</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>شماره رسید</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>تعداد اقلام</th>
                <th style={styles.th}>مبلغ کل</th>
                <th style={styles.th}>پرداخت شده</th>
                <th style={styles.th}>باقیمانده</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>تاریخ</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExecutions.map((e, idx) => {
                const badge = getStatusBadge(e.status);
                const isPaid = e.status === "paid";
                const remaining = Number(e.total_amount || 0) - Number(e.paid_amount || 0);

                return (
                  <tr key={e.id || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
                        {e.receipt_number || "-"}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👤 {e.patient_name || "-"}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        {e.patient_age && <span>🎂 {e.patient_age} سال </span>}
                        {e.patient_gender && <span>⚤ {getGenderLabel(e.patient_gender)}</span>}
                      </div>
                      {e.tazkira_number && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>🪪 {e.tazkira_number}</div>
                      )}
                      {e.patient_phone && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>📞 {e.patient_phone}</div>
                      )}
                      {e.reg_id && (
                        <div style={{ fontSize: "11px", color: "#3b82f6" }}>🔢 مراجعه: {e.reg_id}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👨‍⚕️ {e.doctor_name || "-"}</div>
                      {e.doctor_specialty && e.doctor_specialty !== "-" && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>🎓 {e.doctor_specialty}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>
                        💊 {(e.items || []).length} قلم
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: "#d48806", fontWeight: "bold" }}>
                      {Number(e.total_amount || 0).toLocaleString()} AFN
                    </td>
                    <td style={{ ...styles.td, color: "#16a34a" }}>
                      {Number(e.paid_amount || 0).toLocaleString()} AFN
                    </td>
                    <td style={{ ...styles.td, color: remaining <= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                      {remaining.toLocaleString()} AFN
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: badge.bg, color: badge.color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: "12px" }}>📅 {formatDate(e.created_at)}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>🕐 {formatTime(e.created_at)}</div>
                    </td>
                    <td style={styles.td}>
                      {!isPaid && (
                        <button
                          style={{ ...styles.btn, background: "#10b981", color: "white" }}
                          onClick={() => handleOpenCollect(e)}
                        >
                          💰 دریافت فیس
                        </button>
                      )}
                      <button
                        style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                        onClick={() => handlePrint(e)}
                      >
                        🖨️ پرینت
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* مودال دریافت فیس */}
      {/* ============================================================ */}
      {showCollectModal && selectedExecution && (
        <div style={styles.modal} onClick={() => setShowCollectModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>💰 دریافت فیس دواخانه</h2>

            {/* معلومات بیمار */}
            <div style={{
              padding: "12px",
              background: "#f0fdf4",
              borderRadius: "8px",
              border: "1px solid #10b981",
              marginBottom: "16px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                <div><b>نام بیمار:</b> {selectedExecution.patient_name || "-"}</div>
                <div><b>تذکره:</b> {selectedExecution.tazkira_number || "-"}</div>
                <div><b>سن:</b> {selectedExecution.patient_age || "-"}</div>
                <div><b>جنسیت:</b> {getGenderLabel(selectedExecution.patient_gender)}</div>
                <div><b>تماس:</b> {selectedExecution.patient_phone || "-"}</div>
                <div><b>داکتر:</b> {selectedExecution.doctor_name || "-"}</div>
              </div>
            </div>

            {/* مبالغ */}
            <div style={{
              padding: "12px",
              background: "#eff6ff",
              borderRadius: "8px",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>مبلغ کل:</span>
                <b style={{ color: "#d48806" }}>
                  {Number(selectedExecution.total_amount || 0).toLocaleString()} AFN
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>پرداخت شده قبلی:</span>
                <b style={{ color: "#16a34a" }}>
                  {Number(selectedExecution.paid_amount || 0).toLocaleString()} AFN
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid #e5e7eb" }}>
                <span>باقی‌مانده:</span>
                <b style={{ color: "#dc2626" }}>
                  {(Number(selectedExecution.total_amount || 0) - Number(selectedExecution.paid_amount || 0)).toLocaleString()} AFN
                </b>
              </div>
            </div>

            {/* فرم */}
            <div>
              <label style={styles.label}>تخفیف (AFN)</label>
              <input
                type="number"
                style={styles.input}
                value={collectData.discount}
                onChange={(e) =>
                  setCollectData({
                    ...collectData,
                    discount: Number(e.target.value) || 0,
                    paid_amount:
                      Number(selectedExecution.total_amount || 0) - (Number(e.target.value) || 0),
                  })
                }
                min="0"
              />

              <label style={styles.label}>مبلغ پرداخت شده (AFN)</label>
              <input
                type="number"
                style={styles.input}
                value={collectData.paid_amount}
                onChange={(e) =>
                  setCollectData({ ...collectData, paid_amount: Number(e.target.value) || 0 })
                }
                min="0"
              />

              <label style={styles.label}>روش پرداخت</label>
              <select
                style={styles.input}
                value={collectData.payment_method}
                onChange={(e) =>
                  setCollectData({ ...collectData, payment_method: e.target.value })
                }
              >
                <option value="cash">نقدی</option>
                <option value="card">کارت بانکی</option>
                <option value="online">آنلاین</option>
                <option value="insurance">بیمه</option>
              </select>

              <label style={styles.label}>یادداشت</label>
              <textarea
                style={{ ...styles.input, minHeight: "60px" }}
                value={collectData.note}
                onChange={(e) => setCollectData({ ...collectData, note: e.target.value })}
                placeholder="یادداشت اختیاری..."
              />
            </div>

            {/* مبلغ نهایی */}
            <div style={{
              marginTop: "16px",
              padding: "16px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ fontSize: "14px" }}>💰 مبلغ نهایی دریافتی:</span>
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                {Number(collectData.paid_amount || 0).toLocaleString()} AFN
              </span>
            </div>

            {/* دکمه‌ها */}
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "10px 24px" }}
                onClick={() => setShowCollectModal(false)}
              >
                انصراف
              </button>
              <button
                style={{ ...styles.btn, background: "#10b981", color: "white", padding: "10px 24px" }}
                onClick={handleCollectFee}
                disabled={loading}
              >
                {loading ? "⏳ در حال ثبت..." : "✅ ثبت دریافت فیس"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}