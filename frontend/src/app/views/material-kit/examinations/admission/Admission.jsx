// src/app/pages/treatment/admission/Admission.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

// ============ استایل‌ها در خارج از کامپوننت ============
const styles = {
  container: {
    padding: '20px',
    background: '#1a1a2e',
    borderRadius: '12px',
    color: 'white'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#9ca3af',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #374151',
    backgroundColor: '#1f2937',
    color: 'white',
    outline: 'none',
    fontSize: '14px'
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #374151',
    backgroundColor: '#1f2937',
    color: 'white',
    outline: 'none',
    fontSize: '14px',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #374151',
    backgroundColor: '#1f2937',
    color: 'white',
    outline: 'none',
    resize: 'vertical',
    fontSize: '14px',
    minHeight: '80px'
  },
  button: {
    padding: '10px 30px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '14px'
  },
  buttonPrimary: { backgroundColor: '#ef4444', color: 'white' },
  buttonSuccess: { backgroundColor: '#10b981', color: 'white' },
  buttonSecondary: { backgroundColor: '#374151', color: 'white' },
  buttonWarning: { backgroundColor: '#f59e0b', color: 'white' },
  buttonInfo: { backgroundColor: '#3b82f6', color: 'white' },
  buttonDanger: { backgroundColor: '#dc2626', color: 'white' },
  buttonPurple: { backgroundColor: '#8b5cf6', color: 'white' },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  gridFull: {
    gridColumn: 'span 2'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  infoCard: {
    background: '#1f2937',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #374151'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #374151'
  },
  infoLabel: { color: '#9ca3af' },
  infoValue: { color: 'white', fontWeight: 'bold' },
  successBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  warningBadge: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  dischargeBadge: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  // ====== NEW: بنر هشدار ترخیص ======
  dischargeBanner: {
    background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.3) 0%, rgba(107, 114, 128, 0.1) 100%)',
    border: '2px solid #6b7280',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  dischargeBannerIcon: {
    fontSize: '42px'
  },
  dischargeBannerContent: {
    flex: 1,
    minWidth: '250px'
  },
  dischargeBannerTitle: {
    color: '#e5e7eb',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dischargeBannerText: {
    color: '#9ca3af',
    fontSize: '13px',
    lineHeight: '1.6'
  },
  dischargeBannerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  // ====== بنر اطلاع به داکتر ======
  doctorAlertBanner: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%)',
    border: '2px solid #8b5cf6',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  doctorAlertIcon: {
    fontSize: '28px',
    backgroundColor: '#8b5cf6',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  doctorAlertContent: {
    flex: 1,
    minWidth: '200px'
  },
  doctorAlertTitle: {
    color: '#c4b5fd',
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  doctorAlertText: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  instructionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#0f1a2a',
    borderRadius: '6px',
    marginBottom: '5px',
    border: '1px solid #2a3a4a'
  },
  instructionNumber: {
    color: '#fcd34d',
    fontWeight: 'bold',
    marginRight: '10px'
  },
  instructionText: {
    color: 'white',
    flex: 1
  },
  instructionDelete: {
    color: '#ef4444',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: '18px'
  },
  instructionInputGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  instructionAddBtn: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  wardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  wardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#0f1a2a',
    borderRadius: '6px',
    border: '1px solid #2a3a4a',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  wardItemSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#1a2a3a'
  },
  wardName: { color: 'white', fontWeight: 'bold' },
  wardInfo: { color: '#9ca3af', fontSize: '12px' },
  wardAvailable: { color: '#22c55e', fontSize: '12px', fontWeight: 'bold' },
  wardFull: { color: '#ef4444', fontSize: '12px', fontWeight: 'bold' },
  requestsSection: {
    marginTop: '25px',
    paddingTop: '20px',
    borderTop: '2px solid #374151'
  },
  requestsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  requestsSectionTitle: {
    color: '#60a5fa',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  requestsCount: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  requestCard: {
    background: 'linear-gradient(135deg, #0f1a2a 0%, #1a2a3a 100%)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '12px',
    border: '1px solid #2a3a4a',
    borderRight: '4px solid #3b82f6',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  requestCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '10px'
  },
  requestCardPatientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '250px'
  },
  requestCardPatientName: {
    color: '#34d399',
    fontWeight: 'bold',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  requestCardMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '12px',
    color: '#9ca3af'
  },
  requestCardMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(15, 26, 42, 0.8)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #2a3a4a'
  },
  requestCardDiagnosis: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#dbeafe'
  },
  requestCardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    borderTop: '1px solid #2a3a4a',
    paddingTop: '12px'
  },
  requestStatusBadge: {
    padding: '3px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  requestActionBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af'
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.5
  },
  // ====== نوار ناوبری مراحل ======
  stepNavigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    marginTop: '20px',
    backgroundColor: '#0f1a2a',
    borderRadius: '10px',
    border: '1px solid #2a3a4a',
    flexWrap: 'wrap',
    gap: '10px'
  },
  stepNavButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  }
};

