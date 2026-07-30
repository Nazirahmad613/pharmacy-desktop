import { useState } from "react";
import { toast } from "react-toastify";

export default function LaboratoryRequest({ registration, onComplete, onRefresh, api }) {
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState("");
  const [note, setNote] = useState("");
  const patient = registration.patient || {};

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
      onRefresh();
      
      setTimeout(() => {
        onComplete();
      }, 1500);
      
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

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px' }}>
        🔬 ارسال به لابراتوار
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
          <div style={{ color: 'white' }}>{registration.visit_number || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>شماره صف</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>#{registration.queue_number || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تشخیص</span>
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
              style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
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
              backgroundColor: '#8b5cf6',
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
            {loading ? '⏳ در حال ارسال...' : '📤 ارسال به لابراتوار'}
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