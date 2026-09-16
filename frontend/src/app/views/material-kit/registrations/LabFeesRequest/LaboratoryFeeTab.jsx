// src/app/pages/laboratory/LaboratoryFeeTab.jsx

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

// ============ توابع کمکی ============
const toNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const calculateRemaining = (amount, paid, discountPercent) => {
  const amountNum = toNumber(amount || 0);
  const paidNum = toNumber(paid || 0);
  const discountNum = toNumber(discountPercent || 0);
  const discountAmount = (amountNum * discountNum) / 100;
  return Math.max(0, amountNum - paidNum - discountAmount);
};

// ============ استایل‌ها ============
const styles = {
  container: { padding: '0' },
  header: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #2a3a4a',
    color: 'white'
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ef4444'
  },
  headerSub: { margin: '8px 0 0', opacity: 0.9, fontSize: '13px', color: '#9ca3af' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '15px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #2a3a4a'
  },
  statBox: { textAlign: 'right' },
  statLabel: { color: '#9ca3af', fontSize: '12px' },
  statValue: { fontWeight: 'bold', fontSize: '18px', marginTop: '4px' },
  filters: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  searchInput: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '250px',
    flex: 1
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderRight: '4px solid #3b82f6',
    transition: 'all 0.2s ease'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    marginRight: '6px',
    marginBottom: '4px'
  },
  // کارت بیمار در مودال
  modalPatientCard: {
    padding: '16px',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderRadius: '10px',
    border: '2px solid #10b981',
    marginBottom: '16px'
  },
  modalPatientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  },
  modalInfoItem: {
    background: 'white',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1fae5'
  },
  modalInfoLabel: {
    fontSize: '11px',
    color: '#059669',
    fontWeight: 'bold',
    display: 'block',
    marginBottom: '4px'
  },
  modalInfoValue: { fontSize: '14px', color: '#1f2937', fontWeight: 'bold' },
  modalInfoValueNormal: { fontSize: '13px', color: '#374151' }
};

