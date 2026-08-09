// src/app/pages/treatment/examinate/ExaminationForm.jsx
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
  setAllExaminations 
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
  const [isFormLocked, setIsFormLocked] = useState(false);

  // ============ بارگذاری اطلاعات از props ============
  useEffect(() => {
    console.log('📝 ExaminationForm - savedData changed:', savedData);
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
      if (savedData.id) {
        setIsFormLocked(true);
      }
    } else {
      // اگر savedData null باشه، فرم رو ریست کن
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
        
        if (data.visit_status === 'Completed') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
        toast.error(`❌ خطا در دریافت اطلاعات مریض: ${err.response?.data?.message || err.message}`);
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
        console.log('📥 Check Examination Response:', response.data);
        
        if (response.data?.success && response.data?.data) {
          const data = response.data.data;
          
          // به‌روزرسانی لیست معاینات
          if (data.all_examinations && setAllExaminations) {
            console.log('📋 Setting allExaminations from API:', data.all_examinations);
            setAllExaminations(data.all_examinations);
          }
          
          // اگر معاینه وجود دارد
          if (data.examination) {
            console.log('✅ Found examination:', data.examination);
            if (setIsExamined) {
              setIsExamined(true);
            }
            setIsFormLocked(true);
            setFormData({
              diagnosis: data.examination.diagnosis || '',
              weight: data.examination.weight || '',
              blood_pressure: data.examination.blood_pressure || '',
              temperature: data.examination.temperature || '',
              oxygen: data.examination.oxygen || '',
              pulse: data.examination.pulse || '',
              respiratory_rate: data.examination.respiratory_rate || '',
              height: data.examination.height || '',
              bmi: data.examination.bmi || '',
              chief_complaint: data.examination.chief_complaint || '',
              history_of_present_illness: data.examination.history_of_present_illness || '',
              past_medical_history: data.examination.past_medical_history || '',
              physical_examination: data.examination.physical_examination || '',
              note: data.examination.note || ''
            });
          } else {
            console.log('ℹ️ No examination found in response');
            setIsFormLocked(false);
          }
        }
      } catch (err) {
        console.log("هیچ معاینه‌ای یافت نشد");
        setIsFormLocked(false);
      }
    };

    checkExamination();
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
      const result = await onSave(formData);
      
      console.log('📝 Result from onSave:', result);
      
      if (result?.data?.examination) {
        setIsExamined(true);
        setIsFormLocked(true);
        
        // به‌روزرسانی فرم با داده‌های ثبت شده
        const examData = result.data.examination;
        setFormData({
          diagnosis: examData.diagnosis || '',
          weight: examData.weight || '',
          blood_pressure: examData.blood_pressure || '',
          temperature: examData.temperature || '',
          oxygen: examData.oxygen || '',
          pulse: examData.pulse || '',
          respiratory_rate: examData.respiratory_rate || '',
          height: examData.height || '',
          bmi: examData.bmi || '',
          chief_complaint: examData.chief_complaint || '',
          history_of_present_illness: examData.history_of_present_illness || '',
          past_medical_history: examData.past_medical_history || '',
          physical_examination: examData.physical_examination || '',
          note: examData.note || ''
        });
        
        // به‌روزرسانی لیست معاینات
        if (result.data.all_examinations && setAllExaminations) {
          console.log('📋 Updating allExaminations from save:', result.data.all_examinations);
          setAllExaminations(result.data.all_examinations);
        }
      }
      
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
      
    } catch (err) {
      console.error("❌ خطا در ثبت معاینه:", err);
      toast.error(`❌ خطا در ثبت معاینه: ${err.response?.data?.message || err.message}`);
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
      
      if (response.data?.data?.examination) {
        setIsExamined(true);
        setIsFormLocked(true);
      }
      
    } catch (err) {
      console.error("❌ خطا در ویرایش معاینه:", err);
      toast.error(`❌ خطا در ویرایش معاینه: ${err.response?.data?.message || err.message}`);
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
      
      if (savedData && savedData.id === examinationId) {
        setIsExamined(false);
        setIsFormLocked(false);
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
      toast.error(`❌ خطا در حذف معاینه: ${err.response?.data?.message || err.message}`);
    }
  };

  const patient = patientInfo?.patient || registration.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting || isFormLocked;

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

  const examinations = allExaminations || [];

  // ============ تابع پرینت ============
  const handlePrint = (examination) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد. لطفاً pop-up را فعال کنید.");
      return;
    }
    
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
            <p>تاریخ: ${new Date(examination.examination_date).toLocaleDateString('fa-IR')}</p>
          </div>
          
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ''} ${patient.last_name || ''}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration.visit_number || '-'}</span></div>
            <div class="info-item"><span class="label">سن:</span> <span class="value">${patient.age || '-'}</span></div>
            <div class="info-item"><span class="label">جنسیت:</span> <span class="value">${getGenderText(patient.gender)}</span></div>
          </div>
          
          <h3>📋 اطلاعات معاینه</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>شکایت اصلی</td><td>${examination.chief_complaint || '-'}</td></tr>
            <tr><td>تشخیص</td><td>${examination.diagnosis || '-'}</td></tr>
            <tr><td>وزن</td><td>${examination.weight ? examination.weight + ' کیلوگرم' : '-'}</td></tr>
            <tr><td>قد</td><td>${examination.height ? examination.height + ' سانتی‌متر' : '-'}</td></tr>
            <tr><td>BMI</td><td>${examination.bmi || '-'}</td></tr>
            <tr><td>فشار خون</td><td>${examination.blood_pressure || '-'}</td></tr>
            <tr><td>حرارت</td><td>${examination.temperature ? examination.temperature + '°C' : '-'}</td></tr>
            <tr><td>نبض</td><td>${examination.pulse || '-'}</td></tr>
            <tr><td>تعداد تنفس</td><td>${examination.respiratory_rate || '-'}</td></tr>
            <tr><td>اکسیژن</td><td>${examination.oxygen ? examination.oxygen + '%' : '-'}</td></tr>
            <tr><td>تاریخچه بیماری فعلی</td><td>${examination.history_of_present_illness || '-'}</td></tr>
            <tr><td>سابقه پزشکی قبلی</td><td>${examination.past_medical_history || '-'}</td></tr>
            <tr><td>معاینه فیزیکی</td><td>${examination.physical_examination || '-'}</td></tr>
            <tr><td>یادداشت</td><td>${examination.note || '-'}</td></tr>
          </table>
          
          <div class="signature">
            <p>دکتر: ${examination.user?.name || '-'}</p>
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
        {isFormLocked && (
          <div>
            <span style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '11px'
            }}>
              🔒 فرم قفل شده
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
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
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
                disabled={isDisabled}
                style={{ 
                  backgroundColor: '#1a1a2e', 
                  color: 'white', 
                  borderColor: '#374151', 
                  width: '100%',
                  opacity: isDisabled ? 0.5 : 1
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

      {/* ============ لیست معاینات با نمایش عرضی/جدولی ============ */}
      {examinations.length > 0 && (
        <div style={{ marginTop: '30px', borderTop: '2px solid #374151', paddingTop: '20px' }}>
          <h4 style={{ 
            color: '#60a5fa', 
            marginBottom: '15px', 
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>📋</span>
            تاریخچه معاینات
            <span style={{
              backgroundColor: '#374151',
              color: 'white',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {examinations.length}
            </span>
          </h4>

          {/* ===== جدول عرضی ===== */}
          <div style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid #374151'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '1200px',
              fontSize: '13px'
            }}>
              {/* هدر جدول */}
              <thead>
                <tr style={{
                  backgroundColor: '#0f1a2a',
                  borderBottom: '2px solid #374151'
                }}>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    #
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    📅 تاریخ
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    🩺 تشخیص
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    📋 شکایت
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    ⚖️ وزن
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    💓 فشار
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    💓 نبض
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    🌡️ دما
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    🫁 اکسیژن
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    borderLeft: '1px solid #2a3a4a',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    👨‍⚕️ دکتر
                  </th>
                  <th style={{ 
                    padding: '10px 12px', 
                    color: '#60a5fa', 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#0f1a2a',
                    zIndex: 2
                  }}>
                    عملیات
                  </th>
                </tr>
              </thead>

              {/* بدنه جدول */}
              <tbody>
                {examinations.map((exam, index) => (
                  <tr
                    key={exam.id}
                    style={{
                      backgroundColor: exam.id === savedData?.id ? '#065f46' : 'transparent',
                      borderBottom: '1px solid #2a3a4a',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (exam.id !== savedData?.id) {
                        e.currentTarget.style.backgroundColor = '#1a2a3a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (exam.id !== savedData?.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: exam.id === savedData?.id ? '#10b981' : '#9ca3af',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {index + 1}
                      {exam.id === savedData?.id && (
                        <span style={{
                          display: 'block',
                          fontSize: '9px',
                          color: '#10b981'
                        }}>
                          جاری
                        </span>
                      )}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: 'white',
                      fontSize: '12px',
                      borderLeft: '1px solid #2a3a4a',
                      whiteSpace: 'nowrap'
                    }}>
                      {new Date(exam.examination_date).toLocaleDateString('fa-IR')}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#fcd34d',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {exam.diagnosis || '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '12px',
                      borderLeft: '1px solid #2a3a4a',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {exam.chief_complaint || '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.weight ? `${exam.weight}kg` : '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#fcd34d',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.blood_pressure || '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#34d399',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.pulse || '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#60a5fa',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.temperature ? `${exam.temperature}°C` : '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#60a5fa',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.oxygen ? `${exam.oxygen}%` : '-'}
                    </td>
                    
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: 'white',
                      fontSize: '12px',
                      borderLeft: '1px solid #2a3a4a'
                    }}>
                      {exam.user?.name || '-'}
                    </td>
                    
                    <td style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditExamination(exam)}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteExamination(exam.id)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => handlePrint(exam)}
                          style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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