import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../../components/Mainlayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../../PrescriptionPrint";

export default function PrescriptionForm({ registration, regId, api: propApi, onComplete, onRefresh, onSave, onFinish, onNextStep, onPrevStep, currentStep, nextStep, prevStep, isSubmitting, isTreatmentComplete }) {
  const { api: authApi } = useAuth();
  const api = propApi || authApi;
  const printRef = useRef(null);

  // اطلاعات مریض
  const [patientData, setPatientData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  
  // لیست داروها
  const [medications, setMedications] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // آیتم‌های نسخه
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  
  // حالت ویرایش
  const [editingId, setEditingId] = useState(null);
  
  // فرم افزودن دارو
  const [newItem, setNewItem] = useState({
    med_id: "",
    category_id: "",
    dosage: "",
    quantity: 1,
    remarks: "",
    isCustom: false,
    customName: "",
    customType: "",
  });
  
  // وضعیت نمایش برگه نسخه - ✅ به صورت پیش‌فرض true می‌شود
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(true);
  const [sheetItems, setSheetItems] = useState([]);
  
  // لیست نسخه‌ها
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // داده‌های چاپ
  const [prescriptionPrintData, setPrescriptionPrintData] = useState(null);
  const [isPrintReady, setIsPrintReady] = useState(false);
  
  // وضعیت لودینگ
  const [loading, setLoading] = useState(true);

  // ========== دریافت اطلاعات ==========
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      // ✅ استفاده از registration که به عنوان prop پاس داده شده
      const effectiveRegId = regId || registration?.reg_id;
      
      if (registration) {
        // ساخت patientData از registration
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
        setSelectedPatientId(effectiveRegId);
      } else {
        // اگر registration نبود، از sessionStorage استفاده کن
        const storedPatient = sessionStorage.getItem('selectedPatient');
        if (storedPatient) {
          try {
            const patient = JSON.parse(storedPatient);
            setPatientData(patient);
            setSelectedPatientId(patient.reg_id);
          } catch (e) {
            console.error("Error parsing patient data:", e);
          }
        }
      }
      
      // تولید شماره نسخه
      setPrescriptionNumber(`RX-${Date.now()}`);
      
      // تاریخ امروز
      setPrescriptionDate(new Date().toISOString().slice(0, 10));
      
      // بارگذاری لیست‌ها
      await Promise.all([
        loadMedications(),
        loadCategories(),
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

  // ========== مدیریت آیتم‌های نسخه ==========
  const handleAddItem = () => {
    if (!newItem.isCustom && !newItem.med_id) {
      toast.error("لطفاً یک دارو انتخاب کنید");
      return;
    }
    if (newItem.isCustom && !newItem.customName.trim()) {
      toast.error("لطفاً نام دارو را وارد کنید");
      return;
    }
    if (!newItem.category_id) {
      toast.error("لطفاً کتگوری را انتخاب کنید");
      return;
    }
    if (!newItem.dosage.trim()) {
      toast.error("لطفاً مقدار مصرف را وارد کنید");
      return;
    }

    let medName = "";
    let medType = "";
    let categoryName = "";
    let isCustom = newItem.isCustom;

    if (newItem.isCustom) {
      medName = newItem.customName.trim();
      medType = newItem.customType || "سایر";
      const cat = categories.find(c => Number(c.category_id) === Number(newItem.category_id));
      categoryName = cat?.category_name || "-";
    } else {
      const med = medications.find(m => Number(m.med_id) === Number(newItem.med_id));
      const cat = categories.find(c => Number(c.category_id) === Number(newItem.category_id));
      medName = med?.gen_name || "-";
      medType = med?.type || "-";
      categoryName = cat?.category_name || "-";
    }

    const item = {
      id: Date.now() + Math.random(),
      med_id: newItem.med_id || `custom-${Date.now()}`,
      category_id: newItem.category_id,
      category_name: categoryName,
      med_name: medName,
      med_type: medType,
      dosage: newItem.dosage,
      quantity: Number(newItem.quantity) || 1,
      remarks: newItem.remarks || "",
      is_custom: isCustom,
    };

    setPrescriptionItems([...prescriptionItems, item]);
    
    setNewItem({
      med_id: "",
      category_id: "",
      dosage: "",
      quantity: 1,
      remarks: "",
      isCustom: false,
      customName: "",
      customType: "",
    });
    
    toast.success("دارو با موفقیت اضافه شد");
  };

  const handleRemoveItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  // ========== ذخیره نسخه ==========
  const handleSavePrescription = async (itemsToSave) => {
    const items = itemsToSave || prescriptionItems;
    
    if (!patientData) {
      toast.error("لطفاً یک مریض انتخاب کنید");
      return;
    }
    
    if (items.length === 0) {
      toast.error("حداقل یک دارو باید تجویز شود");
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
      items: items.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        dosage: item.dosage,
        quantity: item.quantity,
        remarks: item.remarks,
        is_custom: item.is_custom || false,
        med_name: item.med_name,
        med_type: item.med_type,
        category_name: item.category_name,
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
      setSheetItems([]);
      
      // ✅ فراخوانی onSave برای اطلاع‌رسانی به TreatmentPage
      if (onSave) {
        try {
          await onSave(payload);
        } catch (err) {
          console.log("onSave callback error:", err);
        }
      }
      
      // ✅ بازگشت به صفحه اصلی درمان
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

  const preparePrintData = (items) => {
    const itemsToUse = items || prescriptionItems;
    if (!itemsToUse.length) {
      toast.error("آیتمی برای چاپ وجود ندارد");
      return null;
    }

    return {
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
      items: itemsToUse,
    };
  };

  const handlePrintClick = (items) => {
    const printData = preparePrintData(items);
    if (printData) {
      setPrescriptionPrintData(printData);
      setIsPrintReady(true);
    }
  };

  // ========== برگه نسخه ==========
  const PrescriptionSheet = () => {
    const [localItems, setLocalItems] = useState(prescriptionItems);
    const [localNewItem, setLocalNewItem] = useState({ ...newItem });
    const [searchTerm, setSearchTerm] = useState("");

    const filteredMeds = medications.filter(m =>
      m.gen_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddLocalItem = () => {
      if (!localNewItem.isCustom && !localNewItem.med_id) {
        toast.error("لطفاً یک دارو انتخاب کنید");
        return;
      }
      if (localNewItem.isCustom && !localNewItem.customName.trim()) {
        toast.error("لطفاً نام دارو را وارد کنید");
        return;
      }
      if (!localNewItem.category_id) {
        toast.error("لطفاً کتگوری را انتخاب کنید");
        return;
      }
      if (!localNewItem.dosage.trim()) {
        toast.error("لطفاً مقدار مصرف را وارد کنید");
        return;
      }

      let medName = "";
      let medType = "";
      let categoryName = "";
      let isCustom = localNewItem.isCustom;

      if (localNewItem.isCustom) {
        medName = localNewItem.customName.trim();
        medType = localNewItem.customType || "سایر";
        const cat = categories.find(c => Number(c.category_id) === Number(localNewItem.category_id));
        categoryName = cat?.category_name || "-";
      } else {
        const med = medications.find(m => Number(m.med_id) === Number(localNewItem.med_id));
        const cat = categories.find(c => Number(c.category_id) === Number(localNewItem.category_id));
        medName = med?.gen_name || "-";
        medType = med?.type || "-";
        categoryName = cat?.category_name || "-";
      }

      const item = {
        id: Date.now() + Math.random(),
        med_id: localNewItem.med_id || `custom-${Date.now()}`,
        category_id: localNewItem.category_id,
        category_name: categoryName,
        med_name: medName,
        med_type: medType,
        dosage: localNewItem.dosage,
        quantity: Number(localNewItem.quantity) || 1,
        remarks: localNewItem.remarks || "",
        is_custom: isCustom,
      };

      setLocalItems([...localItems, item]);
      setLocalNewItem({
        med_id: "",
        category_id: "",
        dosage: "",
        quantity: 1,
        remarks: "",
        isCustom: false,
        customName: "",
        customType: "",
      });
      setSearchTerm("");
      toast.success("دارو با موفقیت اضافه شد");
    };

    const handleRemoveLocalItem = (id) => {
      setLocalItems(localItems.filter(i => i.id !== id));
    };

    const handleSaveSheet = () => {
      setPrescriptionItems(localItems);
      handleSavePrescription(localItems);
    };

    const handleCancelSheet = () => {
      // ✅ بازگشت به صفحه اصلی درمان
      if (onComplete) {
        onComplete();
      }
    };

    const styles = {
      container: {
        maxWidth: "1000px",
        margin: "0 auto",
        background: "#fff",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        color: "#000",
      },
      header: {
        background: "#1a56db",
        color: "#fff",
        padding: "15px",
        borderRadius: "8px 8px 0 0",
        textAlign: "center",
        fontSize: "20px",
        fontWeight: "bold",
        marginBottom: "20px",
      },
      patientInfo: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "10px",
        padding: "15px",
        background: "#f8fafc",
        borderRadius: "8px",
        marginBottom: "20px",
        color: "#000",
      },
      infoItem: {
        fontSize: "14px",
        color: "#000",
      },
      searchSection: {
        display: "flex",
        gap: "10px",
        marginBottom: "15px",
        flexWrap: "wrap",
      },
      searchInput: {
        flex: "1",
        padding: "10px",
        border: "2px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "14px",
        minWidth: "200px",
        color: "#000",
      },
      formGroup: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "10px",
        marginBottom: "15px",
      },
      input: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "14px",
        width: "100%",
        color: "#000",
      },
      select: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "14px",
        width: "100%",
        background: "#fff",
        color: "#000",
      },
      button: {
        padding: "10px 20px",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.2s",
      },
      buttonPrimary: {
        background: "#2563eb",
        color: "#fff",
      },
      buttonSuccess: {
        background: "#16a34a",
        color: "#fff",
      },
      buttonDanger: {
        background: "#dc2626",
        color: "#fff",
      },
      buttonSecondary: {
        background: "#6b7280",
        color: "#fff",
      },
      buttonCustom: {
        background: "#8b5cf6",
        color: "#fff",
      },
      table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "15px",
      },
      th: {
        background: "#f1f5f9",
        padding: "10px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
        fontSize: "13px",
        fontWeight: "bold",
        color: "#000",
      },
      td: {
        padding: "10px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
        fontSize: "13px",
        color: "#000",
      },
      actions: {
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        marginTop: "20px",
        flexWrap: "wrap",
      },
      customBadge: {
        background: "#8b5cf6",
        color: "#fff",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "bold",
        marginRight: "5px",
      },
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>📋 برگه نسخه - بیمارستان شفا</div>

        {patientData && (
          <div style={styles.patientInfo}>
            <div style={styles.infoItem}><strong>نام مریض:</strong> {patientData.full_name || patientData.name}</div>
            <div style={styles.infoItem}><strong>شماره نسخه:</strong> {prescriptionNumber}</div>
            <div style={styles.infoItem}><strong>سن:</strong> {patientData.age || "-"}</div>
            <div style={styles.infoItem}><strong>جنسیت:</strong> {patientData.gender || "-"}</div>
            <div style={styles.infoItem}><strong>تشخیص:</strong> {patientData.diagnosis || "-"}</div>
            <div style={styles.infoItem}><strong>تاریخ:</strong> {prescriptionDate}</div>
            <div style={styles.infoItem}><strong>شماره تماس:</strong> {patientData.phone || "-"}</div>
            <div style={styles.infoItem}><strong>گروه خون:</strong> {patientData.blood_group || "-"}</div>
          </div>
        )}

        <div style={styles.searchSection}>
          <input
            style={styles.searchInput}
            type="text"
            placeholder="🔍 جستجوی دارو در سیستم..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button
            style={{ ...styles.button, ...styles.buttonCustom }}
            onClick={() => {
              setLocalNewItem({ ...localNewItem, isCustom: true });
              setSearchTerm("");
            }}
          >
            ➕ ثبت داروی جدید
          </button>
        </div>

        {searchTerm && filteredMeds.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", marginBottom: "15px", maxHeight: "200px", overflowY: "auto" }}>
            {filteredMeds.slice(0, 10).map(med => (
              <div
                key={med.med_id}
                style={{
                  padding: "10px 15px",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#000",
                }}
                onClick={() => {
                  setLocalNewItem({
                    ...localNewItem,
                    med_id: med.med_id,
                    isCustom: false,
                    category_id: med.category_id || "",
                    customName: "",
                    customType: "",
                  });
                  setSearchTerm(med.gen_name);
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>{med.gen_name}</span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{med.type || "-"}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={styles.formGroup}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>کتگوری *</label>
              <select
                style={styles.select}
                value={localNewItem.category_id}
                onChange={e => setLocalNewItem({ ...localNewItem, category_id: e.target.value })}
              >
                <option value="">انتخاب کنید</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            {localNewItem.isCustom ? (
              <>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>نام دارو *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="نام دارو را وارد کنید"
                    value={localNewItem.customName}
                    onChange={e => setLocalNewItem({ ...localNewItem, customName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>نوع دارو</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="مثلاً: قرص، شربت، آمپول"
                    value={localNewItem.customType}
                    onChange={e => setLocalNewItem({ ...localNewItem, customType: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "12px", color: "#8b5cf6" }}>🆕 این دارو به صورت دستی ثبت می‌شود</span>
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>دارو</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="نام دارو را جستجو کنید"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>مقدار مصرف *</label>
              <input
                style={styles.input}
                type="text"
                placeholder="مثلاً: 1×2"
                value={localNewItem.dosage}
                onChange={e => setLocalNewItem({ ...localNewItem, dosage: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>تعداد</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={localNewItem.quantity}
                onChange={e => setLocalNewItem({ ...localNewItem, quantity: Number(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px", color: "#000" }}>ملاحظات</label>
              <input
                style={styles.input}
                type="text"
                placeholder="توضیحات اضافی"
                value={localNewItem.remarks}
                onChange={e => setLocalNewItem({ ...localNewItem, remarks: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleAddLocalItem}
            >
              ➕ افزودن به نسخه
            </button>
            {localNewItem.isCustom && (
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setLocalNewItem({ ...localNewItem, isCustom: false, customName: "", customType: "" });
                }}
              >
                ❌ لغو ثبت دستی
              </button>
            )}
          </div>
        </div>

        {localItems.length > 0 && (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>کتگوری</th>
                  <th style={styles.th}>نام دارو</th>
                  <th style={styles.th}>نوع</th>
                  <th style={styles.th}>مقدار مصرف</th>
                  <th style={styles.th}>تعداد</th>
                  <th style={styles.th}>ملاحظات</th>
                  <th style={styles.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {localItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{item.category_name}</td>
                    <td style={styles.td}>
                      {item.med_name}
                      {item.is_custom && <span style={styles.customBadge}>دستی</span>}
                    </td>
                    <td style={styles.td}>{item.med_type || "-"}</td>
                    <td style={styles.td}>{item.dosage}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>{item.remarks || "-"}</td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.button, ...styles.buttonDanger, padding: "4px 12px", fontSize: "12px" }}
                        onClick={() => handleRemoveLocalItem(item.id)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "10px", textAlign: "left", fontSize: "14px", color: "#6b7280" }}>
              مجموع: {localItems.length} قلم دارو
            </div>
          </>
        )}

        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.buttonSuccess }}
            onClick={handleSaveSheet}
            disabled={localItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? '⏳ در حال ذخیره...' : '💾 ذخیره نسخه'}
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={() => handlePrintClick(localItems)}
            disabled={localItems.length === 0}
          >
            🖨️ چاپ نسخه
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={handleCancelSheet}
          >
            ❌ انصراف
          </button>
        </div>
      </div>
    );
  };

  // ========== رندر اصلی ==========
  if (loading) {
    return (
      <MainLayoutjur>
        <div style={{ textAlign: "center", padding: "50px", color: "#fff" }}>
          <h2>⏳ در حال بارگذاری...</h2>
        </div>
      </MainLayoutjur>
    );
  }

  // ✅ همیشه برگه نسخه را نمایش بده (بدون صفحه انتخاب مریض)
  return (
    <MainLayoutjur>
      <PrescriptionSheet />

      {/* کامپوننت چاپ */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {prescriptionPrintData && (
          <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />
        )}
      </div>
    </MainLayoutjur>
  );
}