// ============ توابع کمکی ============
const getPatientFullName = (source) => {
  if (!source) return 'نامشخص';
  if (source.full_name) return source.full_name;
  if (source.patient_name) return source.patient_name;
  if (source.patient?.full_name) return source.patient.full_name;
  if (source.patient?.first_name || source.patient?.last_name) {
    const name = `${source.patient.first_name || ''} ${source.patient.last_name || ''}`.trim();
    if (name) return name;
  }
  if (source.admission_request?.patient?.full_name) return source.admission_request.patient.full_name;
  if (source.admission_request?.patient_name) return source.admission_request.patient_name;
  if (source.admission?.patient?.full_name) return source.admission.patient.full_name;
  if (source.first_name || source.last_name) {
    const name = `${source.first_name || ''} ${source.last_name || ''}`.trim();
    if (name) return name;
  }
  return 'نامشخص';
};

const getPatientNationalId = (source) => {
  if (!source) return '-';
  return source.national_id || source.patient?.national_id ||
         source.admission_request?.patient?.national_id ||
         source.admission_request?.national_id || '-';
};

const getPatientMobile = (source) => {
  if (!source) return '-';
  return source.mobile || source.phone ||
         source.patient?.mobile || source.patient?.phone ||
         source.admission_request?.patient?.mobile ||
         source.admission_request?.mobile || '-';
};

const getWardName = (source) => {
  if (!source) return '-';
  return source.ward_name || source.ward?.name ||
         source.admission_request?.ward_name ||
         source.admission_request?.ward?.name ||
         source.admission?.ward?.name || '-';
};

const getDoctorName = (source) => {
  if (!source) return '-';
  return source.doctor_name || source.doctor?.name ||
         source.admission_request?.doctor_name ||
         source.admission_request?.doctor?.name || '-';
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('fa-IR');
  } catch {
    return '-';
  }
};

const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('fa-IR');
  } catch {
    return '-';
  }
};

const getStatusInfo = (status) => {
  const map = {
    'admitted': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: '✅ بستری' },
    'pending': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: '⏳ در انتظار' },
    'discharged': { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: '🚪 ترخیص شده' },
    'cancelled': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: '❌ لغو شده' },
    'completed': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: '✅ معالجه ختم شده' },
  };
  return map[status] || { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: status || '-' };
};

