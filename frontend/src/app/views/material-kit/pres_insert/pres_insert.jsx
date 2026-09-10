import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../PrescriptionPrint";

export default function PrescriptionForm({ 
  registration, 
  onComplete, 
  onRefresh, 
  api,
  onSave,
  onFinish,
  onNextStep,
  onPrevStep,
  currentStep,
  nextStep,
  prevStep,
  isSubmitting,
  isTreatmentComplete 
}) {
  const printRef = useRef(null);

  const emptyItem = {
    category_id: "",
    med_id: "",
    supplier_id: "",
    quantity: "",
    unit_price: 0,
    total_price: 0,
    type: "",
    dosage: "",
    remarks: ""
  };

  // ============ استفاده از اطلاعات مریض از props ============
  const [patientInfo, setPatientInfo] = useState({
    age: "",
    gender: "",
    phone: "",
    blood_group: "",
    reg_id: "",
    pres_num: "",
    tazkira_number: "",
    diagnosis: "",
    weight: "",
    blood_pressure: "",
    temperature: "",
    oxygen: "",
    patient_name: ""
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const [categories, setCategories] = useState([]);
  const [medications, setMedications] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [formItem, setFormItem] = useState(emptyItem);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [prescriptionPrintData, setPrescriptionPrintData] = useState(null);
  const [isPrintReady, setIsPrintReady] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentPrescriptions = prescriptionsList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(prescriptionsList.length / itemsPerPage);

  // State برای بررسی موجودی
  const [stockAvailability, setStockAvailability] = useState({ 
    available: false, 
    totalStock: 0, 
    message: "",
    checking: false 
  });

  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
  const [tempPrescriptionData, setTempPrescriptionData] = useState(null);
  const [sheetItems, setSheetItems] = useState([]);
  const [sheetLocalDiscount, setSheetLocalDiscount] = useState(0);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: prescriptionPrintData?.pres_num || "Prescription",
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `,
    onAfterPrint: () => {
      setIsPrintReady(false);
    }
  });

  // ==================== بارگذاری اولیه ====================
  useEffect(() => {
    document.title = "نسخه - معالجه";
    
    // دریافت اطلاعات از registration
    if (registration) {
      const patient = registration.patient || {};
      // ✅ اصلاح خط 125 - اضافه کردن پرانتز
      const patientName = patient.full_name ?? (`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "نامشخص");
      
      setPatientInfo({
        age: patient.age ?? "",
        gender: patient.gender ?? "",
        phone: patient.mobile ?? patient.phone ?? "",
        blood_group: patient.blood_group ?? "",
        reg_id: registration.reg_id ?? "",
        pres_num: "",
        tazkira_number: patient.national_id ?? patient.tazkira_number ?? "",
        diagnosis: registration.diagnosis ?? "",
        weight: patient.weight ?? "",
        blood_pressure: patient.blood_pressure ?? "",
        temperature: patient.temperature ?? "",
        oxygen: patient.oxygen ?? "",
        patient_name: patientName
      });
    }

    // بارگذاری لیست داکترها
    api.get("/registrations").then(res => {
      const data = res.data.data ?? res.data ?? [];
      const supplierList = data.filter(r => r.reg_type === "supplier");
      setDoctors(data.filter(r => r.reg_type === "doctor"));
      setAllSuppliers(supplierList);
      setSuppliers(supplierList);
    });

    api.get("/categories").then(res => setCategories(res.data.data ?? res.data));
    api.get("/medications").then(res => setMedications(res.data.data ?? res.data));
    
    // بارگذاری نسخه‌های قبلی این مریض
    loadPrescriptions();
    
    // تنظیم تاریخ پیش‌فرض
    setPrescriptionDate(new Date().toISOString().slice(0, 10));
  }, [registration, api]);

  useEffect(() => {
    if (isPrintReady) {
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }, [isPrintReady, handlePrint]);

  const loadPrescriptions = async () => {
    try {
      const res = await api.get("/prescriptions");
      const list = res.data?.data ?? res.data ?? [];
      
      // فیلتر کردن نسخه‌های این مریض
      if (registration?.reg_id) {
        const filtered = list.filter(p => Number(p.patient_id) === Number(registration.reg_id));
        setPrescriptionsList(filtered);
      } else {
        setPrescriptionsList(list);
      }
    } catch (error) {
      console.error("Load prescriptions error:", error);
    }
  };

  useEffect(() => {
    const sum = prescriptionItems.reduce((t, i) => t + Number(i.total_price || 0), 0);
    setTotalAmount(sum);
  }, [prescriptionItems]);

  useEffect(() => {
    setNetAmount(totalAmount - discount);
  }, [totalAmount, discount]);

  const filteredMedications = editingId && prescriptionItems.length > 0
    ? medications.filter(m => prescriptionItems.some(item => item.med_id == m.med_id))
    : medications.filter(m => Number(m.category_id) === Number(formItem.category_id));

  const selectedMedication = medications.find(m => Number(m.med_id) === Number(formItem.med_id));

  // فیلتر کردن حمایت‌کنندگان بر اساس داروی انتخاب شده
  useEffect(() => {
    if (!selectedMedication) {
      setSuppliers(allSuppliers);
      return;
    }
    
    const medSupplierId = selectedMedication.supplier_id;
    
    if (!medSupplierId) {
      setSuppliers(allSuppliers);
      return;
    }
    
    let filtered = [];
    
    if (Array.isArray(medSupplierId)) {
      filtered = allSuppliers.filter(s => 
        medSupplierId.some(id => Number(id) === Number(s.reg_id))
      );
    } else {
      filtered = allSuppliers.filter(s => 
        Number(medSupplierId) === Number(s.reg_id) ||
        String(medSupplierId) === String(s.reg_id)
      );
    }
    
    setSuppliers(filtered.length > 0 ? filtered : allSuppliers);
  }, [selectedMedication, allSuppliers]);

  // بررسی موجودی
  useEffect(() => {
    const checkStockAvailability = async () => {
      if (!formItem.med_id || !formItem.supplier_id || !formItem.quantity || Number(formItem.quantity) <= 0) {
        setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
        return;
      }

      setStockAvailability(prev => ({ ...prev, checking: true }));
      
      try {
        const response = await api.post("/sales/check-stock", {
          med_id: formItem.med_id,
          supplier_id: formItem.supplier_id,
          type: formItem.type || null,
          quantity: Number(formItem.quantity)
        });
        
        if (response.data.success) {
          const isAvailable = response.data.available;
          const totalStock = response.data.total_quantity || 0;
          
          setStockAvailability({
            available: isAvailable,
            totalStock: totalStock,
            message: isAvailable 
              ? `✅ موجودی کافی است (موجودی انبار: ${totalStock})`
              : `❌ موجودی کافی نیست! موجودی انبار: ${totalStock} - درخواستی: ${formItem.quantity}`,
            checking: false
          });
        }
      } catch (error) {
        console.error("Error checking stock:", error);
        setStockAvailability({
          available: false,
          totalStock: 0,
          message: "⚠️ خطا در بررسی موجودی",
          checking: false
        });
      }
    };
    
    const timer = setTimeout(() => {
      checkStockAvailability();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formItem.med_id, formItem.supplier_id, formItem.quantity, formItem.type, api]);

  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };
    
    if (field === "category_id") {
      updated.med_id = "";
      updated.supplier_id = "";
      updated.type = "";
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    }
    
    if (field === "med_id") {
      const med = medications.find(m => Number(m.med_id) === Number(value));
      updated.type = med?.type ?? "";
      updated.unit_price = med?.unit_price ?? 0;
      updated.supplier_id = "";
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    }
    
    if (field === "supplier_id") {
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    }
    
    const qty = Number(field === "quantity" ? value : updated.quantity || 0);
    const price = Number(field === "unit_price" ? value : updated.unit_price || 0);
    updated.total_price = qty * price;
    
    setFormItem(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    
    if (!stockAvailability.available) {
      toast.error(`❌ موجودی کافی نیست! ${stockAvailability.message}`);
      return;
    }
    
    if (!formItem.supplier_id) {
      toast.error("❌ لطفاً حمایت‌کننده را انتخاب کنید");
      return;
    }
    
    if (!formItem.category_id || !formItem.med_id || !formItem.quantity || !formItem.unit_price) {
      toast.error("❌ لطفاً تمام فیلدها را درست پر کنید");
      return;
    }
    
    const med = medications.find(m => Number(m.med_id) === Number(formItem.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(formItem.category_id));
    const sup = allSuppliers.find(s => Number(s.reg_id) === Number(formItem.supplier_id));
    
    setPrescriptionItems([
      ...prescriptionItems,
      {
        ...formItem,
        id: Date.now(),
        gen_name: med?.gen_name ?? "-",
        category_name: cat?.category_name ?? "-",
        supplier_name: sup?.full_name ?? sup?.name ?? "-",
      }
    ]);
    
    setFormItem({
      ...emptyItem,
      category_id: formItem.category_id,
    });
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
  };

  const handleRemoveItem = id => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrescriptionItems([]);
    setFormItem({ ...emptyItem });
    setSelectedDoctorId("");
    setPrescriptionDate(new Date().toISOString().slice(0, 10));
    setDiscount(0);
    setTotalAmount(0);
    setNetAmount(0);
    setShowPrescriptionSheet(false);
    setTempPrescriptionData(null);
    setSheetItems([]);
    setSheetLocalDiscount(0);
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
  };

  // ============ ذخیره نسخه ============
  const handleSavePrescription = async () => {
    if (!selectedDoctorId || prescriptionItems.length === 0) {
      toast.error("❌ لطفاً داکتر را انتخاب کنید و حداقل یک آیتم اضافه کنید");
      return;
    }

    const payload = {
      patient_id: registration?.reg_id,
      pres_num: `RX-${Date.now()}`,
      patient_age: patientInfo.age,
      patient_gender: patientInfo.gender,
      patient_phone: patientInfo.phone,
      patient_reg_id: patientInfo.reg_id,
      patient_blood_group: patientInfo.blood_group,
      tazkira_number: patientInfo.tazkira_number,
      doc_id: selectedDoctorId,
      pres_date: prescriptionDate || new Date().toISOString().slice(0,10),
      total_amount: totalAmount,
      discount: discount,
      net_amount: netAmount,
      diagnosis: patientInfo.diagnosis,
      weight: patientInfo.weight,
      blood_pressure: patientInfo.blood_pressure,
      temperature: patientInfo.temperature,
      oxygen: patientInfo.oxygen,
      items: prescriptionItems.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        supplier_id: item.supplier_id,
        type: item.type,
        dosage: item.dosage,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        remarks: item.remarks
      }))
    };

    try {
      if (editingId) {
        await api.put(`/prescriptions/${editingId}`, payload);
        toast.success("✅ نسخه با موفقیت بروزرسانی شد");
        setEditingId(null);
      } else {
        await api.post("/prescriptions", payload);
        toast.success("✅ نسخه با موفقیت ثبت شد");
      }

      if (onNextStep) {
        onNextStep();
      }
      if (onComplete) {
        onComplete();
      }
      if (onRefresh) {
        onRefresh();
      }

      handleCancelEdit();
      loadPrescriptions();
      
    } catch (error) {
      console.error(error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.entries(errors).forEach(([field, msgs]) => {
          toast.error(`❌ ${field}: ${msgs.join(", ")}`);
        });
      } else {
        toast.error("❌ خطا در ذخیره نسخه");
      }
    }
  };

  const handlePrintClick = () => {
    if (!prescriptionItems.length) {
      toast.error("آیتمی برای چاپ وجود ندارد");
      return;
    }

    const printData = {
      pres_num: `RX-${Date.now()}`,
      date: prescriptionDate || new Date().toLocaleDateString("fa-IR"),
      patient: patientInfo.patient_name || "-",
      doctor: doctors.find(d => d.reg_id == selectedDoctorId)?.full_name || "-",
      age: patientInfo.age || "-",
      gender: patientInfo.gender || "-",
      blood_group: patientInfo.blood_group || "-",
      tazkira_number: patientInfo.tazkira_number || "-",
      diagnosis: patientInfo.diagnosis || "-",
      weight: patientInfo.weight || "-",
      blood_pressure: patientInfo.blood_pressure || "-",
      temperature: patientInfo.temperature || "-",
      oxygen: patientInfo.oxygen || "-",
      total: totalAmount,
      discount: discount,
      net: netAmount,
      items: prescriptionItems.map(item => ({
        ...item,
        category_name: categories.find(c => Number(c.category_id) === Number(item.category_id))?.category_name || "-",
        med_name: medications.find(m => Number(m.med_id) === Number(item.med_id))?.gen_name || "-",
        supplier_name: allSuppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.full_name || "-",
      }))
    };

    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  // ============ رندر اصلی ============
  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '18px' }}>اطلاعات مریض معتبر نیست</div>
        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '10px' }}>
          لطفاً یک مریض را از صف انتخاب کنید
        </div>
        <button
          onClick={() => {
            if (onPrevStep) onPrevStep();
          }}
          style={{
            marginTop: '20px',
            padding: '10px 30px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ↩️ بازگشت
        </button>
      </div>
    );
  }

  return (
    <MainLayoutjur>
      {/* ===== اطلاعات مریض ===== */}
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #2a3a4a'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px 15px'
        }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>نام مریض</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{patientInfo.patient_name || 'نامشخص'}</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>شماره مراجعه</span>
            <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>{patientInfo.reg_id || '-'}</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>سن</span>
            <span style={{ color: 'white' }}>{patientInfo.age ? `${patientInfo.age} سال` : '-'}</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>جنسیت</span>
            <span style={{ color: 'white' }}>{patientInfo.gender || '-'}</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>تشخیص</span>
            <span style={{ color: 'white' }}>{patientInfo.diagnosis || '-'}</span>
          </div>
        </div>
      </div>

      {/* ===== فرم اصلی نسخه ===== */}
      <div className="form-container">
        <h3 style={{ color: '#10b981', marginBottom: '15px' }}>
          📝 ثبت نسخه
        </h3>

        <div className="form-grid">
          <div>
            <label>داکتر *</label>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: 'white',
                width: '100%'
              }}
            >
              <option value="">انتخاب داکتر</option>
              {doctors.map(d => (
                <option key={d.reg_id} value={d.reg_id}>
                  {d.full_name ?? d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>تاریخ نسخه</label>
            <input
              type="date"
              value={prescriptionDate}
              onChange={e => setPrescriptionDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: 'white',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* ===== فرم افزودن آیتم ===== */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '12px' }}>➕ افزودن دارو</h4>
          
          <div className="form-grid" onKeyDown={handleKeyDown}>
            <div>
              <label>کتگوری</label>
              <select
                value={formItem.category_id}
                onChange={e => handleChange("category_id", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              >
                <option value="">انتخاب</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>دارو</label>
              <select
                value={formItem.med_id}
                onChange={e => handleChange("med_id", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              >
                <option value="">انتخاب</option>
                {filteredMedications.map(m => (
                  <option key={m.med_id} value={m.med_id}>
                    {m.gen_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>حمایت‌کننده</label>
              <select
                value={formItem.supplier_id}
                onChange={e => handleChange("supplier_id", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${formItem.supplier_id && !stockAvailability.available && formItem.quantity ? '#dc2626' : '#374151'}`,
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              >
                <option value="">انتخاب</option>
                {suppliers.map(s => (
                  <option key={s.reg_id} value={s.reg_id}>
                    {s.full_name ?? s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>نوع دارو</label>
              <input
                type="text"
                value={formItem.type}
                readOnly
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#60a5fa',
                  width: '100%',
                  fontWeight: 'bold'
                }}
              />
            </div>

            <div>
              <label>مقدار مصرف (دوز)</label>
              <input
                value={formItem.dosage}
                onChange={e => handleChange("dosage", e.target.value)}
                placeholder="مثلاً: 1×3"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              />
            </div>

            <div>
              <label>تعداد *</label>
              <input
                type="number"
                value={formItem.quantity}
                onChange={e => handleChange("quantity", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${stockAvailability.message && !stockAvailability.available ? '#dc2626' : stockAvailability.available ? '#10b981' : '#374151'}`,
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              />
              {stockAvailability.message && (
                <small style={{ 
                  color: stockAvailability.available ? '#10b981' : '#dc2626',
                  display: 'block',
                  marginTop: '4px',
                  fontWeight: 'bold'
                }}>
                  {stockAvailability.checking ? '⏳ در حال بررسی موجودی...' : stockAvailability.message}
                </small>
              )}
            </div>

            <div>
              <label>قیمت واحد</label>
              <input
                type="number"
                value={formItem.unit_price}
                onChange={e => handleChange("unit_price", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              />
            </div>

            <div>
              <label>قیمت مجموعی</label>
              <input
                value={formItem.total_price}
                readOnly
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#fcd34d',
                  width: '100%',
                  fontWeight: 'bold'
                }}
              />
            </div>

            <div>
              <label>ملاحظات</label>
              <input
                value={formItem.remarks}
                onChange={e => handleChange("remarks", e.target.value)}
                placeholder="توضیحات اضافی..."
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            ⚡ برای افزودن آیتم، کلید Enter را بزنید
          </div>
        </div>

        {/* ===== لیست آیتم‌های افزوده شده ===== */}
        {prescriptionItems.length > 0 && (
          <div className="table-container" style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#60a5fa' }}>📋 لیست داروهای تجویز شده ({prescriptionItems.length})</h4>
            <table>
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>کتگوری</th>
                  <th>دارو</th>
                  <th>حمایت‌کننده</th>
                  <th>نوع</th>
                  <th>مقدار مصرف</th>
                  <th>تعداد</th>
                  <th>قیمت واحد</th>
                  <th>قیمت مجموعی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionItems.map((item, idx) => {
                  const med = medications.find(m => Number(m.med_id) === Number(item.med_id));
                  const cat = categories.find(c => Number(c.category_id) === Number(item.category_id));
                  const sup = allSuppliers.find(s => Number(s.reg_id) === Number(item.supplier_id));
                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>{cat?.category_name || "-"}</td>
                      <td>{med?.gen_name || "-"}</td>
                      <td>{sup?.full_name || sup?.name || "-"}</td>
                      <td>{item.type || "-"}</td>
                      <td>{item.dosage || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>{Number(item.unit_price).toLocaleString()}</td>
                      <td>{Number(item.total_price).toLocaleString()}</td>
                      <td>
                        <button 
                          className="delete" 
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="7" style={{ textAlign: 'left', fontWeight: 'bold' }}>مجموع کل:</td>
                  <td colSpan="3" style={{ fontWeight: 'bold', color: '#fcd34d' }}>
                    {totalAmount.toLocaleString()} افغانی
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ===== مبالغ ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '15px',
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#1a2a3a',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '13px' }}>مجموع</label>
            <input value={totalAmount.toLocaleString()} readOnly style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#1f2937',
              color: '#fcd34d',
              width: '100%',
              fontWeight: 'bold',
              fontSize: '16px'
            }} />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '13px' }}>تخفیف</label>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: 'white',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '13px' }}>خالص</label>
            <input value={netAmount.toLocaleString()} readOnly style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#1f2937',
              color: '#10b981',
              width: '100%',
              fontWeight: 'bold',
              fontSize: '16px'
            }} />
          </div>
        </div>

        {/* ===== دکمه‌های عملیات ===== */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          marginTop: '20px',
          flexWrap: 'wrap',
          borderTop: '1px solid #374151',
          paddingTop: '20px'
        }}>
          <button
            type="button"
            onClick={onPrevStep}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ↩️ برگشت
          </button>

          <button
            type="button"
            onClick={handleSavePrescription}
            disabled={prescriptionItems.length === 0 || !selectedDoctorId}
            style={{
              backgroundColor: (prescriptionItems.length === 0 || !selectedDoctorId) ? '#6b7280' : '#10b981',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (prescriptionItems.length === 0 || !selectedDoctorId) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: (prescriptionItems.length === 0 || !selectedDoctorId) ? 0.5 : 1
            }}
          >
            💾 ثبت نسخه
          </button>

          {prescriptionItems.length > 0 && (
            <button
              type="button"
              onClick={handlePrintClick}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '10px 25px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🖨️ پرینت
            </button>
          )}

          <button
            type="button"
            onClick={handleCancelEdit}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🗑️ پاک کردن
          </button>

          {nextStep && (
            <button
              type="button"
              onClick={() => {
                if (onNextStep) onNextStep();
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 25px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              مرحله بعد ➡️
            </button>
          )}
        </div>
      </div>

      {/* ===== کامپوننت پرینت ===== */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {prescriptionPrintData && (
          <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />
        )}
      </div>

      <style>{`
        .form-container {
          background: #1f2937;
          padding: 25px;
          border-radius: 10px;
          color: white;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .form-grid label {
          display: block;
          margin-bottom: 5px;
          color: #9ca3af;
          font-size: 13px;
        }
        .table-container {
          overflow-x: auto;
          background: #1a2a3a;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #2a3a4a;
        }
        .table-container table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .table-container th {
          background: #0f1a2a;
          color: #60a5fa;
          padding: 10px 12px;
          text-align: center;
          border: 1px solid #2a3a4a;
          white-space: nowrap;
        }
        .table-container td {
          padding: 8px 12px;
          text-align: center;
          border: 1px solid #2a3a4a;
          color: white;
        }
        .table-container tfoot td {
          font-weight: bold;
          color: #fcd34d;
        }
        .delete {
          background: #dc2626;
          color: white;
          padding: 4px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .delete:hover {
          background: #b91c1c;
        }
      `}</style>
    </MainLayoutjur>
  );
}