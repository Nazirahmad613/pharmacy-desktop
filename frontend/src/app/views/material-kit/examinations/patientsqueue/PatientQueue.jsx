import { useState } from "react";

export default function PatientQueue({ queue, loading, onSelectPatient, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredQueue = queue.filter(item => {
    const patient = item.patient || {};
    const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || 
           (patient.mobile || '').includes(search) ||
           (item.queue_number?.toString() || '').includes(search);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '20px', color: '#9ca3af' }}>⏳ در حال بارگذاری...</div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
        <div style={{ fontSize: '20px', color: '#9ca3af' }}>هیچ مریضی در صف انتظار وجود ندارد</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
          زمانی که مریضی از بخش پذیرش به شما ارجاع داده شود، در اینجا نمایش داده می‌شود
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
    );
  }

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
          📋 صف انتظار مریضان
          <span style={{ 
            backgroundColor: '#3b82f6', 
            padding: '2px 12px', 
            borderRadius: '20px', 
            fontSize: '14px', 
            marginLeft: '10px',
            color: 'white'
          }}>
            {queue.length} مریض
          </span>
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
              
              // تعیین رنگ بر اساس موقعیت در صف
              const getPositionColor = () => {
                if (position === 1) return '#22c55e'; // سبز برای نفر اول
                if (position <= 3) return '#f59e0b'; // زرد برای 3 نفر اول
                return '#3b82f6'; // آبی برای بقیه
              };

              return (
                <tr key={item.reg_id} style={{ 
                  borderBottom: '1px solid #374151',
                  backgroundColor: position === 1 ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
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
                    {position === 1 && (
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
                        backgroundColor: position === 1 ? '#22c55e' : '#3b82f6',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                        boxShadow: position === 1 ? '0 0 15px rgba(34, 197, 94, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.backgroundColor = position === 1 ? '#16a34a' : '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.backgroundColor = position === 1 ? '#22c55e' : '#3b82f6';
                      }}
                    >
                      🩺 شروع معاینه
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
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{queue.length}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>مجموع فیس</div>
          <div style={{ color: '#fcd34d', fontSize: '20px', fontWeight: 'bold' }}>
            {queue.reduce((sum, item) => sum + Number(item.registration_fee || 0), 0).toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>نوبت فعلی</div>
          <div style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
            #{queue[0]?.queue_number || '-'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>آخرین ارسال</div>
          <div style={{ color: '#60a5fa', fontSize: '20px', fontWeight: 'bold' }}>
            {queue[queue.length - 1]?.queue_number ? 
              `#${queue[queue.length - 1].queue_number}` : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}