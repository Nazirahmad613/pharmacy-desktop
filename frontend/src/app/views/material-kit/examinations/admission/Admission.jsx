// src/app/pages/treatment/admission/Admission.jsx
// استایل کاملاً مطابق PharmacyFeeTab — بدون دکمه اخذ فیس

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

// ============ توابع کمکی ============
const getPatientFullName = (source) => {
  if (!source) return "نامشخص";
  if (source.full_name) return source.full_name;
  if (source.patient_name) return source.patient_name;
  if (source.patient?.full_name) return source.patient.full_name;
  if (source.patient?.first_name || source.patient?.last_name) {
    const name = `${source.patient.first_name || ""} ${source.patient.last_name || ""}`.trim();
    if (name) return name;
  }
  if (source.admission_request?.patient?.full_name) return source.admission_request.patient.full_name;
  if (source.admission_request?.patient_name) return source.admission_request.patient_name;
  if (source.admission?.patient?.full_name) return source.admission.patient.full_name;
  if (source.first_name || source.last_name) {
    const name = `${source.first_name || ""} ${source.last_name || ""}`.trim();
    if (name) return name;
  }
  return "نامشخص";
};

const getPatientNationalId = (source) => {
  if (!source) return "-";
  return (
    source.national_id ||
    source.patient?.national_id ||
    source.admission_request?.patient?.national_id ||
    source.admission_request?.national_id ||
    "-"
  );
};

const getPatientMobile = (source) => {
  if (!source) return "-";
  return (
    source.mobile ||
    source.phone ||
    source.patient?.mobile ||
    source.patient?.phone ||
    source.admission_request?.patient?.mobile ||
    source.admission_request?.mobile ||
    "-"
  );
};

const getPatientAge = (source) => {
  if (!source) return "-";
  const age = source.patient?.age || source.age || source.patient_age;
  return age ? `${age} سال` : "-";
};

const getPatientGender = (source) => {
  if (!source) return "-";
  const g = source.patient?.gender || source.gender || source.patient_gender;
  if (!g) return "-";
  const map = { Male: "مرد", male: "مرد", Female: "زن", female: "زن", other: "دیگر" };
  return map[g] || g;
};

const getWardName = (source) => {
  if (!source) return "-";
  return (
    source.ward_name ||
    source.ward?.name ||
    source.admission_request?.ward_name ||
    source.admission_request?.ward?.name ||
    source.admission?.ward?.name ||
    "-"
  );
};

const getDoctorName = (source) => {
  if (!source) return "-";
  return (
    source.doctor_name ||
    source.doctor?.name ||
    source.admission_request?.doctor_name ||
    source.admission_request?.doctor?.name ||
    "-"
  );
};

const formatDate = (date) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("fa-IR");
  } catch {
    return "-";
  }
};

const formatDateTime = (date) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("fa-IR");
  } catch {
    return "-";
  }
};

const formatTime = (date) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
};

const getDischargeTypeLabel = (type) => {
  const types = {
    regular: "ترخیص عادی",
    against_advice: "ترخیص با رضایت شخصی",
    transferred: "انتقال به مرکز دیگر",
    deceased: "فوت",
    escaped: "فرار از بیمارستان",
  };
  return types[type] || type || "-";
};