const getDischargeTypeLabel = (type) => {
  const types = {
    regular: 'ترخیص عادی',
    against_advice: 'ترخیص با رضایت شخصی',
    transferred: 'انتقال به مرکز دیگر',
    deceased: 'فوت',
    escaped: 'فرار از بیمارستان'
  };
  return types[type] || type || '-';
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
  currentStep,
  nextStep,
  prevStep,
  isSubmitting,
  isTreatmentComplete,
  allAdmissionRequests = [],
  fetchAllAdmissions = null
}) {
  const [formData, setFormData] = useState({
    ward_id: "",
    admission_type: "emergency",
    diagnosis: "",
    admission_instructions: "",
    special_notes: "",
    priority: "normal"
  });
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [isDischarged, setIsDischarged] = useState(false); // NEW
  const [dischargeInfo, setDischargeInfo] = useState(null); // NEW
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionData, setAdmissionData] = useState(null);
  const [instructionsList, setInstructionsList] = useState([]);
  const [instructionInput, setInstructionInput] = useState("");
  
  const [admissionRequests, setAdmissionRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [printingRequest, setPrintingRequest] = useState(null);

  // ============ استفاده از allAdmissionRequests از props ============
  useEffect(() => {
    if (allAdmissionRequests && Array.isArray(allAdmissionRequests)) {
      setAdmissionRequests(allAdmissionRequests);
    }
    fetchWards();
    checkAdmissionStatus();
  }, [registration, allAdmissionRequests]);

  // ============ NEW: polling برای بررسی تغییر وضعیت (هر 30 ثانیه) ============
  useEffect(() => {
    if (!registration?.reg_id) return;
    
    const interval = setInterval(() => {
      checkAdmissionStatus();
    }, 30000); // هر 30 ثانیه
    
    return () => clearInterval(interval);
  }, [registration?.reg_id]);

  // ============ بررسی وضعیت بستری بیمار ============
  const checkAdmissionStatus = async () => {
    if (!registration?.reg_id) return;
    
    try {
      const response = await api.get(`/admissions/status/${registration.reg_id}`);
      if (response.data?.data) {
        const data = response.data.data;
        
        // بررسی ترخیص
        const discharged = data.status === 'discharged' || 
                          data.is_discharged === true || 
                          (data.discharge_date && data.status !== 'admitted');
        
        setIsAdmitted(data.is_admitted || false);
        setIsDischarged(discharged);
        setAdmissionId(data.admission_id || null);
        setAdmissionData(data);
        
        // ذخیره اطلاعات ترخیص
        if (discharged) {
          setDischargeInfo({
            discharge_date: data.discharge_date,
            discharge_type: data.discharge_type,
            discharge_reason: data.discharge_reason,
            discharge_notes: data.discharge_notes,
            discharged_by: data.discharged_by,
            ward_name: data.ward_name
          });
          
          // اگر قبلاً نمایش داده نشده، یک بار هشدار بده
          if (!isDischarged) {
            toast.warning("🚪 بیمار ترخیص شده است. لطفاً معالجه را ختم کنید.", {
              autoClose: 8000,
              position: 'top-center'
            });
          }
        }
        
        if (data.is_admitted && !discharged) {
          setFormData(prev => ({
            ...prev,
            ward_id: data.ward_id || "",
            admission_type: data.admission_type || "emergency",
            diagnosis: data.diagnosis || "",
            admission_instructions: data.admission_instructions || "",
            special_notes: data.special_notes || "",
            priority: data.priority || "normal"
          }));
          
          if (data.admission_instructions) {
            const instructions = data.admission_instructions.split('\n').filter(item => item.trim());
            setInstructionsList(instructions);
          }
        }
      }
    } catch (err) {
      console.error("خطا در بررسی وضعیت بستری:", err);
    }
  };

  // ============ بررسی ترخیص از لیست درخواست‌ها ============
  useEffect(() => {
    if (allAdmissionRequests && Array.isArray(allAdmissionRequests) && registration?.reg_id) {
      const existingRequest = allAdmissionRequests.find(
        req => req.reg_id === registration.reg_id
      );
      
      if (existingRequest) {
        const discharged = existingRequest.status === 'discharged' ||
                          existingRequest.is_discharged === true ||
                          (existingRequest.discharge_date && existingRequest.status !== 'admitted');
        
        setAdmissionData(existingRequest);
        setIsAdmitted(existingRequest.status === 'admitted' && !discharged);
        setIsDischarged(discharged);
        
        if (discharged) {
          setDischargeInfo({
            discharge_date: existingRequest.discharge_date,
            discharge_type: existingRequest.discharge_type,
            discharge_reason: existingRequest.discharge_reason,
            discharge_notes: existingRequest.discharge_notes,
            ward_name: getWardName(existingRequest)
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
      
      if (wardsData.length === 0) {
        toast.warning("⚠️ هیچ بخشی در سیستم تعریف نشده است");
      }
    } catch (err) {
      console.error("❌ خطا در دریافت بخش‌ها:", err);
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectWard = (wardId) => {
    setFormData(prev => ({ ...prev, ward_id: String(wardId) }));
  };

  const addInstruction = () => {
    if (instructionInput.trim()) {
      setInstructionsList(prev => [...prev, instructionInput.trim()]);
      setInstructionInput("");
    }
  };

  const removeInstruction = (index) => {
    setInstructionsList(prev => prev.filter((_, i) => i !== index));
  };

  const getInstructionsText = () => {
    return instructionsList.map((item, index) => `${index + 1}. ${item}`).join('\n');
  };

  const refreshAdmissionList = async () => {
    if (fetchAllAdmissions) {
      const data = await fetchAllAdmissions();
      if (data) {
        setAdmissionRequests(data);
      }
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
        admission_date: new Date().toISOString().split('T')[0],
        diagnosis: formData.diagnosis || registration?.diagnosis || "",
        admission_instructions: instructionsText || formData.admission_instructions,
        special_notes: formData.special_notes,
        priority: formData.priority
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
        
        toast.info("➡️ لطفاً برای اخذ فیس بستری به بخش مدیریت فیس مراجعه کنید");
        
        if (onNextStep) onNextStep();
        if (onComplete) onComplete();
      } else {
        toast.error("❌ خطا در ثبت درخواست بستری");
      }
    } catch (err) {
      console.error("❌ خطای کامل:", err);
      
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

  // ============ حذف درخواست بستری ============
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

  // ============ ویرایش درخواست بستری ============
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      ward_id: request.ward_id ? String(request.ward_id) : "",
      admission_type: request.admission_type || "emergency",
      diagnosis: request.diagnosis || "",
      admission_instructions: request.admission_instructions || "",
      special_notes: request.special_notes || "",
      priority: request.priority || "normal"
    });
    
    if (request.admission_instructions) {
      const instructions = request.admission_instructions.split('\n').filter(item => item.trim());
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
        diagnosis: formData.diagnosis
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

  // ============ پرینت درخواست بستری ============
  const handlePrintRequest = async (id) => {
    try {
      const response = await api.get(`/admissions/${id}/print`);
      setPrintingRequest(response.data.data);
      
      const data = response.data.data;
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>رسید بستری</title>
              <style>
                body { font-family: 'Tahoma', sans-serif; padding: 20px; direction: rtl; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; color: #ef4444; }
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
                <div>${data.hospital_name || 'بیمارستان'}</div>
                <div>${data.hospital_address || ''}</div>
                <div>تلفن: ${data.hospital_phone || ''}</div>
              </div>
              
              <div class="info">
                <div class="info-row">
                  <span class="label">شماره بستری:</span>
                  <span class="value">#${data.admission?.id || id}</span>
                </div>
                <div class="info-row">
                  <span class="label">نام بیمار:</span>
                  <span class="value">${getPatientFullName(data.admission) || getPatientFullName(data)}</span>
                </div>
                <div class="info-row">
                  <span class="label">کد ملی:</span>
                  <span class="value">${getPatientNationalId(data.admission) || getPatientNationalId(data)}</span>
                </div>
                <div class="info-row">
                  <span class="label">بخش:</span>
                  <span class="value">${getWardName(data.admission) || getWardName(data)}</span>
                </div>
                <div class="info-row">
                  <span class="label">پزشک معالج:</span>
                  <span class="value">${getDoctorName(data.admission) || getDoctorName(data)}</span>
                </div>
                <div class="info-row">
                  <span class="label">تاریخ بستری:</span>
                  <span class="value">${formatDate(data.admission?.admission_date || data.admission_date)}</span>
                </div>
                <div class="info-row">
                  <span class="label">تشخیص:</span>
                  <span class="value">${data.admission?.diagnosis || data.diagnosis || '-'}</span>
                </div>
                ${(data.admission?.admission_instructions || data.admission_instructions) ? `
                  <div class="instructions">
                    <strong>📋 دستورالعمل‌های بستری:</strong>
                    <ul>
                      ${(data.admission?.admission_instructions || data.admission_instructions).split('\n').map(item => 
                        item.trim() ? `<li>${item}</li>` : ''
                      ).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
              
              <div class="footer">
                <p>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
                <p>با تشکر از اعتماد شما</p>
              </div>
              
              <script>
                window.onload = function() { window.print(); }
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      toast.error("❌ خطا در پرینت رسید");
    }
  };

  // ============ NEW: ختم معالجه ============
  const handleCompleteTreatment = async () => {
    // اگر ترخیص نشده، هشدار بده
    if (!isDischarged) {
      if (!window.confirm("⚠️ بیمار هنوز ترخیص نشده است.\n\nآیا می‌خواهید ابتدا ترخیص کنید و سپس معالجه را ختم کنید؟")) {
        return;
      }
      
      // ابتدا ترخیص
      if (isAdmitted && admissionId) {
        try {
          setLoading(true);
          await api.post(`/admissions/${admissionId}/discharge`, {
            discharge_date: new Date().toISOString().split('T')[0],
            discharge_type: 'regular',
            discharge_reason: 'ترخیص توسط داکتر',
          });
          toast.info("🏥 بیمار از بخش بستری ترخیص شد");
          setIsDischarged(true);
        } catch (err) {
          console.error("خطا در ترخیص:", err);
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
        toast.success("✅ معالجه با موفقیت ختم شد و در تاریخچه ذخیره گردید");
        if (onFinish) onFinish();
        if (onComplete) onComplete();
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "❌ خطا در ختم معالجه");
      }
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ناوبری مراحل ============
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

  const handlePrescription = () => {
    if (onNextStep) {
      for (let i = 0; i < 6; i++) {
        onNextStep();
      }
      toast.info("📝 رفتن به بخش نسخه");
    }
  };

  // ============ رندر بنر هشدار ترخیص ============
  const renderDischargeBanner = () => {
    if (!isDischarged) return null;
    
    return (
      <>
        {/* بنر اصلی ترخیص */}
        <div style={styles.dischargeBanner}>
          <div style={styles.dischargeBannerIcon}>🚪</div>
          <div style={styles.dischargeBannerContent}>
            <div style={styles.dischargeBannerTitle}>
              ✅ بیمار ترخیص شده است
            </div>
            <div style={styles.dischargeBannerText}>
              این بیمار از بخش <strong style={{ color: '#e5e7eb' }}>{dischargeInfo?.ward_name || getWardName(admissionData)}</strong> ترخیص شده است.
              <br />
              {dischargeInfo?.discharge_date && (
                <>📅 تاریخ ترخیص: <strong style={{ color: '#e5e7eb' }}>{formatDateTime(dischargeInfo.discharge_date)}</strong><br /></>
              )}
              {dischargeInfo?.discharge_type && (
                <>📋 نوع ترخیص: <strong style={{ color: '#e5e7eb' }}>{getDischargeTypeLabel(dischargeInfo.discharge_type)}</strong><br /></>
              )}
              {dischargeInfo?.discharge_reason && (
                <>📝 دلیل: <strong style={{ color: '#e5e7eb' }}>{dischargeInfo.discharge_reason}</strong></>
              )}
            </div>
          </div>
          <div style={styles.dischargeBannerActions}>
            <button
              type="button"
              onClick={handleCompleteTreatment}
              disabled={loading}
              style={{
                ...styles.stepNavButton,
                backgroundColor: '#10b981',
                color: 'white',
                ...(loading ? styles.buttonDisabled : {})
              }}
            >
              ✅ ختم معالجه
            </button>
          </div>
        </div>
        
        {/* بنر اطلاع به داکتر */}
        <div style={styles.doctorAlertBanner}>
          <div style={styles.doctorAlertIcon}>👨‍⚕️</div>
          <div style={styles.doctorAlertContent}>
            <div style={styles.doctorAlertTitle}>
              توجه داکتر معالج
            </div>
            <div style={styles.doctorAlertText}>
              بیمار <strong style={{ color: '#c4b5fd' }}>{getPatientFullName(registration) || getPatientFullName(admissionData)}</strong> ترخیص شده است.
              لطفاً تصمیم بگیرید:
              <br />
              • اگر معالجه کامل شده، دکمه <strong style={{ color: '#10b981' }}>"ختم معالجه"</strong> را بزنید
              <br />
              • اگر نیاز به ادامه در بخش دیگر است، از صفحه "مدیریت فیس بستری" دکمه <strong style={{ color: '#3b82f6' }}>"انتقال"</strong> را بزنید
            </div>
          </div>
        </div>
      </>
    );
  };

  // ============ رندر لیست درخواست‌ها ============
  const renderRequestsList = () => {
    if (!admissionRequests || admissionRequests.length === 0) {
      return (
        <div style={styles.requestsSection}>
          <div style={styles.requestsSectionHeader}>
            <div style={styles.requestsSectionTitle}>
              📋 لیست درخواست‌های بستری
            </div>
          </div>
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>📭</div>
            <div>هیچ درخواست بستری ثبت نشده است</div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.requestsSection}>
        <div style={styles.requestsSectionHeader}>
          <div style={styles.requestsSectionTitle}>
            📋 لیست درخواست‌های بستری
            <span style={styles.requestsCount}>{admissionRequests.length}</span>
          </div>
          <button
            type="button"
            onClick={refreshAdmissionList}
            style={{
              ...styles.requestActionBtn,
              backgroundColor: '#374151',
              color: 'white'
            }}
          >
            🔄 بروزرسانی
          </button>
        </div>

        {admissionRequests.map((request) => {
          const statusInfo = getStatusInfo(request.status);
          const patientName = getPatientFullName(request);
          const wardName = getWardName(request);
          const admissionDate = formatDate(request.admission_date);
          const diagnosis = request.diagnosis || '-';
          const isReqDischarged = request.status === 'discharged' || 
                                  request.is_discharged === true ||
                                  (request.discharge_date && request.status !== 'admitted');
          
          return (
            <div key={request.id} style={{
              ...styles.requestCard,
              borderRightColor: isReqDischarged ? '#6b7280' : statusInfo.color
            }}>
              <div style={styles.requestCardHeader}>
                <div style={styles.requestCardPatientInfo}>
                  <div style={styles.requestCardPatientName}>
                    👤 {patientName}
                    <span style={{
                      ...styles.requestStatusBadge,
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.color}`
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div style={styles.requestCardMeta}>
                    <span style={styles.requestCardMetaItem}>🆔 #{request.id}</span>
                    <span style={styles.requestCardMetaItem}>🏥 {wardName}</span>
                    <span style={styles.requestCardMetaItem}>📅 {admissionDate}</span>
                    {request.reg_id && (
                      <span style={styles.requestCardMetaItem}>🔢 مراجعه: {request.reg_id}</span>
                    )}
                    {getPatientNationalId(request) !== '-' && (
                      <span style={styles.requestCardMetaItem}>🪪 {getPatientNationalId(request)}</span>
                    )}
                  </div>
                </div>
              </div>

              {diagnosis && diagnosis !== '-' && (
                <div style={styles.requestCardDiagnosis}>
                  <strong>🔬 تشخیص:</strong> {diagnosis}
                </div>
              )}

              {/* اطلاعات ترخیص در کارت */}
              {isReqDischarged && (
                <div style={{
                  backgroundColor: 'rgba(107, 114, 128, 0.15)',
                  border: '1px solid #6b7280',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#d1d5db'
                }}>
                  🚪 <strong>ترخیص شده</strong>
                  {request.discharge_date && (
                    <> — 📅 {formatDate(request.discharge_date)}</>
                  )}
                  {request.discharge_type && (
                    <> — {getDischargeTypeLabel(request.discharge_type)}</>
                  )}
                </div>
              )}

              <div style={styles.requestCardActions}>
                <button
                  type="button"
                  onClick={() => handlePrintRequest(request.id)}
                  style={{
                    ...styles.requestActionBtn,
                    backgroundColor: '#3b82f6',
                    color: 'white'
                  }}
                >
                  🖨️ پرینت
                </button>
                {!isReqDischarged && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditRequest(request)}
                      style={{
                        ...styles.requestActionBtn,
                        backgroundColor: '#f59e0b',
                        color: 'white'
                      }}
                    >
                      ✏️ ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(request.id)}
                      style={{
                        ...styles.requestActionBtn,
                        backgroundColor: '#dc2626',
                        color: 'white'
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============ اطلاعات بیمار فعلی ============
  const currentPatientName = getPatientFullName(registration) !== 'نامشخص' 
    ? getPatientFullName(registration) 
    : getPatientFullName(admissionData);
  
  const currentPatientNationalId = getPatientNationalId(registration) !== '-' 
    ? getPatientNationalId(registration) 
    : getPatientNationalId(admissionData);
  
  const currentPatientMobile = getPatientMobile(registration) !== '-' 
    ? getPatientMobile(registration) 
    : getPatientMobile(admissionData);

  return (
    <div style={styles.container}>
      <h3 style={{ color: '#ef4444', marginBottom: '20px', textAlign: 'center' }}>
        🏥 بستری بیمار
      </h3>

      {/* ====== NEW: بنر هشدار ترخیص (در بالای صفحه) ====== */}
      {renderDischargeBanner()}

      {/* وضعیت بستری */}
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={styles.infoLabel}>وضعیت بستری:</span>
          {isDischarged ? (
            <span style={styles.dischargeBadge}>🚪 ترخیص شده</span>
          ) : isAdmitted ? (
            <span style={styles.successBadge}>✅ بستری شده</span>
          ) : (
            <span style={styles.warningBadge}>⏳ در انتظار بستری</span>
          )}
        </div>
        
        {isAdmitted && admissionId && !isDischarged && (
          <>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>شماره بستری:</span>
              <span style={styles.infoValue}>#{admissionId}</span>
            </div>
            {getWardName(admissionData) !== '-' && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>بخش:</span>
                <span style={styles.infoValue}>{getWardName(admissionData)}</span>
              </div>
            )}
            {admissionData?.fee_status && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>وضعیت فیس:</span>
                <span style={styles.infoValue}>
                  {admissionData.fee_status === 'paid' ? '✅ پرداخت کامل' :
                   admissionData.fee_status === 'partial' ? '🟡 پرداخت جزئی' :
                   '🔴 پرداخت نشده'}
                </span>
              </div>
            )}
          </>
        )}
        
        {isDischarged && (
          <>
            {dischargeInfo?.ward_name && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>بخش قبلی:</span>
                <span style={styles.infoValue}>{dischargeInfo.ward_name}</span>
              </div>
            )}
            {dischargeInfo?.discharge_date && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>تاریخ ترخیص:</span>
                <span style={styles.infoValue}>{formatDateTime(dischargeInfo.discharge_date)}</span>
              </div>
            )}
            {dischargeInfo?.discharge_type && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>نوع ترخیص:</span>
                <span style={styles.infoValue}>{getDischargeTypeLabel(dischargeInfo.discharge_type)}</span>
              </div>
            )}
            {dischargeInfo?.discharge_reason && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>دلیل ترخیص:</span>
                <span style={styles.infoValue}>{dischargeInfo.discharge_reason}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* اطلاعات بیمار */}
      <div style={styles.infoCard}>
        <h4 style={{ color: 'white', marginBottom: '10px' }}>👤 اطلاعات بیمار</h4>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>نام بیمار:</span>
          <span style={styles.infoValue}>{currentPatientName}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>کد ملی:</span>
          <span style={styles.infoValue}>{currentPatientNationalId}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>شماره تماس:</span>
          <span style={styles.infoValue}>{currentPatientMobile}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>تشخیص اولیه:</span>
          <span style={styles.infoValue}>{registration?.diagnosis || admissionData?.diagnosis || 'نامشخص'}</span>
        </div>
        {(registration?.visit_number || registration?.reg_id) && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>شماره مراجعه:</span>
            <span style={styles.infoValue}>#{registration.visit_number || registration.reg_id}</span>
          </div>
        )}
      </div>

      {/* فرم بستری - فقط اگر ترخیص نشده */}
      {!isAdmitted && !isDischarged ? (
        <form onSubmit={handleSubmit}>
          <div style={styles.grid2}>
            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
              <label style={styles.label}>
                انتخاب بخش بستری <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {loadingWards ? (
                <div style={{ color: '#9ca3af', padding: '10px' }}>⏳ در حال بارگذاری بخش‌ها...</div>
              ) : !Array.isArray(wards) || wards.length === 0 ? (
                <div style={{ color: '#f59e0b', padding: '10px' }}>
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
                          ...(isSelected ? styles.wardItemSelected : {})
                        }}
                        onClick={() => handleSelectWard(ward.id)}
                      >
                        <div>
                          <div style={styles.wardName}>
                            {ward.name || 'نامشخص'}
                            {ward.code && <span style={{ color: '#9ca3af', fontSize: '12px' }}> ({ward.code})</span>}
                          </div>
                          <div style={styles.wardInfo}>
                            {ward.type && `نوع: ${ward.type} | `}
                            کل تخت‌ها: {ward.total_beds || 0} | موجود: {ward.available_beds || 0}
                          </div>
                        </div>
                        <div>
                          {hasAvailableBeds ? (
                            <span style={styles.wardAvailable}>🟢 {ward.available_beds || 0} تخت موجود</span>
                          ) : (
                            <span style={styles.wardFull}>🔴 تکمیل شده</span>
                          )}
                          {isSelected && <span style={{ color: '#ef4444', marginLeft: '10px' }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {formData.ward_id && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#1a3a2a', borderRadius: '6px' }}>
                  <span style={{ color: '#22c55e' }}>
                    ✅ بخش انتخاب شده: {wards.find(w => String(w.id) === formData.ward_id)?.name || 'نامشخص'}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>نوع بستری</label>
              <select name="admission_type" value={formData.admission_type} onChange={handleChange} style={styles.select}>
                <option value="emergency">اورژانسی</option>
                <option value="planned">برنامه‌ریزی شده</option>
                <option value="elective">اختیاری</option>
                <option value="transfer">انتقالی</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>اولویت</label>
              <select name="priority" value={formData.priority} onChange={handleChange} style={styles.select}>
                <option value="high">🔴 بالا</option>
                <option value="medium">🟡 متوسط</option>
                <option value="normal">🟢 معمولی</option>
                <option value="low">⚪ پایین</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
              <label style={styles.label}>تشخیص</label>
              <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange}
                rows="2" style={styles.textarea} placeholder="تشخیص بیماری" />
              {registration?.diagnosis && !formData.diagnosis && (
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  💡 تشخیص اولیه: {registration.diagnosis}
                </span>
              )}
            </div>

            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
              <label style={styles.label}>
                دستورالعمل‌های بستری <span style={{ color: '#f59e0b' }}>(شماره‌دار)</span>
              </label>
              <div style={styles.instructionInputGroup}>
                <input type="text" value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="مثلاً: استراحت مطلق در تخت"
                  style={{ ...styles.input, flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addInstruction(); }
                  }}
                />
                <button type="button" onClick={addInstruction} style={styles.instructionAddBtn}>
                  ➕ افزودن
                </button>
              </div>
              
              {instructionsList.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {instructionsList.map((item, index) => (
                    <div key={index} style={styles.instructionItem}>
                      <span style={styles.instructionNumber}>{index + 1}.</span>
                      <span style={styles.instructionText}>{item}</span>
                      <button type="button" onClick={() => removeInstruction(index)} style={styles.instructionDelete}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
              <label style={styles.label}>یادداشت‌های ویژه</label>
              <textarea name="special_notes" value={formData.special_notes} onChange={handleChange}
                rows="2" style={styles.textarea} placeholder="یادداشت‌های اضافی..." />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button type="submit" disabled={loading || isSubmitting}
              style={{
                ...styles.button, ...styles.buttonPrimary,
                ...((loading || isSubmitting) ? styles.buttonDisabled : {})
              }}>
              {(loading || isSubmitting) ? '⏳ در حال ثبت...' : '🏥 ثبت درخواست بستری'}
            </button>
          </div>
        </form>
      ) : isDischarged ? (
        // ====== NEW: نمایش اطلاعات ترخیص به جای فرم ======
        <div style={{
          textAlign: 'center', padding: '30px 20px',
          background: '#0f1a2a', borderRadius: '12px',
          border: '1px solid #374151', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>🚪</div>
          <p style={{ color: '#9ca3af', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
            بیمار ترخیص شده است
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
            از بخش {dischargeInfo?.ward_name || getWardName(admissionData)} در تاریخ {formatDate(dischargeInfo?.discharge_date)}
          </p>
          
          {instructionsList.length > 0 && (
            <div style={{ 
              marginTop: '15px', textAlign: 'right',
              background: '#1a2a3a', padding: '15px',
              borderRadius: '8px', border: '1px solid #2a3a4a'
            }}>
              <p style={{ color: '#fcd34d', fontWeight: 'bold', marginBottom: '10px' }}>
                📋 دستورالعمل‌های بستری:
              </p>
              {instructionsList.map((item, index) => (
                <p key={index} style={{ color: 'white', margin: '5px 0' }}>
                  {index + 1}. {item}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        // بیمار بستری است اما ترخیص نشده
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏥</div>
          <p style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
            ✅ بیمار با موفقیت بستری شد
          </p>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            برای مدیریت فیس بستری به بخش مدیریت فیس مراجعه کنید
          </p>
          {admissionId && (
            <p style={{ color: '#fcd34d', fontSize: '14px' }}>
              شماره بستری: #{admissionId}
            </p>
          )}
          
          {instructionsList.length > 0 && (
            <div style={{ 
              marginTop: '15px', textAlign: 'right',
              background: '#0f1a2a', padding: '15px',
              borderRadius: '8px', border: '1px solid #2a3a4a'
            }}>
              <p style={{ color: '#fcd34d', fontWeight: 'bold', marginBottom: '10px' }}>
                📋 دستورالعمل‌های بستری:
              </p>
              {instructionsList.map((item, index) => (
                <p key={index} style={{ color: 'white', margin: '5px 0' }}>
                  {index + 1}. {item}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* لیست درخواست‌های بستری */}
      {renderRequestsList()}

      {/* ====== NEW: نوار ناوبری مراحل و اقدامات ====== */}
      <div style={styles.stepNavigation}>
        {/* دکمه مرحله قبل */}
        <button
          type="button"
          onClick={handleGoToPrev}
          disabled={loading || isSubmitting}
          style={{
            ...styles.stepNavButton,
            backgroundColor: '#374151',
            color: 'white',
            ...((loading || isSubmitting) ? styles.buttonDisabled : {})
          }}
        >
          ⬅️ مرحله قبل
        </button>

        {/* دکمه‌های میانی */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
          {/* دکمه مدیریت فیس - فقط اگر بستری است */}
          {isAdmitted && !isDischarged && (
            <button
              type="button"
              onClick={() => {
                if (onNextStep) onNextStep();
                toast.info("💰 رفتن به مدیریت فیس بستری");
              }}
              style={{
                ...styles.stepNavButton,
                backgroundColor: '#3b82f6',
                color: 'white'
              }}
            >
              💰 مدیریت فیس بستری
            </button>
          )}

          {/* دکمه ختم معالجه - همیشه نمایش داده شود */}
          <button
            type="button"
            onClick={handleCompleteTreatment}
            disabled={loading || isSubmitting}
            style={{
              ...styles.stepNavButton,
              backgroundColor: isDischarged ? '#10b981' : '#22c55e',
              color: 'white',
              ...((loading || isSubmitting) ? styles.buttonDisabled : {})
            }}
          >
            {loading ? '⏳ در حال پردازش...' : '✅ ختم معالجه'}
          </button>
        </div>

        {/* دکمه مرحله بعد */}
        <button
          type="button"
          onClick={handleGoToNext}
          disabled={loading || isSubmitting}
          style={{
            ...styles.stepNavButton,
            backgroundColor: '#3b82f6',
            color: 'white',
            ...((loading || isSubmitting) ? styles.buttonDisabled : {})
          }}
        >
          مرحله بعد ➡️
        </button>
      </div>

      {/* مودال ویرایش */}
      {showEditModal && editingRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e', padding: '30px',
            borderRadius: '12px', maxWidth: '700px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '20px' }}>
              ✏️ ویرایش درخواست بستری #{editingRequest.id}
            </h4>
            <div style={{ 
              backgroundColor: '#0f1a2a', padding: '10px 15px', 
              borderRadius: '8px', marginBottom: '15px', border: '1px solid #2a3a4a'
            }}>
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>👤 بیمار: </span>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{getPatientFullName(editingRequest)}</span>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>بخش بستری *</label>
                <select value={formData.ward_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, ward_id: e.target.value }))}
                  style={styles.select}>
                  <option value="">انتخاب کنید...</option>
                  {wards.map(ward => (
                    <option key={ward.id} value={String(ward.id)}>
                      {ward.name} - {ward.available_beds || 0} تخت موجود
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>تشخیص</label>
                <textarea value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  rows="2" style={styles.textarea} placeholder="تشخیص بیماری" />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>دستورالعمل‌های بستری</label>
                <div style={styles.instructionInputGroup}>
                  <input type="text" value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="دستورالعمل جدید..." style={{ ...styles.input, flex: 1 }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addInstruction(); }
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
                    <button type="button" onClick={() => removeInstruction(index)} style={styles.instructionDelete}>✕</button>
                  </div>
                ))}
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>یادداشت‌های ویژه</label>
                <textarea value={formData.special_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_notes: e.target.value }))}
                  rows="2" style={styles.textarea} placeholder="یادداشت‌های اضافی..." />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>اولویت</label>
                <select value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  style={styles.select}>
                  <option value="high">🔴 بالا</option>
                  <option value="medium">🟡 متوسط</option>
                  <option value="normal">🟢 معمولی</option>
                  <option value="low">⚪ پایین</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRequest(null);
                    setFormData({
                      ward_id: "", admission_type: "emergency",
                      diagnosis: "", admission_instructions: "",
                      special_notes: "", priority: "normal"
                    });
                    setInstructionsList([]);
                  }}
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                >
                  انصراف
                </button>
                <button type="submit" disabled={loading}
                  style={{
                    ...styles.button, ...styles.buttonSuccess,
                    ...(loading ? styles.buttonDisabled : {})
                  }}>
                  {loading ? '⏳ در حال ذخیره...' : '✅ ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}