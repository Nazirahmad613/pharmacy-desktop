// src/app/pages/radiologyFeesRequest/RadiologyFeeTab.jsx
// استایل کاملاً هماهنگ با PharmacyFeeTab (صفحه اخذ فیس نسخه)

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function RadiologyFeeTab(props) {
  const { api, regId } = props;
  const [loading, setLoading] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [groupedRequests, setGroupedRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // فرم اخذ فیس
  const [feeFormData, setFeeFormData] = useState({
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: "",
  });

  // ============ بارگذاری اولیه ============
  useEffect(() => {
    fetchAllRequests();
    fetchFeeRecords();
  }, []);

  // ============ دریافت تمام درخواست‌های رادیولوژی ============
  const fetchAllRequests = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get("/radiology-fees/all-requests");
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        setGroupedRequests(data.grouped_by_reg_id || []);
        setDebugInfo({
          totalRequests: data.total_requests || 0,
          totalUnpaid: data.total_unpaid || 0,
          totalPaid: data.total_paid || 0,
          totalRegistrations: data.total_registrations || 0,
          timestamp: new Date().toISOString(),
        });
      } else {
        toast.warning("داده‌ای دریافت نشد");
      }
    } catch (err) {
      console.error("❌ خطا در دریافت درخواست‌ها:", err);
      setFetchError(err.message);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت فیس‌های ثبت شده رادیولوژی ============
  const fetchFeeRecords = async () => {
    try {
      const response = await api.get("/radiology-fees");
      let fees = [];
      if (response.data?.success && Array.isArray(response.data?.data?.data)) {
        fees = response.data.data.data;
      } else if (response.data?.success && Array.isArray(response.data?.data)) {
        fees = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        fees = response.data.data;
      } else if (Array.isArray(response.data)) {
        fees = response.data;
      }
      setFeeRecords(fees);
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
    }
  };

  // ============ باز کردن فرم اخذ فیس ============
  const handleOpenFeeForm = (request) => {
    setSelectedRequest(request);
    setEditingFee(null);
    const defaultAmount = request.amount || 0;
    setFeeFormData({
      amount: defaultAmount.toString(),
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: `رادیولوژی: ${request.radiology_type_label || request.radiology_type || ""} - ${request.body_part || ""}`,
      note: `درخواست بارکد: ${request.barcode || ""}`,
    });
    setShowFeeForm(true);
  };

  // ============ باز کردن فرم ویرایش فیس ============
  const handleOpenEditFeeForm = (fee) => {
    setEditingFee(fee);
    setSelectedRequest(null);
    setFeeFormData({
      amount: fee.amount?.toString() || "",
      paid_amount: fee.paid_amount?.toString() || "",
      discount: fee.discount?.toString() || "",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || "",
    });
    setShowFeeForm(true);
  };

  // ============ ثبت فیس ============
  const handleSubmitFee = async (e) => {
    e.preventDefault();
    if (!feeFormData.amount || parseFloat(feeFormData.amount) <= 0) {
      toast.warning("⚠️ لطفاً مبلغ کل را وارد کنید");
      return;
    }
    if (!selectedRequest && !editingFee) {
      toast.error("❌ هیچ درخواستی انتخاب نشده است");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        radiology_request_id: selectedRequest ? selectedRequest.id : null,
        amount: parseFloat(feeFormData.amount),
        paid_amount: parseFloat(feeFormData.paid_amount) || 0,
        discount: parseFloat(feeFormData.discount) || 0,
        payment_method: feeFormData.payment_method,
        description: feeFormData.description,
        note: feeFormData.note,
      };
      let response;
      if (editingFee) {
        response = await api.put(`/radiology-fees/${editingFee.id}`, payload);
        toast.success("✅ فیس رادیولوژی با موفقیت ویرایش شد");
      } else {
        response = await api.post(`/radiology-fees/registration/${selectedRequest.reg_id}`, payload);
        toast.success("✅ فیس رادیولوژی با موفقیت ثبت شد");
      }
      await fetchAllRequests();
      await fetchFeeRecords();
      handleCloseForm();
    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      if (err.response?.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          toast.error(`❌ ${field}: ${messages[0]}`);
        });
      } else {
        toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در ثبت فیس"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ حذف فیس ============
  const handleDeleteFee = async (feeId) => {
    if (!feeId) {
      toast.error("❌ شناسه فیس معتبر نیست");
      return;
    }
    if (!window.confirm("⚠️ آیا مطمئن هستید که می‌خواهید این فیس را حذف کنید؟")) return;
    setLoading(true);
    try {
      await api.delete(`/radiology-fees/${feeId}`);
      toast.success("✅ فیس رادیولوژی با موفقیت حذف شد");
      await fetchAllRequests();
      await fetchFeeRecords();
    } catch (err) {
      console.error("❌ خطا در حذف فیس:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در حذف فیس"}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ بستن فرم ============
  const handleCloseForm = () => {
    setShowFeeForm(false);
    setSelectedRequest(null);
    setEditingFee(null);
    setFeeFormData({
      amount: "",
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: "",
      note: "",
    });
  };

  // ============ Helper Functions ============
  const getMethodLabel = (method) => {
    const methods = { cash: "نقدی", card: "کارت بانکی", online: "آنلاین", insurance: "بیمه" };
    return methods[method] || method || "-";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try { return new Date(date).toLocaleDateString("fa-IR"); } catch { return "-"; }
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    try { return new Date(date).toLocaleString("fa-IR"); } catch { return "-"; }
  };

  const calculateRemaining = (amount, paid, discount) => {
    const discountAmount = amount * (discount / 100);
    return amount - paid - discountAmount;
  };

  const getPaymentStatus = (amount, paid, discount) => {
    const remaining = calculateRemaining(amount, paid, discount);
    if (remaining <= 0) return { label: "پرداخت کامل", color: "#22c55e", bg: "#d1fae5", textColor: "#065f46" };
    if (paid > 0) return { label: "پرداخت ناقص", color: "#f97316", bg: "#ffedd5", textColor: "#9a3412" };
    return { label: "در انتظار پرداخت", color: "#f59e0b", bg: "#fef3c7", textColor: "#92400e" };
  };

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const hasFee = (request) => {
    if (request.has_fee !== undefined) return request.has_fee === true;
    return request.fee_id !== null && request.fee_id !== undefined && request.fee_id !== 0;
  };

  const getFeeForRequest = (requestId) => {
    return feeRecords.find((fee) => fee.radiology_request_id === requestId);
  };

  const getPatientFullName = (request) => {
    if (request.patient?.full_name) return request.patient.full_name;
    if (request.patient?.first_name) {
      return `${request.patient.first_name || ""} ${request.patient.last_name || ""}`.trim() || "نامشخص";
    }
    return request.patient_name || "نامشخص";
  };

  const getPatientAge = (request) => {
    if (request.patient?.age) return `${request.patient.age} سال`;
    return "-";
  };

  const getPatientGender = (request) => {
    let gender = request.patient?.gender;
    if (gender) {
      const genderMap = { Male: "مرد", male: "مرد", Female: "زن", female: "زن", other: "دیگر" };
      return genderMap[gender] || gender;
    }
    return "-";
  };

  // ============ فیلترها ============
  const pendingFeeRequests = paidRequests.filter((r) => {
    const fee = getFeeForRequest(r.id);
    if (!fee) return false;
    const status = getPaymentStatus(toNumber(fee.amount), toNumber(fee.paid_amount), toNumber(fee.discount));
    return status.label === "در انتظار پرداخت";
  });

  const partialFeeRequests = paidRequests.filter((r) => {
    const fee = getFeeForRequest(r.id);
    if (!fee) return false;
    const status = getPaymentStatus(toNumber(fee.amount), toNumber(fee.paid_amount), toNumber(fee.discount));
    return status.label === "پرداخت ناقص";
  });

  const fullPaidRequests = paidRequests.filter((r) => {
    const fee = getFeeForRequest(r.id);
    if (!fee) return false;
    const status = getPaymentStatus(toNumber(fee.amount), toNumber(fee.paid_amount), toNumber(fee.discount));
    return status.label === "پرداخت کامل";
  });

  const filterBySearch = (requests) => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.trim().toLowerCase();
    return requests.filter((r) => {
      const patientName = getPatientFullName(r).toLowerCase();
      return (
        patientName.includes(term) ||
        (r.radiology_type_label || r.radiology_type || "").toLowerCase().includes(term) ||
        (r.body_part || "").toLowerCase().includes(term) ||
        (r.barcode || "").toLowerCase().includes(term) ||
        String(r.reg_id || "").includes(term)
      );
    });
  };

  const getActiveList = () => {
    switch (activeTab) {
      case "unpaid": return filterBySearch(unpaidRequests);
      case "pending": return filterBySearch(pendingFeeRequests);
      case "partial": return filterBySearch(partialFeeRequests);
      case "paid": return filterBySearch(fullPaidRequests);
      case "all": return filterBySearch(allRequests);
      default: return filterBySearch(allRequests);
    }
  };

  const activeList = getActiveList();

  // ============ استایل‌ها (دقیقاً مثل PharmacyFeeTab) ============
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

  // ============ تب‌ها ============
  const tabs = [
    { key: "all", label: "📋 همه", count: allRequests.length },
    { key: "unpaid", label: "⏳ بدون فیس", count: unpaidRequests.length },
    { key: "pending", label: "🟠 در انتظار پرداخت", count: pendingFeeRequests.length },
    { key: "partial", label: "🔵 پرداخت ناقص", count: partialFeeRequests.length },
    { key: "paid", label: "✅ پرداخت کامل", count: fullPaidRequests.length },
  ];

  // ============ Badge ============
  const getStatusBadge = (request) => {
    if (!hasFee(request)) {
      return { bg: "#fef3c7", color: "#92400e", text: "⏳ بدون فیس" };
    }
    const fee = getFeeForRequest(request.id);
    if (!fee) return { bg: "#f3f4f6", color: "#374151", text: "دارای فیس" };
    const status = getPaymentStatus(toNumber(fee.amount), toNumber(fee.paid_amount), toNumber(fee.discount));
    return { bg: status.bg, color: status.textColor, text: status.label };
  };

  // ============ رندر ============
  return (
    <div style={styles.container}>
      {/* آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{allRequests.length}</div>
          <div style={styles.statLabel}>کل درخواست‌ها</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>{unpaidRequests.length}</div>
          <div style={styles.statLabel}>بدون فیس</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f97316" }}>{pendingFeeRequests.length}</div>
          <div style={styles.statLabel}>در انتظار</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{partialFeeRequests.length}</div>
          <div style={styles.statLabel}>ناقص</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>{fullPaidRequests.length}</div>
          <div style={styles.statLabel}>پرداخت کامل</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#10b981", fontSize: "16px" }}>
            {feeRecords.reduce((s, f) => s + toNumber(f.amount), 0).toLocaleString()}
          </div>
          <div style={styles.statLabel}>مبلغ کل</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#16a34a", fontSize: "16px" }}>
            {feeRecords.reduce((s, f) => s + toNumber(f.paid_amount), 0).toLocaleString()}
          </div>
          <div style={styles.statLabel}>دریافت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ef4444", fontSize: "16px" }}>
            {feeRecords
              .reduce(
                (s, f) =>
                  s +
                  calculateRemaining(toNumber(f.amount), toNumber(f.paid_amount), toNumber(f.discount)),
                0
              )
              .toLocaleString()}
          </div>
          <div style={styles.statLabel}>باقیمانده</div>
        </div>
      </div>

      {/* فیلترها (راست‌چین) */}
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
          placeholder="🔍 جستجوی نام، نوع رادیولوژی، بارکد، شماره مراجعه..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
          onClick={() => { fetchAllRequests(); fetchFeeRecords(); }}
          disabled={loading}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {fetchError && (
        <div style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#fee2e2",
          borderRadius: "6px",
          color: "#991b1b",
          fontSize: "12px",
          border: "1px solid #fca5a5",
        }}>
          ⚠️ خطا: {fetchError}
        </div>
      )}

      {/* لیست (جدول) */}
      {loading || loadingRequests ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : activeList.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>
            {activeTab === "unpaid" && "هیچ درخواست بدون فیس یافت نشد"}
            {activeTab === "pending" && "هیچ درخواست در انتظار پرداخت یافت نشد"}
            {activeTab === "partial" && "هیچ درخواست با پرداخت ناقص یافت نشد"}
            {activeTab === "paid" && "هیچ درخواست با پرداخت کامل یافت نشد"}
            {activeTab === "all" && "هیچ درخواست رادیولوژی یافت نشد"}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>شماره مراجعه</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>نوع رادیولوژی</th>
                <th style={styles.th}>بارکد</th>
                <th style={styles.th}>مبلغ کل</th>
                <th style={styles.th}>پرداخت شده</th>
                <th style={styles.th}>باقیمانده</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((request, idx) => {
                const hasFeeRecord = hasFee(request);
                const feeInfo = getFeeForRequest(request.id);
                const badge = getStatusBadge(request);
                const amount = toNumber(feeInfo?.amount);
                const paidAmt = toNumber(feeInfo?.paid_amount);
                const discount = toNumber(feeInfo?.discount);
                const remaining = calculateRemaining(amount, paidAmt, discount);
                const isFullPaid = feeInfo && remaining <= 0;

                return (
                  <tr key={request.id || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
                        #{request.reg_id || "-"}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👤 {getPatientFullName(request)}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        🎂 {getPatientAge(request)} | ⚤ {getPatientGender(request)}
                      </div>
                      {request.patient?.mobile && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>📞 {request.patient.mobile}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", color: "#ec4899" }}>
                        📷 {request.radiology_type_label || request.radiology_type || "-"}
                      </div>
                      {request.body_part && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>بخش: {request.body_part}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {request.barcode ? (
                        <code style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}>
                          🏷️ {request.barcode}
                        </code>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: "#d48806", fontWeight: "bold" }}>
                      {amount > 0 ? `${amount.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={{ ...styles.td, color: "#16a34a" }}>
                      {paidAmt > 0 ? `${paidAmt.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={{ ...styles.td, color: remaining <= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                      {amount > 0 ? `${remaining.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: badge.bg, color: badge.color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {!hasFeeRecord ? (
                        <button
                          style={{ ...styles.btn, background: "#10b981", color: "white" }}
                          onClick={() => handleOpenFeeForm(request)}
                        >
                          💰 اخذ فیس
                        </button>
                      ) : (
                        <>
                          {feeInfo && feeInfo.id && (
                            <button
                              style={{ ...styles.btn, background: "#f59e0b", color: "white" }}
                              onClick={() => handleOpenEditFeeForm(feeInfo)}
                            >
                              ✏️ تصحیح
                            </button>
                          )}
                          {feeInfo && feeInfo.id && !isFullPaid && (
                            <button
                              style={{ ...styles.btn, background: "#ef4444", color: "white" }}
                              onClick={() => handleDeleteFee(feeInfo.id)}
                            >
                              🗑️ حذف
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال فرم فیس (سفید مثل PharmacyFeeTab) */}
      {showFeeForm && (selectedRequest || editingFee) && (
        <div style={styles.modal} onClick={handleCloseForm}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>
              {editingFee ? "✏️ تصحیح فیس رادیولوژی" : "💰 اخذ فیس رادیولوژی"}
            </h2>

            {selectedRequest && (
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #10b981", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div><b>نام مریض:</b> {getPatientFullName(selectedRequest)}</div>
                  <div><b>شماره مراجعه:</b> {selectedRequest.reg_id || "-"}</div>
                  <div><b>سن:</b> {getPatientAge(selectedRequest)}</div>
                  <div><b>جنسیت:</b> {getPatientGender(selectedRequest)}</div>
                  {selectedRequest.patient?.mobile && (
                    <div><b>تماس:</b> {selectedRequest.patient.mobile}</div>
                  )}
                  <div><b>نوع رادیولوژی:</b> {selectedRequest.radiology_type_label || selectedRequest.radiology_type || "-"}</div>
                  {selectedRequest.body_part && (
                    <div><b>بخش:</b> {selectedRequest.body_part}</div>
                  )}
                  {selectedRequest.barcode && (
                    <div><b>بارکد:</b> {selectedRequest.barcode}</div>
                  )}
                </div>
              </div>
            )}

            {editingFee && (
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #10b981", marginBottom: "16px", fontSize: "13px" }}>
                <div>✏️ در حال تصحیح فیس شماره: <b>{editingFee.id}</b></div>
                {editingFee.barcode && <div>بارکد: {editingFee.barcode}</div>}
                <div>مراجعه: #{editingFee.reg_id || "-"}</div>
              </div>
            )}

            <form onSubmit={handleSubmitFee}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>مبلغ کل (افغانی) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                    style={styles.input}
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label style={styles.label}>مبلغ پرداخت شده</label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.paid_amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, paid_amount: e.target.value })}
                    style={styles.input}
                    min="0"
                  />
                </div>
                <div>
                  <label style={styles.label}>تخفیف (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={feeFormData.discount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, discount: e.target.value })}
                    style={styles.input}
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label style={styles.label}>روش پرداخت</label>
                  <select
                    value={feeFormData.payment_method}
                    onChange={(e) => setFeeFormData({ ...feeFormData, payment_method: e.target.value })}
                    style={styles.input}
                  >
                    <option value="cash">نقدی</option>
                    <option value="card">کارت بانکی</option>
                    <option value="online">آنلاین</option>
                    <option value="insurance">بیمه</option>
                  </select>
                </div>
              </div>

              <label style={styles.label}>توضیحات</label>
              <textarea
                value={feeFormData.description}
                onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                rows="2"
                style={styles.input}
                placeholder="توضیحات اضافی..."
              />

              <label style={styles.label}>یادداشت</label>
              <textarea
                value={feeFormData.note}
                onChange={(e) => setFeeFormData({ ...feeFormData, note: e.target.value })}
                rows="2"
                style={styles.input}
                placeholder="یادداشت..."
              />

              {feeFormData.amount && (
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
                  <span style={{ fontSize: "14px" }}>💰 مبلغ باقیمانده:</span>
                  <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                    {calculateRemaining(
                      parseFloat(feeFormData.amount) || 0,
                      parseFloat(feeFormData.paid_amount) || 0,
                      parseFloat(feeFormData.discount) || 0
                    ).toFixed(2)} AFN
                  </span>
                </div>
              )}

              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "10px 24px" }}
                  onClick={handleCloseForm}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, background: "#10b981", color: "white", padding: "10px 24px" }}
                  disabled={loading}
                >
                  {loading ? "⏳ در حال ثبت..." : editingFee ? "✅ ذخیره تغییرات" : "💰 ثبت فیس"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}