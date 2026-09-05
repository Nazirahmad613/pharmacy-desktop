// src/app/pages/radiologyFeesRequest/RadiologyFeeTab.jsx

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function RadiologyFeeTab(props) {
  console.log("🔥 تمام Props دریافتی RadiologyFeeTab:", props);

  const { api, regId } = props;
  const [loading, setLoading] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [groupedRequests, setGroupedRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [filterMode, setFilterMode] = useState('all');

  // فرم اخذ فیس
  const [feeFormData, setFeeFormData] = useState({
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: ""
  });

  // ============ بارگذاری اولیه ============
  useEffect(() => {
    console.log("🔍 ====== بارگذاری اولیه RadiologyFeeTab ======");
    fetchAllRequests();
  }, []);

  // ============ دریافت تمام درخواست‌های رادیولوژی ============
  const fetchAllRequests = async () => {
    console.log("📡 دریافت تمام درخواست‌های رادیولوژی...");
    setLoading(true);
    setFetchError(null);
    
    try {
      // ✅ مسیر صحیح
      const response = await api.get('/radiology-fees/all-requests');
      console.log("✅ پاسخ دریافت تمام درخواست‌ها:", response.data);

      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        setGroupedRequests(data.grouped_by_reg_id || []);
        
        setDebugInfo({
          totalRequests: data.total_requests || 0,
          totalUnpaid: data.total_unpaid || 0,
          totalPaid: data.total_paid || 0,
          totalRegistrations: data.total_registrations || 0,
          timestamp: new Date().toISOString()
        });

        toast.success(`✅ ${data.total_requests || 0} درخواست رادیولوژی دریافت شد`);
      } else {
        toast.warning("داده‌ای دریافت نشد");
      }

    } catch (err) {
      console.error("❌ خطا در دریافت درخواست‌ها:", err);
      setFetchError(err.message);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت فیس‌های ثبت شده رادیولوژی ============
  const fetchFeeRecords = async () => {
    try {
      console.log("💳 دریافت فیس‌های ثبت شده رادیولوژی...");
      const response = await api.get('/radiology-fees');
      console.log("💳 پاسخ فیس‌ها:", response.data);

      let fees = [];
      if (response.data?.success && Array.isArray(response.data?.data?.data)) {
        fees = response.data.data.data;
      } else if (response.data?.success && Array.isArray(response.data?.data)) {
        fees = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        fees = response.data.data;
      } else if (Array.isArray(response.data)) {
        fees = response.data;
      }

      setFeeRecords(fees);
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
    }
  };

  // ============ باز کردن فرم اخذ فیس ============
  const handleOpenFeeForm = (request) => {
    console.log("💰 باز کردن فرم اخذ فیس برای:", request);
    setSelectedRequest(request);
    setEditingFee(null);
    
    const defaultAmount = request.amount || 0;
    
    setFeeFormData({
      amount: defaultAmount.toString(),
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: `رادیولوژی: ${request.radiology_type_label || request.radiology_type || ''} - ${request.body_part || ''}`,
      note: `درخواست بارکد: ${request.barcode || ''}`
    });
    setShowFeeForm(true);
  };

  // ============ باز کردن فرم ویرایش فیس ============
  const handleOpenEditFeeForm = (fee) => {
    console.log("✏️ باز کردن فرم ویرایش فیس:", fee);
    setEditingFee(fee);
    setSelectedRequest(null);
    
    setFeeFormData({
      amount: fee.amount?.toString() || "",
      paid_amount: fee.paid_amount?.toString() || "",
      discount: fee.discount?.toString() || "",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || ""
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

    if (!selectedRequest && !editingFee) {
      toast.error("❌ هیچ درخواستی انتخاب نشده است");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        radiology_request_id: selectedRequest ? selectedRequest.id : null,
        amount: parseFloat(feeFormData.amount),
        paid_amount: parseFloat(feeFormData.paid_amount) || 0,
        discount: parseFloat(feeFormData.discount) || 0,
        payment_method: feeFormData.payment_method,
        description: feeFormData.description,
        note: feeFormData.note,
      };

      console.log("📤 ارسال payload:", payload);

      let response;
      if (editingFee) {
        response = await api.put(`/radiology-fees/${editingFee.id}`, payload);
        toast.success("✅ فیس رادیولوژی با موفقیت ویرایش شد");
      } else {
        response = await api.post(`/radiology-fees/registration/${selectedRequest.reg_id}`, payload);
        toast.success("✅ فیس رادیولوژی با موفقیت ثبت شد");
      }

      console.log("✅ پاسخ ثبت فیس:", response.data);

      await fetchAllRequests();
      await fetchFeeRecords();
      handleCloseForm();

    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      
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
    setSelectedRequest(null);
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
    try {
      return new Date(date).toLocaleDateString('fa-IR');
    } catch {
      return '-';
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('fa-IR');
    } catch {
      return '-';
    }
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

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const hasFee = (request) => {
    if (request.has_fee !== undefined) {
      return request.has_fee === true;
    }
    return request.fee_id !== null && request.fee_id !== undefined && request.fee_id !== 0;
  };

  const getFeeForRequest = (requestId) => {
    return feeRecords.find(fee => fee.radiology_request_id === requestId);
  };

  const getPatientFullName = (request) => {
    if (request.patient?.full_name) {
      return request.patient.full_name;
    }
    if (request.patient?.first_name) {
      return `${request.patient.first_name || ''} ${request.patient.last_name || ''}`.trim() || 'نامشخص';
    }
    return 'نامشخص';
  };

  const getPatientAge = (request) => {
    if (request.patient?.age) {
      return `${request.patient.age} سال`;
    }
    return '-';
  };

  const getPatientGender = (request) => {
    let gender = request.patient?.gender;
    if (gender) {
      const genderMap = {
        'Male': 'مرد',
        'male': 'مرد',
        'Female': 'زن',
        'female': 'زن',
        'other': 'دیگر'
      };
      return genderMap[gender] || gender;
    }
    return '-';
  };

  const getRegIdLabel = (regId) => {
    if (!regId) return 'نامشخص';
    return `مراجعه #${regId}`;
  };

  // ============ فیلتر کردن درخواست‌ها ============
  const getFilteredRequests = () => {
    if (filterMode === 'unpaid') {
      return unpaidRequests;
    } else if (filterMode === 'paid') {
      return paidRequests;
    }
    return allRequests;
  };

  const displayRequests = getFilteredRequests();

  return (
    <div>
      {/* ============ هدر ============ */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        borderBottom: '3px solid #ec4899'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ color: '#ec4899', margin: 0 }}>
              📷 مدیریت فیس‌های رادیولوژی
            </h3>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
              تمام درخواست‌های رادیولوژی تمام مراجعه‌کنندگان
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                backgroundColor: filterMode === 'all' ? '#ec4899' : '#374151',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📋 همه ({allRequests.length})
            </button>
            <button
              onClick={() => setFilterMode('unpaid')}
              style={{
                backgroundColor: filterMode === 'unpaid' ? '#f59e0b' : '#374151',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🟡 بدون فیس ({unpaidRequests.length})
            </button>
            <button
              onClick={() => setFilterMode('paid')}
              style={{
                backgroundColor: filterMode === 'paid' ? '#22c55e' : '#374151',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🟢 دارای فیس ({paidRequests.length})
            </button>
            <button
              onClick={() => { fetchAllRequests(); fetchFeeRecords(); }}
              style={{
                backgroundColor: '#374151',
                color: '#ec4899',
                padding: '6px 15px',
                borderRadius: '6px',
                border: '1px solid #ec4899',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔄 بارگذاری مجدد
            </button>
          </div>
        </div>

        {/* اطلاعات آماری */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '10px',
          marginTop: '15px',
          paddingTop: '15px',
          borderTop: '1px solid #2a3a4a'
        }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>📊 کل درخواست‌ها</span>
            <div style={{ color: 'white', fontWeight: 'bold' }}>{allRequests.length}</div>
          </div>
          <div>
            <span style={{ color: '#f59e0b', fontSize: '11px' }}>🟡 بدون فیس</span>
            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>{unpaidRequests.length}</div>
          </div>
          <div>
            <span style={{ color: '#22c55e', fontSize: '11px' }}>🟢 دارای فیس</span>
            <div style={{ color: '#22c55e', fontWeight: 'bold' }}>{paidRequests.length}</div>
          </div>
          <div>
            <span style={{ color: '#ec4899', fontSize: '11px' }}>👥 مراجعه‌کنندگان</span>
            <div style={{ color: '#ec4899', fontWeight: 'bold' }}>{groupedRequests.length}</div>
          </div>
        </div>

        {debugInfo && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            backgroundColor: '#0f1a2a',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#6b7280',
            fontFamily: 'monospace'
          }}>
            آخرین بروزرسانی: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleString('fa-IR') : '-'}
          </div>
        )}

        {fetchError && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#7f1d1d',
            borderRadius: '6px',
            color: '#fca5a5',
            fontSize: '12px'
          }}>
            ⚠️ خطا: {fetchError}
          </div>
        )}
      </div>

      {/* ============ نمایش تعداد درخواست‌ها ============ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ color: '#ec4899', margin: 0 }}>
          📋 لیست درخواست‌های رادیولوژی
          {filterMode === 'unpaid' && <span style={{ color: '#f59e0b', fontSize: '14px', marginRight: '10px' }}>(بدون فیس)</span>}
          {filterMode === 'paid' && <span style={{ color: '#22c55e', fontSize: '14px', marginRight: '10px' }}>(دارای فیس)</span>}
        </h4>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          نمایش {displayRequests.length} از {allRequests.length} درخواست
        </span>
      </div>

      {/* ============ لیست تمام درخواست‌ها ============ */}
      {loading || loadingRequests ? (
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
      ) : displayRequests.length === 0 ? (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
          <div>
            {filterMode === 'unpaid' && 'هیچ درخواست بدون فیس وجود ندارد'}
            {filterMode === 'paid' && 'هیچ درخواست دارای فیس وجود ندارد'}
            {filterMode === 'all' && 'هیچ درخواست رادیولوژی ثبت نشده است'}
          </div>
          <div style={{ fontSize: '12px', marginTop: '10px', color: '#6b7280' }}>
            💡 برای بارگذاری مجدد، دکمه "بارگذاری مجدد" را کلیک کنید
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {displayRequests.map((request, index) => {
            const hasFeeRecord = hasFee(request);
            const feeInfo = getFeeForRequest(request.id);
            
            const statusText = hasFeeRecord ? '✅ دارای فیس' : '❌ بدون فیس';
            const statusColor = hasFeeRecord ? '#22c55e' : '#ef4444';
            const borderColor = hasFeeRecord ? '#22c55e' : '#f59e0b';
            
            return (
              <div
                key={request.id || index}
                style={{
                  backgroundColor: '#1a2a3a',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  borderRight: `4px solid ${borderColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1, minWidth: '250px' }}>
                  {/* اطلاعات اصلی درخواست */}
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>#{index + 1}</span>
                    <span style={{ 
                      backgroundColor: '#0f1a2a',
                      color: '#ec4899',
                      padding: '2px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {getRegIdLabel(request.reg_id)}
                    </span>
                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '13px' }}>
                      {getPatientFullName(request)}
                    </span>
                    <span style={{ color: '#ec4899', fontWeight: 'bold' }}>
                      {request.radiology_type_label || request.radiology_type || 'رادیولوژی'}
                    </span>
                    {request.body_part && (
                      <span style={{ color: 'white' }}>بخش: {request.body_part}</span>
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
                      backgroundColor: statusColor,
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      {statusText}
                    </span>
                  </div>
                  
                  {/* اطلاعات مریض */}
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    marginTop: '5px',
                    padding: '5px 10px',
                    backgroundColor: '#0f1a2a',
                    borderRadius: '4px',
                    border: '1px solid #1a3a4a'
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>👤 مریض:</span>
                    <span style={{ color: '#34d399', fontSize: '12px' }}>
                      {getPatientFullName(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                      🎂 {getPatientAge(request)}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                      ⚤ {getPatientGender(request)}
                    </span>
                    {request.patient?.mobile && (
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                        📞 {request.patient.mobile}
                      </span>
                    )}
                  </div>
                  
                  {/* تاریخ و اطلاعات دیگر */}
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '3px' }}>
                    📅 تاریخ درخواست: {formatDateTime(request.request_date || request.created_at)}
                    {request.status && (
                      <span style={{ marginRight: '15px' }}>
                        | وضعیت: {request.status_label || request.status}
                      </span>
                    )}
                    {request.priority && (
                      <span style={{ marginRight: '15px' }}>
                        | اولویت: {request.priority_label || request.priority}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>
                    ID: {request.id} | fee_id: {request.fee_id !== undefined && request.fee_id !== 0 && request.fee_id !== null ? request.fee_id : 'ندارد'}
                  </div>
                  
                  {/* اطلاعات فیس اگر موجود باشد */}
                  {hasFeeRecord && feeInfo && (
                    <div style={{
                      marginTop: '5px',
                      padding: '5px 10px',
                      backgroundColor: '#0f1a2a',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#9ca3af'
                    }}>
                      <span style={{ color: '#10b981' }}>✅ فیس ثبت شده: </span>
                      💰 {toNumber(feeInfo.amount || 0).toFixed(2)} | 
                      پرداخت: {toNumber(feeInfo.paid_amount || 0).toFixed(2)} | 
                      روش: {getMethodLabel(feeInfo.payment_method)}
                      {feeInfo.remaining_amount !== undefined && (
                        <> | باقیمانده: {toNumber(feeInfo.remaining_amount).toFixed(2)}</>
                      )}
                      <button
                        onClick={() => handleOpenEditFeeForm(feeInfo)}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          marginRight: '10px'
                        }}
                      >
                        ✏️ ویرایش
                      </button>
                    </div>
                  )}
                </div>
                
                {!hasFeeRecord ? (
                  <button
                    onClick={() => handleOpenFeeForm(request)}
                    style={{
                      backgroundColor: '#ec4899',
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
                ) : (
                  <span style={{
                    backgroundColor: '#1a3a2a',
                    color: '#22c55e',
                    padding: '8px 15px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: '1px solid #22c55e'
                  }}>
                    ✅ فیس اخذ شده
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ فیس‌های ثبت شده ============ */}
      {feeRecords.length > 0 && (
        <>
          <h4 style={{ color: '#10b981', marginTop: '20px', marginBottom: '10px' }}>
            ✅ خلاصه فیس‌های ثبت شده رادیولوژی
            <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '10px' }}>
              ({feeRecords.length} فیس)
            </span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feeRecords.map((fee) => {
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
                      <span style={{ color: '#ec4899', fontSize: '12px' }}>
                        {getRegIdLabel(fee.reg_id)}
                      </span>
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
                    <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                      📅 {formatDateTime(fee.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenEditFeeForm(fee)}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '6px 15px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ ویرایش
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============ مودال فرم اخذ فیس ============ */}
      {(showFeeForm && (selectedRequest || editingFee)) && (
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
            <h4 style={{ color: '#ec4899', marginBottom: '20px' }}>
              {editingFee ? '✏️ تصحیح فیس رادیولوژی' : '💰 اخذ فیس رادیولوژی'}
            </h4>

            {selectedRequest && (
              <div style={{
                backgroundColor: '#0f1a2a',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #374151'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>👤 نام مریض</span>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>
                      {getPatientFullName(selectedRequest)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>🆔 شماره مراجعه</span>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{selectedRequest.reg_id || '-'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>🎂 سن</span>
                    <div style={{ color: 'white' }}>{getPatientAge(selectedRequest)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>⚤ جنسیت</span>
                    <div style={{ color: 'white' }}>{getPatientGender(selectedRequest)}</div>
                  </div>
                  {selectedRequest.patient?.mobile && (
                    <div>
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>📞 تماس</span>
                      <div style={{ color: 'white' }}>{selectedRequest.patient.mobile}</div>
                    </div>
                  )}
                </div>
                
                <div style={{
                  borderTop: '1px solid #2a3a4a',
                  paddingTop: '10px',
                  marginTop: '5px'
                }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '5px' }}>
                    📋 اطلاعات درخواست
                  </div>
                  <div style={{ 
                    color: 'white', 
                    fontSize: '13px',
                    padding: '4px 0'
                  }}>
                    {selectedRequest.radiology_type_label || selectedRequest.radiology_type || 'رادیولوژی'}
                    {selectedRequest.body_part && ` - بخش: ${selectedRequest.body_part}`}
                    {selectedRequest.barcode && ` (🏷️ ${selectedRequest.barcode})`}
                  </div>
                </div>
              </div>
            )}

            {editingFee && (
              <div style={{
                backgroundColor: '#0f1a2a',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #374151'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                  ✏️ در حال ویرایش فیس شماره: {editingFee.id}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '5px' }}>
                  بارکد: {editingFee.barcode}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '5px' }}>
                  مراجعه: {getRegIdLabel(editingFee.reg_id)}
                </div>
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
                    backgroundColor: loading ? '#6b7280' : '#ec4899',
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