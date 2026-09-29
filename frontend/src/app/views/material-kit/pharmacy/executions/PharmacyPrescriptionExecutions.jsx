// src/app/views/material-kit/pharmacy/executions/PharmacyPrescriptionExecutions.jsx
import React, { useState, useEffect, Fragment } from 'react';
import api from '../../../../../api';
import { toast } from 'react-toastify';

// ============================================================
// کامپوننت داخلی: اجراآت نسخه‌جات (دست‌نخورده)
// ============================================================
const PharmacyPrescriptionExecutionsInner = () => {
  // ============ State ============
  const [prescriptions, setPrescriptions] = useState([]);
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('sent_to_pharmacy');
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceItems, setPriceItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [medicationsCatalog, setMedicationsCatalog] = useState([]);
  const [executionsMap, setExecutionsMap] = useState({});

  // ============ Effects ============
  useEffect(() => {
    const loadAll = async () => {
      await fetchExecutions();
      await fetchMedicationsCatalog();
      await fetchPrescriptions();
    };
    loadAll();
  }, [filter]);

  // ============ Fetch Data ============
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions');
      let data = response?.data?.data || response?.data || [];
      if (!Array.isArray(data)) data = [];
      setAllPrescriptions(data);
    } catch (error) {
      console.error('❌ خطا در دریافت نسخه‌ها:', error);
      toast.error('خطا در دریافت نسخه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await api.get('/pharmacy-executions');
      const data = response?.data?.data || [];
      const map = {};
      data.forEach((ex) => {
        if (!map[ex.pres_id] || new Date(ex.created_at) > new Date(map[ex.pres_id].created_at)) {
          map[ex.pres_id] = ex;
        }
      });
      setExecutionsMap(map);
    } catch (error) {
      console.error('❌ خطا در دریافت اجراآت:', error);
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

  // ============ فیلتر ============
  const filterByStatus = (list) => {
    if (filter === 'all') return list;
    return list.filter((p) => {
      const presId = p.pres_id || p.id;
      const ex = executionsMap[presId];
      switch (filter) {
        case 'sent_to_pharmacy':
          return ['sent_to_pharmacy', 'pending'].includes(p.status) && !ex;
        case 'registered':
          return ex && ex.status === 'pending';
        case 'pending':
          return ex && ex.status === 'sent_to_registration';
        case 'paid':
          return ex && ex.status === 'paid';
        default:
          return true;
      }
    });
  };

  // ============ Patient Helpers ============
  const getPatientFullName = (source) => {
    if (!source) return 'نامشخص';
    if (source.patient?.full_name) return source.patient.full_name;
    if (source.patient?.first_name || source.patient?.last_name) {
      return `${source.patient.first_name || ''} ${source.patient.last_name || ''}`.trim();
    }
    if (source.full_name) return source.full_name;
    if (source.first_name || source.last_name) {
      return `${source.first_name || ''} ${source.last_name || ''}`.trim();
    }
    if (source.patient_name) return source.patient_name;
    return 'نامشخص';
  };

  const getPatientAge = (source) => {
    if (!source) return '-';
    const age = source.patient?.age || source.age || source.patient_age;
    return age ? `${age} سال` : '-';
  };

  const getPatientGender = (source) => {
    if (!source) return '-';
    let gender = source.patient?.gender || source.gender || source.patient_gender;
    if (!gender) return '-';
    const genderMap = {
      Male: 'مرد', male: 'مرد', M: 'مرد', m: 'مرد',
      Female: 'زن', female: 'زن', F: 'زن', f: 'زن',
      other: 'دیگر', Other: 'دیگر',
    };
    return genderMap[gender] || gender;
  };

  const getPatientMobile = (source) => {
    if (!source) return '-';
    return source.patient?.mobile || source.patient?.phone || source.mobile || source.phone || source.patient_mobile || '-';
  };

  const getPatientNationalId = (source) => {
    if (!source) return '-';
    return source.patient?.national_id || source.national_id || source.patient_national_id || '-';
  };

  const getPatientAddress = (source) => {
    if (!source) return '-';
    return source.patient?.address || source.address || '-';
  };

  const getRegId = (source) => {
    if (!source) return '-';
    return source.reg_id || source.patient?.reg_id || source.registration_id || '-';
  };

  const getPatientFileNumber = (source) => {
    if (!source) return '-';
    return (
      source.patient?.file_number ||
      source.patient?.patient_code ||
      source.file_number ||
      source.patient_code ||
      '-'
    );
  };

  // ============ Doctor Helpers ============
  const getDoctorName = (prescription) => {
    if (!prescription) return '-';
    return (
      prescription.doctor?.name ||
      prescription.doctor_name ||
      prescription.doctor?.full_name ||
      '-'
    );
  };

  const getDoctorSpecialty = (prescription) => {
    if (!prescription) return '-';
    return (
      prescription.doctor?.specialty ||
      prescription.doctor?.specialization ||
      prescription.doctor_specialty ||
      '-'
    );
  };

  const getDoctorDepartment = (prescription) => {
    if (!prescription) return '-';
    return (
      prescription.doctor?.department?.name ||
      prescription.doctor?.department_name ||
      prescription.department_name ||
      '-'
    );
  };

  // ============ Medication Helpers ============
  const getMedicationName = (item) => {
    if (!item) return 'نامشخص';
    if (typeof item.medication_name === 'string') return item.medication_name;
    if (typeof item.med_name === 'string') return item.med_name;
    if (item.med?.name) return item.med.name;
    if (item.medication?.name) return item.medication.name;
    if (typeof item.name === 'string') return item.name;
    return '-';
  };

  const isCustomMedication = (item) => {
    if (!item) return false;
    return (
      item.is_custom === true ||
      item.is_custom === 1 ||
      item.is_custom === 'true' ||
      item.is_custom === '1'
    );
  };

  const getMedicationType = (item) => {
    if (!item) return '-';
    const medId = getMedicationId(item);
    if (medId && medicationsCatalog.length > 0) {
      const catalogMed = medicationsCatalog.find(
        (m) => m.id === medId || m.med_id === medId
      );
      if (catalogMed) {
        const type = catalogMed.type || catalogMed.medication_type || catalogMed.unit || catalogMed.dosage_form;
        if (type) return type;
      }
    }
    if (item.type) return item.type;
    if (item.medication_type) return item.medication_type;
    if (item.unit) return item.unit;
    if (item.dosage_form) return item.dosage_form;
    if (item.med?.type) return item.med.type;
    if (item.medication?.type) return item.medication.type;
    return '-';
  };

  const getDosage = (item) => {
    if (!item) return '-';
    if (item.dosage) return item.dosage;
    if (item.dose) return item.dose;
    if (item.instructions) return item.instructions;
    if (item.directions) return item.directions;
    if (item.usage) return item.usage;
    return '-';
  };

  const getNotes = (item) => {
    if (!item) return '-';
    if (item.notes) return item.notes;
    if (item.note) return item.note;
    if (item.remarks) return item.remarks;
    if (item.comment) return item.comment;
    if (item.description) return item.description;
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

  const getExecutionStatusBadge = (execution) => {
    if (!execution) return null;
    const map = {
      pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ در انتظار پرداخت' },
      sent_to_registration: { bg: '#dbeafe', color: '#1e40af', text: '📤 ارسال به رسپشن' },
      paid: { bg: '#d1fae5', color: '#065f46', text: '✅ پرداخت شده' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: '❌ لغو شده' },
    };
    return map[execution.status] || null;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try { return new Date(date).toLocaleDateString('fa-IR'); }
    catch { return '-'; }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  // ============ Actions ============
  const handleOpenDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };

  const handleOpenPriceModal = (prescription) => {
    const items = getPrescriptionItems(prescription);
    if (items.length === 0) {
      toast.warning('هیچ قلمی در این نسخه وجود ندارد');
      return;
    }
    const pricedItems = items.map((item) => {
      const custom = isCustomMedication(item);
      const medId = getMedicationId(item);
      const catalogMed = medicationsCatalog.find(
        (m) => m.id === medId || m.med_id === medId
      );
      const unitPrice = custom ? 0 : (catalogMed?.price || catalogMed?.unit_price || item.unit_price || 0);
      const quantity = getQuantity(item) || 1;
      return {
        med_id: medId,
        medication_name: getMedicationName(item),
        medication_type: getMedicationType(item),
        quantity: quantity,
        dosage: getDosage(item),
        notes: getNotes(item),
        unit_price: Number(unitPrice),
        total_price: Number(unitPrice) * quantity,
        instructions: item.instructions || '',
        catalog_found: !!catalogMed,
        is_custom: custom,
      };
    });
    setPriceItems(pricedItems);
    setSelectedPrescription(prescription);
    setShowPriceModal(true);
  };

  const handlePriceChange = (index, newUnitPrice) => {
    setPriceItems((prev) => {
      const updated = [...prev];
      if (updated[index].is_custom) return prev;
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
      if (updated[index].is_custom) return prev;
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
    return priceItems
      .filter((item) => !item.is_custom)
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleSubmitPricing = async () => {
    if (!selectedPrescription) return;
    const stockedItems = priceItems.filter((item) => !item.is_custom);
    if (stockedItems.length === 0) {
      toast.warning('هیچ قلم گدامی برای قیمت‌گذاری وجود ندارد');
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
      const itemsPayload = stockedItems.map((item) => ({
        med_id: item.med_id,
        medication_name: item.medication_name,
        medication_type: item.medication_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        dosage: item.dosage,
        notes: item.notes,
        is_custom: false,
      }));
      const executionData = {
        pres_id: presId,
        patient_id: selectedPrescription.patient_id,
        reg_id: selectedPrescription.reg_id || getRegId(selectedPrescription),
        doc_id: selectedPrescription.doc_id || selectedPrescription.doctor_id,
        patient_name: getPatientFullName(selectedPrescription),
        tazkira_number: getPatientNationalId(selectedPrescription),
        patient_age: parseInt(getPatientAge(selectedPrescription)) || null,
        patient_gender: getPatientGender(selectedPrescription),
        patient_phone: getPatientMobile(selectedPrescription),
        patient_address: getPatientAddress(selectedPrescription),
        doctor_name: getDoctorName(selectedPrescription),
        doctor_specialty: getDoctorSpecialty(selectedPrescription),
        doctor_department: getDoctorDepartment(selectedPrescription),
        total_amount: totalAmount,
        discount: 0,
        items: itemsPayload,
        notes: '',
      };
      const existing = executionsMap[presId];
      let response;
      if (existing) {
        response = await api.put(`/pharmacy-executions/${existing.id}`, {
          items: itemsPayload,
          total_amount: totalAmount,
          discount: 0,
          notes: '',
        });
      } else {
        response = await api.post('/pharmacy-executions', executionData);
      }
      if (response.data?.success) {
        toast.success(
          existing
            ? `✅ اجراآت ویرایش شد - مبلغ: ${totalAmount.toLocaleString()} AFN`
            : `✅ اجراآت ثبت شد - مبلغ: ${totalAmount.toLocaleString()} AFN`
        );
        setShowPriceModal(false);
        setPriceItems([]);
        setSelectedPrescription(null);
        await fetchExecutions();
        await fetchPrescriptions();
      } else {
        toast.error(response.data?.message || 'خطا در ثبت اجراآت');
      }
    } catch (error) {
      console.error('❌ خطا در ثبت اجراآت:', error);
      const errors = error.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach((field) => {
          const msgs = errors[field];
          if (Array.isArray(msgs)) msgs.forEach((m) => toast.error(`❌ ${field}: ${m}`));
          else toast.error(`❌ ${field}: ${msgs}`);
        });
      } else {
        toast.error(error.response?.data?.message || 'خطا در ثبت اجراآت');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintExecution = async (execution) => {
    try {
      const response = await api.get(`/pharmacy-executions/${execution.id}/print`);
      const data = response.data.data;
      const e = data.execution;
      const printWindow = window.open('', '_blank', 'width=800,height=700');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>رسید فیس دواخانه</title>
              <style>
                body { font-family: 'Vazirmatn', Tahoma, sans-serif; padding: 30px; direction: rtl; }
                .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
                .title { font-size: 26px; font-weight: bold; color: #10b981; }
                .section { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
                .section-title { font-weight: bold; color: #374151; margin-bottom: 10px; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
                .label { color: #6b7280; font-weight: bold; }
                .value { color: #000; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
                th { background: #f5f5f5; color: #374151; }
                .total { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; margin-top: 20px; }
                .total-label { font-size: 14px; opacity: 0.9; }
                .total-amount { font-size: 30px; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px dashed #ccc; font-size: 12px; color: #6b7280; }
                .signature { display: flex; justify-content: space-between; margin-top: 40px; }
                .sig-box { width: 200px; text-align: center; }
                .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 12px; }
                @media print { body { padding: 15px; } .section { background: #fff; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">💊 رسید فیس دواخانه</div>
                <div>${data.hospital_name || 'بیمارستان'}</div>
                <div style="font-size:12px; color:#666;">تلفن: ${data.hospital_phone || ''}</div>
              </div>
              <div class="section">
                <div class="section-title">👤 معلومات بیمار</div>
                <div class="info-grid">
                  <div class="row"><span class="label">نام بیمار:</span><span class="value">${e.patient_name || '-'}</span></div>
                  <div class="row"><span class="label">شماره تذکره:</span><span class="value">${e.tazkira_number || '-'}</span></div>
                  <div class="row"><span class="label">سن:</span><span class="value">${e.patient_age ? e.patient_age + ' سال' : '-'}</span></div>
                  <div class="row"><span class="label">جنسیت:</span><span class="value">${e.patient_gender === 'male' ? 'مرد' : e.patient_gender === 'female' ? 'زن' : e.patient_gender || '-'}</span></div>
                  <div class="row"><span class="label">شماره تماس:</span><span class="value">${e.patient_phone || '-'}</span></div>
                  <div class="row"><span class="label">شماره مراجعه:</span><span class="value">#${e.reg_id || '-'}</span></div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">👨‍⚕️ معلومات داکتر</div>
                <div class="info-grid">
                  <div class="row"><span class="label">نام داکتر:</span><span class="value">${e.doctor_name || '-'}</span></div>
                  <div class="row"><span class="label">تخصص:</span><span class="value">${e.doctor_specialty || '-'}</span></div>
                  <div class="row"><span class="label">شماره رسید:</span><span class="value">${e.receipt_number || '-'}</span></div>
                  <div class="row"><span class="label">تاریخ:</span><span class="value">${new Date(e.created_at).toLocaleDateString('fa-IR')}</span></div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">💊 اقلام تجویز شده</div>
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>نام دوا</th><th>نوعیت</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(e.items || []).map((item, idx) => `
                      <tr>
                        <td>${idx + 1}</td>
                        <td>${item.medication_name || '-'}</td>
                        <td>${item.medication_type || '-'}</td>
                        <td>${item.quantity || 0}</td>
                        <td>${Number(item.unit_price || 0).toLocaleString()} AFN</td>
                        <td style="font-weight:bold;">${Number(item.total_price || 0).toLocaleString()} AFN</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div class="total">
                <div class="total-label">💰 مبلغ کل</div>
                <div class="total-amount">${Number(e.total_amount || 0).toLocaleString()} AFN</div>
              </div>
              <div class="signature">
                <div class="sig-box"><div class="sig-line">امضای داکتر</div></div>
                <div class="sig-box"><div class="sig-line">امضای دواخانه</div></div>
                <div class="sig-box"><div class="sig-line">امضای رسپشن</div></div>
              </div>
              <div class="footer">
                <p>تاریخ چاپ: ${data.print_date}</p>
                <p>با تشکر از اعتماد شما</p>
              </div>
              <script>window.onload = function() { window.print(); }<\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      fetchExecutions();
    } catch (error) {
      console.error('❌ خطا در پرینت:', error);
      toast.error('خطا در پرینت رسید');
    }
  };

  const displayPrescriptions = filterByStatus(allPrescriptions).filter((p) => {
    if (!search) return true;
    const patientName = getPatientFullName(p).toLowerCase();
    const presId = String(p.pres_id || p.id || '');
    const mobile = getPatientMobile(p);
    const nationalId = getPatientNationalId(p);
    return (
      patientName.includes(search.toLowerCase()) ||
      presId.includes(search) ||
      mobile.includes(search) ||
      nationalId.includes(search)
    );
  });

  // ============ Styles ============
  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '12px', padding: '24px', marginBottom: '24px', color: 'white',
    },
    headerTitle: { margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' },
    headerSub: { margin: '8px 0 0', opacity: 0.9, fontSize: '14px' },
    filters: {
      background: 'white', borderRadius: '12px', padding: '16px',
      marginBottom: '20px', display: 'flex', gap: '12px',
      flexWrap: 'wrap', alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    filterBtn: {
      padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px',
      cursor: 'pointer', fontSize: '13px', background: 'white', transition: 'all 0.2s',
    },
    filterBtnActive: { background: '#10b981', color: 'white', borderColor: '#10b981' },
    searchInput: {
      padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px',
      fontSize: '14px', minWidth: '250px', flex: 1,
    },
    table: {
      background: 'white', borderRadius: '12px',
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    th: {
      background: '#f9fafb', padding: '12px 16px', textAlign: 'right',
      fontSize: '13px', color: '#6b7280', fontWeight: 'bold',
      borderBottom: '1px solid #e5e7eb',
    },
    td: {
      padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
      fontSize: '13px', verticalAlign: 'middle',
    },
    btn: {
      padding: '8px 16px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
      marginRight: '6px', marginBottom: '4px',
    },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px',
    },
    modalContent: {
      background: 'white', borderRadius: '12px', padding: '24px',
      maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
    },
    input: {
      padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px',
      fontSize: '13px', width: '100%', boxSizing: 'border-box',
    },
    label: { display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' },
    badge: {
      padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
      fontWeight: 'bold', display: 'inline-block',
    },
    patientInfoCard: {
      padding: '16px',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      borderRadius: '10px', border: '2px solid #10b981', marginBottom: '16px',
    },
    patientInfoGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
    },
    infoItem: {
      background: 'white', padding: '10px 12px', borderRadius: '8px',
      border: '1px solid #d1fae5',
    },
    infoLabel: {
      fontSize: '11px', color: '#059669', fontWeight: 'bold',
      display: 'block', marginBottom: '4px',
    },
    infoValue: { fontSize: '14px', color: '#1f2937', fontWeight: 'bold' },
  };

  // ============ Render ============
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>💊 اجراآت نسخه‌جات</h1>
        <p style={styles.headerSub}>
          دریافت نسخه‌های داکتر، قیمت‌گذاری دواها و ارسال مبلغ به رسپشن
        </p>
      </div>

      <div style={styles.filters}>
        {[
          { key: 'sent_to_pharmacy', label: '📤 ارسال شده به دواخانه' },
          { key: 'registered', label: '📝 ثبت شده' },
          { key: 'pending', label: '⏳ در انتظار' },
          { key: 'paid', label: '✅ پرداخت شده' },
          { key: 'all', label: '📋 همه' },
        ].map((f) => (
          <button
            key={f.key}
            style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="🔍 جستجوی نام، شماره نسخه، موبایل یا کد ملی..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
          onClick={async () => {
            await fetchExecutions();
            await fetchPrescriptions();
          }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {loading ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : displayPrescriptions.length === 0 ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>هیچ نسخه‌ای با این فیلتر یافت نشد</div>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>شماره نسخه</th>
                <th style={styles.th}>تعداد اقلام</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>تاریخ و ساعت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {displayPrescriptions.map((p, idx) => {
                const badge = getStatusBadge(p.status);
                const items = getPrescriptionItems(p);
                const presId = p.pres_id || p.id;
                const doctorSpecialty = getDoctorSpecialty(p);
                const doctorDept = getDoctorDepartment(p);
                const execution = executionsMap[presId];
                const execBadge = getExecutionStatusBadge(execution);
                const stockedItems = items.filter((it) => !isCustomMedication(it));
                const customItems = items.filter((it) => isCustomMedication(it));

                return (
                  <tr key={presId || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                        👤 {getPatientFullName(p)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {getPatientAge(p) !== '-' && <span>🎂 {getPatientAge(p)}</span>}
                        {getPatientGender(p) !== '-' && <span>⚤ {getPatientGender(p)}</span>}
                      </div>
                      {getPatientMobile(p) !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          📞 {getPatientMobile(p)}
                        </div>
                      )}
                      {getPatientNationalId(p) !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          🪪 {getPatientNationalId(p)}
                        </div>
                      )}
                      {getRegId(p) !== '-' && (
                        <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                          🔢 مراجعه: {getRegId(p)}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                        👨‍⚕️ {getDoctorName(p)}
                      </div>
                      {doctorSpecialty !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          🎓 {doctorSpecialty}
                        </div>
                      )}
                      {doctorDept !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          🏥 {doctorDept}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                        #{presId}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        background: '#dbeafe', color: '#1e40af',
                        padding: '4px 10px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: 'bold',
                      }}>
                        💊 {stockedItems.length} گدامی
                      </span>
                      {customItems.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <span style={{
                            background: '#fef3c7', color: '#92400e',
                            padding: '3px 8px', borderRadius: '10px',
                            fontSize: '11px', fontWeight: 'bold',
                          }}>
                            ✍️ {customItems.length} دستی
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {execution && execBadge ? (
                        <span style={{ ...styles.badge, background: execBadge.bg, color: execBadge.color }}>
                          {execBadge.text}
                        </span>
                      ) : (
                        <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                          {badge.text}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div>📅 {formatDate(p.created_at)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        🕐 {formatTime(p.created_at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                        onClick={() => handleOpenDetails(p)}
                      >
                        👁️ مشاهده
                      </button>
                      {!execution && ['sent_to_pharmacy', 'pending'].includes(p.status) && (
                        <button
                          style={{ ...styles.btn, background: '#10b981', color: 'white' }}
                          onClick={() => handleOpenPriceModal(p)}
                        >
                          💰 قیمت‌گذاری
                        </button>
                      )}
                      {execution && execution.status === 'pending' && (
                        <button
                          style={{ ...styles.btn, background: '#f59e0b', color: 'white' }}
                          onClick={() => handleOpenPriceModal(p)}
                        >
                          ✏️ ویرایش قیمت
                        </button>
                      )}
                      {execution && (
                        <button
                          style={{ ...styles.btn, background: '#8b5cf6', color: 'white' }}
                          onClick={() => handlePrintExecution(execution)}
                        >
                          🖨️ پرینت
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

      {/* مودال جزییات نسخه */}
      {showDetailsModal && selectedPrescription && (() => {
        const presId = selectedPrescription.pres_id || selectedPrescription.id;
        const execution = executionsMap[presId];
        const hasPricing = execution && Array.isArray(execution.items) && execution.items.length > 0;
        const displayItems = hasPricing ? execution.items : getPrescriptionItems(selectedPrescription);

        return (
          <div style={styles.modal} onClick={() => setShowDetailsModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#10b981' }}>📋 جزییات نسخه</h2>
                <button style={{ ...styles.btn, background: '#6b7280', color: 'white' }} onClick={() => setShowDetailsModal(false)}>
                  ✕ بستن
                </button>
              </div>

              <div style={styles.patientInfoCard}>
                <h3 style={{ margin: '0 0 12px 0', color: '#059669', fontSize: '16px' }}>👤 معلومات بیمار</h3>
                <div style={styles.patientInfoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>نام کامل</span>
                    <div style={styles.infoValue}>{getPatientFullName(selectedPrescription)}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>سن</span>
                    <div style={styles.infoValue}>{getPatientAge(selectedPrescription)}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>جنسیت</span>
                    <div style={styles.infoValue}>{getPatientGender(selectedPrescription)}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>شماره تماس</span>
                    <div style={styles.infoValue}>{getPatientMobile(selectedPrescription)}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>کد ملی / تذکره</span>
                    <div style={styles.infoValue}>{getPatientNationalId(selectedPrescription)}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>شماره مراجعه</span>
                    <div style={styles.infoValue}>{getRegId(selectedPrescription)}</div>
                  </div>
                  {getPatientFileNumber(selectedPrescription) !== '-' && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>شماره پرونده</span>
                      <div style={styles.infoValue}>{getPatientFileNumber(selectedPrescription)}</div>
                    </div>
                  )}
                  {getPatientAddress(selectedPrescription) !== '-' && (
                    <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                      <span style={styles.infoLabel}>آدرس</span>
                      <div style={styles.infoValue}>{getPatientAddress(selectedPrescription)}</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                padding: '16px', background: '#eff6ff', borderRadius: '10px',
                border: '1px solid #3b82f6', marginBottom: '20px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
              }}>
                <div>
                  <span style={{ ...styles.label, color: '#1e40af' }}>👨‍⚕️ داکتر معالج</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{getDoctorName(selectedPrescription)}</div>
                </div>
                <div>
                  <span style={{ ...styles.label, color: '#1e40af' }}>🆔 شماره نسخه</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                    #{selectedPrescription.pres_id || selectedPrescription.id}
                  </div>
                </div>
                <div>
                  <span style={{ ...styles.label, color: '#1e40af' }}>📅 تاریخ نسخه</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatDate(selectedPrescription.created_at)}</div>
                </div>
                <div>
                  <span style={{ ...styles.label, color: '#1e40af' }}>🕐 ساعت</span>
                  <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatTime(selectedPrescription.created_at)}</div>
                </div>
              </div>

              {hasPricing && (
                <div style={{
                  marginTop: '20px', padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px', color: 'white',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 مبلغ کل (فقط اقلام گدامی)</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                      {Number(execution.total_amount || 0).toLocaleString()} AFN
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'left' }}>
                    {execution.status === 'paid' && '✅ پرداخت شده'}
                    {execution.status === 'sent_to_registration' && '📤 ارسال شده به رسپشن'}
                    {execution.status === 'pending' && '⏳ در انتظار پرداخت'}
                    <br />
                    <span style={{ fontSize: '12px', opacity: 0.9 }}>
                      شماره رسید: <strong>#{execution.id}</strong>
                    </span>
                  </div>
                </div>
              )}

              <h3 style={{ color: '#374151', marginBottom: '12px' }}>
                💊 اقلام {hasPricing ? 'قیمت‌گذاری‌شده' : 'تجویز شده'}
              </h3>

              {displayItems.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                  هیچ قلمی در این نسخه وجود ندارد
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>#</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نام دوا</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>منبع</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نوعیت</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>تعداد</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>مقدار مصرف</th>
                      {hasPricing && (
                        <>
                          <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>قیمت واحد</th>
                          <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>جمع</th>
                        </>
                      )}
                      <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, idx) => {
                      const isCustom = isCustomMedication(item);
                      return (
                        <tr key={idx} style={{ borderTop: '1px solid #e5e7eb', background: isCustom ? '#fffbeb' : 'transparent' }}>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{idx + 1}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>💊 {getMedicationName(item)}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>
                            {isCustom ? (
                              <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>✍️ دستی</span>
                            ) : (
                              <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>📦 گدام</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{isCustom ? '—' : getMedicationType(item)}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{getQuantity(item)}</td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#059669', fontWeight: 'bold' }}>{getDosage(item)}</td>
                          {hasPricing && (
                            <>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#d48806', fontWeight: 'bold' }}>
                                {isCustom ? '—' : `${Number(item.unit_price || 0).toLocaleString()} AFN`}
                              </td>
                              <td style={{ padding: '10px', fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>
                                {isCustom ? '—' : `${Number(item.total_price || 0).toLocaleString()} AFN`}
                              </td>
                            </>
                          )}
                          <td style={{ padding: '10px', fontSize: '12px', color: '#6b7280' }}>{getNotes(item)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })()}

      {/* مودال قیمت‌گذاری */}
      {showPriceModal && selectedPrescription && (
        <div style={styles.modal} onClick={() => setShowPriceModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#10b981' }}>
                💰 {executionsMap[selectedPrescription.pres_id || selectedPrescription.id] ? 'ویرایش قیمت' : 'قیمت‌گذاری'} نسخه
              </h2>
              <button style={{ ...styles.btn, background: '#6b7280', color: 'white' }} onClick={() => setShowPriceModal(false)}>
                ✕ بستن
              </button>
            </div>

            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: '0 0 12px 0', color: '#059669', fontSize: '15px' }}>👤 معلومات بیمار</h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>نام کامل</span>
                  <div style={styles.infoValue}>{getPatientFullName(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>سن</span>
                  <div style={styles.infoValue}>{getPatientAge(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>جنسیت</span>
                  <div style={styles.infoValue}>{getPatientGender(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره تماس</span>
                  <div style={styles.infoValue}>{getPatientMobile(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>کد ملی / تذکره</span>
                  <div style={styles.infoValue}>{getPatientNationalId(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره مراجعه</span>
                  <div style={styles.infoValue}>{getRegId(selectedPrescription)}</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '12px 16px', background: '#eff6ff', borderRadius: '8px',
              border: '1px solid #3b82f6', marginBottom: '16px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px',
            }}>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>👨‍⚕️ داکتر</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{getDoctorName(selectedPrescription)}</div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>🆔 شماره نسخه</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                  #{selectedPrescription.pres_id || selectedPrescription.id}
                </div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>📅 تاریخ</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatDate(selectedPrescription.created_at)}</div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>🕐 ساعت</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatTime(selectedPrescription.created_at)}</div>
              </div>
            </div>

            {priceItems.some((i) => i.is_custom) && (
              <div style={{
                padding: '10px 14px', background: '#fef3c7', color: '#92400e',
                borderRadius: '8px', marginBottom: '12px', fontSize: '12px',
                borderRight: '4px solid #f59e0b',
              }}>
                ⚠️ <strong>توجه:</strong> دواهای <strong>دستی</strong> (با پس‌زمینه زرد) در جدول زیر نمایش داده می‌شوند اما از قیمت‌گذاری <strong>معاف</strong> هستند.
              </div>
            )}

            <h3 style={{ color: '#374151', marginBottom: '12px' }}>💊 اقلام نسخه</h3>

            {priceItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                هیچ قلمی در این نسخه وجود ندارد
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نام دوا</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>منبع</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نوعیت دوا</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>مقدار مصرف</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>تعداد</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>قیمت واحد (AFN)</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>جمع (AFN)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceItems.map((item, idx) => {
                        const isCustom = item.is_custom;
                        return (
                          <tr key={idx} style={{
                            borderTop: '1px solid #e5e7eb',
                            background: isCustom ? '#fffbeb' : 'transparent',
                            opacity: isCustom ? 0.85 : 1,
                          }}>
                            <td style={{ padding: '8px', fontSize: '13px' }}>{idx + 1}</td>
                            <td style={{ padding: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                              💊 {item.medication_name}
                              {!isCustom && !item.catalog_found && (
                                <div style={{ fontSize: '10px', color: '#ef4444' }}>⚠️ در کاتالوگ یافت نشد</div>
                              )}
                            </td>
                            <td style={{ padding: '8px', fontSize: '13px' }}>
                              {isCustom ? (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✍️ دستی</span>
                              ) : (
                                <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>📦 گدام</span>
                              )}
                            </td>
                            <td style={{ padding: '8px', fontSize: '13px', color: '#6b7280' }}>{isCustom ? '—' : item.medication_type}</td>
                            <td style={{ padding: '8px', fontSize: '13px', color: '#059669', fontWeight: 'bold' }}>{item.dosage}</td>
                            <td style={{ padding: '8px' }}>
                              {isCustom ? (
                                <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: '6px', textAlign: 'center', fontSize: '13px', color: '#6b7280', fontWeight: 'bold', minWidth: '70px' }}>
                                  {item.quantity}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                  style={{ ...styles.input, width: '70px' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {isCustom ? (
                                <div style={{ padding: '8px 12px', background: '#fef3c7', border: '1px dashed #f59e0b', borderRadius: '6px', textAlign: 'center', fontSize: '11px', color: '#92400e', fontWeight: 'bold', minWidth: '160px', whiteSpace: 'nowrap' }}>
                                  🚫 دستی — پرداخت ندارد
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.unit_price}
                                  onChange={(e) => handlePriceChange(idx, e.target.value)}
                                  style={{ ...styles.input, width: '110px' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                              {isCustom ? (
                                <span style={{ color: '#9ca3af' }}>—</span>
                              ) : (
                                <span style={{ color: '#10b981' }}>{item.total_price.toLocaleString()}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  marginTop: '20px', padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px', color: 'white',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 مبلغ کل (فقط اقلام گدامی)</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                      {getGrandTotal().toLocaleString()} AFN
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'left' }}>
                    {priceItems.filter((i) => i.is_custom).length > 0 && (
                      <div>
                        <strong>{priceItems.filter((i) => i.is_custom).length}</strong> قلم دستی معاف از پرداخت
                        <br />
                      </div>
                    )}
                    این مبلغ برای دریافت توسط رسپشن ارسال می‌شود
                  </div>
                </div>

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
                    {submitting
                      ? '⏳ در حال ثبت...'
                      : executionsMap[selectedPrescription.pres_id || selectedPrescription.id]
                        ? '✅ ذخیره تغییرات'
                        : '✅ ثبت قیمت و ارسال به رسپشن'}
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

// ============================================================
// کامپوننت داخلی: نسخه‌های بیرونی (اصلاح‌شده نهایی)
// ============================================================
const PharmacyExternalPrescriptionsInner = () => {
  // ============ State ============
  const [externalPrescriptions, setExternalPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [medicationsCatalog, setMedicationsCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [stockAvailability, setStockAvailability] = useState({
    available: false, totalStock: 0, message: '', checking: false, nextBatch: null
  });

  const [patientForm, setPatientForm] = useState({
    patient_name: '', patient_age: '', patient_gender: '', patient_phone: '',
    tazkira_number: '', patient_address: '', doctor_name: '', diagnosis: '', notes: '',
  });

  const emptyItem = {
    category_id: '', med_id: '', supplier_id: '', dosage: '', quantity: '', remarks: '', type: '',
  };
  const [formItem, setFormItem] = useState(emptyItem);

  // ⭐ قیمت‌گذاری درون فرم
  const [itemPrices, setItemPrices] = useState({});

  // ============ Effects ============
  useEffect(() => {
    const loadAll = async () => {
      await fetchExternalPrescriptions();
      await fetchMedicationsCatalog();
      await fetchCategories();
    };
    loadAll();
  }, []);

  // ============ Fetch Data ============
  const fetchExternalPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/external-prescriptions');
      let data = response?.data?.data || response?.data || [];
      if (!Array.isArray(data)) data = [];
      setExternalPrescriptions(data);
    } catch (error) {
      console.error('❌ خطا در دریافت نسخه‌های بیرونی:', error);
      toast.error('خطا در دریافت نسخه‌های بیرونی');
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

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const data = response?.data?.data || response?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ خطا در دریافت کتگوری‌ها:', error);
    }
  };

  const loadSuppliersForMedication = async (medId) => {
    if (!medId) { setSuppliers([]); return; }
    setLoadingSuppliers(true);
    setSuppliers([]);
    try {
      const res = await api.get(`/prescriptions/medication/${medId}/suppliers`);
      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      setSuppliers(list);
      if (list.length === 0) toast.warning('⚠️ حمایت‌کننده‌ای یافت نشد');
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // ============ بررسی موجودی ============
  useEffect(() => {
    const checkStockAvailability = async () => {
      if (!formItem.med_id || !formItem.supplier_id || !formItem.quantity || Number(formItem.quantity) <= 0) {
        setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
        return;
      }
      setStockAvailability(prev => ({ ...prev, checking: true }));
      try {
        const response = await api.get('/prescriptions/next-batch', {
          params: {
            med_id: Number(formItem.med_id),
            supplier_id: Number(formItem.supplier_id),
            quantity: Number(formItem.quantity)
          }
        });
        if (response.data?.success) {
          const batch = response.data.data;
          setStockAvailability({
            available: true,
            totalStock: batch.quantity || 0,
            message: `✅ بچ: ${batch.batch_number || 'بدون بچ'} — انقضا: ${batch.exp_date || '-'} — بارکد: ${batch.barcode || '-'}`,
            checking: false,
            nextBatch: batch
          });
        } else {
          setStockAvailability({
            available: false, totalStock: 0,
            message: response.data?.message || '❌ موجودی کافی نیست',
            checking: false, nextBatch: null
          });
        }
      } catch (error) {
        setStockAvailability({
          available: false, totalStock: 0,
          message: error.response?.status === 404 ? '❌ موجودی کافی یافت نشد' : '⚠️ خطا در بررسی موجودی',
          checking: false, nextBatch: null
        });
      }
    };
    const timer = setTimeout(() => checkStockAvailability(), 500);
    return () => clearTimeout(timer);
  }, [formItem.med_id, formItem.supplier_id, formItem.quantity]);

  // ============ Helpers ============
  const filteredMedications = medicationsCatalog.filter(
    (m) => Number(m.category_id) === Number(formItem.category_id)
  );

  const getPatientFullName = (source) => {
    if (!source) return 'نامشخص';
    return source.patient_name || 'نامشخص';
  };

  const getPatientAge = (source) => {
    if (!source) return '-';
    const age = source.patient_age;
    return age ? `${age} سال` : '-';
  };

  const getPatientGender = (source) => {
    if (!source) return '-';
    let gender = source.patient_gender;
    if (!gender) return '-';
    const genderMap = {
      Male: 'مرد', male: 'مرد', M: 'مرد', m: 'مرد',
      Female: 'زن', female: 'زن', F: 'زن', f: 'زن',
    };
    return genderMap[gender] || gender;
  };

  const getPatientMobile = (source) => {
    if (!source) return '-';
    return source.patient_phone || '-';
  };

  const getPatientNationalId = (source) => {
    if (!source) return '-';
    return source.tazkira_number || '-';
  };

  const getPatientAddress = (source) => {
    if (!source) return '-';
    return source.patient_address || '-';
  };

  const getDoctorName = (source) => {
    if (!source) return '-';
    return source.doctor_name || '-';
  };

  const getMedicationName = (item) => {
    if (!item) return 'نامشخص';
    return item.medication_name || 'نامشخص';
  };

  const getMedicationType = (item) => {
    if (!item) return '-';
    return item.medication_type || '-';
  };

  const getDosage = (item) => {
    if (!item) return '-';
    return item.dosage || '-';
  };

  const getNotes = (item) => {
    if (!item) return '-';
    return item.remarks || '-';
  };

  const getQuantity = (item) => {
    if (!item) return 0;
    return Number(item.quantity || 0);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: '⏳ در انتظار پرداخت' },
      sent_to_registration: { bg: '#dbeafe', color: '#1e40af', text: '📤 ارسال به رسپشن' },
      paid: { bg: '#d1fae5', color: '#065f46', text: '✅ پرداخت شده' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: '❌ لغو شده' },
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try { return new Date(date).toLocaleDateString('fa-IR'); }
    catch { return '-'; }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  // ⭐ محاسبه جمع کل
  const getItemTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(itemPrices[item.id]?.unit_price ?? item.unit_price ?? 0) || 0;
    return qty * price;
  };

  const getGrandTotal = () => {
    return prescriptionItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // ============ Form Handlers ============
  const handlePatientChange = (field, value) => {
    setPatientForm(prev => ({ ...prev, [field]: value }));
  };

  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };
    if (field === 'category_id') {
      updated.med_id = ''; updated.supplier_id = ''; updated.type = '';
      setSuppliers([]);
      setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
    }
    if (field === 'med_id') {
      const med = medicationsCatalog.find(m => Number(m.med_id) === Number(value));
      updated.type = med?.type ?? '';
      updated.supplier_id = '';
      setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
    }
    if (field === 'supplier_id') {
      setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
    }
    setFormItem(updated);
  };

  useEffect(() => {
    if (formItem.med_id) {
      loadSuppliersForMedication(formItem.med_id);
    } else {
      setSuppliers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formItem.med_id]);

  const handleAddItem = () => {
    if (!formItem.category_id || !formItem.med_id) { toast.error('❌ کتگوری و دارو را انتخاب کنید'); return; }
    if (!formItem.supplier_id) { toast.error('❌ حمایت‌کننده را انتخاب کنید'); return; }
    if (!formItem.quantity || Number(formItem.quantity) <= 0) { toast.error('❌ تعداد را وارد کنید'); return; }
    if (!formItem.dosage.trim()) { toast.error('❌ مقدار مصرف را وارد کنید'); return; }
    if (!stockAvailability.available) { toast.error(`❌ موجودی کافی نیست! ${stockAvailability.message}`); return; }

    const med = medicationsCatalog.find(m => Number(m.med_id) === Number(formItem.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(formItem.category_id));
    const sup = suppliers.find(s => Number(s.reg_id) === Number(formItem.supplier_id));
    const batchInfo = stockAvailability.nextBatch || {};

    const newId = Date.now() + Math.random();
    const defaultPrice = Number(med?.price || med?.unit_price || 0);

    const newItem = {
      ...formItem,
      id: newId,
      med_name: med?.gen_name ?? '-',
      med_type: med?.type ?? '-',
      category_name: cat?.category_name ?? '-',
      supplier_name: sup?.full_name ?? sup?.name ?? sup?.reg_name ?? '-',
      barcode: batchInfo.barcode ?? null,
      batch_number: batchInfo.batch_number ?? null,
      stock_id: batchInfo.stock_id ?? null,
      exp_date: batchInfo.exp_date ?? null,
      unit_price: defaultPrice,
      total_price: defaultPrice * Number(formItem.quantity),
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setItemPrices(prev => ({
      ...prev,
      [newId]: { unit_price: defaultPrice, quantity: Number(formItem.quantity) }
    }));

    setFormItem({ ...emptyItem, category_id: formItem.category_id });
    setSuppliers([]);
    setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
    toast.success('✅ دارو اضافه شد');
  };

  const handleRemoveItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
    setItemPrices(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleAddItem();
  };

  const handleItemPriceChange = (itemId, newPrice) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], unit_price: Number(newPrice) || 0 }
    }));
  };

  const handleItemQuantityChange = (itemId, newQty) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: Number(newQty) || 1 }
    }));
    setPrescriptionItems(prev => prev.map(it =>
      it.id === itemId ? { ...it, quantity: Number(newQty) || 1 } : it
    ));
  };

  // ============ ذخیره + قیمت‌گذاری + ارسال به رسپشن ============
  const handleSaveAndSendToRegistration = async () => {
    if (!patientForm.patient_name.trim()) { toast.error('❌ نام بیمار را وارد کنید'); return; }
    if (prescriptionItems.length === 0) { toast.error('❌ حداقل یک دارو اضافه کنید'); return; }

    const finalItems = prescriptionItems.map(item => {
      const price = Number(itemPrices[item.id]?.unit_price ?? item.unit_price ?? 0) || 0;
      const qty = Number(itemPrices[item.id]?.quantity ?? item.quantity) || 1;
      return {
        med_id: Number(item.med_id),
        medication_name: item.med_name,
        medication_type: item.med_type,
        category_id: item.category_id ? Number(item.category_id) : null,
        supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
        supplier_name: item.supplier_name || null,
        stock_id: item.stock_id || null,
        barcode: item.barcode || null,
        batch_number: item.batch_number || null,
        dosage: item.dosage,
        quantity: qty,
        unit_price: price,
        total_price: price * qty,
        remarks: item.remarks || null,
      };
    });

    const totalAmount = finalItems.reduce((sum, it) => sum + it.total_price, 0);
    if (totalAmount <= 0) { toast.warning('❌ مبلغ کل باید بیشتر از صفر باشد'); return; }

    const payload = {
      patient_name: patientForm.patient_name.trim(),
      patient_age: patientForm.patient_age ? parseInt(patientForm.patient_age) : null,
      patient_gender: patientForm.patient_gender || null,
      patient_phone: patientForm.patient_phone || null,
      tazkira_number: patientForm.tazkira_number || null,
      patient_address: patientForm.patient_address || null,
      doctor_name: patientForm.doctor_name || null,
      diagnosis: patientForm.diagnosis || null,
      notes: patientForm.notes || null,
      total_amount: totalAmount,
      discount: 0,
      items: finalItems,
    };

    setSubmitting(true);
    try {
      let response;
      if (editingId) {
        response = await api.put(`/external-prescriptions/${editingId}`, payload);
        toast.success(`✅ نسخه بیرونی بروزرسانی و به رسپشن ارسال شد — مبلغ: ${totalAmount.toLocaleString()} AFN`);
      } else {
        response = await api.post('/external-prescriptions', payload);
        toast.success(`✅ نسخه بیرونی ثبت و به رسپشن ارسال شد — مبلغ: ${totalAmount.toLocaleString()} AFN`);
      }

      if (response.data?.success || response.status === 200 || response.status === 201) {
        await fetchExternalPrescriptions();
        handleCancelForm();
      } else {
        toast.error(response.data?.message || 'خطا در ثبت');
      }
    } catch (error) {
      console.error('❌ خطا:', error);
      const errors = error.response?.data?.errors;
      if (errors) {
        Object.keys(errors).forEach((field) => {
          const msgs = errors[field];
          if (Array.isArray(msgs)) msgs.forEach((m) => toast.error(`❌ ${field}: ${m}`));
          else toast.error(`❌ ${field}: ${msgs}`);
        });
      } else {
        toast.error(error.response?.data?.message || 'خطا در ثبت نسخه بیرونی');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExternal = (pres) => {
    setEditingId(pres.id);
    setPatientForm({
      patient_name: pres.patient_name || '',
      patient_age: pres.patient_age || '',
      patient_gender: pres.patient_gender || '',
      patient_phone: pres.patient_phone || '',
      tazkira_number: pres.tazkira_number || '',
      patient_address: pres.patient_address || '',
      doctor_name: pres.doctor_name || '',
      diagnosis: pres.diagnosis || '',
      notes: pres.notes || '',
    });

    const items = (pres.items || []).map((it, i) => ({
      id: Date.now() + i + Math.random(),
      med_id: it.med_id,
      category_id: it.category_id,
      supplier_id: it.supplier_id,
      stock_id: it.stock_id,
      med_name: it.medication_name || it.med_name,
      med_type: it.medication_type || it.med_type,
      supplier_name: it.supplier_name,
      barcode: it.barcode,
      batch_number: it.batch_number,
      dosage: it.dosage,
      quantity: it.quantity,
      remarks: it.remarks,
      unit_price: Number(it.unit_price || 0),
      total_price: Number(it.total_price || 0),
    }));
    setPrescriptionItems(items);

    const prices = {};
    items.forEach(it => {
      prices[it.id] = {
        unit_price: Number(it.unit_price || 0),
        quantity: Number(it.quantity || 1),
      };
    });
    setItemPrices(prices);

    setShowFormModal(true);
  };

  const handleDeleteExternal = async (id) => {
    if (!window.confirm('حذف این نسخه بیرونی؟')) return;
    try {
      await api.delete(`/external-prescriptions/${id}`);
      toast.success('🗑️ نسخه بیرونی حذف شد');
      await fetchExternalPrescriptions();
    } catch (error) {
      console.error('خطا در حذف:', error);
      toast.error(error.response?.data?.message || 'خطا در حذف');
    }
  };

  const handleCancelForm = () => {
    setPatientForm({
      patient_name: '', patient_age: '', patient_gender: '', patient_phone: '',
      tazkira_number: '', patient_address: '', doctor_name: '', diagnosis: '', notes: '',
    });
    setPrescriptionItems([]);
    setItemPrices({});
    setFormItem(emptyItem);
    setSuppliers([]);
    setEditingId(null);
    setShowFormModal(false);
    setStockAvailability({ available: false, totalStock: 0, message: '', checking: false, nextBatch: null });
  };

  const handlePrintExternal = async (pres) => {
    try {
      let printData = pres;
      try {
        const response = await api.get(`/external-prescriptions/${pres.id}/print`);
        if (response.data?.success && response.data?.data?.execution) {
          printData = response.data.data.execution;
        }
      } catch (e) {
        // اگر endpoint print نبود، از داده‌های موجود استفاده کن
      }

      const printWindow = window.open('', '_blank', 'width=800,height=700');
      if (!printWindow) return;
      const items = printData.items || [];
      const total = Number(printData.total_amount || 0);
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>رسید فیس دواخانه - نسخه بیرونی</title>
            <style>
              body { font-family: 'Vazirmatn', Tahoma, sans-serif; padding: 30px; direction: rtl; }
              .header { text-align: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 26px; font-weight: bold; color: #8b5cf6; }
              .section { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
              .section-title { font-weight: bold; color: #374151; margin-bottom: 10px; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
              .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
              .label { color: #6b7280; font-weight: bold; }
              .value { color: #000; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
              th { background: #f5f5f5; color: #374151; }
              .total { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; margin-top: 20px; }
              .total-label { font-size: 14px; opacity: 0.9; }
              .total-amount { font-size: 30px; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px dashed #ccc; font-size: 12px; color: #6b7280; }
              .signature { display: flex; justify-content: space-between; margin-top: 40px; }
              .sig-box { width: 200px; text-align: center; }
              .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 12px; }
              @media print { body { padding: 15px; } .section { background: #fff; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">💊 رسید فیس دواخانه (نسخه بیرونی)</div>
              <div>بیمارستان</div>
            </div>
            <div class="section">
              <div class="section-title">👤 معلومات بیمار</div>
              <div class="info-grid">
                <div class="row"><span class="label">نام بیمار:</span><span class="value">${printData.patient_name || '-'}</span></div>
                <div class="row"><span class="label">سن:</span><span class="value">${printData.patient_age ? printData.patient_age + ' سال' : '-'}</span></div>
                <div class="row"><span class="label">جنسیت:</span><span class="value">${printData.patient_gender === 'male' ? 'مرد' : printData.patient_gender === 'female' ? 'زن' : printData.patient_gender || '-'}</span></div>
                <div class="row"><span class="label">شماره تماس:</span><span class="value">${printData.patient_phone || '-'}</span></div>
                <div class="row"><span class="label">تذکره:</span><span class="value">${printData.tazkira_number || '-'}</span></div>
                <div class="row"><span class="label">آدرس:</span><span class="value">${printData.patient_address || '-'}</span></div>
              </div>
            </div>
            <div class="section">
              <div class="section-title">👨‍⚕️ معلومات داکتر</div>
              <div class="info-grid">
                <div class="row"><span class="label">نام داکتر:</span><span class="value">${printData.doctor_name || '-'}</span></div>
                <div class="row"><span class="label">تشخیص:</span><span class="value">${printData.diagnosis || '-'}</span></div>
                <div class="row"><span class="label">شماره رسید:</span><span class="value">${printData.receipt_number || '#' + printData.id}</span></div>
                <div class="row"><span class="label">تاریخ:</span><span class="value">${new Date(printData.created_at || Date.now()).toLocaleDateString('fa-IR')}</span></div>
              </div>
            </div>
            <div class="section">
              <div class="section-title">💊 اقلام تجویز شده</div>
              <table>
                <thead>
                  <tr><th>#</th><th>نام دوا</th><th>نوعیت</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr>
                </thead>
                <tbody>
                  ${items.map((item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.medication_name || item.med_name || '-'}</td>
                      <td>${item.medication_type || item.med_type || '-'}</td>
                      <td>${item.quantity || 0}</td>
                      <td>${Number(item.unit_price || 0).toLocaleString()} AFN</td>
                      <td style="font-weight:bold;">${Number(item.total_price || 0).toLocaleString()} AFN</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="total">
              <div class="total-label">💰 مبلغ کل</div>
              <div class="total-amount">${total.toLocaleString()} AFN</div>
            </div>
            <div class="signature">
              <div class="sig-box"><div class="sig-line">امضای داکتر</div></div>
              <div class="sig-box"><div class="sig-line">امضای دواخانه</div></div>
              <div class="sig-box"><div class="sig-line">امضای رسپشن</div></div>
            </div>
            <div class="footer">
              <p>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} ${new Date().toLocaleTimeString('fa-IR')}</p>
              <p>با تشکر از اعتماد شما</p>
            </div>
            <script>window.onload = function() { window.print(); }<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('❌ خطا در پرینت:', error);
      toast.error('خطا در پرینت رسید');
    }
  };

  const displayPrescriptions = externalPrescriptions.filter(p => {
    if (!search) return true;
    const name = (p.patient_name || '').toLowerCase();
    const id = String(p.id || '');
    const receipt = (p.receipt_number || '').toLowerCase();
    const phone = p.patient_phone || '';
    const tazkira = p.tazkira_number || '';
    const s = search.toLowerCase();
    return name.includes(s) || id.includes(search) || receipt.includes(s) || phone.includes(search) || tazkira.includes(search);
  });

  // ============ Styles ============
  const styles = {
    container: { padding: '24px', background: '#f0f2f5', minHeight: '100vh' },
    header: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      borderRadius: '12px', padding: '24px', marginBottom: '24px', color: 'white',
    },
    headerTitle: { margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' },
    headerSub: { margin: '8px 0 0', opacity: 0.9, fontSize: '14px' },
    filters: {
      background: 'white', borderRadius: '12px', padding: '16px',
      marginBottom: '20px', display: 'flex', gap: '12px',
      flexWrap: 'wrap', alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    searchInput: {
      padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px',
      fontSize: '14px', minWidth: '250px', flex: 1,
    },
    table: {
      background: 'white', borderRadius: '12px',
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    th: {
      background: '#f9fafb', padding: '12px 16px', textAlign: 'right',
      fontSize: '13px', color: '#6b7280', fontWeight: 'bold',
      borderBottom: '1px solid #e5e7eb',
    },
    td: {
      padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
      fontSize: '13px', verticalAlign: 'middle',
    },
    btn: {
      padding: '8px 16px', border: 'none', borderRadius: '8px',
      cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
      marginRight: '6px', marginBottom: '4px',
    },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px',
    },
    modalContent: {
      background: 'white', borderRadius: '12px', padding: '24px',
      maxWidth: '1100px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
    },
    input: {
      padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px',
      fontSize: '13px', width: '100%', boxSizing: 'border-box',
    },
    label: { display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' },
    badge: {
      padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
      fontWeight: 'bold', display: 'inline-block',
    },
    patientInfoCard: {
      padding: '16px',
      background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      borderRadius: '10px', border: '2px solid #8b5cf6', marginBottom: '16px',
    },
    patientInfoGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
    },
    infoItem: {
      background: 'white', padding: '10px 12px', borderRadius: '8px',
      border: '1px solid #e9d5ff',
    },
    infoLabel: {
      fontSize: '11px', color: '#7c3aed', fontWeight: 'bold',
      display: 'block', marginBottom: '4px',
    },
    infoValue: { fontSize: '14px', color: '#1f2937', fontWeight: 'bold' },
  };

  // ============ Render ============
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>📋 نسخه‌های بیرونی</h1>
        <p style={styles.headerSub}>
          ثبت نسخه‌های کاغذی + قیمت‌گذاری + ارسال به رسپشن — همه در یک مرحله
        </p>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 جستجوی نام، شماره رسید، موبایل یا تذکره..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button
          style={{ ...styles.btn, background: '#8b5cf6', color: 'white' }}
          onClick={() => setShowFormModal(true)}
        >
          ➕ ثبت نسخه بیرونی جدید
        </button>
        <button
          style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
          onClick={fetchExternalPrescriptions}
        >
          🔄 بروزرسانی
        </button>
      </div>

      {loading ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          ⏳ در حال بارگذاری...
        </div>
      ) : displayPrescriptions.length === 0 ? (
        <div style={{ ...styles.table, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#6b7280' }}>هیچ نسخه بیرونی ثبت نشده است</div>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>معلومات بیمار</th>
                <th style={styles.th}>داکتر</th>
                <th style={styles.th}>شماره رسید</th>
                <th style={styles.th}>تعداد اقلام</th>
                <th style={styles.th}>مبلغ کل</th>
                <th style={styles.th}>وضعیت</th>
                <th style={styles.th}>تاریخ و ساعت</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {displayPrescriptions.map((pres, idx) => {
                const badge = getStatusBadge(pres.status);
                const items = pres.items || [];
                return (
                  <tr key={pres.id || idx}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                        👤 {getPatientFullName(pres)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {getPatientAge(pres) !== '-' && <span>🎂 {getPatientAge(pres)}</span>}
                        {getPatientGender(pres) !== '-' && <span>⚤ {getPatientGender(pres)}</span>}
                      </div>
                      {getPatientMobile(pres) !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          📞 {getPatientMobile(pres)}
                        </div>
                      )}
                      {getPatientNationalId(pres) !== '-' && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          🪪 {getPatientNationalId(pres)}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                        👨‍⚕️ {getDoctorName(pres)}
                      </div>
                      {pres.diagnosis && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          🔍 {pres.diagnosis}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                        {pres.receipt_number || `#${pres.id}`}
                      </code>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        background: '#dbeafe', color: '#1e40af',
                        padding: '4px 10px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: 'bold',
                      }}>
                        💊 {items.length}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                        {Number(pres.total_amount || 0).toLocaleString()} AFN
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                        {badge.text}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div>📅 {formatDate(pres.created_at)}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        🕐 {formatTime(pres.created_at)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, background: '#3b82f6', color: 'white' }}
                        onClick={() => { setSelectedPrescription(pres); setShowDetailsModal(true); }}
                      >
                        👁️ مشاهده
                      </button>
                      <button
                        style={{ ...styles.btn, background: '#f59e0b', color: 'white' }}
                        onClick={() => handleEditExternal(pres)}
                      >
                        ✏️ ویرایش
                      </button>
                      <button
                        style={{ ...styles.btn, background: '#8b5cf6', color: 'white' }}
                        onClick={() => handlePrintExternal(pres)}
                      >
                        🖨️ پرینت
                      </button>
                      <button
                        style={{ ...styles.btn, background: '#dc2626', color: 'white' }}
                        onClick={() => handleDeleteExternal(pres.id)}
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال فرم ثبت/ویرایش + قیمت‌گذاری */}
      {showFormModal && (
        <div style={styles.modal} onClick={handleCancelForm}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#8b5cf6' }}>
                {editingId ? '✏️ ویرایش نسخه بیرونی' : '📝 ثبت نسخه بیرونی + قیمت‌گذاری'}
              </h2>
              <button style={{ ...styles.btn, background: '#6b7280', color: 'white' }} onClick={handleCancelForm}>
                ✕ بستن
              </button>
            </div>

            {/* اطلاعات بیمار */}
            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: '0 0 12px 0', color: '#7c3aed', fontSize: '16px' }}>👤 معلومات بیمار</h3>
              <div style={styles.patientInfoGrid}>
                <div>
                  <span style={styles.infoLabel}>نام کامل *</span>
                  <input
                    type="text"
                    value={patientForm.patient_name}
                    onChange={(e) => handlePatientChange('patient_name', e.target.value)}
                    style={styles.input}
                    placeholder="نام و تخلص بیمار"
                  />
                </div>
                <div>
                  <span style={styles.infoLabel}>سن</span>
                  <input
                    type="number"
                    value={patientForm.patient_age}
                    onChange={(e) => handlePatientChange('patient_age', e.target.value)}
                    style={styles.input}
                    placeholder="سن"
                  />
                </div>
                <div>
                  <span style={styles.infoLabel}>جنسیت</span>
                  <select
                    value={patientForm.patient_gender}
                    onChange={(e) => handlePatientChange('patient_gender', e.target.value)}
                    style={styles.input}
                  >
                    <option value="">انتخاب</option>
                    <option value="male">مرد</option>
                    <option value="female">زن</option>
                  </select>
                </div>
                <div>
                  <span style={styles.infoLabel}>شماره تماس</span>
                  <input
                    type="text"
                    value={patientForm.patient_phone}
                    onChange={(e) => handlePatientChange('patient_phone', e.target.value)}
                    style={styles.input}
                    placeholder="07xxxxxxxx"
                  />
                </div>
                <div>
                  <span style={styles.infoLabel}>شماره تذکره</span>
                  <input
                    type="text"
                    value={patientForm.tazkira_number}
                    onChange={(e) => handlePatientChange('tazkira_number', e.target.value)}
                    style={styles.input}
                    placeholder="شماره تذکره"
                  />
                </div>
                <div>
                  <span style={styles.infoLabel}>نام داکتر (از نسخه)</span>
                  <input
                    type="text"
                    value={patientForm.doctor_name}
                    onChange={(e) => handlePatientChange('doctor_name', e.target.value)}
                    style={styles.input}
                    placeholder="نام داکتر"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={styles.infoLabel}>آدرس</span>
                  <input
                    type="text"
                    value={patientForm.patient_address}
                    onChange={(e) => handlePatientChange('patient_address', e.target.value)}
                    style={styles.input}
                    placeholder="آدرس"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={styles.infoLabel}>تشخیص</span>
                  <input
                    type="text"
                    value={patientForm.diagnosis}
                    onChange={(e) => handlePatientChange('diagnosis', e.target.value)}
                    style={styles.input}
                    placeholder="تشخیص (از نسخه کاغذی)"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={styles.infoLabel}>ملاحظات</span>
                  <input
                    type="text"
                    value={patientForm.notes}
                    onChange={(e) => handlePatientChange('notes', e.target.value)}
                    style={styles.input}
                    placeholder="ملاحظات"
                  />
                </div>
              </div>
            </div>

            {/* افزودن دارو */}
            <h3 style={{ color: '#2563eb', marginBottom: '12px' }}>➕ افزودن دارو از گدام</h3>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}
              onKeyDown={handleKeyDown}
            >
              <div>
                <label style={styles.label}>کتگوری *</label>
                <select value={formItem.category_id} onChange={(e) => handleChange('category_id', e.target.value)} style={styles.input}>
                  <option value="">انتخاب</option>
                  {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>دارو *</label>
                <select value={formItem.med_id} onChange={(e) => handleChange('med_id', e.target.value)} style={styles.input}>
                  <option value="">انتخاب</option>
                  {filteredMedications.map((m) => <option key={m.med_id} value={m.med_id}>{m.gen_name}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>حمایت‌کننده *</label>
                <select
                  value={formItem.supplier_id}
                  onChange={(e) => handleChange('supplier_id', e.target.value)}
                  disabled={!formItem.med_id || loadingSuppliers}
                  style={styles.input}
                >
                  <option value="">
                    {loadingSuppliers ? '⏳...' : !formItem.med_id ? 'ابتدا دارو' : suppliers.length === 0 ? 'یافت نشد' : 'انتخاب'}
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.reg_id} value={s.reg_id}>{s.full_name ?? s.name ?? s.reg_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>نوع دارو</label>
                <input type="text" value={formItem.type} readOnly style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>مقدار مصرف *</label>
                <input
                  value={formItem.dosage}
                  onChange={(e) => handleChange('dosage', e.target.value)}
                  placeholder="1×3"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>تعداد *</label>
                <input
                  type="number"
                  min="1"
                  value={formItem.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  style={styles.input}
                />
                {stockAvailability.message && (
                  <small style={{
                    color: stockAvailability.available ? '#059669' : '#dc2626',
                    display: 'block', marginTop: '4px', fontSize: '11px'
                  }}>
                    {stockAvailability.checking ? '⏳...' : stockAvailability.message}
                  </small>
                )}
              </div>
              <div>
                <label style={styles.label}>ملاحظات</label>
                <input
                  value={formItem.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <button
                type="button"
                onClick={handleAddItem}
                style={{ ...styles.btn, background: '#3b82f6', color: 'white', padding: '10px 25px' }}
              >
                ➕ افزودن دارو
              </button>
            </div>

            {/* لیست داروها با قیمت‌گذاری درون‌خطی */}
            {prescriptionItems.length > 0 && (
              <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                <h4 style={{ color: '#2563eb' }}>📋 لیست داروها و قیمت‌گذاری ({prescriptionItems.length})</h4>
                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: '13px',
                  border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden'
                }}>
                  <thead>
                    <tr style={{ background: '#eff6ff' }}>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>#</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>نام دارو</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>نوع</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>حمایت‌کننده</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>مقدار</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>تعداد</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>قیمت واحد (AFN)</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>جمع (AFN)</th>
                      <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dbeafe' }}>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                          💊 {item.med_name}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{item.med_type}</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{item.supplier_name}</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', color: '#059669', fontWeight: 'bold' }}>
                          {item.dosage}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            min="1"
                            value={itemPrices[item.id]?.quantity ?? item.quantity}
                            onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                            style={{ ...styles.input, width: '70px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            min="0"
                            value={itemPrices[item.id]?.unit_price ?? item.unit_price}
                            onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                            style={{ ...styles.input, width: '100px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 'bold', color: '#10b981' }}>
                          {getItemTotal(item).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ ...styles.btn, background: '#dc2626', color: 'white', padding: '4px 10px', fontSize: '11px' }}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* جمع کل */}
            {prescriptionItems.length > 0 && (
              <div style={{
                marginTop: '20px', padding: '20px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                borderRadius: '12px', color: 'white',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 مبلغ کل نهایی</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                    {getGrandTotal().toLocaleString()} AFN
                  </div>
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'left' }}>
                  با ثبت، این نسخه مستقیم به رسپشن برای اخذ فیس ارسال می‌شود
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCancelForm}
                style={{ ...styles.btn, background: '#6b7280', color: 'white', padding: '12px 24px' }}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveAndSendToRegistration}
                disabled={submitting || prescriptionItems.length === 0 || getGrandTotal() <= 0}
                style={{ ...styles.btn, background: '#10b981', color: 'white', padding: '12px 24px' }}
              >
                {submitting
                  ? '⏳ در حال ثبت...'
                  : editingId
                    ? '✅ بروزرسانی و ارسال به رسپشن'
                    : '✅ ثبت و ارسال به رسپشن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال جزییات */}
      {showDetailsModal && selectedPrescription && (
        <div style={styles.modal} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#8b5cf6' }}>📋 جزییات نسخه بیرونی</h2>
              <button style={{ ...styles.btn, background: '#6b7280', color: 'white' }} onClick={() => setShowDetailsModal(false)}>
                ✕ بستن
              </button>
            </div>

            <div style={styles.patientInfoCard}>
              <h3 style={{ margin: '0 0 12px 0', color: '#7c3aed', fontSize: '16px' }}>👤 معلومات بیمار</h3>
              <div style={styles.patientInfoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>نام کامل</span>
                  <div style={styles.infoValue}>{getPatientFullName(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>سن</span>
                  <div style={styles.infoValue}>{getPatientAge(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>جنسیت</span>
                  <div style={styles.infoValue}>{getPatientGender(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>شماره تماس</span>
                  <div style={styles.infoValue}>{getPatientMobile(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>کد ملی / تذکره</span>
                  <div style={styles.infoValue}>{getPatientNationalId(selectedPrescription)}</div>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>داکتر</span>
                  <div style={styles.infoValue}>{getDoctorName(selectedPrescription)}</div>
                </div>
                {getPatientAddress(selectedPrescription) !== '-' && (
                  <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                    <span style={styles.infoLabel}>آدرس</span>
                    <div style={styles.infoValue}>{getPatientAddress(selectedPrescription)}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              padding: '16px', background: '#eff6ff', borderRadius: '10px',
              border: '1px solid #3b82f6', marginBottom: '20px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px',
            }}>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>🆔 شماره رسید</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                  {selectedPrescription.receipt_number || `#${selectedPrescription.id}`}
                </div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>📅 تاریخ</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatDate(selectedPrescription.created_at)}</div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>🕐 ساعت</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatTime(selectedPrescription.created_at)}</div>
              </div>
              <div>
                <span style={{ ...styles.label, color: '#1e40af' }}>🔍 تشخیص</span>
                <div style={{ fontWeight: 'bold', color: '#1e40af' }}>{selectedPrescription.diagnosis || '-'}</div>
              </div>
            </div>

            <div style={{
              marginTop: '20px', padding: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderRadius: '12px', color: 'white',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>💰 مبلغ کل</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                  {Number(selectedPrescription.total_amount || 0).toLocaleString()} AFN
                </div>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'left' }}>
                {selectedPrescription.status === 'paid' && '✅ پرداخت شده'}
                {selectedPrescription.status === 'sent_to_registration' && '📤 ارسال شده به رسپشن'}
                {selectedPrescription.status === 'pending' && '⏳ در انتظار پرداخت'}
                {selectedPrescription.status === 'cancelled' && '❌ لغو شده'}
              </div>
            </div>

            <h3 style={{ color: '#374151', marginBottom: '12px' }}>💊 اقلام نسخه</h3>
            {(selectedPrescription.items || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                هیچ قلمی در این نسخه وجود ندارد
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نام دوا</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>نوعیت</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>تعداد</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>مقدار مصرف</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>قیمت واحد</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>جمع</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPrescription.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', fontSize: '13px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>💊 {getMedicationName(item)}</td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{getMedicationType(item)}</td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>{getQuantity(item)}</td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#059669', fontWeight: 'bold' }}>{getDosage(item)}</td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#d48806', fontWeight: 'bold' }}>
                        {Number(item.unit_price || 0).toLocaleString()} AFN
                      </td>
                      <td style={{ padding: '10px', fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>
                        {Number(item.total_price || 0).toLocaleString()} AFN
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', color: '#6b7280' }}>{getNotes(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// کامپوننت اصلی: تب‌بندی بین دو بخش
// ============================================================
const PharmacyPrescriptionExecutions = () => {
  const [activeTab, setActiveTab] = useState('executions');

  const tabStyle = (isActive, color) => ({
    padding: '14px 28px',
    background: isActive ? color : 'white',
    color: isActive ? 'white' : '#374151',
    border: '1px solid #e5e7eb',
    borderBottom: isActive ? `3px solid ${color}` : '1px solid #e5e7eb',
    borderRadius: '10px 10px 0 0',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      {/* نوار تب‌ها */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px 24px 0',
        background: '#f0f2f5',
        flexWrap: 'wrap',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <button
          onClick={() => setActiveTab('executions')}
          style={tabStyle(activeTab === 'executions', '#10b981')}
        >
          💊 اجراآت نسخه‌جات
        </button>
        <button
          onClick={() => setActiveTab('external')}
          style={tabStyle(activeTab === 'external', '#8b5cf6')}
        >
          📋 نسخه‌های بیرونی
        </button>
      </div>

      {/* محتوای تب */}
      {activeTab === 'executions' && <PharmacyPrescriptionExecutionsInner />}
      {activeTab === 'external' && <PharmacyExternalPrescriptionsInner />}
    </div>
  );
};

export default PharmacyPrescriptionExecutions;