// src/app/pages/treatment/followup/FollowUp.jsx
// نسخه کامل: ثبت + نمایش + ویرایش + حذف + پرینت

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

export default function FollowUp({
  registration,
  onComplete,
  onRefresh,
  api,
  onSave,
  onFinish,
  onNextStep,
  onPrevStep,
  currentStep,
  nextStep,
  prevStep,
  isSubmitting,
  isTreatmentComplete,
}) {
  // ============================================================
  // State
  // ============================================================
  const [formData, setFormData] = useState({
    follow_up_date: "",
    follow_up_time: "",
    reason: "",
    instructions: "",
    priority: "normal",
  });

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // ✅ لیست مراجعات ثبت‌شده
  const [followUps, setFollowUps] = useState([]);

  // ✅ حالت ویرایش
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // ✅ نمایش جزئیات
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ✅ تأیید حذف
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // ============================================================
  // Effects
  // ============================================================
  useEffect(() => {
    if (!registration || !registration.reg_id) return;
    fetchPatientInfo();
    fetchFollowUps();
  }, [registration?.reg_id]);

  // ============================================================
  // API Functions
  // ============================================================
  const fetchPatientInfo = async () => {
    try {
      const response = await api.get(`/doctor/patient/${registration.reg_id}`);
      const data = response.data?.data || response.data;
      setPatientInfo(data);
      if (data?.registration?.status === "completed" || data?.status === "completed") {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error("خطا در دریافت اطلاعات مریض:", err);
    }
  };

  // ✅ دریافت لیست مراجعات بعدی
  const fetchFollowUps = async () => {
    setListLoading(true);
    try {
      const response = await api.get(
        `/doctor/follow-up/registration/${registration.reg_id}`
      );

      console.log('📥 Follow-ups response:', response.data);

      // ✅ استخراج داده از ساختارهای مختلف
      let list = [];
      if (response.data?.success) {
        const d = response.data.data;
        if (Array.isArray(d)) {
          list = d;
        } else if (d?.all_followups && Array.isArray(d.all_followups)) {
          list = d.all_followups;
        } else if (d?.follow_up) {
          list = [d.follow_up];
        }
      }

      setFollowUps(list);

      // ✅ اگر یکی pending وجود دارد، فرم را با آن پر کن
      const active = list.find((f) => f.status === 'pending' || f.status === 'confirmed');
      if (active) {
        setFormData({
          follow_up_date: active.follow_up_date || "",
          follow_up_time: active.follow_up_time || "",
          reason: active.reason || "",
          instructions: active.instructions || "",
          priority: active.priority || "normal",
        });
      }
    } catch (err) {
      console.error("خطا در دریافت لیست مراجعات:", err);
      setFollowUps([]);
    } finally {
      setListLoading(false);
    }
  };

  // ============================================================
  // Handlers
  // ============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ ثبت مراجعه جدید
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.follow_up_date) {
      toast.warning("⚠️ لطفاً تاریخ مراجعه بعدی را انتخاب کنید");
      return;
    }
    if (!formData.reason.trim()) {
      toast.warning("⚠️ لطفاً دلیل مراجعه بعدی را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reg_id: registration.reg_id,
        patient_id: registration.patient_id || registration.patient?.id,
        doctor_id: registration.doctor_id,
        follow_up_date: formData.follow_up_date,
        follow_up_time: formData.follow_up_time || null,
        reason: formData.reason,
        instructions: formData.instructions || null,
        priority: formData.priority || "normal",
      };

      console.log('📤 POST /doctor/follow-up', payload);

      const response = await api.post("/doctor/follow-up", payload);
      console.log('📥 Response:', response.data);

      if (response.data?.success) {
        toast.success("✅ مراجعه بعدی با موفقیت ثبت شد");
        if (onSave) await onSave(formData);
        await fetchFollowUps();
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "❌ خطا در ثبت مراجعه بعدی");
      }
    } catch (err) {
      console.error("❌ خطا در ثبت مراجعه بعدی:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.follow_up_date?.[0] ||
        err.message ||
        "خطای ناشناخته";
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ شروع ویرایش
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditFormData({
      follow_up_date: item.follow_up_date || "",
      follow_up_time: item.follow_up_time || "",
      reason: item.reason || "",
      instructions: item.instructions || "",
      priority: item.priority || "normal",
      status: item.status || "pending",
    });
  };

  // ✅ لغو ویرایش
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  // ✅ ذخیره ویرایش
  const handleSaveEdit = async (id) => {
    if (!editFormData.follow_up_date) {
      toast.warning("⚠️ تاریخ الزامی است");
      return;
    }
    if (!editFormData.reason.trim()) {
      toast.warning("⚠️ دلیل الزامی است");
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/doctor/follow-up/${id}`, {
        follow_up_date: editFormData.follow_up_date,
        follow_up_time: editFormData.follow_up_time || null,
        reason: editFormData.reason,
        instructions: editFormData.instructions || null,
        priority: editFormData.priority,
        status: editFormData.status,
      });

      if (response.data?.success) {
        toast.success("✅ مراجعه بعدی بروزرسانی شد");
        setEditingId(null);
        setEditFormData(null);
        await fetchFollowUps();
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "خطا در بروزرسانی");
      }
    } catch (err) {
      console.error("❌ خطا در بروزرسانی:", err);
      toast.error(err.response?.data?.message || "خطا در بروزرسانی");
    } finally {
      setLoading(false);
    }
  };

  // ✅ حذف
  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const response = await api.delete(`/doctor/follow-up/${id}`);
      if (response.data?.success) {
        toast.success("🗑️ مراجعه بعدی حذف شد");
        setDeleteConfirmId(null);
        await fetchFollowUps();
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "خطا در حذف");
      }
    } catch (err) {
      console.error("❌ خطا در حذف:", err);
      toast.error(err.response?.data?.message || "خطا در حذف");
    } finally {
      setLoading(false);
    }
  };

  // ✅ تغییر وضعیت (تکمیل/لغو)
  const handleStatusChange = async (id, newStatus) => {
    setLoading(true);
    try {
      const response = await api.patch(`/doctor/follow-up/${id}/status`, {
        status: newStatus,
      });
      if (response.data?.success) {
        toast.success("✅ وضعیت تغییر کرد");
        await fetchFollowUps();
      } else {
        toast.error(response.data?.message || "خطا در تغییر وضعیت");
      }
    } catch (err) {
      console.error("❌ خطا در تغییر وضعیت:", err);
      toast.error(err.response?.data?.message || "خطا در تغییر وضعیت");
    } finally {
      setLoading(false);
    }
  };

  // ✅ پرینت
  const handlePrint = (item) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("پنجره پرینت باز نشد");
      return;
    }

    const patient = patientInfo?.patient || registration.patient || {};
    const fullName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "-";
    const priorityText =
      item.priority === "urgent"
        ? "🟡 فوری"
        : item.priority === "emergency"
        ? "🔴 اورژانسی"
        : "🟢 عادی";

    const statusText =
      item.status === "completed"
        ? "✅ انجام شده"
        : item.status === "confirmed"
        ? "✅ تأیید شده"
        : item.status === "cancelled"
        ? "❌ لغو شده"
        : item.status === "no_show"
        ? "🚫 نیامده"
        : "⏳ در انتظار";

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>مراجعه بعدی</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 30px; direction: rtl; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #10b981; margin: 0; font-size: 22px; }
          .header p { color: #6b7280; font-size: 12px; margin: 5px 0 0 0; }
          .section { margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
          .section-title { font-weight: bold; color: #374151; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 14px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
          .info-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee; font-size: 12px; }
          .label { color: #6b7280; font-weight: bold; }
          .value { color: #1f2937; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .signature { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 2px dashed #ccc; }
          .sig-box { width: 200px; text-align: center; font-size: 12px; }
          .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📅 مراجعه بعدی</h1>
          <p>تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}</p>
        </div>

        <div class="section">
          <div class="section-title">👤 معلومات مریض</div>
          <div class="info-grid">
            <div class="info-row"><span class="label">نام کامل:</span><span class="value">${fullName}</span></div>
            <div class="info-row"><span class="label">سن:</span><span class="value">${patient.age || "-"}</span></div>
            <div class="info-row"><span class="label">جنسیت:</span><span class="value">${patient.gender === "male" ? "مرد" : patient.gender === "female" ? "زن" : "-"}</span></div>
            <div class="info-row"><span class="label">شماره تماس:</span><span class="value">${patient.mobile || patient.phone || "-"}</span></div>
            <div class="info-row"><span class="label">شماره تذکره:</span><span class="value">${patient.national_id || "-"}</span></div>
            <div class="info-row"><span class="label">شماره مراجعه:</span><span class="value">${registration.visit_number || "-"}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📅 معلومات مراجعه بعدی</div>
          <div class="info-grid">
            <div class="info-row"><span class="label">تاریخ:</span><span class="value">${item.follow_up_date || "-"}</span></div>
            <div class="info-row"><span class="label">ساعت:</span><span class="value">${item.follow_up_time || "-"}</span></div>
            <div class="info-row"><span class="label">اولویت:</span><span class="value">${priorityText}</span></div>
            <div class="info-row"><span class="label">وضعیت:</span><span class="value">${statusText}</span></div>
            <div class="info-row"><span class="label">بارکد:</span><span class="value">${item.barcode || "-"}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📝 دلیل مراجعه</div>
          <div style="background:#fff;padding:10px;border-radius:6px;font-size:13px;min-height:40px;">${item.reason || "-"}</div>
        </div>

        ${item.instructions ? `
        <div class="section">
          <div class="section-title">📋 دستورالعمل‌ها</div>
          <div style="background:#fff;padding:10px;border-radius:6px;font-size:13px;min-height:40px;">${item.instructions}</div>
        </div>` : ""}

        <div class="signature">
          <div class="sig-box"><div class="sig-line">امضای داکتر</div></div>
          <div class="sig-box"><div class="sig-line">امضای مریض</div></div>
        </div>

        <div class="footer">
          تاریخ چاپ: ${new Date().toLocaleString('fa-IR')} | سیستم معالجه
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // ============================================================
  // Helpers
  // ============================================================
  const getGenderText = (gender) => {
    if (!gender) return "-";
    const genderMap = { male: "♂️ مرد", female: "♀️ زن", other: "⚧️ دیگر" };
    return genderMap[gender] || gender;
  };

  const getPriorityLabel = (priority) => {
    const priorityMap = {
      normal: "🟢 عادی",
      urgent: "🟡 فوری",
      emergency: "🔴 اورژانسی",
    };
    return priorityMap[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colorMap = { normal: "#10b981", urgent: "#f59e0b", emergency: "#ef4444" };
    return colorMap[priority] || "#6b7280";
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { bg: "#fef3c7", color: "#92400e", text: "⏳ در انتظار" },
      confirmed: { bg: "#dbeafe", color: "#1e40af", text: "✅ تأیید شده" },
      completed: { bg: "#d1fae5", color: "#065f46", text: "✅ انجام شده" },
      cancelled: { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
      no_show: { bg: "#f3f4f6", color: "#374151", text: "🚫 نیامده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status || "-" };
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("fa-IR");
    } catch {
      return d;
    }
  };

  // ✅ بررسی آیا مراجعه فعال (pending/confirmed) وجود دارد
  const hasActiveFollowUp = followUps.some(
    (f) => f.status === "pending" || f.status === "confirmed"
  );

  // ============================================================
  // Guards
  // ============================================================
  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "#ef4444" }}>
        <div style={{ fontSize: "60px", marginBottom: "20px" }}>⚠️</div>
        <div style={{ fontSize: "18px" }}>اطلاعات مریض معتبر نیست</div>
      </div>
    );
  }

  const patient = patientInfo?.patient || registration.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting;
  const today = new Date().toISOString().split("T")[0];

  // ============================================================
  // Styles
  // ============================================================
  const styles = {
    container: { padding: "8px" },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
      borderRadius: "10px",
    },
    statBox: { textAlign: "center" },
    statValue: { fontSize: "20px", fontWeight: "bold" },
    statLabel: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    sectionCard: {
      background: "white",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
    input: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
    },
    select: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
      cursor: "pointer",
      background: "white",
    },
    textarea: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "80px",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#374151",
      fontWeight: "bold",
      marginBottom: "6px",
      marginTop: "12px",
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
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
      background: "white",
      borderRadius: "10px",
      overflow: "hidden",
    },
    th: {
      padding: "10px",
      textAlign: "right",
      background: "#f9fafb",
      color: "#374151",
      fontSize: "12px",
      fontWeight: "bold",
      borderBottom: "2px solid #e5e7eb",
    },
    td: {
      padding: "10px",
      borderBottom: "1px solid #f3f4f6",
      color: "#1f2937",
      fontSize: "12px",
    },
    modal: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.5)",
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
      boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.15)",
    },
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: hasActiveFollowUp ? "#22c55e" : "#f59e0b" }}>
            {hasActiveFollowUp ? "✅" : "⏳"}
          </div>
          <div style={styles.statLabel}>وضعیت مراجعه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isCompleted ? "#22c55e" : "#f59e0b" }}>
            {isCompleted ? "✅" : "⏳"}
          </div>
          <div style={styles.statLabel}>وضعیت معالجه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: getPriorityColor(formData.priority) }}>
            {getPriorityLabel(formData.priority)}
          </div>
          <div style={styles.statLabel}>اولویت</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#8b5cf6" }}>{followUps.length}</div>
          <div style={styles.statLabel}>تعداد مراجعات</div>
        </div>
      </div>

      {/* ====== کارت معلومات بیمار ====== */}
      <div style={styles.patientInfoCard}>
        <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "16px" }}>
          👤 معلومات بیمار
        </h3>
        <div style={styles.patientInfoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>نام کامل</span>
            <div style={styles.infoValue}>
              {patient.first_name || ""} {patient.last_name || ""}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>سن</span>
            <div style={styles.infoValue}>
              {patient.age ? `${patient.age} سال` : "-"}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>جنسیت</span>
            <div style={styles.infoValue}>{getGenderText(patient.gender)}</div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره تماس</span>
            <div style={styles.infoValue} dir="ltr">
              {patient.mobile || patient.phone || "-"}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره مراجعه</span>
            <div style={styles.infoValue}>#{registration.visit_number || "-"}</div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>تشخیص</span>
            <div style={styles.infoValue}>{registration.diagnosis || "-"}</div>
          </div>
        </div>
      </div>

      {/* ====== فرم ثبت ====== */}
      <form onSubmit={handleSubmit} style={styles.sectionCard}>
        <h3 style={{ color: "#10b981", marginTop: 0, marginBottom: "20px" }}>
          📅 فرم مراجعه بعدی
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div>
            <label style={styles.label}>تاریخ مراجعه بعدی *</label>
            <input
              type="date"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleChange}
              min={today}
              style={{ ...styles.input, opacity: isDisabled ? 0.5 : 1 }}
              disabled={isDisabled}
            />
          </div>

          <div>
            <label style={styles.label}>زمان مراجعه بعدی</label>
            <input
              type="time"
              name="follow_up_time"
              value={formData.follow_up_time}
              onChange={handleChange}
              style={{ ...styles.input, opacity: isDisabled ? 0.5 : 1 }}
              disabled={isDisabled}
            />
          </div>

          <div>
            <label style={styles.label}>اولویت</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              style={{ ...styles.select, opacity: isDisabled ? 0.5 : 1 }}
              disabled={isDisabled}
            >
              <option value="normal">🟢 عادی</option>
              <option value="urgent">🟡 فوری</option>
              <option value="emergency">🔴 اورژانسی</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label style={styles.label}>دلیل مراجعه بعدی *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              style={{ ...styles.textarea, opacity: isDisabled ? 0.5 : 1 }}
              placeholder="دلیل مراجعه بعدی را وارد کنید..."
              disabled={isDisabled}
            />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label style={styles.label}>دستورالعمل‌ها</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              rows="2"
              style={{ ...styles.textarea, opacity: isDisabled ? 0.5 : 1 }}
              placeholder="دستورالعمل‌های لازم برای مراجعه بعدی..."
              disabled={isDisabled}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginTop: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            style={{
              ...styles.btn,
              background: "#6b7280",
              color: "white",
              padding: "12px 24px",
              fontSize: "13px",
            }}
          >
            ↩️ برگشت
          </button>

          <button
            type="submit"
            disabled={loading || isDisabled}
            style={{
              ...styles.btn,
              background: isDisabled ? "#6b7280" : "#10b981",
              color: "white",
              padding: "12px 24px",
              fontSize: "13px",
              cursor: loading || isDisabled ? "not-allowed" : "pointer",
            }}
          >
            📤 {loading ? "در حال ثبت..." : "ثبت مراجعه"}
          </button>

          <button
            type="button"
            onClick={onFinish}
            disabled={isCompleted || isSubmitting}
            style={{
              ...styles.btn,
              background: isCompleted ? "#6b7280" : "#ef4444",
              color: "white",
              padding: "12px 24px",
              fontSize: "13px",
            }}
          >
            🏁 {isCompleted ? "✅ ختم شده" : "ختم معالجه"}
          </button>

          {nextStep && (
            <button
              type="button"
              onClick={onNextStep}
              disabled={isSubmitting}
              style={{
                ...styles.btn,
                background: isSubmitting ? "#6b7280" : "#3b82f6",
                color: "white",
                padding: "12px 24px",
                fontSize: "13px",
              }}
            >
              ➡️ مرحله بعد
            </button>
          )}
        </div>
      </form>

      {/* ============================================================ */}
      {/* ✅ لیست مراجعات ثبت‌شده */}
      {/* ============================================================ */}
      <div style={styles.sectionCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "10px",
          }}
        >
          <h3 style={{ color: "#10b981", margin: 0, fontSize: "15px" }}>
            📋 مراجعات ثبت‌شده ({followUps.length})
          </h3>
          <button
            type="button"
            onClick={fetchFollowUps}
            disabled={listLoading}
            style={{
              ...styles.btn,
              background: "#3b82f6",
              color: "white",
              padding: "6px 12px",
            }}
          >
            🔄 {listLoading ? "..." : "بروزرسانی"}
          </button>
        </div>

        {listLoading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>
            ⏳ در حال بارگذاری...
          </div>
        ) : followUps.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "#6b7280",
              background: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📭</div>
            <div>هیچ مراجعه بعدی ثبت نشده است</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>تاریخ</th>
                  <th style={styles.th}>ساعت</th>
                  <th style={styles.th}>اولویت</th>
                  <th style={styles.th}>وضعیت</th>
                  <th style={styles.th}>دلیل</th>
                  <th style={styles.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((item, idx) => {
                  const badge = getStatusBadge(item.status);
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <tr key={item.id} style={{ background: "#fffbeb" }}>
                        <td style={styles.td}>{idx + 1}</td>
                        <td style={styles.td}>
                          <input
                            type="date"
                            value={editFormData.follow_up_date}
                            onChange={handleEditChange}
                            name="follow_up_date"
                            style={{ ...styles.input, padding: "5px 8px", fontSize: "12px" }}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="time"
                            value={editFormData.follow_up_time}
                            onChange={handleEditChange}
                            name="follow_up_time"
                            style={{ ...styles.input, padding: "5px 8px", fontSize: "12px" }}
                          />
                        </td>
                        <td style={styles.td}>
                          <select
                            value={editFormData.priority}
                            onChange={handleEditChange}
                            name="priority"
                            style={{ ...styles.select, padding: "5px 8px", fontSize: "12px" }}
                          >
                            <option value="normal">🟢 عادی</option>
                            <option value="urgent">🟡 فوری</option>
                            <option value="emergency">🔴 اورژانسی</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={editFormData.status}
                            onChange={handleEditChange}
                            name="status"
                            style={{ ...styles.select, padding: "5px 8px", fontSize: "12px" }}
                          >
                            <option value="pending">⏳ در انتظار</option>
                            <option value="confirmed">✅ تأیید شده</option>
                            <option value="completed">✅ انجام شده</option>
                            <option value="cancelled">❌ لغو شده</option>
                            <option value="no_show">🚫 نیامده</option>
                          </select>
                        </td>
                        <td style={styles.td} colSpan={2}>
                          <textarea
                            value={editFormData.reason}
                            onChange={handleEditChange}
                            name="reason"
                            rows="2"
                            style={{
                              ...styles.textarea,
                              padding: "5px 8px",
                              fontSize: "12px",
                              minHeight: "40px",
                            }}
                          />
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>
                        <strong>{formatDate(item.follow_up_date)}</strong>
                      </td>
                      <td style={styles.td}>{item.follow_up_time || "-"}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            color: getPriorityColor(item.priority),
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          {getPriorityLabel(item.priority)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {badge.text}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div
                          style={{
                            maxWidth: "220px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.reason || ""}
                        >
                          {item.reason || "-"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={loading}
                              style={{
                                ...styles.btn,
                                background: "#10b981",
                                color: "white",
                              }}
                            >
                              💾 ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              style={{
                                ...styles.btn,
                                background: "#6b7280",
                                color: "white",
                              }}
                            >
                              ✕ لغو
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFollowUp(item);
                                setShowDetailModal(true);
                              }}
                              style={{
                                ...styles.btn,
                                background: "#3b82f6",
                                color: "white",
                              }}
                              title="مشاهده"
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrint(item)}
                              style={{
                                ...styles.btn,
                                background: "#8b5cf6",
                                color: "white",
                              }}
                              title="پرینت"
                            >
                              🖨️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              disabled={isDisabled}
                              style={{
                                ...styles.btn,
                                background: "#f59e0b",
                                color: "white",
                              }}
                              title="ویرایش"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              disabled={isDisabled}
                              style={{
                                ...styles.btn,
                                background: "#ef4444",
                                color: "white",
                              }}
                              title="حذف"
                            >
                              🗑️
                            </button>
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
      </div>

      {/* ============================================================ */}
      {/* ✅ Modal: تأیید حذف */}
      {/* ============================================================ */}
      {deleteConfirmId && (
        <div style={styles.modal} onClick={() => setDeleteConfirmId(null)}>
          <div
            style={{ ...styles.modalContent, maxWidth: "400px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
              <h3 style={{ color: "#ef4444", marginBottom: "12px" }}>
                تأیید حذف
              </h3>
              <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                آیا مطمئن هستید که می‌خواهید این مراجعه بعدی را حذف کنید؟
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={loading}
                  style={{
                    ...styles.btn,
                    background: "#ef4444",
                    color: "white",
                    padding: "10px 20px",
                  }}
                >
                  🗑️ {loading ? "..." : "بله، حذف کن"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    ...styles.btn,
                    background: "#6b7280",
                    color: "white",
                    padding: "10px 20px",
                  }}
                >
                  لغو
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ✅ Modal: نمایش جزئیات */}
      {/* ============================================================ */}
      {showDetailModal && selectedFollowUp && (
        <div style={styles.modal} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #e5e7eb",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, color: "#10b981", fontSize: "16px" }}>
                📅 جزئیات مراجعه بعدی
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handlePrint(selectedFollowUp)}
                  style={{
                    ...styles.btn,
                    background: "#8b5cf6",
                    color: "white",
                    padding: "8px 14px",
                  }}
                >
                  🖨️ پرینت
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    ...styles.btn,
                    background: "#6b7280",
                    color: "white",
                    padding: "8px 14px",
                  }}
                >
                  ✕ بستن
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>تاریخ</span>
                <div style={styles.infoValue}>
                  {formatDate(selectedFollowUp.follow_up_date)}
                </div>
              </div>

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>ساعت</span>
                <div style={styles.infoValue}>
                  {selectedFollowUp.follow_up_time || "-"}
                </div>
              </div>

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>اولویت</span>
                <div
                  style={{
                    ...styles.infoValue,
                    color: getPriorityColor(selectedFollowUp.priority),
                  }}
                >
                  {getPriorityLabel(selectedFollowUp.priority)}
                </div>
              </div>

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>وضعیت</span>
                <div style={{ marginTop: "4px" }}>
                  {(() => {
                    const b = getStatusBadge(selectedFollowUp.status);
                    return (
                      <span
                        style={{
                          background: b.bg,
                          color: b.color,
                          padding: "4px 12px",
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

              {selectedFollowUp.barcode && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>بارکد</span>
                  <div
                    style={{
                      ...styles.infoValue,
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                  >
                    {selectedFollowUp.barcode}
                  </div>
                </div>
              )}

              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>دلیل مراجعه</span>
                <div
                  style={{
                    ...styles.infoValue,
                    fontWeight: "normal",
                    lineHeight: "1.6",
                  }}
                >
                  {selectedFollowUp.reason || "-"}
                </div>
              </div>

              {selectedFollowUp.instructions && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>دستورالعمل‌ها</span>
                  <div
                    style={{
                      ...styles.infoValue,
                      fontWeight: "normal",
                      lineHeight: "1.6",
                    }}
                  >
                    {selectedFollowUp.instructions}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}