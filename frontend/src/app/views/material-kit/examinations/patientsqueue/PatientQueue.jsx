// src/app/pages/treatment/patientsqueue/PatientQueue.jsx
import { useState } from "react";

// ✅ ابزار تشخیص رکورد اضطراری
const isEmergencyRecord = (p) =>
  Boolean(
    p?.is_emergency ||
    p?.emergency_id ||
    p?.triage_level ||
    p?.triage_score ||
    p?.emergency_case ||
    p?.case_id ||
    (typeof p?.visit_type === "string" && p.visit_type.toLowerCase() === "emergency")
  );

// ✅ برچسب درجه عاجلیت
const triageLabel = (score) => {
  switch (Number(score)) {
    case 1: return "بحرانی";
    case 2: return "فوری";
    case 3: return "نیمه‌فوری";
    case 4: return "غیرفوری";
    case 5: return "غیرعاجل";
    default: return null;
  }
};

const triageColor = (score) => {
  switch (Number(score)) {
    case 1: return "#dc2626";
    case 2: return "#ea580c";
    case 3: return "#f59e0b";
    case 4: return "#10b981";
    case 5: return "#6b7280";
    default: return "#94a3b8";
  }
};

export default function PatientQueue({
  queue,
  loading,
  onSelectPatient,
  onRefresh,
  // ✅ props اختیاری صف اضطراری — اگر نیایند، رفتار قبلی حفظ می‌شود
  emergencyQueue = [],
  emergencyLoading = false,
  queueFilter = "normal",
  onFilterChange,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ انتخاب صف فعال
  const hasEmergencySupport = Array.isArray(emergencyQueue) && (emergencyQueue.length > 0 || queueFilter === "emergency");
  const activeQueue = queueFilter === "emergency" ? emergencyQueue : queue;
  const activeLoading = queueFilter === "emergency" ? emergencyLoading : loading;

  const filteredQueue = activeQueue.filter(item => {
    const patient = item.patient || {};
    const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) ||
           (patient.mobile || '').includes(search) ||
           (item.queue_number?.toString() || '').includes(search) ||
           (item.emergency_id?.toString() || '').toLowerCase().includes(search);
  });

  // فرمت کردن زمان
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  // فرمت کردن تاریخ
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fa-IR');
    } catch {
      return '-';
    }
  };

  // محاسبه موقعیت در صف
  const getQueuePosition = (index) => {
    return index + 1;
  };

  if (activeLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '20px', color: '#9ca3af' }}>⏳ در حال بارگذاری...</div>
      </div>
    );
  }

  if (activeQueue.length === 0) {
    return (
      <div>
        {/* ✅ تب فیلتر صف — فقط اگر پشتیبانی اضطراری فعال باشد */}
        {hasEmergencySupport && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '18px',
            background: 'rgba(31, 41, 55, 0.7)',
            padding: '6px',
            borderRadius: '12px',
            width: 'fit-content'
          }}>
            <button
              onClick={() => onFilterChange?.('normal')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: queueFilter === 'normal' ? '#374151' : 'transparent',
                color: queueFilter === 'normal' ? '#60a5fa' : '#9ca3af',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              👥 صف عادی
              <span style={{
                background: queueFilter === 'normal' ? '#3b82f6' : '#4b5563',
                color: 'white',
                padding: '1px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '800',
              }}>{queue.length}</span>
            </button>
            <button
              onClick={() => onFilterChange?.('emergency')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: queueFilter === 'emergency' ? '#374151' : 'transparent',
                color: queueFilter === 'emergency' ? '#fca5a5' : '#9ca3af',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🚨 صف اضطراری
              <span style={{
                background: queueFilter === 'emergency' ? '#dc2626' : '#7f1d1d',
                color: 'white',
                padding: '1px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '800',
              }}>{emergencyQueue.length}</span>
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>
            {queueFilter === 'emergency' ? '🚨' : '📭'}
          </div>
          <div style={{ fontSize: '20px', color: '#9ca3af' }}>
            {queueFilter === 'emergency'
              ? 'هیچ مریض اضطراری در انتظار نیست'
              : 'هیچ مریضی در صف انتظار وجود ندارد'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
            {queueFilter === 'emergency'
              ? 'مریضان اضطراری پس از تریاژ در بخش اضطراری در اینجا نمایش داده می‌شوند'
              : 'زمانی که مریضی از بخش پذیرش به شما ارجاع داده شود، در اینجا نمایش داده می‌شود'}
          </div>
          <button
            onClick={onRefresh}
            style={{
              marginTop: '20px',
              padding: '10px 30px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 بروزرسانی
          </button>
        </div>
      </div>
    );
  }

  // ✅ شمارش اضطراری‌های درون صف عادی (برای نمایش شمارنده هشدار روی تب)
  const emergencyInNormalQueue = queue.filter(isEmergencyRecord).length;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h3 style={{ color: '#60a5fa' }}>
          📋 {queueFilter === 'emergency' ? 'صف اضطراری مریضان' : 'صف انتظار مریضان'}
          <span style={{
            backgroundColor: queueFilter === 'emergency' ? '#dc2626' : '#3b82f6',
            padding: '2px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            marginLeft: '10px',
            color: 'white'
          }}>
            {activeQueue.length} مریض
          </span>
          {queueFilter === 'normal' && emergencyInNormalQueue > 0 && (
            <span style={{
              backgroundColor: '#dc2626',
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              marginLeft: '8px',
              color: 'white',
              fontWeight: '700'
            }}>
              🚨 {emergencyInNormalQueue} اضطراری
            </span>
          )}
        </h3>
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 15px',
            backgroundColor: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* ✅ تب فیلتر صف */}
      {hasEmergencySupport && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '18px',
          background: 'rgba(31, 41, 55, 0.7)',
          padding: '6px',
          borderRadius: '12px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => onFilterChange?.('normal')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: queueFilter === 'normal' ? '#374151' : 'transparent',
              color: queueFilter === 'normal' ? '#60a5fa' : '#9ca3af',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👥 صف عادی
            <span style={{
              background: queueFilter === 'normal' ? '#3b82f6' : '#4b5563',
              color: 'white',
              padding: '1px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '800',
            }}>{queue.length}</span>
          </button>
          <button
            onClick={() => onFilterChange?.('emergency')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: queueFilter === 'emergency' ? '#374151' : 'transparent',
              color: queueFilter === 'emergency' ? '#fca5a5' : '#9ca3af',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🚨 صف اضطراری
            <span style={{
              background: queueFilter === 'emergency' ? '#dc2626' : '#7f1d1d',
              color: 'white',
              padding: '1px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '800',
            }}>{emergencyQueue.length}</span>
          </button>
        </div>
      )}

      {/* ✅ هشدار صف اضطراری */}
      {queueFilter === 'emergency' && (
        <div style={{
          background: 'rgba(127, 29, 29, 0.25)',
          border: '1px solid #dc2626',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '15px',
          fontSize: '12px',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>مریضان اضطراری بر اساس درجه عاجلیت (۱ = بحرانی، ۵ = غیرعاجل) مرتب شده‌اند. مریض بحرانی فوراً معالجه می‌شود.</span>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="🔍 جستجو بر اساس نام، شماره تماس یا شماره صف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 15px',
            borderRadius: '5px',
            border: '1px solid #374151',
            backgroundColor: '#1a1a2e',
            color: 'white',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#374151' }}>
              <th style={{ padding: '10px', textAlign: 'center', minWidth: '80px' }}>شماره صف</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '150px' }}>نام مریض</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '120px' }}>شماره تماس</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '100px' }}>تاریخ صف</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '100px' }}>فیس (افغانی)</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '100px' }}>زمان ارسال</th>
              <th style={{ padding: '10px', textAlign: 'right', minWidth: '100px' }}>تاریخ مراجعه</th>
              <th style={{ padding: '10px', textAlign: 'center', minWidth: '140px' }}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueue.map((item, index) => {
              const patient = item.patient || {};
              const position = getQueuePosition(index);
              const isEm = isEmergencyRecord(item);
              const triageScore = item.triage_score ?? item.emergency_case?.triage_score;

              // تعیین رنگ بر اساس موقعیت در صف
              const getPositionColor = () => {
                if (isEm) return '#dc2626'; // ✅ قرمز برای اضطراری
                if (position === 1) return '#22c55e'; // سبز برای نفر اول
                if (position <= 3) return '#f59e0b'; // زرد برای 3 نفر اول
                return '#3b82f6'; // آبی برای بقیه
              };

              return (
                <tr key={item.reg_id} style={{
                  borderBottom: '1px solid #374151',
                  backgroundColor: isEm
                    ? 'rgba(220, 38, 38, 0.1)'
                    : position === 1
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'transparent'
                }}>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: getPositionColor(),
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: 'white',
                      display: 'inline-block',
                      minWidth: '30px'
                    }}>
                      #{item.queue_number || position}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <strong>{patient.first_name || ''} {patient.last_name || ''}</strong>
                    {patient.father_name && (
                      <span style={{ color: '#9ca3af', fontSize: '12px', marginRight: '5px' }}>
                        (پسر {patient.father_name})
                      </span>
                    )}
                    {position === 1 && !isEm && (
                      <span style={{
                        backgroundColor: '#22c55e',
                        color: 'white',
                        fontSize: '10px',
                        padding: '1px 8px',
                        borderRadius: '12px',
                        marginRight: '8px'
                      }}>
                        نوبت فعلی
                      </span>
                    )}
                    {/* ✅ نشان اضطراری و درجه عاجلیت */}
                    {isEm && (
                      <>
                        <span style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          fontSize: '10px',
                          padding: '1px 8px',
                          borderRadius: '12px',
                          marginRight: '8px',
                          fontWeight: '700'
                        }}>
                          🚨 اضطراری
                        </span>
                        {triageScore != null && (
                          <span style={{
                            backgroundColor: triageColor(triageScore),
                            color: 'white',
                            fontSize: '10px',
                            padding: '1px 8px',
                            borderRadius: '12px',
                            marginRight: '6px',
                            fontWeight: '700'
                          }}>
                            {triageLabel(triageScore) || `عاجلیت ${triageScore}`}
                          </span>
                        )}
                      </>
                    )}
                    {isEm && item.emergency_id && (
                      <div style={{ fontSize: '10px', color: '#fca5a5', marginTop: '4px' }}>
                        پرونده اضطراری: {item.emergency_id}
                      </div>
                    )}
                    {isEm && item.chief_complaint && (
                      <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px', fontStyle: 'italic' }}>
                        📝 {item.chief_complaint}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px' }} dir="ltr">{patient.mobile || '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {item.queue_date ? formatDate(item.queue_date) :
                     item.visit_date ? formatDate(item.visit_date) : '-'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      color: '#fcd34d',
                      fontWeight: 'bold'
                    }}>
                      {Number(item.registration_fee || 0).toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#1e3a5f',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#60a5fa'
                    }}>
                      {formatTime(item.sent_to_doctor_at)}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {item.visit_date ? formatDate(item.visit_date) : '-'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => onSelectPatient(item)}
                      style={{
                        backgroundColor: isEm ? '#dc2626' : position === 1 ? '#22c55e' : '#3b82f6',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                        boxShadow: isEm
                          ? '0 0 15px rgba(220, 38, 38, 0.4)'
                          : position === 1
                            ? '0 0 15px rgba(34, 197, 94, 0.3)'
                            : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.backgroundColor = isEm
                          ? '#b91c1c'
                          : position === 1
                            ? '#16a34a'
                            : '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.backgroundColor = isEm
                          ? '#dc2626'
                          : position === 1
                            ? '#22c55e'
                            : '#3b82f6';
                      }}
                    >
                      {isEm ? '🚨 معالجه فوری' : '🩺 شروع معاینه'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredQueue.length === 0 && searchTerm && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
          🔍 هیچ مریضی با این مشخصات یافت نشد
        </div>
      )}

      {/* نمایش خلاصه اطلاعات */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#1a2a3a',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>کل مریضان</div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{activeQueue.length}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>مجموع فیس</div>
          <div style={{ color: '#fcd34d', fontSize: '20px', fontWeight: 'bold' }}>
            {activeQueue.reduce((sum, item) => sum + Number(item.registration_fee || 0), 0).toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>نوبت فعلی</div>
          <div style={{ color: queueFilter === 'emergency' ? '#dc2626' : '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
            #{activeQueue[0]?.queue_number || '-'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>آخرین ارسال</div>
          <div style={{ color: '#60a5fa', fontSize: '20px', fontWeight: 'bold' }}>
            {activeQueue[activeQueue.length - 1]?.queue_number ?
              `#${activeQueue[activeQueue.length - 1].queue_number}` : '-'}
          </div>
        </div>
        {/* ✅ آمار اختصاصی اضطراری */}
        {hasEmergencySupport && queueFilter === 'normal' && emergencyInNormalQueue > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '12px' }}>اضطراری در صف</div>
            <div style={{ color: '#dc2626', fontSize: '20px', fontWeight: 'bold' }}>
              🚨 {emergencyInNormalQueue}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}