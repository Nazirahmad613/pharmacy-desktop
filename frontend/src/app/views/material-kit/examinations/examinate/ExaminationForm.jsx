import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function ExaminationForm({ registration, onComplete, onRefresh, api }) {
  // ✅ بررسی اعتبار registration
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
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // دریافت اطلاعات کامل مریض
  useEffect(() => {
    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/doctor/patient/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        // پر کردن فرم با اطلاعات موجود
        setFormData({
          diagnosis: data.diagnosis || '',
          weight: data.weight || '',
          blood_pressure: data.blood_pressure || '',
          temperature: data.temperature || '',
          oxygen: data.oxygen || '',
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
      // ارسال اطلاعات معاینه
      await api.post(`/doctor/treatment/${registration.reg_id}`, formData);
      
      toast.success("✅ معلومات معاینه با موفقیت ثبت شد");
      
      // بروزرسانی داده‌ها
      onRefresh();
      
      // بعد از 2 ثانیه به صف برگرد
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
      <h3 style={{ color: '#60a5fa', marginBottom: '20px' }}>
        🩺 معاینه مریض
      </h3>

      {/* اطلاعات خلاصه مریض */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>نام مریض</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>تشخیص *</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="تشخیص اولیه..."
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>یادداشت</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="یادداشت‌های اضافی..."
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>وزن (کیلوگرم)</label>
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
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>فشار خون</label>
            <input
              type="text"
              name="blood_pressure"
              value={formData.blood_pressure}
              onChange={handleChange}
              className="form-control"
              placeholder="مثلاً 120/80"
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>حرارت (درجه سانتی‌گراد)</label>
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
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#9ca3af' }}>اکسیجن (%)</label>
            <input
              type="number"
              name="oxygen"
              value={formData.oxygen}
              onChange={handleChange}
              className="form-control"
              placeholder="مثلاً 98"
              min="0"
              max="100"
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
            />
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center', 
          marginTop: '25px',
          flexWrap: 'wrap'
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