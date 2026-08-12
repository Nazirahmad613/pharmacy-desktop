// src/app/pages/laboratory/LaboratoryFeeTab.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function LaboratoryFeeTab({ api, registration }) {
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [barcode, setBarcode] = useState(null);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  
  // فرم اخذ فیس
  const [feeFormData, setFeeFormData] = useState({
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: ""
  });

  // ============ بارگذاری اطلاعات ============
  useEffect(() => {
    if (!registration?.reg_id) {
      console.log("⚠️ registration.reg_id موجود نیست");
      return;
    }

    console.log("🚀 شروع بارگذاری برای reg_id:", registration.reg_id);
    fetchAllData();

  }, [registration?.reg_id]);

  // ============ دریافت تمام داده‌ها ============
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. دریافت اطلاعات مریض
      await fetchPatientInfo();
      
      // 2. دریافت درخواست‌های لابراتوار
      await fetchLaboratoryRequests();
      
      // 3. دریافت فیس‌های ثبت شده
      await fetchFeeRecords();
      
    } catch (err) {
      console.error("❌ خطا در دریافت داده‌ها:", err);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت اطلاعات مریض ============
  const fetchPatientInfo = async () => {
    try {
      console.log("📡 دریافت اطلاعات مریض...");
      const response = await api.get(`/registrations/${registration.reg_id}`);
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
   // ============ دریافت درخواست‌های لابراتوار ============
const fetchLaboratoryRequests = async () => {
  try {
    const regId = registration?.reg_id;

    if (!regId) {
      console.error("❌ reg_id موجود نیست");
      setAllRequests([]);
      setUnpaidRequests([]);
      return;
    }

    console.log("🔎 دریافت درخواست‌های لابراتوار برای reg_id:", regId);

    // =====================================================
    // استفاده از endpoint اصلی درخواست‌های لابراتوار
    // =====================================================
    const url = `/laboratory-requests/registration/${regId}`;

    console.log("📡 GET:", url);

    const response = await api.get(url);

    console.log(
      "📋 پاسخ Laboratory Requests:",
      JSON.stringify(response.data, null, 2)
    );

    // اطلاعات دیباگ
    setDebugInfo({
      url,
      response: response.data,
      timestamp: new Date().toISOString(),
    });

    // =====================================================
    // استخراج response
    // =====================================================
    let responseData = response.data;

    // اگر API به شکل:
    // { success: true, data: [...] }
    if (
      responseData &&
      responseData.success === true &&
      responseData.data !== undefined
    ) {
      responseData = responseData.data;
    }

    // =====================================================
    // استخراج آرایه درخواست‌ها
    // =====================================================
    let tests = [];

    if (Array.isArray(responseData)) {
      tests = responseData;
    } else if (
      responseData &&
      Array.isArray(responseData.data)
    ) {
      tests = responseData.data;
    } else if (
      responseData &&
      Array.isArray(responseData.tests)
    ) {
      tests = responseData.tests;
    } else if (
      responseData &&
      Array.isArray(responseData.laboratory_requests)
    ) {
      tests = responseData.laboratory_requests;
    } else if (
      responseData &&
      Array.isArray(responseData.requests)
    ) {
      tests = responseData.requests;
    } else if (
      responseData &&
      responseData.data &&
      Array.isArray(responseData.data.tests)
    ) {
      tests = responseData.data.tests;
    } else if (
      responseData &&
      responseData.data &&
      Array.isArray(responseData.data.laboratory_requests)
    ) {
      tests = responseData.data.laboratory_requests;
    }

    console.log("🧪 تعداد درخواست‌های دریافت شده:", tests.length);

    // =====================================================
    // اگر هیچ درخواست پیدا نشد
    // =====================================================
    if (tests.length === 0) {
      console.warn(
        `⚠️ هیچ درخواست لابراتواری برای registration_id=${regId} از API دریافت نشد`
      );

      setAllRequests([]);
      setUnpaidRequests([]);

      toast.info(
        "هیچ درخواست لابراتواری برای این مراجعه دریافت نشد"
      );

      return;
    }

    // =====================================================
    // ذخیره تمام درخواست‌ها
    // =====================================================
    setAllRequests(tests);

    // =====================================================
    // نمایش درخواست‌ها برای Debug
    // =====================================================
    tests.forEach((test, index) => {
      console.log(`📌 درخواست ${index + 1}:`, {
        id: test.id,
        registration_id: test.registration_id,
        test_type: test.test_type,
        test_name: test.test_name,
        barcode: test.barcode,
        fee_id: test.fee_id,
        status: test.status,
      });
    });

    // =====================================================
    // درخواست‌های بدون فیس
    // =====================================================
    const unpaid = tests.filter((test) => {
      const feeId = test.fee_id;

      const isUnpaid =
        feeId === null ||
        feeId === undefined ||
        feeId === "" ||
        feeId === 0;

      console.log(
        `💰 Request ID ${test.id}: fee_id=${feeId} => ${
          isUnpaid ? "بدون فیس" : "دارای فیس"
        }`
      );

      return isUnpaid;
    });

    // =====================================================
    // درخواست‌های دارای فیس
    // =====================================================
    const paid = tests.filter((test) => {
      const feeId = test.fee_id;

      return (
        feeId !== null &&
        feeId !== undefined &&
        feeId !== "" &&
        feeId !== 0
      );
    });

    console.log("🟡 درخواست‌های بدون فیس:", unpaid.length);
    console.log("🟢 درخواست‌های دارای فیس:", paid.length);

    // =====================================================
    // ذخیره در State
    // =====================================================
    setUnpaidRequests(unpaid);

    // =====================================================
    // پیام‌ها
    // =====================================================
    if (unpaid.length > 0) {
      console.log(
        `✅ ${unpaid.length} درخواست آماده اخذ فیس است`
      );
    } else if (tests.length > 0) {
      console.log(
        "ℹ️ تمام درخواست‌های لابراتوار دارای فیس هستند"
      );
    }

  } catch (err) {
    console.error(
      "❌ خطا در دریافت درخواست‌های لابراتوار:",
      err
    );

    console.error(
      "❌ Response:",
      err.response?.data
    );

    console.error(
      "❌ Status:",
      err.response?.status
    );

    setAllRequests([]);
    setUnpaidRequests([]);

    toast.error(
      err.response?.data?.message ||
      "خطا در دریافت درخواست‌های لابراتوار"
    );
  }
};

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeeRecords = async () => {
    try {
      console.log("💳 دریافت فیس‌ها...");
      const response = await api.get(`/laboratory-fees?registration_id=${registration.reg_id}`);
      console.log("💳 پاسخ فیس‌ها:", response.data);
      
      let fees = [];
      
      if (response.data?.success && response.data?.data?.data) {
        fees = response.data.data.data;
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
    
    const defaultAmount = request.amount || 0;
    
    setFeeFormData({
      amount: defaultAmount.toString(),
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: `آزمایش: ${request.test_type_label || request.test_type} - ${request.test_name || ''}`,
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
        response = await api.post(`/laboratory-fees/${registration.reg_id}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ثبت شد");
      }

      console.log("✅ پاسخ ثبت فیس:", response.data);

      // به‌روزرسانی لیست‌ها
      await fetchAllData();
      handleCloseForm();

    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      console.error("پاسخ خطا:", err.response?.data);
      
      if (err.response?.data?.errors) {
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

  const patient = patientInfo?.patient || registration?.patient || {};
  const isPatientInfoLoaded = patientInfo !== null;

  return (
    <div>
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
              {registrationData?.visit_number && (
                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                  شماره مراجعه: {registrationData.visit_number}
                </div>
              )}
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
              <div style={{ color: 'white', fontWeight: 'bold' }}>{registration?.visit_number || registrationData?.visit_number || '-'}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>نام کامل</span>
              <div style={{ color: 'white' }}>{patient.first_name || ''} {patient.last_name || ''}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>سن / جنسیت</span>
              <div style={{ color: 'white' }}>{patient.age || '-'} سال / {patient.gender === 'male' ? 'مرد' : patient.gender === 'female' ? 'زن' : '-'}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>تماس</span>
              <div style={{ color: 'white' }}>{patient.mobile || '-'}</div>
            </div>
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
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              <div>📡 URL: {debugInfo.url}</div>
              <div>📊 تعداد تست‌ها: {allRequests.length}</div>
              <div>🟡 بدون فیس: {unpaidRequests.length}</div>
              <div>🟢 دارای فیس: {allRequests.length - unpaidRequests.length}</div>
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
          <div style={{ fontSize: '12px', marginTop: '10px', color: '#6b7280' }}>
            برای ثبت درخواست جدید به بخش درخواست لابراتوار مراجعه کنید
          </div>
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
                    {request.test_type_label || request.test_type}
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
                  {request.status && (
                    <span style={{
                      backgroundColor: request.status === 'pending' ? '#f59e0b' : '#6b7280',
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}>
                      {request.status_label || request.status}
                    </span>
                  )}
                </div>
                {request.test_description && (
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>
                    {request.test_description}
                  </div>
                )}
                {request.clinical_indication && (
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                    اندیکاسیون: {request.clinical_indication}
                  </div>
                )}
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '3px' }}>
                  📅 {formatDate(request.request_date)}
                </div>
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
              const status = getPaymentStatus(fee.amount, fee.paid_amount, fee.discount);
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
                      <span style={{ color: '#fcd34d' }}>💰 {fee.amount?.toFixed(2)}</span>
                      <span style={{ color: '#22c55e' }}>پرداخت: {fee.paid_amount?.toFixed(2)}</span>
                      {fee.discount > 0 && (
                        <span style={{ color: '#f59e0b' }}>تخفیف: {fee.discount}%</span>
                      )}
                      <span style={{ color: '#ef4444' }}>
                        باقیمانده: {calculateRemaining(fee.amount, fee.paid_amount, fee.discount).toFixed(2)}
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

            {/* اطلاعات درخواست‌های انتخاب شده */}
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
                    {index + 1}. {req.test_type_label || req.test_type}
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

              {/* نمایش مبلغ باقیمانده */}
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