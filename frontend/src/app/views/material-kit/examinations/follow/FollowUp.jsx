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
  isTreatmentComplete
}) {
  const [formData, setFormData] = useState({
    follow_up_date: "",
    follow_up_time: "",
    reason: "",
    instructions: "",
    priority: "normal"
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
        
        // بررسی اینکه آیا قبلاً مراجعه بعدی ثبت شده است
        if (data.follow_up) {
          setIsRequested(true);
          setFormData({
            follow_up_date: data.follow_up.follow_up_date || '',
            follow_up_time: data.follow_up.follow_up_time || '',
            reason: data.follow_up.reason || '',
            instructions: data.follow_up.instructions || '',
            priority: data.follow_up.priority || 'normal'
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
        ...formData
      };

      const response = await api.post("/doctor/follow-up", payload);
      
      if (response.data?.success) {
        toast.success("✅ مراجعه بعدی با موفقیت ثبت شد");
        setIsRequested(true);
        
        if (onSave) {
          await onSave(formData);
        }
        
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
    if (!gender) return '-';
    const genderMap = {
      'male': '♂️ مرد',
      'female': '♀️ زن',
      'other': '⚧️ دیگر'
    };
    return genderMap[gender] || gender;
  };

  const getPriorityLabel = (priority) => {
    const priorityMap = {
      'normal': '🟢 عادی',
      'urgent': '🟡 فوری',
      'emergency': '🔴 اورژانسی'
    };
    return priorityMap[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colorMap = {
      'normal': '#10b981',
      'urgent': '#f59e0b',
      'emergency': '#ef4444'
    };
    return colorMap[priority] || '#6b7280';
  };

  // دریافت تاریخ امروز برای min
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <h3 style={{ color: '#10b981', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        📅 مراجعه بعدی (Follow Up)
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
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت مراجعه بعدی:</span>
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
        {formData.priority && isRequested && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>اولویت:</span>
            <span style={{
              color: getPriorityColor(formData.priority),
              fontWeight: 'bold',
              marginRight: '8px'
            }}>
              {getPriorityLabel(formData.priority)}
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
          {/* تاریخ مراجعه بعدی */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              تاریخ مراجعه بعدی <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleChange}
              min={today}
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

          {/* زمان مراجعه بعدی */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              زمان مراجعه بعدی
            </label>
            <input
              type="time"
              name="follow_up_time"
              value={formData.follow_up_time}
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
            />
          </div>

          {/* اولویت */}
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              اولویت
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "white",
                outline: "none",
                opacity: isDisabled ? 0.5 : 1
              }}
              disabled={isDisabled}
            >
              <option value="normal">🟢 عادی</option>
              <option value="urgent">🟡 فوری</option>
              <option value="emergency">🔴 اورژانسی</option>
            </select>
          </div>

          {/* دلیل مراجعه */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              دلیل مراجعه بعدی <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
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
              placeholder="دلیل مراجعه بعدی را وارد کنید..."
              disabled={isDisabled || isRequested}
            />
          </div>

          {/* دستورالعمل‌ها */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              دستورالعمل‌ها
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
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
              placeholder="دستورالعمل‌های لازم برای مراجعه بعدی..."
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
            برگشت به {prevStep?.label || 'نسخه'}
          </button>

          {/* دکمه 2: ثبت مراجعه بعدی */}
          <button
            type="submit"
            disabled={loading || isDisabled || isRequested}
            style={{
              backgroundColor: (isDisabled || isRequested) ? '#6b7280' : '#10b981',
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
            <span>📤</span>
            {loading ? 'در حال ثبت...' : isCompleted ? 'معالجه ختم شده' : isRequested ? '✅ ثبت شده' : 'ثبت مراجعه'}
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