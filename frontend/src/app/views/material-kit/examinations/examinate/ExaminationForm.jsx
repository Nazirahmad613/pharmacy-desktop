// src/app/pages/treatment/examinate/ExaminationForm.jsx
// استایل کاملاً مطابق PharmacyFeeTab

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function ExaminationForm({
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
  savedData,
  allExaminations,
  isExamined,
  setIsExamined,
  setAllExaminations,
}) {
  const emptyForm = {
    diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
    pulse: "",
    respiratory_rate: "",
    height: "",
    bmi: "",
    chief_complaint: "",
    history_of_present_illness: "",
    past_medical_history: "",
    physical_examination: "",
    note: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingExamination, setEditingExamination] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isFormLocked, setIsFormLocked] = useState(false);

  // ============ State تب و جستجو ============
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  // ============ بارگذاری از props ============
  useEffect(() => {
    if (savedData) {
      setFormData({
        diagnosis: savedData.diagnosis || "",
        weight: savedData.weight || "",
        blood_pressure: savedData.blood_pressure || "",
        temperature: savedData.temperature || "",
        oxygen: savedData.oxygen || "",
        pulse: savedData.pulse || "",
        respiratory_rate: savedData.respiratory_rate || "",
        height: savedData.height || "",
        bmi: savedData.bmi || "",
        chief_complaint: savedData.chief_complaint || "",
        history_of_present_illness: savedData.history_of_present_illness || "",
        past_medical_history: savedData.past_medical_history || "",
        physical_examination: savedData.physical_examination || "",
        note: savedData.note || "",
      });
      if (savedData.id) setIsFormLocked(true);
    } else {
      setFormData(emptyForm);
      setIsFormLocked(false);
    }
  }, [savedData]);

  // ============ دریافت اطلاعات مریض ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;
    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/registrations/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        if (data.visit_status === "Completed") setIsCompleted(true);
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
      }
    };
    fetchPatientInfo();
  }, [registration?.reg_id, api]);

  // ============ بررسی وجود معاینه ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;
    const checkExamination = async () => {
      try {
        const response = await api.get(`/doctor/examination/${registration.reg_id}`);
        if (response.data?.success && response.data?.data) {
          const data = response.data.data;
          if (data.all_examinations && setAllExaminations) {
            setAllExaminations(data.all_examinations);
          }
          if (data.examination) {
            if (setIsExamined) setIsExamined(true);
            setIsFormLocked(true);
            setFormData({
              diagnosis: data.examination.diagnosis || "",
              weight: data.examination.weight || "",
              blood_pressure: data.examination.blood_pressure || "",
              temperature: data.examination.temperature || "",
              oxygen: data.examination.oxygen || "",
              pulse: data.examination.pulse || "",
              respiratory_rate: data.examination.respiratory_rate || "",
              height: data.examination.height || "",
              bmi: data.examination.bmi || "",
              chief_complaint: data.examination.chief_complaint || "",
              history_of_present_illness: data.examination.history_of_present_illness || "",
              past_medical_history: data.examination.past_medical_history || "",
              physical_examination: data.examination.physical_examination || "",
              note: data.examination.note || "",
            });
          } else {
            setIsFormLocked(false);
          }
        }
      } catch (err) {
        setIsFormLocked(false);
      }
    };
    checkExamination();
  }, [registration?.reg_id, api]);

  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "#ef4444" }}>
        <div style={{ fontSize: "60px", marginBottom: "20px" }}>⚠️</div>
        <div style={{ fontSize: "18px" }}>اطلاعات مریض معتبر نیست</div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ============ ثبت معاینه ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chief_complaint) {
      toast.warning("⚠️ لطفاً شکایت اصلی را وارد کنید");
      return;
    }
    if (!formData.diagnosis) {
      toast.warning("⚠️ لطفاً تشخیص را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const result = await onSave(formData);
      if (result?.data?.examination) {
        setIsExamined(true);
        setIsFormLocked(true);
        const examData = result.data.examination;
        setFormData({
          diagnosis: examData.diagnosis || "",
          weight: examData.weight || "",
          blood_pressure: examData.blood_pressure || "",
          temperature: examData.temperature || "",
          oxygen: examData.oxygen || "",
          pulse: examData.pulse || "",
          respiratory_rate: examData.respiratory_rate || "",
          height: examData.height || "",
          bmi: examData.bmi || "",
          chief_complaint: examData.chief_complaint || "",
          history_of_present_illness: examData.history_of_present_illness || "",
          past_medical_history: examData.past_medical_history || "",
          physical_examination: examData.physical_examination || "",
          note: examData.note || "",
        });
        if (result.data.all_examinations && setAllExaminations) {
          setAllExaminations(result.data.all_examinations);
        }
      }
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
    } catch (err) {
      toast.error(`❌ خطا در ثبت معاینه: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ویرایش ============
  const handleEditExamination = (examination) => {
    setEditingExamination(examination);
    setFormData({
      diagnosis: examination.diagnosis || "",
      weight: examination.weight || "",
      blood_pressure: examination.blood_pressure || "",
      temperature: examination.temperature || "",
      oxygen: examination.oxygen || "",
      pulse: examination.pulse || "",
      respiratory_rate: examination.respiratory_rate || "",
      height: examination.height || "",
      bmi: examination.bmi || "",
      chief_complaint: examination.chief_complaint || "",
      history_of_present_illness: examination.history_of_present_illness || "",
      past_medical_history: examination.past_medical_history || "",
      physical_examination: examination.physical_examination || "",
      note: examination.note || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateExamination = async () => {
    if (!editingExamination) return;
    if (!formData.chief_complaint) {
      toast.warning("⚠️ لطفاً شکایت اصلی را وارد کنید");
      return;
    }
    if (!formData.diagnosis) {
      toast.warning("⚠️ لطفاً تشخیص را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const response = await api.put(`/doctor/examinations/${editingExamination.id}`, formData);
      if (response.data?.data?.all_examinations && setAllExaminations) {
        setAllExaminations(response.data.data.all_examinations);
      }
      toast.success("✅ معاینه با موفقیت ویرایش شد");
      setShowEditModal(false);
      setEditingExamination(null);
      if (response.data?.data?.examination) {
        setIsExamined(true);
        setIsFormLocked(true);
      }
    } catch (err) {
      toast.error(`❌ خطا در ویرایش معاینه: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ حذف ============
  const handleDeleteExamination = async (examinationId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این معاینه را حذف کنید؟")) return;
    try {
      const response = await api.delete(`/doctor/examinations/${examinationId}`);
      if (response.data?.data && setAllExaminations) {
        setAllExaminations(response.data.data);
      }
      toast.success("✅ معاینه با موفقیت حذف شد");
      if (savedData && savedData.id === examinationId) {
        setIsExamined(false);
        setIsFormLocked(false);
        setFormData(emptyForm);
      }
    } catch (err) {
      toast.error(`❌ خطا در حذف معاینه: ${err.response?.data?.message || err.message}`);
    }
  };

  // ============ پرینت ============
  const handlePrint = (examination) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد. لطفاً pop-up را فعال کنید.");
      return;
    }
    const patient = patientInfo?.patient || registration.patient || {};
    const printContent = `
      <html dir="rtl">
        <head>
          <title>معاینه مریض</title>
          <style>
            body { font-family: 'Tahoma', Arial, sans-serif; padding: 20px; direction: rtl; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin: 15px 0; }
            .info-item { margin: 5px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .signature { margin-top: 30px; border-top: 1px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🩺 معاینه مریض</h2>
            <p>تاریخ: ${new Date(examination.examination_date).toLocaleDateString("fa-IR")}</p>
          </div>
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ""} ${patient.last_name || ""}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration.visit_number || "-"}</span></div>
            <div class="info-item"><span class="label">سن:</span> <span class="value">${patient.age || "-"}</span></div>
          </div>
          <h3>📋 اطلاعات معاینه</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>شکایت اصلی</td><td>${examination.chief_complaint || "-"}</td></tr>
            <tr><td>تشخیص</td><td>${examination.diagnosis || "-"}</td></tr>
            <tr><td>وزن</td><td>${examination.weight ? examination.weight + " کیلوگرم" : "-"}</td></tr>
            <tr><td>قد</td><td>${examination.height ? examination.height + " سانتی‌متر" : "-"}</td></tr>
            <tr><td>BMI</td><td>${examination.bmi || "-"}</td></tr>
            <tr><td>فشار خون</td><td>${examination.blood_pressure || "-"}</td></tr>
            <tr><td>حرارت</td><td>${examination.temperature ? examination.temperature + "°C" : "-"}</td></tr>
            <tr><td>نبض</td><td>${examination.pulse || "-"}</td></tr>
            <tr><td>تعداد تنفس</td><td>${examination.respiratory_rate || "-"}</td></tr>
            <tr><td>اکسیژن</td><td>${examination.oxygen ? examination.oxygen + "%" : "-"}</td></tr>
            <tr><td>یادداشت</td><td>${examination.note || "-"}</td></tr>
          </table>
          <div class="signature">
            <p>دکتر: ${examination.user?.name || "-"}</p>
            <p>امضاء: _________________</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const patient = patientInfo?.patient || registration.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting || isFormLocked;
  const examinations = allExaminations || [];

  const getGenderText = (gender) => {
    if (!gender) return "-";
    const genderMap = { male: "♂️ مرد", female: "♀️ زن", other: "⚧️ دیگر" };
    return genderMap[gender] || gender;
  };

  const getBloodGroupText = (bloodGroup) => bloodGroup || "-";

  // ============ استایل‌ها (دقیقاً مطابق PharmacyFeeTab) ============
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
      maxWidth: "900px",
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
      minHeight: "60px",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#374151",
      fontWeight: "bold",
      marginBottom: "6px",
      marginTop: "12px",
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
    stepNavigation: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "15px 20px",
      marginTop: "20px",
      backgroundColor: "white",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      flexWrap: "wrap",
      gap: "10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    stepNavButton: {
      padding: "10px 24px",
      borderRadius: "8px",
      border: "none",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "13px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.2s ease",
    },
  };

  // ============ فیلترها ============
  const filterBySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter((e) => {
      return (
        String(e.id || "").includes(term) ||
        (e.diagnosis || "").toLowerCase().includes(term) ||
        (e.chief_complaint || "").toLowerCase().includes(term) ||
        (e.user?.name || "").toLowerCase().includes(term)
      );
    });
  };

  const filteredExaminations = filterBySearch(examinations);

  const getActiveList = () => {
    if (activeTab === "current") {
      // فقط معاینه جاری (اگر وجود دارد)
      return savedData?.id
        ? filteredExaminations.filter((e) => e.id === savedData.id)
        : [];
    }
    return filteredExaminations;
  };

  const activeList = getActiveList();

  // ============ تب‌ها ============
  const tabs = [
    { key: "all", label: "📋 همه معاینات", count: filteredExaminations.length },
    { key: "current", label: "🩺 معاینه جاری", count: savedData?.id ? 1 : 0 },
  ];

  // ============ Render ============
  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{examinations.length}</div>
          <div style={styles.statLabel}>کل معاینات</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isExamined ? "#22c55e" : "#f59e0b" }}>
            {isExamined ? "✅" : "⏳"}
          </div>
          <div style={styles.statLabel}>وضعیت معاینه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isCompleted ? "#22c55e" : "#f59e0b" }}>
            {isCompleted ? "✅" : "⏳"}
          </div>
          <div style={styles.statLabel}>وضعیت معالجه</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isFormLocked ? "#3b82f6" : "#6b7280" }}>
            {isFormLocked ? "🔒" : "🔓"}
          </div>
          <div style={styles.statLabel}>وضعیت فرم</div>
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
            <span style={styles.infoLabel}>گروه خونی</span>
            <div style={styles.infoValue}>{getBloodGroupText(patient.blood_group)}</div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره تماس</span>
            <div style={styles.infoValue} dir="ltr">
              {patient.mobile || "-"}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره مراجعه</span>
            <div style={styles.infoValue}>#{registration.reg_id || "-"}</div>
          </div>
        </div>
      </div>

      {/* ====== فرم ثبت معاینه ====== */}
      <form onSubmit={handleSubmit} style={styles.sectionCard}>
        <h3 style={{ color: "#10b981", marginTop: 0, marginBottom: "20px" }}>
          🩺 فرم معاینه
          {isFormLocked && (
            <span
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "2px 12px",
                borderRadius: "12px",
                fontSize: "11px",
                marginRight: "10px",
                fontWeight: "normal",
              }}
            >
              🔒 قفل شده
            </span>
          )}
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* ستون راست - علایم حیاتی */}
          <div>
            <h4 style={{ color: "#059669", marginBottom: "10px", fontSize: "14px" }}>
              📊 علایم حیاتی
            </h4>

            <label style={styles.label}>وزن (کیلوگرم)</label>
            <input
              type="number"
              step="0.1"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 70.5"
              disabled={isDisabled}
            />

            <label style={styles.label}>قد (سانتی‌متر)</label>
            <input
              type="number"
              step="0.1"
              name="height"
              value={formData.height}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 175"
              disabled={isDisabled}
            />

            <label style={styles.label}>BMI</label>
            <input
              type="number"
              step="0.1"
              name="bmi"
              value={formData.bmi}
              onChange={handleChange}
              style={styles.input}
              placeholder="محاسبه خودکار"
              disabled={isDisabled}
            />

            <label style={styles.label}>فشار خون</label>
            <input
              type="text"
              name="blood_pressure"
              value={formData.blood_pressure}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 120/80"
              disabled={isDisabled}
            />

            <label style={styles.label}>حرارت (درجه سانتی‌گراد)</label>
            <input
              type="number"
              step="0.1"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 36.5"
              disabled={isDisabled}
            />

            <label style={styles.label}>نبض (ضربه در دقیقه)</label>
            <input
              type="number"
              name="pulse"
              value={formData.pulse}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 72"
              disabled={isDisabled}
            />

            <label style={styles.label}>تعداد تنفس (در دقیقه)</label>
            <input
              type="number"
              name="respiratory_rate"
              value={formData.respiratory_rate}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 16"
              disabled={isDisabled}
            />

            <label style={styles.label}>اکسیجن (%)</label>
            <input
              type="number"
              name="oxygen"
              value={formData.oxygen}
              onChange={handleChange}
              style={styles.input}
              placeholder="مثلاً 98"
              disabled={isDisabled}
            />
          </div>

          {/* ستون چپ - ارزیابی بالینی */}
          <div>
            <h4 style={{ color: "#059669", marginBottom: "10px", fontSize: "14px" }}>
              📋 ارزیابی بالینی
            </h4>

            <label style={styles.label}>شکایت اصلی *</label>
            <textarea
              name="chief_complaint"
              value={formData.chief_complaint}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="شکایت اصلی مریض را وارد کنید..."
              disabled={isDisabled}
              required
            />

            <label style={styles.label}>تاریخچه بیماری فعلی</label>
            <textarea
              name="history_of_present_illness"
              value={formData.history_of_present_illness}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="تاریخچه بیماری فعلی..."
              disabled={isDisabled}
            />

            <label style={styles.label}>سابقه پزشکی قبلی</label>
            <textarea
              name="past_medical_history"
              value={formData.past_medical_history}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="سابقه پزشکی قبلی..."
              disabled={isDisabled}
            />

            <label style={styles.label}>معاینه فیزیکی</label>
            <textarea
              name="physical_examination"
              value={formData.physical_examination}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="نتایج معاینه فیزیکی..."
              disabled={isDisabled}
            />

            <label style={styles.label}>تشخیص *</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="تشخیص اولیه..."
              disabled={isDisabled}
              required
            />

            <label style={styles.label}>یادداشت‌های اضافی</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              style={styles.textarea}
              rows="2"
              placeholder="یادداشت‌های اضافی..."
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
            disabled={loading || isDisabled || isExamined}
            style={{
              ...styles.btn,
              background: isDisabled || isExamined ? "#6b7280" : "#10b981",
              color: "white",
              padding: "12px 24px",
              fontSize: "13px",
              cursor: loading || isDisabled || isExamined ? "not-allowed" : "pointer",
            }}
          >
            💾 {loading ? "در حال ثبت..." : isExamined ? "✅ ثبت شده" : "ثبت معاینه"}
          </button>

          <button
            type="button"
            onClick={onFinish}
            disabled={!isExamined || isCompleted || isSubmitting}
            style={{
              ...styles.btn,
              background: !isExamined || isCompleted ? "#6b7280" : "#ef4444",
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

      {/* ====== نوار فیلترها (تب‌های راست‌چین) ====== */}
      {examinations.length > 0 && (
        <>
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
              placeholder="🔍 جستجوی تشخیص، شکایت، دکتر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* ====== جدول معاینات ====== */}
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
              <div>هیچ معاینه‌ای با این فیلتر یافت نشد</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>📅 تاریخ</th>
                    <th style={styles.th}>🩺 تشخیص</th>
                    <th style={styles.th}>📋 شکایت</th>
                    <th style={styles.th}>⚖️ وزن</th>
                    <th style={styles.th}>💓 فشار</th>
                    <th style={styles.th}>💓 نبض</th>
                    <th style={styles.th}>🌡️ دما</th>
                    <th style={styles.th}>🫁 اکسیژن</th>
                    <th style={styles.th}>👨‍⚕️ دکتر</th>
                    <th style={styles.th}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((exam, index) => (
                    <tr key={exam.id || index}>
                      <td style={styles.td}>
                        {index + 1}
                        {exam.id === savedData?.id && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "10px",
                              color: "#10b981",
                              fontWeight: "bold",
                            }}
                          >
                            جاری
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: "12px" }}>
                          📅 {new Date(exam.examination_date).toLocaleDateString("fa-IR")}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "bold", color: "#d48806", maxWidth: "150px" }}>
                          {exam.diagnosis || "-"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: "12px", color: "#6b7280", maxWidth: "150px" }}>
                          {exam.chief_complaint || "-"}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold" }}>
                        {exam.weight ? `${exam.weight} kg` : "-"}
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#d48806" }}>
                        {exam.blood_pressure || "-"}
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#16a34a" }}>
                        {exam.pulse || "-"}
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#3b82f6" }}>
                        {exam.temperature ? `${exam.temperature}°C` : "-"}
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#3b82f6" }}>
                        {exam.oxygen ? `${exam.oxygen}%` : "-"}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: "12px" }}>👨‍⚕️ {exam.user?.name || "-"}</div>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={{ ...styles.btn, background: "#3b82f6", color: "white" }}
                          onClick={() => handleEditExamination(exam)}
                        >
                          ✏️
                        </button>
                        <button
                          style={{ ...styles.btn, background: "#ef4444", color: "white" }}
                          onClick={() => handleDeleteExamination(exam.id)}
                        >
                          🗑️
                        </button>
                        <button
                          style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                          onClick={() => handlePrint(exam)}
                        >
                          🖨️
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

      {/* ====== مودال ویرایش (سفید مثل PharmacyFeeTab) ====== */}
      {showEditModal && editingExamination && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>
              ✏️ ویرایش معاینه #{editingExamination.id}
            </h2>

            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                👤 معلومات بیمار
              </h3>
              <div style={{ fontSize: "13px", color: "#1f2937" }}>
                <b>نام:</b> {patient.first_name || ""} {patient.last_name || ""} —{" "}
                <b>شماره مراجعه:</b> #{registration.reg_id || "-"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>شکایت اصلی *</label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  rows="2"
                  style={styles.textarea}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>تشخیص *</label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows="2"
                  style={styles.textarea}
                />
              </div>

              <div>
                <label style={styles.label}>وزن (کیلوگرم)</label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>فشار خون</label>
                <input
                  type="text"
                  name="blood_pressure"
                  value={formData.blood_pressure}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>حرارت (درجه سانتی‌گراد)</label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>نبض (ضربه در دقیقه)</label>
                <input
                  type="number"
                  name="pulse"
                  value={formData.pulse}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>اکسیجن (%)</label>
                <input
                  type="number"
                  name="oxygen"
                  value={formData.oxygen}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={styles.label}>یادداشت</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="2"
                  style={styles.textarea}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.btn,
                  background: "#6b7280",
                  color: "white",
                  padding: "10px 24px",
                }}
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExamination(null);
                }}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleUpdateExamination}
                disabled={loading}
                style={{
                  ...styles.btn,
                  background: "#10b981",
                  color: "white",
                  padding: "10px 24px",
                }}
              >
                {loading ? "⏳ در حال ذخیره..." : "✅ ذخیره تغییرات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}