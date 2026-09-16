// src/app/pages/operationFeesRequest/OperationFeeTab.jsx
// استایل کاملاً هماهنگ با PharmacyFeeTab

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function OperationFeeTab({ api, regId }) {
  const [loading, setLoading] = useState(false);
  const [operationRequests, setOperationRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0,
    today: 0,
    today_amount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debugErrors, setDebugErrors] = useState(null);
  const [activeTab, setActiveTab] = useState("unpaid");

  const [feeFormData, setFeeFormData] = useState({
    total_amount: "",
    paid_amount: "",
    discount: "0",
    payment_method: "cash",
    description: "",
    note: "",
  });

  useEffect(() => {
    fetchAllData();
  }, [regId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOperationRequests(),
        fetchFeeRecords(),
        fetchStatistics(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationRequests = async () => {
    try {
      const url = `/operation/requests?per_page=100`;
      const response = await api.get(url);
      let requests = [];
      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          requests = response.data.data.data;
        } else if (Array.isArray(response.data?.data)) {
          requests = response.data.data;
        }
      }
      setOperationRequests(requests);
    } catch (err) {
      console.error("❌ خطا:", err);
      setOperationRequests([]);
    }
  };

  const fetchFeeRecords = async () => {
    try {
      const url = regId
        ? `/operation/fees?per_page=100&reg_id=${regId}`
        : "/operation/fees?per_page=100";
      const response = await api.get(url);
      let fees = [];
      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          fees = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          fees = response.data.data;
        } else if (Array.isArray(response.data)) {
          fees = response.data;
        }
        if (regId) fees = fees.filter((f) => f.reg_id == regId);
      }
      setFeeRecords(fees);
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
      setFeeRecords([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/operation/fees/statistics");
      if (response.data?.success && response.data?.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("❌ خطا در دریافت آمار:", err);
    }
  };

  const handleOpenFeeForm = (request) => {
    if (request.fee_id) {
      toast.warning("⚠️ این درخواست قبلاً فیس دارد");
      return;
    }
    setSelectedRequest(request);
    setEditingFee(null);
    setDebugErrors(null);
    setFeeFormData({
      total_amount: "",
      paid_amount: "",
      discount: "0",
      payment_method: "cash",
      description: `عملیات: ${request.surgery_type || "عملیات عمومی"} - جراح: ${request.surgeon || ""}`,
      note: `مراجعه #${request.reg_id || request.registration_id} - درخواست #${request.id}`,
    });
    setShowFeeForm(true);
  };

  const handleOpenEditFeeForm = (fee) => {
    if (!fee || !fee.id) {
      toast.error("❌ اطلاعات فیس معتبر نیست");
      return;
    }
    setEditingFee(fee);
    setSelectedRequest(null);
    setDebugErrors(null);
    setFeeFormData({
      total_amount: fee.total_amount?.toString() || "",
      paid_amount: fee.paid_amount?.toString() || "",
      discount: fee.discount_percent?.toString() || "0",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || "",
    });
    setShowFeeForm(true);
  };

  const handleSubmitFee = async (e) => {
    e.preventDefault();
    if (!feeFormData.total_amount || parseFloat(feeFormData.total_amount) <= 0) {
      toast.warning("⚠️ لطفاً مبلغ کل را وارد کنید");
      return;
    }
    if (!selectedRequest && !editingFee) {
      toast.error("❌ هیچ درخواستی انتخاب نشده است");
      return;
    }
    setLoading(true);
    setDebugErrors(null);
    try {
      let payload;
      let response;
      if (editingFee) {
        payload = {
          total_amount: parseFloat(feeFormData.total_amount),
          paid_amount: parseFloat(feeFormData.paid_amount) || 0,
          discount_percent: parseFloat(feeFormData.discount) || 0,
          payment_method: feeFormData.payment_method,
          description: feeFormData.description,
          note: feeFormData.note,
        };
        response = await api.put(`/operation/fees/${editingFee.id}`, payload);
        toast.success("✅ فیس عملیات با موفقیت ویرایش شد");
      } else {
        payload = {
          operation_request_id: selectedRequest.id,
          reg_id: selectedRequest.reg_id || selectedRequest.registration_id,
          patient_id: selectedRequest.patient_id,
          total_amount: parseFloat(feeFormData.total_amount),
          paid_amount: parseFloat(feeFormData.paid_amount) || 0,
          discount: parseFloat(feeFormData.discount) || 0,
          payment_method: feeFormData.payment_method,
          description: feeFormData.description,
          note: feeFormData.note,
        };
        response = await api.post("/operation/fees", payload);
        toast.success("✅ فیس عملیات با موفقیت ثبت شد");
      }
      await fetchAllData();
      handleCloseForm();
    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        setDebugErrors(errorData);
        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            const fieldLabels = {
              operation_request_id: "شناسه درخواست عملیات",
              reg_id: "شناسه مراجعه",
              patient_id: "شناسه مریض",
              total_amount: "مبلغ کل",
              paid_amount: "مبلغ پرداخت شده",
              discount: "تخفیف",
              discount_percent: "درصد تخفیف",
              payment_method: "روش پرداخت",
              description: "توضیحات",
              note: "یادداشت",
            };
            const label = fieldLabels[field] || field;
            const message = Array.isArray(messages) ? messages.join(", ") : messages;
            toast.error(`❌ ${label}: ${message}`);
          });
        } else if (errorData.message) {
          toast.error(`❌ ${errorData.message}`);
        } else {
          toast.error("❌ داده‌های ارسالی معتبر نیستند");
        }
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا: ${err.message || "خطا در ثبت فیس"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!feeId) {
      toast.error("❌ شناسه فیس معتبر نیست");
      return;
    }
    if (!window.confirm("⚠️ آیا مطمئن هستید که می‌خواهید این فیس را حذف کنید؟")) return;
    setLoading(true);
    try {
      await api.delete(`/operation/fees/${feeId}`);
      toast.success("✅ فیس عملیات با موفقیت حذف شد");
      await fetchAllData();
    } catch (err) {
      console.error("❌ خطا در حذف فیس:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در حذف فیس"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowFeeForm(false);
    setSelectedRequest(null);
    setEditingFee(null);
    setDebugErrors(null);
    setFeeFormData({
      total_amount: "",
      paid_amount: "",
      discount: "0",
      payment_method: "cash",
      description: "",
      note: "",
    });
  };

  const handlePrintRequest = (request) => {
    if (!request) {
      toast.error("❌ اطلاعات درخواست معتبر نیست");
      return;
    }
    const printContent = `
      <div style="font-family: 'IRANSans', Arial, sans-serif; direction: rtl; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; color: #1a1a2e; border-bottom: 3px solid #dc2626; padding-bottom: 10px;">📋 گزارش درخواست عملیات</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef; width: 40%;">نام بیمار</th><td style="padding: 8px;">${getPatientFullName(request)}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">شماره مراجعه</th><td style="padding: 8px;">${request.reg_id || request.registration_id || "-"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">نوع جراحی</th><td style="padding: 8px;">${request.surgery_type || "-"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">جراح</th><td style="padding: 8px;">${request.surgeon || "-"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">متخصص بیهوشی</th><td style="padding: 8px;">${request.anesthesiologist || "-"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">شماره اتاق عمل</th><td style="padding: 8px;">${request.room_number || "-"}</td></tr>
            ${request.scheduled_date ? `<tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">تاریخ و زمان</th><td style="padding: 8px;">${formatDateTime(request.scheduled_date)}</td></tr>` : ""}
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت</th><td style="padding: 8px;">${request.status_label || request.status || "در انتظار"}</td></tr>
            <tr><th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت فیس</th><td style="padding: 8px; color: #f59e0b; font-weight: bold;">❌ فیس ثبت نشده است</td></tr>
          </table>
        </div>
        <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">تاریخ چاپ: ${new Date().toLocaleString("fa-IR")}</div>
      </div>
    `;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`<html><head><title>پرینت</title><style>body { font-family: 'IRANSans', Arial, sans-serif; }</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("❌ خطا در باز کردن پنجره پرینت");
    }
  };

  const handlePrintFee = (fee, request) => {
    if (!fee) {
      toast.error("❌ اطلاعات فیس معتبر نیست");
      return;
    }
    const amount = parseFloat(fee.total_amount) || 0;
    const paid = parseFloat(fee.paid_amount) || 0;
    const remaining = amount - paid - (amount * (parseFloat(fee.discount_percent) || 0)) / 100;
    const printContent = `
      <div style="font-family: 'IRANSans', Arial, sans-serif; direction: rtl; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; color: #1a1a2e; border-bottom: 3px solid #dc2626; padding-bottom: 10px;">💰 گزارش فیس عملیات</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef; width: 40%;">نام بیمار</th><td style="padding: 8px;">${request ? getPatientFullName(request) : fee.patient_name || "نامشخص"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">شماره مراجعه</th><td style="padding: 8px;">${fee.reg_id || fee.registration_id || "-"}</td></tr>
            <tr style="border-bottom: 1px solid #ddd; background: #fef3c7;"><th style="text-align: right; padding: 8px; background: #fcd34d;">💰 مبلغ کل</th><td style="padding: 8px; font-weight: bold; color: #dc2626;">${amount.toFixed(2)} ؋</td></tr>
            ${fee.discount_percent > 0 ? `<tr style="border-bottom: 1px solid #ddd; background: #fef3c7;"><th style="text-align: right; padding: 8px; background: #fcd34d;">تخفیف</th><td style="padding: 8px; font-weight: bold; color: #f59e0b;">${fee.discount_percent}%</td></tr>` : ""}
            <tr style="border-bottom: 1px solid #ddd; background: #d1fae5;"><th style="text-align: right; padding: 8px; background: #34d399;">پرداخت شده</th><td style="padding: 8px; font-weight: bold; color: #22c55e;">${paid.toFixed(2)} ؋</td></tr>
            <tr style="border-bottom: 1px solid #ddd; background: #fee2e2;"><th style="text-align: right; padding: 8px; background: #fca5a5;">باقیمانده</th><td style="padding: 8px; font-weight: bold; color: #dc2626;">${remaining.toFixed(2)} ؋</td></tr>
            <tr style="border-bottom: 1px solid #ddd;"><th style="text-align: right; padding: 8px; background: #e9ecef;">روش پرداخت</th><td style="padding: 8px;">${getMethodLabel(fee.payment_method)}</td></tr>
            <tr><th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت پرداخت</th><td style="padding: 8px; color: ${getStatusColor(fee.payment_status)}; font-weight: bold;">${getStatusLabel(fee.payment_status)}</td></tr>
          </table>
        </div>
        <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">تاریخ چاپ: ${new Date().toLocaleString("fa-IR")}</div>
      </div>
    `;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`<html><head><title>پرینت فیس</title><style>body { font-family: 'IRANSans', Arial, sans-serif; }</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("❌ خطا در باز کردن پنجره پرینت");
    }
  };

  const getMethodLabel = (method) => {
    const methods = { cash: "نقدی", card: "کارت بانکی", online: "آنلاین", insurance: "بیمه" };
    return methods[method] || method || "-";
  };

  const getStatusLabel = (status) => {
    const labels = { pending: "در انتظار پرداخت", partial: "پرداخت ناقص", paid: "پرداخت کامل", refunded: "برگشت داده شده", cancelled: "لغو شده" };
    return labels[status] || status || "نامشخص";
  };

  const getStatusColor = (status) => {
    const colors = { pending: "#f59e0b", partial: "#f97316", paid: "#22c55e", refunded: "#8b5cf6", cancelled: "#ef4444" };
    return colors[status] || "#6b7280";
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    try { return new Date(date).toLocaleString("fa-IR"); } catch { return "-"; }
  };

  const getPatientFullName = (request) => {
    if (request.patient?.first_name || request.patient?.last_name) {
      return `${request.patient.first_name || ""} ${request.patient.last_name || ""}`.trim() || "نامشخص";
    }
    return request.patient_name || "نامشخص";
  };

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // ====== فیلترها ======
  const unpaidRequests = operationRequests.filter((r) => !r.fee_id);
  const getFeeForRequest = (r) =>
    feeRecords.find((f) => f.operation_request_id === r.id || f.id === r.fee_id);

  const paidRequests = operationRequests.filter((r) => {
    if (!r.fee_id) return false;
    const fee = getFeeForRequest(r);
    return (fee?.payment_status || fee?.status || "").toLowerCase() === "paid";
  });

  const partialRequests = operationRequests.filter((r) => {
    if (!r.fee_id) return false;
    const fee = getFeeForRequest(r);
    return (fee?.payment_status || fee?.status || "").toLowerCase() === "partial";
  });

  const pendingRequests = operationRequests.filter((r) => {
    if (!r.fee_id) return false;
    const fee = getFeeForRequest(r);
    const status = (fee?.payment_status || fee?.status || "").toLowerCase();
    return status === "pending" || (!status && r.fee_id);
  });

  const filterBySearch = (requests) => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.trim().toLowerCase();
    return requests.filter((r) => {
      const patientName = getPatientFullName(r).toLowerCase();
      return (
        patientName.includes(term) ||
        r.surgery_type?.toLowerCase().includes(term) ||
        r.surgeon?.toLowerCase().includes(term) ||
        String(r.reg_id || r.registration_id).includes(term)
      );
    });
  };

  const filteredUnpaid = filterBySearch(unpaidRequests);
  const filteredPaid = filterBySearch(paidRequests);
  const filteredPartial = filterBySearch(partialRequests);
  const filteredPending = filterBySearch(pendingRequests);

  const getActiveList = () => {
    switch (activeTab) {
      case "unpaid": return filteredUnpaid;
      case "pending": return filteredPending;
      case "partial": return filteredPartial;
      case "paid": return filteredPaid;
      default: return filteredUnpaid;
    }
  };
  const activeList = getActiveList();

  // ====== استایل‌ها (دقیقاً مثل PharmacyFeeTab) ======
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

  // ====== تب‌ها ======
  const tabs = [
    { key: "unpaid", label: `⏳ بدون فیس`, count: unpaidRequests.length },
    { key: "pending", label: `🟠 در انتظار`, count: pendingRequests.length },
    { key: "partial", label: `🔵 ناقص`, count: partialRequests.length },
    { key: "paid", label: `✅ پرداخت کامل`, count: paidRequests.length },
  ];

  // ====== Badge ======
  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: "#fef3c7", color: "#92400e", text: "⏳ در انتظار پرداخت" },
      partial: { bg: "#dbeafe", color: "#1e40af", text: "🔵 پرداخت ناقص" },
      paid: { bg: "#d1fae5", color: "#065f46", text: "✅ پرداخت شده" },
      refunded: { bg: "#ede9fe", color: "#5b21b6", text: "↩️ برگشت داده شده" },
      cancelled: { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status || "-" };
  };

  // ====== رندر ======
  return (
    <div style={styles.container}>
      {/* آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{stats.total || 0}</div>
          <div style={styles.statLabel}>مجموع</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>{stats.pending || 0}</div>
          <div style={styles.statLabel}>در انتظار</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f97316" }}>{stats.partial || 0}</div>
          <div style={styles.statLabel}>ناقص</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>{stats.paid || 0}</div>
          <div style={styles.statLabel}>پرداخت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#10b981", fontSize: "16px" }}>
            {toNumber(stats.total_paid).toLocaleString()}
          </div>
          <div style={styles.statLabel}>مبلغ پرداخت</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#ef4444", fontSize: "16px" }}>
            {toNumber(stats.total_remaining).toLocaleString()}
          </div>
          <div style={styles.statLabel}>باقیمانده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#60a5fa", fontSize: "16px" }}>{stats.today || 0}</div>
          <div style={styles.statLabel}>امروز</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#fcd34d", fontSize: "16px" }}>
            {toNumber(stats.today_amount).toLocaleString()}
          </div>
          <div style={styles.statLabel}>فیس امروز</div>
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
          placeholder="🔍 جستجوی نام مریض، نوع جراحی، جراح، شماره مراجعه..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
          onClick={fetchAllData}
          disabled={loading}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* لیست (جدول) */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : activeList.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>هیچ درخواستی در این وضعیت یافت نشد</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>شماره مراجعه</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>نوع جراحی</th>
                <th style={styles.th}>جراح</th>
                <th style={styles.th}>مبلغ کل</th>
                <th style={styles.th}>پرداخت شده</th>
                <th style={styles.th}>باقیمانده</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((request, idx) => {
                const fee = getFeeForRequest(request);
                const feeData = fee || (request.fee_id ? {
                  id: request.fee_id,
                  total_amount: request.fee_amount || 0,
                  paid_amount: request.fee_paid || 0,
                  discount_percent: 0,
                  payment_method: "cash",
                  payment_status: "pending",
                } : null);
                const status = feeData?.payment_status || feeData?.status || "";
                const isPaid = status.toLowerCase() === "paid";
                const isUnpaid = !request.fee_id;
                const badge = getStatusBadge(status);
                const totalAmt = toNumber(feeData?.total_amount);
                const paidAmt = toNumber(feeData?.paid_amount);
                const discount = toNumber(feeData?.discount_percent);
                const remaining = totalAmt - paidAmt - (totalAmt * discount) / 100;

                return (
                  <tr key={request.id || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
                        #{request.reg_id || request.registration_id || "-"}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👤 {getPatientFullName(request)}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", color: "#dc2626" }}>🔪 {request.surgery_type || "-"}</div>
                      {request.scheduled_date && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>📅 {formatDateTime(request.scheduled_date)}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👨‍⚕️ {request.surgeon || "-"}</div>
                      {request.anesthesiologist && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>💉 {request.anesthesiologist}</div>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: "#d48806", fontWeight: "bold" }}>
                      {totalAmt > 0 ? `${totalAmt.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={{ ...styles.td, color: "#16a34a" }}>
                      {paidAmt > 0 ? `${paidAmt.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={{ ...styles.td, color: remaining <= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                      {totalAmt > 0 ? `${remaining.toLocaleString()} AFN` : "-"}
                    </td>
                    <td style={styles.td}>
                      {isUnpaid ? (
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                          ⏳ بدون فیس
                        </span>
                      ) : (
                        <span style={{ background: badge.bg, color: badge.color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                          {badge.text}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {isUnpaid ? (
                        <>
                          <button
                            style={{ ...styles.btn, background: "#10b981", color: "white" }}
                            onClick={() => handleOpenFeeForm(request)}
                          >
                            💰 اخذ فیس
                          </button>
                          <button
                            style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                            onClick={() => handlePrintRequest(request)}
                          >
                            🖨️ پرینت
                          </button>
                        </>
                      ) : (
                        <>
                          {feeData && feeData.id && (
                            <button
                              style={{ ...styles.btn, background: "#f59e0b", color: "white" }}
                              onClick={() => handleOpenEditFeeForm(feeData)}
                            >
                              ✏️ تصحیح
                            </button>
                          )}
                          {feeData && feeData.id && (
                            <button
                              style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                              onClick={() => handlePrintFee(feeData, request)}
                            >
                              🖨️ پرینت
                            </button>
                          )}
                          {feeData && feeData.id && !isPaid && (
                            <button
                              style={{ ...styles.btn, background: "#ef4444", color: "white" }}
                              onClick={() => handleDeleteFee(feeData.id)}
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

      {/* خطاهای دیباگ */}
      {debugErrors && (
        <div style={{ background: "#1a1a2e", border: "2px solid #ef4444", borderRadius: "8px", padding: "15px", marginTop: "20px", color: "#fca5a5", fontSize: "12px", maxHeight: "200px", overflow: "auto" }}>
          <div style={{ fontWeight: "bold", color: "#ef4444", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ خطاهای اعتبارسنجی:</span>
            <button onClick={() => setDebugErrors(null)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace", fontSize: "11px" }}>{JSON.stringify(debugErrors, null, 2)}</pre>
        </div>
      )}

      {/* مودال فرم فیس (سفید مثل PharmacyFeeTab) */}
      {showFeeForm && (selectedRequest || editingFee) && (
        <div style={styles.modal} onClick={handleCloseForm}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>
              {editingFee ? "✏️ تصحیح فیس عملیات" : "💰 اخذ فیس عملیات"}
            </h2>

            {selectedRequest && (
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #10b981", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div><b>نام مریض:</b> {getPatientFullName(selectedRequest)}</div>
                  <div><b>شماره مراجعه:</b> {selectedRequest.reg_id || selectedRequest.registration_id}</div>
                  <div><b>نوع جراحی:</b> {selectedRequest.surgery_type || "-"}</div>
                  <div><b>جراح:</b> {selectedRequest.surgeon || "-"}</div>
                  <div><b>شناسه درخواست:</b> #{selectedRequest.id}</div>
                </div>
              </div>
            )}

            {editingFee && (
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #10b981", marginBottom: "16px", fontSize: "13px" }}>
                <div>✏️ در حال تصحیح فیس شماره: <b>{editingFee.id}</b></div>
                <div>مراجعه #{editingFee.reg_id || editingFee.registration_id} | وضعیت: {getStatusLabel(editingFee.payment_status)}</div>
              </div>
            )}

            <form onSubmit={handleSubmitFee}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>مبلغ کل (افغانی) *</label>
                  <input type="number" step="0.01" value={feeFormData.total_amount} onChange={(e) => setFeeFormData({ ...feeFormData, total_amount: e.target.value })} style={styles.input} required min="0" />
                </div>
                <div>
                  <label style={styles.label}>مبلغ پرداخت شده</label>
                  <input type="number" step="0.01" value={feeFormData.paid_amount} onChange={(e) => setFeeFormData({ ...feeFormData, paid_amount: e.target.value })} style={styles.input} min="0" />
                </div>
                <div>
                  <label style={styles.label}>تخفیف (%)</label>
                  <input type="number" step="0.1" value={feeFormData.discount} onChange={(e) => setFeeFormData({ ...feeFormData, discount: e.target.value })} style={styles.input} min="0" max="100" />
                </div>
                <div>
                  <label style={styles.label}>روش پرداخت</label>
                  <select value={feeFormData.payment_method} onChange={(e) => setFeeFormData({ ...feeFormData, payment_method: e.target.value })} style={styles.input}>
                    <option value="cash">نقدی</option>
                    <option value="card">کارت بانکی</option>
                    <option value="online">آنلاین</option>
                    <option value="insurance">بیمه</option>
                  </select>
                </div>
              </div>

              <label style={styles.label}>توضیحات</label>
              <textarea value={feeFormData.description} onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })} rows="2" style={styles.input} placeholder="توضیحات اضافی..." />

              <label style={styles.label}>یادداشت</label>
              <textarea value={feeFormData.note} onChange={(e) => setFeeFormData({ ...feeFormData, note: e.target.value })} rows="2" style={styles.input} placeholder="یادداشت..." />

              {feeFormData.total_amount && (
                <div style={{ marginTop: "16px", padding: "16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px" }}>💰 مبلغ باقیمانده:</span>
                  <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                    {(parseFloat(feeFormData.total_amount || 0) - parseFloat(feeFormData.paid_amount || 0) - (parseFloat(feeFormData.total_amount || 0) * parseFloat(feeFormData.discount || 0)) / 100).toFixed(2)} AFN
                  </span>
                </div>
              )}

              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "10px 24px" }} onClick={handleCloseForm}>انصراف</button>
                <button type="submit" style={{ ...styles.btn, background: "#10b981", color: "white", padding: "10px 24px" }} disabled={loading}>
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