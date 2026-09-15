// src/app/views/material-kit/pharmacy/executions/PharmacyPrescriptionExecutions.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../../../api';
import { toast } from 'react-toastify';

const PharmacyPrescriptionExecutions = () => {
  // ============ State ============
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('sent_to_pharmacy');
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceItems, setPriceItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [medicationsCatalog, setMedicationsCatalog] = useState([]);

  // ============ Effects ============
  useEffect(() => {
    fetchPrescriptions();
    fetchMedicationsCatalog();
  }, [filter]);

  // ============ Fetch Data ============
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions');
      let data = response?.data?.data || response?.data || [];
      if (!Array.isArray(data)) data = [];

      console.log('📦 نسخه‌های دریافتی:', data);
      if (data.length > 0) {
        console.log('📦 نمونه نسخه:', data[0]);
      }

      // فیلتر بر اساس وضعیت
      if (filter !== 'all') {
        data = data.filter(p => p.status === filter);
      }

      setPrescriptions(data);
    } catch (error) {
      console.error('❌ خطا در دریافت نسخه‌ها:', error);
      toast.error('خطا در دریافت نسخه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicationsCatalog = async () => {
    try {
      const response = await api.get('/medications');
      const data = response?.data?.data || response?.data || [];
      setMedicationsCatalog(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ خطا در دریافت لیست دواها:', error);
    }
  };

  // ============ Helper Functions ============
  const getPatientName = (prescription) => {
    if (!prescription) return 'نامشخص';
    if (prescription.patient?.full_name) return prescription.patient.full_name;
    if (prescription.patient?.first_name || prescription.patient?.last_name) {
      return `${prescription.patient.first_name || ''} ${prescription.patient.last_name || ''}`.trim();
    }
    return prescription.patient_name || 'نامشخص';
  };

  const getDoctorName = (prescription) => {
    if (!prescription) return '-';
    return prescription.doctor?.name || prescription.doctor_name || '-';
  };

  const getMedicationName = (item) => {
    if (!item) return 'نامشخص';
    if (typeof item.medication_name === 'string') return item.medication_name;
    if (typeof item.med_name === 'string') return item.med_name;
    if (item.med?.name) return item.med.name;
    if (item.medication?.name) return item.medication.name;
    if (typeof item.name === 'string') return item.name;
    return '-';
  };

  const getMedicationId = (item) => {
    if (!item) return null;
    return item.med_id || item.medication_id || item.med?.id || item.medication?.id;
  };

  const getQuantity = (item) => {
    if (!item) return 0;
    return Number(item.quantity || item.qty || item.dose || 0);
  };

  const getDosage = (item) => {
    if (!item) return '-';
    if (item.dosage) return item.dosage;
    if (item.dose) return item.dose;
    if (item.instructions) return item.instructions;
    return '-';
  };

  const getPrescriptionItems = (prescription) => {
    if (!prescription) return [];
    if (Array.isArray(prescription.items)) return prescription.items;
    if (Array.isArray(prescription.medications)) return prescription.medications;
    if (Array.isArray(prescription.prescription_items)) return prescription.prescription_items;
    return [];
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ در انتظار' },
      sent_to_pharmacy: { bg: '#dbeafe', color: '#1e40af', text: '📤 ارسال به دواخانه' },
      pharmacy_registered: { bg: '#e0e7ff', color: '#3730a3', text: '📝 ثبت شده' },
      priced: { bg: '#c7d2fe', color: '#3730a3', text: '💰 قیمت‌گذاری شده' },
      paid: { bg: '#d1fae5', color: '#065f46', text: '✅ پرداخت شده' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: '❌ لغو شده' },
    };
    return badges[status] || { bg: '#f3f4f6', color: '#374151', text: status || '-' };
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('fa-IR');
    } catch {
      return '-';
    }
  };

  // ============ Actions ============
  const handleOpenDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  // ⭐ باز کردن مودال قیمت‌گذاری
  const handleOpenPriceModal = (prescription) => {
    const items = getPrescriptionItems(prescription);

    // برای هر قلم نسخه، قیمت را از کاتالوگ دواها استخراج می‌کنیم
    const pricedItems = items.map((item) => {
      const medId = getMedicationId(item);
      const catalogMed = medicationsCatalog.find(
        (m) => m.id === medId || m.med_id === medId
      );
      const unitPrice = catalogMed?.price || catalogMed?.unit_price || item.unit_price || 0;
      const quantity = getQuantity(item) || 1;

      return {
        med_id: medId,
        medication_name: getMedicationName(item),
        quantity: quantity,
        dosage: getDosage(item),
        unit_price: Number(unitPrice),
        total_price: Number(unitPrice) * quantity,
        instructions: item.instructions || '',
        available_in_stock: catalogMed?.quantity || catalogMed?.stock_quantity || 0,
        catalog_found: !!catalogMed,
      };
    });

    setPriceItems(pricedItems);
    setSelectedPrescription(prescription);
    setShowPriceModal(true);
  };

  const handlePriceChange = (index, newUnitPrice) => {
    setPriceItems((prev) => {
      const updated = [...prev];
      const price = Number(newUnitPrice) || 0;
      updated[index] = {
        ...updated[index],
        unit_price: price,
        total_price: price * updated[index].quantity,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index, newQuantity) => {
    setPriceItems((prev) => {
      const updated = [...prev];
      const qty = Number(newQuantity) || 1;
      updated[index] = {
        ...updated[index],
        quantity: qty,
        total_price: updated[index].unit_price * qty,
      };
      return updated;
    });
  };

  const getGrandTotal = () => {
    return priceItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  // ⭐ ثبت قیمت‌گذاری و ارسال به رسپشن
  const handleSubmitPricing = async () => {
    if (!selectedPrescription) return;
    if (priceItems.length === 0) {
      toast.warning('هیچ قلمی برای قیمت‌گذاری وجود ندارد');
      return;
    }

    const totalAmount = getGrandTotal();
    if (totalAmount <= 0) {
      toast.warning('مبلغ کل باید بیشتر از صفر باشد');
      return;
    }

    setSubmitting(true);
    try {
      const presId = selectedPrescription.pres_id || selectedPrescription.id;

      // ⭐ ۱. ثبت اطلاعات هر قلم
      const itemsPayload = priceItems.map((item) => ({
        med_id: item.med_id,
        medication_name: item.medication_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        dosage: item.dosage,
        instructions: item.instructions,
      }));

      // ⭐ ۲. به‌روزرسانی نسخه با قیمت‌ها
      const updateData = {
        items: itemsPayload,
        total_amount: totalAmount,
        pharmacy_price: totalAmount,
        priced_at: new Date().toISOString(),
        status: 'pharmacy_registered', // یا 'priced' اگر در Backend پشتیبانی می‌شود
      };

      console.log('📤 ارسال قیمت‌گذاری:', updateData);

      try {
        await api.put(`/prescriptions/${presId}`, updateData);
      } catch (err) {
        console.error('خطای به‌روزرسانی نسخه:', err.response?.data);
        // اگر خطا داد، از endpoint دیگری استفاده کن
        await api.patch(`/prescriptions/${presId}/status`, {
          status: 'pharmacy_registered',
          total_amount: totalAmount,
        });
      }

      // ⭐ ۳. اطلاع به Backend که نسخه در دواخانه ثبت شد
      try {
        await api.post(`/prescriptions/${presId}/pharmacy-registered`, {
          items: itemsPayload,
          total_amount: totalAmount,
        });
      } catch (err) {
        console.warn('endpoint pharmacy-registered در دسترس نیست:', err.message);
      }

      // ⭐ ۴. ثبت مبلغ برای رسپشن (اختیاری - اگر endpoint دارد)
      try {
        await api.post('/pharmacy-fees', {
          pres_id: presId,
          patient_id: selectedPrescription.patient_id,
          reg_id: selectedPrescription.reg_id,
          amount: totalAmount,
          items: itemsPayload,
          status: 'pending',
        });
      } catch (err) {
        console.warn('endpoint pharmacy-fees در دسترس نیست:', err.message);
      }

      toast.success(`✅ قیمت‌گذاری انجام شد - مبلغ کل: ${totalAmount.toLocaleString()} AFN`);
      setShowPriceModal(false);
      setPriceItems([]);
      setSelectedPrescription(null);
      await fetchPrescriptions();
    } catch (error) {
      console.error('❌ خطا در ثبت قیمت:', error);
      toast.error(error.response?.data?.message || 'خطا در ثبت قیمت‌گذاری');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (!search) return true;
    const patientName = getPatientName(p).toLowerCase();
    const presId = String(p.pres_id || p.id || '');
    return patientName.includes(search.toLowerCase()) || presId.includes(search);
  });

  // ============ Styles ============
  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      color: 'white',
    },
    headerTitle: { margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' },
    headerSub: { margin: '8px 0 0', opacity: 0.9, fontSize: '14px' },
    filters: {
      background: 'white',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    filterBtn: {
      padding: '8px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      background: 'white',
      transition: 'all 0.2s',
    },
    filterBtnActive: {
      background: '#10b981',
      color: 'white',
      borderColor: '#10b981',
    },
    searchInput: {
      padding: '8px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      minWidth: '250px',
      flex: 1,
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb',
    },
    table: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    th: {
      background: '#f9fafb',
      padding: '12px 16px',
      textAlign: 'right',
      fontSize: '13px',
      color: '#6b7280',
      fontWeight: 'bold',
      borderBottom: '1px solid #e5e7eb',
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '13px',
      verticalAlign: 'middle',
    },
    btn: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      marginRight: '6px',
      marginBottom: '4px',
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '16px',
    },
    modalContent: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '13px',
      width: '100%',
      boxSizing: 'border-box',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      color: '#6b7280',
      fontWeight: 'bold',
      marginBottom: '4px',
    },
    badge: {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
    },
  };

  // ============ Render ============
  return (
    <div style={styles.container}>
      {/* هدر */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>💊 اجراآت نسخه‌جات</h1>
        <p style={styles.headerSub}>
          دریافت نسخه‌های داکتر، قیمت‌گذاری دواها و ارسال مبلغ به رسپشن
        </p>
      </div>

      {/* فیلترها */}
      <div style={styles.filters}>
        {[
          { key: 'sent_to_pharmacy', label: '📤 ارسال شده به دواخانه' },
          { key: 'pharmacy_registered', label: '📝 ثبت شده' },
          { key: 'pending', label: '⏳ در انتظار' },
          { key: 'paid', label: '✅ پرداخت شده' },
          { key: 'all', label: '📋 همه' },
        ].map((f) => (
          <button
            key={f.key}
            style={{
              ...styles.filterBtn,
              ...(filter === f.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="🔍 جستجوی نام بیمار یا شماره نسخه..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
          onClick={fetchPrescriptions}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {/* لیست */}
      {loading ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>
            هیچ نسخه‌ای با این فیلتر یافت نشد
          </div>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>بیمار</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>شماره نسخه</th>
                <th style={styles.th}>تعداد اقلام</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>تاریخ</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map((p, idx) => {
                const badge = getStatusBadge(p.status);
                const items = getPrescriptionItems(p);
                const presId = p.pres_id || p.id;

                return (
                  <tr key={presId || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      👤 <strong>{getPatientName(p)}</strong>
                      {p.patient?.mobile && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          📞 {p.patient.mobile}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>👨‍⚕️ {getDoctorName(p)}</td>
                    <td style={styles.td}>
                      <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                        #{presId}
                      </code>
                    </td>
                    <td style={styles.td}>💊 {items.length} قلم</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>📅 {formatDate(p.created_at)}</td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                        onClick={() => handleOpenDetails(p)}
                      >
                        👁️ مشاهده
                      </button>
                      {['sent_to_pharmacy', 'pending'].includes(p.status) && (
                        <button
                          style={{ ...styles.btn, background: '#10b981', color: 'white' }}
                          onClick={() => handleOpenPriceModal(p)}
                        >
                          💰 قیمت‌گذاری
                        </button>
                      )}
                      {p.status === 'pharmacy_registered' && (
                        <button
                          style={{ ...styles.btn, background: '#f59e0b', color: 'white' }}
                          onClick={() => handleOpenPriceModal(p)}
                        >
                          ✏️ ویرایش قیمت
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* مودال جزییات نسخه */}
      {/* ============================================================ */}
      {showDetailsModal && selectedPrescription && (
        <div style={styles.modal} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#10b981' }}>📋 جزییات نسخه</h2>
              <button
                style={{ ...styles.btn, background: '#6b7280', color: 'white' }}
                onClick={() => setShowDetailsModal(false)}
              >
                ✕ بستن
              </button>
            </div>

            {/* اطلاعات بیمار و داکتر */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #10b981',
            }}>
              <div>
                <span style={styles.label}>👤 نام بیمار</span>
                <div style={{ fontWeight: 'bold' }}>{getPatientName(selectedPrescription)}</div>
              </div>
              <div>
                <span style={styles.label}>👨‍⚕️ داکتر معالج</span>
                <div style={{ fontWeight: 'bold' }}>{getDoctorName(selectedPrescription)}</div>
              </div>
              <div>
                <span style={styles.label}>📅 تاریخ نسخه</span>
                <div>{formatDate(selectedPrescription.created_at)}</div>
              </div>
              <div>
                <span style={styles.label}>🆔 شماره نسخه</span>
                <div>#{selectedPrescription.pres_id || selectedPrescription.id}</div>
              </div>
            </div>

            {/* اقلام نسخه */}
            <h3 style={{ color: '#374151', marginBottom: '12px' }}>💊 اقلام تجویز شده</h3>
            {getPrescriptionItems(selectedPrescription).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                هیچ قلمی در این نسخه وجود ندارد
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نام دوا</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>تعداد</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>دستور مصرف</th>
                  </tr>
                </thead>
                <tbody>
                  {getPrescriptionItems(selectedPrescription).map((item, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', fontSize: '13px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                        💊 {getMedicationName(item)}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>
                        {getQuantity(item)}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                        {getDosage(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* مودال قیمت‌گذاری */}
      {/* ============================================================ */}
      {showPriceModal && selectedPrescription && (
        <div style={styles.modal} onClick={() => setShowPriceModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#10b981' }}>💰 قیمت‌گذاری نسخه</h2>
              <button
                style={{ ...styles.btn, background: '#6b7280', color: 'white' }}
                onClick={() => setShowPriceModal(false)}
              >
                ✕ بستن
              </button>
            </div>

            {/* اطلاعات بیمار */}
            <div style={{
              padding: '12px 16px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={styles.label}>👤 بیمار</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {getPatientName(selectedPrescription)}
                  </div>
                </div>
                <div>
                  <span style={styles.label}>🆔 شماره نسخه</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                    #{selectedPrescription.pres_id || selectedPrescription.id}
                  </div>
                </div>
                <div>
                  <span style={styles.label}>👨‍⚕️ داکتر</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {getDoctorName(selectedPrescription)}
                  </div>
                </div>
              </div>
            </div>

            {/* جدول قیمت‌گذاری */}
            <h3 style={{ color: '#374151', marginBottom: '12px' }}>
              💊 اقلام و قیمت‌ها (قابل ویرایش)
            </h3>

            {priceItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                هیچ قلمی برای قیمت‌گذاری وجود ندارد
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نام دوا</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>موجودی</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>تعداد</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>قیمت واحد (AFN)</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>جمع (AFN)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceItems.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '8px', fontSize: '13px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                            💊 {item.medication_name}
                            {!item.catalog_found && (
                              <div style={{ fontSize: '10px', color: '#ef4444' }}>
                                ⚠️ در کاتالوگ یافت نشد
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px', fontSize: '13px' }}>
                            <span style={{
                              color: item.available_in_stock >= item.quantity ? '#10b981' : '#ef4444',
                              fontWeight: 'bold',
                            }}>
                              {item.available_in_stock}
                            </span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              style={{ ...styles.input, width: '80px' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unit_price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              style={{ ...styles.input, width: '120px' }}
                            />
                          </td>
                          <td style={{ padding: '8px', fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                            {item.total_price.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* مبلغ کل */}
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 مبلغ کل نسخه</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                      {getGrandTotal().toLocaleString()} AFN
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'left' }}>
                    این مبلغ برای دریافت توسط رسپشن ارسال می‌شود
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{ ...styles.btn, background: '#6b7280', color: 'white', padding: '12px 24px' }}
                    onClick={() => setShowPriceModal(false)}
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.btn, background: '#10b981', color: 'white', padding: '12px 24px' }}
                    onClick={handleSubmitPricing}
                    disabled={submitting || getGrandTotal() <= 0}
                  >
                    {submitting ? '⏳ در حال ثبت...' : '✅ ثبت قیمت و ارسال به رسپشن'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyPrescriptionExecutions;