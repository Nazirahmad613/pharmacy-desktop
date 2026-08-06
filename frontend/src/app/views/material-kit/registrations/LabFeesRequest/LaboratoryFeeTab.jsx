// src/app/pages/laboratory/LaboratoryFeeTab.jsx
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

export default function LaboratoryFeeTab({ api, registration }) {
  const [loading, setLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [barcode, setBarcode] = useState(null);
  const [laboratoryRequests, setLaboratoryRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]); // تغییر به آرایه برای چند درخواست
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeRecords, setFeeRecords] = useState([]);
  const [editingFee, setEditingFee] = useState(null);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const printRef = useRef(null);
  
  // فرم اخذ فیس
  const [feeFormData, setFeeFormData] = useState({
    amount: "",
    paid_amount: "",
    discount: "",
    payment_method: "cash",
    description: "",
    note: ""
  });

  // ============ بارگذاری اطلاعات مریض ============
  useEffect(() => {
    if (!registration?.reg_id) return;

    const fetchPatientData = async () => {
      try {
        const response = await api.get(`/registrations/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
        if (data.barcode) {
          setBarcode(data.barcode);
        } else if (data.patient?.barcode) {
          setBarcode(data.patient.barcode);
        }

        // دریافت درخواست‌های بدون فیس
        await fetchUnpaidRequests(registration.reg_id);
        // دریافت فیس‌های ثبت شده
        await fetchFeeRecords(registration.reg_id);
        
      } catch (err) {
        console.error("خطا در دریافت اطلاعات:", err);
        toast.error("❌ خطا در دریافت اطلاعات مریض");
      }
    };

    fetchPatientData();
  }, [registration?.reg_id, api]);

  // ============ دریافت درخواست‌های بدون فیس ============
  const fetchUnpaidRequests = async (registrationId) => {
    try {
      const response = await api.get(`/laboratory-fees/registration/${registrationId}/unpaid-requests`);
      console.log("Unpaid requests response:", response.data);
      
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        setLaboratoryRequests(data.unpaid_requests || []);
      } else {
        setUnpaidRequests([]);
        setPaidRequests([]);
        setLaboratoryRequests([]);
      }
    } catch (err) {
      console.error("خطا در دریافت درخواست‌ها:", err);
      setUnpaidRequests([]);
      setPaidRequests([]);
      setLaboratoryRequests([]);
    }
  };

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeeRecords = async (registrationId) => {
    try {
      const response = await api.get(`/laboratory-fees?registration_id=${registrationId}`);
      console.log("Fee records response:", response.data);
      
      const data = response.data?.data?.data || [];
      setFeeRecords(data);
    } catch (err) {
      console.error("خطا در دریافت فیس‌ها:", err);
      setFeeRecords([]);
    }
  };

  // ============ باز کردن فرم اخذ فیس (با پشتیبانی از چند درخواست) ============
  const handleOpenFeeForm = (request) => {
    setSelectedRequests([request]); // تبدیل به آرایه
    setEditingFee(null);
    
    // محاسبه مبلغ پیش‌فرض (می‌توانید از تنظیمات سیستم استفاده کنید)
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

  // ============ باز کردن فرم برای چند درخواست ============
  const handleOpenFeeFormMultiple = (requests) => {
    if (!requests || requests.length === 0) {
      toast.warning("⚠️ هیچ درخواستی انتخاب نشده است");
      return;
    }
    
    setSelectedRequests(requests);
    setEditingFee(null);
    
    const testNames = requests.map(r => r.test_name || r.test_type_label || r.test_type).join('، ');
    const totalAmount = requests.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    
    setFeeFormData({
      amount: totalAmount.toString(),
      paid_amount: "",
      discount: "",
      payment_method: "cash",
      description: `آزمایش‌ها: ${testNames}`,
      note: `تعداد ${requests.length} درخواست - بارکدها: ${requests.map(r => r.barcode).join('، ')}`
    });
    setShowFeeForm(true);
  };

  // ============ ویرایش فیس ============
  const handleEditFee = (fee) => {
    setEditingFee(fee);
    setSelectedRequests([]);
    
    // دریافت درخواست‌های مرتبط با این فیس
    const relatedRequests = fee.related_requests || [];
    
    setFeeFormData({
      amount: fee.amount || "",
      paid_amount: fee.paid_amount || "",
      discount: fee.discount || "",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || ""
    });
    setShowFeeForm(true);
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
        laboratory_request_ids: selectedRequests.map(r => r.id) // ارسال آرایه‌ای از IDs
      };

      let response;
      if (editingFee) {
        // ویرایش فیس
        response = await api.put(`/laboratory-fees/${editingFee.id}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ویرایش شد");
      } else {
        // ثبت فیس جدید
        response = await api.post(`/laboratory-fees/${registration.reg_id}`, payload);
        toast.success(`✅ فیس لابراتوار با موفقیت ثبت شد`);
      }

      console.log("Fee response:", response.data);

      // به‌روزرسانی لیست‌ها
      await fetchFeeRecords(registration.reg_id);
      await fetchUnpaidRequests(registration.reg_id);
      handleCloseForm();

    } catch (err) {
      console.error("خطا:", err);
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

  // ============ حذف فیس ============
  const handleDeleteFee = async (feeId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این فیس را حذف کنید؟")) return;

    try {
      await api.delete(`/laboratory-fees/${feeId}`);
      toast.success("✅ فیس لابراتوار با موفقیت حذف شد");
      await fetchFeeRecords(registration.reg_id);
      await fetchUnpaidRequests(registration.reg_id);
    } catch (err) {
      toast.error("❌ خطا در حذف فیس لابراتوار");
    }
  };

  // ============ پرنت ============
  const handlePrint = (fee) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>بارکد و رسید لابراتوار</title>
        <style>
          @page { margin: 20px; }
          body {
            font-family: 'Tahoma', 'Arial', sans-serif;
            background: #fff;
            color: #333;
            padding: 20px;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            border: 2px solid #1a2a3a;
            border-radius: 10px;
            padding: 30px;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1a2a3a;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h2 {
            color: #1a2a3a;
            margin: 0;
            font-size: 24px;
          }
          .header .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
          }
          .barcode-section {
            background: #f8f9fa;
            border: 2px dashed #1a2a3a;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .barcode-section .label {
            color: #666;
            font-size: 12px;
            margin-bottom: 5px;
          }
          .barcode-section .code {
            font-family: 'Courier New', monospace;
            font-size: 28px;
            font-weight: bold;
            color: #1a2a3a;
            letter-spacing: 4px;
            background: #fff;
            padding: 10px;
            border-radius: 4px;
            display: inline-block;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 20px 0;
          }
          .info-item {
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          .info-item .label {
            color: #666;
            font-size: 11px;
            display: block;
          }
          .info-item .value {
            color: #1a2a3a;
            font-weight: bold;
            font-size: 14px;
          }
          .test-details {
            background: #f0f4ff;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            border-right: 4px solid #3b82f6;
          }
          .test-details .title {
            color: #3b82f6;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .test-details .desc {
            color: #555;
            font-size: 13px;
          }
          .payment-details {
            background: #f0fff4;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            border-right: 4px solid #22c55e;
          }
          .payment-details .title {
            color: #22c55e;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .payment-details .amount {
            font-size: 20px;
            font-weight: bold;
            color: #1a2a3a;
          }
          .footer {
            text-align: center;
            border-top: 2px solid #1a2a3a;
            padding-top: 15px;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
          .footer .date {
            color: #999;
            font-size: 11px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            color: white;
            font-size: 12px;
            font-weight: bold;
          }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .container { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🧪 لابراتوار مرکز صحی</h2>
            <div class="subtitle">رسید درخواست آزمایش</div>
          </div>

          <div class="barcode-section">
            <div class="label">📊 بارکد مریض</div>
            <div class="code">${fee.barcode || barcode || 'N/A'}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">👤 نام مریض</span>
              <span class="value">${patientInfo?.patient?.first_name || ''} ${patientInfo?.patient?.last_name || ''}</span>
            </div>
            <div class="info-item">
              <span class="label">🆔 شماره مراجعه</span>
              <span class="value">${registration?.visit_number || '-'}</span>
            </div>
            <div class="info-item">
              <span class="label">📅 تاریخ</span>
              <span class="value">${new Date().toLocaleDateString('fa-IR')}</span>
            </div>
            <div class="info-item">
              <span class="label">👤 سن / جنسیت</span>
              <span class="value">${patientInfo?.patient?.age || '-'} سال / ${patientInfo?.patient?.gender === 'male' ? 'مرد' : patientInfo?.patient?.gender === 'female' ? 'زن' : '-'}</span>
            </div>
          </div>

          <div class="test-details">
            <div class="title">📋 اطلاعات درخواست</div>
            <div><strong>نوع آزمایش:</strong> ${fee.laboratory_request?.test_type_label || fee.laboratory_request?.test_type || '-'}</div>
            ${fee.laboratory_request?.test_name ? `<div><strong>نام آزمایش:</strong> ${fee.laboratory_request?.test_name}</div>` : ''}
            ${fee.laboratory_request?.test_description ? `<div class="desc"><strong>توضیحات:</strong> ${fee.laboratory_request?.test_description}</div>` : ''}
            ${fee.laboratory_request?.clinical_indication ? `<div class="desc"><strong>اندیکاسیون:</strong> ${fee.laboratory_request?.clinical_indication}</div>` : ''}
          </div>

          <div class="payment-details">
            <div class="title">💰 مشخصات پرداخت</div>
            <div>مبلغ کل: <span class="amount">${fee.amount?.toFixed(2)}</span> افغانی</div>
            ${fee.paid_amount > 0 ? `<div>مبلغ پرداخت شده: ${fee.paid_amount?.toFixed(2)} افغانی</div>` : ''}
            ${fee.discount > 0 ? `<div>تخفیف: ${fee.discount}%</div>` : ''}
            <div>روش پرداخت: ${getMethodLabel(fee.payment_method)}</div>
            <div>وضعیت: <span class="status-badge" style="background: ${getPaymentStatus(fee.amount, fee.paid_amount, fee.discount).color}">${getPaymentStatus(fee.amount, fee.paid_amount, fee.discount).label}</span></div>
          </div>

          ${fee.description ? `<div style="color:#666;font-size:13px;margin:10px 0;"><strong>توضیحات:</strong> ${fee.description}</div>` : ''}
          ${fee.note ? `<div style="color:#666;font-size:13px;margin:10px 0;"><strong>یادداشت:</strong> ${fee.note}</div>` : ''}

          <div class="footer">
            <div>✅ این رسید به منزله تایید درخواست آزمایش می‌باشد</div>
            <div class="date">تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}</div>
            <div style="margin-top:5px;color:#999;font-size:10px;">لطفاً برای انجام آزمایش، این رسید را به لابراتوار همراه داشته باشید</div>
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 500);
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // ============ محاسبه مبلغ باقیمانده ============
  const calculateRemaining = (amount, paid, discount) => {
    const discountAmount = amount * (discount / 100);
    return amount - paid - discountAmount;
  };

  // ============ فرمت تاریخ ============
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fa-IR');
  };

  // ============ وضعیت پرداخت ============
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
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(barcode);
                    toast.success("✅ بارکد کپی شد");
                  }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '4px 15px',
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
              <div style={{ color: 'white', fontWeight: 'bold' }}>{registration?.visit_number || '-'}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>نام کامل</span>
              <div style={{ color: 'white' }}>{patient.first_name || ''} {patient.last_name || ''}</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>سن</span>
              <div style={{ color: 'white' }}>{patient.age || '-'} سال</div>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>تماس</span>
              <div style={{ color: 'white' }}>{patient.mobile || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ============ لیست درخواست‌های لابراتوار ============ */}
      <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>
        📋 درخواست‌های لابراتوار
        <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '10px' }}>
          ({laboratoryRequests.length} درخواست بدون فیس)
        </span>
      </h4>

      {laboratoryRequests.length === 0 && feeRecords.length === 0 ? (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
          <div>هیچ درخواست لابراتواری برای این مریض ثبت نشده است</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {/* درخواست‌های بدون فیس */}
          {laboratoryRequests.map((request) => (
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
                </div>
                {request.test_description && (
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>
                    {request.test_description}
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

          {/* فیس‌های ثبت شده */}
          {feeRecords.length > 0 && (
            <>
              <h4 style={{ color: '#10b981', marginTop: '20px', marginBottom: '10px' }}>
                ✅ فیس‌های ثبت شده
                <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '10px' }}>
                  ({feeRecords.length} فیس)
                </span>
              </h4>
              
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
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                          {getMethodLabel(fee.payment_method)}
                        </span>
                      </div>
                      {fee.description && (
                        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px' }}>
                          {fee.description}
                        </div>
                      )}
                      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                        📅 {formatDate(fee.created_at)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handlePrint(fee)}
                        style={{
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        🖨️ پرنت
                      </button>
                      <button
                        onClick={() => handleEditFee(fee)}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ تصحیح
                      </button>
                      <button
                        onClick={() => handleDeleteFee(fee.id)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
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

            {/* بارکد مریض */}
            {barcode && (
              <div style={{
                backgroundColor: '#0f1a2a',
                padding: '10px 15px',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #374151'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>📊 بارکد مریض:</span>
                <span style={{ color: '#fcd34d', fontFamily: 'monospace', fontSize: '16px', letterSpacing: '2px' }}>
                  {barcode}
                </span>
              </div>
            )}

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