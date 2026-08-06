// src/app/pages/laboratory/LaboratoryRequest.jsx
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
  const [formData, setFormData] = useState({
    test_type: '',
    test_name: '',
    test_description: '',
    clinical_indication: '',
    special_notes: '',
    request_date: new Date().toISOString().split('T')[0],
    sample_collection_date: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [isLabRequested, setIsLabRequested] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [barcode, setBarcode] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);

  // ============ دریافت اطلاعات مریض و بارکد ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/registrations/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        setRegistrationData(data);
        
        if (data.barcode) {
          setBarcode(data.barcode);
        } else if (data.patient?.barcode) {
          setBarcode(data.patient.barcode);
        }
        
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

  // ============ بارگذاری تست‌های لابراتوار ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const loadTests = async () => {
      try {
        // ✅ تغییر آدرس: حذف پیشوند doctor
        const response = await api.get(`/doctor/laboratory/${registration.reg_id}`);
        if (response.data?.success && response.data?.data) {
          setTests(response.data.data.tests || []);
          setIsLabRequested(response.data.data.has_tests || false);
        }
      } catch (err) {
        console.log("هیچ تست لابراتواری یافت نشد");
      }
    };

    loadTests();
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

  // ============ ثبت درخواست لابراتوار ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.test_type) {
      toast.warning("⚠️ لطفاً نوع آزمایش را انتخاب کنید");
      return;
    }

    setLoading(true);

    try {
      // ✅ تغییر آدرس: حذف پیشوند doctor و ارسال در URL
     const response = await api.post(`/doctor/laboratory/${registration.reg_id}`, {
        test_type: formData.test_type,
        test_name: formData.test_name,
        test_description: formData.test_description,
        clinical_indication: formData.clinical_indication,
        special_notes: formData.special_notes,
        request_date: formData.request_date,
        sample_collection_date: formData.sample_collection_date,
        // barcode به صورت خودکار در سرور تولید می‌شود، اما اگر نیاز باشد ارسال می‌کنیم
        barcode: barcode,
      });

      if (response.data?.data?.all_tests) {
        setTests(response.data.data.all_tests);
        setIsLabRequested(true);
        
        if (response.data.data.laboratory_request?.barcode) {
          setBarcode(response.data.data.laboratory_request.barcode);
        }
      }

      toast.success(`✅ درخواست لابراتوار با بارکد ${barcode || 'ثبت شد'} با موفقیت ارسال شد`);
      
      if (onSave) {
        await onSave(formData);
      }
      
      onRefresh();
      
    } catch (err) {
      console.error("خطا در ارسال به لابراتوار:", err);
      toast.error(`❌ خطا در ارسال به لابراتوار: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ ویرایش تست ============
  const handleEditTest = (test) => {
    setEditingTest(test);
    setFormData({
      test_type: test.test_type || '',
      test_name: test.test_name || '',
      test_description: test.test_description || '',
      clinical_indication: test.clinical_indication || '',
      special_notes: test.special_notes || '',
      request_date: test.request_date || new Date().toISOString().split('T')[0],
      sample_collection_date: test.sample_collection_date || '',
    });
    setShowEditModal(true);
  };

  // ============ ذخیره ویرایش ============
  const handleUpdateTest = async () => {
    if (!editingTest) return;

    setLoading(true);

    try {
      // ✅ تغییر آدرس: استفاده از مسیر laboratory-requests
      const response = await api.put(`/laboratory-requests/${editingTest.id}`, {
        test_type: formData.test_type,
        test_name: formData.test_name,
        test_description: formData.test_description,
        clinical_indication: formData.clinical_indication,
        special_notes: formData.special_notes,
        request_date: formData.request_date,
        sample_collection_date: formData.sample_collection_date,
        barcode: barcode
      });
      
      if (response.data?.data?.all_tests) {
        setTests(response.data.data.all_tests);
      }

      toast.success("✅ تست لابراتوار با موفقیت ویرایش شد");
      setShowEditModal(false);
      setEditingTest(null);
      onRefresh();

    } catch (err) {
      console.error("❌ خطا در ویرایش تست:", err);
      toast.error(`❌ خطا در ویرایش تست: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============ حذف تست ============
  const handleDeleteTest = async (testId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این تست را حذف کنید؟")) {
      return;
    }

    try {
      // ✅ تغییر آدرس: استفاده از مسیر laboratory-requests
      const response = await api.delete(`/laboratory-requests/${testId}`);
      
      if (response.data?.data) {
        setTests(response.data.data);
        if (tests.length <= 1) {
          setIsLabRequested(false);
        }
      }

      toast.success("✅ تست لابراتوار با موفقیت حذف شد");

    } catch (err) {
      console.error("❌ خطا در حذف تست:", err);
      toast.error(`❌ خطا در حذف تست: ${err.response?.data?.message || err.message}`);
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

  const testTypes = [
    { value: 'blood', label: '🩸 آزمایش خون' },
    { value: 'urine', label: '💧 آزمایش ادرار' },
    { value: 'stool', label: '💩 آزمایش مدفوع' },
    { value: 'biochemistry', label: '🧪 بیوشیمی' },
    { value: 'hormonal', label: '🧬 هورمونی' },
    { value: 'microbial', label: '🦠 میکروبی' },
    { value: 'pathology', label: '🔬 پاتولوژی' },
    { value: 'genetic', label: '🧬 ژنتیک' },
    { value: 'imaging', label: '📷 تصویربرداری' },
    { value: 'other', label: '📋 سایر' }
  ];

  const statusColors = {
    pending: '#f59e0b',
    sample_taken: '#3b82f6',
    in_progress: '#8b5cf6',
    completed: '#10b981',
    cancelled: '#6b7280',
    rejected: '#ef4444'
  };

  const statusLabels = {
    pending: 'در انتظار',
    sample_taken: 'نمونه گرفته شده',
    in_progress: 'در حال انجام',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده',
    rejected: 'رد شده'
  };

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🔬 درخواست لابراتوار
      </h3>

      {barcode && (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px dashed #60a5fa'
        }}>
          <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>📊 بارکد:</span>
          <span style={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: '16px',
            letterSpacing: '2px',
            fontFamily: 'monospace'
          }}>
            {barcode}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(barcode);
              toast.success("✅ بارکد کپی شد");
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📋 کپی
          </button>
        </div>
      )}

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
            color: isLabRequested ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isLabRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
          </span>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تعداد تست‌ها:</span>
          <span style={{
            color: '#60a5fa',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {tests.length}
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
        {barcode && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>بارکد:</span>
            <span style={{
              color: '#fcd34d',
              fontWeight: 'bold',
              marginRight: '8px',
              fontSize: '13px'
            }}>
              {barcode}
            </span>
          </div>
        )}
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '15px' }}>📋 اطلاعات درخواست</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                نوع تست *
              </label>
              <select
                name="test_type"
                value={formData.test_type}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
                required
              >
                <option value="">-- انتخاب کنید --</option>
                {testTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                نام تست
              </label>
              <input
                type="text"
                name="test_name"
                value={formData.test_name}
                onChange={handleChange}
                placeholder="مثلاً CBC, FBS, TSH..."
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تاریخ درخواست
              </label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                تاریخ نمونه‌گیری
              </label>
              <input
                type="date"
                name="sample_collection_date"
                value={formData.sample_collection_date}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>
          </div>

          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '15px' }}>📝 توضیحات</h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                شرح تست
              </label>
              <textarea
                name="test_description"
                value={formData.test_description}
                onChange={handleChange}
                rows="2"
                placeholder="شرح کامل تست..."
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                اندیکاسیون بالینی
              </label>
              <textarea
                name="clinical_indication"
                value={formData.clinical_indication}
                onChange={handleChange}
                rows="2"
                placeholder="دلیل درخواست تست..."
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                نکات ویژه
              </label>
              <textarea
                name="special_notes"
                value={formData.special_notes}
                onChange={handleChange}
                rows="2"
                placeholder="نکات ویژه برای لابراتوار..."
                style={{
                  backgroundColor: '#1a1a2e',
                  color: 'white',
                  borderColor: '#374151',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
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
            برگشت به {prevStep?.label || 'معاینه'}
          </button>

          <button
            type="submit"
            disabled={loading || isDisabled || isLabRequested}
            style={{
              backgroundColor: (isDisabled || isLabRequested) ? '#6b7280' : '#8b5cf6',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled || isLabRequested) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || isLabRequested) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📤</span>
            {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : isLabRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
          </button>

          <button
            type="button"
            onClick={onFinish}
            disabled={!isLabRequested || isCompleted || isSubmitting}
            style={{
              backgroundColor: (!isLabRequested || isCompleted) ? '#6b7280' : '#dc2626',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (!isLabRequested || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!isLabRequested || isCompleted || isSubmitting) ? 0.6 : 1,
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
              رفتن به {nextStep.label} {!isLabRequested && '(بدون ثبت)'}
            </button>
          )}
        </div>
      </form>

      {tests.length > 0 && (
        <div style={{ marginTop: '30px', borderTop: '2px solid #374151', paddingTop: '20px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '15px', fontSize: '16px' }}>
            📋 لیست تست‌های لابراتوار ({tests.length})
          </h4>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {tests.map((test) => (
              <div
                key={test.id}
                style={{
                  backgroundColor: '#1a2a3a',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderRight: `4px solid ${statusColors[test.status] || '#374151'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                      {test.test_type_label || test.test_type}
                    </span>
                    <span style={{ 
                      backgroundColor: statusColors[test.status] || '#6b7280',
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}>
                      {statusLabels[test.status] || test.status}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      📅 {test.request_date ? new Date(test.request_date).toLocaleDateString('fa-IR') : '-'}
                    </span>
                    {test.barcode && (
                      <span style={{ color: '#fcd34d', fontSize: '11px', fontFamily: 'monospace' }}>
                        🏷️ {test.barcode}
                      </span>
                    )}
                  </div>
                  {test.test_name && (
                    <div style={{ color: 'white', fontSize: '14px' }}>
                      {test.test_name}
                    </div>
                  )}
                  {test.test_description && (
                    <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px' }}>
                      {test.test_description}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleEditTest(test)}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      cursor: 'pointer'
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
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '20px' }}>✏️ ویرایش تست لابراتوار</h4>
            
            {barcode && (
              <div style={{
                backgroundColor: '#1a2a3a',
                padding: '8px 15px',
                borderRadius: '6px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>بارکد:</span>
                <span style={{ color: '#fcd34d', fontFamily: 'monospace' }}>{barcode}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  نوع تست *
                </label>
                <select
                  name="test_type"
                  value={formData.test_type}
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
                >
                  {testTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  نام تست
                </label>
                <input
                  type="text"
                  name="test_name"
                  value={formData.test_name}
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
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  شرح تست
                </label>
                <textarea
                  name="test_description"
                  value={formData.test_description}
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
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  اندیکاسیون بالینی
                </label>
                <textarea
                  name="clinical_indication"
                  value={formData.clinical_indication}
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
                  تاریخ درخواست
                </label>
                <input
                  type="date"
                  name="request_date"
                  value={formData.request_date}
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
                  تاریخ نمونه‌گیری
                </label>
                <input
                  type="date"
                  name="sample_collection_date"
                  value={formData.sample_collection_date}
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
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                  نکات ویژه
                </label>
                <textarea
                  name="special_notes"
                  value={formData.special_notes}
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
                  setEditingTest(null);
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
                onClick={handleUpdateTest}
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