// src/app/pages/pharmacy/PharmacySales.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../../../api';
import { toast } from 'react-toastify';

const PharmacySales = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions');
      const data = response?.data?.data || [];
      setPrescriptions(data.filter(p => 
        ['pending', 'sent_to_pharmacy', 'pharmacy_registered'].includes(p.status)
      ));
    } catch (error) {
      console.error('❌ خطا:', error);
      toast.error('خطا در دریافت نسخه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (presId) => {
    if (!window.confirm('آیا از پرداخت این نسخه اطمینان دارید؟')) return;
    
    try {
      await api.post(`/prescriptions/${presId}/mark-paid`);
      toast.success('✅ پرداخت با موفقیت ثبت شد');
      await fetchPrescriptions();
      setShowDetails(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت پرداخت');
    }
  };

  const handleRegisterPharmacy = async (presId) => {
    try {
      await api.post(`/prescriptions/${presId}/pharmacy-registered`);
      toast.success('✅ نسخه در دواخانه ثبت شد');
      await fetchPrescriptions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت نسخه');
    }
  };

  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      color: 'white',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    },
    btn: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      marginRight: '8px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>💰 فروش دوا (نسخه‌ها)</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
          ثبت فروش و پرداخت نسخه‌های در انتظار
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>⏳ در حال بارگذاری...</div>
      ) : prescriptions.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>هیچ نسخه‌ای در انتظار نیست</div>
        </div>
      ) : (
        prescriptions.map((p) => (
          <div key={p.pres_id || p.id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
                  👤 {p.patient?.full_name || p.patient_name || 'نامشخص'}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  📅 {new Date(p.created_at).toLocaleDateString('fa-IR')}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  💊 تعداد اقلام: {p.items?.length || 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                  onClick={() => { setSelectedPrescription(p); setShowDetails(true); }}
                >
                  📋 مشاهده جزییات
                </button>
                {p.status === 'pending' && (
                  <button
                    style={{ ...styles.btn, background: '#8b5cf6', color: 'white' }}
                    onClick={() => handleRegisterPharmacy(p.pres_id || p.id)}
                  >
                    📝 ثبت در دواخانه
                  </button>
                )}
                {['sent_to_pharmacy', 'pharmacy_registered'].includes(p.status) && (
                  <button
                    style={{ ...styles.btn, background: '#10b981', color: 'white' }}
                    onClick={() => handleMarkPaid(p.pres_id || p.id)}
                  >
                    ✅ ثبت پرداخت
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* مودال جزییات */}
      {showDetails && selectedPrescription && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            style={{
              background: 'white', borderRadius: '12px', padding: '24px',
              maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>📋 جزییات نسخه</h2>
            <p><strong>بیمار:</strong> {selectedPrescription.patient?.full_name || 'نامشخص'}</p>
            <p><strong>داکتر:</strong> {selectedPrescription.doctor?.name || '-'}</p>
            <p><strong>تاریخ:</strong> {new Date(selectedPrescription.created_at).toLocaleDateString('fa-IR')}</p>
            
            <h3>💊 اقلام:</h3>
            {selectedPrescription.items?.map((item, idx) => (
              <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                • {item.medication_name || item.med?.name} - تعداد: {item.quantity}
              </div>
            ))}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                style={{ ...styles.btn, background: '#6b7280', color: 'white' }}
                onClick={() => setShowDetails(false)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacySales;