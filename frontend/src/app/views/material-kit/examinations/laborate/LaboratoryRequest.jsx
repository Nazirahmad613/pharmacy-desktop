// src/app/pages/laboratory/LaboratoryRequest.jsx
import { useState, useEffect, useRef } from "react";
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
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const printRef = useRef();

  // ============ دریافت اطلاعات مریض ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/registrations/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
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
        if (err.code === 'ERR_NETWORK') {
          setConnectionError(true);
          toast.error("❌ خطای شبکه - لطفاً اتصال اینترنت خود را بررسی کنید");
        }
      }
    };
    fetchPatientInfo();
  }, [registration?.reg_id, api]);

  // ============ بارگذاری تست‌های لابراتوار ============
  const loadTests = async () => {
    if (!registration || !registration.reg_id) {
      console.log('⚠️ No registration ID available');
      return;
    }

    setLoadingTests(true);
    try {
      console.log('📥 Loading tests for registration:', registration.reg_id);
      const response = await api.get(`/laboratory-requests/registration/${registration.reg_id}`);
      console.log('📥 Load Tests Response:', response.data);
      
      if (response.data?.success) {
        const data = response.data.data;
        
        // تنظیم تست‌ها
        let testsData = [];
        if (data.tests && Array.isArray(data.tests)) {
          testsData = data.tests;
        } else if (data.all_tests && Array.isArray(data.all_tests)) {
          testsData = data.all_tests;
        }
        
        setTests(testsData);
        setIsLabRequested(testsData.length > 0 || data.has_tests || false);
        
        // اگر بارکد در تست اول وجود دارد
        if (testsData.length > 0 && testsData[0].barcode) {
          setBarcode(testsData[0].barcode);
        }
        
        console.log(`✅ Loaded ${testsData.length} tests`);
      } else {
        setTests([]);
        setIsLabRequested(false);
      }
    } catch (err) {
      console.error("❌ Error loading tests:", err);
      setTests([]);
      setIsLabRequested(false);
      
      if (err.response?.status !== 404) {
        toast.error(`❌ خطا در بارگذاری تست‌ها: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoadingTests(false);
    }
  };

  // بارگذاری اولیه
  useEffect(() => {
    loadTests();
  }, [registration?.reg_id]);

  // بارگذاری مجدد هنگام تغییر registration
  useEffect(() => {
    if (registration?.reg_id) {
      loadTests();
    }
  }, [registration?.reg_id]);

  // ============ هندلرهای فرم ============
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      test_type: '',
      test_name: '',
      test_description: '',
      clinical_indication: '',
      special_notes: '',
      request_date: new Date().toISOString().split('T')[0],
      sample_collection_date: '',
    });
  };

  // ============ ثبت درخواست لابراتوار ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.test_type) {
      toast.warning("⚠️ لطفاً نوع آزمایش را انتخاب کنید");
      return;
    }

    if (!registration || !registration.reg_id) {
      toast.error("❌ اطلاعات مراجعه معتبر نیست");
      return;
    }

    setIsSubmittingForm(true);
    setLoading(true);

    try {
      const url = `/laboratory-requests/registration/${registration.reg_id}`;
      
      const payload = {
        test_type: formData.test_type,
        test_name: formData.test_name || null,
        test_description: formData.test_description || null,
        clinical_indication: formData.clinical_indication || null,
        special_notes: formData.special_notes || null,
        request_date: formData.request_date || new Date().toISOString().split('T')[0],
        sample_collection_date: formData.sample_collection_date || null,
      };

      console.log('📤 Sending payload:', payload);

      const response = await api.post(url, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      console.log('✅ Store Response:', response.data);

      if (response.data?.success) {
        const data = response.data.data;
        
        // به‌روزرسانی تست‌ها
        let testsData = [];
        if (data.all_tests && Array.isArray(data.all_tests)) {
          testsData = data.all_tests;
        } else if (data.tests && Array.isArray(data.tests)) {
          testsData = data.tests;
        }
        
        setTests(testsData);
        setIsLabRequested(testsData.length > 0);
        
        if (data.laboratory_request?.barcode) {
          setBarcode(data.laboratory_request.barcode);
        }

        toast.success(`✅ درخواست لابراتوار با موفقیت ثبت شد`);
        resetForm();
        
        if (onSave) {
          await onSave(formData);
        }
        
        if (onRefresh) {
          onRefresh();
        }
        
        // بارگذاری مجدد برای اطمینان
        setTimeout(() => loadTests(), 500);
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'ثبت ناموفق بود'}`);
      }
      
    } catch (err) {
      console.error("❌ خطا:", err);
      
      if (err.code === 'ERR_NETWORK') {
        toast.error("❌ خطای شبکه - سرور پاسخ نمی‌دهد");
        setConnectionError(true);
      } else if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => {
          toast.error(`❌ ${key}: ${errors[key][0]}`);
        });
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا در ارسال به لابراتوار: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setIsSubmittingForm(false);
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

  const handleUpdateTest = async () => {
    if (!editingTest) return;

    setLoading(true);

    try {
      const response = await api.put(`/laboratory-requests/${editingTest.id}`, {
        test_type: formData.test_type,
        test_name: formData.test_name,
        test_description: formData.test_description,
        clinical_indication: formData.clinical_indication,
        special_notes: formData.special_notes,
        request_date: formData.request_date,
        sample_collection_date: formData.sample_collection_date,
      });
      
      if (response.data?.success) {
        const data = response.data.data;
        let testsData = [];
        if (data.all_tests && Array.isArray(data.all_tests)) {
          testsData = data.all_tests;
        } else if (data.tests && Array.isArray(data.tests)) {
          testsData = data.tests;
        }
        
        setTests(testsData);
        setIsLabRequested(testsData.length > 0);

        toast.success("✅ تست لابراتوار با موفقیت ویرایش شد");
        setShowEditModal(false);
        setEditingTest(null);
        resetForm();
        
        if (onRefresh) {
          onRefresh();
        }
        
        setTimeout(() => loadTests(), 300);
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'ویرایش ناموفق بود'}`);
      }

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
      const response = await api.delete(`/laboratory-requests/${testId}`);
      
      if (response.data?.success) {
        // اگر پاسخ شامل لیست جدید تست‌هاست
        if (response.data.data && Array.isArray(response.data.data)) {
          setTests(response.data.data);
          setIsLabRequested(response.data.data.length > 0);
        } else {
          await loadTests();
        }

        toast.success("✅ تست لابراتوار با موفقیت حذف شد");
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'حذف ناموفق بود'}`);
      }

    } catch (err) {
      console.error("❌ خطا در حذف تست:", err);
      toast.error(`❌ خطا در حذف تست: ${err.response?.data?.message || err.message}`);
    }
  };

  // ============ پرینت ============
  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
    if (!printContent) return;
    
    const originalContents = document.body.innerHTML;
    const printStyles = `
      <style>
        @media print {
          body * { display: none; }
          #print-content, #print-content * { display: block; }
          #print-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 20px;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
          }
          .print-header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .print-patient-info { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .print-test-item {
            border-bottom: 1px solid #eee;
            padding: 10px 0;
          }
          .print-test-item:last-child {
            border-bottom: none;
          }
          .print-label { font-weight: bold; color: #333; }
          .print-status { 
            padding: 2px 8px; 
            border-radius: 4px; 
            font-size: 12px;
          }
          .print-barcode { 
            font-family: monospace; 
            font-size: 18px;
            letter-spacing: 2px;
          }
          .no-print { display: none !important; }
        }
      </style>
    `;
    
    document.body.innerHTML = printStyles + printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  // ============ وضعیت‌ها ============
  const patient = patientInfo?.patient || registration?.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting || isSubmittingForm;

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
    rejected: '#ef4444',
    sent_to_lab: '#8b5cf6'
  };

  const statusLabels = {
    pending: 'در انتظار',
    sample_taken: 'نمونه گرفته شده',
    in_progress: 'در حال انجام',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده',
    rejected: 'رد شده',
    sent_to_lab: 'ارسال به لابراتوار'
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

  if (connectionError) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🌐</div>
        <div style={{ fontSize: '18px' }}>خطای اتصال به سرور</div>
        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '10px' }}>
          لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔄 تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* بخش پرینت */}
      <div id="print-content" style={{ display: 'none' }}>
        <div className="print-header">
          <h2>🔬 درخواست لابراتوار</h2>
          <p>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
        </div>
        
        <div className="print-patient-info">
          <div><span className="print-label">نام بیمار:</span> {patient.first_name || ''} {patient.last_name || ''}</div>
          <div><span className="print-label">کد ملی:</span> {patient.national_id || '-'}</div>
          <div><span className="print-label">سن:</span> {patient.age ? `${patient.age} سال` : '-'}</div>
          <div><span className="print-label">جنسیت:</span> {getGenderText(patient.gender)}</div>
          <div><span className="print-label">شماره تماس:</span> {patient.mobile || '-'}</div>
          <div><span className="print-label">شماره مراجعه:</span> {registration.visit_number || '-'}</div>
          {barcode && <div><span className="print-label">بارکد:</span> <span className="print-barcode">{barcode}</span></div>}
        </div>
        
        <h3>📋 لیست تست‌های لابراتوار</h3>
        {tests.map((test) => (
          <div key={test.id} className="print-test-item">
            <div>
              <strong>{test.test_type_label || test.test_type}</strong>
              <span className="print-status" style={{ backgroundColor: statusColors[test.status] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '4px', marginRight: '10px' }}>
                {statusLabels[test.status] || test.status}
              </span>
            </div>
            {test.test_name && <div>نام تست: {test.test_name}</div>}
            {test.test_description && <div>شرح: {test.test_description}</div>}
            {test.clinical_indication && <div>اندیکاسیون: {test.clinical_indication}</div>}
            {test.special_notes && <div>نکات ویژه: {test.special_notes}</div>}
            <div style={{ fontSize: '12px', color: '#666' }}>
              تاریخ درخواست: {test.request_date ? new Date(test.request_date).toLocaleDateString('fa-IR') : '-'}
              {test.barcode && ` | بارکد: ${test.barcode}`}
            </div>
          </div>
        ))}
      </div>

      {/* بخش اصلی */}
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🔬 درخواست لابراتوار
      </h3>

      {/* اطلاعات مریض - همیشه نمایش داده می‌شود */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px 15px'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>نام کامل</span>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
            {patient.first_name || ''} {patient.last_name || ''}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>کد ملی</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{patient.national_id || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>سن</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{patient.age ? `${patient.age} سال` : '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>جنسیت</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{getGenderText(patient.gender)}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>شماره مراجعه</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>{registration.visit_number || '-'}</div>
        </div>
        {barcode && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>بارکد</span>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', fontFamily: 'monospace' }}>{barcode}</div>
          </div>
        )}
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>وضعیت درخواست</span>
          <div style={{ color: isLabRequested ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>
            {isLabRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>تعداد تست‌ها</span>
          <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{tests.length}</div>
        </div>
      </div>

      {/* فرم ثبت درخواست */}
      <form onSubmit={handleSubmit} className="no-print">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '14px' }}>📋 اطلاعات درخواست</h4>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
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

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>
          </div>

          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '14px' }}>📝 توضیحات</h4>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || isLabRequested ? 0.5 : 1
                }}
                disabled={isDisabled || isLabRequested}
              />
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          justifyContent: 'center', 
          marginTop: '20px',
          flexWrap: 'wrap',
          borderTop: '1px solid #374151',
          paddingTop: '15px'
        }}>
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>↩️</span>
            برگشت
          </button>

          <button
            type="submit"
            disabled={loading || isDisabled || isLabRequested}
            style={{
              backgroundColor: (isDisabled || isLabRequested) ? '#6b7280' : '#8b5cf6',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled || isLabRequested) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || isLabRequested) ? 0.6 : 1,
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📤</span>
            {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : isLabRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
          </button>

          {tests.length > 0 && (
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🖨️</span>
              پرینت
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            disabled={!isLabRequested || isCompleted || isSubmitting}
            style={{
              backgroundColor: (!isLabRequested || isCompleted) ? '#6b7280' : '#dc2626',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: (!isLabRequested || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!isLabRequested || isCompleted || isSubmitting) ? 0.6 : 1,
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
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
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>➡️</span>
              رفتن به {nextStep.label}
            </button>
          )}
        </div>
      </form>

      {/* لیست تست‌های ثبت شده - همیشه نمایش داده می‌شود */}
      <div style={{ marginTop: '25px', borderTop: '2px solid #374151', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '15px', margin: 0 }}>
            📋 لیست تست‌های لابراتوار ({tests.length})
            {loadingTests && <span style={{ marginLeft: '10px', fontSize: '13px', color: '#9ca3af' }}>⏳ در حال بارگذاری...</span>}
          </h4>
          {tests.length > 0 && (
            <button
              onClick={handlePrint}
              className="no-print"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🖨️ پرینت
            </button>
          )}
        </div>
        
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {tests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '25px', color: '#9ca3af' }}>
              <div style={{ fontSize: '35px', marginBottom: '8px' }}>📋</div>
              <div>هیچ تست لابراتواری ثبت نشده است</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>برای ثبت درخواست، فرم بالا را پر کنید</div>
            </div>
          ) : (
            tests.map((test) => (
              <div
                key={test.id}
                style={{
                  backgroundColor: '#1a2a3a',
                  padding: '12px 15px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  borderRight: `4px solid ${statusColors[test.status] || '#374151'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '13px' }}>
                      {test.test_type_label || test.test_type}
                    </span>
                    <span style={{ 
                      backgroundColor: statusColors[test.status] || '#6b7280',
                      color: 'white',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '10px'
                    }}>
                      {statusLabels[test.status] || test.status}
                    </span>
                    {test.barcode && (
                      <span style={{ color: '#fcd34d', fontSize: '10px', fontFamily: 'monospace' }}>
                        🏷️ {test.barcode}
                      </span>
                    )}
                    {test.has_fee && (
                      <span style={{ 
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        fontSize: '9px'
                      }}>
                        💰 فیس
                      </span>
                    )}
                  </div>
                  
                  {test.test_name && (
                    <div style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                      {test.test_name}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {test.request_date && (
                      <span>📅 {new Date(test.request_date).toLocaleDateString('fa-IR')}</span>
                    )}
                    {test.sample_collection_date && (
                      <span>🧪 نمونه: {new Date(test.sample_collection_date).toLocaleDateString('fa-IR')}</span>
                    )}
                  </div>
                  
                  {test.test_description && (
                    <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                      {test.test_description}
                    </div>
                  )}
                  
                  {test.clinical_indication && (
                    <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '1px' }}>
                      <span style={{ color: '#6b7280' }}>اندیکاسیون:</span> {test.clinical_indication}
                    </div>
                  )}
                  
                  {test.special_notes && (
                    <div style={{ color: '#fbbf24', fontSize: '10px', marginTop: '1px' }}>
                      <span style={{ color: '#6b7280' }}>نکات ویژه:</span> {test.special_notes}
                    </div>
                  )}
                </div>
                
                <div className="no-print" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleEditTest(test)}
                    disabled={test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab'}
                    style={{
                      backgroundColor: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? '#6b7280' : '#3b82f6',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '10px',
                      cursor: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? 'not-allowed' : 'pointer',
                      opacity: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? 0.5 : 1
                    }}
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    disabled={test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee}
                    style={{
                      backgroundColor: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? '#6b7280' : '#dc2626',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '10px',
                      cursor: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? 'not-allowed' : 'pointer',
                      opacity: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? 0.5 : 1
                    }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* مودال ویرایش */}
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
          padding: '15px'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '25px',
            borderRadius: '10px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>✏️ ویرایش تست لابراتوار</h4>
            
            {barcode && (
              <div style={{
                backgroundColor: '#1a2a3a',
                padding: '6px 12px',
                borderRadius: '4px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>بارکد:</span>
                <span style={{ color: '#fcd34d', fontFamily: 'monospace' }}>{barcode}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
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
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
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
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTest(null);
                  resetForm();
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
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
                  padding: '6px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
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