export default function Admission({
  registration,
  onComplete,
  onRefresh,
  api,
  onSave,
  onFinish,
  onNextStep,
  onPrevStep,
  isSubmitting,
  allAdmissionRequests = [],
  fetchAllAdmissions = null,
}) {
  // ============ State ============
  const [formData, setFormData] = useState({
    ward_id: "",
    admission_type: "emergency",
    diagnosis: "",
    admission_instructions: "",
    special_notes: "",
    priority: "normal",
  });
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [isDischarged, setIsDischarged] = useState(false);
  const [dischargeInfo, setDischargeInfo] = useState(null);
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionData, setAdmissionData] = useState(null);
  const [instructionsList, setInstructionsList] = useState([]);
  const [instructionInput, setInstructionInput] = useState("");

  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // ============ Effects ============
  useEffect(() => {
    if (allAdmissionRequests && Array.isArray(allAdmissionRequests)) {
      setAdmissionRequests(allAdmissionRequests);
    }
    fetchWards();
    checkAdmissionStatus();
  }, [registration, allAdmissionRequests]);

  useEffect(() => {
    if (!registration?.reg_id) return;
    const interval = setInterval(() => {
      checkAdmissionStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [registration?.reg_id]);

  // ============ بررسی وضعیت بستری ============
  const checkAdmissionStatus = async () => {
    if (!registration?.reg_id) return;
    try {
      const response = await api.get(`/admissions/status/${registration.reg_id}`);
      if (response.data?.data) {
        const data = response.data.data;
        const discharged =
          data.status === "discharged" ||
          data.is_discharged === true ||
          (data.discharge_date && data.status !== "admitted");

        setIsAdmitted(data.is_admitted || false);
        setIsDischarged(discharged);
        setAdmissionId(data.admission_id || null);
        setAdmissionData(data);

        if (discharged) {
          setDischargeInfo({
            discharge_date: data.discharge_date,
            discharge_type: data.discharge_type,
            discharge_reason: data.discharge_reason,
            discharge_notes: data.discharge_notes,
            discharged_by: data.discharged_by,
            ward_name: data.ward_name,
          });
          if (!isDischarged) {
            toast.warning("🚪 بیمار ترخیص شده است. لطفاً معالجه را ختم کنید.", {
              autoClose: 8000,
              position: "top-center",
            });
          }
        }

        if (data.is_admitted && !discharged) {
          setFormData((prev) => ({
            ...prev,
            ward_id: data.ward_id || "",
            admission_type: data.admission_type || "emergency",
            diagnosis: data.diagnosis || "",
            admission_instructions: data.admission_instructions || "",
            special_notes: data.special_notes || "",
            priority: data.priority || "normal",
          }));
          if (data.admission_instructions) {
            const instructions = data.admission_instructions.split("\n").filter((item) => item.trim());
            setInstructionsList(instructions);
          }
        }
      }
    } catch (err) {
      console.error("خطا در بررسی وضعیت بستری:", err);
    }
  };

  useEffect(() => {
    if (allAdmissionRequests && Array.isArray(allAdmissionRequests) && registration?.reg_id) {
      const existingRequest = allAdmissionRequests.find((req) => req.reg_id === registration.reg_id);
      if (existingRequest) {
        const discharged =
          existingRequest.status === "discharged" ||
          existingRequest.is_discharged === true ||
          (existingRequest.discharge_date && existingRequest.status !== "admitted");
        setAdmissionData(existingRequest);
        setIsAdmitted(existingRequest.status === "admitted" && !discharged);
        setIsDischarged(discharged);
        if (discharged) {
          setDischargeInfo({
            discharge_date: existingRequest.discharge_date,
            discharge_type: existingRequest.discharge_type,
            discharge_reason: existingRequest.discharge_reason,
            discharge_notes: existingRequest.discharge_notes,
            ward_name: getWardName(existingRequest),
          });
        }
      }
    }
  }, [allAdmissionRequests, registration]);

  // ============ دریافت لیست بخش‌ها ============
  const fetchWards = async () => {
    setLoadingWards(true);
    try {
      const response = await api.get("/wards");
      let wardsData = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        wardsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        wardsData = response.data;
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        wardsData = response.data.data.data;
      }
      if (!Array.isArray(wardsData)) wardsData = [];
      setWards(wardsData);
    } catch (err) {
      console.error("❌ خطا در دریافت بخش‌ها:", err);
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectWard = (wardId) => {
    setFormData((prev) => ({ ...prev, ward_id: String(wardId) }));
  };

  const addInstruction = () => {
    if (instructionInput.trim()) {
      setInstructionsList((prev) => [...prev, instructionInput.trim()]);
      setInstructionInput("");
    }
  };

  const removeInstruction = (index) => {
    setInstructionsList((prev) => prev.filter((_, i) => i !== index));
  };

  const getInstructionsText = () => {
    return instructionsList.map((item, index) => `${index + 1}. ${item}`).join("\n");
  };

  const refreshAdmissionList = async () => {
    if (fetchAllAdmissions) {
      const data = await fetchAllAdmissions();
      if (data) setAdmissionRequests(data);
    }
    await checkAdmissionStatus();
  };

  // ============ ثبت درخواست بستری ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ward_id) {
      toast.warning("⚠️ لطفاً بخش بستری را انتخاب کنید");
      return;
    }
    if (instructionsList.length === 0 && !formData.diagnosis) {
      toast.warning("⚠️ لطفاً حداقل تشخیص یا یک دستورالعمل وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const instructionsText = getInstructionsText();
      const payload = {
        reg_id: registration?.reg_id,
        ward_id: formData.ward_id,
        admission_date: new Date().toISOString().split("T")[0],
        diagnosis: formData.diagnosis || registration?.diagnosis || "",
        admission_instructions: instructionsText || formData.admission_instructions,
        special_notes: formData.special_notes,
        priority: formData.priority,
      };
      const response = await api.post("/admissions", payload);
      if (response.data?.success) {
        toast.success("✅ درخواست بستری با موفقیت ثبت شد");
        setIsAdmitted(true);
        setAdmissionId(response.data.data?.id || null);
        setAdmissionData(response.data.data);
        if (onSave) await onSave(payload);
        if (onRefresh) onRefresh();
        await refreshAdmissionList();
        toast.info("➡️ برای اخذ فیس بستری به بخش مدیریت فیس مراجعه کنید");
        if (onNextStep) onNextStep();
        if (onComplete) onComplete();
      } else {
        toast.error("❌ خطا در ثبت درخواست بستری");
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response?.data?.errors;
        if (errors) {
          Object.keys(errors).forEach((field) => {
            const messages = errors[field];
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`❌ ${field}: ${msg}`));
            } else {
              toast.error(`❌ ${field}: ${messages}`);
            }
          });
        } else {
          toast.error("❌ خطا در اعتبارسنجی اطلاعات");
        }
      } else {
        toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ حذف ============
  const handleDeleteRequest = async (id) => {
    if (!window.confirm("آیا از حذف این درخواست بستری اطمینان دارید؟")) return;
    setLoading(true);
    try {
      await api.delete(`/admissions/${id}`);
      toast.success("✅ درخواست بستری با موفقیت حذف شد");
      await refreshAdmissionList();
    } catch (err) {
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ویرایش ============
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      ward_id: request.ward_id ? String(request.ward_id) : "",
      admission_type: request.admission_type || "emergency",
      diagnosis: request.diagnosis || "",
      admission_instructions: request.admission_instructions || "",
      special_notes: request.special_notes || "",
      priority: request.priority || "normal",
    });
    if (request.admission_instructions) {
      const instructions = request.admission_instructions.split("\n").filter((item) => item.trim());
      setInstructionsList(instructions);
    } else {
      setInstructionsList([]);
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;
    if (!formData.ward_id) {
      toast.warning("⚠️ لطفاً بخش بستری را انتخاب کنید");
      return;
    }
    setLoading(true);
    try {
      const instructionsText = getInstructionsText();
      const payload = {
        ward_id: formData.ward_id,
        admission_instructions: instructionsText || formData.admission_instructions,
        special_notes: formData.special_notes,
        priority: formData.priority,
        diagnosis: formData.diagnosis,
      };
      const response = await api.put(`/admissions/${editingRequest.id}`, payload);
      if (response.data?.success) {
        toast.success("✅ درخواست بستری با موفقیت ویرایش شد");
        setShowEditModal(false);
        setEditingRequest(null);
        await refreshAdmissionList();
      } else {
        toast.error("❌ خطا در ویرایش درخواست");
      }
    } catch (err) {
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ پرینت ============
  const handlePrintRequest = async (id) => {
    try {
      const response = await api.get(`/admissions/${id}/print`);
      const data = response.data.data;
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>رسید بستری</title>
              <style>
                body { font-family: 'Tahoma', sans-serif; padding: 20px; direction: rtl; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; color: #10b981; }
                .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; color: #555; }
                .value { color: #000; }
                .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 2px solid #333; font-size: 12px; color: #666; }
                .instructions { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                .instructions ul { list-style: none; padding: 0; }
                .instructions li { padding: 5px 0; border-bottom: 1px solid #ddd; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">🏥 رسید درخواست بستری</div>
                <div>${data.hospital_name || "بیمارستان"}</div>
                <div>${data.hospital_address || ""}</div>
                <div>تلفن: ${data.hospital_phone || ""}</div>
              </div>
              <div class="info">
                <div class="info-row"><span class="label">شماره بستری:</span><span class="value">#${data.admission?.id || id}</span></div>
                <div class="info-row"><span class="label">نام بیمار:</span><span class="value">${getPatientFullName(data.admission) || getPatientFullName(data)}</span></div>
                <div class="info-row"><span class="label">کد ملی:</span><span class="value">${getPatientNationalId(data.admission) || getPatientNationalId(data)}</span></div>
                <div class="info-row"><span class="label">بخش:</span><span class="value">${getWardName(data.admission) || getWardName(data)}</span></div>
                <div class="info-row"><span class="label">پزشک معالج:</span><span class="value">${getDoctorName(data.admission) || getDoctorName(data)}</span></div>
                <div class="info-row"><span class="label">تاریخ بستری:</span><span class="value">${formatDate(data.admission?.admission_date || data.admission_date)}</span></div>
                <div class="info-row"><span class="label">تشخیص:</span><span class="value">${data.admission?.diagnosis || data.diagnosis || "-"}</span></div>
                ${
                  data.admission?.admission_instructions || data.admission_instructions
                    ? `<div class="instructions"><strong>📋 دستورالعمل‌های بستری:</strong><ul>${(data.admission?.admission_instructions || data.admission_instructions)
                        .split("\n")
                        .map((item) => (item.trim() ? `<li>${item}</li>` : ""))
                        .join("")}</ul></div>`
                    : ""
                }
              </div>
              <div class="footer">
                <p>تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
                <p>با تشکر از اعتماد شما</p>
              </div>
              <script>window.onload = function() { window.print(); }<\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      toast.error("❌ خطا در پرینت رسید");
    }
  };

  // ============ ختم معالجه ============
  const handleCompleteTreatment = async () => {
    if (!isDischarged) {
      if (!window.confirm("⚠️ بیمار هنوز ترخیص نشده است.\n\nآیا می‌خواهید ابتدا ترخیص کنید و سپس معالجه را ختم کنید؟")) {
        return;
      }
      if (isAdmitted && admissionId) {
        try {
          setLoading(true);
          await api.post(`/admissions/${admissionId}/discharge`, {
            discharge_date: new Date().toISOString().split("T")[0],
            discharge_type: "regular",
            discharge_reason: "ترخیص توسط داکتر",
          });
          toast.info("🏥 بیمار از بخش بستری ترخیص شد");
          setIsDischarged(true);
        } catch (err) {
          toast.error("❌ خطا در ترخیص بیمار");
          setLoading(false);
          return;
        }
      }
    } else {
      if (!window.confirm("آیا مطمئن هستید که معالجه را ختم کنید؟\n\nاین عمل غیرقابل بازگشت است.")) {
        return;
      }
    }
    setLoading(true);
    try {
      const response = await api.post(`/admissions/complete-treatment/${registration?.reg_id}`);
      if (response.data?.success) {
        toast.success("✅ معالجه با موفقیت ختم شد");
        if (onFinish) onFinish();
        if (onComplete) onComplete();
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "❌ خطا در ختم معالجه");
      }
    } catch (err) {
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ناوبری ============
  const handleGoToPrev = () => {
    if (onPrevStep) {
      onPrevStep();
      toast.info("⬅️ رفتن به مرحله قبل");
    }
  };
  const handleGoToNext = () => {
    if (onNextStep) {
      onNextStep();
      toast.info("➡️ رفتن به مرحله بعد");
    }
  };

  // ============ Helpers ============
  const getStatusBadge = (status) => {
    const map = {
      admitted: { bg: "#d1fae5", color: "#065f46", text: "✅ بستری" },
      pending: { bg: "#fef3c7", color: "#92400e", text: "⏳ در انتظار" },
      discharged: { bg: "#f3f4f6", color: "#374151", text: "🚪 ترخیص شده" },
      cancelled: { bg: "#fee2e2", color: "#991b1b", text: "❌ لغو شده" },
      completed: { bg: "#ede9fe", color: "#5b21b6", text: "✅ معالجه ختم شده" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", text: status || "-" };
  };

  // ============ فیلترها ============
  const allCount = admissionRequests.length;
  const admittedCount = admissionRequests.filter((r) => r.status === "admitted").length;
  const pendingCount = admissionRequests.filter((r) => r.status === "pending").length;
  const dischargedCount = admissionRequests.filter(
    (r) => r.status === "discharged" || r.discharge_date
  ).length;
  const cancelledCount = admissionRequests.filter((r) => r.status === "cancelled").length;

  const getActiveList = () => {
    switch (activeTab) {
      case "admitted":
        return admissionRequests.filter((r) => r.status === "admitted");
      case "pending":
        return admissionRequests.filter((r) => r.status === "pending");
      case "discharged":
        return admissionRequests.filter((r) => r.status === "discharged" || r.discharge_date);
      case "cancelled":
        return admissionRequests.filter((r) => r.status === "cancelled");
      case "all":
      default:
        return admissionRequests;
    }
  };

  const filterBySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter((r) => {
      const name = getPatientFullName(r).toLowerCase();
      return (
        name.includes(term) ||
        String(r.id || "").includes(term) ||
        String(r.reg_id || "").includes(term) ||
        getWardName(r).toLowerCase().includes(term) ||
        getPatientNationalId(r).toLowerCase().includes(term) ||
        getPatientMobile(r).includes(term)
      );
    });
  };

  const activeList = filterBySearch(getActiveList());

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
      maxWidth: "700px",
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
    wardList: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginTop: "10px",
      maxHeight: "220px",
      overflowY: "auto",
    },
    wardItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 14px",
      background: "#f9fafb",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    wardItemSelected: {
      borderColor: "#10b981",
      background: "#f0fdf4",
    },
    wardName: { color: "#1f2937", fontWeight: "bold" },
    wardInfo: { color: "#6b7280", fontSize: "12px" },
    wardAvailable: { color: "#22c55e", fontSize: "12px", fontWeight: "bold" },
    wardFull: { color: "#ef4444", fontSize: "12px", fontWeight: "bold" },
    instructionItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
      marginBottom: "5px",
      border: "1px solid #e5e7eb",
    },
    instructionNumber: { color: "#f59e0b", fontWeight: "bold", marginRight: "10px" },
    instructionText: { color: "#1f2937", flex: 1 },
    instructionDelete: {
      color: "#ef4444",
      cursor: "pointer",
      background: "none",
      border: "none",
      fontSize: "16px",
    },
    instructionInputGroup: { display: "flex", gap: "10px", marginBottom: "10px" },
    instructionAddBtn: {
      padding: "8px 16px",
      backgroundColor: "#3b82f6",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    },
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

  // ============ تب‌ها ============
  const tabs = [
    { key: "all", label: "📋 همه", count: allCount },
    { key: "admitted", label: "✅ بستری", count: admittedCount },
    { key: "pending", label: "⏳ در انتظار", count: pendingCount },
    { key: "discharged", label: "🚪 ترخیص شده", count: dischargedCount },
    { key: "cancelled", label: "❌ لغو شده", count: cancelledCount },
  ];

  // ============ Render ============
  return (
    <div style={styles.container}>
      {/* ====== آمار ====== */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{allCount}</div>
          <div style={styles.statLabel}>کل درخواست‌ها</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#22c55e" }}>{admittedCount}</div>
          <div style={styles.statLabel}>بستری</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#f59e0b" }}>{pendingCount}</div>
          <div style={styles.statLabel}>در انتظار</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#6b7280" }}>{dischargedCount}</div>
          <div style={styles.statLabel}>ترخیص شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#8b5cf6" }}>{wards.length}</div>
          <div style={styles.statLabel}>بخش‌ها</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#10b981", fontSize: "16px" }}>
            {wards.reduce((s, w) => s + (w.available_beds || 0), 0)}
          </div>
          <div style={styles.statLabel}>تخت خالی</div>
        </div>
      </div>

      {/* ====== بنر ترخیص ====== */}
      {isDischarged && (
        <div
          style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "2px solid #f59e0b",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            color: "#92400e",
          }}
        >
          <div style={{ fontSize: "42px" }}>🚪</div>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
              ✅ بیمار ترخیص شده است
            </div>
            <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
              از بخش <strong>{dischargeInfo?.ward_name || getWardName(admissionData)}</strong>
              <br />
              {dischargeInfo?.discharge_date && (
                <>📅 تاریخ ترخیص: <strong>{formatDateTime(dischargeInfo.discharge_date)}</strong><br /></>
              )}
              {dischargeInfo?.discharge_type && (
                <>📋 نوع ترخیص: <strong>{getDischargeTypeLabel(dischargeInfo.discharge_type)}</strong></>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCompleteTreatment}
            disabled={loading}
            style={{
              ...styles.btn,
              background: "#10b981",
              color: "white",
              padding: "10px 24px",
              fontSize: "13px",
            }}
          >
            ✅ ختم معالجه
          </button>
        </div>
      )}

      {/* ====== وضعیت بیمار فعلی ====== */}
      <div style={styles.patientInfoCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, color: "#059669", fontSize: "16px" }}>👤 معلومات بیمار فعلی</h3>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "bold",
              background: isDischarged ? "#f3f4f6" : isAdmitted ? "#d1fae5" : "#fef3c7",
              color: isDischarged ? "#374151" : isAdmitted ? "#065f46" : "#92400e",
            }}
          >
            {isDischarged ? "🚪 ترخیص شده" : isAdmitted ? "✅ بستری" : "⏳ در انتظار"}
          </span>
        </div>
        <div style={styles.patientInfoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>نام کامل</span>
            <div style={styles.infoValue}>
              {getPatientFullName(registration) !== "نامشخص"
                ? getPatientFullName(registration)
                : getPatientFullName(admissionData)}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>کد ملی / تذکره</span>
            <div style={styles.infoValue}>
              {getPatientNationalId(registration) !== "-"
                ? getPatientNationalId(registration)
                : getPatientNationalId(admissionData)}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره تماس</span>
            <div style={styles.infoValue}>
              {getPatientMobile(registration) !== "-"
                ? getPatientMobile(registration)
                : getPatientMobile(admissionData)}
            </div>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>شماره مراجعه</span>
            <div style={styles.infoValue}>#{registration?.reg_id || "-"}</div>
          </div>
          {isAdmitted && admissionId && !isDischarged && (
            <>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>شماره بستری</span>
                <div style={styles.infoValue}>#{admissionId}</div>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>بخش</span>
                <div style={styles.infoValue}>{getWardName(admissionData)}</div>
              </div>
            </>
          )}
          {isDischarged && dischargeInfo?.ward_name && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>بخش قبلی</span>
              <div style={styles.infoValue}>{dischargeInfo.ward_name}</div>
            </div>
          )}
        </div>
      </div>

      {/* ====== فرم بستری (اگر بستری نشده) ====== */}
      {!isAdmitted && !isDischarged && (
        <form onSubmit={handleSubmit} style={styles.sectionCard}>
          <h3 style={{ color: "#10b981", marginTop: 0, marginBottom: "20px" }}>
            📝 فرم درخواست بستری
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>انتخاب بخش بستری *</label>
              {loadingWards ? (
                <div style={{ color: "#6b7280", padding: "10px" }}>⏳ در حال بارگذاری بخش‌ها...</div>
              ) : !Array.isArray(wards) || wards.length === 0 ? (
                <div style={{ color: "#f59e0b", padding: "10px" }}>
                  ⚠️ هیچ بخشی یافت نشد. لطفاً ابتدا بخش‌ها را ایجاد کنید.
                </div>
              ) : (
                <div style={styles.wardList}>
                  {wards.map((ward) => {
                    if (!ward || !ward.id) return null;
                    const wardId = String(ward.id);
                    const isSelected = formData.ward_id === wardId;
                    const hasAvailableBeds = (ward.available_beds || 0) > 0;
                    return (
                      <div
                        key={ward.id}
                        style={{
                          ...styles.wardItem,
                          ...(isSelected ? styles.wardItemSelected : {}),
                        }}
                        onClick={() => handleSelectWard(ward.id)}
                      >
                        <div>
                          <div style={styles.wardName}>
                            {ward.name || "نامشخص"}
                            {ward.code && (
                              <span style={{ color: "#6b7280", fontSize: "12px" }}> ({ward.code})</span>
                            )}
                          </div>
                          <div style={styles.wardInfo}>
                            {ward.type && `نوع: ${ward.type} | `}
                            کل تخت‌ها: {ward.total_beds || 0} | موجود: {ward.available_beds || 0}
                          </div>
                        </div>
                        <div>
                          {hasAvailableBeds ? (
                            <span style={styles.wardAvailable}>
                              🟢 {ward.available_beds || 0} تخت موجود
                            </span>
                          ) : (
                            <span style={styles.wardFull}>🔴 تکمیل شده</span>
                          )}
                          {isSelected && <span style={{ color: "#10b981", marginLeft: "10px" }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label style={styles.label}>نوع بستری</label>
              <select
                name="admission_type"
                value={formData.admission_type}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="emergency">اورژانسی</option>
                <option value="planned">برنامه‌ریزی شده</option>
                <option value="elective">اختیاری</option>
                <option value="transfer">انتقالی</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>اولویت</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="high">🔴 بالا</option>
                <option value="medium">🟡 متوسط</option>
                <option value="normal">🟢 معمولی</option>
                <option value="low">⚪ پایین</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>تشخیص</label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                rows="2"
                style={styles.textarea}
                placeholder="تشخیص بیماری"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>
                دستورالعمل‌های بستری <span style={{ color: "#f59e0b" }}>(شماره‌دار)</span>
              </label>
              <div style={styles.instructionInputGroup}>
                <input
                  type="text"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="مثلاً: استراحت مطلق در تخت"
                  style={{ ...styles.input, flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInstruction();
                    }
                  }}
                />
                <button type="button" onClick={addInstruction} style={styles.instructionAddBtn}>
                  ➕ افزودن
                </button>
              </div>

              {instructionsList.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  {instructionsList.map((item, index) => (
                    <div key={index} style={styles.instructionItem}>
                      <span style={styles.instructionNumber}>{index + 1}.</span>
                      <span style={styles.instructionText}>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        style={styles.instructionDelete}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>یادداشت‌های ویژه</label>
              <textarea
                name="special_notes"
                value={formData.special_notes}
                onChange={handleChange}
                rows="2"
                style={styles.textarea}
                placeholder="یادداشت‌های اضافی..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              style={{
                ...styles.btn,
                background: "#10b981",
                color: "white",
                padding: "12px 30px",
                fontSize: "14px",
                opacity: loading || isSubmitting ? 0.6 : 1,
              }}
            >
              {loading || isSubmitting ? "⏳ در حال ثبت..." : "🏥 ثبت درخواست بستری"}
            </button>
          </div>
        </form>
      )}

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
          placeholder="🔍 جستجوی نام بیمار، شماره بستری، بخش، تذکره..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: "#3b82f6", color: "white", padding: "8px 16px" }}
          onClick={refreshAdmissionList}
          disabled={loading}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* ====== جدول درخواست‌ها ====== */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : activeList.length === 0 ? (
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
          <div>هیچ درخواست بستری با این فیلتر یافت نشد</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>شماره بستری</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>بخش</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>تاریخ بستری</th>
                <th style={styles.th}>تشخیص</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((request, idx) => {
                const badge = getStatusBadge(request.status);
                const isReqDischarged =
                  request.status === "discharged" ||
                  request.is_discharged === true ||
                  (request.discharge_date && request.status !== "admitted");
                const isReqCancelled = request.status === "cancelled";
                const canEdit = !isReqDischarged && !isReqCancelled;

                return (
                  <tr key={request.id || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <code
                        style={{
                          background: "#f3f4f6",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        #{request.id}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👤 {getPatientFullName(request)}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        {getPatientAge(request) !== "-" && <span>🎂 {getPatientAge(request)} </span>}
                        {getPatientGender(request) !== "-" && <span>⚤ {getPatientGender(request)}</span>}
                      </div>
                      {getPatientNationalId(request) !== "-" && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          🪪 {getPatientNationalId(request)}
                        </div>
                      )}
                      {getPatientMobile(request) !== "-" && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          📞 {getPatientMobile(request)}
                        </div>
                      )}
                      {request.reg_id && (
                        <div style={{ fontSize: "11px", color: "#3b82f6" }}>
                          🔢 مراجعه: {request.reg_id}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold", color: "#10b981" }}>
                        🏥 {getWardName(request)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "bold" }}>👨‍⚕️ {getDoctorName(request)}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: "12px" }}>📅 {formatDate(request.admission_date)}</div>
                      {request.created_at && (
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          🕐 {formatTime(request.created_at)}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: "12px", color: "#6b7280", maxWidth: "200px" }}>
                        {request.diagnosis || "-"}
                      </div>
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
                      {canEdit && (
                        <button
                          style={{ ...styles.btn, background: "#f59e0b", color: "white" }}
                          onClick={() => handleEditRequest(request)}
                        >
                          ✏️ ویرایش
                        </button>
                      )}
                      <button
                        style={{ ...styles.btn, background: "#8b5cf6", color: "white" }}
                        onClick={() => handlePrintRequest(request.id)}
                      >
                        🖨️ پرینت
                      </button>
                      {canEdit && (
                        <button
                          style={{ ...styles.btn, background: "#ef4444", color: "white" }}
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          🗑️ حذف
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== نوار ناوبری مراحل ====== */}
      <div style={styles.stepNavigation}>
        <button
          type="button"
          onClick={handleGoToPrev}
          disabled={loading || isSubmitting}
          style={{
            ...styles.stepNavButton,
            backgroundColor: "#374151",
            color: "white",
            opacity: loading || isSubmitting ? 0.5 : 1,
          }}
        >
          ⬅️ مرحله قبل
        </button>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", flex: 1 }}>
          {isAdmitted && !isDischarged && (
            <button
              type="button"
              onClick={() => {
                if (onNextStep) onNextStep();
                toast.info("💰 رفتن به مدیریت فیس بستری");
              }}
              style={{ ...styles.stepNavButton, backgroundColor: "#3b82f6", color: "white" }}
            >
              💰 مدیریت فیس بستری
            </button>
          )}

          <button
            type="button"
            onClick={handleCompleteTreatment}
            disabled={loading || isSubmitting}
            style={{
              ...styles.stepNavButton,
              backgroundColor: isDischarged ? "#10b981" : "#22c55e",
              color: "white",
              opacity: loading || isSubmitting ? 0.5 : 1,
            }}
          >
            {loading ? "⏳ در حال پردازش..." : "✅ ختم معالجه"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoToNext}
          disabled={loading || isSubmitting}
          style={{
            ...styles.stepNavButton,
            backgroundColor: "#3b82f6",
            color: "white",
            opacity: loading || isSubmitting ? 0.5 : 1,
          }}
        >
          مرحله بعد ➡️
        </button>
      </div>

      {/* ====== مودال ویرایش ====== */}
      {showEditModal && editingRequest && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: "#10b981" }}>
              ✏️ ویرایش درخواست بستری #{editingRequest.id}
            </h2>

            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: "0 0 12px 0", color: "#059669", fontSize: "15px" }}>
                👤 معلومات بیمار
              </h3>
              <div style={{ fontSize: "13px", color: "#1f2937" }}>
                <b>نام:</b> {getPatientFullName(editingRequest)} — <b>تذکره:</b>{" "}
                {getPatientNationalId(editingRequest)}
              </div>
            </div>

            <form onSubmit={handleSaveEdit}>
              <label style={styles.label}>بخش بستری *</label>
              <select
                value={formData.ward_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, ward_id: e.target.value }))}
                style={styles.select}
              >
                <option value="">انتخاب کنید...</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={String(ward.id)}>
                    {ward.name} - {ward.available_beds || 0} تخت موجود
                  </option>
                ))}
              </select>

              <label style={styles.label}>تشخیص</label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                rows="2"
                style={styles.textarea}
                placeholder="تشخیص بیماری"
              />

              <label style={styles.label}>دستورالعمل‌های بستری</label>
              <div style={styles.instructionInputGroup}>
                <input
                  type="text"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="دستورالعمل جدید..."
                  style={{ ...styles.input, flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInstruction();
                    }
                  }}
                />
                <button type="button" onClick={addInstruction} style={styles.instructionAddBtn}>
                  ➕ افزودن
                </button>
              </div>
              {instructionsList.map((item, index) => (
                <div key={index} style={styles.instructionItem}>
                  <span style={styles.instructionNumber}>{index + 1}.</span>
                  <span style={styles.instructionText}>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    style={styles.instructionDelete}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <label style={styles.label}>یادداشت‌های ویژه</label>
              <textarea
                value={formData.special_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, special_notes: e.target.value }))}
                rows="2"
                style={styles.textarea}
                placeholder="یادداشت‌های اضافی..."
              />

              <label style={styles.label}>اولویت</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                style={styles.select}
              >
                <option value="high">🔴 بالا</option>
                <option value="medium">🟡 متوسط</option>
                <option value="normal">🟢 معمولی</option>
                <option value="low">⚪ پایین</option>
              </select>

              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={{ ...styles.btn, background: "#6b7280", color: "white", padding: "10px 24px" }}
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRequest(null);
                    setFormData({
                      ward_id: "",
                      admission_type: "emergency",
                      diagnosis: "",
                      admission_instructions: "",
                      special_notes: "",
                      priority: "normal",
                    });
                    setInstructionsList([]);
                  }}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.btn, background: "#10b981", color: "white", padding: "10px 24px" }}
                >
                  {loading ? "⏳ در حال ذخیره..." : "✅ ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}