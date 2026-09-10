import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../../components/Mainlayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../../PrescriptionPrint";

export default function PrescriptionForm({ 
  registration, 
  regId, 
  api: propApi, 
  onComplete, 
  onRefresh, 
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
  const { api: authApi } = useAuth();
  const api = propApi || authApi;
  const printRef = useRef(null);

  const emptyItem = {
    category_id: "",
    med_id: "",
    supplier_id: "",
    dosage: "",
    quantity: "",
    remarks: "",
    type: "",
    is_custom: false,
    custom_name: "",
    custom_type: ""
  };

  // اطلاعات مریض
  const [patientData, setPatientData] = useState(null);
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  
  // لیست‌ها
  const [medications, setMedications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // آیتم‌های نسخه
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [formItem, setFormItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  
  // بررسی موجودی
  const [stockAvailability, setStockAvailability] = useState({ 
    available: false, 
    totalStock: 0, 
    message: "",
    checking: false 
  });
  
  // چاپ
  const [prescriptionPrintData, setPrescriptionPrintData] = useState(null);
  const [isPrintReady, setIsPrintReady] = useState(false);
  
  // لودینگ
  const [loading, setLoading] = useState(true);

  // ========== مقداردهی اولیه ==========
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      const effectiveRegId = regId || registration?.reg_id;
      
      if (registration) {
        const patient = registration.patient || registration;
        const patientInfo = {
          reg_id: effectiveRegId,
          full_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || patient.name || 'نامشخص',
          name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || patient.name || 'نامشخص',
          age: patient.age || registration.age || '-',
          gender: patient.gender === 'male' ? 'مرد' : patient.gender === 'female' ? 'زن' : (patient.gender || '-'),
          phone: patient.phone || patient.mobile || registration.phone || '-',
          tazkira_number: patient.national_id || patient.tazkira_number || registration.tazkira_number || '-',
          blood_group: patient.blood_group || registration.blood_group || '-',
          diagnosis: registration.diagnosis || patient.diagnosis || '-',
          weight: registration.weight || patient.weight || '-',
          blood_pressure: registration.blood_pressure || patient.blood_pressure || '-',
          temperature: registration.temperature || patient.temperature || '-',
          oxygen: registration.oxygen || patient.oxygen || '-',
          doctor_id: registration.doctor_id || null,
          doctor_name: registration.doctor_name || '-',
        };
        setPatientData(patientInfo);
      } else {
        const storedPatient = sessionStorage.getItem('selectedPatient');
        if (storedPatient) {
          try {
            const patient = JSON.parse(storedPatient);
            setPatientData(patient);
          } catch (e) {
            console.error("Error parsing patient data:", e);
          }
        }
      }
      
      setPrescriptionNumber(`RX-${Date.now()}`);
      setPrescriptionDate(new Date().toISOString().slice(0, 10));
      
      // بارگذاری لیست‌ها
      await Promise.all([
        loadMedications(),
        loadCategories(),
        loadSuppliers(),
      ]);
      
      setLoading(false);
    };
    
    initialize();
  }, [registration, regId]);

  // ========== توابع بارگذاری ==========
  const loadMedications = async () => {
    try {
      const res = await api.get("/medications");
      setMedications(res.data.data ?? res.data ?? []);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data ?? res.data ?? []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get("/registrations");
      const data = res.data.data ?? res.data ?? [];
      const supplierList = data.filter(r => r.reg_type === "supplier");
      setAllSuppliers(supplierList);
      setSuppliers(supplierList);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  // ========== فیلتر داروها بر اساس کتگوری ==========
  const filteredMedications = medications.filter(
    m => Number(m.category_id) === Number(formItem.category_id)
  );

  const selectedMedication = medications.find(
    m => Number(m.med_id) === Number(formItem.med_id)
  );

  // ========== فیلتر حمایت‌کننده‌ها بر اساس دارو ==========
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

  // ========== بررسی موجودی استاک ==========
  useEffect(() => {
    const checkStockAvailability = async () => {
      // اگر داروی دستی است، بررسی موجودی لازم نیست
      if (formItem.is_custom) {
        setStockAvailability({ available: true, totalStock: 0, message: "", checking: false });
        return;
      }

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
  }, [formItem.med_id, formItem.supplier_id, formItem.quantity, formItem.type, formItem.is_custom, api]);

  // ========== مدیریت تغییر فیلدها ==========
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
      updated.supplier_id = "";
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    }
    
    if (field === "supplier_id") {
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    }
    
    setFormItem(updated);
  };

  // ========== افزودن آیتم به نسخه ==========
  const handleAddItem = () => {
    // اعتبارسنجی
    if (formItem.is_custom) {
      if (!formItem.custom_name.trim()) {
        toast.error("❌ لطفاً نام دارو را وارد کنید");
        return;
      }
      if (!formItem.category_id) {
        toast.error("❌ لطفاً کتگوری را انتخاب کنید");
        return;
      }
      if (!formItem.dosage.trim()) {
        toast.error("❌ لطفاً مقدار مصرف را وارد کنید");
        return;
      }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) {
        toast.error("❌ لطفاً تعداد را وارد کنید");
        return;
      }
    } else {
      if (!formItem.category_id || !formItem.med_id) {
        toast.error("❌ لطفاً کتگوری و دارو را انتخاب کنید");
        return;
      }
      if (!formItem.supplier_id) {
        toast.error("❌ لطفاً حمایت‌کننده را انتخاب کنید");
        return;
      }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) {
        toast.error("❌ لطفاً تعداد را وارد کنید");
        return;
      }
      if (!formItem.dosage.trim()) {
        toast.error("❌ لطفاً مقدار مصرف را وارد کنید");
        return;
      }
      if (!stockAvailability.available) {
        toast.error(`❌ موجودی کافی نیست! ${stockAvailability.message}`);
        return;
      }
    }

    const med = medications.find(m => Number(m.med_id) === Number(formItem.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(formItem.category_id));
    const sup = allSuppliers.find(s => Number(s.reg_id) === Number(formItem.supplier_id));

    const newItem = {
      ...formItem,
      id: Date.now() + Math.random(),
      med_name: formItem.is_custom ? formItem.custom_name.trim() : (med?.gen_name ?? "-"),
      med_type: formItem.is_custom ? (formItem.custom_type || "سایر") : (med?.type ?? "-"),
      category_name: cat?.category_name ?? "-",
      supplier_name: sup?.full_name ?? sup?.name ?? "-",
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    
    // ریست فرم (با حفظ کتگوری)
    setFormItem({
      ...emptyItem,
      category_id: formItem.category_id,
    });
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    
    toast.success("✅ دارو با موفقیت اضافه شد");
  };

  // ========== حذف آیتم ==========
  const handleRemoveItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  // ========== کلید Enter ==========
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAddItem();
  };

  // ========== ذخیره نسخه ==========
  const handleSavePrescription = async () => {
    if (!patientData) {
      toast.error("❌ لطفاً یک مریض انتخاب کنید");
      return;
    }
    
    if (prescriptionItems.length === 0) {
      toast.error("❌ حداقل یک دارو باید تجویز شود");
      return;
    }

    const payload = {
      patient_id: patientData.reg_id,
      reg_id: patientData.reg_id,
      pres_num: prescriptionNumber,
      pres_date: prescriptionDate || new Date().toISOString().slice(0, 10),
      doc_id: patientData.doctor_id || null,
      patient_name: patientData.full_name || patientData.name,
      patient_age: patientData.age,
      patient_gender: patientData.gender,
      patient_phone: patientData.phone,
      tazkira_number: patientData.tazkira_number,
      blood_group: patientData.blood_group,
      diagnosis: patientData.diagnosis,
      weight: patientData.weight,
      blood_pressure: patientData.blood_pressure,
      temperature: patientData.temperature,
      oxygen: patientData.oxygen,
      items: prescriptionItems.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        supplier_id: item.supplier_id,
        type: item.med_type,
        dosage: item.dosage,
        quantity: Number(item.quantity),
        remarks: item.remarks,
        is_custom: item.is_custom || false,
        med_name: item.med_name,
      })),
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

      setPrescriptionItems([]);
      
      if (onSave) {
        try {
          await onSave(payload);
        } catch (err) {
          console.log("onSave callback error:", err);
        }
      }
      
      if (onComplete) {
        onComplete();
      }
      
    } catch (error) {
      console.error("Error saving prescription:", error);
      if (error.response) {
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = Object.entries(errors)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("\n");
          toast.error(`خطاهای اعتبارسنجی:\n${errorMessages}`);
        } else {
          toast.error(error.response.data.message || "خطا در ذخیره نسخه");
        }
      } else {
        toast.error(error.message || "خطا در ذخیره نسخه");
      }
    }
  };

  // ========== چاپ ==========
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: prescriptionNumber || "Prescription",
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `,
    onAfterPrint: () => {
      setIsPrintReady(false);
    }
  });

  useEffect(() => {
    if (isPrintReady) {
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  }, [isPrintReady, handlePrint]);

  const handlePrintClick = () => {
    if (!prescriptionItems.length) {
      toast.error("آیتمی برای چاپ وجود ندارد");
      return;
    }

    const printData = {
      pres_num: prescriptionNumber,
      date: prescriptionDate,
      patient_name: patientData?.full_name || patientData?.name || "-",
      patient_age: patientData?.age || "-",
      patient_gender: patientData?.gender || "-",
      patient_phone: patientData?.phone || "-",
      tazkira_number: patientData?.tazkira_number || "-",
      blood_group: patientData?.blood_group || "-",
      diagnosis: patientData?.diagnosis || "-",
      weight: patientData?.weight || "-",
      blood_pressure: patientData?.blood_pressure || "-",
      temperature: patientData?.temperature || "-",
      oxygen: patientData?.oxygen || "-",
      doctor_name: patientData?.doctor_name || "-",
      items: prescriptionItems,
    };

    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  // ========== انصراف ==========
  const handleCancel = () => {
    setPrescriptionItems([]);
    setFormItem(emptyItem);
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    if (onComplete) {
      onComplete();
    }
  };

  // ========== رندر ==========
  if (loading) {
    return (
      <MainLayoutjur>
        <div style={{ textAlign: "center", padding: "50px", color: "#fff" }}>
          <h2>⏳ در حال بارگذاری...</h2>
        </div>
      </MainLayoutjur>
    );
  }

  return (
    <MainLayoutjur>
      {/* ===== اطلاعات مریض ===== */}
      {patientData && (
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
              <span style={{ color: 'white', fontWeight: 'bold' }}>{patientData.full_name || patientData.name}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>شماره مراجعه</span>
              <span style={{ color: '#fcd34d', fontWeight: 'bold' }}>{patientData.reg_id || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>سن</span>
              <span style={{ color: 'white' }}>{patientData.age ? `${patientData.age} سال` : '-'}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>جنسیت</span>
              <span style={{ color: 'white' }}>{patientData.gender || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>تشخیص</span>
              <span style={{ color: 'white' }}>{patientData.diagnosis || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>شماره نسخه</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>{prescriptionNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== فرم اصلی ===== */}
      <div className="form-container">
        <h3 style={{ color: '#10b981', marginBottom: '15px' }}>📝 ثبت نسخه</h3>

        {/* ===== فرم افزودن دارو ===== */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '12px' }}>➕ افزودن دارو</h4>
          
          <div className="form-grid" onKeyDown={handleKeyDown}>
            {/* انتخاب روش تجویز */}
            <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={!formItem.is_custom}
                    onChange={() => {
                      setFormItem({ ...emptyItem, is_custom: false, category_id: formItem.category_id });
                      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
                    }}
                  />
                  <span>📦 انتخاب از داروهای موجود</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={formItem.is_custom}
                    onChange={() => {
                      setFormItem({ ...emptyItem, is_custom: true, category_id: formItem.category_id });
                      setStockAvailability({ available: true, totalStock: 0, message: "", checking: false });
                    }}
                  />
                  <span>✍️ تجویز داروی دستی (خارج از سیستم)</span>
                </label>
              </div>
            </div>

            <div>
              <label>کتگوری *</label>
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

            {formItem.is_custom ? (
              <>
                <div>
                  <label>نام دارو *</label>
                  <input
                    type="text"
                    value={formItem.custom_name}
                    onChange={e => setFormItem({ ...formItem, custom_name: e.target.value })}
                    placeholder="نام دارو را وارد کنید"
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
                  <label>نوع دارو</label>
                  <input
                    type="text"
                    value={formItem.custom_type}
                    onChange={e => setFormItem({ ...formItem, custom_type: e.target.value })}
                    placeholder="مثلاً: قرص، شربت، آمپول"
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
              </>
            ) : (
              <>
                <div>
                  <label>دارو *</label>
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
                  <label>حمایت‌کننده *</label>
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
              </>
            )}

            <div>
              <label>مقدار مصرف *</label>
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
                min="1"
                value={formItem.quantity}
                onChange={e => handleChange("quantity", e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${!formItem.is_custom && stockAvailability.message && !stockAvailability.available ? '#dc2626' : stockAvailability.available ? '#10b981' : '#374151'}`,
                  backgroundColor: '#1f2937',
                  color: 'white',
                  width: '100%'
                }}
              />
              {!formItem.is_custom && stockAvailability.message && (
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
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAddItem}
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
              ➕ افزودن به نسخه
            </button>
            {formItem.is_custom && (
              <button
                type="button"
                onClick={() => {
                  setFormItem({ ...emptyItem, category_id: formItem.category_id });
                  setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
                }}
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
                ❌ لغو ثبت دستی
              </button>
            )}
          </div>
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            ⚡ برای افزودن سریع، کلید Enter را بزنید
          </div>
        </div>

        {/* ===== لیست آیتم‌ها ===== */}
        {prescriptionItems.length > 0 && (
          <div className="table-container" style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#60a5fa' }}>📋 لیست داروهای تجویز شده ({prescriptionItems.length})</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>کتگوری</th>
                  <th>نام دارو</th>
                  <th>نوع</th>
                  <th>حمایت‌کننده</th>
                  <th>مقدار مصرف</th>
                  <th>تعداد</th>
                  <th>ملاحظات</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.category_name || "-"}</td>
                    <td>
                      {item.med_name || "-"}
                      {item.is_custom && (
                        <span style={{
                          background: '#8b5cf6',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          marginRight: '5px'
                        }}>دستی</span>
                      )}
                    </td>
                    <td>{item.med_type || "-"}</td>
                    <td>{item.supplier_name || "-"}</td>
                    <td>{item.dosage || "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{item.remarks || "-"}</td>
                    <td>
                      <button 
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
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="9" style={{ textAlign: 'left', fontWeight: 'bold', color: '#fcd34d' }}>
                    مجموع: {prescriptionItems.length} قلم دارو
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

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
            onClick={handleSavePrescription}
            disabled={prescriptionItems.length === 0 || isSubmitting}
            style={{
              backgroundColor: (prescriptionItems.length === 0 || isSubmitting) ? '#6b7280' : '#10b981',
              color: 'white',
              padding: '10px 25px',
              borderRadius: '6px',
              border: 'none',
              cursor: (prescriptionItems.length === 0 || isSubmitting) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: (prescriptionItems.length === 0 || isSubmitting) ? 0.5 : 1
            }}
          >
            {isSubmitting ? '⏳ در حال ذخیره...' : '💾 ذخیره نسخه'}
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
              🖨️ چاپ نسخه
            </button>
          )}

          <button
            type="button"
            onClick={handleCancel}
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
            ❌ انصراف
          </button>
        </div>
      </div>

      {/* ===== کامپوننت چاپ ===== */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
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
        }
      `}</style>
    </MainLayoutjur>
  );
}