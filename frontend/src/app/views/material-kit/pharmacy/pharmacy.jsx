// src/app/pages/pharmacy/Pharmacy.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../api';
import { toast } from 'react-toastify';

const Pharmacy = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    total_prescriptions: 0,
    pending_prescriptions: 0,
    paid_prescriptions: 0,
    today_sales: 0,
    total_medications: 0,
    low_stock_medications: 0,
    expiring_medications: 0,
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // دریافت آمار
      const [prescriptionsRes, stockRes] = await Promise.allSettled([
        api.get('/prescriptions'),
        api.get('/stock/summary'),
      ]);

      if (prescriptionsRes.status === 'fulfilled') {
        const prescriptions = prescriptionsRes.value?.data?.data || [];
        
        setStatistics(prev => ({
          ...prev,
          total_prescriptions: prescriptions.length,
          pending_prescriptions: prescriptions.filter(p => p.status === 'pending').length,
          paid_prescriptions: prescriptions.filter(p => p.status === 'paid').length,
        }));

        // آخرین 5 نسخه
        setRecentPrescriptions(prescriptions.slice(0, 5));
      }

      if (stockRes.status === 'fulfilled') {
        const stock = stockRes.value?.data?.data || {};
        setStatistics(prev => ({
          ...prev,
          total_medications: stock.total_medications || 0,
          low_stock_medications: stock.low_stock || 0,
          expiring_medications: stock.expiring || 0,
        }));
      }
    } catch (error) {
      console.error('❌ خطا در دریافت داده‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      padding: '24px',
      background: '#f0f2f5',
      minHeight: '100vh',
    },
    headerCard: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #2a3a4a',
      color: 'white',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    statIcon: {
      fontSize: '32px',
      marginBottom: '10px',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1f2937',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6b7280',
      marginTop: '4px',
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    quickActionCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
    },
    quickActionIcon: {
      fontSize: '40px',
      marginBottom: '12px',
    },
    quickActionTitle: {
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#1f2937',
    },
    quickActionDesc: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px',
    },
    section: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      paddingBottom: '10px',
      borderBottom: '2px solid #f3f4f6',
    },
    prescriptionItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '8px',
      border: '1px solid #e5e7eb',
    },
    statusBadge: {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
    },
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'در انتظار' },
      sent_to_pharmacy: { bg: '#dbeafe', color: '#1e40af', text: 'ارسال به دواخانه' },
      pharmacy_registered: { bg: '#e0e7ff', color: '#3730a3', text: 'ثبت شده' },
      paid: { bg: '#d1fae5', color: '#065f46', text: 'پرداخت شده' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'لغو شده' },
    };
    return badges[status] || { bg: '#f3f4f6', color: '#374151', text: status };
  };

  return (
    <div style={styles.container}>
      {/* هدر */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              💊 داشبورد دواخانه
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
              مدیریت کامل دواها، نسخه‌ها و فروش
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            🔄 {loading ? 'در حال بارگذاری...' : 'بروزرسانی'}
          </button>
        </div>
      </div>

      {/* آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#3b82f6' }}>📋</div>
          <div style={styles.statValue}>{statistics.total_prescriptions}</div>
          <div style={styles.statLabel}>کل نسخه‌ها</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#f59e0b' }}>⏳</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{statistics.pending_prescriptions}</div>
          <div style={styles.statLabel}>در انتظار پرداخت</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#10b981' }}>✅</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{statistics.paid_prescriptions}</div>
          <div style={styles.statLabel}>پرداخت شده</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#8b5cf6' }}>💊</div>
          <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{statistics.total_medications}</div>
          <div style={styles.statLabel}>کل دواها</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#ef4444' }}>⚠️</div>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{statistics.low_stock_medications}</div>
          <div style={styles.statLabel}>موجودی کم</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#dc2626' }}>📅</div>
          <div style={{ ...styles.statValue, color: '#dc2626' }}>{statistics.expiring_medications}</div>
          <div style={styles.statLabel}>نزدیک انقضا</div>
        </div>
      </div>

      {/* دسترسی سریع */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
          🚀 دسترسی سریع
        </h2>
        <div style={styles.quickActionsGrid}>
          <div
            style={styles.quickActionCard}
            onClick={() => navigate('/material/pharmacy/sales')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ ...styles.quickActionIcon, color: '#10b981' }}>💰</div>
            <div style={styles.quickActionTitle}>فروش دوا (نسخه)</div>
            <div style={styles.quickActionDesc}>ثبت فروش جدید</div>
          </div>

          <div
            style={styles.quickActionCard}
            onClick={() => navigate('/material/pharmacy/prescriptions')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ ...styles.quickActionIcon, color: '#3b82f6' }}>📋</div>
            <div style={styles.quickActionTitle}>لیست نسخه‌ها</div>
            <div style={styles.quickActionDesc}>مشاهده و مدیریت</div>
          </div>

          <div
            style={styles.quickActionCard}
            onClick={() => navigate('/material/pharmacy/inventory')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ ...styles.quickActionIcon, color: '#f59e0b' }}>📦</div>
            <div style={styles.quickActionTitle}>موجودی دوا</div>
            <div style={styles.quickActionDesc}>بررسی و مدیریت موجودی</div>
          </div>

          <div
            style={styles.quickActionCard}
            onClick={() => navigate('/material/pharmacy/medications')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ ...styles.quickActionIcon, color: '#8b5cf6' }}>💊</div>
            <div style={styles.quickActionTitle}>مدیریت دواها</div>
            <div style={styles.quickActionDesc}>افزودن، ویرایش، حذف</div>
          </div>

          <div
            style={styles.quickActionCard}
            onClick={() => navigate('/material/pharmacy/history')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ec4899';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ ...styles.quickActionIcon, color: '#ec4899' }}>📊</div>
            <div style={styles.quickActionTitle}>تاریخچه فروش</div>
            <div style={styles.quickActionDesc}>گزارش فروشات</div>
          </div>
        </div>
      </div>

      {/* آخرین نسخه‌ها */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          🕐 آخرین نسخه‌ها
        </h2>
        {recentPrescriptions.length > 0 ? (
          recentPrescriptions.map((prescription) => {
            const badge = getStatusBadge(prescription.status);
            return (
              <div key={prescription.pres_id || prescription.id} style={styles.prescriptionItem}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    👤 {prescription.patient?.full_name || prescription.patient_name || 'نامشخص'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    📅 {new Date(prescription.created_at).toLocaleDateString('fa-IR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.text}
                  </span>
                  <button
                    onClick={() => navigate(`/material/pharmacy/prescriptions`)}
                    style={{
                      padding: '6px 14px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    مشاهده
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div>هیچ نسخه‌ای ثبت نشده است</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pharmacy;