React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?    import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function ExaminationForm({ registration, onComplete, onRefresh, api }) {
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

  useEffect(() => {
    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        setFormData({
          diagnosis: data.diagnosis || '',
          weight: data.weight || '',
          blood_pressure: data.blood_pressure || '',
          temperature: data.temperature || '',
          oxygen: data.oxygen || '',
          pulse: data.pulse || '',
          respiratory_rate: data.respiratory_rate || '',
          height: data.height || '',
          bmi: data.bmi || '',
          chief_complaint: data.chief_complaint || '',
          history_of_present_illness: data.history_of_present_illness || '',
          past_medical_history: data.past_medical_history || '',
          physical_examination: data.physical_examination || '',
          note: data.note || ''
        });
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
        toast.error("❌ خطا در دریافت اطلاعات مریض");
      }
    };
    fetchPatientInfo();
  }, [registration.reg_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/doctor/treatment/${registration.reg_id}`, formData);
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
      onRefresh();
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      console.error("خطا در ثبت معاینه:", err);
      if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error("❌ خطا در ثبت معلومات معاینه");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید معالجه این مریض را ختم کنید؟")) return;

    try {
      await api.post(`/doctor/complete/${registration.reg_id}`);
      toast.success("✅ معالجه با موفقیت ختم شد");
      onRefresh();
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error("❌ خطا در ختم معالجه");
    }
  };

  const patient = patientInfo?.patient || registration.patient || {};

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🩺 معاینه مریض
      </h3>

      {/* اطلاعات مریض */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '25px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>نام مریض</span>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
            {patient.first_name || ''} {patient.last_name || ''}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>شماره مراجعه</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{registration.visit_number || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>شماره صف</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>#{registration.queue_number || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>بخش</span>
          <div style={{ color: 'white' }}>{registration.department?.name || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>شماره تماس</span>
          <div style={{ color: 'white' }} dir="ltr">{patient.mobile || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>سن</span>
          <div style={{ color: 'white' }}>{patient.age || '-'}</div>
        </div>
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
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
                style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center', 
          marginTop: '30px',
          flexWrap: 'wrap',
          borderTop: '1px solid #374151',
          paddingTop: '20px'
        }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 40px',
              borderRadius: '5px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '⏳ در حال ثبت...' : '💾 ثبت معاینه'}
          </button>

          <button
            type="button"
            onClick={handleComplete}
            style={{
              backgroundColor: '#22c55e',
              color: 'white',
              padding: '12px 40px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            ✅ ختم معالجه
          </button>

          <button
            type="button"
            onClick={onComplete}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '12px 40px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            ↩️ بازگشت
          </button>
        </div>
      </form>
    </div>
  );
}     