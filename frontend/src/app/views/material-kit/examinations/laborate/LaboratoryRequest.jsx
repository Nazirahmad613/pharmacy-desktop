import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function LaboratoryRequest({ 
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
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState("");
  const [note, setNote] = useState("");
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
        
        if (data.laboratory_request) {
          setIsRequested(true);
          setTestType(data.laboratory_request.test_type || '');
          setNote(data.laboratory_request.note || '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!testType) {
      toast.warning("⚠️ لطفاً نوع آزمایش را انتخاب کنید");
      return;
    }

    setLoading(true);

    try {
      await api.post(`/doctor/laboratory/${registration.reg_id}`, {
        test_type: testType,
        note: note
      });
      
      toast.success("✅ مریض با موفقیت به لابراتوار ارسال شد");
      setIsRequested(true);
      
      if (onSave) {
        await onSave({ test_type: testType, note: note });
      }
      
      onRefresh();
      
    } catch (err) {
      console.error("خطا در ارسال به لابراتوار:", err);
      if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error("❌ خطا در ارسال به لابراتوار");
      }
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

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🔬 درخواست لابراتوار
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
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت درخواست:</span>
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
      </div>

      {/* اطلاعات خلاصه مریض */}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>نوع آزمایش *</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="form-control"
              style={{ 
                backgroundColor: '#1a1a2e', 
                color: 'white', 
                borderColor: '#374151',
                opacity: isDisabled ? 0.5 : 1
              }}
              disabled={isDisabled}
              required
            >
              <option value="">-- انتخاب نوع آزمایش --</option>
              <option value="Blood Test">آزمایش خون</option>
              <option value="Urine Test">آزمایش ادرار</option>
              <option value="X-Ray">رادیولوژی (X-Ray)</option>
              <option value="CT Scan">سی تی اسکن</option>
              <option value="MRI">ام آر آی</option>
              <option value="Ultrasound">التراساند</option>
              <option value="ECG">نوار قلب</option>
              <option value="Culture">کالچر</option>
              <option value="Stool Test">آزمایش مدفوع</option>
              <option value="Sputum Test">آزمایش خلط</option>
              <option value="Biopsy">بیوپسی</option>
              <option value="Other">سایر</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>یادداشت برای لابراتوار</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="form-control"
              rows="4"
              placeholder="توضیحات اضافی برای لابراتوار..."
              style={{ 
                backgroundColor: '#1a1a2e', 
                color: 'white', 
                borderColor: '#374151',
                opacity: isDisabled ? 0.5 : 1
              }}
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
            برگشت به {prevStep?.label || 'معاینه'}
          </button>

          {/* دکمه 2: ثبت درخواست لابراتوار */}
          <button
            type="submit"
            disabled={loading || isDisabled}
            style={{
              backgroundColor: isDisabled ? '#6b7280' : '#8b5cf6',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📤</span>
            {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : isRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
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