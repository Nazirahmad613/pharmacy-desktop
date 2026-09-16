// src/app/pages/treatment/followup/FollowUp.jsx
// استایل کاملاً مطابق PharmacyFeeTab

import { useState, useEffect } from "react";
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
  const [formData, setFormData] = useState({
    follow_up_date: "",
    follow_up_time: "",
    reason: "",
    instructions: "",
    priority: "normal",
  });
  const [loading, setLoading] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  useEffect(() => {
    if (!registration || !registration.reg_id) return;
    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        if (data.follow_up) {
          setIsRequested(true);
          setFormData({
            follow_up_date: data.follow_up.follow_up_date || "",
            follow_up_time: data.follow_up.follow_up_time || "",
            reason: data.follow_up.reason || "",
            instructions: data.follow_up.instructions || "",
            priority: data.follow_up.priority || "normal",
          });
        }
        if (data.registration?.status === "completed") setIsCompleted(true);
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
      }
    };
    fetchPatientInfo();
  }, [registration?.reg_id, api]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.follow_up_date) {
      toast.warning("⚠️ لطفاً تاریخ مراجعه بعدی را انتخاب کنید");
      return;
    }
    if (!formData.reason) {
      toast.warning("⚠️ لطفاً دلیل مراجعه بعدی را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        reg_id: registration.reg_id,
        patient_id: registration.patient_id,
        doctor_id: registration.doctor_id,
        ...formData,
      };
      const response = await api.post("/doctor/follow-up", payload);
      if (response.data?.success) {
        toast.success("✅ مراجعه بعدی با موفقیت ثبت شد");
        setIsRequested(true);
        if (onSave) await onSave(formData);
        onRefresh();
      } else {
        toast.error("❌ خطا در ثبت مراجعه بعدی");
      }
    } catch (err) {
      console.error("خطا در ثبت مراجعه بعدی:", err);
      toast.error("❌ خطا در ثبت مراجعه بعدی");
    } finally {
      setLoading(false);
    }
  };

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

  const today = new Date().toISOString().split("T")[0];

  // ============ Styles (مطابق PharmacyFeeTab) ============
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
  };

  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isRequested ? "#22c55e" : "#f59e0b" }}>
            {isRequested ? "✅" : "⏳"}
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
              {patient.mobile || "-"}
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

      {/* ====== فرم ====== */}
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
              style={{
                ...styles.input,
                opacity: isDisabled || isRequested ? 0.5 : 1,
              }}
              disabled={isDisabled || isRequested}
            />
          </div>

          <div>
            <label style={styles.label}>زمان مراجعه بعدی</label>
            <input
              type="time"
              name="follow_up_time"
              value={formData.follow_up_time}
              onChange={handleChange}
              style={{
                ...styles.input,
                opacity: isDisabled || isRequested ? 0.5 : 1,
              }}
              disabled={isDisabled || isRequested}
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
              style={{
                ...styles.textarea,
                opacity: isDisabled || isRequested ? 0.5 : 1,
              }}
              placeholder="دلیل مراجعه بعدی را وارد کنید..."
              disabled={isDisabled || isRequested}
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
            disabled={loading || isDisabled || isRequested}
            style={{
              ...styles.btn,
              background: isDisabled || isRequested ? "#6b7280" : "#10b981",
              color: "white",
              padding: "12px 24px",
              fontSize: "13px",
              cursor: loading || isDisabled || isRequested ? "not-allowed" : "pointer",
            }}
          >
            📤 {loading ? "در حال ثبت..." : isRequested ? "✅ ثبت شده" : "ثبت مراجعه"}
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
    </div>
  );
}