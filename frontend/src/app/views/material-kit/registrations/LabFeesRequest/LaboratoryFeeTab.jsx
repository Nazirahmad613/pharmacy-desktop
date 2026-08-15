// src/app/pages/laboratory/LaboratoryFeeTab.jsx

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function LaboratoryFeeTab(props) {
  console.log("🔥 تمام Props دریافتی LaboratoryFeeTab:", props);

  const { api, regId } = props;
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [barcode, setBarcode] = useState(null);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [apiResponseRaw, setApiResponseRaw] = useState(null);

  // فرم اخذ فیس
  const [feeFormData, setFeeFormData] = useState({
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: ""
  });

  // ============ بررسی reg_id ============
  useEffect(() => {
    console.log("🔍 ====== بررسی reg_id ======");
    console.log("📌 reg_id دریافتی:", regId);
    console.log("📌 typeof regId:", typeof regId);

    if (!regId) {
      console.error("❌ reg_id موجود نیست!");
      toast.error("شناسه مراجعه (reg_id) پیدا نشد");
      return;
    }

    console.log("🚀 شروع بارگذاری با reg_id:", regId);
    fetchAllData(regId);

  }, [regId]);

  // ============ دریافت تمام داده‌ها ============
  const fetchAllData = async (id) => {
    if (!id) {
      console.error("❌ fetchAllData: reg_id موجود نیست");
      return;
    }

    console.log("📡 fetchAllData با reg_id:", id);
    setLoading(true);
    
    try {
      await fetchPatientInfo(id);
      await fetchLaboratoryRequests(id);
      await fetchFeeRecords(id);
    } catch (err) {
      console.error("❌ خطا در دریافت داده‌ها:", err);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت اطلاعات مریض ============
  const fetchPatientInfo = async (id) => {
    try {
      console.log("📡 دریافت اطلاعات مریض با ID:", id);
      const response = await api.get(`/registrations/${id}`);
      console.log("✅ پاسخ اطلاعات مریض:", response.data);
      
      const data = response.data?.data || response.data;
      setPatientInfo(data);
      
      if (data.barcode) {
        setBarcode(data.barcode);
      } else if (data.patient?.barcode) {
        setBarcode(data.patient.barcode);
      }
      
      return data;
    } catch (err) {
      console.error("❌ خطا در دریافت اطلاعات مریض:", err);
      throw err;
    }
  };

  // ============ دریافت درخواست‌های لابراتوار ============
  const fetchLaboratoryRequests = async (id) => {
    try {
      console.log("🔍 ====== دریافت درخواست‌های لابراتوار ======");
      console.log("🆔 reg_id:", id);

      if (!id) {
        console.error("❌ reg_id موجود نیست");
        setAllRequests([]);
        setUnpaidRequests([]);
        return;
      }

      // ✅ استفاده از آدرس جدید برای دریافت درخواست‌های بدون فیس
      const url = `/laboratory-fees/unpaid/${id}`;
      console.log("📡 GET:", url);

      const response = await api.get(url);
      
      setApiResponseRaw(response.data);
      
      console.log("📋 ====== پاسخ کامل API ======");
      console.log("📋 Status:", response.status);
      console.log("📋 Data (JSON):", JSON.stringify(response.data, null, 2));

      setDebugInfo({
        url,
        response: response.data,
        timestamp: new Date().toISOString(),
        status: response.status
      });

      // استخراج آرایه درخواست‌ها از پاسخ
      let tests = [];
      let extractionMethod = "none";

      if (response.data?.success && response.data?.data?.unpaid_requests) {
        tests = response.data.data.unpaid_requests;
        extractionMethod = "response.data.data.unpaid_requests (success)";
      } else if (response.data?.success && response.data?.data) {
        const innerData = response.data.data;
        if (Array.isArray(innerData)) {
          tests = innerData;
          extractionMethod = "response.data.data is array (success)";
        }
      } else if (Array.isArray(response.data)) {
        tests = response.data;
        extractionMethod = "response.data is array";
      } else if (response.data && Array.isArray(response.data.data)) {
        tests = response.data.data;
        extractionMethod = "response.data.data is array";
      } else if (response.data && Array.isArray(response.data.laboratory_requests)) {
        tests = response.data.laboratory_requests;
        extractionMethod = "response.data.laboratory_requests is array";
      }

      console.log(`📊 روش استخراج: ${extractionMethod}`);
      console.log(`🧪 تعداد درخواست‌های استخراج شده: ${tests.length}`);

      if (tests.length === 0) {
        console.warn(`⚠️ هیچ درخواست لابراتواری برای reg_id=${id} دریافت نشد`);
        console.warn("⚠️ ساختار پاسخ:", JSON.stringify(response.data, null, 2));
        
        toast.info("هیچ درخواست لابراتواری برای این مراجعه ثبت نشده است");
        setAllRequests([]);
        setUnpaidRequests([]);
        return;
      }

      // نمایش اولین آیتم برای بررسی
      console.log("🔍 ====== بررسی اولین آیتم ======");
      const firstItem = tests[0];
      console.log("📌 اولین آیتم:", firstItem);
      console.log("📌 reg_id در آیتم:", firstItem.reg_id);
      console.log("📌 fee_id:", firstItem.fee_id);

      setAllRequests(tests);
      setUnpaidRequests(tests);

      if (tests.length > 0) {
        console.log(`✅ ${tests.length} درخواست آماده اخذ فیس است`);
        toast.success(`${tests.length} درخواست برای اخذ فیس آماده است`);
      }

    } catch (err) {
      console.error("❌ ====== خطا در دریافت درخواست‌های لابراتوار ======");
      console.error("❌ Error:", err);
      
      if (err.response) {
        console.error("❌ Status:", err.response.status);
        console.error("❌ Data:", err.response.data);
        setApiResponseRaw(err.response.data);
        toast.error(`❌ خطا ${err.response.status}: ${err.response.data?.message || "خطا در دریافت درخواست‌ها"}`);
      } else {
        toast.error(`❌ خطا: ${err.message}`);
      }

      setAllRequests([]);
      setUnpaidRequests([]);
    }
  };

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeeRecords = async (id) => {
    try {
      console.log("💳 دریافت فیس‌ها با reg_id:", id);
      
      // ✅ دریافت فیس‌های ثبت شده با reg_id
      const response = await api.get(`/laboratory-fees?reg_id=${id}`);
      console.log("💳 پاسخ فیس‌ها:", response.data);
      
      let fees = [];
      
      if (response.data?.success && response.data?.data) {
        if (Array.isArray(response.data.data)) {
          fees = response.data.data;
        } else if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          fees = response.data.data.data;
        }
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        fees = response.data.data;
      } else if (Array.isArray(response.data)) {
        fees = response.data;
      }
      
      console.log(`💳 تعداد فیس‌ها: ${fees.length} عدد`);
      setFeeRecords(fees);
      
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
      setFeeRecords([]);
    }
  };

  // ============ باز کردن فرم اخذ فیس ============
  const handleOpenFeeForm = (request) => {
    console.log("💰 باز کردن فرم اخذ فیس برای:", request);
    setSelectedRequests([request]);
    setEditingFee(null);
    
    const defaultAmount = request.amount || request.total_amount || 0;
    
    setFeeFormData({
      amount: defaultAmount.toString(),
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: `آزمایش: ${request.test_type_label || request.test_type || ''} - ${request.test_name || ''}`,
      note: `درخواست بارکد: ${request.barcode || ''}`
    });
    setShowFeeForm(true);
  };

  // ============ ثبت فیس ============
  const handleSubmitFee = async (e) => {
    e.preventDefault();

    if (!feeFormData.amount || parseFloat(feeFormData.amount) <= 0) {
      toast.warning("⚠️ لطفاً مبلغ کل را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(feeFormData.amount),
        paid_amount: parseFloat(feeFormData.paid_amount) || 0,
        discount: parseFloat(feeFormData.discount) || 0,
        payment_method: feeFormData.payment_method,
        description: feeFormData.description,
        note: feeFormData.note,
        laboratory_request_ids: selectedRequests.map(r => r.id)
      };

      console.log("📤 ارسال payload:", payload);

      let response;
      if (editingFee) {
        response = await api.put(`/laboratory-fees/${editingFee.id}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ویرایش شد");
      } else {
        // ✅ آدرس صحیح با reg_id در URL
        response = await api.post(`/laboratory-fees/registration/${regId}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ثبت شد");
      }

      console.log("✅ پاسخ ثبت فیس:", response.data);

      // به‌روزرسانی لیست درخواست‌ها و فیس‌ها
      await fetchAllData(regId);
      handleCloseForm();

    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      
      if (err.response?.status === 405) {
        toast.error("❌ آدرس API اشتباه است. لطفاً Route را بررسی کنید");
      } else if (err.response?.data?.errors) {
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          toast.error(`❌ ${field}: ${messages[0]}`);
        });
      } else {
        toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در ثبت فیس"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ بستن فرم ============
  const handleCloseForm = () => {
    setShowFeeForm(false);
    setSelectedRequests([]);
    setEditingFee(null);
    setFeeFormData({
      amount: "",
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: "",
      note: ""
    });
  };

  // ============ Helper Functions ============
  const getMethodLabel = (method) => {
    const methods = {
      cash: 'نقدی',
      card: 'کارت بانکی',
      online: 'آنلاین',
      insurance: 'بیمه'
    };
    return methods[method] || method || '-';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fa-IR');
  };

  const calculateRemaining = (amount, paid, discount) => {
    const discountAmount = amount * (discount / 100);
    return amount - paid - discountAmount;
  };

  const getPaymentStatus = (amount, paid, discount) => {
    const remaining = calculateRemaining(amount, paid, discount);
    if (remaining <= 0) return { label: 'پرداخت کامل', color: '#22c55e' };
    if (paid > 0) return { label: 'پرداخت ناقص', color: '#f97316' };
    return { label: 'در انتظار پرداخت', color: '#f59e0b' };
  };

  // ✅ تابع کمکی برای تبدیل به عدد
  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const patient = patientInfo?.patient || {};
  const isPatientInfoLoaded = patientInfo !== null;

  // دکمه دیباگ
  const handleShowRawResponse = () => {
    if (apiResponseRaw) {
      console.log("📋 پاسخ خام API:", JSON.stringify(apiResponseRaw, null, 2));
      alert("پاسخ خام در کنسول (Console) نمایش داده شد");
    } else {
      alert("هنوز پاسخی دریافت نشده است");
    }
  };

  return (
    <div>
      {/* نمایش reg_id فعلی برای دیباگ */}
      <div style={{
        backgroundColor: regId ? '#064e3b' : '#7f1d1d',
        padding: '8px 15px',
        borderRadius: '6px',
        marginBottom: '15px',
        fontSize: '13px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          🆔 reg_id: {regId || '❌ پیدا نشد'}
        </span>
        <span style={{ fontSize: '11px', opacity: 0.7 }}>
          تعداد درخواست‌ها: {allRequests.length}
        </span>
      </div>

      {/* ============ هدر با بارکد ============ */}
      {isPatientInfoLoaded && (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          borderBottom: '3px solid #60a5fa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ color: '#60a5fa', margin: 0 }}>
                🏥 اخذ فیس لابراتوار
              </h3>
              <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
                {patient.first_name || ''} {patient.last_name || ''}
              </div>
            </div>
            
            {barcode && (
              <div style={{
                backgroundColor: '#0f1a2a',
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px dashed #fcd34d',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>📊 بارکد:</span>
                <span style={{ 
                  color: '#fcd34d', 
                  fontWeight: 'bold',
                  fontSize: '18px',
                  letterSpacing: '3px',
                  fontFamily: 'monospace'
                }}>
                  {barcode}
                </span>
              </div>
            )}
          </div>

          {/* اطلاعات مریض */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            marginTop: '15px',
            paddingTop: '15px',
            borderTop: '1px solid #2a3a4a'
          }}>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>شماره مراجعه</span>
              <div style={{ color: 'white', fontWeight: 'bold' }}>{regId || '-'}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>نام کامل</span>
              <div style={{ color: 'white' }}>{patient.first_name || ''} {patient.last_name || ''}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>سن / جنسیت</span>
              <div style={{ color: 'white' }}>{patient.age || '-'} سال / {patient.gender === 'Male' || patient.gender === 'male' ? 'مرد' : patient.gender === 'Female' || patient.gender === 'female' ? 'زن' : '-'}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>تماس</span>
              <div style={{ color: 'white' }}>{patient.mobile || '-'}</div>
            </div>
          </div>

          {/* دکمه‌های دیباگ */}
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleShowRawResponse}
              style={{
                backgroundColor: '#374151',
                color: '#60a5fa',
                padding: '5px 15px',
                borderRadius: '4px',
                border: '1px solid #60a5fa',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🐛 نمایش پاسخ خام
            </button>
            <button
              onClick={() => {
                console.log("🔄 بارگذاری مجدد...");
                if (regId) fetchAllData(regId);
                else toast.error("reg_id پیدا نشد");
              }}
              style={{
                backgroundColor: '#374151',
                color: '#60a5fa',
                padding: '5px 15px',
                borderRadius: '4px',
                border: '1px solid #60a5fa',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔄 بارگذاری مجدد
            </button>
          </div>

          {/* اطلاعات دیباگ */}
          {debugInfo && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#0f1a2a',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#9ca3af',
              maxHeight: '150px',
              overflow: 'auto',
              fontFamily: 'monospace'
            }}>
              <div>📡 URL: {debugInfo.url}</div>
              <div>📊 وضعیت: {debugInfo.status || 'N/A'}</div>
              <div>📊 تعداد تست‌ها: {allRequests.length}</div>
              <div>🟡 بدون فیس: {unpaidRequests.length}</div>
              <div>🟢 دارای فیس: {allRequests.length - unpaidRequests.length}</div>
              <div>🕐 زمان: {debugInfo.timestamp}</div>
            </div>
          )}
        </div>
      )}

      {/* ============ نمایش تعداد درخواست‌ها ============ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ color: '#60a5fa', margin: 0 }}>
          📋 درخواست‌های لابراتوار
        </h4>
        <span style={{ fontSize: '14px', color: '#9ca3af' }}>
          {unpaidRequests.length} درخواست بدون فیس
        </span>
      </div>

      {/* ============ لیست درخواست‌های بدون فیس ============ */}
      {loading ? (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
          <div>در حال بارگذاری...</div>
        </div>
      ) : !regId ? (
        <div style={{
          backgroundColor: '#7f1d1d',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>❌</div>
          <div>شناسه مراجعه (reg_id) پیدا نشد</div>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
            لطفاً از بخش مراجعه، یک مراجعه را انتخاب کنید
          </div>
        </div>
      ) : unpaidRequests.length === 0 ? (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
          <div>همه درخواست‌های لابراتوار دارای فیس هستند</div>
          {allRequests.length === 0 && (
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#f59e0b' }}>
              ⚠️ هیچ درخواست لابراتواری برای این مراجعه ثبت نشده است
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {unpaidRequests.map((request) => (
            <div
              key={request.id}
              style={{
                backgroundColor: '#1a2a3a',
                padding: '15px 20px',
                borderRadius: '8px',
                borderRight: '4px solid #f59e0b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                    {request.test_type_label || request.test_type || request.test_category || 'آزمایش'}
                  </span>
                  {request.test_name && (
                    <span style={{ color: 'white' }}>{request.test_name}</span>
                  )}
                  {request.barcode && (
                    <span style={{ 
                      color: '#fcd34d', 
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      backgroundColor: '#0f1a2a',
                      padding: '2px 10px',
                      borderRadius: '4px'
                    }}>
                      🏷️ {request.barcode}
                    </span>
                  )}
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    بدون فیس
                  </span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '3px' }}>
                  📅 {formatDate(request.request_date || request.created_at)}
                </div>
                <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>
                  ID: {request.id} | fee_id: {request.fee_id !== undefined ? request.fee_id : 'ندارد'}
                  {request.reg_id && ` | reg_id: ${request.reg_id}`}
                </div>
                {request.amount && (
                  <div style={{ color: '#fcd34d', fontSize: '12px', marginTop: '2px' }}>
                    💰 مبلغ: {toNumber(request.amount).toFixed(2)} افغانی
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleOpenFeeForm(request)}
                style={{
                  backgroundColor: '#22c55e',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                💰 اخذ فیس
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ============ فیس‌های ثبت شده ============ */}
      {feeRecords.length > 0 && (
        <>
          <h4 style={{ color: '#10b981', marginTop: '20px', marginBottom: '10px' }}>
            ✅ فیس‌های ثبت شده
            <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '10px' }}>
              ({feeRecords.length} فیس)
            </span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feeRecords.map((fee) => {
              // ✅ تبدیل مقادیر به عدد با استفاده از toNumber
              const amount = toNumber(fee.amount);
              const paidAmount = toNumber(fee.paid_amount);
              const discount = toNumber(fee.discount);
              
              const status = getPaymentStatus(amount, paidAmount, discount);
              return (
                <div
                  key={fee.id}
                  style={{
                    backgroundColor: '#1a2a3a',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    borderRight: `4px solid ${status.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ فیس ثبت شده</span>
                      {fee.barcode && (
                        <span style={{ 
                          color: '#fcd34d', 
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          backgroundColor: '#0f1a2a',
                          padding: '2px 10px',
                          borderRadius: '4px'
                        }}>
                          🏷️ {fee.barcode}
                        </span>
                      )}
                      <span style={{
                        backgroundColor: status.color,
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {status.label}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                        {getMethodLabel(fee.payment_method)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#fcd34d' }}>💰 {amount.toFixed(2)}</span>
                      <span style={{ color: '#22c55e' }}>پرداخت: {paidAmount.toFixed(2)}</span>
                      {discount > 0 && (
                        <span style={{ color: '#f59e0b' }}>تخفیف: {discount}%</span>
                      )}
                      <span style={{ color: '#ef4444' }}>
                        باقیمانده: {calculateRemaining(amount, paidAmount, discount).toFixed(2)}
                      </span>
                    </div>
                    {fee.description && (
                      <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px' }}>
                        {fee.description}
                      </div>
                    )}
                    {fee.note && (
                      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                        یادداشت: {fee.note}
                      </div>
                    )}
                    <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                      📅 {formatDate(fee.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============ مودال فرم اخذ فیس ============ */}
      {showFeeForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
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
            <h4 style={{ color: '#60a5fa', marginBottom: '20px' }}>
              {editingFee ? '✏️ تصحیح فیس لابراتوار' : '💰 اخذ فیس لابراتوار'}
            </h4>

            {selectedRequests.length > 0 && (
              <div style={{
                backgroundColor: '#0f1a2a',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #374151'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '5px' }}>
                  📋 تعداد درخواست‌ها: {selectedRequests.length}
                </div>
                {selectedRequests.map((req, index) => (
                  <div key={req.id} style={{ 
                    color: 'white', 
                    fontSize: '13px',
                    padding: '4px 0',
                    borderBottom: index < selectedRequests.length - 1 ? '1px solid #2a3a4a' : 'none'
                  }}>
                    {index + 1}. {req.test_type_label || req.test_type || req.test_category || 'آزمایش'}
                    {req.test_name && ` - ${req.test_name}`}
                    {req.barcode && ` (🏷️ ${req.barcode})`}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitFee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    مبلغ کل (افغانی) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    مبلغ پرداخت شده
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.paid_amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, paid_amount: e.target.value })}
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    تخفیف (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={feeFormData.discount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, discount: e.target.value })}
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    روش پرداخت
                  </label>
                  <select
                    value={feeFormData.payment_method}
                    onChange={(e) => setFeeFormData({ ...feeFormData, payment_method: e.target.value })}
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                  >
                    <option value="cash">نقدی</option>
                    <option value="card">کارت بانکی</option>
                    <option value="online">آنلاین</option>
                    <option value="insurance">بیمه</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    توضیحات
                  </label>
                  <textarea
                    value={feeFormData.description}
                    onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                    rows="2"
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                    placeholder="توضیحات اضافی..."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '5px' }}>
                    یادداشت
                  </label>
                  <textarea
                    value={feeFormData.note}
                    onChange={(e) => setFeeFormData({ ...feeFormData, note: e.target.value })}
                    rows="2"
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: 'white',
                      borderColor: '#374151',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #374151'
                    }}
                    placeholder="یادداشت..."
                  />
                </div>
              </div>

              {feeFormData.amount && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px 15px',
                  backgroundColor: '#0f1a2a',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#9ca3af' }}>مبلغ باقیمانده:</span>
                  <span style={{
                    color: '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    {calculateRemaining(
                      parseFloat(feeFormData.amount) || 0,
                      parseFloat(feeFormData.paid_amount) || 0,
                      parseFloat(feeFormData.discount) || 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    padding: '10px 30px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#6b7280' : '#22c55e',
                    color: 'white',
                    padding: '10px 30px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳ در حال ثبت...' : (editingFee ? '✅ ذخیره تغییرات' : '💰 ثبت فیس')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}