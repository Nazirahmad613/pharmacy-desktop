// src/app/pages/pharmacy/PharmacyHistory.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../../../api';
import { toast } from 'react-toastify';

const PharmacyHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [dateFrom, dateTo]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from_date = dateFrom;
      if (dateTo) params.to_date = dateTo;
      
      const response = await api.get('/prescriptions', { params });
      const data = response?.data?.data || [];
      setHistory(data.filter(p => p.status === 'paid'));
    } catch (error) {
      console.error('❌ خطا:', error);
      toast.error('خطا در دریافت تاریخچه');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = history.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      borderRadius: '12px', padding: '24px', marginBottom: '24px', color: 'white',
    },
    filters: {
      background: 'white', borderRadius: '12px', padding: '16px',
      marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
    },
    input: {
      padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px',
      fontSize: '14px',
    },
    summaryCard: {
      background: 'white', borderRadius: '12px', padding: '20px',
      marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    table: { background: 'white', borderRadius: '12px', overflow: 'hidden' },
    th: {
      background: '#f9fafb', padding: '12px 16px', textAlign: 'right',
      fontSize: '13px', color: '#6b7280', fontWeight: 'bold',
    },
    td: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📊 تاریخچه فروش</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>گزارش فروشات پرداخت شده</p>
      </div>

      <div style={styles.filters}>
        <label>از تاریخ:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={styles.input}
        />
        <label>تا تاریخ:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.summaryCard}>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>📋 تعداد نسخه‌ها</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ec4899' }}>{history.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>💰 مجموع فروش</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {totalSales.toLocaleString()} AFN
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>⏳ در حال بارگذاری...</div>
      ) : history.length === 0 ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>هیچ فروشی در این بازه زمانی یافت نشد</div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>بیمار</th>
              <th style={styles.th}>داکتر</th>
              <th style={styles.th}>تاریخ پرداخت</th>
              <th style={styles.th}>مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p, idx) => (
              <tr key={p.pres_id || p.id}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>👤 {p.patient?.full_name || 'نامشخص'}</td>
                <td style={styles.td}>👨‍⚕️ {p.doctor?.name || '-'}</td>
                <td style={styles.td}>
                  📅 {new Date(p.paid_at || p.updated_at || p.created_at).toLocaleDateString('fa-IR')}
                </td>
                <td style={styles.td}>
                  💰 {(p.total_amount || 0).toLocaleString()} AFN
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PharmacyHistory;