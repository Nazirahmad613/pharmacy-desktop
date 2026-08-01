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
  isTreatmentComplete
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
    notes: ''
  });

  const refreshInterval = useRef(null);
  const isMounted = useRef(true);

  const fetchPatients = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      const response = await api.get("/doctor/operation-room");
      let data = [];
      
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data?.patients && Array.isArray(response.data.patients)) {
        data = response.data.patients;
      }

      const processedData = data.map(p => ({
        ...p,
        id: p.id || p.patient_id || `op_${Date.now()}_${Math.random()}`,
        patient_name: p.patient_name || 
                      p.patient?.first_name + ' ' + p.patient?.last_name || 
                      'مریض',
        surgery_type: p.surgery_type || p.operation_type || 'عمومی',
        status: p.status || 'pending',
        priority: p.priority || 'normal',
        scheduled_date: p.scheduled_date || p.date || p.created_at,
        surgeon: p.surgeon || p.doctor_name || 'نامشخص',
        anesthesiologist: p.anesthesiologist || 'نامشخص',
        room_number: p.room_number || p.room || '-',
        preparation_time: p.preparation_time || null,
        estimated_duration: p.estimated_duration || null,
        notes: p.notes || '',
        department: p.department || 'عملیات'
      }));

      if (isMounted.current) {
        setPatients(processedData);
        calculateStats(processedData);
      }
      
    } catch (err) {
      console.error("خطا در دریافت لیست عملیات خانه:", err);
      if (isMounted.current) {
        toast.error("❌ خطا در دریافت لیست مریض‌های عملیات خانه");
        setPatients(getSampleData());
        calculateStats(getSampleData());
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [api]);

  const getSampleData = () => {
    return [
      {
        id: 1,
        patient_name: "علی محمدی",
        surgery_type: "جراحی قلب باز",
        status: "pending",
        priority: "high",
        scheduled_date: new Date(Date.now() + 3600000).toISOString(),
        surgeon: "دکتر احمدی",
        anesthesiologist: "دکتر کریمی",
        room_number: "OR-101",
        preparation_time: "30 دقیقه",
        estimated_duration: "3 ساعت",
        notes: "نیاز به مراقبت ویژه پس از جراحی",
        department: "جراحی قلب"
      },
      {
        id: 2,
        patient_name: "فاطمه کریمی",
        surgery_type: "جراحی شکم",
        status: "in_progress",
        priority: "high",
        scheduled_date: new Date(Date.now() - 1800000).toISOString(),
        surgeon: "دکتر رضایی",
        anesthesiologist: "دکتر موسوی",
        room_number: "OR-102",
        preparation_time: "45 دقیقه",
        estimated_duration: "2 ساعت",
        notes: "جراحی در حال انجام",
        department: "جراحی عمومی"
      },
      {
        id: 3,
        patient_name: "محمد حسینی",
        surgery_type: "تعویض مفصل زانو",
        status: "pending",
        priority: "medium",
        scheduled_date: new Date(Date.now() + 7200000).toISOString(),
        surgeon: "دکتر علیپور",
        anesthesiologist: "دکتر صادقی",
        room_number: "OR-103",
        preparation_time: "20 دقیقه",
        estimated_duration: "1.5 ساعت",
        notes: "آماده برای جراحی",
        department: "ارتوپدی"
      },
      {
        id: 4,
        patient_name: "سارا رضایی",
        surgery_type: "جراحی مغز و اعصاب",
        status: "completed",
        priority: "high",
        scheduled_date: new Date(Date.now() - 10800000).toISOString(),
        surgeon: "دکتر نوروزی",
        anesthesiologist: "دکتر حسینی",
        room_number: "OR-104",
        preparation_time: "60 دقیقه",
        estimated_duration: "4 ساعت",
        notes: "جراحی موفقیت‌آمیز بود",
        department: "جراحی مغز و اعصاب"
      }
    ];
  };

  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(p => p.status === 'pending').length,
      inProgress: data.filter(p => p.status === 'in_progress').length,
      completed: data.filter(p => p.status === 'completed').length,
      cancelled: data.filter(p => p.status === 'cancelled').length
    };
    setStats(stats);
  };

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
    toast.info("🔄 لیست عملیات خانه بروزرسانی شد");
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
    
    // پر کردن فرم با اطلاعات موجود
    setSurgeryData({
      surgery_type: patient.surgery_type || '',
      surgeon: patient.surgeon || '',
      anesthesiologist: patient.anesthesiologist || '',
      room_number: patient.room_number || '',
      scheduled_date: patient.scheduled_date ? new Date(patient.scheduled_date).toISOString().slice(0, 16) : '',
      estimated_duration: patient.estimated_duration || '',
      notes: patient.notes || ''
    });
  };

  const handleSurgerySubmit = async (e) => {
    e.preventDefault();
    
    if (!surgeryData.surgery_type) {
      toast.warning("⚠️ لطفاً نوع جراحی را وارد کنید");
      return;
    }
    if (!surgeryData.surgeon) {
      toast.warning("⚠️ لطفاً نام جراح را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        ...surgeryData,
        status: 'pending'
      };

      const response = await api.post("/doctor/operation/schedule", payload);
      
      if (response.data?.success) {
        toast.success("✅ مریض با موفقیت به عملیات خانه ارسال شد");
        setIsRequested(true);
        
        if (onSave) {
          await onSave(surgeryData);
        }
        
        setShowSurgeryForm(false);
        fetchPatients();
        onRefresh();
      } else {
        toast.error("❌ خطا در ثبت اطلاعات عملیات");
      }
    } catch (err) {
      console.error("خطا در ثبت اطلاعات عملیات:", err);
      toast.error("❌ خطا در ثبت اطلاعات عملیات");
    } finally {
      setLoading(false);
    }
  };

  const handleSurgeryChange = (e) => {
    const { name, value } = e.target;
    setSurgeryData(prev => ({ ...prev, [name]: value }));
  };

  const filteredPatients = getFilteredPatients();
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting;

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
            color: isCompleted ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isCompleted ? '✅ ختم شده' : '⏳ در حال 진행'}
          </span>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تعداد مریض‌ها:</span>
          <span style={{
            color: '#60a5fa',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {stats.total} نفر
          </span>
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
            🔪 ثبت عملیات برای {selectedPatient.patient_name}
          </h4>
          
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
                {loading ? '⏳ در حال ثبت...' : '📤 ثبت عملیات'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSurgeryForm(false);
                  setSelectedPatient(null);
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
        </select>
      </div>

      {/* لیست مریض‌ها */}
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
            {searchTerm ? 'نتیجه‌ای یافت نشد' : 'هیچ مریضی در عملیات خانه وجود ندارد'}
          </div>
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
                    <span style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '12px'
                    }}>
                      {patient.surgery_type}
                    </span>
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
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    flexWrap: 'wrap',
                    fontSize: '13px',
                    color: '#d1d5db'
                  }}>
                    <span>👨‍⚕️ جراح: {patient.surgeon}</span>
                    <span>💉 بیهوشی: {patient.anesthesiologist}</span>
                    {patient.scheduled_date && (
                      <span>📅 {new Date(patient.scheduled_date).toLocaleString('fa-IR')}</span>
                    )}
                    {patient.estimated_duration && (
                      <span>⏱️ {patient.estimated_duration}</span>
                    )}
                  </div>
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
              // اگر مریض انتخاب شده، فرم را submit کن
              const form = document.querySelector('form');
              if (form) {
                form.dispatchEvent(new Event('submit'));
              }
            } else {
              toast.warning("⚠️ لطفاً ابتدا یک مریض را انتخاب کنید");
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
          {loading ? 'در حال ثبت...' : isCompleted ? 'معالجه ختم شده' : isRequested ? '✅ ثبت شده' : 'ثبت عملیات'}
        </button>

        {/* دکمه 3: ختم معالجه */}
        <button
          type="button"
          onClick={onFinish}
          disabled={isCompleted || isSubmitting}
          style={{
            backgroundColor: isCompleted ? '#6b7280' : '#dc2626',
            color: 'white',
            padding: '10px 25px',
            borderRadius: '6px',
            border: 'none',
            cursor: (isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
            opacity: (isCompleted || isSubmitting) ? 0.6 : 1,
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

        {/* دکمه 4: رفتن به مرحله بعدی (همیشه فعال) */}
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
            رفتن به {nextStep.label} {!isRequested && '(بدون ثبت)'}
          </button>
        )}
      </div>
    </div>
  );
}