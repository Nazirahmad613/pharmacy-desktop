 import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../PrescriptionPrint";

export default function PrescriptionForm() {
  const { api } = useAuth();
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

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patients, setPatients] = useState([]);
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
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const [categories, setCategories] = useState([]);
  const [medications, setMedications] = useState([]);
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

  // ========== حالت جدید: نمایش برگه‌ی نسخه ==========
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);
  const [tempPrescriptionData, setTempPrescriptionData] = useState(null);
  
  // ========== State for PrescriptionSheet items (moved to parent to persist during print) ==========
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

  useEffect(() => {
    document.title = ".";
    api.get("/registrations").then(res => {
      const data = res.data.data ?? res.data ?? [];
      setPatients(data.filter(r => r.reg_type === "patient"));
      setDoctors(data.filter(r => r.reg_type === "doctor"));
      setSuppliers(data.filter(r => r.reg_type === "supplier"));
    });
    api.get("/categories").then(res => setCategories(res.data.data ?? res.data));
    api.get("/medications").then(res => setMedications(res.data.data ?? res.data));
    loadPrescriptions();
  }, []);

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
      setPrescriptionsList(list);
    } catch (error) {
      console.error("Load prescriptions error:", error);
      toast.error("خطا در دریافت نسخه ها");
    }
  };

  useEffect(() => {
    const sum = prescriptionItems.reduce((t, i) => t + Number(i.total_price || 0), 0);
    setTotalAmount(sum);
  }, [prescriptionItems]);

  useEffect(() => {
    setNetAmount(totalAmount - discount);
  }, [totalAmount, discount]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const p = patients.find(x => x.reg_id == selectedPatientId);
    if (!p) return;
    setPatientInfo({
      age: p.age ?? "",
      gender: p.gender ?? "",
      phone: p.phone ?? "",
      blood_group: p.blood_group ?? "",
      reg_id: p.reg_id ?? "",
      pres_num: p.pres_num ?? "",
      tazkira_number: p.tazkira_number ?? "",
      diagnosis: p.diagnosis ?? "",
      weight: p.weight ?? "",
      blood_pressure: p.blood_pressure ?? "",
      temperature: p.temperature ?? "",
      oxygen: p.oxygen ?? "",
    });
  }, [selectedPatientId, patients]);

  const filteredMedications = editingId && prescriptionItems.length > 0
    ? medications.filter(m => prescriptionItems.some(item => item.med_id == m.med_id))
    : medications.filter(m => Number(m.category_id) === Number(formItem.category_id));

  const selectedMedication = medications.find(m => Number(m.med_id) === Number(formItem.med_id));

  const filteredSuppliers = editingId && prescriptionItems.length > 0
    ? suppliers.filter(s => prescriptionItems.some(item => item.supplier_id == s.reg_id))
    : selectedMedication
      ? suppliers.filter(s => s.reg_id == selectedMedication.supplier_id)
      : [];

  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };

    if (field === "category_id") {
      updated.med_id = "";
      updated.supplier_id = "";
      updated.unit_price = 0;
      updated.type = "";
    }

    if (field === "med_id") {
      const med = medications.find(m => m.med_id == value);
      updated.type = med?.type ?? "";
      updated.unit_price = med?.unit_price ?? 0;
      updated.supplier_id = "";
    }

    const quantity = Number(updated.quantity) || 0;
    const unit_price = Number(updated.unit_price) || 0;
    updated.total_price = quantity * unit_price;

    setFormItem(updated);
  };

  const handleKeyDown = e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!formItem.category_id || !formItem.med_id || !formItem.supplier_id || Number(formItem.quantity) <= 0) {
      toast.error("❌ اطلاعات آیتم کامل نیست");
      return;
    }

    const newItem = { ...formItem, id: Date.now() };
    setPrescriptionItems(prev => [...prev, newItem]);
    setFormItem({ ...emptyItem });
  };

  const handleRemoveItem = id => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrescriptionItems([]);
    setFormItem({ ...emptyItem });
    setSelectedPatientId("");
    setSelectedDoctorId("");
    setPrescriptionDate("");
    setDiscount(0);
    setTotalAmount(0);
    setNetAmount(0);
    setPatientInfo({
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
    });
    setShowPrescriptionSheet(false);
    setTempPrescriptionData(null);
    setSheetItems([]);
    setSheetLocalDiscount(0);
    toast.info("✏️ ویرایش لغو شد");
  };

  // ========== ذخیره موقت اطلاعات عمومی و رفتن به برگه‌ی نسخه ==========
  const saveHeaderAndShowSheet = () => {
    if (!selectedPatientId || !selectedDoctorId) {
      toast.error("لطفاً مریض و داکتر را انتخاب کنید");
      return;
    }

    let presNum = patientInfo.pres_num?.trim();
    if (!presNum) {
      presNum = `TEMP-${Date.now()}`;
      toast.info(`شماره نسخه موقت: ${presNum}. لطفاً بعداً آن را اصلاح کنید.`);
      setPatientInfo(prev => ({ ...prev, pres_num: presNum }));
    }

    const fullData = {
      patient_id: selectedPatientId,
      pres_num: presNum,
      patient_age: patientInfo.age,
      patient_gender: patientInfo.gender,
      patient_phone: patientInfo.phone,
      patient_reg_id: patientInfo.reg_id,
      patient_blood_group: patientInfo.blood_group,
      tazkira_number: patientInfo.tazkira_number,
      doc_id: selectedDoctorId,
      pres_date: prescriptionDate || new Date().toISOString().slice(0, 10),
      discount: discount,
      patient: patients.find(p => p.reg_id == selectedPatientId),
      doctor: doctors.find(d => d.reg_id == selectedDoctorId),
      diagnosis: patientInfo.diagnosis,
      weight: patientInfo.weight,
      blood_pressure: patientInfo.blood_pressure,
      temperature: patientInfo.temperature,
      oxygen: patientInfo.oxygen,
      items: [],
    };

    setTempPrescriptionData(fullData);
    setSheetItems([]);
    setSheetLocalDiscount(0);
    setShowPrescriptionSheet(true);
    toast.success("معلومات عمومی ذخیره شد. اکنون می‌توانید آیتم‌ها را اضافه کنید.");
  };

  // ========== ذخیره نهایی نسخه (با آیتم‌ها) از برگه‌ی جدید ==========
  const saveFinalFromSheet = async (items, updatedDiscount) => {
    if (!tempPrescriptionData) return;

    const total = items.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);
    const net = total - updatedDiscount;

    const payload = {
      patient_id: tempPrescriptionData.patient_id,
      pres_num: tempPrescriptionData.pres_num,
      patient_age: tempPrescriptionData.patient_age,
      patient_gender: tempPrescriptionData.patient_gender,
      patient_phone: tempPrescriptionData.patient_phone,
      patient_reg_id: tempPrescriptionData.patient_reg_id,
      patient_blood_group: tempPrescriptionData.patient_blood_group,
      tazkira_number: tempPrescriptionData.tazkira_number,
      doc_id: tempPrescriptionData.doc_id,
      pres_date: tempPrescriptionData.pres_date,
      total_amount: total,
      discount: updatedDiscount,
      net_amount: net,
      items: items.map(item => ({
        category_id: item.category_id,
        med_id: item.med_id,
        supplier_id: item.supplier_id,
        type: item.type,
        dosage: item.dosage,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        remarks: item.remarks,
      })),
    };

    try {
      await api.post("/prescriptions", payload);
      toast.success("نسخه با موفقیت ذخیره شد");
      handleCancelEdit();
      loadPrescriptions();
    } catch (error) {
      console.error(error);
      if (error.response) {
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = Object.entries(errors)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("\n");
          toast.error(`خطاهای اعتبارسنجی:\n${errorMessages}`);
        } else {
          toast.error(error.response.data.message || "خطا در ذخیره نهایی نسخه");
        }
      } else {
        toast.error(error.message || "خطا در ذخیره نهایی نسخه");
      }
    }
  };

  // ========== ذخیره نسخه به روش قدیمی (برای ویرایش) ==========
  const handleSavePrescription = async () => {
    if (!selectedPatientId || !selectedDoctorId || prescriptionItems.length === 0) {
      toast.error("❌ اطلاعات نسخه ناقص است");
      return;
    }

    const payload = {
      patient_id: selectedPatientId,
      pres_num: patientInfo.pres_num,
      patient_age: patientInfo.age,
      patient_gender: patientInfo.gender,
      patient_phone: patientInfo.phone,
      patient_reg_id: patientInfo.reg_id,
      patient_blood_group: patientInfo.blood_group,
      tazkira_number: patientInfo.tazkira_number,
      doc_id: selectedDoctorId,
      pres_date: prescriptionDate || new Date().toISOString().slice(0,10),
      total_amount: totalAmount,
      discount,
      net_amount: netAmount,
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

      setPrescriptionItems([]);
      setFormItem({ ...emptyItem });
      setSelectedPatientId("");
      setSelectedDoctorId("");
      setPrescriptionDate("");
      setDiscount(0);
      setTotalAmount(0);
      setNetAmount(0);
      setPatientInfo({
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
      });

      loadPrescriptions();
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error("❌ خطا در ذخیره نسخه");
    }
  };

  const handleEditPrescription = (pres) => {
    setEditingId(pres.pres_id);
    setSelectedPatientId(pres.patient_id);
    setSelectedDoctorId(pres.doc_id);
    setPrescriptionDate(pres.pres_date);
    setDiscount(pres.discount);
    setTotalAmount(pres.total_amount);
    setNetAmount(pres.net_amount);

    const patient = patients.find(x => x.reg_id == pres.patient_id);
    if (patient) {
      setPatientInfo({
        age: patient.age ?? "",
        gender: patient.gender ?? "",
        phone: patient.phone ?? "",
        blood_group: patient.blood_group ?? "",
        reg_id: patient.reg_id ?? "",
        pres_num: patient.pres_num ?? "",
        tazkira_number: patient.tazkira_number ?? "",
        diagnosis: patient.diagnosis ?? "",
        weight: patient.weight ?? "",
        blood_pressure: patient.blood_pressure ?? "",
        temperature: patient.temperature ?? "",
        oxygen: patient.oxygen ?? "",
      });
    }

    const items = (pres.items ?? []).map(i => ({
      id: i.pres_it_id || Date.now() + Math.random(),
      category_id: i.category_id,
      med_id: i.med_id,
      supplier_id: i.supplier_id,
      type: i.type,
      dosage: i.dosage,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
      remarks: i.remarks
    }));
    setPrescriptionItems(items);

    if (items.length > 0) {
      const firstItem = items[0];
      setFormItem({
        category_id: firstItem.category_id,
        med_id: firstItem.med_id,
        supplier_id: firstItem.supplier_id,
        type: firstItem.type,
        dosage: firstItem.dosage,
        quantity: firstItem.quantity,
        unit_price: firstItem.unit_price,
        total_price: firstItem.total_price,
        remarks: firstItem.remarks
      });
    }
  };

  const handleDeletePrescription = async (id) => {
    if (!confirm("آیا می‌خواهید این نسخه حذف شود؟")) return;
    try {
      await api.delete(`/prescriptions/${id}`);
      toast.success("نسخه حذف شد");
      loadPrescriptions();
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      toast.error("خطا در حذف نسخه");
    }
  };

  const handlePrintPrescription = (pres) => {
    const patient = patients.find(x => Number(x.reg_id) === Number(pres.patient_id));
    const doctor = doctors.find(x => Number(x.reg_id) === Number(pres.doc_id));
    const items = (pres.items ?? []).map(item => ({
      ...item,
      category_name: categories.find(c => Number(c.category_id) === Number(item.category_id))?.category_name || "-",
      med_name: medications.find(m => Number(m.med_id) === Number(item.med_id))?.gen_name || "-",
      supplier_name: suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.full_name ||
                    suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.name || "-",
    }));

    const printData = {
      pres_num: pres.pres_num || pres.pres_id || "ندارد",
      date: pres.pres_date || new Date().toLocaleDateString("fa-IR"),
      patient: patient?.full_name || patient?.name || "-",
      doctor: doctor?.full_name || doctor?.name || "-",
      age: patient?.age || "-",
      gender: patient?.gender || "-",
      blood_group: patient?.blood_group || "-",
      tazkira_number: patient?.tazkira_number || "-",
      diagnosis: patient?.diagnosis || "-",
      weight: patient?.weight || "-",
      blood_pressure: patient?.blood_pressure || "-",
      temperature: patient?.temperature || "-",
      oxygen: patient?.oxygen || "-",
      total: pres.total_amount || 0,
      discount: pres.discount || 0,
      net: pres.net_amount || 0,
      items: items
    };

    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  const preparePrintData = () => {
    if (!prescriptionItems.length) {
      toast.error("آیتمی برای چاپ وجود ندارد");
      return null;
    }

    return {
      pres_num: patientInfo.pres_num || "ندارد",
      date: prescriptionDate || new Date().toLocaleDateString("fa-IR"),
      patient: patients.find(p => p.reg_id == selectedPatientId)?.full_name || patients.find(p => p.reg_id == selectedPatientId)?.name || "-",
      doctor: doctors.find(d => d.reg_id == selectedDoctorId)?.full_name || doctors.find(d => d.reg_id == selectedDoctorId)?.name || "-",
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
      discount,
      net: netAmount,
      items: prescriptionItems.map(item => ({
        ...item,
        category_name: categories.find(c => Number(c.category_id) === Number(item.category_id))?.category_name || "-",
        med_name: medications.find(m => Number(m.med_id) === Number(item.med_id))?.gen_name || "-",
        supplier_name: suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.full_name ||
                      suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.name || "-",
      }))
    };
  };

  const handlePrintClick = () => {
    const printData = preparePrintData();
    if (printData) {
      setPrescriptionPrintData(printData);
      setIsPrintReady(true);
    }
  };

  // ========== کامپوننت برگه‌ی نسخه (با منطق مشابه فایل اصلی) ==========
  const PrescriptionSheet = ({ items, setItems, localDiscount, setLocalDiscount }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMed, setSelectedMed] = useState(null);
    const [newItem, setNewItem] = useState({
      dosage: "",
      quantity: "",
      unit_price: 0,
      supplier_id: "",
      remarks: "",
    });

    const filteredMeds = medications.filter(m =>
      m.gen_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSuppliersForSheet = selectedMed
      ? suppliers.filter(s => s.reg_id == selectedMed.supplier_id)
      : [];

    const handleSelectMed = (med) => {
      setSelectedMed(med);
      setNewItem({
        dosage: "",
        quantity: "",
        unit_price: med.unit_price,
        supplier_id: med.supplier_id,
        remarks: "",
      });
      setSearchTerm(med.gen_name);
    };

    useEffect(() => {
      setNewItem(prev => ({
        ...prev,
        total_price: (Number(prev.quantity) || 0) * (Number(prev.unit_price) || 0)
      }));
    }, [newItem.quantity, newItem.unit_price]);

    const addItem = () => {
      if (!selectedMed || !newItem.quantity || newItem.quantity <= 0 || !newItem.unit_price || !newItem.supplier_id) {
        toast.error("لطفاً دارو، تعداد، قیمت واحد و حمایت‌کننده را انتخاب کنید");
        return;
      }
      const item = {
        id: Date.now(),
        category_id: selectedMed.category_id,
        med_id: selectedMed.med_id,
        supplier_id: newItem.supplier_id,
        type: selectedMed.type || "",
        dosage: newItem.dosage,
        quantity: Number(newItem.quantity),
        unit_price: newItem.unit_price,
        total_price: Number(newItem.quantity) * newItem.unit_price,
        remarks: newItem.remarks,
      };
      setItems([...items, item]);
      setSelectedMed(null);
      setSearchTerm("");
      setNewItem({ dosage: "", quantity: "", unit_price: 0, supplier_id: "", remarks: "" });
    };

    const removeItem = (id) => {
      setItems(items.filter(i => i.id !== id));
    };

    const totalAmount = items.reduce((sum, i) => sum + i.total_price, 0);
    const netAmount = totalAmount - localDiscount;

    const handleSave = () => {
      saveFinalFromSheet(items, localDiscount);
    };

    const handlePrintSheet = () => {
      const printData = {
        pres_num: tempPrescriptionData?.pres_num || "ندارد",
        date: tempPrescriptionData?.pres_date || new Date().toLocaleDateString("fa-IR"),
        patient: tempPrescriptionData?.patient?.full_name || "-",
        doctor: tempPrescriptionData?.doctor?.full_name || "-",
        age: tempPrescriptionData?.patient_age || "-",
        gender: tempPrescriptionData?.patient_gender || "-",
        blood_group: tempPrescriptionData?.patient_blood_group || "-",
        tazkira_number: tempPrescriptionData?.tazkira_number || "-",
        diagnosis: tempPrescriptionData?.diagnosis || "-",
        weight: tempPrescriptionData?.weight || "-",
        blood_pressure: tempPrescriptionData?.blood_pressure || "-",
        temperature: tempPrescriptionData?.temperature || "-",
        oxygen: tempPrescriptionData?.oxygen || "-",
        total: totalAmount,
        discount: localDiscount,
        net: netAmount,
        items: items.map(item => ({
          ...item,
          category_name: categories.find(c => Number(c.category_id) === Number(item.category_id))?.category_name || "-",
          med_name: medications.find(m => Number(m.med_id) === Number(item.med_id))?.gen_name || "-",
          supplier_name: suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id))?.full_name || "-",
        })),
      };
      if (printData.items.length > 0) {
        setPrescriptionPrintData(printData);
        setIsPrintReady(true);
      } else {
        toast.error("آیتمی برای چاپ وجود ندارد");
      }
    };

    const styles = {
      topHeader: {
        width: "800px",
        margin: "auto",
        background: "green",
        color: "#fff",
        padding: "10px",
        textAlign: "center",
        fontWeight: "bold",
        borderRadius: "8px 8px 0 0",
      },
      prescription: {
        width: "800px",
        margin: "auto",
        background: "#fff",
        padding: "20px",
        borderRadius: "0 0 8px 8px",
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #ccc",
        paddingBottom: "10px",
      },
      doctor: { fontSize: "14px" },
      patientInfo: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "15px",
        fontSize: "14px",
      },
      patientInfoDiv: { width: "48%" },
      rxSection: { display: "flex", marginTop: "20px" },
      leftBox: {
        width: "35%",
        borderRight: "1px solid #ccc",
        paddingRight: "10px",
      },
      label: { display: "block", marginTop: "10px", fontSize: "13px", fontWeight: "bold" },
      input: { width: "100%", padding: "5px", marginTop: "5px", border: "1px solid #ccc", borderRadius: "4px" },
      rightBox: { width: "65%", paddingLeft: "10px" },
      rxTitle: { fontSize: "30px", fontWeight: "bold" },
      searchBox: { marginTop: "10px" },
      searchInput: { width: "100%", padding: "8px", border: "2px solid green", borderRadius: "5px" },
      medList: { marginTop: "10px", maxHeight: "200px", overflowY: "auto", border: "1px solid #ccc" },
      medItem: { padding: "8px", borderBottom: "1px solid #eee", cursor: "pointer" },
      addForm: { marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
      addFormInput: { padding: "6px", border: "1px solid #ccc", borderRadius: "4px", flex: "1 1 auto" },
      addButton: { padding: "6px 12px", background: "green", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
      itemsTable: { width: "100%", marginTop: "20px", borderCollapse: "collapse" },
      th: { border: "1px solid #ddd", padding: "8px", textAlign: "center", background: "#f2f2f2" },
      td: { border: "1px solid #ddd", padding: "8px", textAlign: "center" },
      deleteButton: { background: "red", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" },
      footer: { marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px", display: "flex", justifyContent: "space-between" },
      totals: { marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "20px" },
      actions: { marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center" },
    };

    return (
      <>
        <style>{`
          .med-item:hover { background: #f0f0f0; }
        `}</style>

        <div style={styles.topHeader}>بیمارستان شفا‌‌‌‌ی الفلاح</div>

        <div style={styles.prescription}>
          <div style={styles.header}>
            <div>
              <h2>دکتر {tempPrescriptionData?.doctor?.full_name || "--------"}</h2>
              <div style={styles.doctor}>متخصص جراحی ارتوپدی</div>
            </div>
            <div>
              <strong>بیمارستان تخصصی</strong>
            </div>
          </div>

          <div style={styles.patientInfo}>
            <div style={styles.patientInfoDiv}>
              <p><strong>نام مریض:</strong> {tempPrescriptionData?.patient?.full_name || "__________________"}</p>
              <p><strong>سن:</strong> {tempPrescriptionData?.patient_age || "______"}</p>
              <p><strong>جنسیت:</strong> {tempPrescriptionData?.patient_gender || "______"}</p>
            </div>
            <div style={styles.patientInfoDiv}>
              <p><strong>تاریخ:</strong> {tempPrescriptionData?.pres_date || "______"}</p>
              <p><strong>شماره نسخه:</strong> {tempPrescriptionData?.pres_num || "______"}</p>
            </div>
          </div>

          <div style={styles.rxSection}>
            <div style={styles.leftBox}>
              <label style={styles.label}>تشخیص</label>
              <input style={styles.input} type="text" value={tempPrescriptionData?.diagnosis || ""} readOnly />

              <label style={styles.label}>فشار خون</label>
              <input style={styles.input} type="text" value={tempPrescriptionData?.blood_pressure || ""} readOnly />

              <label style={styles.label}>وزن (کیلوگرم)</label>
              <input style={styles.input} type="text" value={tempPrescriptionData?.weight || ""} readOnly />

              <label style={styles.label}>حرارت (درجه سانتی‌گراد)</label>
              <input style={styles.input} type="text" value={tempPrescriptionData?.temperature || ""} readOnly />

              <label style={styles.label}>اکسیژن (%)</label>
              <input style={styles.input} type="text" value={tempPrescriptionData?.oxygen || ""} readOnly />
            </div>

            <div style={styles.rightBox}>
              <div style={styles.rxTitle}>Rx</div>

              <div style={styles.searchBox}>
                <input
                  style={styles.searchInput}
                  type="text"
                  placeholder="جستجوی دارو..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm && filteredMeds.length > 0 && (
                <div style={styles.medList}>
                  {filteredMeds.slice(0, 5).map(med => (
                    <div key={med.med_id} className="med-item" style={styles.medItem} onClick={() => handleSelectMed(med)}>
                      {med.gen_name}
                    </div>
                  ))}
                </div>
              )}

              {selectedMed && (
                <div style={styles.addForm}>
                  <input
                    style={styles.addFormInput}
                    placeholder="مقدار مصرف (دوز)"
                    value={newItem.dosage}
                    onChange={e => setNewItem({ ...newItem, dosage: e.target.value })}
                  />
                  <input
                    style={styles.addFormInput}
                    type="number"
                    placeholder="تعداد"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                  <input
                    style={styles.addFormInput}
                    type="number"
                    placeholder="قیمت واحد"
                    value={newItem.unit_price}
                    onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                  />
                  <select
                    style={styles.addFormInput}
                    value={newItem.supplier_id}
                    onChange={e => setNewItem({ ...newItem, supplier_id: e.target.value })}
                  >
                    <option value="">حمایت‌کننده</option>
                    {filteredSuppliersForSheet.map(s => (
                      <option key={s.reg_id} value={s.reg_id}>
                        {s.full_name ?? s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    style={styles.addFormInput}
                    placeholder="ملاحظات"
                    value={newItem.remarks}
                    onChange={e => setNewItem({ ...newItem, remarks: e.target.value })}
                  />
                  <button style={styles.addButton} onClick={addItem}>
                    + افزودن
                  </button>
                </div>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <table style={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={styles.th}>شماره</th>
                  <th style={styles.th}>کتگوری</th>
                  <th style={styles.th}>دوا</th>
                  <th style={styles.th}>حمایت کننده</th>
                  <th style={styles.th}>نوع دوا</th>
                  <th style={styles.th}>مقدار مصرف</th>
                  <th style={styles.th}>تعداد</th>
                  <th style={styles.th}>قیمت واحد</th>
                  <th style={styles.th}>جمع</th>
                  <th style={styles.th}>ملاحظات</th>
                  <th style={styles.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const med = medications.find(m => m.med_id == item.med_id);
                  const cat = categories.find(c => c.category_id == item.category_id);
                    const sup = suppliers.find(s => s.reg_id == item.supplier_id);
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>{cat?.category_name || "-"}</td>
                      <td style={styles.td}>{med?.gen_name || "-"}</td>
                      <td style={styles.td}>{sup?.full_name || sup?.name || "-"}</td>
                      <td style={styles.td}>{item.type}</td>
                      <td style={styles.td}>{item.dosage || "-"}</td>
                      <td style={styles.td}>{item.quantity}</td>
                      <td style={styles.td}>{Number(item.unit_price).toLocaleString()}</td>
                      <td style={styles.td}>{Number(item.total_price).toLocaleString()}</td>

                      <td style={styles.td}>{item.remarks || "-"}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteButton} onClick={() => removeItem(item.id)}>
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div style={styles.totals}>
            <div>مجموع: {totalAmount.toLocaleString()} افغانی</div>
            <div>
              تخفیف: <input type="number" value={localDiscount} onChange={e => setLocalDiscount(Number(e.target.value))} />
            </div>
            <div>خالص: {netAmount.toLocaleString()} افغانی</div>
          </div>

          <div style={styles.footer}>
            <div>امضای پزشک</div>
            <div>مهر بیمارستان</div>
          </div>

          <div style={styles.actions}>
            <button className="save-btn" onClick={handleSave} style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "5px", border: "none", cursor: "pointer" }}>
              ذخیره نسخه
            </button>
            <button className="print-btn" onClick={handlePrintSheet} style={{ background: "#4CAF50", color: "white", padding: "8px 16px", borderRadius: "5px", border: "none", cursor: "pointer" }}>
              پرینت
            </button>
            <button className="cancel-btn" onClick={handleCancelEdit} style={{ background: "#6c757d", color: "white", padding: "8px 16px", borderRadius: "5px", border: "none", cursor: "pointer" }}>
              انصراف
            </button>
          </div>
        </div>
      </>
    );
  };

  // ========== رندر اصلی ==========
  // ========== رندر اصلی ==========
return (
  <MainLayoutjur>
    {!showPrescriptionSheet ? (
      <>
        {/* ===== فرم اطلاعات عمومی ===== */}
        <div className="form-container">
          <h1>{editingId ? "ویرایش نسخه" : "ثبت نسخه جدید"}</h1>

          <div className="form-grid">
            <div>
              <label>شماره نسخه</label>
              <input
                value={patientInfo.pres_num}
                onChange={e =>
                  setPatientInfo({ ...patientInfo, pres_num: e.target.value })
                }
              />
            </div>

            <div>
              <label>مریض</label>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
              >
                <option value="">انتخاب مریض</option>
                {patients.map(p => (
                  <option key={p.reg_id} value={p.reg_id}>
                    {p.full_name ?? p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>سن</label>
              <input value={patientInfo.age} readOnly />
            </div>

            <div>
              <label>جنسیت</label>
              <input value={patientInfo.gender} readOnly />
            </div>

            <div>
              <label>شماره تماس</label>
              <input value={patientInfo.phone} readOnly />
            </div>

            <div>
              <label>آی‌دی مریض</label>
              <input value={patientInfo.reg_id} readOnly />
            </div>

            <div>
              <label>شماره تذکره</label>
              <input value={patientInfo.tazkira_number} readOnly />
            </div>

            <div>
              <label>گروه خون</label>
              <input value={patientInfo.blood_group} readOnly />
            </div>

            <div>
              <label>تشخیص</label>
              <input value={patientInfo.diagnosis} readOnly />
            </div>

            <div>
              <label>وزن (کیلوگرم)</label>
              <input value={patientInfo.weight} readOnly />
            </div>

            <div>
              <label>فشار خون</label>
              <input value={patientInfo.blood_pressure} readOnly />
            </div>

            <div>
              <label>حرارت (درجه سانتی‌گراد)</label>
              <input value={patientInfo.temperature} readOnly />
            </div>

            <div>
              <label>اکسیژن (%)</label>
              <input value={patientInfo.oxygen} readOnly />
            </div>

            <div>
              <label>داکتر</label>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
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
              />
            </div>

            <div>
              <label>مجموع</label>
              <input value={totalAmount} readOnly />
            </div>

            <div>
              <label>تخفیف</label>
              <input
                value={discount}
                onChange={e => setDiscount(+e.target.value)}
              />
            </div>

            <div>
              <label>خالص</label>
              <input value={netAmount} readOnly />
            </div>
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            {!editingId && (
              <button
                className="edit"
                onClick={saveHeaderAndShowSheet}
                style={{ backgroundColor: "#2563eb" }}
              >
                افزودن دوا
              </button>
            )}
            <button
              className="edit"
              onClick={handleCancelEdit}
              style={{ backgroundColor: "#6c757d" }}
            >
              انصراف
            </button>
          </div>
        </div>

        {/* ===== فرم افزودن آیتم و جدول آیتم‌ها (فقط در حالت ویرایش) ===== */}
        {editingId && (
          <>
            <div className="form-container">
              <h3>افزودن آیتم</h3>
              <div className="form-grid">
                <div>
                  <label>کتگوری</label>
                  <select
                    value={formItem.category_id}
                    onChange={e => handleChange("category_id", e.target.value)}
                    onKeyDown={handleKeyDown}
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
                  <label>دوا</label>
                  <select
                    value={formItem.med_id}
                    onChange={e => handleChange("med_id", e.target.value)}
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
                  >
                    <option value="">انتخاب</option>
                    {filteredSuppliers.map(s => (
                      <option key={s.reg_id} value={s.reg_id}>
                        {s.full_name ?? s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>نوع دوا</label>
                  <input value={formItem.type} readOnly />
                </div>

                <div>
                  <label>مقدار مصرف</label>
                  <input
                    value={formItem.dosage}
                    onChange={e => handleChange("dosage", e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div>
                  <label>تعداد</label>
                  <input
                    type="number"
                    value={formItem.quantity}
                    onChange={e => handleChange("quantity", e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div>
                  <label>قیمت واحد</label>
                  <input
                    type="number"
                    value={formItem.unit_price}
                    onChange={e => handleChange("unit_price", e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div>
                  <label>قیمت مجموعی</label>
                  <input value={formItem.total_price} readOnly />
                </div>

                <div>
                  <label>ملاحظات</label>
                  <input
                    value={formItem.remarks}
                    onChange={e => handleChange("remarks", e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </div>

            {prescriptionItems.length > 0 && (
              <div className="table-container" style={{ marginTop: "10px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>ردیف</th>
                      <th>کتگوری</th>
                      <th>دوا</th>
                      <th>حمایت‌کننده</th>
                      <th>نوع دوا</th>
                      <th>مقدار مصرف</th>
                      <th>تعداد</th>
                      <th>قیمت واحد</th>
                      <th>قیمت مجموعی</th>
                      <th>ملاحظات</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionItems.map((item, idx) => {
                      const med = medications.find(m => Number(m.med_id) === Number(item.med_id));
                      const cat = categories.find(c => Number(c.category_id) === Number(item.category_id));
                      const sup = suppliers.find(s => Number(s.reg_id) === Number(item.supplier_id));
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
                          <td>{item.remarks || "-"}</td>
                          <td>
                            <button className="delete" onClick={() => handleRemoveItem(item.id)}>
                              حذف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
              <button className="edit" onClick={handleSavePrescription} style={{ backgroundColor: "#ffc107" }}>
                ثبت تصحیح نسخه
              </button>
              <button className="edit" onClick={handlePrintClick} style={{ backgroundColor: "#4CAF50" }}>
                پرنت نسخه
              </button>
            </div>
          </>
        )}

        {/* ===== لیست نسخه‌ها ===== */}
        {prescriptionsList.length > 0 && (
          <div className="table-container" style={{ marginTop: "20px" }}>
            <h3>نسخه های ثبت شده</h3>
            <table>
              <thead>
                <tr>
                  <th>شماره</th>
                  <th>شماره نسخه</th>
                  <th>مریض</th>
                  <th>داکتر</th>
                  <th>تاریخ</th>
                  <th>مجموع</th>
                  <th>تخفیف</th>
                  <th>خالص</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {currentPrescriptions.map((p, index) => {
                  const patient = patients.find(x => Number(x.reg_id) === Number(p.patient_id));
                  const doctor = doctors.find(x => Number(x.reg_id) === Number(p.doc_id));
                  return (
                    <tr key={p.pres_id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{p.pres_num || p.pres_id || "-"}</td>
                      <td>{patient?.full_name || patient?.name || "-"}</td>
                      <td>{doctor?.full_name || doctor?.name || "-"}</td>
                      <td>{p.pres_date}</td>
                      <td>{Number(p.total_amount).toLocaleString()}</td>
                      <td>{Number(p.discount).toLocaleString()}</td>
                      <td>{Number(p.net_amount).toLocaleString()}</td>
                      <td>
                        <button 
                          style={{ 
                            backgroundColor: "#dcc215", 
                            color: "#000",
                            padding: "5px 12px",
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold",
                            marginLeft: "5px"
                          }}
                          onClick={() => handleEditPrescription(p)}
                        >
                          تصحیح
                        </button>
                        <button 
                          style={{ 
                            backgroundColor: "#dc2626", 
                            color: "#fff",
                            padding: "5px 12px",
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold",
                            marginLeft: "5px"
                          }}
                          onClick={() => handleDeletePrescription(p.pres_id)}
                        >
                          حذف
                        </button>
                        <button  
                          style={{ 
                            backgroundColor: "#0da62f", 
                            color: "#fff",
                            padding: "5px 12px",
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}
                          onClick={() => handlePrintPrescription(p)}
                        >
                          پرنت
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
                  style={{ margin: "0 5px" }}
                >
                  قبلی
                </button>
                <span style={{ margin: "0 10px" }}>
                  صفحه {currentPage} از {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ margin: "0 5px" }}
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        )}
      </>
    ) : (
      <PrescriptionSheet 
        items={sheetItems} 
        setItems={setSheetItems} 
        localDiscount={sheetLocalDiscount} 
        setLocalDiscount={setSheetLocalDiscount} 
      />
    )}

    {/* ===== کامپوننت پرنت - همیشه در دسترس ===== */}
    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
      {prescriptionPrintData && (
        <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />
      )}
    </div>
  </MainLayoutjur>
);
}