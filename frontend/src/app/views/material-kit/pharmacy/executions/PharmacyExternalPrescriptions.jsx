// ============================================================
// کامپوننت داخلی: نسخه‌های بیرونی (مطابق Backend جدید)
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