// src/app/pages/treatment/history/HistoryList.jsx
// استایل کاملاً مطابق PharmacyFeeTab

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function HistoryList({ api, onSelectHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get("/doctor/treatment-history");
      let data = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      setHistory(data);
    } catch (err) {
      console.error("خطا در دریافت تاریخچه:", err);
      toast.error("❌ خطا در دریافت تاریخچه معالجات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      (item.patient?.first_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.patient?.last_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.patient?.mobile || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.visit_number || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? item.visit_date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("fa-IR");
    } catch {
      return "-";
    }
  };

  const formatTime = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const calculateDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return "-";
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    if (diffMinutes < 60) return `${diffMinutes} دقیقه`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours} ساعت و ${minutes} دقیقه`;
  };

  const getStatusBadge = (status) => {
    const map = {
      Doctor: { bg: "#dbeafe", color: "#1e40af", text: "🔄 در حال معالجه" },
      Completed: { bg: "#d1fae5", color: "#065f46", text: "✅ تکمیل شده" },
      Laboratory: { bg: "#fef3c7", color: "#92400e", text: "🔬 در لابراتوار" },
      Pending: { bg: "#f3f4f6", color: "#374151", text: "⏳ در انتظار" },
      Cancelled: { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
    };
    return map[status] || map.Pending;
  };

  const viewDetails = (item) => {
    setSelectedItem(item);
    setShowModal(true);
    if (onSelectHistory) onSelectHistory(item);
  };

  const returnToTreatment = async (historyId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مریض را به معاینه برگردانید؟")) return;
    try {
      await api.post(`/doctor/return-to-treatment/${historyId}`);
      toast.success("✅ مریض به معاینه برگشت داده شد");
      setHistory((prev) => prev.filter((item) => item.id !== historyId));
      setShowModal(false);
      fetchHistory();
    } catch (err) {
      console.error("خطا در برگشت به معاینه:", err);
      toast.error("❌ خطا در برگشت به معاینه");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  // ============ Styles (مطابق PharmacyFeeTab) ============
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
      flexDirection: "row-reverse",
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
      maxWidth: "800px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    patientInfoCard: {
      padding: "16px",
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      borderRadius: "10px",
      border: "2px solid #10b981",
      marginBottom: "16px",
    },
    patientInfoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "12px",
    },
    infoItem: {
      background: "white",
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1px solid #d1fae5",
    },
    infoLabel: {
      fontSize: "11px",
      color: "#059669",
      fontWeight: "bold",
      display: "block",
      marginBottom: "4px",
    },
    infoValue: { fontSize: "14px", color: "#1f2937", fontWeight: "bold" },
    sectionCard: {
      background: "white",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    input: {
      padding: "8px 16px",
      border: "1px solid #374151",
      borderRadius: "8px",
      fontSize: "14px",
      background: "#1a1a2e",
      color: "white",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#374151",
      fontWeight: "bold",
      marginBottom: "6px",
    },
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        ⏳ در حال بارگذاری...
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "📋 همه", count: history.length },
    {
      key: "completed",
      label: "✅ تکمیل شده",
      count: history.filter((h) => h.visit_status === "Completed").length,
    },
    {
      key: "doctor",
      label: "🔄 در حال معالجه",
      count: history.filter((h) => h.visit_status === "Doctor").length,
    },
    {
      key: "cancelled",
      label: "❌ لغو شده",
      count: history.filter((h) => h.visit_status === "Cancelled").length,
    },
  ];

  const getActiveList = () => {
    let list = filteredHistory;
    if (activeTab === "completed") list = list.filter((h) => h.visit_status === "Completed");
    else if (activeTab === "doctor") list = list.filter((h) => h.visit_status === "Doctor");
    else if (activeTab === "cancelled") list = list.filter((h) => h.visit_status === "Cancelled");
    return list;
  };

  const activeList = getActiveList();

  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{history.length}</div>
          <div style={styles.statLabel}>کل معالجات</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>
            {history.filter((h) => h.visit_status === "Completed").length}
          </div>
          <div style={styles.statLabel}>تکمیل شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>
            {history.filter((h) => h.visit_status === "Doctor").length}
          </div>
          <div style={styles.statLabel}>در حال معالجه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ef4444" }}>
            {history.filter((h) => h.visit_status === "Cancelled").length}
          </div>
          <div style={styles.statLabel}>لغو شده</div>
        </div>
      </div>

      {/* ====== نوار فیلترها (تب‌های راست‌چین) ====== */}
      <div style={styles.filters}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.filterBtn,
              ...(activeTab === tab.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        <input
          type="text"
          placeholder="🔍 جستجوی مریض، شماره ویزیت..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={styles.input}
        />
        <button
          onClick={() => {
            setSearchTerm("");
            setFilterDate("");
          }}
          style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "8px 16px" }}
        >
          ↺ پاک کردن
        </button>
        <button
          onClick={fetchHistory}
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* ====== جدول ====== */}
      {activeList.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#6b7280",
            background: "white",
            borderRadius: "10px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>هیچ تاریخچه‌ای با این فیلتر یافت نشد</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>نام مریض</th>
                <th style={styles.th}>شماره ویزیت</th>
                <th style={styles.th}>تاریخ</th>
                <th style={styles.th}>تشخیص</th>
                <th style={styles.th}>مدت زمان</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((item, index) => {
                const badge = getStatusBadge(item.visit_status);
                return (
                  <tr key={item.id || index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>
                        {item.patient?.first_name || ""} {item.patient?.last_name || ""}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        📱 {item.patient?.mobile || "---"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        🆔 {item.patient?.national_id || "---"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>{item.visit_number || "---"}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        🎫 {item.queue_number || "---"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>{formatDate(item.visit_date)}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        🕐 {formatTime(item.treatment_started_at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ maxWidth: "200px", fontSize: "12px" }}>
                        {item.diagnosis || "تشخیص داده نشده"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {calculateDuration(item.treatment_started_at, item.treatment_completed_at)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, background: "#3b82f6", color: "white" }}
                        onClick={() => viewDetails(item)}
                      >
                        👁 مشاهده
                      </button>
                      <button
                        style={{ ...styles.btn, background: "#f59e0b", color: "white" }}
                        onClick={() => returnToTreatment(item.id)}
                      >
                        ↩️ برگشت
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== مودال جزئیات (سفید مثل PharmacyFeeTab) ====== */}
      {showModal && selectedItem && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>
              📋 جزئیات تاریخچه معالجه
            </h2>

            {/* کارت معلومات بیمار */}
            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                👤 معلومات بیمار
              </h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>نام کامل</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient?.first_name} {selectedItem.patient?.last_name}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>نام پدر</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient?.father_name || "---"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره تماس</span>
                  <div style={styles.infoValue}>{selectedItem.patient?.mobile || "---"}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>کد ملی</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient?.national_id || "---"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>جنسیت</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient?.gender === "male"
                      ? "مرد"
                      : selectedItem.patient?.gender === "female"
                      ? "زن"
                      : "---"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>گروه خونی</span>
                  <div style={styles.infoValue}>
                    {selectedItem.patient?.blood_group || "---"}
                  </div>
                </div>
              </div>
            </div>

            {/* اطلاعات معالجه */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                🩺 اطلاعات معالجه
              </h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره ویزیت</span>
                  <div style={styles.infoValue}>{selectedItem.visit_number || "---"}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره صف</span>
                  <div style={styles.infoValue}>{selectedItem.queue_number || "---"}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>تاریخ ویزیت</span>
                  <div style={styles.infoValue}>{formatDate(selectedItem.visit_date)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>هزینه ویزیت</span>
                  <div style={styles.infoValue}>
                    {selectedItem.registration_fee
                      ? `${selectedItem.registration_fee} افغانی`
                      : "---"}
                  </div>
                </div>
              </div>
            </div>

            {/* علائم حیاتی */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                📊 علائم حیاتی
              </h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>وزن</span>
                  <div style={styles.infoValue}>
                    {selectedItem.weight ? `${selectedItem.weight} کیلو` : "---"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>فشار خون</span>
                  <div style={styles.infoValue}>{selectedItem.blood_pressure || "---"}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>درجه حرارت</span>
                  <div style={styles.infoValue}>
                    {selectedItem.temperature ? `${selectedItem.temperature}°C` : "---"}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>اکسیژن</span>
                  <div style={styles.infoValue}>
                    {selectedItem.oxygen ? `${selectedItem.oxygen}%` : "---"}
                  </div>
                </div>
              </div>
            </div>

            {/* تشخیص و یادداشت */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                📝 تشخیص و یادداشت‌ها
              </h3>
              <div style={{ ...styles.infoItem, marginBottom: "10px" }}>
                <span style={styles.infoLabel}>تشخیص</span>
                <div style={{ color: "#1f2937", marginTop: "5px" }}>
                  {selectedItem.diagnosis || "تشخیص داده نشده"}
                </div>
              </div>
              {selectedItem.note && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>یادداشت</span>
                  <div style={{ color: "#1f2937", marginTop: "5px" }}>
                    {selectedItem.note}
                  </div>
                </div>
              )}
            </div>

            {/* زمان‌ها */}
            <div style={styles.sectionCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                ⏱ زمان‌ها
              </h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شروع معالجه</span>
                  <div style={styles.infoValue}>
                    {formatTime(selectedItem.treatment_started_at)}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>ختم معالجه</span>
                  <div style={styles.infoValue}>
                    {formatTime(selectedItem.treatment_completed_at)}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>مدت زمان</span>
                  <div style={styles.infoValue}>
                    {calculateDuration(
                      selectedItem.treatment_started_at,
                      selectedItem.treatment_completed_at
                    )}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>وضعیت</span>
                  <div style={{ marginTop: "4px" }}>
                    {(() => {
                      const b = getStatusBadge(selectedItem.visit_status);
                      return (
                        <span
                          style={{
                            background: b.bg,
                            color: b.color,
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          {b.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => returnToTreatment(selectedItem.id)}
                style={{
                  ...styles.btn,
                  background: "#f59e0b",
                  color: "white",
                  padding: "10px 24px",
                }}
              >
                ↩️ برگشت به معاینه
              </button>
              <button
                onClick={closeModal}
                style={{
                  ...styles.btn,
                  background: "#6b7280",
                  color: "white",
                  padding: "10px 24px",
                }}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}