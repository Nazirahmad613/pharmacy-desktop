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
  isTreatmentComplete,
  // ============ Props جدید ============
  savedTests,        // تست جاری
  allTests,          // لیست تمام تست‌ها
  isLabRequested,    // وضعیت درخواست
  setIsLabRequested, // تابع به‌روزرسانی وضعیت
  setAllTests        // تابع به‌روزرسانی لیست تست‌ها
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

  // ============ بارگذاری تست‌ها از props ============
  useEffect(() => {
    console.log('📝 LaboratoryRequest - allTests changed:', allTests);
    if (allTests && Array.isArray(allTests)) {
      setTests(allTests);
      if (setIsLabRequested) {
        setIsLabRequested(allTests.length > 0);
      }
    }
  }, [allTests, setIsLabRequested]);

  // ============ بارگذاری اولیه از سرور با روت جدید ============
  useEffect(() => {
    if (registration?.reg_id) {
      loadTestsFromServer();
    }
  }, [registration?.reg_id]);

  // ============ بارگذاری تست‌ها از سرور با روت جدید ============
  const loadTestsFromServer = async () => {
    if (!registration || !registration.reg_id) {
      console.log('⚠️ No registration ID available');
      return;
    }

    setLoadingTests(true);
    try {
      // ✅ استفاده از روت جدید با جزئیات کامل
      const url = `/laboratory-requests/registration/${registration.reg_id}/full`;
      console.log('📥 Loading full tests from:', url);
      
      const response = await api.get(url);
      console.log('📥 Full Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.success) {
        const data = response.data.data;
        
        let testsData = [];
        
        if (data.tests && Array.isArray(data.tests)) {
          testsData = data.tests;
        } else if (data.all_tests && Array.isArray(data.all_tests)) {
          testsData = data.all_tests;
        }
        
        setTests(testsData);
        if (setIsLabRequested) {
          setIsLabRequested(testsData.length > 0);
        }
        if (setAllTests) {
          setAllTests(testsData);
        }
        
        if (testsData.length > 0 && testsData[0].barcode) {
          setBarcode(testsData[0].barcode);
        }
        
        console.log(`✅ Loaded ${testsData.length} tests from server`);
      } else {
        setTests([]);
        if (setIsLabRequested) {
          setIsLabRequested(false);
        }
        if (setAllTests) {
          setAllTests([]);
        }
      }
    } catch (err) {
      console.error("❌ Error loading tests:", err);
      setTests([]);
      if (setIsLabRequested) {
        setIsLabRequested(false);
      }
      if (setAllTests) {
        setAllTests([]);
      }
      
      if (err.response?.status !== 404) {
        toast.error(`❌ خطا در بارگذاری تست‌ها: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoadingTests(false);
    }
  };

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
        
        let testsData = [];
        
        if (data.all_tests && Array.isArray(data.all_tests)) {
          testsData = data.all_tests;
        } else if (data.tests && Array.isArray(data.tests)) {
          testsData = data.tests;
        }
        
        setTests(testsData);
        if (setIsLabRequested) {
          setIsLabRequested(testsData.length > 0);
        }
        if (setAllTests) {
          setAllTests(testsData);
        }
        
        if (data.laboratory_request?.barcode) {
          setBarcode(data.laboratory_request.barcode);
        }

        toast.success(`✅ درخواست لابراتوار با موفقیت ثبت شد (${testsData.length} تست)`);
        resetForm();
        
        if (onRefresh) {
          onRefresh();
        }
        
        setTimeout(() => {
          loadTestsFromServer();
        }, 500);
        
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
        if (setIsLabRequested) {
          setIsLabRequested(testsData.length > 0);
        }
        if (setAllTests) {
          setAllTests(testsData);
        }

        toast.success("✅ تست لابراتوار با موفقیت ویرایش شد");
        setShowEditModal(false);
        setEditingTest(null);
        resetForm();
        
        if (onRefresh) {
          onRefresh();
        }
        
        setTimeout(() => loadTestsFromServer(), 300);
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
        let testsData = [];
        if (response.data.data && Array.isArray(response.data.data)) {
          testsData = response.data.data;
        } else {
          await loadTestsFromServer();
          return;
        }
        
        setTests(testsData);
        if (setIsLabRequested) {
          setIsLabRequested(testsData.length > 0);
        }
        if (setAllTests) {
          setAllTests(testsData);
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

  // ============ پرینت همه تست‌ها ============
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

  // ============ پرینت یک تست خاص ============
  const handlePrintTest = (test) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد. لطفاً pop-up را فعال کنید.");
      return;
    }
    
    const patient = patientInfo?.patient || registration?.patient || {};
    
    const printContent = `
      <html dir="rtl">
        <head>
          <title>درخواست لابراتوار</title>
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
            .barcode { font-family: monospace; font-size: 20px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🔬 درخواست لابراتوار</h2>
            <p>تاریخ: ${new Date(test.request_date).toLocaleDateString('fa-IR')}</p>
          </div>
          
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ''} ${patient.last_name || ''}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration?.visit_number || '-'}</span></div>
            <div class="info-item"><span class="label">بارکد:</span> <span class="barcode">${test.barcode || '-'}</span></div>
          </div>
          
          <h3>📋 اطلاعات تست</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>نوع تست</td><td>${test.test_type_label || test.test_type}</td></tr>
            <tr><td>نام تست</td><td>${test.test_name || '-'}</td></tr>
            <tr><td>شرح تست</td><td>${test.test_description || '-'}</td></tr>
            <tr><td>اندیکاسیون بالینی</td><td>${test.clinical_indication || '-'}</td></tr>
            <tr><td>نکات ویژه</td><td>${test.special_notes || '-'}</td></tr>
            <tr><td>وضعیت</td><td>${test.status_label || test.status}</td></tr>
            <tr><td>تاریخ نمونه‌گیری</td><td>${test.sample_collection_date ? new Date(test.sample_collection_date).toLocaleDateString('fa-IR') : '-'}</td></tr>
          </table>
          
          <div class="signature">
            <p>دکتر: ${test.doctor?.name || '-'}</p>
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

  // ============ وضعیت‌ها ============
  const patient = patientInfo?.patient || registration?.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting || isSubmittingForm;
  const labRequested = isLabRequested !== undefined ? isLabRequested : tests.length > 0;

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
      {/* بخش پرینت مخفی */}
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
            color: labRequested ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {labRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
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
        {loadingTests && (
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            ⏳ در حال بارگذاری...
          </span>
        )}
      </div>

      {/* اطلاعات مریض */}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
                  opacity: isDisabled || labRequested ? 0.5 : 1
                }}
                disabled={isDisabled || labRequested}
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
            disabled={loading || isDisabled || labRequested}
            style={{
              backgroundColor: (isDisabled || labRequested) ? '#6b7280' : '#8b5cf6',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: (loading || isDisabled || labRequested) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || labRequested) ? 0.6 : 1,
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📤</span>
            {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : labRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
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
              پرینت همه
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            disabled={!labRequested || isCompleted || isSubmitting}
            style={{
              backgroundColor: (!labRequested || isCompleted) ? '#6b7280' : '#dc2626',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: (!labRequested || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!labRequested || isCompleted || isSubmitting) ? 0.6 : 1,
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

      {/* ============ لیست تست‌های ثبت شده با جدول ============ */}
      <div style={{ marginTop: '30px', borderTop: '2px solid #374151', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '15px', margin: 0 }}>
            📋 لیست تست‌های لابراتوار ({tests.length})
            {loadingTests && <span style={{ marginLeft: '10px', fontSize: '13px', color: '#9ca3af' }}>⏳ در حال بارگذاری...</span>}
          </h4>
          {tests.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={loadTestsFromServer}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🔄 بارگذاری مجدد
              </button>
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
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🖨️ پرینت
              </button>
            </div>
          )}
        </div>

        {tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '25px', color: '#9ca3af' }}>
            <div style={{ fontSize: '35px', marginBottom: '8px' }}>📋</div>
            <div>هیچ تست لابراتواری ثبت نشده است</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>برای ثبت درخواست، فرم بالا را پر کنید</div>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            borderRadius: '8px',
            border: '1px solid #374151'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '1000px',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#0f1a2a',
                  borderBottom: '2px solid #374151'
                }}>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>#</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>🏷️ بارکد</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>🔬 نوع تست</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>📝 نام تست</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>📅 تاریخ</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>📊 وضعیت</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a', whiteSpace: 'nowrap' }}>💰 فیس</th>
                  <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test, index) => (
                  <tr key={test.id} style={{ borderBottom: '1px solid #2a3a4a' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2a3a'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#9ca3af', fontWeight: 'bold', fontSize: '14px', borderLeft: '1px solid #2a3a4a' }}>{index + 1}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#fcd34d', fontSize: '12px', fontFamily: 'monospace', borderLeft: '1px solid #2a3a4a' }}>{test.barcode || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#60a5fa', fontSize: '13px', fontWeight: 'bold', borderLeft: '1px solid #2a3a4a' }}>{test.test_type_label || test.test_type}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'white', fontSize: '13px', borderLeft: '1px solid #2a3a4a', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.test_name || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>{test.request_date ? new Date(test.request_date).toLocaleDateString('fa-IR') : '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '1px solid #2a3a4a' }}>
                      <span style={{ backgroundColor: statusColors[test.status] || '#6b7280', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', display: 'inline-block' }}>
                        {statusLabels[test.status] || test.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '1px solid #2a3a4a' }}>
                      {test.has_fee ? (
                        <span style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>✅ ثبت شده</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>❌ ثبت نشده</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEditTest(test)} disabled={test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab'} style={{ backgroundColor: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? '#6b7280' : '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', cursor: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? 'not-allowed' : 'pointer', opacity: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? 0.5 : 1 }}>✏️</button>
                        <button onClick={() => handleDeleteTest(test.id)} disabled={test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee} style={{ backgroundColor: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? '#6b7280' : '#dc2626', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', cursor: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? 'not-allowed' : 'pointer', opacity: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? 0.5 : 1 }}>🗑️</button>
                        <button onClick={() => handlePrintTest(test)} style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>🖨️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>نوع تست *</label>
                <select name="test_type" value={formData.test_type} onChange={handleChange} style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }}>
                  {testTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>نام تست</label>
                <input type="text" name="test_name" value={formData.test_name} onChange={handleChange} style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>شرح تست</label>
                <textarea name="test_description" value={formData.test_description} onChange={handleChange} rows="2" style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>اندیکاسیون بالینی</label>
                <textarea name="clinical_indication" value={formData.clinical_indication} onChange={handleChange} rows="2" style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>تاریخ درخواست</label>
                <input type="date" name="request_date" value={formData.request_date} onChange={handleChange} style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>تاریخ نمونه‌گیری</label>
                <input type="date" name="sample_collection_date" value={formData.sample_collection_date} onChange={handleChange} style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>نکات ویژه</label>
                <textarea name="special_notes" value={formData.special_notes} onChange={handleChange} rows="2" style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #374151' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px', justifyContent: 'center' }}>
              <button onClick={() => { setShowEditModal(false); setEditingTest(null); resetForm(); }} style={{ backgroundColor: '#6b7280', color: 'white', padding: '6px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px' }}>لغو</button>
              <button onClick={handleUpdateTest} disabled={loading} style={{ backgroundColor: loading ? '#6b7280' : '#3b82f6', color: 'white', padding: '6px 16px', borderRadius: '4px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px' }}>{loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}