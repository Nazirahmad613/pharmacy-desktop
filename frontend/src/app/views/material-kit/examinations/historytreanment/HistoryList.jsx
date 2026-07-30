import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function HistoryList({ api, onSelectHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // دریافت تاریخچه معالجات
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

  // فیلتر کردن بر اساس جستجو و تاریخ
  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      (item.patient?.first_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.patient?.last_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.patient?.mobile || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.visit_number || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = filterDate ? item.visit_date === filterDate : true;
    
    return matchesSearch && matchesDate;
  });

  // فرمت تاریخ
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("fa-IR");
  };

  // فرمت زمان
  const formatTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("fa-IR", {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // محاسبه مدت زمان معالجه
  const calculateDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return "-";
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} دقیقه`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} ساعت و ${minutes} دقیقه`;
    }
  };

  // وضعیت معالجه
  const getStatusBadge = (status) => {
    const statusMap = {
      'Doctor': { text: "در حال معالجه", color: "#3b82f6", icon: "🔄" },
      'Completed': { text: "تکمیل شده", color: "#10b981", icon: "✅" },
      'Laboratory': { text: "در لابراتوار", color: "#f59e0b", icon: "🔬" },
      'Pending': { text: "در انتظار", color: "#6b7280", icon: "⏳" },
      'Cancelled': { text: "لغو شده", color: "#ef4444", icon: "❌" }
    };
    const statusInfo = statusMap[status] || statusMap.Pending;
    return (
      <span style={{
        backgroundColor: statusInfo.color,
        color: "white",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "bold",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px"
      }}>
        {statusInfo.icon} {statusInfo.text}
      </span>
    );
  };

  // مشاهده جزئیات
  const viewDetails = (item) => {
    setSelectedItem(item);
    setShowModal(true);
    if (onSelectHistory) {
      onSelectHistory(item);
    }
  };

  // برگشت به معاینه
  const returnToTreatment = async (historyId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مریض را به معاینه برگردانید؟")) {
      return;
    }

    try {
      const response = await api.post(`/doctor/return-to-treatment/${historyId}`);
      toast.success("✅ مریض به معاینه برگشت داده شد");
      
      // حذف از لیست
      setHistory(prev => prev.filter(item => item.id !== historyId));
      setShowModal(false);
      
      // رفرش کردن لیست
      fetchHistory();
    } catch (err) {
      console.error("خطا در برگشت به معاینه:", err);
      toast.error("❌ خطا در برگشت به معاینه");
    }
  };

  // بستن مودال
  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0", color: "#9ca3af" }}>
        <div style={{ fontSize: "30px", marginBottom: "10px" }}>⏳</div>
        <p>در حال بارگذاری تاریخچه...</p>
      </div>
    );
  }

  return (
    <div>
      {/* هدر و فیلترها */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <h3 style={{ color: "#60a5fa", margin: 0 }}>
          📜 تاریخچه معالجات ({filteredHistory.length})
        </h3>
        
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 جستجوی مریض..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 15px",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "#1f2937",
              color: "white",
              outline: "none",
              minWidth: "200px"
            }}
          />
          
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "8px 15px",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "#1f2937",
              color: "white",
              outline: "none"
            }}
          />
          
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterDate("");
            }}
            style={{
              padding: "8px 15px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#6b7280",
              color: "white",
              cursor: "pointer"
            }}
          >
            ↺ پاک کردن
          </button>

          <button
            onClick={fetchHistory}
            style={{
              padding: "8px 15px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#3b82f6",
              color: "white",
              cursor: "pointer"
            }}
          >
            🔄 بروزرسانی
          </button>
        </div>
      </div>

      {/* جدول تاریخچه */}
      {filteredHistory.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 0",
          color: "#6b7280"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "15px" }}>📭</div>
          <p>هیچ تاریخچه معالجه‌ای یافت نشد</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px"
          }}>
            <thead>
              <tr style={{
                backgroundColor: "#374151",
                borderBottom: "2px solid #4b5563"
              }}>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>#</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>نام مریض</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>شماره ویزیت</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>تاریخ معالجه</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>تشخیص</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>مدت زمان</th>
                <th style={{ padding: "12px 15px", textAlign: "right" }}>وضعیت</th>
                <th style={{ padding: "12px 15px", textAlign: "center" }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item, index) => (
                <tr
                  key={item.id || index}
                  style={{
                    borderBottom: "1px solid #374151",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#374151"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <td style={{ padding: "12px 15px", color: "#9ca3af" }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "12px 15px" }}>
                    <strong>
                      {item.patient?.first_name || ""} {item.patient?.last_name || ""}
                    </strong>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      📱 {item.patient?.mobile || "---"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      🆔 {item.patient?.national_id || "---"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 15px", color: "#d1d5db" }}>
                    <strong>{item.visit_number || "---"}</strong>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      🎫 {item.queue_number || "---"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 15px", color: "#d1d5db" }}>
                    {formatDate(item.visit_date)}
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      🕐 {formatTime(item.treatment_started_at)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 15px", maxWidth: "150px" }}>
                    <span style={{ 
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {item.diagnosis || "تشخیص داده نشده"}
                    </span>
                    {item.note && (
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        📝 {item.note}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 15px", color: "#d1d5db" }}>
                    {calculateDuration(item.treatment_started_at, item.treatment_completed_at)}
                  </td>
                  <td style={{ padding: "12px 15px" }}>
                    {getStatusBadge(item.visit_status)}
                  </td>
                  <td style={{ padding: "12px 15px", textAlign: "center" }}>
                    <button
                      onClick={() => viewDetails(item)}
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        marginRight: "5px"
                      }}
                    >
                      👁 مشاهده
                    </button>
                    <button
                      onClick={() => returnToTreatment(item.id)}
                      style={{
                        backgroundColor: "#f59e0b",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "5px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                      title="برگشت به معاینه"
                    >
                      ↩️ برگشت
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal نمایش جزئیات */}
      {showModal && selectedItem && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999999,
          padding: "20px"
        }} onClick={closeModal}>
          <div style={{
            backgroundColor: "#1f2937",
            borderRadius: "12px",
            padding: "30px",
            maxWidth: "700px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            border: "2px solid #8b5cf6",
            position: "relative"
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                backgroundColor: "transparent",
                border: "none",
                color: "#9ca3af",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <h3 style={{ color: "#60a5fa", marginBottom: "20px" }}>
              📋 جزئیات کامل تاریخچه معالجه
            </h3>

            <div style={{ display: "grid", gap: "12px" }}>
              {/* اطلاعات مریض */}
              <div style={{ 
                backgroundColor: "#374151", 
                padding: "15px", 
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <h4 style={{ color: "#60a5fa", marginBottom: "10px" }}>👤 اطلاعات مریض</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ color: "#9ca3af" }}>نام:</span>
                    <span style={{ color: "white", marginRight: "8px", fontWeight: "bold" }}>
                      {selectedItem.patient?.first_name} {selectedItem.patient?.last_name}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>نام پدر:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.patient?.father_name || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>شماره تماس:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.patient?.mobile || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>کد ملی:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.patient?.national_id || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>جنسیت:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.patient?.gender === "male" ? "مرد" : 
                       selectedItem.patient?.gender === "female" ? "زن" : "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>گروه خونی:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.patient?.blood_group || "---"}
                    </span>
                  </div>
                </div>
              </div>

              {/* اطلاعات معالجه */}
              <div style={{ 
                backgroundColor: "#374151", 
                padding: "15px", 
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <h4 style={{ color: "#60a5fa", marginBottom: "10px" }}>🩺 اطلاعات معالجه</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ color: "#9ca3af" }}>شماره ویزیت:</span>
                    <span style={{ color: "white", marginRight: "8px", fontWeight: "bold" }}>
                      {selectedItem.visit_number || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>شماره صف:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.queue_number || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>تاریخ ویزیت:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {formatDate(selectedItem.visit_date)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>هزینه ویزیت:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.registration_fee ? `${selectedItem.registration_fee} افغانی` : "---"}
                    </span>
                  </div>
                </div>
              </div>

              {/* علائم حیاتی */}
              <div style={{ 
                backgroundColor: "#374151", 
                padding: "15px", 
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <h4 style={{ color: "#60a5fa", marginBottom: "10px" }}>📊 علائم حیاتی</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ color: "#9ca3af" }}>وزن:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.weight ? `${selectedItem.weight} کیلو` : "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>فشار خون:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.blood_pressure || "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>درجه حرارت:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.temperature ? `${selectedItem.temperature}°C` : "---"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>اکسیژن:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {selectedItem.oxygen ? `${selectedItem.oxygen}%` : "---"}
                    </span>
                  </div>
                </div>
              </div>

              {/* تشخیص و یادداشت */}
              <div style={{ 
                backgroundColor: "#374151", 
                padding: "15px", 
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <h4 style={{ color: "#60a5fa", marginBottom: "10px" }}>📝 تشخیص و یادداشت‌ها</h4>
                <div>
                  <span style={{ color: "#9ca3af" }}>تشخیص:</span>
                  <div style={{ color: "white", marginTop: "5px", padding: "10px", backgroundColor: "#1f2937", borderRadius: "4px" }}>
                    {selectedItem.diagnosis || "تشخیص داده نشده"}
                  </div>
                </div>
                {selectedItem.note && (
                  <div style={{ marginTop: "10px" }}>
                    <span style={{ color: "#9ca3af" }}>یادداشت:</span>
                    <div style={{ color: "white", marginTop: "5px", padding: "10px", backgroundColor: "#1f2937", borderRadius: "4px" }}>
                      {selectedItem.note}
                    </div>
                  </div>
                )}
              </div>

              {/* زمان‌ها */}
              <div style={{ 
                backgroundColor: "#374151", 
                padding: "15px", 
                borderRadius: "8px"
              }}>
                <h4 style={{ color: "#60a5fa", marginBottom: "10px" }}>⏱ زمان‌ها</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ color: "#9ca3af" }}>شروع معالجه:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {formatTime(selectedItem.treatment_started_at)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>ختم معالجه:</span>
                    <span style={{ color: "white", marginRight: "8px" }}>
                      {formatTime(selectedItem.treatment_completed_at)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>مدت زمان:</span>
                    <span style={{ color: "white", marginRight: "8px", fontWeight: "bold" }}>
                      {calculateDuration(selectedItem.treatment_started_at, selectedItem.treatment_completed_at)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9ca3af" }}>وضعیت:</span>
                    <span style={{ marginRight: "8px" }}>
                      {getStatusBadge(selectedItem.visit_status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => returnToTreatment(selectedItem.id)}
                style={{
                  padding: "10px 30px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#f59e0b",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                ↩️ برگشت به معاینه
              </button>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 30px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#6b7280",
                  color: "white",
                  cursor: "pointer"
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