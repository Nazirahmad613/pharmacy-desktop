// src/app/views/material-kit/pharmacy/pharmacy.jsx
// نسخه کامل و اصلاح‌شده — وضعیت‌ها دقیقاً مطابق صفحه اجراآت نسخه

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
    executions_pending: 0,
    sent_to_registration: 0,
    total_medications: 0,
    low_stock_medications: 0,
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [executionsMap, setExecutionsMap] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ============ Fetch ============
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prescriptionsRes, executionsRes, stockRes] = await Promise.allSettled([
        api.get('/prescriptions'),
        api.get('/pharmacy-executions'),
        api.get('/stock/summary'),
      ]);

      // ---- نسخه‌ها ----
      let list = [];
      if (prescriptionsRes.status === 'fulfilled') {
        const prescriptions = prescriptionsRes.value?.data?.data || [];
        list = Array.isArray(prescriptions) ? prescriptions : [];
      }

      // ---- اجراآت (نقشه‌ی pres_id → آخرین اجراآت) ----
      const map = {};
      if (executionsRes.status === 'fulfilled') {
        const executions = executionsRes.value?.data?.data || [];
        executions.forEach((ex) => {
          if (
            !map[ex.pres_id] ||
            new Date(ex.created_at) > new Date(map[ex.pres_id].created_at)
          ) {
            map[ex.pres_id] = ex;
          }
        });
      }
      setExecutionsMap(map);

      // ---- محاسبه آمار بر اساس وضعیت اجراآت (مطابق صفحه اجراآت) ----
      const totalPrescriptions = list.length;

      // ⏳ در انتظار پرداخت = اجراآت با status = pending
      const executionsPending = list.filter((p) => {
        const presId = p.pres_id || p.id;
        const ex = map[presId];
        return ex && ex.status === 'pending';
      }).length;

      // 📤 ارسال به رسپشن = اجراآت با status = sent_to_registration
      const sentToRegistration = list.filter((p) => {
        const presId = p.pres_id || p.id;
        const ex = map[presId];
        return ex && ex.status === 'sent_to_registration';
      }).length;

      // ✅ پرداخت شده = اجراآت با status = paid
      const paidPrescriptions = list.filter((p) => {
        const presId = p.pres_id || p.id;
        const ex = map[presId];
        return ex && ex.status === 'paid';
      }).length;

      // 📤 ارسال به دواخانه = نسخه‌هایی که هنوز اجراآت ندارند
      const notExecuted = list.filter((p) => {
        const presId = p.pres_id || p.id;
        return !map[presId];
      }).length;

      setStatistics((prev) => ({
        ...prev,
        total_prescriptions: totalPrescriptions,
        pending_prescriptions: executionsPending, // ⏳ در انتظار پرداخت (اجراآت pending)
        paid_prescriptions: paidPrescriptions,     // ✅ پرداخت شده (اجراآت paid)
        executions_pending: notExecuted,           // 📤 هنوز اجراآت نشده
        sent_to_registration: sentToRegistration,  // 📤 ارسال به رسپشن
      }));

      // ---- آخرین نسخه‌ها ----
      setRecentPrescriptions(list.slice(0, 5));

      // ---- موجودی ----
      if (stockRes.status === 'fulfilled') {
        const stock = stockRes.value?.data?.data || {};
        setStatistics((prev) => ({
          ...prev,
          total_medications: stock.total_medications || 0,
          low_stock_medications: stock.low_stock || 0,
        }));
      }
    } catch (error) {
      console.error('❌ خطا در دریافت داده‌ها:', error);
      toast.error('خطا در دریافت اطلاعات داشبورد');
    } finally {
      setLoading(false);
    }
  };

  // ============ Badge وضعیت نسخه (مطابق صفحه اجراآت) ============
  const getPrescriptionDisplayBadge = (prescription) => {
    const presId = prescription.pres_id || prescription.id;
    const execution = executionsMap[presId];

    // اگر اجراآت وجود دارد → وضعیت اجراآت را نشان بده
    if (execution) {
      const execBadges = {
        pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ در انتظار پرداخت' },
        sent_to_registration: { bg: '#dbeafe', color: '#1e40af', text: '📤 ارسال به رسپشن' },
        paid: { bg: '#d1fae5', color: '#065f46', text: '✅ پرداخت شده' },
        cancelled: { bg: '#fee2e2', color: '#991b1b', text: '❌ لغو شده' },
      };
      if (execBadges[execution.status]) return execBadges[execution.status];
    }

    // در غیر این صورت → وضعیت خود نسخه
    const presBadges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ در انتظار' },
      sent_to_pharmacy: { bg: '#dbeafe', color: '#1e40af', text: '📤 ارسال به دواخانه' },
      pharmacy_registered: { bg: '#e0e7ff', color: '#3730a3', text: '📝 ثبت شده' },
      priced: { bg: '#c7d2fe', color: '#3730a3', text: '💰 قیمت‌گذاری شده' },
      paid: { bg: '#d1fae5', color: '#065f46', text: '✅ پرداخت شده' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: '❌ لغو شده' },
    };
    return presBadges[prescription.status] || { bg: '#f3f4f6', color: '#374151', text: prescription.status || '-' };
  };

  // ============ استایل‌ها ============
  const styles = {
    container: {
      padding: '24px',
      background: '#f0f2f5',
      minHeight: '100vh',
      direction: 'rtl',
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    statIcon: { fontSize: '32px' },
    statValue: { fontSize: '26px', fontWeight: 'bold', color: '#1f2937' },
    statLabel: { fontSize: '13px', color: '#6b7280' },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '16px',
    },
    actionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    actionCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    actionIcon: {
      fontSize: '48px',
      marginBottom: '12px',
      display: 'block',
    },
    actionTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '6px',
    },
    actionDesc: { fontSize: '12px', color: '#6b7280' },
    section: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
      flexWrap: 'wrap',
      gap: '10px',
    },
    statusBadge: {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
    },
  };

  // ============ کارت‌های دسترسی سریع ============
  const quickActions = [
    {
      title: 'اجراآت نسخه‌جات',
      desc: 'دریافت و قیمت‌گذاری نسخه‌های داکتر',
      icon: '✅',
      color: '#10b981',
      path: '/material/pharmacy/executions',
      badge: statistics.executions_pending > 0 ? statistics.executions_pending : null,
    },
    {
      title: 'فروش دوا (نسخه)',
      desc: 'ثبت فروش و پرداخت',
      icon: '💰',
      color: '#059669',
      path: '/material/pharmacy/sales',
    },
    {
      title: 'لیست نسخه‌ها',
      desc: 'مشاهده تمام نسخه‌ها',
      icon: '📋',
      color: '#3b82f6',
      path: '/material/pharmacy/prescriptions',
    },
    {
      title: 'موجودی دوا',
      desc: 'بررسی موجودی انبار',
      icon: '📦',
      color: '#f59e0b',
      path: '/material/pharmacy/inventory',
    },
    {
      title: 'مدیریت دواها',
      desc: 'افزودن، ویرایش، حذف',
      icon: '💊',
      color: '#8b5cf6',
      path: '/material/pharmacy/medications',
    },
    {
      title: 'تاریخچه فروش',
      desc: 'گزارش فروشات',
      icon: '📊',
      color: '#ec4899',
      path: '/material/pharmacy/history',
    },
  ];

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
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1,
            }}
          >
            🔄 {loading ? 'در حال بارگذاری...' : 'بروزرسانی'}
          </button>
        </div>
      </div>

      {/* آمار — وضعیت‌ها دقیقاً مطابق صفحه اجراآت */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#3b82f6' }}>📋</div>
          <div style={styles.statValue}>{statistics.total_prescriptions}</div>
          <div style={styles.statLabel}>کل نسخه‌ها</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#10b981' }}>📤</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{statistics.executions_pending}</div>
          <div style={styles.statLabel}>در انتظار اجراآت</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#f59e0b' }}>⏳</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{statistics.pending_prescriptions}</div>
          <div style={styles.statLabel}>در انتظار پرداخت</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#3b82f6' }}>📨</div>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{statistics.sent_to_registration}</div>
          <div style={styles.statLabel}>ارسال به رسپشن</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#059669' }}>💰</div>
          <div style={{ ...styles.statValue, color: '#059669' }}>{statistics.paid_prescriptions}</div>
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
      </div>

      {/* دسترسی سریع */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={styles.sectionTitle}>🚀 دسترسی سریع</h2>
        <div style={styles.actionsGrid}>
          {quickActions.map((action, idx) => (
            <div
              key={idx}
              style={styles.actionCard}
              onClick={() => navigate(action.path)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = action.color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 20px ${action.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <span style={{ ...styles.actionIcon, color: action.color }}>
                {action.icon}
              </span>
              <div style={styles.actionTitle}>
                {action.title}
                {action.badge && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: '8px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    {action.badge}
                  </span>
                )}
              </div>
              <div style={styles.actionDesc}>{action.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* آخرین نسخه‌ها — وضعیت مطابق صفحه اجراآت */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🕐 آخرین نسخه‌ها</h2>
        {recentPrescriptions.length > 0 ? (
          recentPrescriptions.map((prescription, idx) => {
            const badge = getPrescriptionDisplayBadge(prescription);
            const presId = prescription.pres_id || prescription.id;
            const patientName =
              prescription.patient?.full_name ||
              prescription.patient_name ||
              'نامشخص';

            return (
              <div key={presId || idx} style={styles.prescriptionItem}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    👤 {patientName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    📅 {new Date(prescription.created_at).toLocaleDateString('fa-IR')}
                    {presId && ` • نسخه #${presId}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    onClick={() => navigate('/material/pharmacy/executions')}
                    style={{
                      padding: '6px 14px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    اجراآت
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