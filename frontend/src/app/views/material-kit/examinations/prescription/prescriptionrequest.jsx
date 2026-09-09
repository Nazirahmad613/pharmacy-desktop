import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../../components/Mainlayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../../PrescriptionPrint";

export default function PrescriptionForm() {
  const { api } = useAuth();
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
  
  // وضعیت نمایش برگه نسخه
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
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
      
      // دریافت اطلاعات مریض از sessionStorage
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
      
      // تولید شماره نسخه
      setPrescriptionNumber(`RX-${Date.now()}`);
      
      // تاریخ امروز
      setPrescriptionDate(new Date().toISOString().slice(0, 10));
      
      // بارگذاری لیست‌ها
      await Promise.all([
        loadPatients(),
        loadMedications(),
        loadCategories(),
        loadPrescriptions()
      ]);
      
      setLoading(false);
    };
    
    initialize();
  }, []);

  // ========== توابع بارگذاری ==========
  const loadPatients = async () => {
    try {
      const res = await api.get("/registrations");
      const data = res.data.data ?? res.data ?? [];
      const patientList = data.filter(r => r.reg_type === "patient");
      setPatients(patientList);
      
      // اگر اطلاعات مریض در sessionStorage نبود اما در لیست بود
      if (!patientData && patientList.length > 0) {
        // می‌توانید اولین مریض را انتخاب کنید یا خیر
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      toast.error("خطا در دریافت لیست مریضان");
    }
  };

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

  const loadPrescriptions = async () => {
    try {
      const res = await api.get("/prescriptions");
      const list = res.data?.data ?? res.data ?? [];
      setPrescriptionsList(list);
    } catch (error) {
      console.error("Load prescriptions error:", error);
      toast.error("خطا در دریافت نسخه ها");
    }
  };

  // ========== انتخاب مریض ==========
  const handleSelectPatient = (regId) => {
    setSelectedPatientId(regId);
    const patient = patients.find(p => p.reg_id == regId);
    if (patient) {
      setPatientData(patient);
      sessionStorage.setItem('selectedPatient', JSON.stringify(patient));
      toast.success(`مریض ${patient.full_name || patient.name} انتخاب شد`);
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
  const handleSavePrescription = async () => {
    if (!patientData) {
      toast.error("لطفاً یک مریض انتخاب کنید");
      return;
    }
    
    if (prescriptionItems.length === 0) {
      toast.error("حداقل یک دارو باید تجویز شود");
      return;
    }

    const payload = {
      patient_id: patientData.reg_id,
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
      setShowPrescriptionSheet(false);
      setSheetItems([]);
      loadPrescriptions();
      
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

  const preparePrintData = () => {
    if (!prescriptionItems.length) {
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
      items: prescriptionItems,
    };
  };

  const handlePrintClick = () => {
    const printData = preparePrintData();
    if (printData) {
      setPrescriptionPrintData(printData);
      setIsPrintReady(true);
    }
  };

  // ========== مدیریت نسخه‌های ثبت شده ==========
  const handleDeletePrescription = async (id) => {
    if (!confirm("آیا می‌خواهید این نسخه حذف شود؟")) return;
    try {
      await api.delete(`/prescriptions/${id}`);
      toast.success("نسخه حذف شد");
      loadPrescriptions();
    } catch (error) {
      console.error(error);
      toast.error("خطا در حذف نسخه");
    }
  };

  const handleEditPrescription = (pres) => {
    setEditingId(pres.pres_id);
    setPrescriptionNumber(pres.pres_num);
    setPrescriptionDate(pres.pres_date);
    
    // پیدا کردن اطلاعات مریض
    const patient = patients.find(p => p.reg_id == pres.patient_id);
    if (patient) {
      setPatientData(patient);
      setSelectedPatientId(patient.reg_id);
    }
    
    const items = (pres.items ?? []).map(i => ({
      id: i.pres_it_id || Date.now() + Math.random(),
      med_id: i.med_id,
      category_id: i.category_id,
      category_name: i.category_name || "-",
      med_name: i.med_name || "-",
      med_type: i.med_type || "-",
      dosage: i.dosage || "",
      quantity: i.quantity || 1,
      remarks: i.remarks || "",
      is_custom: i.is_custom || false,
    }));
    setPrescriptionItems(items);
    setShowPrescriptionSheet(true);
  };

  // ========== پیجینیشن ==========
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentPrescriptions = prescriptionsList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(prescriptionsList.length / itemsPerPage);

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
      handleSavePrescription();
    };

    const handleCancelSheet = () => {
      setShowPrescriptionSheet(false);
      setSheetItems([]);
      toast.info("انصراف از ویرایش نسخه");
    };

    const styles = {
      container: {
        maxWidth: "1000px",
        margin: "0 auto",
        background: "#fff",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
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
      },
      infoItem: {
        fontSize: "14px",
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
      },
      select: {
        padding: "8px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "14px",
        width: "100%",
        background: "#fff",
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
      },
      td: {
        padding: "10px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
        fontSize: "13px",
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
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>کتگوری *</label>
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
                  <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>نام دارو *</label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="نام دارو را وارد کنید"
                    value={localNewItem.customName}
                    onChange={e => setLocalNewItem({ ...localNewItem, customName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>نوع دارو</label>
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
                <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>دارو</label>
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
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>مقدار مصرف *</label>
              <input
                style={styles.input}
                type="text"
                placeholder="مثلاً: 1×2"
                value={localNewItem.dosage}
                onChange={e => setLocalNewItem({ ...localNewItem, dosage: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>تعداد</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={localNewItem.quantity}
                onChange={e => setLocalNewItem({ ...localNewItem, quantity: Number(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>ملاحظات</label>
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
            disabled={localItems.length === 0}
          >
            💾 ذخیره نسخه
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={handlePrintClick}
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
  if (showPrescriptionSheet) {
    return (
      <MainLayoutjur>
        <PrescriptionSheet />
      </MainLayoutjur>
    );
  }

  if (loading) {
    return (
      <MainLayoutjur>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h2>⏳ در حال بارگذاری...</h2>
        </div>
      </MainLayoutjur>
    );
  }

  return (
    <MainLayoutjur>
      <div className="form-container" style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", color: "#1a56db", marginBottom: "20px" }}>
          📋 ثبت نسخه
        </h1>

        {/* انتخاب مریض */}
        <div style={{
          background: "#f8fafc",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}>
          <h3 style={{ marginBottom: "15px", color: "#1e293b" }}>انتخاب مریض</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={selectedPatientId}
              onChange={e => handleSelectPatient(e.target.value)}
              style={{
                flex: "1",
                padding: "10px 15px",
                borderRadius: "6px",
                border: "2px solid #e2e8f0",
                fontSize: "14px",
                minWidth: "250px",
              }}
            >
              <option value="">-- انتخاب مریض --</option>
              {patients.map(p => (
                <option key={p.reg_id} value={p.reg_id}>
                  {p.full_name || p.name} - {p.phone || "بدون شماره"}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                // بازگشت به رجیستریشن برای انتخاب مریض
                window.location.href = "/registration";
              }}
              style={{
                padding: "10px 20px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔍 انتخاب از رجیستریشن
            </button>
          </div>
        </div>

        {/* اطلاعات مریض */}
        {patientData ? (
          <>
            <div style={{
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "12px",
              border: "2px solid #16a34a",
            }}>
              <div><strong>🆔 شماره نسخه:</strong> {prescriptionNumber}</div>
              <div><strong>👤 نام مریض:</strong> {patientData.full_name || patientData.name}</div>
              <div><strong>📅 سن:</strong> {patientData.age || "-"}</div>
              <div><strong>⚥ جنسیت:</strong> {patientData.gender || "-"}</div>
              <div><strong>📞 شماره تماس:</strong> {patientData.phone || "-"}</div>
              <div><strong>🩸 گروه خون:</strong> {patientData.blood_group || "-"}</div>
              <div><strong>🆔 تذکره:</strong> {patientData.tazkira_number || "-"}</div>
              <div><strong>🏥 تشخیص:</strong> {patientData.diagnosis || "-"}</div>
              <div><strong>⚖️ وزن:</strong> {patientData.weight || "-"} کیلوگرم</div>
              <div><strong>💉 فشار خون:</strong> {patientData.blood_pressure || "-"}</div>
              <div><strong>🌡️ حرارت:</strong> {patientData.temperature || "-"} °C</div>
              <div><strong>💨 اکسیژن:</strong> {patientData.oxygen || "-"} %</div>
              <div><strong>📅 تاریخ:</strong> {prescriptionDate}</div>
            </div>

            <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="edit"
                onClick={() => setShowPrescriptionSheet(true)}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  padding: "12px 30px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                📝 شروع به تجویز داروها
              </button>
              <button
                className="edit"
                onClick={() => {
                  setPatientData(null);
                  setSelectedPatientId("");
                  sessionStorage.removeItem('selectedPatient');
                }}
                style={{
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  padding: "12px 30px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                🔄 تغییر مریض
              </button>
            </div>

            {prescriptionItems.length > 0 && (
              <div style={{ marginTop: "20px", textAlign: "center", color: "#16a34a" }}>
                ✅ {prescriptionItems.length} قلم دارو انتخاب شده است
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "30px", background: "#fef2f2", borderRadius: "8px" }}>
            <h3 style={{ color: "#dc2626" }}>⚠️ لطفاً یک مریض انتخاب کنید</h3>
            <p style={{ color: "#6b7280" }}>برای شروع، یک مریض را از لیست بالا انتخاب کنید یا از رجیستریشن انتخاب نمایید</p>
          </div>
        )}
      </div>

      {/* لیست نسخه‌های ثبت شده */}
      {prescriptionsList.length > 0 && (
        <div className="table-container" style={{ marginTop: "30px" }}>
          <h3>📋 نسخه‌های ثبت شده</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>شماره نسخه</th>
                <th>مریض</th>
                <th>تاریخ</th>
                <th>تعداد اقلام</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {currentPrescriptions.map((p, idx) => {
                const items = p.items || [];
                return (
                  <tr key={p.pres_id}>
                    <td>{indexOfFirstItem + idx + 1}</td>
                    <td>{p.pres_num || p.pres_id}</td>
                    <td>{p.patient_name || "-"}</td>
                    <td>{p.pres_date}</td>
                    <td>{items.length}</td>
                    <td>
                      <button
                        style={{
                          background: "#dcc215",
                          color: "#000",
                          padding: "5px 12px",
                          borderRadius: "5px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          margin: "2px",
                        }}
                        onClick={() => handleEditPrescription(p)}
                      >
                        تصحیح
                      </button>
                      <button
                        style={{
                          background: "#dc2626",
                          color: "#fff",
                          padding: "5px 12px",
                          borderRadius: "5px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          margin: "2px",
                        }}
                        onClick={() => handleDeletePrescription(p.pres_id)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ margin: "0 5px", padding: "5px 15px", borderRadius: "4px", border: "1px solid #ccc", cursor: "pointer" }}
              >
                قبلی
              </button>
              <span style={{ margin: "0 10px" }}>
                صفحه {currentPage} از {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ margin: "0 5px", padding: "5px 15px", borderRadius: "4px", border: "1px solid #ccc", cursor: "pointer" }}
              >
                بعدی
              </button>
            </div>
          )}
        </div>
      )}

      {/* کامپوننت چاپ */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {prescriptionPrintData && (
          <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />
        )}
      </div>
    </MainLayoutjur>
  );
}