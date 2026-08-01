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
  savedData,        // اطلاعات ذخیره شده از parent
  allExaminations,  // لیست معاینات از parent
  isExamined,       // وضعیت معاینه از parent
  setIsExamined,    // تابع به‌روزرسانی وضعیت در parent
  setAllExaminations // تابع به‌روزرسانی لیست در parent
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingExamination, setEditingExamination] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // ============ بارگذاری اطلاعات از props ============
  useEffect(() => {
    // اگر اطلاعات ذخیره شده وجود دارد، فرم را پر کن
    if (savedData) {
      setFormData({
        diagnosis: savedData.diagnosis || '',
        weight: savedData.weight || '',
        blood_pressure: savedData.blood_pressure || '',
        temperature: savedData.temperature || '',
        oxygen: savedData.oxygen || '',
        pulse: savedData.pulse || '',
        respiratory_rate: savedData.respiratory_rate || '',
        height: savedData.height || '',
        bmi: savedData.bmi || '',
        chief_complaint: savedData.chief_complaint || '',
        history_of_present_illness: savedData.history_of_present_illness || '',
        past_medical_history: savedData.past_medical_history || '',
        physical_examination: savedData.physical_examination || '',
        note: savedData.note || ''
      });
    }
  }, [savedData]);

  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
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
      // استفاده از تابع onSave که از parent آمده
      const result = await onSave(formData);
      
      // به‌روزرسانی وضعیت در parent
      if (setIsExamined) {
        setIsExamined(true);
      }
      
      // به‌روزرسانی لیست معاینات
      if (result?.data?.all_examinations && setAllExaminations) {
        setAllExaminations(result.data.all_examinations);
      }
      
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
      onRefresh();
      
    } catch (err) {
      console.error("❌ خطا در ثبت معاینه:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============ تابع ویرایش معاینه ============
  const handleEditExamination = (examination) => {
    setEditingExamination(examination);
    setFormData({
      diagnosis: examination.diagnosis || '',
      weight: examination.weight || '',
      blood_pressure: examination.blood_pressure || '',
      temperature: examination.temperature || '',
      oxygen: examination.oxygen || '',
      pulse: examination.pulse || '',
      respiratory_rate: examination.respiratory_rate || '',
      height: examination.height || '',
      bmi: examination.bmi || '',
      chief_complaint: examination.chief_complaint || '',
      history_of_present_illness: examination.history_of_present_illness || '',
      past_medical_history: examination.past_medical_history || '',
      physical_examination: examination.physical_examination || '',
      note: examination.note || ''
    });
    setShowEditModal(true);
  };

  // ============ تابع ذخیره ویرایش ============
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
      
      // به‌روزرسانی داده‌های ذخیره شده
      if (response.data?.data?.examination && setIsExamined) {
        // داده‌های جدید را به parent بفرستیم
        onRefresh();
      }
      
    } catch (err) {
      console.error("❌ خطا در ویرایش معاینه:", err);
      toast.error("❌ خطا در ویرایش معاینه");
    } finally {
      setLoading(false);
    }
  };

  // ============ تابع حذف معاینه ============
  const handleDeleteExamination = async (examinationId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این معاینه را حذف کنید؟")) {
      return;
    }

    try {
      const response = await api.delete(`/doctor/examinations/${examinationId}`);
      
      if (response.data?.data && setAllExaminations) {
        setAllExaminations(response.data.data);
      }
      
      toast.success("✅ معاینه با موفقیت حذف شد");
      
      // اگر معاینه فعلی حذف شده است
      if (savedData && savedData.id === examinationId && setIsExamined) {
        setIsExamined(false);
        // فرم را خالی کن
        setFormData({
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
      }
      
    } catch (err) {
      console.error("❌ خطا در حذف معاینه:", err);
      toast.error("❌ خطا در حذف معاینه");
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

  // لیست معاینات از parent یا local
  const examinations = allExaminations || [];

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
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تعداد معاینات:</span>
          <span style={{
            color: '#60a5fa',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {examinations.length}
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

      {/* فرم ثبت معاینه */}
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
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
                disabled={isDisabled || isExamined}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: (isDisabled || isExamined) ? 0.5 : 1
                }}
              />
            </div>
          </div>
        </div>

        {/* دکمه‌های ناوبری */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center', 
          marginTop: '30px',
          flexWrap: 'wrap',
          borderTop: '2px solid #374151',
          paddingTop: '20px'
        }}>
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

      {/* ============ لیست معاینات ============ */}
      {examinations.length > 0 && (
        <div style={{ marginTop: '30px', borderTop: '2px solid #374151', paddingTop: '20px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '16px' }}>
            📋 تاریخچه معاینات ({examinations.length})
          </h4>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {examinations.map((exam) => (
              <div
                key={exam.id}
                style={{
                  backgroundColor: '#1a2a3a',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  borderRight: `4px solid ${exam.id === savedData?.id ? '#10b981' : '#374151'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      📅 {new Date(exam.examination_date).toLocaleDateString('fa-IR')} - {new Date(exam.examination_date).toLocaleTimeString('fa-IR')}
                    </span>
                    {exam.id === savedData?.id && (
                      <span style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        آخرین معاینه
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>تشخیص:</span>
                      <span style={{ color: 'white', marginRight: '5px' }}>{exam.diagnosis || '-'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>وزن:</span>
                      <span style={{ color: 'white', marginRight: '5px' }}>{exam.weight ? `${exam.weight} کیلوگرم` : '-'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>فشار خون:</span>
                      <span style={{ color: 'white', marginRight: '5px' }}>{exam.blood_pressure || '-'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>درجه حرارت:</span>
                      <span style={{ color: 'white', marginRight: '5px' }}>{exam.temperature ? `${exam.temperature}°C` : '-'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>دکتر:</span>
                      <span style={{ color: 'white', marginRight: '5px' }}>{exam.user?.name || '-'}</span>
                    </div>
                  </div>
                  {exam.chief_complaint && (
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#9ca3af' }}>
                      شکایت: {exam.chief_complaint}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleEditExamination(exam)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteExamination(exam.id)}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ مودال ویرایش ============ */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
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
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '20px' }}>✏️ ویرایش معاینه</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  شکایت اصلی *
                </label>
                <textarea
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  تشخیص *
                </label>
                <textarea
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  وزن (کیلوگرم)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  فشار خون
                </label>
                <input
                  type="text"
                  name="blood_pressure"
                  value={formData.blood_pressure}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  حرارت (درجه سانتی‌گراد)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  نبض (ضربه در دقیقه)
                </label>
                <input
                  type="number"
                  name="pulse"
                  value={formData.pulse}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  اکسیجن (%)
                </label>
                <input
                  type="number"
                  name="oxygen"
                  value={formData.oxygen}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  یادداشت
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExamination(null);
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                لغو
              </button>
              <button
                onClick={handleUpdateExamination}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#6b7280' : '#3b82f6',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}