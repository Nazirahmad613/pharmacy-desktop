// src/app/pages/treatment/admission/Admission.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

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
  isTreatmentComplete
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

  // دریافت لیست بخش‌ها
  useEffect(() => {
    fetchWards();
    checkAdmissionStatus();
  }, [registration]);

  // بررسی وضعیت بستری بیمار
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
      console.log("📥 پاسخ کامل wards:", JSON.stringify(response.data, null, 2));
      
      // بررسی ساختارهای مختلف پاسخ
      let wardsData = [];
      
      // حالت 1: response.data.data (رایج)
      if (response.data?.data && Array.isArray(response.data.data)) {
        wardsData = response.data.data;
      } 
      // حالت 2: response.data خودش آرایه است
      else if (Array.isArray(response.data)) {
        wardsData = response.data;
      }
      // حالت 3: response.data.data.data (پاگینیشن)
      else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        wardsData = response.data.data.data;
      }
      // حالت 4: response.data.success و response.data.data
      else if (response.data?.success && response.data?.data && Array.isArray(response.data.data)) {
        wardsData = response.data.data;
      }
      
      console.log("📥 wardsData استخراج شده:", wardsData);
      console.log("📥 تعداد بخش‌ها:", wardsData.length);
      
      // اطمینان از اینکه آرایه است
      if (!Array.isArray(wardsData)) {
        console.error("❌ wardsData آرایه نیست:", wardsData);
        wardsData = [];
      }
      
      setWards(wardsData);
      
      if (wardsData.length === 0) {
        toast.warning("⚠️ هیچ بخشی در سیستم تعریف نشده است");
      } else {
        toast.success(`✅ ${wardsData.length} بخش یافت شد`);
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
    console.log("🟢 بخش انتخاب شد - wardId:", wardId);
    setFormData(prev => {
      const newData = { ...prev, ward_id: String(wardId) };
      console.log("🟢 formData بعد از انتخاب:", newData);
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

  // ثبت درخواست بستری
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("🔍 formData قبل از ارسال:", formData);
    console.log("🔍 ward_id:", formData.ward_id);
    console.log("🔍 نوع ward_id:", typeof formData.ward_id);
    
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
        patient_id: registration?.patient_id,
        doctor_id: registration?.doctor_id,
        ward_id: formData.ward_id,
        admission_date: new Date().toISOString().split('T')[0],
        diagnosis: formData.diagnosis || registration?.initial_diagnosis || "",
        admission_instructions: instructionsText || formData.admission_instructions,
        special_notes: formData.special_notes,
        priority: formData.priority
      };

      console.log("📤 payload ارسال شده:", payload);

      const response = await api.post("/admissions", payload);
      
      if (response.data?.success) {
        toast.success("✅ درخواست بستری با موفقیت ثبت شد");
        setIsAdmitted(true);
        setAdmissionId(response.data.data?.id || null);
        setAdmissionData(response.data.data);
        
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
      console.error("خطا در ثبت درخواست بستری:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
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
    }
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
          <span style={styles.infoValue}>{registration?.initial_diagnosis || 'نامشخص'}</span>
        </div>
        {registration?.visit_number && (
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>شماره مراجعه:</span>
            <span style={styles.infoValue}>#{registration.visit_number}</span>
          </div>
        )}
      </div>

      {/* فرم بستری - فقط اگر بیمار بستری نشده باشد */}
      {!isAdmitted ? (
        <form onSubmit={handleSubmit}>
          <div style={styles.grid2}>
            {/* انتخاب بخش بستری به صورت لیست استاندارد */}
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
                    // اطمینان از وجود ward و id
                    if (!ward || !ward.id) {
                      return null;
                    }
                    
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
                <span style={{ color: '#22c55e', fontSize: '12px', marginTop: '5px' }}>
                  ✅ بخش انتخاب شده: {wards.find(w => String(w.id) === formData.ward_id)?.name || 'نامشخص'}
                </span>
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
                placeholder="تشخیص بیماری (در صورت عدم وارد کردن، از تشخیص اولیه استفاده می‌شود)"
              />
              {registration?.initial_diagnosis && !formData.diagnosis && (
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  💡 تشخیص اولیه: {registration.initial_diagnosis}
                </span>
              )}
            </div>

            {/* دستورالعمل‌های بستری */}
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
              
              {/* لیست دستورالعمل‌ها */}
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
                placeholder="یادداشت‌های اضافی برای بستری..."
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
          
          {/* نمایش دستورالعمل‌ها */}
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