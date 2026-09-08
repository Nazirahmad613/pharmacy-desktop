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
  buttonPrimary: {
    backgroundColor: '#ef4444',
    color: 'white'
  },
  buttonSuccess: {
    backgroundColor: '#10b981',
    color: 'white'
  },
  buttonSecondary: {
    backgroundColor: '#374151',
    color: 'white'
  },
  buttonWarning: {
    backgroundColor: '#f59e0b',
    color: 'white'
  },
  buttonInfo: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },
  buttonDanger: {
    backgroundColor: '#dc2626',
    color: 'white'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
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
  infoLabel: {
    color: '#9ca3af'
  },
  infoValue: {
    color: 'white',
    fontWeight: 'bold'
  },
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
  wardName: {
    color: 'white',
    fontWeight: 'bold'
  },
  wardInfo: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  wardAvailable: {
    color: '#22c55e',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  wardFull: {
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  requestList: {
    marginTop: '20px',
    borderTop: '1px solid #374151',
    paddingTop: '20px'
  },
  requestItem: {
    background: '#0f1a2a',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #2a3a4a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  requestStatus: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold'
  }
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
  allAdmissionRequests = [],  // از TreatmentPage دریافت می‌شود
  fetchAllAdmissions = null   // تابع بروزرسانی از TreatmentPage
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
  const [admissionId, setAdmissionId] = useState(null);
  const [admissionData, setAdmissionData] = useState(null);
  const [instructionsList, setInstructionsList] = useState([]);
  const [instructionInput, setInstructionInput] = useState("");
  
  // State برای مدیریت درخواست‌ها
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

  // ============ بررسی وضعیت بستری بیمار ============
  const checkAdmissionStatus = async () => {
    if (!registration?.reg_id) return;
    
    try {
      const response = await api.get(`/admissions/status/${registration.reg_id}`);
      if (response.data?.data) {
        const data = response.data.data;
        setIsAdmitted(data.is_admitted || false);
        setAdmissionId(data.admission_id || null);
        setAdmissionData(data);
        
        if (data.is_admitted) {
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
          
          toast.info(`🏥 بیمار در بخش ${data.ward_name || ''} بستری است`);
        }
      }
    } catch (err) {
      console.error("خطا در بررسی وضعیت بستری:", err);
    }
  };

  // ============ دریافت لیست بخش‌ها ============
  const fetchWards = async () => {
    setLoadingWards(true);
    try {
      const response = await api.get("/wards");
      
      let wardsData = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        wardsData = response.data.data;
      } 
      else if (Array.isArray(response.data)) {
        wardsData = response.data;
      }
      else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        wardsData = response.data.data.data;
      }
      else if (response.data?.success && response.data?.data && Array.isArray(response.data.data)) {
        wardsData = response.data.data;
      }
      
      if (!Array.isArray(wardsData)) {
        wardsData = [];
      }
      
      setWards(wardsData);
      
      if (wardsData.length === 0) {
        toast.warning("⚠️ هیچ بخشی در سیستم تعریف نشده است");
      }
      
    } catch (err) {
      console.error("❌ خطا در دریافت بخش‌ها:", err);
      toast.error("❌ خطا در دریافت لیست بخش‌ها");
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
    setFormData(prev => {
      const newData = { ...prev, ward_id: String(wardId) };
      return newData;
    });
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

  // ============ بروزرسانی لیست درخواست‌ها ============
  const refreshAdmissionList = async () => {
    if (fetchAllAdmissions) {
      const data = await fetchAllAdmissions();
      if (data) {
        setAdmissionRequests(data);
      }
    }
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
        
        await refreshAdmissionList();
        
        if (onSave) {
          await onSave(payload);
        }
        
        if (onRefresh) onRefresh();
        
        toast.info("➡️ لطفاً برای اخذ فیس بستری به بخش مدیریت فیس مراجعه کنید");
        
        if (onNextStep) {
          onNextStep();
        }
        
        if (onComplete) {
          onComplete();
        }
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
              messages.forEach((msg) => {
                toast.error(`❌ ${field}: ${msg}`);
              });
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
    if (!window.confirm("آیا از حذف این درخواست بستری اطمینان دارید؟")) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/admissions/${id}`);
      toast.success("✅ درخواست بستری با موفقیت حذف شد");
      await refreshAdmissionList();
    } catch (err) {
      console.error("خطا در حذف درخواست:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ویرایش درخواست بستری ============
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setFormData({
      ward_id: request.ward_id || "",
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

  // ============ ذخیره ویرایش درخواست ============
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
      console.error("خطا در ویرایش درخواست:", err);
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
                .info { margin: 10px 0; }
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
                <div>${response.data.data.hospital_name || 'بیمارستان'}</div>
                <div>${response.data.data.hospital_address || ''}</div>
                <div>تلفن: ${response.data.data.hospital_phone || ''}</div>
              </div>
              
              <div class="info">
                <div class="info-row">
                  <span class="label">شماره بستری:</span>
                  <span class="value">#${response.data.data.admission.id}</span>
                </div>
                <div class="info-row">
                  <span class="label">نام بیمار:</span>
                  <span class="value">${response.data.data.patient?.full_name || 'نامشخص'}</span>
                </div>
                <div class="info-row">
                  <span class="label">کد ملی:</span>
                  <span class="value">${response.data.data.patient?.national_id || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="label">بخش:</span>
                  <span class="value">${response.data.data.ward?.name || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="label">پزشک معالج:</span>
                  <span class="value">${response.data.data.doctor?.name || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="label">تاریخ بستری:</span>
                  <span class="value">${new Date(response.data.data.admission.admission_date).toLocaleDateString('fa-IR')}</span>
                </div>
                <div class="info-row">
                  <span class="label">تشخیص:</span>
                  <span class="value">${response.data.data.admission.diagnosis || '-'}</span>
                </div>
                ${response.data.data.admission.admission_instructions ? `
                  <div class="instructions">
                    <strong>📋 دستورالعمل‌های بستری:</strong>
                    <ul>
                      ${response.data.data.admission.admission_instructions.split('\n').map(item => 
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
      console.error("خطا در پرینت:", err);
      toast.error("❌ خطا در پرینت رسید");
    }
  };

  // ختم معالجه
  const handleCompleteTreatment = async () => {
    if (!window.confirm("آیا مطمئن هستید که معالجه را ختم کنید؟")) {
      return;
    }

    setLoading(true);
    try {
      if (isAdmitted && admissionId) {
        try {
          await api.post(`/admissions/${admissionId}/discharge`);
          toast.info("🏥 بیمار از بخش بستری ترخیص شد");
        } catch (err) {
          console.error("خطا در ترخیص:", err);
        }
      }

      const response = await api.post(`/admissions/complete-treatment/${registration?.reg_id}`);
      if (response.data?.success) {
        toast.success("✅ معالجه ختم شد و در تاریخچه ذخیره گردید");
        if (onFinish) onFinish();
        if (onComplete) onComplete();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
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

  // ============ رندر لیست درخواست‌ها ============
  const renderRequestsList = () => {
    if (!admissionRequests || admissionRequests.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>📭</div>
          <div>هیچ درخواست بستری ثبت نشده است</div>
        </div>
      );
    }

    return (
      <div style={styles.requestList}>
        <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>
          📋 لیست درخواست‌های بستری
        </h4>
        {admissionRequests.map((request) => (
          <div key={request.id} style={styles.requestItem}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', color: 'white' }}>
                  {request.patient?.full_name || 'نامشخص'}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  #{request.id}
                </span>
                <span style={{ 
                  ...styles.requestStatus,
                  backgroundColor: request.status === 'admitted' ? '#22c55e' : '#f59e0b',
                  color: 'white'
                }}>
                  {request.status === 'admitted' ? '✅ بستری' : 'در انتظار'}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  بخش: {request.ward?.name || '-'}
                </span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  {request.admission_date ? new Date(request.admission_date).toLocaleDateString('fa-IR') : '-'}
                </span>
              </div>
              {request.diagnosis && (
                <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>
                  تشخیص: {request.diagnosis}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handlePrintRequest(request.id)}
                style={{
                  ...styles.button,
                  ...styles.buttonInfo,
                  padding: '5px 15px',
                  fontSize: '12px'
                }}
              >
                🖨️ پرینت
              </button>
              <button
                onClick={() => handleEditRequest(request)}
                style={{
                  ...styles.button,
                  ...styles.buttonWarning,
                  padding: '5px 15px',
                  fontSize: '12px'
                }}
              >
                ✏️ ویرایش
              </button>
              <button
                onClick={() => handleDeleteRequest(request.id)}
                style={{
                  ...styles.button,
                  ...styles.buttonDanger,
                  padding: '5px 15px',
                  fontSize: '12px'
                }}
              >
                🗑️ حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h3 style={{ color: '#ef4444', marginBottom: '20px', textAlign: 'center' }}>
        🏥 بستری بیمار
      </h3>

      {/* وضعیت بستری */}
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={styles.infoLabel}>وضعیت بستری:</span>
          {isAdmitted ? (
            <span style={styles.successBadge}>✅ بستری شده</span>
          ) : (
            <span style={styles.warningBadge}>⏳ در انتظار بستری</span>
          )}
        </div>
        {isAdmitted && admissionId && (
          <>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>شماره بستری:</span>
              <span style={styles.infoValue}>#{admissionId}</span>
            </div>
            {admissionData?.ward_name && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>بخش:</span>
                <span style={styles.infoValue}>{admissionData.ward_name}</span>
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
      </div>

      {/* اطلاعات بیمار */}
      <div style={styles.infoCard}>
        <h4 style={{ color: 'white', marginBottom: '10px' }}>اطلاعات بیمار</h4>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>نام بیمار:</span>
          <span style={styles.infoValue}>{registration?.patient?.first_name || registration?.patient_name || 'نامشخص'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>کد ملی:</span>
          <span style={styles.infoValue}>{registration?.patient?.national_id || registration?.national_id || 'نامشخص'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>شماره تماس:</span>
          <span style={styles.infoValue}>{registration?.patient?.mobile || registration?.phone || 'نامشخص'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>تشخیص اولیه:</span>
          <span style={styles.infoValue}>{registration?.diagnosis || 'نامشخص'}</span>
        </div>
        {registration?.visit_number && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>شماره مراجعه:</span>
            <span style={styles.infoValue}>#{registration.visit_number}</span>
          </div>
        )}
      </div>

      {/* فرم بستری */}
      {!isAdmitted ? (
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
                            <span style={styles.wardAvailable}>
                              🟢 {ward.available_beds || 0} تخت موجود
                            </span>
                          ) : (
                            <span style={styles.wardFull}>
                              🔴 تکمیل شده
                            </span>
                          )}
                          {isSelected && (
                            <span style={{ color: '#ef4444', marginLeft: '10px' }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {formData.ward_id && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#1a3a2a', borderRadius: '6px' }}>
                  <span style={{ color: '#22c55e' }}>✅ بخش انتخاب شده: {wards.find(w => String(w.id) === formData.ward_id)?.name || 'نامشخص'}</span>
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
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

            <div style={styles.formGroup}>
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

            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
              <label style={styles.label}>تشخیص</label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                rows="2"
                style={styles.textarea}
                placeholder="تشخیص بیماری"
              />
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
                <input
                  type="text"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="مثلاً: استراحت مطلق در تخت"
                  style={{ ...styles.input, flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInstruction();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addInstruction}
                  style={styles.instructionAddBtn}
                >
                  ➕ افزودن
                </button>
              </div>
              
              {instructionsList.length > 0 && (
                <div style={{ marginTop: '10px' }}>
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

            <div style={{ ...styles.formGroup, ...styles.gridFull }}>
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

          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...((loading || isSubmitting) ? styles.buttonDisabled : {})
              }}
            >
              {(loading || isSubmitting) ? '⏳ در حال ثبت...' : '🏥 ثبت درخواست بستری'}
            </button>
          </div>
        </form>
      ) : (
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
              marginTop: '15px', 
              textAlign: 'right',
              background: '#0f1a2a',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #2a3a4a'
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

      {/* مودال ویرایش */}
      {showEditModal && editingRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '20px' }}>
              ✏️ ویرایش درخواست بستری #{editingRequest.id}
            </h4>
            
            <form onSubmit={handleSaveEdit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>بخش بستری *</label>
                <select
                  value={formData.ward_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, ward_id: e.target.value }))}
                  style={styles.select}
                >
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
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  rows="2"
                  style={styles.textarea}
                  placeholder="تشخیص بیماری"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>دستورالعمل‌های بستری</label>
                <div style={styles.instructionInputGroup}>
                  <input
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="دستورالعمل جدید..."
                    style={{ ...styles.input, flex: 1 }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInstruction();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addInstruction}
                    style={styles.instructionAddBtn}
                  >
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
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>یادداشت‌های ویژه</label>
                <textarea
                  value={formData.special_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_notes: e.target.value }))}
                  rows="2"
                  style={styles.textarea}
                  placeholder="یادداشت‌های اضافی..."
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>اولویت</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  style={styles.select}
                >
                  <option value="high">🔴 بالا</option>
                  <option value="medium">🟡 متوسط</option>
                  <option value="normal">🟢 معمولی</option>
                  <option value="low">⚪ پایین</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRequest(null);
                    setFormData({
                      ward_id: "",
                      admission_type: "emergency",
                      diagnosis: "",
                      admission_instructions: "",
                      special_notes: "",
                      priority: "normal"
                    });
                    setInstructionsList([]);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.buttonSecondary
                  }}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.button,
                    ...styles.buttonSuccess,
                    ...(loading ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? '⏳ در حال ذخیره...' : '✅ ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* دکمه‌های عملیاتی */}
      <div style={{ ...styles.buttonGroup, marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
        <button
          type="button"
          onClick={handleGoToNext}
          disabled={loading || isSubmitting || isAdmitted}
          style={{
            ...styles.button,
            ...styles.buttonWarning,
            ...((loading || isSubmitting || isAdmitted) ? styles.buttonDisabled : {})
          }}
        >
          📅 ملاقات قبلی
        </button>

        <button
          type="button"
          onClick={handleCompleteTreatment}
          disabled={loading || isSubmitting}
          style={{
            ...styles.button,
            ...styles.buttonSuccess,
            ...((loading || isSubmitting) ? styles.buttonDisabled : {})
          }}
        >
          ✅ ختم معالجه
        </button>

        {isAdmitted && (
          <button
            type="button"
            onClick={() => {
              if (onNextStep) {
                onNextStep();
                toast.info("💰 رفتن به مدیریت فیس بستری");
              }
            }}
            style={{
              ...styles.button,
              ...styles.buttonInfo
            }}
          >
            💰 مدیریت فیس بستری
          </button>
        )}
      </div>
    </div>
  );
}