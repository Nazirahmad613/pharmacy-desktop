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
  isTreatmentComplete
}) {
  const [formData, setFormData] = useState({
    diagnosis: '',
    weight: '',
    blood_pressure: '',
    temperature: '',
    oxygen: '',
    pulse: '',
    respiratory_rate: '',
    height: '',
    bmi: '',
    chief_complaint: '',
    history_of_present_illness: '',
    past_medical_history: '',
    physical_examination: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isExamined, setIsExamined] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
        if (data.previous_examination) {
          setIsExamined(true);
          setFormData({
            diagnosis: data.previous_examination.diagnosis || '',
            weight: data.previous_examination.weight || '',
            blood_pressure: data.previous_examination.blood_pressure || '',
            temperature: data.previous_examination.temperature || '',
            oxygen: data.previous_examination.oxygen || '',
            pulse: data.previous_examination.pulse || '',
            respiratory_rate: data.previous_examination.respiratory_rate || '',
            height: data.previous_examination.height || '',
            bmi: data.previous_examination.bmi || '',
            chief_complaint: data.previous_examination.chief_complaint || '',
            history_of_present_illness: data.previous_examination.history_of_present_illness || '',
            past_medical_history: data.previous_examination.past_medical_history || '',
            physical_examination: data.previous_examination.physical_examination || '',
            note: data.previous_examination.note || ''
          });
        }
        
        if (data.registration?.visit_status === 'Completed') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
        toast.error("❌ خطا در دریافت اطلاعات مریض");
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // اعتبارسنجی
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
      // 1. ثبت معاینه در جدول examinations
      const examinationPayload = {
        ...formData,
        registration_id: registration.reg_id,
        patient_id: registration.patient_id,
        user_id: registration.doctor_id
      };
      
      console.log("📤 ارسال داده معاینه:", examinationPayload);
      
      await api.post(`/doctor/treatment/${registration.reg_id}`, examinationPayload);
      
      // 2. به‌روزرسانی وضعیت مراجعه - استفاده از PUT مستقیم به جای PATCH
      // این کار از خطای CHECK constraint جلوگیری می‌کند
      const statusPayload = {
        visit_status: 'Examining',  // مقدار صحیح با حرف بزرگ E
        diagnosis: formData.diagnosis,
        weight: formData.weight || null,
        blood_pressure: formData.blood_pressure || null,
        temperature: formData.temperature || null,
        oxygen: formData.oxygen || null
      };
      
      console.log("📤 ارسال وضعیت:", statusPayload);
      
      // استفاده از PUT به جای PATCH برای اطمینان از اعمال تغییرات
      await api.put(`/registrations/${registration.reg_id}`, statusPayload);
      
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
      setIsExamined(true);
      
      if (onSave) {
        await onSave(formData);
      }
      
      onRefresh();
      
      // دریافت اطلاعات به‌روز شده
      const response = await api.get(`/doctor/patient/${registration.reg_id}`);
      const data = response.data?.data || response.data;
      setPatientInfo(data);
      
    } catch (err) {
      console.error("❌ خطا در ثبت معاینه:", err);
      console.error("❌ جزئیات خطا:", err.response?.data);
      
      // نمایش خطای دقیق از سرور
      if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else if (err.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat();
        toast.error(`❌ ${errors[0]}`);
      } else if (err.response?.status === 500) {
        toast.error("❌ خطای سرور - لطفاً با پشتیبانی تماس بگیرید");
      } else {
        toast.error("❌ خطا در ثبت معلومات معاینه");
      }
    } finally {
      setLoading(false);
    }
  };

  const patient = patientInfo?.patient || registration.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting;

  const getGenderText = (gender) => {
    if (!gender) return '-';
    const genderMap = {
      'male': '♂️ مرد',
      'female': '♀️ زن',
      'other': '⚧️ دیگر'
    };
    return genderMap[gender] || gender;
  };

  const getBloodGroupText = (bloodGroup) => {
    if (!bloodGroup) return '-';
    const bloodMap = {
      'A+': 'A+',
      'A-': 'A-',
      'B+': 'B+',
      'B-': 'B-',
      'AB+': 'AB+',
      'AB-': 'AB-',
      'O+': 'O+',
      'O-': 'O-'
    };
    return bloodMap[bloodGroup] || bloodGroup;
  };

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🩺 معاینه مریض
      </h3>

      {/* وضعیت معالجه */}
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
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت معاینه:</span>
          <span style={{
            color: isExamined ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isExamined ? '✅ ثبت شده' : '⏳ ثبت نشده'}
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
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>گروه خونی</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>
            {getBloodGroupText(patient.blood_group)}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>شماره تماس</span>
          <div style={{ color: 'white', fontWeight: 'bold' }} dir="ltr">
            {patient.mobile || '-'}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>بخش</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>
            {registration.department?.name || '-'}
          </div>
        </div>
        {patient.address && (
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: '#9ca3af', fontSize: '12px', display: 'block' }}>آدرس</span>
            <div style={{ color: 'white' }}>
              {patient.address}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* ستون راست - اطلاعات بالینی */}
          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '15px' }}>📊 علایم حیاتی</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                وزن (کیلوگرم)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 70.5"
                min="0"
                max="300"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                قد (سانتی‌متر)
              </label>
              <input
                type="number"
                step="0.1"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 175"
                min="50"
                max="250"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                BMI
              </label>
              <input
                type="number"
                step="0.1"
                name="bmi"
                value={formData.bmi}
                onChange={handleChange}
                className="form-control"
                placeholder="محاسبه خودکار"
                min="10"
                max="60"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                فشار خون
              </label>
              <input
                type="text"
                name="blood_pressure"
                value={formData.blood_pressure}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 120/80"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                حرارت (درجه سانتی‌گراد)
              </label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 36.5"
                min="30"
                max="45"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                نبض (ضربه در دقیقه)
              </label>
              <input
                type="number"
                name="pulse"
                value={formData.pulse}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 72"
                min="30"
                max="200"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تعداد تنفس (در دقیقه)
              </label>
              <input
                type="number"
                name="respiratory_rate"
                value={formData.respiratory_rate}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 16"
                min="5"
                max="60"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                اکسیجن (%)
              </label>
              <input
                type="number"
                name="oxygen"
                value={formData.oxygen}
                onChange={handleChange}
                className="form-control"
                placeholder="مثلاً 98"
                min="0"
                max="100"
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>
          </div>

          {/* ستون چپ - اطلاعات بالینی */}
          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '15px' }}>📋 ارزیابی بالینی</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                شکایت اصلی *
              </label>
              <textarea
                name="chief_complaint"
                value={formData.chief_complaint}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="شکایت اصلی مریض را وارد کنید..."
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تاریخچه بیماری فعلی
              </label>
              <textarea
                name="history_of_present_illness"
                value={formData.history_of_present_illness}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="تاریخچه بیماری فعلی..."
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                سابقه پزشکی قبلی
              </label>
              <textarea
                name="past_medical_history"
                value={formData.past_medical_history}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="سابقه پزشکی قبلی..."
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                معاینه فیزیکی
              </label>
              <textarea
                name="physical_examination"
                value={formData.physical_examination}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="نتایج معاینه فیزیکی..."
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تشخیص *
              </label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="تشخیص اولیه..."
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                یادداشت‌های اضافی
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="form-control"
                rows="2"
                placeholder="یادداشت‌های اضافی..."
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />
            </div>
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
            برگشت به {prevStep?.label || 'صف انتظار'}
          </button>

          {/* دکمه 2: ثبت معاینه */}
          <button
            type="submit"
            disabled={loading || isDisabled || isExamined}
            style={{
              backgroundColor: (isDisabled || isExamined) ? '#6b7280' : '#10b981',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled || isExamined) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || isExamined) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>💾</span>
            {loading ? 'در حال ثبت...' : isCompleted ? 'معالجه ختم شده' : isExamined ? '✅ ثبت شده' : 'ثبت معاینه'}
          </button>

          {/* دکمه 3: ختم معالجه */}
          <button
            type="button"
            onClick={onFinish}
            disabled={!isExamined || isCompleted || isSubmitting}
            style={{
              backgroundColor: (!isExamined || isCompleted) ? '#6b7280' : '#dc2626',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (!isExamined || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!isExamined || isCompleted || isSubmitting) ? 0.6 : 1,
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

          {/* دکمه 4: رفتن به مرحله بعدی */}
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
              رفتن به {nextStep.label} {!isExamined && '(بدون ثبت)'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}