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
    room_number: "",
    bed_number: "",
    admission_type: "emergency",
    diagnosis: "",
    notes: ""
  });
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // دریافت اطلاعات مریض و بررسی وضعیت قبلی
  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
        // بررسی اینکه آیا قبلاً بستری ثبت شده است
        if (data.admission) {
          setIsRequested(true);
          setFormData({
            ward_id: data.admission.ward_id || '',
            room_number: data.admission.room_number || '',
            bed_number: data.admission.bed_number || '',
            admission_type: data.admission.admission_type || 'emergency',
            diagnosis: data.admission.diagnosis || '',
            notes: data.admission.notes || ''
          });
        }
        
        if (data.registration?.status === 'completed') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
      }
    };
    fetchPatientInfo();
  }, [registration?.reg_id, api]);

  // دریافت لیست بخش‌ها
  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    setLoadingWards(true);
    try {
      const response = await api.get("/doctor/wards");
      if (response.data?.data) {
        setWards(response.data.data);
      }
    } catch (err) {
      console.error("خطا در دریافت بخش‌ها:", err);
      toast.error("❌ خطا در دریافت لیست بخش‌ها");
    } finally {
      setLoadingWards(false);
    }
  };

  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '18px' }}>اطلاعات مریض معتبر نیست</div>
        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '10px' }}>
          لطفاً یک مریض را از صف انتخاب کنید
        </div>
      </div>
    );
  }

  const patient = patientInfo?.patient || registration.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ward_id) {
      toast.warning("⚠️ لطفاً بخش بستری را انتخاب کنید");
      return;
    }

    if (!formData.diagnosis) {
      toast.warning("⚠️ لطفاً تشخیص را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reg_id: registration.reg_id,
        patient_id: registration.patient_id,
        doctor_id: registration.doctor_id,
        ...formData
      };

      const response = await api.post("/doctor/admission", payload);
      
      if (response.data?.success) {
        toast.success("✅ بیمار با موفقیت بستری شد");
        setIsRequested(true);
        
        if (onSave) {
          await onSave(formData);
        }
        
        onRefresh();
      } else {
        toast.error("❌ خطا در بستری بیمار");
      }
    } catch (err) {
      console.error("خطا در بستری بیمار:", err);
      toast.error("❌ خطا در بستری بیمار");
    } finally {
      setLoading(false);
    }
  };

  const getGenderText = (gender) => {
    if (!gender) return '-';
    const genderMap = {
      'male': '♂️ مرد',
      'female': '♀️ زن',
      'other': '⚧️ دیگر'
    };
    return genderMap[gender] || gender;
  };

  const getAdmissionTypeLabel = (type) => {
    const typeMap = {
      'emergency': '🔴 اورژانسی',
      'planned': '📋 برنامه‌ریزی شده',
      'elective': '⚪ اختیاری',
      'transfer': '🔄 انتقالی'
    };
    return typeMap[type] || type;
  };

  const getAdmissionTypeColor = (type) => {
    const colorMap = {
      'emergency': '#ef4444',
      'planned': '#3b82f6',
      'elective': '#9ca3af',
      'transfer': '#f59e0b'
    };
    return colorMap[type] || '#6b7280';
  };

  return (
    <div>
      <h3 style={{ color: '#ef4444', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🏥 بستری بیمار
      </h3>

      {/* وضعیت */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        padding: '10px 15px',
        backgroundColor: '#1a2a3a',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت بستری:</span>
          <span style={{
            color: isRequested ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
          </span>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت معالجه:</span>
          <span style={{
            color: isCompleted ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isCompleted ? '✅ ختم شده' : '⏳ در حال 진행'}
          </span>
        </div>
        {formData.admission_type && isRequested && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>نوع بستری:</span>
            <span style={{
              color: getAdmissionTypeColor(formData.admission_type),
              fontWeight: 'bold',
              marginRight: '8px'
            }}>
              {getAdmissionTypeLabel(formData.admission_type)}
            </span>
          </div>
        )}
      </div>

      {/* اطلاعات مریض */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px 20px',
        borderRadius: '8px',
        marginBottom: '25px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px 20px'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>نام کامل</span>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
            {patient.first_name || ''} {patient.last_name || ''}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>سن</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>
            {patient.age ? `${patient.age} سال` : '-'}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>جنسیت</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>
            {getGenderText(patient.gender)}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>شماره تماس</span>
          <div style={{ color: 'white', fontWeight: 'bold' }} dir="ltr">
            {patient.mobile || '-'}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>شماره مراجعه</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>
            {registration.visit_number || '-'}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>تشخیص</span>
          <div style={{ color: 'white' }}>{registration.diagnosis || '-'}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          {/* بخش بستری */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              بخش بستری <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              name="ward_id"
              value={formData.ward_id}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                opacity: isDisabled || isRequested ? 0.5 : 1
              }}
              disabled={loadingWards || isDisabled || isRequested}
            >
              <option value="">انتخاب کنید...</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.name} {ward.code ? `(${ward.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* نوع بستری */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              نوع بستری
            </label>
            <select
              name="admission_type"
              value={formData.admission_type}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                opacity: isDisabled || isRequested ? 0.5 : 1
              }}
              disabled={isDisabled || isRequested}
            >
              <option value="emergency">🔴 اورژانسی</option>
              <option value="planned">📋 برنامه‌ریزی شده</option>
              <option value="elective">⚪ اختیاری</option>
              <option value="transfer">🔄 انتقالی</option>
            </select>
          </div>

          {/* شماره اتاق */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              شماره اتاق
            </label>
            <input
              type="text"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              placeholder="مثلاً: ۲۰۱"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                opacity: isDisabled || isRequested ? 0.5 : 1
              }}
              disabled={isDisabled || isRequested}
            />
          </div>

          {/* شماره تخت */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              شماره تخت
            </label>
            <input
              type="text"
              name="bed_number"
              value={formData.bed_number}
              onChange={handleChange}
              placeholder="مثلاً: ۵"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                opacity: isDisabled || isRequested ? 0.5 : 1
              }}
              disabled={isDisabled || isRequested}
            />
          </div>

          {/* تشخیص */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              تشخیص <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                resize: "vertical",
                opacity: isDisabled || isRequested ? 0.5 : 1
              }}
              placeholder="تشخیص اولیه بیمار را وارد کنید..."
              disabled={isDisabled || isRequested}
            />
          </div>

          {/* یادداشت‌ها */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              یادداشت‌ها
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                resize: "vertical",
                opacity: isDisabled ? 0.5 : 1
              }}
              placeholder="یادداشت‌های اضافی برای بستری..."
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* ============ دکمه‌های ناوبری ============ */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center', 
          marginTop: '30px',
          flexWrap: 'wrap',
          borderTop: '2px solid #374151',
          paddingTop: '20px'
        }}>
          {/* دکمه 1: برگشت به مرحله قبلی */}
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>↩️</span>
            برگشت به {prevStep?.label || 'ملاقات بعدی'}
          </button>

          {/* دکمه 2: ثبت بستری */}
          <button
            type="submit"
            disabled={loading || isDisabled || isRequested}
            style={{
              backgroundColor: (isDisabled || isRequested) ? '#6b7280' : '#ef4444',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled || isRequested) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || isRequested) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🏥</span>
            {loading ? 'در حال ثبت...' : isCompleted ? 'معالجه ختم شده' : isRequested ? '✅ ثبت شده' : 'ثبت بستری'}
          </button>

          {/* دکمه 3: ختم معالجه */}
          <button
            type="button"
            onClick={onFinish}
            disabled={isCompleted || isSubmitting}
            style={{
              backgroundColor: isCompleted ? '#6b7280' : '#dc2626',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (isCompleted || isSubmitting) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🏁</span>
            {isCompleted ? '✅ ختم شده' : 'ختم معالجه'}
          </button>

          {/* دکمه 4: رفتن به مرحله بعدی (همیشه فعال) */}
          {nextStep && (
            <button
              type="button"
              onClick={onNextStep}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#6b7280' : '#3b82f6',
                color: 'white',
                padding: '10px 25px',
                borderRadius: '6px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>➡️</span>
              رفتن به {nextStep.label} {!isRequested && '(بدون ثبت)'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}