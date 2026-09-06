// components/doctor/treatment/operation/OperationRoom.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";

export default function OperationRoom({ 
  api, 
  onSelectPatient, 
  onRefresh,
  onSave,
  onFinish,
  onNextStep,
  onPrevStep,
  currentStep,
  nextStep,
  prevStep,
  isSubmitting,
  isTreatmentComplete,
  registration, // تغییر: دریافت کل آبجکت registration
  registrationId, // برای سازگاری با نسخه قبلی
  patientId // برای سازگاری با نسخه قبلی
}) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("time");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isRequested, setIsRequested] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  });
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const [surgeryData, setSurgeryData] = useState({
    surgery_type: '',
    surgeon: '',
    anesthesiologist: '',
    room_number: '',
    scheduled_date: '',
    estimated_duration: '',
    notes: '',
    priority: 'normal'
  });
  const [feeInfo, setFeeInfo] = useState(null);
  const [operationRequests, setOperationRequests] = useState([]);

  const refreshInterval = useRef(null);
  const isMounted = useRef(true);

  // دریافت registrationId از props
  const getRegistrationId = () => {
    if (registrationId) return registrationId;
    if (registration?.reg_id) return registration.reg_id;
    if (registration?.id) return registration.id;
    return null;
  };

  const getPatientId = () => {
    if (patientId) return patientId;
    if (registration?.patient_id) return registration.patient_id;
    if (registration?.patient?.id) return registration.patient.id;
    return null;
  };

  const fetchPatients = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      // دریافت لیست درخواست‌های عملیات
      const response = await api.get("/operation/requests?per_page=100");
      console.log("📡 پاسخ درخواست‌های عملیات:", response.data);
      
      let data = [];
      let statsData = {};
      
      if (response.data?.success) {
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        
        if (response.data?.stats) {
          statsData = response.data.stats;
        }
      }

      // فیلتر بر اساس registrationId فعلی (اگر وجود داشته باشد)
      const currentRegId = getRegistrationId();
      let filteredData = data;
      if (currentRegId) {
        filteredData = data.filter(p => p.registration_id == currentRegId);
        // اگر داده‌ای برای این مراجعه وجود نداشت، یک رکورد خالی ایجاد کنیم
        if (filteredData.length === 0) {
          // یک رکورد پیش‌فرض برای نمایش ایجاد می‌کنیم
          filteredData = [{
            id: null,
            registration_id: currentRegId,
            patient_id: getPatientId(),
            patient_name: registration?.patient?.first_name + ' ' + registration?.patient?.last_name || 'مریض',
            surgery_type: '',
            status: 'pending',
            priority: 'normal',
            surgeon: '',
            anesthesiologist: '',
            room_number: '',
            estimated_duration: '',
            notes: '',
            fee_id: null,
            fee_status: null,
            fee_amount: null,
            fee_paid: null,
            created_at: new Date().toISOString()
          }];
        }
      }

      const processedData = filteredData.map(p => ({
        ...p,
        id: p.id || `temp_${Date.now()}_${Math.random()}`,
        patient_name: p.patient_name || 
                      (p.patient?.first_name && p.patient?.last_name 
                        ? `${p.patient.first_name} ${p.patient.last_name}`
                        : registration?.patient?.first_name + ' ' + registration?.patient?.last_name || 'مریض'),
        surgery_type: p.surgery_type || '',
        status: p.status || 'pending',
        priority: p.priority || 'normal',
        scheduled_date: p.scheduled_date || p.created_at,
        surgeon: p.surgeon || '',
        anesthesiologist: p.anesthesiologist || '',
        room_number: p.room_number || '',
        estimated_duration: p.estimated_duration || '',
        notes: p.notes || '',
        fee_id: p.fee_id,
        fee_status: p.fee_status,
        fee_amount: p.fee_amount,
        fee_paid: p.fee_paid
      }));

      if (isMounted.current) {
        setOperationRequests(processedData);
        setPatients(processedData);
        setStats({
          total: statsData.total || processedData.length,
          pending: statsData.pending || processedData.filter(p => p.status === 'pending').length,
          inProgress: statsData.in_progress || processedData.filter(p => p.status === 'in_progress').length,
          completed: statsData.completed || processedData.filter(p => p.status === 'completed').length,
          cancelled: statsData.cancelled || processedData.filter(p => p.status === 'cancelled').length
        });
      }
      
    } catch (err) {
      console.error("خطا در دریافت لیست عملیات:", err);
      if (isMounted.current) {
        toast.error("❌ خطا در دریافت لیست درخواست‌های عملیات");
        // اگر خطا بود، یک رکورد خالی برای مراجعه فعلی ایجاد می‌کنیم
        const currentRegId = getRegistrationId();
        if (currentRegId) {
          const emptyRecord = [{
            id: `temp_${Date.now()}`,
            registration_id: currentRegId,
            patient_id: getPatientId(),
            patient_name: registration?.patient?.first_name + ' ' + registration?.patient?.last_name || 'مریض',
            surgery_type: '',
            status: 'pending',
            priority: 'normal',
            surgeon: '',
            anesthesiologist: '',
            room_number: '',
            estimated_duration: '',
            notes: '',
            fee_id: null,
            fee_status: null,
            fee_amount: null,
            fee_paid: null,
            created_at: new Date().toISOString()
          }];
          setPatients(emptyRecord);
          setOperationRequests(emptyRecord);
        } else {
          setPatients([]);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [api, registration, registrationId]);

  // تابع برای دریافت جزئیات کامل یک عملیات با فیس
  const fetchOperationWithFee = useCallback(async (operationId) => {
    if (!operationId || operationId.toString().startsWith('temp_')) {
      // اگر ID موقت است، فیس وجود ندارد
      setFeeInfo(null);
      return null;
    }
    
    try {
      const response = await api.get(`/operation/${operationId}/with-fee`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setFeeInfo({
          hasFee: !!data.fee_id,
          feeDetails: data.fee_details || null,
          feeAmount: data.fee_amount,
          feePaid: data.fee_paid,
          feeStatus: data.fee_status,
          feeStatusLabel: data.fee_status_label
        });
        return data;
      }
    } catch (err) {
      console.error("خطا در دریافت جزئیات عملیات:", err);
    }
    return null;
  }, [api]);

  useEffect(() => {
    isMounted.current = true;
    fetchPatients();

    refreshInterval.current = setInterval(() => {
      if (isMounted.current) {
        fetchPatients();
      }
    }, 30000);

    return () => {
      isMounted.current = false;
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchPatients]);

  const handleRefresh = () => {
    fetchPatients();
    if (onRefresh) onRefresh();
    toast.info("🔄 لیست عملیات بروزرسانی شد");
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "#f59e0b", label: "⏳ در انتظار", bg: "#f59e0b20" },
      in_progress: { color: "#3b82f6", label: "🔄 در حال انجام", bg: "#3b82f620" },
      completed: { color: "#10b981", label: "✅ تکمیل شده", bg: "#10b98120" },
      cancelled: { color: "#ef4444", label: "❌ لغو شده", bg: "#ef444420" }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "bold",
        border: `1px solid ${config.color}`
      }}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: { color: "#ef4444", label: "🔴 بالا" },
      medium: { color: "#f59e0b", label: "🟡 متوسط" },
      normal: { color: "#3b82f6", label: "🔵 عادی" },
      low: { color: "#9ca3af", label: "⚪ پایین" }
    };
    const config = colors[priority] || colors.normal;
    return (
      <span style={{
        color: config.color,
        fontSize: "12px",
        fontWeight: "bold"
      }}>
        {config.label}
      </span>
    );
  };

  const getFeeStatusBadge = (feeStatus) => {
    if (!feeStatus) return null;
    const config = {
      pending: { color: "#f59e0b", label: "⏳ در انتظار پرداخت" },
      partial: { color: "#f97316", label: "💰 پرداخت ناقص" },
      paid: { color: "#22c55e", label: "✅ پرداخت کامل" },
      refunded: { color: "#8b5cf6", label: "↩️ برگشت داده شده" },
      cancelled: { color: "#ef4444", label: "❌ لغو شده" }
    };
    const c = config[feeStatus] || { color: "#6b7280", label: feeStatus };
    return (
      <span style={{
        color: c.color,
        fontSize: "11px",
        fontWeight: "bold",
        marginLeft: "8px"
      }}>
        {c.label}
      </span>
    );
  };

  const getFilteredPatients = () => {
    let result = [...patients];

    if (filter !== "all") {
      result = result.filter(p => p.status === filter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(p =>
        p.patient_name?.toLowerCase().includes(term) ||
        p.surgery_type?.toLowerCase().includes(term) ||
        p.surgeon?.toLowerCase().includes(term) ||
        p.room_number?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let compareA, compareB;
      switch(sortBy) {
        case 'time':
          compareA = new Date(a.scheduled_date || 0);
          compareB = new Date(b.scheduled_date || 0);
          break;
        case 'name':
          compareA = a.patient_name || '';
          compareB = b.patient_name || '';
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, normal: 2, low: 3 };
          compareA = priorityOrder[a.priority] || 999;
          compareB = priorityOrder[b.priority] || 999;
          break;
        default:
          compareA = a.id || 0;
          compareB = b.id || 0;
      }
      return sortOrder === 'asc' ? (compareA > compareB ? 1 : -1) : (compareA < compareB ? 1 : -1);
    });

    return result;
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowSurgeryForm(true);
    
    // دریافت جزئیات کامل با فیس
    if (patient.id && !patient.id.toString().startsWith('temp_')) {
      await fetchOperationWithFee(patient.id);
    } else {
      setFeeInfo(null);
    }
    
    setSurgeryData({
      surgery_type: patient.surgery_type || '',
      surgeon: patient.surgeon || '',
      anesthesiologist: patient.anesthesiologist || '',
      room_number: patient.room_number || '',
      scheduled_date: patient.scheduled_date ? new Date(patient.scheduled_date).toISOString().slice(0, 16) : '',
      estimated_duration: patient.estimated_duration || '',
      notes: patient.notes || '',
      priority: patient.priority || 'normal'
    });
  };

  const handleSurgerySubmit = async (e) => {
  e.preventDefault();
  
  // اعتبارسنجی سمت کلاینت
  const errors = [];
  if (!surgeryData.surgery_type || surgeryData.surgery_type.trim() === '') {
    errors.push('نوع جراحی الزامی است');
  }
  if (!surgeryData.surgeon || surgeryData.surgeon.trim() === '') {
    errors.push('نام جراح الزامی است');
  }
  
  if (errors.length > 0) {
    errors.forEach(err => toast.warning(`⚠️ ${err}`));
    return;
  }

  const regId = getRegistrationId();
  const patId = getPatientId();

  if (!regId) {
    toast.error("❌ شناسه مراجعه یافت نشد");
    return;
  }

  setLoading(true);
  try {
    const payload = {
      registration_id: parseInt(regId),
      patient_id: patId ? parseInt(patId) : null,
      surgery_type: surgeryData.surgery_type.trim(),
      surgeon: surgeryData.surgeon.trim(),
      anesthesiologist: surgeryData.anesthesiologist?.trim() || '',
      room_number: surgeryData.room_number?.trim() || '',
      scheduled_date: surgeryData.scheduled_date || null,
      estimated_duration: surgeryData.estimated_duration?.trim() || '',
      notes: surgeryData.notes?.trim() || '',
      priority: surgeryData.priority || 'normal'
    };

    console.log("📤 ارسال درخواست عملیات:", payload);

    const response = await api.post("/operation/requests", payload);
    
    if (response.data?.success) {
      toast.success("✅ درخواست عملیات با موفقیت ثبت شد");
      setIsRequested(true);
      
      if (onSave) {
        await onSave(response.data.data);
      }
      
      setShowSurgeryForm(false);
      setSelectedPatient(null);
      setFeeInfo(null);
      await fetchPatients();
      if (onRefresh) onRefresh();
    } else {
      toast.error(`❌ ${response.data?.message || "خطا در ثبت اطلاعات عملیات"}`);
    }
  } catch (err) {
    console.error("❌ خطا در ثبت اطلاعات عملیات:", err);
    
    // نمایش خطاهای اعتبارسنجی
    if (err.response?.status === 422) {
      const errorData = err.response.data;
      console.log("📋 خطاهای اعتبارسنجی:", errorData);
      
      if (errorData.errors) {
        Object.entries(errorData.errors).forEach(([field, messages]) => {
          const fieldLabels = {
            'registration_id': 'شناسه مراجعه',
            'patient_id': 'شناسه مریض',
            'surgery_type': 'نوع جراحی',
            'surgeon': 'جراح',
            'anesthesiologist': 'متخصص بیهوشی',
            'room_number': 'شماره اتاق عمل',
            'scheduled_date': 'زمان جراحی',
            'estimated_duration': 'مدت زمان تخمینی',
            'notes': 'یادداشت',
            'priority': 'اولویت'
          };
          const label = fieldLabels[field] || field;
          toast.error(`❌ ${label}: ${Array.isArray(messages) ? messages[0] : messages}`);
        });
      } else if (errorData.message) {
        toast.error(`❌ ${errorData.message}`);
      } else {
        toast.error("❌ داده‌های ارسالی معتبر نیستند. لطفاً همه فیلدها را بررسی کنید.");
      }
    } else if (err.response?.data?.message) {
      toast.error(`❌ ${err.response.data.message}`);
    } else {
      toast.error("❌ خطا در ثبت اطلاعات عملیات");
    }
  } finally {
    setLoading(false);
  }
};

  const handleUpdateStatus = async (patientId, newStatus) => {
    if (!patientId || patientId.toString().startsWith('temp_')) {
      toast.warning("⚠️ این درخواست هنوز ثبت نشده است");
      return;
    }
    
    try {
      const response = await api.patch(`/operation/requests/${patientId}/status`, {
        status: newStatus
      });
      
      if (response.data?.success) {
        toast.success(`✅ وضعیت با موفقیت به ${response.data.data.status_label || newStatus} تغییر یافت`);
        await fetchPatients();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("خطا در بروزرسانی وضعیت:", err);
      toast.error("❌ خطا در بروزرسانی وضعیت");
    }
  };

  const handleSurgeryChange = (e) => {
    const { name, value } = e.target;
    setSurgeryData(prev => ({ ...prev, [name]: value }));
  };

  const filteredPatients = getFilteredPatients();
  const isDisabled = isTreatmentComplete || isSubmitting;

  // نمایش اطلاعات فیس
  const renderFeeInfo = (patient) => {
    if (patient.fee_id) {
      return (
        <div style={{
          marginTop: '5px',
          padding: '5px 10px',
          backgroundColor: '#0f1a2a',
          borderRadius: '4px',
          fontSize: '12px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: '#22c55e' }}>
            💰 مبلغ: {patient.fee_amount?.toFixed(2) || '0'}
          </span>
          <span style={{ color: '#fcd34d' }}>
            پرداخت: {patient.fee_paid?.toFixed(2) || '0'}
          </span>
          {patient.fee_status && getFeeStatusBadge(patient.fee_status)}
        </div>
      );
    }
    return null;
  };

  // دکمه رفتن به صفحه اخذ فیس
  const goToFeePage = () => {
    const regId = getRegistrationId();
    if (regId) {
      // Navigate to fee page with regId
      window.location.href = `/operation-fees?regId=${regId}`;
    } else {
      toast.warning("⚠️ شناسه مراجعه یافت نشد");
    }
  };

  return (
    <div>
      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        🔪 عملیات خانه
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
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت عملیات:</span>
          <span style={{
            color: isRequested ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
          </span>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت معالجه:</span>
          <span style={{
            color: isTreatmentComplete ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isTreatmentComplete ? '✅ ختم شده' : '⏳ در حال 진행'}
          </span>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تعداد درخواست‌ها:</span>
          <span style={{
            color: '#60a5fa',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {stats.total} مورد
          </span>
        </div>
        <div>
          <button
            onClick={goToFeePage}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '4px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            💰 اخذ فیس
          </button>
        </div>
      </div>

      {/* هدر */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
            <span style={{ color: '#f59e0b' }}>⏳ در انتظار: {stats.pending}</span>
            <span style={{ color: '#3b82f6' }}>🔄 در حال انجام: {stats.inProgress}</span>
            <span style={{ color: '#10b981' }}>✅ تکمیل شده: {stats.completed}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'} {loading ? 'در حال بروزرسانی...' : 'بروزرسانی'}
        </button>
      </div>

      {/* فرم ثبت عملیات */}
      {showSurgeryForm && selectedPatient && (
        <div style={{
          backgroundColor: '#1a2a3a',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #dc2626'
        }}>
          <h4 style={{ color: '#dc2626', marginBottom: '15px' }}>
            🔪 ثبت درخواست عملیات برای {selectedPatient.patient_name}
          </h4>

          {/* نمایش اطلاعات فیس در صورت وجود */}
          {feeInfo?.hasFee && (
            <div style={{
              backgroundColor: '#0f1a2a',
              padding: '10px 15px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #22c55e'
            }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '5px' }}>
                ✅ اطلاعات فیس
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                <span style={{ color: '#fcd34d' }}>مبلغ کل: {feeInfo.feeAmount?.toFixed(2) || '0'}</span>
                <span style={{ color: '#22c55e' }}>پرداخت شده: {feeInfo.feePaid?.toFixed(2) || '0'}</span>
                <span style={{ color: '#ef4444' }}>
                  باقیمانده: {(feeInfo.feeAmount - feeInfo.feePaid)?.toFixed(2) || '0'}
                </span>
                {feeInfo.feeStatusLabel && (
                  <span style={{ color: '#60a5fa' }}>وضعیت: {feeInfo.feeStatusLabel}</span>
                )}
              </div>
            </div>
          )}

          {/* دکمه اخذ فیس */}
          {!feeInfo?.hasFee && (
            <div style={{
              backgroundColor: '#0f1a2a',
              padding: '10px 15px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #f59e0b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <span style={{ color: '#f59e0b' }}>⚠️ هنوز فیس برای این عملیات ثبت نشده است</span>
              <button
                onClick={goToFeePage}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '6px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                💰 ثبت فیس
              </button>
            </div>
          )}
          
          <form onSubmit={handleSurgerySubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>نوع جراحی *</label>
                <input
                  type="text"
                  name="surgery_type"
                  value={surgeryData.surgery_type}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  placeholder="مثلاً: جراحی قلب باز"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>جراح *</label>
                <input
                  type="text"
                  name="surgeon"
                  value={surgeryData.surgeon}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  placeholder="نام جراح"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                  required
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>متخصص بیهوشی</label>
                <input
                  type="text"
                  name="anesthesiologist"
                  value={surgeryData.anesthesiologist}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  placeholder="نام متخصص بیهوشی"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>شماره اتاق عمل</label>
                <input
                  type="text"
                  name="room_number"
                  value={surgeryData.room_number}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  placeholder="مثلاً: OR-101"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>زمان جراحی</label>
                <input
                  type="datetime-local"
                  name="scheduled_date"
                  value={surgeryData.scheduled_date}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>مدت زمان تخمینی</label>
                <input
                  type="text"
                  name="estimated_duration"
                  value={surgeryData.estimated_duration}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  placeholder="مثلاً: 2 ساعت"
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>اولویت</label>
                <select
                  name="priority"
                  value={surgeryData.priority}
                  onChange={handleSurgeryChange}
                  style={{
                    backgroundColor: '#1a1a2e',
                    color: 'white',
                    borderColor: '#374151',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                  disabled={isDisabled}
                >
                  <option value="high">🔴 بالا</option>
                  <option value="medium">🟡 متوسط</option>
                  <option value="normal">🔵 عادی</option>
                  <option value="low">⚪ پایین</option>
                </select>
              </div>
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '13px', color: '#9ca3af' }}>یادداشت</label>
                <textarea
                  name="notes"
                  value={surgeryData.notes}
                  onChange={handleSurgeryChange}
                  className="form-control"
                  rows="3"
                  placeholder="یادداشت‌های اضافی..."
                  style={{ backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151' }}
                  disabled={isDisabled}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={loading || isDisabled}
                style={{
                  backgroundColor: isDisabled ? '#6b7280' : '#dc2626',
                  color: 'white',
                  padding: '10px 30px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: (loading || isDisabled) ? 'not-allowed' : 'pointer',
                  opacity: (loading || isDisabled) ? 0.6 : 1,
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ در حال ثبت...' : '📤 ثبت درخواست'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSurgeryForm(false);
                  setSelectedPatient(null);
                  setFeeInfo(null);
                }}
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
            </div>
          </form>
        </div>
      )}

      {/* جستجو و فیلتر */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="🔍 جستجوی مریض، نوع جراحی، جراح..."
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
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            border: '1px solid #374151',
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <option value="all">همه</option>
          <option value="pending">در انتظار</option>
          <option value="in_progress">در حال انجام</option>
          <option value="completed">تکمیل شده</option>
          <option value="cancelled">لغو شده</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            border: '1px solid #374151',
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <option value="time">زمان</option>
          <option value="name">نام</option>
          <option value="priority">اولویت</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            border: '1px solid #374151',
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {sortOrder === 'asc' ? '⬆️' : '⬇️'}
        </button>
      </div>

      {/* لیست درخواست‌ها */}
      {loading && patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : filteredPatients.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#9ca3af',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          border: '2px dashed #374151'
        }}>
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏥</div>
          <div style={{ fontSize: '16px', marginBottom: '5px' }}>
            {searchTerm ? 'نتیجه‌ای یافت نشد' : 'هیچ درخواست عملیاتی ثبت نشده است'}
          </div>
          <button
            onClick={() => {
              // ایجاد یک درخواست جدید برای مراجعه فعلی
              const regId = getRegistrationId();
              if (regId) {
                const newPatient = {
                  id: `temp_${Date.now()}`,
                  registration_id: regId,
                  patient_id: getPatientId(),
                  patient_name: registration?.patient?.first_name + ' ' + registration?.patient?.last_name || 'مریض',
                  surgery_type: '',
                  status: 'pending',
                  priority: 'normal',
                  surgeon: '',
                  anesthesiologist: '',
                  room_number: '',
                  estimated_duration: '',
                  notes: '',
                  fee_id: null,
                  fee_status: null,
                  fee_amount: null,
                  fee_paid: null,
                  created_at: new Date().toISOString()
                };
                setPatients([newPatient]);
                setOperationRequests([newPatient]);
                setSelectedPatient(newPatient);
                setShowSurgeryForm(true);
              } else {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
              }
            }}
            style={{
              marginTop: '10px',
              padding: '8px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ➕ ثبت درخواست جدید
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              style={{
                backgroundColor: patient.status === 'in_progress' ? '#1e3a5f' : '#2d3748',
                borderRadius: '8px',
                padding: '16px 20px',
                border: `2px solid ${
                  patient.status === 'in_progress' ? '#3b82f6' :
                  patient.status === 'completed' ? '#10b981' :
                  patient.status === 'cancelled' ? '#ef4444' : '#f59e0b'
                }`,
                transition: 'all 0.3s'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '24px' }}>🔪</span>
                    <span style={{ fontWeight: 'bold', color: 'white', fontSize: '16px' }}>
                      {patient.patient_name}
                    </span>
                    {getPriorityBadge(patient.priority)}
                    {patient.surgery_type && (
                      <span style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}>
                        {patient.surgery_type}
                      </span>
                    )}
                    {patient.room_number && (
                      <span style={{
                        color: '#9ca3af',
                        fontSize: '12px',
                        backgroundColor: '#374151',
                        padding: '2px 10px',
                        borderRadius: '10px'
                      }}>
                        🏠 {patient.room_number}
                      </span>
                    )}
                    {!patient.surgery_type && (
                      <span style={{
                        color: '#f59e0b',
                        fontSize: '12px',
                        backgroundColor: '#374151',
                        padding: '2px 10px',
                        borderRadius: '10px'
                      }}>
                        ⏳ در انتظار تکمیل اطلاعات
                      </span>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    fontSize: '13px',
                    color: '#d1d5db'
                  }}>
                    <span>👨‍⚕️ جراح: {patient.surgeon || 'نامشخص'}</span>
                    <span>💉 بیهوشی: {patient.anesthesiologist || 'نامشخص'}</span>
                    {patient.scheduled_date && (
                      <span>📅 {new Date(patient.scheduled_date).toLocaleString('fa-IR')}</span>
                    )}
                    {patient.estimated_duration && (
                      <span>⏱️ {patient.estimated_duration}</span>
                    )}
                  </div>

                  {/* نمایش اطلاعات فیس */}
                  {renderFeeInfo(patient)}
                  
                  {patient.notes && (
                    <div style={{
                      marginTop: '8px',
                      color: '#9ca3af',
                      fontSize: '13px',
                      padding: '8px 12px',
                      backgroundColor: '#1f2937',
                      borderRadius: '5px'
                    }}>
                      📝 {patient.notes}
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  {getStatusBadge(patient.status)}
                  
                  {patient.status !== 'completed' && patient.status !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => handleSelectPatient(patient)}
                        style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>▶</span>
                        ادامه
                      </button>
                      
                      {patient.status === 'pending' && patient.id && !patient.id.toString().startsWith('temp_') && (
                        <button
                          onClick={() => handleUpdateStatus(patient.id, 'in_progress')}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          شروع
                        </button>
                      )}
                      
                      {patient.status === 'in_progress' && patient.id && !patient.id.toString().startsWith('temp_') && (
                        <button
                          onClick={() => handleUpdateStatus(patient.id, 'completed')}
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '8px 18px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          تکمیل
                        </button>
                      )}
                    </>
                  )}

                  {/* دکمه اخذ فیس */}
                  {!patient.fee_id && patient.id && !patient.id.toString().startsWith('temp_') && (
                    <button
                      onClick={goToFeePage}
                      style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '6px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      💰 فیس
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ دکمه‌های ناوبری ============ */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center', 
        marginTop: '30px',
        flexWrap: 'wrap',
        borderTop: '2px solid #374151',
        paddingTop: '20px'
      }}>
        {/* دکمه 1: برگشت به مرحله قبلی */}
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
          برگشت به {prevStep?.label || 'رادیولوژی'}
        </button>

        {/* دکمه 2: ثبت عملیات */}
        <button
          type="button"
          onClick={() => {
            if (selectedPatient) {
              const form = document.querySelector('form');
              if (form) {
                form.dispatchEvent(new Event('submit'));
              }
            } else {
              toast.warning("⚠️ لطفاً ابتدا یک درخواست را انتخاب کنید");
            }
          }}
          disabled={loading || isDisabled || !selectedPatient}
          style={{
            backgroundColor: (isDisabled || !selectedPatient) ? '#6b7280' : '#dc2626',
            color: 'white',
            padding: '10px 25px',
            borderRadius: '6px',
            border: 'none',
            cursor: (loading || isDisabled || !selectedPatient) ? 'not-allowed' : 'pointer',
            opacity: (loading || isDisabled || !selectedPatient) ? 0.6 : 1,
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📤</span>
          {loading ? 'در حال ثبت...' : isTreatmentComplete ? 'معالجه ختم شده' : isRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
        </button>

        {/* دکمه 3: ختم معالجه */}
        <button
          type="button"
          onClick={onFinish}
          disabled={isTreatmentComplete || isSubmitting}
          style={{
            backgroundColor: isTreatmentComplete ? '#6b7280' : '#dc2626',
            color: 'white',
            padding: '10px 25px',
            borderRadius: '6px',
            border: 'none',
            cursor: (isTreatmentComplete || isSubmitting) ? 'not-allowed' : 'pointer',
            opacity: (isTreatmentComplete || isSubmitting) ? 0.6 : 1,
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🏁</span>
          {isTreatmentComplete ? '✅ ختم شده' : 'ختم معالجه'}
        </button>

        {/* دکمه 4: رفتن به مرحله بعدی */}
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
            رفتن به {nextStep.label}
          </button>
        )}
      </div>
    </div>
  );
}