export default function LaboratoryFeeTab(props) {
  const { api } = props;
  const [loading, setLoading] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [unpaidRequests, setUnpaidRequests] = useState([]);
  const [paidRequests, setPaidRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
    fetchAllRequests();
    fetchFeeRecords();
  }, []);

  // ============ دریافت تمام درخواست‌ها ============
  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/laboratory-requests/all');
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        
        setAllRequests(data.all_requests || []);
        setUnpaidRequests(data.unpaid_requests || []);
        setPaidRequests(data.paid_requests || []);
        
        // درخواست‌های در انتظار = دارای فیس اما پرداخت ناقص
        const pending = (data.paid_requests || []).filter(req => {
          const fee = req.fee;
          if (!fee) return false;
          const remaining = calculateRemaining(
            fee.amount, fee.paid_amount, fee.discount
          );
          return remaining > 0;
        });
        setPendingRequests(pending);
      }
    } catch (err) {
      console.error("❌ خطا در دریافت درخواست‌ها:", err);
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  // ============ دریافت فیس‌های ثبت شده ============
  const fetchFeeRecords = async () => {
    try {
      const response = await api.get('/laboratory-fees');
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
    setSelectedRequest(request);
    setEditingFee(null);
    
    const defaultAmount = request.amount || 0;
    
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

  // ============ باز کردن فرم ویرایش فیس ============
  const handleOpenEditFeeForm = (fee) => {
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
        amount: parseFloat(feeFormData.amount),
        paid_amount: parseFloat(feeFormData.paid_amount) || 0,
        discount: parseFloat(feeFormData.discount) || 0,
        payment_method: feeFormData.payment_method,
        description: feeFormData.description,
        note: feeFormData.note,
        laboratory_request_ids: selectedRequest ? [selectedRequest.id] : []
      };

      let response;
      if (editingFee) {
        response = await api.put(`/laboratory-fees/${editingFee.id}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ویرایش شد");
      } else {
        response = await api.post(`/laboratory-fees/registration/${selectedRequest.reg_id}`, payload);
        toast.success("✅ فیس لابراتوار با موفقیت ثبت شد");
      }

      await fetchAllRequests();
      await fetchFeeRecords();
      handleCloseForm();

    } catch (err) {
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
    try { return new Date(date).toLocaleDateString('fa-IR'); }
    catch { return '-'; }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    try { return new Date(date).toLocaleString('fa-IR'); }
    catch { return '-'; }
  };

  const getPaymentStatus = (amount, paid, discount) => {
    const remaining = calculateRemaining(amount, paid, discount);
    if (remaining <= 0 && paid > 0) return { label: 'پرداخت کامل', color: '#22c55e' };
    if (paid > 0) return { label: 'پرداخت ناقص', color: '#f97316' };
    return { label: 'در انتظار پرداخت', color: '#f59e0b' };
  };

  const hasFee = (request) => {
    if (request.has_fee !== undefined) return request.has_fee === true;
    return request.fee_id !== null && request.fee_id !== undefined && request.fee_id !== 0;
  };

  const getFeeForRequest = (request) => {
    if (request && request.fee) return request.fee;
    return feeRecords.find(fee => 
      fee.laboratory_request_ids && fee.laboratory_request_ids.includes(request?.id)
    );
  };

  const getPatientFullName = (request) => {
    if (!request) return 'نامشخص';
    if (request.patient?.full_name) return request.patient.full_name;
    if (request.patient?.first_name) {
      return `${request.patient.first_name || ''} ${request.patient.last_name || ''}`.trim() || 'نامشخص';
    }
    if (request.patient_name) return request.patient_name;
    return 'نامشخص';
  };

  const getPatientAge = (request) => {
    if (!request) return '-';
    const age = request.patient?.age || request.age;
    return age ? `${age} سال` : '-';
  };

  const getPatientGender = (request) => {
    if (!request) return '-';
    let gender = request.patient?.gender || request.gender;
    if (gender) {
      const genderMap = {
        'Male': 'مرد', 'male': 'مرد', 'M': 'مرد',
        'Female': 'زن', 'female': 'زن', 'F': 'زن',
        'other': 'دیگر', 'Other': 'دیگر'
      };
      return genderMap[gender] || gender;
    }
    return '-';
  };

  const getPatientMobile = (request) => {
    if (!request) return '-';
    return request.patient?.mobile || request.patient?.phone || request.mobile || '-';
  };

  const getRegIdLabel = (regId) => {
    if (!regId) return 'نامشخص';
    return `مراجعه #${regId}`;
  };

  // ============ فیلتر جستجو ============
  const filterBySearch = (list) => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((item) => {
      const name = getPatientFullName(item).toLowerCase();
      const regId = String(item.reg_id || '').toLowerCase();
      const barcode = String(item.barcode || '').toLowerCase();
      const mobile = getPatientMobile(item);
      const testName = String(item.test_name || '').toLowerCase();
      return (
        name.includes(s) ||
        regId.includes(s) ||
        barcode.includes(s) ||
        mobile.includes(s) ||
        testName.includes(s)
      );
    });
  };

  // ============ کارت درخواست ============
  const renderRequestCard = (request, index, options = {}) => {
    const { isPending = false } = options;
    const hasFeeRecord = hasFee(request);
    const feeInfo = getFeeForRequest(request);
    
    const remainingAmount = feeInfo ? calculateRemaining(
      feeInfo.amount, feeInfo.paid_amount, feeInfo.discount
    ) : 0;

    const borderColor = !hasFeeRecord ? '#f59e0b' : (remainingAmount <= 0 ? '#22c55e' : '#f97316');

    return (
      <div
        key={request.id || index}
        style={{
          ...styles.card,
          borderRightColor: borderColor
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            {/* هدر کارت */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: '#3b82f6', color: 'white',
                width: '24px', height: '24px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 'bold'
              }}>
                {index + 1}
              </span>
              <span style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '15px' }}>
                👤 {getPatientFullName(request)}
              </span>
              <span style={{
                backgroundColor: '#f3f4f6', color: '#3b82f6',
                padding: '3px 10px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 'bold'
              }}>
                🔢 {getRegIdLabel(request.reg_id)}
              </span>
              {request.barcode && (
                <span style={{
                  backgroundColor: '#fef3c7', color: '#92400e',
                  padding: '3px 10px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  🏷️ {request.barcode}
                </span>
              )}
              <span style={{
                backgroundColor: !hasFeeRecord ? '#fee2e2' : '#d1fae5',
                color: !hasFeeRecord ? '#991b1b' : '#065f46',
                padding: '3px 10px', borderRadius: '12px',
                fontSize: '11px', fontWeight: 'bold'
              }}>
                {!hasFeeRecord ? '❌ بدون فیس' : (remainingAmount <= 0 ? '✅ پرداخت کامل' : '⏳ پرداخت ناقص')}
              </span>
              {isPending && (
                <span style={{
                  backgroundColor: '#fef3c7', color: '#92400e',
                  padding: '3px 10px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: 'bold'
                }}>
                  ⏰ در انتظار
                </span>
              )}
            </div>

            {/* اطلاعات آزمون */}
            <div style={{
              display: 'flex', gap: '12px', flexWrap: 'wrap',
              padding: '8px 12px', backgroundColor: '#f9fafb',
              borderRadius: '6px', border: '1px solid #e5e7eb',
              fontSize: '12px', marginBottom: '6px'
            }}>
              <span style={{ color: '#1e40af', fontWeight: 'bold' }}>
                🧪 {request.test_type_label || request.test_type || 'آزمایش'}
              </span>
              {request.test_name && (
                <span style={{ color: '#374151' }}>{request.test_name}</span>
              )}
            </div>

            {/* اطلاعات بیمار */}
            <div style={{
              display: 'flex', gap: '12px', flexWrap: 'wrap',
              fontSize: '12px', color: '#6b7280'
            }}>
              <span>🎂 {getPatientAge(request)}</span>
              <span>⚤ {getPatientGender(request)}</span>
              {getPatientMobile(request) !== '-' && (
                <span>📞 {getPatientMobile(request)}</span>
              )}
            </div>

            {/* تاریخ */}
            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '6px' }}>
              📅 {formatDateTime(request.request_date || request.created_at)}
            </div>

            {/* اطلاعات فیس */}
            {hasFeeRecord && feeInfo && (
              <div style={{
                marginTop: '8px', padding: '8px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderRadius: '6px', border: '1px solid #22c55e'
              }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                  <span style={{ color: '#d48806' }}>
                    💰 مبلغ کل: {toNumber(feeInfo.amount).toFixed(2)} AFN
                  </span>
                  <span style={{ color: '#16a34a' }}>
                    ✅ پرداخت شده: {toNumber(feeInfo.paid_amount).toFixed(2)} AFN
                  </span>
                  {toNumber(feeInfo.discount) > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      تخفیف: {toNumber(feeInfo.discount)}%
                    </span>
                  )}
                  <span style={{
                    color: remainingAmount <= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold'
                  }}>
                    📊 باقی‌مانده: {remainingAmount.toFixed(2)} AFN
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    روش: {getMethodLabel(feeInfo.payment_method)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* دکمه‌های عملیات */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexDirection: 'column' }}>
            {!hasFeeRecord ? (
              <button
                onClick={() => handleOpenFeeForm(request)}
                style={{
                  ...styles.btn,
                  backgroundColor: '#10b981', color: 'white',
                  padding: '10px 20px', fontSize: '13px'
                }}
              >
                💰 اخذ فیس
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleOpenEditFeeForm(feeInfo)}
                  style={{
                    ...styles.btn,
                    backgroundColor: '#f59e0b', color: 'white'
                  }}
                >
                  ✏️ ویرایش فیس
                </button>
                {remainingAmount <= 0 ? (
                  <span style={{
                    backgroundColor: '#d1fae5', color: '#065f46',
                    padding: '8px 15px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    ✅ پرداخت شده
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: '#fee2e2', color: '#991b1b',
                    padding: '8px 15px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    ⏳ باقی‌مانده: {remainingAmount.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ رندر لیست ============
  const renderList = (list, options = {}) => {
    const filtered = filterBySearch(list);

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: '#9ca3af' }}>در حال بارگذاری...</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#9ca3af' }}>
            {search ? 'هیچ نتیجه‌ای برای جستجو یافت نشد' : 'هیچ درخواستی وجود ندارد'}
          </div>
        </div>
      );
    }

    return (
      <div>
        {filtered.map((item, index) => renderRequestCard(item, index, options))}
      </div>
    );
  };

  // ============ رندر مودال اطلاعات بیمار ============
  const ModalPatientInfo = ({ request }) => {
    if (!request) return null;
    
    return (
      <div style={styles.modalPatientCard}>
        <div style={styles.modalPatientGrid}>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>👤 نام بیمار</span>
            <div style={styles.modalInfoValue}>{getPatientFullName(request)}</div>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>🆔 شماره مراجعه</span>
            <div style={styles.modalInfoValue}>{request.reg_id || '-'}</div>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>🎂 سن / ⚤ جنسیت</span>
            <div style={styles.modalInfoValueNormal}>
              {getPatientAge(request)} / {getPatientGender(request)}
            </div>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>📞 تماس</span>
            <div style={styles.modalInfoValueNormal}>{getPatientMobile(request)}</div>
          </div>
          <div style={styles.modalInfoItem}>
            <span style={styles.modalInfoLabel}>🧪 آزمایش</span>
            <div style={styles.modalInfoValueNormal}>
              {request.test_type_label || request.test_type || 'آزمایش'}
              {request.test_name && ` - ${request.test_name}`}
            </div>
          </div>
          {request.barcode && (
            <div style={styles.modalInfoItem}>
              <span style={styles.modalInfoLabel}>🏷️ بارکد</span>
              <div style={styles.modalInfoValue}>{request.barcode}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ آیتم‌های تب ============
  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          📋 همه
          <span style={{
            marginLeft: '8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {allRequests.length}
          </span>
        </span>
      ),
      children: renderList(allRequests)
    },
    {
      key: 'unpaid',
      label: (
        <span>
          🟡 بدون فیس
          <span style={{
            marginLeft: '8px',
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {unpaidRequests.length}
          </span>
        </span>
      ),
      children: renderList(unpaidRequests)
    },
    {
      key: 'paid',
      label: (
        <span>
          🟢 دارای فیس
          <span style={{
            marginLeft: '8px',
            backgroundColor: '#22c55e',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {paidRequests.length}
          </span>
        </span>
      ),
      children: renderList(paidRequests)
    },
    {
      key: 'pending',
      label: (
        <span>
          ⏳ در انتظار
          <span style={{
            marginLeft: '8px',
            backgroundColor: '#f97316',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {pendingRequests.length}
          </span>
        </span>
      ),
      children: renderList(pendingRequests, { isPending: true })
    }
  ];

  // ============ رندر اصلی ============
  return (
    <div style={styles.container}>
      {/* هدر */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={styles.headerTitle}>
              🧪 مدیریت فیس‌های لابراتوار
            </h3>
            <div style={styles.headerSub}>
              تمام درخواست‌های لابراتوار تمام مراجعه‌کنندگان
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { fetchAllRequests(); fetchFeeRecords(); }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              🔄 بروزرسانی
            </button>
          </div>
        </div>

        {/* آمار */}
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>📊 کل درخواست‌ها</div>
            <div style={{ ...styles.statValue, color: 'white' }}>{allRequests.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>🟡 بدون فیس</div>
            <div style={{ ...styles.statValue, color: '#f59e0b' }}>{unpaidRequests.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>🟢 دارای فیس</div>
            <div style={{ ...styles.statValue, color: '#22c55e' }}>{paidRequests.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>⏳ در انتظار</div>
            <div style={{ ...styles.statValue, color: '#f97316' }}>{pendingRequests.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>💵 فیس‌های ثبت شده</div>
            <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{feeRecords.length}</div>
          </div>
        </div>
      </div>

      {/* فیلد جستجو */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 جستجوی نام، شماره مراجعه، بارکد، موبایل یا نام آزمایش..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* تب‌ها */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                backgroundColor: activeTab === tab.key ? '#3b82f6' : '#f3f4f6',
                color: activeTab === tab.key ? 'white' : '#374151'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* محتوای تب فعال */}
        <div>
          {tabItems.find(t => t.key === activeTab)?.children}
        </div>
      </div>

      {/* ============ مودال فرم اخذ فیس ============ */}
      {showFeeForm && (selectedRequest || editingFee) && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#10b981', margin: 0 }}>
                {editingFee ? '✏️ تصحیح فیس لابراتوار' : '💰 اخذ فیس لابراتوار'}
              </h3>
              <button
                onClick={handleCloseForm}
                style={{
                  backgroundColor: '#6b7280', color: 'white',
                  padding: '6px 14px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer', fontSize: '13px'
                }}
              >
                ✕ بستن
              </button>
            </div>

            {selectedRequest && <ModalPatientInfo request={selectedRequest} />}

            {editingFee && (
              <div style={{
                padding: '15px',
                backgroundColor: '#eff6ff',
                borderRadius: '10px',
                border: '1px solid #3b82f6',
                marginBottom: '16px'
              }}>
                <div style={{ color: '#1e40af', fontSize: '13px', fontWeight: 'bold' }}>
                  ✏️ در حال ویرایش فیس #{editingFee.id}
                </div>
                {editingFee.barcode && (
                  <div style={{ color: '#1e40af', fontSize: '12px', marginTop: '4px' }}>
                    🏷️ بارکد: {editingFee.barcode}
                  </div>
                )}
                <div style={{ color: '#1e40af', fontSize: '12px', marginTop: '4px' }}>
                  🔢 مراجعه: #{editingFee.reg_id}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitFee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    مبلغ کل (افغانی) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    مبلغ پرداخت شده
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeFormData.paid_amount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, paid_amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                    min="0"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    تخفیف (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={feeFormData.discount}
                    onChange={(e) => setFeeFormData({ ...feeFormData, discount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    روش پرداخت
                  </label>
                  <select
                    value={feeFormData.payment_method}
                    onChange={(e) => setFeeFormData({ ...feeFormData, payment_method: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="cash">نقدی</option>
                    <option value="card">کارت بانکی</option>
                    <option value="online">آنلاین</option>
                    <option value="insurance">بیمه</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    توضیحات
                  </label>
                  <textarea
                    value={feeFormData.description}
                    onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                    placeholder="توضیحات اضافی..."
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', color: '#374151', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                    یادداشت
                  </label>
                  <textarea
                    value={feeFormData.note}
                    onChange={(e) => setFeeFormData({ ...feeFormData, note: e.target.value })}
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px'
                    }}
                    placeholder="یادداشت..."
                  />
                </div>
              </div>

              {/* مبلغ باقی‌مانده */}
              {feeFormData.amount && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: calculateRemaining(
                    parseFloat(feeFormData.amount) || 0,
                    parseFloat(feeFormData.paid_amount) || 0,
                    parseFloat(feeFormData.discount) || 0
                  ) <= 0 ? '#f6ffed' : '#fff1f0',
                  borderRadius: '8px',
                  border: `1px solid ${calculateRemaining(
                    parseFloat(feeFormData.amount) || 0,
                    parseFloat(feeFormData.paid_amount) || 0,
                    parseFloat(feeFormData.discount) || 0
                  ) <= 0 ? '#b7eb8f' : '#ffa39e'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#595959', fontWeight: 'bold' }}>
                    📊 مبلغ باقی‌مانده:
                  </span>
                  <span style={{
                    color: calculateRemaining(
                      parseFloat(feeFormData.amount) || 0,
                      parseFloat(feeFormData.paid_amount) || 0,
                      parseFloat(feeFormData.discount) || 0
                    ) <= 0 ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>
                    {calculateRemaining(
                      parseFloat(feeFormData.amount) || 0,
                      parseFloat(feeFormData.paid_amount) || 0,
                      parseFloat(feeFormData.discount) || 0
                    ).toFixed(2)} AFN
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    backgroundColor: '#6b7280', color: 'white',
                    padding: '10px 30px', borderRadius: '8px',
                    border: 'none', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#6b7280' : '#10b981',
                    color: 'white',
                    padding: '10px 30px',
                    borderRadius: '8px',
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