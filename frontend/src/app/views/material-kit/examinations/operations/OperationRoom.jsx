// src/app/pages/operationFeesRequest/OperationFeeTab.jsx

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function OperationFeeTab({ api, regId, registration }) {
  const [loading, setLoading] = useState(false);
  const [operationRequests, setOperationRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0,
    today: 0,
    today_amount: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debugErrors, setDebugErrors] = useState(null);
  const [activeTab, setActiveTab] = useState('unpaid');
  const [doctorSignature, setDoctorSignature] = useState("دکتر علی محمدی");

  const effectiveRegId = regId || registration?.reg_id;

  const [editRequestData, setEditRequestData] = useState({
    surgery_type: "",
    surgeon: "",
    anesthesiologist: "",
    room_number: "",
    scheduled_date: "",
    estimated_duration: "",
    notes: "",
    priority: "normal"
  });

  useEffect(() => {
    if (effectiveRegId) {
      fetchAllData();
    } else {
      setOperationRequests([]);
      setFeeRecords([]);
    }
  }, [effectiveRegId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOperationRequests(),
        fetchFeeRecords(),
        fetchStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationRequests = async () => {
    try {
      let url = '/operation/requests?per_page=100';
      if (effectiveRegId) {
        url = `/operation/requests/registration/${effectiveRegId}`;
      }
      const response = await api.get(url);
      let requests = [];
      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          requests = response.data.data.data;
        } else if (Array.isArray(response.data?.data)) {
          requests = response.data.data;
        } else if (Array.isArray(response.data)) {
          requests = response.data;
        } else if (response.data?.data && typeof response.data.data === 'object') {
          requests = [response.data.data];
        }
      }
      setOperationRequests(requests);
    } catch (err) {
      console.error("❌ خطا در دریافت درخواست‌های عملیات:", err);
      if (err.response?.status !== 404) {
        toast.error(`❌ خطا در دریافت درخواست‌ها: ${err.response?.data?.message || err.message}`);
      }
      setOperationRequests([]);
    }
  };

  const fetchFeeRecords = async () => {
    try {
      const url = effectiveRegId
        ? `/operation/fees?per_page=100&reg_id=${effectiveRegId}`
        : '/operation/fees?per_page=100';
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
        if (effectiveRegId) {
          fees = fees.filter(f => f.reg_id == effectiveRegId);
        }
      }
      setFeeRecords(fees);
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
      setFeeRecords([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/operation/fees/statistics');
      if (response.data?.success && response.data?.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("❌ خطا در دریافت آمار:", err);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!effectiveRegId) {
      toast.error("❌ شناسه مراجعه یافت نشد");
      return;
    }
    if (!editRequestData.surgery_type.trim()) {
      toast.warning("⚠️ لطفاً نوع جراحی را وارد کنید");
      return;
    }
    if (!editRequestData.surgeon.trim()) {
      toast.warning("⚠️ لطفاً نام جراح را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        surgery_type: editRequestData.surgery_type.trim(),
        surgeon: editRequestData.surgeon.trim(),
        anesthesiologist: editRequestData.anesthesiologist?.trim() || null,
        room_number: editRequestData.room_number?.trim() || null,
        scheduled_date: editRequestData.scheduled_date || null,
        estimated_duration: editRequestData.estimated_duration || null,
        notes: editRequestData.notes?.trim() || null,
        priority: editRequestData.priority || "normal"
      };
      const response = await api.post(`/operation/requests/registration/${effectiveRegId}`, payload);
      if (response.data?.success) {
        toast.success("✅ درخواست عملیات با موفقیت ثبت شد");
        setShowFeeForm(false);
        setSelectedRequest(null);
        setIsEditingRequest(false);
        await fetchAllData();
      } else {
        toast.error(`❌ ${response.data?.message || "خطا در ثبت درخواست"}`);
      }
    } catch (err) {
      console.error("❌ خطا در ثبت درخواست:", err);
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            const fieldLabels = {
              'surgery_type': 'نوع جراحی',
              'surgeon': 'جراح',
              'anesthesiologist': 'متخصص بیهوشی',
              'room_number': 'شماره اتاق عمل',
              'scheduled_date': 'زمان جراحی',
              'estimated_duration': 'مدت زمان تخمینی',
              'notes': 'یادداشت',
              'priority': 'اولویت'
            };
            const label = fieldLabels[field] || field;
            toast.error(`❌ ${label}: ${Array.isArray(messages) ? messages[0] : messages}`);
          });
        } else if (errorData.message) {
          toast.error(`❌ ${errorData.message}`);
        } else {
          toast.error("❌ داده‌های ارسالی معتبر نیستند");
        }
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا: ${err.message || "خطا در ثبت درخواست"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewRequestForm = () => {
    if (!effectiveRegId) {
      toast.error("❌ شناسه مراجعه یافت نشد. لطفاً یک مریض را انتخاب کنید.");
      return;
    }
    setIsEditingRequest(true);
    setSelectedRequest(null);
    setDebugErrors(null);
    setEditRequestData({
      surgery_type: "",
      surgeon: "",
      anesthesiologist: "",
      room_number: "",
      scheduled_date: "",
      estimated_duration: "",
      notes: "",
      priority: "normal"
    });
    setShowFeeForm(true);
  };

  const handleEditRequest = (request) => {
    if (!request || !request.id) {
      toast.error("❌ اطلاعات درخواست معتبر نیست");
      return;
    }
    setIsEditingRequest(true);
    setSelectedRequest(request);
    setDebugErrors(null);
    setEditRequestData({
      surgery_type: request.surgery_type || "",
      surgeon: request.surgeon || "",
      anesthesiologist: request.anesthesiologist || "",
      room_number: request.room_number || "",
      scheduled_date: request.scheduled_date ? new Date(request.scheduled_date).toISOString().slice(0, 16) : "",
      estimated_duration: request.estimated_duration || "",
      notes: request.notes || "",
      priority: request.priority || "normal"
    });
    setShowFeeForm(true);
  };

  const handleSaveRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !selectedRequest.id) {
      toast.error("❌ درخواست معتبر نیست");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        surgery_type: editRequestData.surgery_type.trim(),
        surgeon: editRequestData.surgeon.trim(),
        anesthesiologist: editRequestData.anesthesiologist?.trim() || null,
        room_number: editRequestData.room_number?.trim() || null,
        scheduled_date: editRequestData.scheduled_date || null,
        estimated_duration: editRequestData.estimated_duration || null,
        notes: editRequestData.notes?.trim() || null,
        priority: editRequestData.priority || "normal"
      };
      const response = await api.put(`/operation/requests/${selectedRequest.id}`, payload);
      if (response.data?.success) {
        toast.success("✅ درخواست عملیات با موفقیت ویرایش شد");
        setShowFeeForm(false);
        setSelectedRequest(null);
        setIsEditingRequest(false);
        await fetchAllData();
      } else {
        toast.error(`❌ ${response.data?.message || "خطا در ویرایش درخواست"}`);
      }
    } catch (err) {
      console.error("❌ خطا در ویرایش درخواست:", err);
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            const fieldLabels = {
              'surgery_type': 'نوع جراحی',
              'surgeon': 'جراح',
              'anesthesiologist': 'متخصص بیهوشی',
              'room_number': 'شماره اتاق عمل',
              'scheduled_date': 'زمان جراحی',
              'estimated_duration': 'مدت زمان تخمینی',
              'notes': 'یادداشت',
              'priority': 'اولویت'
            };
            const label = fieldLabels[field] || field;
            toast.error(`❌ ${label}: ${Array.isArray(messages) ? messages[0] : messages}`);
          });
        } else if (errorData.message) {
          toast.error(`❌ ${errorData.message}`);
        } else {
          toast.error("❌ داده‌های ارسالی معتبر نیستند");
        }
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error("❌ خطا در ویرایش درخواست");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowFeeForm(false);
    setSelectedRequest(null);
    setIsEditingRequest(false);
    setDebugErrors(null);
    setEditRequestData({
      surgery_type: "",
      surgeon: "",
      anesthesiologist: "",
      room_number: "",
      scheduled_date: "",
      estimated_duration: "",
      notes: "",
      priority: "normal"
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
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef; width: 40%;">نام بیمار</th>
              <td style="padding: 8px;">${getPatientFullName(request)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">شماره مراجعه</th>
              <td style="padding: 8px;">${request.reg_id || request.registration_id || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">نوع جراحی</th>
              <td style="padding: 8px;">${request.surgery_type || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">جراح</th>
              <td style="padding: 8px;">${request.surgeon || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">متخصص بیهوشی</th>
              <td style="padding: 8px;">${request.anesthesiologist || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">شماره اتاق عمل</th>
              <td style="padding: 8px;">${request.room_number || '-'}</td>
            </tr>
            ${request.scheduled_date ? `<tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">تاریخ و زمان</th>
              <td style="padding: 8px;">${formatDateTime(request.scheduled_date)}</td>
            </tr>` : ''}
            ${request.estimated_duration ? `<tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">مدت زمان تخمینی</th>
              <td style="padding: 8px;">${request.estimated_duration}</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت</th>
              <td style="padding: 8px;">${request.status_label || request.status || 'در انتظار'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">اولویت</th>
              <td style="padding: 8px;">${request.priority === 'high' ? 'بالا' : request.priority === 'medium' ? 'متوسط' : request.priority === 'normal' ? 'عادی' : 'پایین'}</td>
            </tr>
            ${request.notes ? `<tr>
              <th style="text-align: right; padding: 8px; background: #e9ecef;">یادداشت</th>
              <td style="padding: 8px;">${request.notes}</td>
            </tr>` : ''}
          </table>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: center; flex: 1;">
              <div style="border-top: 1px solid #333; padding-top: 5px; width: 200px; margin: 0 auto;">
               امضای داکتر معالج
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">${doctorSignature}</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="border-top: 1px solid #333; padding-top: 5px; width: 200px; margin: 0 auto;">
                تاریخ
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">${new Date().toLocaleDateString('fa-IR')}</div>
            </div>
          </div>
        </div>
        <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}
        </div>
      </div>
    `;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>پرینت گزارش درخواست عملیات</title>
            <style>
              body { font-family: 'IRANSans', Arial, sans-serif; }
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("❌ خطا در باز کردن پنجره پرینت");
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'در انتظار پرداخت',
      partial: 'پرداخت ناقص',
      paid: 'پرداخت کامل',
      refunded: 'برگشت داده شده',
      cancelled: 'لغو شده'
    };
    return labels[status] || status || 'نامشخص';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      partial: '#f97316',
      paid: '#22c55e',
      refunded: '#8b5cf6',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('fa-IR');
    } catch {
      return '-';
    }
  };

  const getPatientFullName = (request) => {
    if (request.patient?.first_name || request.patient?.last_name) {
      return `${request.patient.first_name || ''} ${request.patient.last_name || ''}`.trim() || 'نامشخص';
    }
    return request.patient_name || 'نامشخص';
  };

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const unpaidRequests = operationRequests.filter(r => !r.fee_id);
  const paidRequests = operationRequests.filter(r => r.fee_id);

  const filterBySearch = (requests) => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.trim().toLowerCase();
    return requests.filter(r => {
      const patientName = getPatientFullName(r).toLowerCase();
      return patientName.includes(term) ||
        r.surgery_type?.toLowerCase().includes(term) ||
        r.surgeon?.toLowerCase().includes(term) ||
        String(r.reg_id || r.registration_id).includes(term);
    });
  };

  const filteredUnpaid = filterBySearch(unpaidRequests);
  const filteredPaid = filterBySearch(paidRequests);

  const handleDeleteRequest = async (requestId) => {
    if (!requestId) {
      toast.error("❌ شناسه درخواست معتبر نیست");
      return;
    }
    if (!window.confirm("⚠️ آیا مطمئن هستید که می‌خواهید این درخواست عملیات را حذف کنید؟")) return;
    setLoading(true);
    try {
      await api.delete(`/operation/requests/${requestId}`);
      toast.success("✅ درخواست عملیات با موفقیت حذف شد");
      await fetchAllData();
    } catch (err) {
      console.error("❌ خطا در حذف درخواست:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در حذف درخواست"}`);
    } finally {
      setLoading(false);
    }
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
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "250px",
      flex: 1,
      background: "white",
      color: "#1f2937",
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
      background: "white",
      color: "#1f2937",
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
          <div style={{ ...styles.statValue, color: "#60a5fa" }}>{stats.today || 0}</div>
          <div style={styles.statLabel}>امروز</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#fcd34d", fontSize: "16px" }}>
            {toNumber(stats.today_amount).toLocaleString()}
          </div>
          <div style={styles.statLabel}>فیس امروز</div>
        </div>
      </div>

      {/* فیلترها و جستجو */}
      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterBtn,
            ...(activeTab === 'unpaid' ? { background: "#f59e0b", color: "white", borderColor: "#f59e0b" } : {}),
          }}
          onClick={() => setActiveTab('unpaid')}
        >
          🟡 بدون فیس ({unpaidRequests.length})
        </button>
        <button
          style={{
            ...styles.filterBtn,
            ...(activeTab === 'paid' ? { background: "#22c55e", color: "white", borderColor: "#22c55e" } : {}),
          }}
          onClick={() => setActiveTab('paid')}
        >
          🟢 دارای فیس ({paidRequests.length})
        </button>
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
          {loading ? '⏳' : '🔄'} بروزرسانی
        </button>
      </div>

      {/* ============ درخواست‌های بدون فیس ============ */}
      {activeTab === 'unpaid' && (
        <>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
              ⏳ در حال بارگذاری...
            </div>
          ) : filteredUnpaid.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
              <div>همه درخواست‌ها فیس دارند</div>
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
                    <th style={styles.th}>بیهوشی</th>
                    <th style={styles.th}>زمان</th>
                    <th style={styles.th}>وضعیت</th>
                    <th style={styles.th}>اولویت</th>
                    <th style={styles.th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnpaid.map((request, index) => (
                    <tr key={request.id || index}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>
                        <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
                          #{request.reg_id || request.registration_id || '-'}
                        </code>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "bold" }}>👤 {getPatientFullName(request)}</div>
                      </td>
                      <td style={{ ...styles.td, color: "#dc2626", fontWeight: "bold" }}>
                        {request.surgery_type || 'عملیات'}
                      </td>
                      <td style={styles.td}>👨‍⚕️ {request.surgeon || '-'}</td>
                      <td style={styles.td}>💉 {request.anesthesiologist || '-'}</td>
                      <td style={styles.td}>
                        <div style={{ fontSize: "12px" }}>
                          {request.scheduled_date ? formatDateTime(request.scheduled_date) : '-'}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}>
                          {request.status_label || request.status || 'در انتظار'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: request.priority === 'high' ? '#fee2e2' : request.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                          color: request.priority === 'high' ? '#991b1b' : request.priority === 'medium' ? '#92400e' : '#1e40af',
                          padding: "3px 10px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: "bold"
                        }}>
                          {request.priority === 'high' ? '🔴 بالا' : request.priority === 'medium' ? '🟡 متوسط' : request.priority === 'normal' ? '🔵 عادی' : '⚪ پایین'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {request.id && !request.id.toString().startsWith('temp_') && (
                          <>
                            <button
                              style={{ ...styles.btn, background: "#f59e0b", color: "white" }}
                              onClick={() => handleEditRequest(request)}
                            >
                              ✏️ ویرایش
                            </button>
                            <button
                              style={{ ...styles.btn, background: "#ef4444", color: "white" }}
                              onClick={() => handleDeleteRequest(request.id)}
                            >
                              🗑️ حذف
                            </button>
                          </>
                        )}
                        <button
                          style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                          onClick={() => handlePrintRequest(request)}
                        >
                          🖨️ پرینت
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============ درخواست‌های دارای فیس ============ */}
      {activeTab === 'paid' && (
        <>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
              ⏳ در حال بارگذاری...
            </div>
          ) : filteredPaid.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "white", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
              <div>هیچ درخواست دارای فیس وجود ندارد</div>
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
                  {filteredPaid.map((request, index) => {
                    const fee = feeRecords.find(f => f.operation_request_id === request.id);
                    const feeData = fee || {
                      id: request.fee_id,
                      total_amount: request.fee_amount || 0,
                      paid_amount: request.fee_paid || 0,
                      discount_percent: 0,
                      payment_method: 'cash',
                      payment_status: 'pending',
                      description: '',
                      note: '',
                      reg_id: request.reg_id || request.registration_id,
                      patient_name: request.patient_name
                    };
                    const remaining = toNumber(feeData.total_amount) - toNumber(feeData.paid_amount) - (toNumber(feeData.total_amount) * (toNumber(feeData.discount_percent) || 0) / 100);
                    return (
                      <tr key={request.id || index}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}>
                          <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
                            #{request.reg_id || request.registration_id || '-'}
                          </code>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: "bold" }}>👤 {getPatientFullName(request)}</div>
                        </td>
                        <td style={{ ...styles.td, color: "#dc2626", fontWeight: "bold" }}>
                          {request.surgery_type || 'عملیات'}
                        </td>
                        <td style={styles.td}>👨‍⚕️ {request.surgeon || '-'}</td>
                        <td style={{ ...styles.td, color: "#d48806", fontWeight: "bold" }}>
                          {toNumber(feeData.total_amount).toLocaleString()} AFN
                        </td>
                        <td style={{ ...styles.td, color: "#16a34a" }}>
                          {toNumber(feeData.paid_amount).toLocaleString()} AFN
                        </td>
                        <td style={{ ...styles.td, color: remaining <= 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                          {remaining.toLocaleString()} AFN
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            background: getStatusColor(feeData.payment_status) + "20",
                            color: getStatusColor(feeData.payment_status),
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}>
                            {getStatusLabel(feeData.payment_status)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                            onClick={() => handlePrintRequest(request)}
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
        </>
      )}

      {/* نمایش خطاهای دیباگ */}
      {debugErrors && (
        <div style={{
          background: "#fef2f2",
          border: "2px solid #ef4444",
          borderRadius: "10px",
          padding: "15px",
          marginTop: "20px",
          color: "#991b1b",
          fontSize: "12px",
          maxHeight: "200px",
          overflow: "auto"
        }}>
          <div style={{
            fontWeight: "bold",
            color: "#ef4444",
            marginBottom: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>⚠️ خطاهای اعتبارسنجی:</span>
            <button
              onClick={() => setDebugErrors(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              ✕
            </button>
          </div>
          <pre style={{
            whiteSpace: "pre-wrap",
            margin: 0,
            fontFamily: "monospace",
            fontSize: "11px"
          }}>
            {JSON.stringify(debugErrors, null, 2)}
          </pre>
        </div>
      )}

      {/* فرم ثبت/ویرایش درخواست */}
      {showFeeForm && (
        <div style={styles.modal} onClick={handleCloseForm}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#dc2626" }}>
              {selectedRequest?.id ? '✏️ ویرایش درخواست عملیات' : '📝 ثبت درخواست عملیات جدید'}
            </h2>

            <form onSubmit={selectedRequest?.id ? handleSaveRequest : handleCreateRequest}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={styles.label}>نوع جراحی *</label>
                  <input
                    type="text"
                    value={editRequestData.surgery_type}
                    onChange={(e) => setEditRequestData({ ...editRequestData, surgery_type: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>جراح *</label>
                  <input
                    type="text"
                    value={editRequestData.surgeon}
                    onChange={(e) => setEditRequestData({ ...editRequestData, surgeon: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>متخصص بیهوشی</label>
                  <input
                    type="text"
                    value={editRequestData.anesthesiologist}
                    onChange={(e) => setEditRequestData({ ...editRequestData, anesthesiologist: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>شماره اتاق عمل</label>
                  <input
                    type="text"
                    value={editRequestData.room_number}
                    onChange={(e) => setEditRequestData({ ...editRequestData, room_number: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>زمان جراحی</label>
                  <input
                    type="datetime-local"
                    value={editRequestData.scheduled_date}
                    onChange={(e) => setEditRequestData({ ...editRequestData, scheduled_date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>مدت زمان تخمینی</label>
                  <input
                    type="text"
                    value={editRequestData.estimated_duration}
                    onChange={(e) => setEditRequestData({ ...editRequestData, estimated_duration: e.target.value })}
                    style={styles.input}
                    placeholder="مثلاً: 2 ساعت"
                  />
                </div>
                <div>
                  <label style={styles.label}>اولویت</label>
                  <select
                    value={editRequestData.priority}
                    onChange={(e) => setEditRequestData({ ...editRequestData, priority: e.target.value })}
                    style={styles.input}
                  >
                    <option value="high">🔴 بالا</option>
                    <option value="medium">🟡 متوسط</option>
                    <option value="normal">🔵 عادی</option>
                    <option value="low">⚪ پایین</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={styles.label}>یادداشت</label>
                  <textarea
                    value={editRequestData.notes}
                    onChange={(e) => setEditRequestData({ ...editRequestData, notes: e.target.value })}
                    rows="3"
                    style={{ ...styles.input, minHeight: "60px" }}
                    placeholder="یادداشت‌های اضافی..."
                  />
                </div>
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "10px 24px" }}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.btn, background: "#dc2626", color: "white", padding: "10px 24px" }}
                >
                  {loading ? '⏳ در حال ذخیره...' : selectedRequest?.id ? '💾 ذخیره تغییرات' : '📝 ثبت درخواست'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ دکمه ثبت درخواست جدید ============ */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "30px",
        padding: "20px",
        borderTop: "1px solid #e5e7eb"
      }}>
        <button
          onClick={handleOpenNewRequestForm}
          disabled={!effectiveRegId}
          style={{
            ...styles.btn,
            background: !effectiveRegId ? '#6b7280' : '#dc2626',
            color: 'white',
            padding: '12px 30px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: !effectiveRegId ? 0.5 : 1,
            cursor: !effectiveRegId ? 'not-allowed' : 'pointer'
          }}
        >
          <span style={{ fontSize: '20px' }}>➕</span>
          {effectiveRegId ? 'ثبت درخواست عملیات جدید' : '⚠️ مریضی انتخاب نشده است'}
        </button>
      </div>
    </div>
  );
}