// src/app/views/material-kit/pharmacy/medications/PharmacyMedications.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../../../api';
import { toast } from 'react-toastify';

const PharmacyMedications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', unit: '', price: '', description: '',
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/medications');
      const data = response?.data?.data || response?.data || [];
      const medsArray = Array.isArray(data) ? data : [];
      
      // ⭐ لاگ برای دیباگ - ببینید ساختار واقعی چیست
      console.log('📦 ساختار دواها:', medsArray);
      if (medsArray.length > 0) {
        console.log('📦 نمونه اولین دوا:', medsArray[0]);
        console.log('📦 نوع category:', typeof medsArray[0].category);
      }
      
      setMedications(medsArray);
    } catch (error) {
      console.error('❌ خطا:', error);
      toast.error('خطا در دریافت دواها');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ تابع کمکی برای استخراج نام دسته (چه رشته باشد چه آبجکت)
  const getCategoryName = (med) => {
    // حالت 1: category یک رشته است
    if (typeof med.category === 'string') {
      return med.category;
    }
    
    // حالت 2: category یک آبجکت است
    if (med.category && typeof med.category === 'object') {
      return med.category.category_name 
          || med.category.name 
          || '-';
    }
    
    // حالت 3: category_name مستقیم روی med است
    if (med.category_name) {
      return med.category_name;
    }
    
    // حالت 4: category_id فقط دارد
    if (med.category_id) {
      return `دسته #${med.category_id}`;
    }
    
    return '-';
  };

  // ⭐ تابع کمکی برای استخراج ID دسته (برای ارسال به Backend)
  const getCategoryId = (med) => {
    if (med.category && typeof med.category === 'object') {
      return med.category.category_id || med.category.id || '';
    }
    if (med.category_id) {
      return med.category_id;
    }
    return '';
  };

  const handleOpenModal = (med = null) => {
    if (med) {
      setEditingMed(med);
      setFormData({
        name: med.name || med.medication_name || '',
        category: getCategoryId(med),
        unit: med.unit || med.medication_type || '',
        price: med.price || med.unit_price || '',
        description: med.description || '',
      });
    } else {
      setEditingMed(null);
      setFormData({ name: '', category: '', unit: '', price: '', description: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMed) {
        await api.put(`/medications/${editingMed.id || editingMed.med_id}`, formData);
        toast.success('✅ دوا ویرایش شد');
      } else {
        await api.post('/medications', formData);
        toast.success('✅ دوا اضافه شد');
      }
      setShowModal(false);
      fetchMedications();
    } catch (error) {
      console.error('❌ خطای ارسال:', error.response?.data);
      toast.error(error.response?.data?.message || 'خطا در ذخیره');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این دوا اطمینان دارید؟')) return;
    try {
      await api.delete(`/medications/${id}`);
      toast.success('✅ دوا حذف شد');
      fetchMedications();
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const filteredMedications = medications.filter(m => {
    if (!search) return true;
    const name = (m.name || m.medication_name || '').toLowerCase();
    const categoryName = getCategoryName(m).toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || categoryName.includes(searchLower);
  });

  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      borderRadius: '12px', padding: '24px', marginBottom: '24px', color: 'white',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
    },
    addBtn: {
      padding: '10px 20px', background: 'white', color: '#8b5cf6',
      border: 'none', borderRadius: '8px', cursor: 'pointer',
      fontSize: '14px', fontWeight: 'bold',
    },
    searchBar: {
      background: 'white', borderRadius: '12px', padding: '16px',
      marginBottom: '20px',
    },
    searchInput: {
      padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: '8px',
      fontSize: '14px', width: '100%',
    },
    table: { background: 'white', borderRadius: '12px', overflow: 'hidden' },
    th: {
      background: '#f9fafb', padding: '12px 16px', textAlign: 'right',
      fontSize: '13px', color: '#6b7280', fontWeight: 'bold',
    },
    td: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    },
    modalContent: {
      background: 'white', borderRadius: '12px', padding: '24px',
      maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
    },
    input: {
      width: '100%', padding: '10px', border: '1px solid #e5e7eb',
      borderRadius: '8px', fontSize: '14px', marginTop: '6px',
    },
    label: {
      display: 'block', fontSize: '13px', color: '#374151',
      fontWeight: 'bold', marginBottom: '4px', marginTop: '12px',
    },
    btn: {
      padding: '10px 20px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>💊 مدیریت دواها</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9 }}>افزودن، ویرایش و حذف دواها</p>
        </div>
        <button style={styles.addBtn} onClick={() => handleOpenModal()}>
          ➕ افزودن دوا
        </button>
      </div>

      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 جستجوی دوا..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>⏳ در حال بارگذاری...</div>
      ) : filteredMedications.length === 0 ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>هیچ دوایی یافت نشد</div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>نام دوا</th>
              <th style={styles.th}>دسته</th>
              <th style={styles.th}>واحد</th>
              <th style={styles.th}>قیمت</th>
              <th style={styles.th}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredMedications.map((med, idx) => (
              <tr key={med.id || med.med_id || idx}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={styles.td}>💊 {med.name || med.medication_name || '-'}</td>
                {/* ⭐ استفاده از تابع کمکی */}
                <td style={styles.td}>{getCategoryName(med)}</td>
                <td style={styles.td}>{med.unit || med.medication_type || '-'}</td>
                <td style={styles.td}>{med.price || med.unit_price || '-'} AFN</td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.btn, background: '#f59e0b', color: 'white', padding: '6px 12px', fontSize: '12px', marginRight: '6px' }}
                    onClick={() => handleOpenModal(med)}
                  >
                    ✏️ ویرایش
                  </button>
                  <button
                    style={{ ...styles.btn, background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => handleDelete(med.id || med.med_id)}
                  >
                    🗑️ حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* مودال افزودن/ویرایش */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>
              {editingMed ? '✏️ ویرایش دوا' : '➕ افزودن دوا'}
            </h2>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>نام دوا *</label>
              <input
                style={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="مثلاً: پاراسیتامول"
              />

              <label style={styles.label}>دسته (ID)</label>
              <input
                style={styles.input}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="مثلاً: 5"
              />

              <label style={styles.label}>واحد</label>
              <input
                style={styles.input}
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="قرص، شربت، ..."
              />

              <label style={styles.label}>قیمت (AFN)</label>
              <input
                type="number"
                style={styles.input}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
              />

              <label style={styles.label}>توضیحات</label>
              <textarea
                style={{ ...styles.input, minHeight: '80px' }}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیحات اضافی..."
              />

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  style={{ ...styles.btn, background: '#6b7280', color: 'white' }}
                  onClick={() => setShowModal(false)}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, background: '#8b5cf6', color: 'white' }}
                >
                  {editingMed ? 'ذخیره تغییرات' : 'افزودن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyMedications;