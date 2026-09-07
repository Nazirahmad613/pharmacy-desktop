// src/app/pages/operationFeesRequest/OperationFeeTab.jsx

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function OperationFeeTab({ api, regId }) {
  const [loading, setLoading] = useState(false);
  const [operationRequests, setOperationRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    total_amount: 0,
    total_paid: 0,
    total_remaining: 0,
    today: 0,
    today_amount: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debugErrors, setDebugErrors] = useState(null);
  const [activeTab, setActiveTab] = useState('unpaid');

  const [feeFormData, setFeeFormData] = useState({
    total_amount: "",
    paid_amount: "",
    discount: "0",
    payment_method: "cash",
    description: "",
    note: ""
  });

  useEffect(() => {
    fetchAllData();
  }, [regId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOperationRequests(),
        fetchFeeRecords(),
        fetchStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationRequests = async () => {
    try {
      const url = `/operation/requests?per_page=100`;
      
      console.log("📋 دریافت همه درخواست‌های عملیات:", url);

      const response = await api.get(url);

      let requests = [];

      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          requests = response.data.data.data;
        } else if (Array.isArray(response.data?.data)) {
          requests = response.data.data;
        }
        
        console.log(`✅ ${requests.length} درخواست عملیات دریافت شد`);
      }

      setOperationRequests(requests);

    } catch (err) {
      console.error("❌ خطا:", err);
      setOperationRequests([]);
    }
  };

  const fetchFeeRecords = async () => {
    try {
      const url = regId
        ? `/operation/fees?per_page=100&reg_id=${regId}`
        : '/operation/fees?per_page=100';

      const response = await api.get(url);
      console.log("💳 فیس‌های عملیات:", response.data);

      let fees = [];
      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          fees = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          fees = response.data.data;
        } else if (Array.isArray(response.data)) {
          fees = response.data;
        }
        
        if (regId) {
          fees = fees.filter(f => f.reg_id == regId);
        }
      }
      
      console.log(`✅ ${fees.length} فیس عملیات دریافت شد`);
      setFeeRecords(fees);
    } catch (err) {
      console.error("❌ خطا در دریافت فیس‌ها:", err);
      setFeeRecords([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/operation/fees/statistics');
      console.log("📊 آمار فیس‌ها:", response.data);

      if (response.data?.success && response.data?.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("❌ خطا در دریافت آمار:", err);
    }
  };

  const handleOpenFeeForm = (request) => {
    console.log("💰 باز کردن فرم اخذ فیس برای:", request);
    
    if (request.fee_id) {
      toast.warning("⚠️ این درخواست قبلاً فیس دارد");
      return;
    }
    
    setSelectedRequest(request);
    setEditingFee(null);
    setDebugErrors(null);
    
    setFeeFormData({
      total_amount: "",
      paid_amount: "",
      discount: "0",
      payment_method: "cash",
      description: `عملیات: ${request.surgery_type || 'عملیات عمومی'} - جراح: ${request.surgeon || ''}`,
      note: `مراجعه #${request.reg_id || request.registration_id} - درخواست #${request.id}`
    });
    setShowFeeForm(true);
  };

  const handleOpenEditFeeForm = (fee) => {
    console.log("✏️ باز کردن فرم ویرایش فیس:", fee);
    if (!fee || !fee.id) {
      toast.error("❌ اطلاعات فیس معتبر نیست");
      return;
    }
    
    // بررسی وضعیت پرداخت - اگر پرداخت کامل شده باشد، اجازه ویرایش نده
    const status = fee.payment_status || fee.status || '';
    if (status.toLowerCase() === 'paid') {
      toast.warning("⚠️ این فیس قبلاً پرداخت کامل شده است و قابل ویرایش نمی‌باشد");
      return;
    }
    
    setEditingFee(fee);
    setSelectedRequest(null);
    setDebugErrors(null);
    
    setFeeFormData({
      total_amount: fee.total_amount?.toString() || "",
      paid_amount: fee.paid_amount?.toString() || "",
      discount: fee.discount_percent?.toString() || "0",
      payment_method: fee.payment_method || "cash",
      description: fee.description || "",
      note: fee.note || ""
    });
    setShowFeeForm(true);
  };

  const handleSubmitFee = async (e) => {
    e.preventDefault();

    if (!feeFormData.total_amount || parseFloat(feeFormData.total_amount) <= 0) {
      toast.warning("⚠️ لطفاً مبلغ کل را وارد کنید");
      return;
    }

    if (!selectedRequest && !editingFee) {
      toast.error("❌ هیچ درخواستی انتخاب نشده است");
      return;
    }

    setLoading(true);
    setDebugErrors(null);

    try {
      let payload;
      let response;
      
      if (editingFee) {
        // بررسی مجدد وضعیت فیس قبل از ارسال درخواست ویرایش
        const status = editingFee.payment_status || editingFee.status || '';
        if (status.toLowerCase() === 'paid') {
          toast.warning("⚠️ این فیس قبلاً پرداخت کامل شده است و قابل ویرایش نمی‌باشد");
          setLoading(false);
          return;
        }
        
        payload = {
          total_amount: parseFloat(feeFormData.total_amount),
          paid_amount: parseFloat(feeFormData.paid_amount) || 0,
          discount_percent: parseFloat(feeFormData.discount) || 0,
          payment_method: feeFormData.payment_method,
          description: feeFormData.description,
          note: feeFormData.note
        };
        
        console.log("📤 ارسال payload ویرایش:", payload);
        response = await api.put(`/operation/fees/${editingFee.id}`, payload);
        toast.success("✅ فیس عملیات با موفقیت ویرایش شد");
        
      } else {
        payload = {
          operation_request_id: selectedRequest.id,
          reg_id: selectedRequest.reg_id || selectedRequest.registration_id,
          patient_id: selectedRequest.patient_id,
          total_amount: parseFloat(feeFormData.total_amount),
          paid_amount: parseFloat(feeFormData.paid_amount) || 0,
          discount: parseFloat(feeFormData.discount) || 0,
          payment_method: feeFormData.payment_method,
          description: feeFormData.description,
          note: feeFormData.note
        };
        
        console.log("📤 ارسال payload ثبت:", payload);
        response = await api.post('/operation/fees', payload);
        toast.success("✅ فیس عملیات با موفقیت ثبت شد");
      }

      console.log("✅ پاسخ ثبت فیس:", response.data);

      await fetchAllData();
      handleCloseForm();

    } catch (err) {
      console.error("❌ خطا در ثبت فیس:", err);
      
      if (err.response?.status === 422) {
        const errorData = err.response.data;
        setDebugErrors(errorData);
        console.log("📋 خطاهای اعتبارسنجی:", errorData);
        
        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            const fieldLabels = {
              'operation_request_id': 'شناسه درخواست عملیات',
              'reg_id': 'شناسه مراجعه',
              'patient_id': 'شناسه مریض',
              'total_amount': 'مبلغ کل',
              'paid_amount': 'مبلغ پرداخت شده',
              'discount': 'تخفیف',
              'discount_percent': 'درصد تخفیف',
              'payment_method': 'روش پرداخت',
              'description': 'توضیحات',
              'note': 'یادداشت'
            };
            const label = fieldLabels[field] || field;
            const message = Array.isArray(messages) ? messages.join(', ') : messages;
            toast.error(`❌ ${label}: ${message}`);
          });
        } else if (errorData.message) {
          toast.error(`❌ ${errorData.message}`);
        } else {
          toast.error("❌ داده‌های ارسالی معتبر نیستند. لطفاً همه فیلدها را بررسی کنید.");
        }
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا: ${err.message || "خطا در ثبت فیس"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFee = async (feeId) => {
    console.log("🗑️ درخواست حذف فیس با ID:", feeId);
    if (!feeId) {
      toast.error("❌ شناسه فیس معتبر نیست");
      return;
    }
    if (!window.confirm("⚠️ آیا مطمئن هستید که می‌خواهید این فیس را حذف کنید؟")) return;
    
    setLoading(true);
    try {
      await api.delete(`/operation/fees/${feeId}`);
      toast.success("✅ فیس عملیات با موفقیت حذف شد");
      await fetchAllData();
    } catch (err) {
      console.error("❌ خطا در حذف فیس:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || "خطا در حذف فیس"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowFeeForm(false);
    setSelectedRequest(null);
    setEditingFee(null);
    setDebugErrors(null);
    setFeeFormData({
      total_amount: "",
      paid_amount: "",
      discount: "0",
      payment_method: "cash",
      description: "",
      note: ""
    });
  };

  // تابع پرینت برای درخواست‌های بدون فیس
  const handlePrintRequest = (request) => {
    console.log("🖨️ پرینت درخواست:", request);
    if (!request) {
      toast.error("❌ اطلاعات درخواست معتبر نیست");
      return;
    }
    const printContent = `
      <div style="font-family: 'IRANSans', Arial, sans-serif; direction: rtl; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; color: #1a1a2e; border-bottom: 3px solid #dc2626; padding-bottom: 10px;">📋 گزارش درخواست عملیات</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef; width: 40%;">نام بیمار</th>
              <td style="padding: 8px;">${getPatientFullName(request)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">شماره مراجعه</th>
              <td style="padding: 8px;">${request.reg_id || request.registration_id || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">نوع جراحی</th>
              <td style="padding: 8px;">${request.surgery_type || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">جراح</th>
              <td style="padding: 8px;">${request.surgeon || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">متخصص بیهوشی</th>
              <td style="padding: 8px;">${request.anesthesiologist || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">شماره اتاق عمل</th>
              <td style="padding: 8px;">${request.room_number || '-'}</td>
            </tr>
            ${request.scheduled_date ? `<tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">تاریخ و زمان</th>
              <td style="padding: 8px;">${formatDateTime(request.scheduled_date)}</td>
            </tr>` : ''}
            ${request.estimated_duration ? `<tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">مدت زمان تخمینی</th>
              <td style="padding: 8px;">${request.estimated_duration}</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت</th>
              <td style="padding: 8px;">${request.status_label || request.status || 'در انتظار'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">اولویت</th>
              <td style="padding: 8px;">${request.priority === 'high' ? 'بالا' : request.priority === 'medium' ? 'متوسط' : request.priority === 'normal' ? 'عادی' : 'پایین'}</td>
            </tr>
            <tr>
              <th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت فیس</th>
              <td style="padding: 8px; color: #f59e0b; font-weight: bold;">❌ فیس ثبت نشده است</td>
            </tr>
            ${request.notes ? `<tr>
              <th style="text-align: right; padding: 8px; background: #e9ecef;">یادداشت</th>
              <td style="padding: 8px;">${request.notes}</td>
            </tr>` : ''}
          </table>
        </div>
        <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>پرینت گزارش درخواست عملیات</title>
            <style>
              body { font-family: 'IRANSans', Arial, sans-serif; }
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("❌ خطا در باز کردن پنجره پرینت");
    }
  };

  // تابع پرینت برای فیس
  const handlePrintFee = (fee, request) => {
    console.log("🖨️ پرینت فیس:", fee, "درخواست:", request);
    if (!fee) {
      toast.error("❌ اطلاعات فیس معتبر نیست");
      return;
    }
    const amount = parseFloat(fee.total_amount) || 0;
    const paid = parseFloat(fee.paid_amount) || 0;
    const remaining = amount - paid - (amount * (parseFloat(fee.discount_percent) || 0) / 100);

    const printContent = `
      <div style="font-family: 'IRANSans', Arial, sans-serif; direction: rtl; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h2 style="text-align: center; color: #1a1a2e; border-bottom: 3px solid #dc2626; padding-bottom: 10px;">💰 گزارش فیس عملیات</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef; width: 40%;">نام بیمار</th>
              <td style="padding: 8px;">${request ? getPatientFullName(request) : fee.patient_name || 'نامشخص'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">شماره مراجعه</th>
              <td style="padding: 8px;">${fee.reg_id || fee.registration_id || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">نوع جراحی</th>
              <td style="padding: 8px;">${request?.surgery_type || fee.surgery_type || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">جراح</th>
              <td style="padding: 8px;">${request?.surgeon || fee.surgeon || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd; background: #fef3c7;">
              <th style="text-align: right; padding: 8px; background: #fcd34d;">💰 مبلغ کل</th>
              <td style="padding: 8px; font-weight: bold; color: #dc2626;">${amount.toFixed(2)} ؋</td>
            </tr>
            ${fee.discount_percent > 0 ? `<tr style="border-bottom: 1px solid #ddd; background: #fef3c7;">
              <th style="text-align: right; padding: 8px; background: #fcd34d;">تخفیف</th>
              <td style="padding: 8px; font-weight: bold; color: #f59e0b;">${fee.discount_percent}%</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #ddd; background: #d1fae5;">
              <th style="text-align: right; padding: 8px; background: #34d399;">پرداخت شده</th>
              <td style="padding: 8px; font-weight: bold; color: #22c55e;">${paid.toFixed(2)} ؋</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd; background: #fee2e2;">
              <th style="text-align: right; padding: 8px; background: #fca5a5;">باقیمانده</th>
              <td style="padding: 8px; font-weight: bold; color: #dc2626;">${remaining.toFixed(2)} ؋</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">روش پرداخت</th>
              <td style="padding: 8px;">${getMethodLabel(fee.payment_method)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">وضعیت پرداخت</th>
              <td style="padding: 8px; color: ${getStatusColor(fee.payment_status)}; font-weight: bold;">${getStatusLabel(fee.payment_status)}</td>
            </tr>
            ${fee.description ? `<tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: right; padding: 8px; background: #e9ecef;">توضیحات</th>
              <td style="padding: 8px;">${fee.description}</td>
            </tr>` : ''}
            ${fee.note ? `<tr>
              <th style="text-align: right; padding: 8px; background: #e9ecef;">یادداشت</th>
              <td style="padding: 8px;">${fee.note}</td>
            </tr>` : ''}
          </table>
        </div>
        <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>پرینت گزارش فیس عملیات</title>
            <style>
              body { font-family: 'IRANSans', Arial, sans-serif; }
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("❌ خطا در باز کردن پنجره پرینت");
    }
  };

  const getMethodLabel = (method) => {
    const methods = {
      cash: 'نقدی',
      card: 'کارت بانکی',
      online: 'آنلاین',
      insurance: 'بیمه'
    };
    return methods[method] || method || '-';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'در انتظار پرداخت',
      partial: 'پرداخت ناقص',
      paid: 'پرداخت کامل',
      refunded: 'برگشت داده شده',
      cancelled: 'لغو شده'
    };
    return labels[status] || status || 'نامشخص';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      partial: '#f97316',
      paid: '#22c55e',
      refunded: '#8b5cf6',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('fa-IR');
    } catch {
      return '-';
    }
  };

  const getPatientFullName = (request) => {
    if (request.patient?.first_name || request.patient?.last_name) {
      return `${request.patient.first_name || ''} ${request.patient.last_name || ''}`.trim() || 'نامشخص';
    }
    return request.patient_name || 'نامشخص';
  };

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // تقسیم درخواست‌ها به دو دسته بر اساس fee_id
  const unpaidRequests = operationRequests.filter(r => !r.fee_id);
  const paidRequests = operationRequests.filter(r => r.fee_id);

  const filterBySearch = (requests) => {
    if (!searchTerm.trim()) return requests;
    const term = searchTerm.trim().toLowerCase();
    return requests.filter(r => {
      const patientName = getPatientFullName(r).toLowerCase();
      return patientName.includes(term) ||
        r.surgery_type?.toLowerCase().includes(term) ||
        r.surgeon?.toLowerCase().includes(term) ||
        String(r.reg_id || r.registration_id).includes(term);
    });
  };

  const filteredUnpaid = filterBySearch(unpaidRequests);
  const filteredPaid = filterBySearch(paidRequests);

  return (
    <div>
      {/* آمار */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#1f2937',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.total || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>مجموع</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>در انتظار</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{stats.partial || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>ناقص</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{stats.paid || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>پرداخت شده</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{stats.total_paid?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>مبلغ پرداخت</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>{stats.total_remaining?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>باقیمانده</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa' }}>{stats.today || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>امروز</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fcd34d' }}>{stats.today_amount?.toFixed(2) || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>فیس امروز</div>
        </div>
      </div>

      {/* هدر */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px 20px',
        borderRadius: '10px',
        marginBottom: '20px',
        borderBottom: '3px solid #dc2626'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ color: '#dc2626', margin: 0 }}>
              🔪 مدیریت فیس‌های عملیات
            </h3>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
              {regId ? `مراجعه #${regId}` : 'تمام درخواست‌های عملیات'}
            </div>
            <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
              {unpaidRequests.length} درخواست بدون فیس | {paidRequests.length} درخواست دارای فیس
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('unpaid')}
              style={{
                backgroundColor: activeTab === 'unpaid' ? '#f59e0b' : '#374151',
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
              onClick={() => setActiveTab('paid')}
              style={{
                backgroundColor: activeTab === 'paid' ? '#22c55e' : '#374151',
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
              onClick={fetchAllData}
              disabled={loading}
              style={{
                backgroundColor: '#374151',
                color: '#dc2626',
                padding: '6px 15px',
                borderRadius: '6px',
                border: '1px solid #dc2626',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳' : '🔄'} {loading ? 'در حال بارگذاری...' : 'بارگذاری مجدد'}
            </button>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="🔍 جستجوی نام مریض، نوع جراحی، جراح، شماره مراجعه..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 15px',
            borderRadius: '5px',
            border: '1px solid #374151',
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* ============ درخواست‌های بدون فیس ============ */}
      {activeTab === 'unpaid' && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '8px 12px',
            backgroundColor: '#f59e0b20',
            borderRadius: '6px',
            border: '1px solid #f59e0b'
          }}>
            <h4 style={{ color: '#f59e0b', margin: 0 }}>
              🟡 درخواست‌های بدون فیس ({filteredUnpaid.length})
            </h4>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              برای اخذ فیس روی دکمه "💰 اخذ فیس" کلیک کنید
            </span>
          </div>

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
          ) : filteredUnpaid.length === 0 ? (
            <div style={{
              backgroundColor: '#1a2a3a',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
              <div>همه درخواست‌ها فیس دارند</div>
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#6b7280' }}>
                برای مشاهده درخواست‌های دارای فیس، تب "🟢 دارای فیس" را انتخاب کنید
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {filteredUnpaid.map((request, index) => (
                <div
                  key={request.id || index}
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
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>#{index + 1}</span>
                      <span style={{ 
                        backgroundColor: '#0f1a2a',
                        color: '#dc2626',
                        padding: '2px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        مراجعه #{request.reg_id || request.registration_id}
                      </span>
                      <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '13px' }}>
                        {getPatientFullName(request)}
                      </span>
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        {request.surgery_type || 'عملیات'}
                      </span>
                      <span style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        ❌ بدون فیس
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '15px',
                      flexWrap: 'wrap',
                      marginTop: '5px',
                      padding: '5px 10px',
                      backgroundColor: '#0f1a2a',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#9ca3af'
                    }}>
                      <span>👨‍⚕️ جراح: {request.surgeon || 'نامشخص'}</span>
                      <span>💉 بیهوشی: {request.anesthesiologist || 'نامشخص'}</span>
                      {request.scheduled_date && (
                        <span>📅 {formatDateTime(request.scheduled_date)}</span>
                      )}
                      <span>وضعیت: {request.status_label || request.status || 'در انتظار'}</span>
                    </div>
                    
                    {request.notes && (
                      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                        📝 {request.notes}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenFeeForm(request)}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      💰 اخذ فیس
                    </button>
                    <button
                      onClick={() => handlePrintRequest(request)}
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🖨️ پرینت
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============ درخواست‌های دارای فیس ============ */}
      {activeTab === 'paid' && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '8px 12px',
            backgroundColor: '#22c55e20',
            borderRadius: '6px',
            border: '1px solid #22c55e'
          }}>
            <h4 style={{ color: '#22c55e', margin: 0 }}>
              🟢 درخواست‌های دارای فیس ({filteredPaid.length})
            </h4>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              برای ویرایش/پرینت/حذف فیس روی دکمه‌ها کلیک کنید
            </span>
          </div>

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
          ) : filteredPaid.length === 0 ? (
            <div style={{
              backgroundColor: '#1a2a3a',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
              <div>هیچ درخواست دارای فیس وجود ندارد</div>
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#6b7280' }}>
                برای مشاهده درخواست‌های بدون فیس، تب "🟡 بدون فیس" را انتخاب کنید
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {filteredPaid.map((request, index) => {
                const fee = feeRecords.find(f => f.operation_request_id === request.id);
                // اگر fee وجود نداشت، از داده‌های خود request استفاده کن
                const feeData = fee || {
                  id: request.fee_id,
                  total_amount: request.fee_amount || 0,
                  paid_amount: request.fee_paid || 0,
                  discount_percent: 0,
                  payment_method: 'cash',
                  payment_status: 'pending',
                  description: '',
                  note: '',
                  reg_id: request.reg_id || request.registration_id,
                  patient_name: request.patient_name
                };
                
                // بررسی اینکه آیا فیس پرداخت کامل شده است
                const status = feeData.payment_status || feeData.status || '';
                const isPaid = status.toLowerCase() === 'paid';
                
                return (
                  <div
                    key={request.id || index}
                    style={{
                      backgroundColor: '#1a2a3a',
                      padding: '15px 20px',
                      borderRadius: '8px',
                      borderRight: '4px solid #22c55e',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>#{index + 1}</span>
                        <span style={{ 
                          backgroundColor: '#0f1a2a',
                          color: '#dc2626',
                          padding: '2px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          مراجعه #{request.reg_id || request.registration_id}
                        </span>
                        <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '13px' }}>
                          {getPatientFullName(request)}
                        </span>
                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                          {request.surgery_type || 'عملیات'}
                        </span>
                        <span style={{
                          backgroundColor: '#22c55e',
                          color: 'white',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          ✅ دارای فیس
                        </span>
                        {feeData && (
                          <span style={{
                            backgroundColor: getStatusColor(feeData.payment_status),
                            color: 'white',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {getStatusLabel(feeData.payment_status)}
                          </span>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '15px',
                        flexWrap: 'wrap',
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: '#0f1a2a',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}>
                        <span>👨‍⚕️ جراح: {request.surgeon || 'نامشخص'}</span>
                        <span>💉 بیهوشی: {request.anesthesiologist || 'نامشخص'}</span>
                        {request.scheduled_date && (
                          <span>📅 {formatDateTime(request.scheduled_date)}</span>
                        )}
                        <span>وضعیت: {request.status_label || request.status || 'در انتظار'}</span>
                      </div>

                      {feeData && (
                        <div style={{
                          marginTop: '5px',
                          padding: '5px 10px',
                          backgroundColor: '#0f1a2a',
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          gap: '15px',
                          flexWrap: 'wrap',
                          border: '1px solid #22c55e'
                        }}>
                          <span style={{ color: '#fcd34d' }}>
                            💰 مبلغ کل: {toNumber(feeData.total_amount).toFixed(2)} ؋
                          </span>
                          <span style={{ color: '#22c55e' }}>
                            پرداخت: {toNumber(feeData.paid_amount).toFixed(2)} ؋
                          </span>
                          {feeData.discount_percent > 0 && (
                            <span style={{ color: '#f59e0b' }}>
                              تخفیف: {feeData.discount_percent}%
                            </span>
                          )}
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                            باقیمانده: {(toNumber(feeData.total_amount) - toNumber(feeData.paid_amount) - (toNumber(feeData.total_amount) * (toNumber(feeData.discount_percent) || 0) / 100)).toFixed(2)} ؋
                          </span>
                          <span style={{ color: '#9ca3af' }}>
                            روش: {getMethodLabel(feeData.payment_method)}
                          </span>
                        </div>
                      )}
                      
                      {request.notes && (
                        <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                          📝 {request.notes}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* دکمه ویرایش فیس - فقط در صورتی که فیس پرداخت کامل نشده باشد */}
                      {!isPaid && (
                        <button
                          onClick={() => {
                            console.log("🟡 کلیک ویرایش بر روی feeData:", feeData);
                            handleOpenEditFeeForm(feeData);
                          }}
                          style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#d97706'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f59e0b'}
                        >
                          ✏️ ویرایش
                        </button>
                      )}
                      
                      {/* دکمه پرینت فیس - برای همه */}
                      <button
                        onClick={() => {
                          console.log("🟣 کلیک پرینت بر روی feeData:", feeData);
                          handlePrintFee(feeData, request);
                        }}
                        style={{
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                      >
                        🖨️ پرینت
                      </button>
                      
                      {/* دکمه حذف فیس - برای همه */}
                      <button
                        onClick={() => {
                          console.log("🔴 کلیک حذف بر روی feeData:", feeData);
                          handleDeleteFee(feeData.id);
                        }}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* نمایش خطاهای دیباگ */}
      {debugErrors && (
        <div style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '15px',
          marginTop: '20px',
          color: '#fca5a5',
          fontSize: '12px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#ef4444', 
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>⚠️ خطاهای اعتبارسنجی:</span>
            <button
              onClick={() => setDebugErrors(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '11px'
          }}>
            {JSON.stringify(debugErrors, null, 2)}
          </pre>
        </div>
      )}

      {/* فرم ثبت/ویرایش فیس */}
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
            <h4 style={{ color: '#dc2626', marginBottom: '20px' }}>
              {editingFee ? '✏️ تصحیح فیس عملیات' : '💰 اخذ فیس عملیات'}
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
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{selectedRequest.reg_id || selectedRequest.registration_id}</div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>🔪 نوع جراحی</span>
                    <div style={{ color: 'white' }}>{selectedRequest.surgery_type || '-'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>👨‍⚕️ جراح</span>
                    <div style={{ color: 'white' }}>{selectedRequest.surgeon || '-'}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>📋 شناسه درخواست</span>
                    <div style={{ color: 'white' }}>#{selectedRequest.id}</div>
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
                  مراجعه #{editingFee.reg_id || editingFee.registration_id} | وضعیت: {getStatusLabel(editingFee.payment_status)}
                </div>
                {editingFee.operation_request_id && (
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                    درخواست #{editingFee.operation_request_id}
                  </div>
                )}
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
                    value={feeFormData.total_amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, total_amount: e.target.value })}
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

              {feeFormData.total_amount && (
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
                    {(
                      parseFloat(feeFormData.total_amount || 0) - 
                      parseFloat(feeFormData.paid_amount || 0) - 
                      (parseFloat(feeFormData.total_amount || 0) * parseFloat(feeFormData.discount || 0) / 100)
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
                    backgroundColor: loading ? '#6b7280' : '#dc2626',
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