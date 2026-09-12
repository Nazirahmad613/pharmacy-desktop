import { useState, useEffect, useRef, Fragment } from "react";
import MainLayoutjur from "../../../../../components/Mainlayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../../PrescriptionPrint";

// ============================================================
// ✅ نگاشت وضعیت‌ها به برچسب و رنگ
// ============================================================
const STATUS_MAP = {
  pending:             { label: "در انتظار ارسال",     color: "#6b7280", bg: "#f3f4f6" },
  sent_to_pharmacy:    { label: "ارسال به دواخانه",    color: "#0369a1", bg: "#e0f2fe" },
  pharmacy_registered: { label: "ثبت شده در دواخانه",  color: "#6d28d9", bg: "#ede9fe" },
  paid:                { label: "پول اخذ شده",         color: "#047857", bg: "#d1fae5" },
  cancelled:           { label: "لغو شده",             color: "#b91c1c", bg: "#fee2e2" },
};

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
  const { api: authApi, user } = useAuth();
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
    custom_type: "",
    custom_supplier_name: ""
  };

  // اطلاعات مریض
  const [patientData, setPatientData] = useState(null);
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");

  // لیست‌ها
  const [medications, setMedications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // آیتم‌های نسخه
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [formItem, setFormItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);

  // ✅ لیست نسخه‌های ثبت‌شده
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // ✅ نسخه‌هایی که ردیف داروهایشان باز است
  const [expandedRows, setExpandedRows] = useState({});

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

  // ========== ✅ تابع کمکی: دریافت patient_id از سرور ==========
  const fetchPatientIdFromServer = async (regIdValue) => {
    if (!regIdValue) return null;
    try {
      const res = await api.get(`/registrations/${regIdValue}`);
      const data = res.data?.data ?? res.data;
      return (
        data?.patient_id ||
        data?.patient?.id ||
        data?.patient?.patient_id ||
        data?.registration?.patient_id ||
        null
      );
    } catch (err) {
      console.error("❌ خطا در دریافت patient_id از سرور:", err);
      return null;
    }
  };

  // ============================================================
  // ✅ تابع مرکزی ساخت اطلاعات چاپ
  // ============================================================
  const buildPrintData = ({ prescription, items }) => {
    // مقادیر پیش‌فرض از patientData (فرم فعلی)
    const pd = patientData || {};

    // اگر نسخه ثبت‌شده داریم، از snapshot خودش می‌خوانیم
    const p = prescription || {};

    // ✅ تابع کمکی برای انتخاب اولین مقدار غیرخالی
    const pick = (...vals) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && v !== "" && v !== "-") return v;
      }
      return "-";
    };

    return {
      // شماره نسخه و تاریخ
      pres_num: p.pres_num || p.pres_id || prescriptionNumber || "-",
      date: p.pres_date || prescriptionDate || "-",

      // اطلاعات هویتی مریض — از نسخه (snapshot) و fallback به patientData
      patient_name: pick(p.patient_name, pd.full_name),
      patient_age: pick(p.patient_age, pd.age),
      patient_gender: pick(p.patient_gender, pd.gender),
      patient_phone: pick(p.patient_phone, pd.phone),
      tazkira_number: pick(p.tazkira_number, pd.tazkira_number),
      blood_group: pick(p.patient_blood_group, pd.blood_group),

      // اطلاعات بالینی
      diagnosis: pick(p.diagnosis, pd.diagnosis),
      weight: pick(p.weight, pd.weight),
      blood_pressure: pick(p.blood_pressure, pd.blood_pressure),
      temperature: pick(p.temperature, pd.temperature),
      oxygen: pick(p.oxygen, pd.oxygen),

      // داکتر
      doctor_name: pick(p.doc_name, user?.name, user?.full_name, "-"),

      // اقلام نسخه
      items: (items || []).map(it => ({
        med_name: it.med_name || "-",
        med_type: it.med_type || it.type || "-",
        supplier_name: it.supplier_name || "-",
        dosage: it.dosage || "-",
        quantity: it.quantity ?? "-",
        remarks: it.remarks || "-",
        is_custom: !!it.is_custom,
        category_name: it.category_name || "-",
      }))
    };
  };

  // ========== مقداردهی اولیه ==========
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const effectiveRegId = regId || registration?.reg_id;
      const rawStored = sessionStorage.getItem("selectedPatient");
      let storedPatient = null;
      if (rawStored) {
        try { storedPatient = JSON.parse(rawStored); } catch (e) {}
      }

      if (registration) {
        const patient = registration.patient || registration;
        let resolvedPatientId =
          patient?.patient_id ||
          registration?.patient_id ||
          storedPatient?.patient_id ||
          storedPatient?.id ||
          null;

        if (!resolvedPatientId && effectiveRegId) {
          resolvedPatientId = await fetchPatientIdFromServer(effectiveRegId);
        }

        setPatientData({
          reg_id: effectiveRegId,
          patient_id: resolvedPatientId,
          full_name:
            `${patient?.first_name || ""} ${patient?.last_name || ""}`.trim() ||
            patient?.full_name || patient?.name ||
            storedPatient?.full_name || "نامشخص",
          age: patient?.age || registration.age || storedPatient?.age || "-",
          gender:
            patient?.gender === "male" ? "مرد"
            : patient?.gender === "female" ? "زن"
            : patient?.gender || storedPatient?.gender || "-",
          phone: patient?.phone || patient?.mobile || registration.phone || storedPatient?.phone || "-",
          tazkira_number:
            patient?.national_id || patient?.tazkira_number ||
            registration.tazkira_number || storedPatient?.tazkira_number || "-",
          blood_group:
            patient?.blood_group || registration.blood_group ||
            storedPatient?.blood_group || "-",
          diagnosis: registration.diagnosis || patient?.diagnosis || storedPatient?.diagnosis || "-",
          weight: registration.weight ?? patient?.weight ?? storedPatient?.weight ?? null,
          blood_pressure:
            registration.blood_pressure || patient?.blood_pressure ||
            storedPatient?.blood_pressure || "-",
          temperature: registration.temperature ?? patient?.temperature ?? storedPatient?.temperature ?? null,
          oxygen: registration.oxygen ?? patient?.oxygen ?? storedPatient?.oxygen ?? null
        });
      } else if (storedPatient) {
        const regIdForFetch = storedPatient.reg_id || storedPatient.id || effectiveRegId;
        let resolvedPatientId = storedPatient.patient_id || storedPatient.id || null;
        if (!resolvedPatientId && regIdForFetch) {
          resolvedPatientId = await fetchPatientIdFromServer(regIdForFetch);
        }
        setPatientData({
          ...storedPatient,
          reg_id: regIdForFetch,
          patient_id: resolvedPatientId,
          full_name: storedPatient.full_name || storedPatient.name || "نامشخص",
          age: storedPatient.age || "-",
          gender:
            storedPatient.gender === "male" ? "مرد"
            : storedPatient.gender === "female" ? "زن"
            : storedPatient.gender || "-"
        });
      }

      setPrescriptionDate(new Date().toISOString().slice(0, 10));

      await Promise.all([loadMedications(), loadCategories()]);
      await loadPrescriptions();

      setLoading(false);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ========== ✅ بارگذاری لیست نسخه‌های همین مریض/مراجعه ==========
  const loadPrescriptions = async () => {
    setLoadingList(true);
    try {
      const res = await api.get("/prescriptions");
      const all = res.data?.data ?? res.data ?? [];

      const effectiveRegId = regId || registration?.reg_id;
      const filtered = effectiveRegId
        ? all.filter(p => Number(p.reg_id) === Number(effectiveRegId))
        : all;

      setPrescriptions(filtered);
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      setPrescriptions([]);
    } finally {
      setLoadingList(false);
    }
  };

  // ========== دریافت حمایت‌کننده‌ها ==========
  const loadSuppliersForMedication = async (medId) => {
    if (!medId) { setSuppliers([]); return; }
    setLoadingSuppliers(true);
    setSuppliers([]);
    try {
      const res = await api.get(`/prescriptions/medication/${medId}/suppliers`);
      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else if (res.data?.data && typeof res.data.data === "object") list = res.data.data;
      setSuppliers(list);
      if (list.length === 0) toast.warning("⚠️ هیچ حمایت‌کننده‌ای برای این دارو یافت نشد");
    } catch (error) {
      console.error("Error loading suppliers:", error);
      setSuppliers([]);
      toast.error("❌ خطا در دریافت حمایت‌کننده‌ها");
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const filteredMedications = medications.filter(
    (m) => Number(m.category_id) === Number(formItem.category_id)
  );

  useEffect(() => {
    if (formItem.med_id && !formItem.is_custom) {
      loadSuppliersForMedication(formItem.med_id);
    } else {
      setSuppliers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formItem.med_id, formItem.is_custom]);

  // ========== بررسی موجودی ==========
  useEffect(() => {
    const checkStockAvailability = async () => {
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
            totalStock,
            message: isAvailable
              ? `✅ موجودی کافی است (موجودی انبار: ${totalStock})`
              : `❌ موجودی کافی نیست! موجودی انبار: ${totalStock} - درخواستی: ${formItem.quantity}`,
            checking: false
          });
        }
      } catch (error) {
        setStockAvailability({
          available: false, totalStock: 0,
          message: "⚠️ خطا در بررسی موجودی", checking: false
        });
      }
    };

    const timer = setTimeout(() => checkStockAvailability(), 500);
    return () => clearTimeout(timer);
  }, [formItem.med_id, formItem.supplier_id, formItem.quantity, formItem.type, formItem.is_custom, api]);

  // ========== مدیریت تغییر ==========
  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };
    if (field === "category_id") {
      updated.med_id = ""; updated.supplier_id = ""; updated.type = "";
      setSuppliers([]);
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

  // ========== افزودن آیتم ==========
  const handleAddItem = () => {
    if (formItem.is_custom) {
      if (!formItem.custom_name.trim()) { toast.error("❌ لطفاً نام دارو را وارد کنید"); return; }
      if (!formItem.category_id) { toast.error("❌ لطفاً کتگوری را انتخاب کنید"); return; }
      if (!formItem.custom_supplier_name.trim()) { toast.error("❌ لطفاً نام حمایت‌کننده را وارد کنید"); return; }
      if (!formItem.dosage.trim()) { toast.error("❌ لطفاً مقدار مصرف را وارد کنید"); return; }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) { toast.error("❌ لطفاً تعداد را وارد کنید"); return; }
    } else {
      if (!formItem.category_id || !formItem.med_id) { toast.error("❌ لطفاً کتگوری و دارو را انتخاب کنید"); return; }
      if (!formItem.supplier_id) { toast.error("❌ لطفاً حمایت‌کننده را انتخاب کنید"); return; }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) { toast.error("❌ لطفاً تعداد را وارد کنید"); return; }
      if (!formItem.dosage.trim()) { toast.error("❌ لطفاً مقدار مصرف را وارد کنید"); return; }
      if (!stockAvailability.available) {
        toast.error(`❌ موجودی کافی نیست! ${stockAvailability.message}`);
        return;
      }
    }

    const med = medications.find(m => Number(m.med_id) === Number(formItem.med_id));
    const cat = categories.find(c => Number(c.category_id) === Number(formItem.category_id));

    let supplierName = "-";
    if (formItem.is_custom) {
      supplierName = formItem.custom_supplier_name.trim() || "-";
    } else {
      const sup = suppliers.find(s => Number(s.reg_id) === Number(formItem.supplier_id));
      supplierName = sup?.full_name ?? sup?.name ?? sup?.reg_name ?? "-";
    }

    const newItem = {
      ...formItem,
      id: Date.now() + Math.random(),
      med_name: formItem.is_custom ? formItem.custom_name.trim() : med?.gen_name ?? "-",
      med_type: formItem.is_custom ? formItem.custom_type || "سایر" : med?.type ?? "-",
      category_name: cat?.category_name ?? "-",
      supplier_name: supplierName
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setFormItem({ ...emptyItem, category_id: formItem.category_id });
    setSuppliers([]);
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    toast.success("✅ دارو با موفقیت اضافه شد");
  };

  const handleRemoveItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAddItem();
  };

  // ========== ✅ شروع ویرایش یک نسخه ثبت‌شده ==========
  const handleEditPrescription = async (pres) => {
    try {
      const res = await api.get(`/prescriptions/${pres.pres_id}`);
      const data = res.data?.data ?? res.data;
      if (!data) { toast.error("خطا در دریافت نسخه"); return; }

      // ✅ اطلاعات هویتی مریض را هم از snapshot نسخه بروز می‌کنیم
      setPatientData(prev => ({
        ...prev,
        full_name: data.patient_name ?? prev?.full_name,
        age: data.patient_age ?? prev?.age,
        gender: data.patient_gender ?? prev?.gender,
        phone: data.patient_phone ?? prev?.phone,
        tazkira_number: data.tazkira_number ?? prev?.tazkira_number,
        blood_group: data.patient_blood_group ?? prev?.blood_group,
        diagnosis: data.diagnosis ?? prev?.diagnosis,
        weight: data.weight ?? prev?.weight,
        blood_pressure: data.blood_pressure ?? prev?.blood_pressure,
        temperature: data.temperature ?? prev?.temperature,
        oxygen: data.oxygen ?? prev?.oxygen,
      }));

      setPrescriptionDate(data.pres_date ? data.pres_date.slice(0, 10) : prescriptionDate);
      setPrescriptionNumber(String(data.pres_id));
      setEditingId(data.pres_id);

      const items = (data.items ?? []).map((it, i) => ({
        id: Date.now() + i + Math.random(),
        category_id: it.category_id ?? "",
        med_id: it.med_id ?? "",
        supplier_id: it.supplier_id ?? "",
        is_custom: !!it.is_custom,
        custom_name: it.is_custom ? (it.med_name ?? "") : "",
        custom_type: it.is_custom ? (it.type ?? "") : "",
        custom_supplier_name: it.is_custom ? (it.supplier_name ?? "") : "",
        med_name: it.med_name ?? "-",
        med_type: it.type ?? "-",
        category_name: it.category_name ?? "-",
        supplier_name: it.supplier_name ?? "-",
        dosage: it.dosage ?? "",
        quantity: it.quantity ?? "",
        remarks: it.remarks ?? "",
      }));

      setPrescriptionItems(items);
      toast.info(`✏️ نسخه شماره ${data.pres_id} برای ویرایش بارگذاری شد`);
    } catch (error) {
      console.error("Error loading prescription for edit:", error);
      toast.error("❌ خطا در بارگذاری نسخه برای ویرایش");
    }
  };

  // ========== ✅ حذف نسخه ==========
  const handleDeletePrescription = async (presId) => {
    if (!window.confirm(`آیا از حذف نسخه شماره ${presId} مطمئن هستید؟`)) return;
    try {
      await api.delete(`/prescriptions/${presId}`);
      toast.success(`🗑️ نسخه شماره ${presId} حذف شد`);
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting prescription:", error);
      toast.error("❌ خطا در حذف نسخه");
    }
  };

  // ========== ✅ چاپ نسخه ثبت‌شده (با استفاده از buildPrintData) ==========
  const handlePrintExisting = (pres) => {
    const printData = buildPrintData({
      prescription: pres,
      items: pres.items ?? []
    });
    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  // ========== ✅ تغییر وضعیت نسخه ==========
  const handleChangeStatus = async (presId, newStatus) => {
    try {
      await api.patch(`/prescriptions/${presId}/status`, { status: newStatus });
      toast.success("✅ وضعیت بروزرسانی شد");
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error changing status:", error);
      const msg = error?.response?.data?.message || "خطا در تغییر وضعیت";
      toast.error(`❌ ${msg}`);
    }
  };

  // ========== ✅ باز/بسته کردن ردیف داروهای یک نسخه ==========
  const toggleRowExpand = (presId) => {
    setExpandedRows(prev => ({
      ...prev,
      [presId]: !prev[presId]
    }));
  };

  // ========== ذخیره نسخه (ثبت یا ویرایش) ==========
  const handleSavePrescription = async () => {
    if (!patientData) { toast.error("❌ لطفاً یک مریض انتخاب کنید"); return; }

    let patientId = patientData.patient_id;
    const regIdValue = patientData.reg_id;

    if (!patientId && regIdValue) {
      patientId = await fetchPatientIdFromServer(regIdValue);
      if (patientId) setPatientData(prev => ({ ...prev, patient_id: patientId }));
    }
    if (!patientId) {
      toast.error("❌ شناسه اصلی مریض (patient_id) یافت نشد.");
      return;
    }
    if (!regIdValue) { toast.error("❌ شناسه مراجعه یافت نشد"); return; }
    if (prescriptionItems.length === 0) { toast.error("❌ حداقل یک دارو باید تجویز شود"); return; }

    const presDate = prescriptionDate || new Date().toISOString().slice(0, 10);

    const payload = {
      patient_id: Number(patientId),
      reg_id: Number(regIdValue),
      pres_date: presDate,
      patient_name: patientData.full_name !== "-" ? patientData.full_name : null,
      tazkira_number: patientData.tazkira_number !== "-" ? patientData.tazkira_number : null,
      patient_age: patientData.age && patientData.age !== "-" ? parseInt(patientData.age, 10) || null : null,
      patient_gender: patientData.gender !== "-" ? patientData.gender : null,
      patient_phone: patientData.phone !== "-" ? patientData.phone : null,
      patient_blood_group: patientData.blood_group !== "-" ? patientData.blood_group : null,
      diagnosis: patientData.diagnosis !== "-" ? patientData.diagnosis : null,
      weight: patientData.weight !== null && patientData.weight !== "-" ? Number(patientData.weight) : null,
      blood_pressure: patientData.blood_pressure !== "-" ? patientData.blood_pressure : null,
      temperature: patientData.temperature !== null && patientData.temperature !== "-" ? Number(patientData.temperature) : null,
      oxygen: patientData.oxygen !== null && patientData.oxygen !== "-" ? parseInt(patientData.oxygen, 10) : null,
      items: prescriptionItems.map(item => ({
        category_id: item.category_id ? Number(item.category_id) : null,
        is_custom: item.is_custom || false,
        med_id: item.is_custom ? null : Number(item.med_id),
        supplier_id: item.is_custom ? null : Number(item.supplier_id),
        med_name: item.is_custom ? (item.custom_name?.trim() || item.med_name || null) : null,
        supplier_name: item.is_custom ? (item.custom_supplier_name?.trim() || item.supplier_name || null) : null,
        type: item.med_type || null,
        dosage: item.dosage,
        quantity: Number(item.quantity),
        remarks: item.remarks || null
      }))
    };

    try {
      if (editingId) {
        await api.put(`/prescriptions/${editingId}`, payload);
        toast.success(`✅ نسخه شماره ${editingId} بروزرسانی شد`);
        setEditingId(null);
      } else {
        const res = await api.post("/prescriptions", payload);
        const created = res.data?.data ?? res.data;
        const presId = created?.pres_id;
        if (presId) {
          setPrescriptionNumber(String(presId));
          toast.success(`✅ نسخه شماره ${presId} با موفقیت ثبت شد`);
        } else {
          toast.success("✅ نسخه با موفقیت ثبت شد");
        }
      }

      setPrescriptionItems([]);
      await loadPrescriptions();

      if (onSave) { try { await onSave(payload); } catch (err) {} }
      if (onComplete) onComplete();
    } catch (error) {
      console.error("❌ خطا در ذخیره نسخه:", error);
      if (error.response) {
        const errors = error.response.data.errors;
        if (errors) {
          const msgs = Object.entries(errors).map(([f, m]) => `${f}: ${m.join(", ")}`).join("\n");
          toast.error(`خطاهای اعتبارسنجی:\n${msgs}`);
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
    onAfterPrint: () => setIsPrintReady(false)
  });

  useEffect(() => {
    if (isPrintReady) {
      setTimeout(() => handlePrint(), 100);
    }
  }, [isPrintReady, handlePrint]);

  // ========== ✅ چاپ نسخه در حال ساخت (با استفاده از buildPrintData) ==========
  const handlePrintClick = () => {
    if (!prescriptionItems.length) { toast.error("آیتمی برای چاپ وجود ندارد"); return; }
    const printData = buildPrintData({
      prescription: null,
      items: prescriptionItems
    });
    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  const handleCancel = () => {
    setPrescriptionItems([]);
    setFormItem(emptyItem);
    setSuppliers([]);
    setEditingId(null);
    setPrescriptionNumber("");
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
    if (onComplete) onComplete();
  };

  // ========== رندر ==========
  if (loading) {
    return (
      <MainLayoutjur>
        <div style={{ textAlign: "center", padding: "50px", color: "#1f2937" }}>
          <h2>⏳ در حال بارگذاری...</h2>
        </div>
      </MainLayoutjur>
    );
  }

  return (
    <MainLayoutjur>
      {/* ===== اطلاعات مریض ===== */}
      {patientData && (
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "15px 20px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "8px 15px"
            }}
          >
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>نام مریض</span>
              <span style={{ color: "#111827", fontWeight: "bold" }}>{patientData.full_name}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>شناسه مریض</span>
              <span style={{ color: patientData.patient_id ? "#059669" : "#dc2626", fontWeight: "bold" }}>
                {patientData.patient_id || "❌ یافت نشد"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>شماره مراجعه</span>
              <span style={{ color: "#b45309", fontWeight: "bold" }}>{patientData.reg_id || "-"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>سن</span>
              <span style={{ color: "#111827" }}>{patientData.age ? `${patientData.age} سال` : "-"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>جنسیت</span>
              <span style={{ color: "#111827" }}>{patientData.gender || "-"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>تشخیص</span>
              <span style={{ color: "#111827" }}>{patientData.diagnosis || "-"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>شماره نسخه</span>
              <span style={{ color: "#059669", fontWeight: "bold" }}>
                {prescriptionNumber || "— پس از ثبت —"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== فرم اصلی ===== */}
      <div className="form-container">
        <h3 style={{ color: "#059669", marginBottom: "15px" }}>
          {editingId ? `✏️ ویرایش نسخه شماره ${editingId}` : "📝 ثبت نسخه"}
        </h3>

        <div style={{ marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
          <h4 style={{ color: "#2563eb", marginBottom: "12px" }}>➕ افزودن دارو</h4>

          <div className="form-grid" onKeyDown={handleKeyDown}>
            <div style={{ gridColumn: "1 / -1", marginBottom: "10px" }}>
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#111827" }}>
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={!formItem.is_custom}
                    onChange={() => {
                      setFormItem({ ...emptyItem, is_custom: false, category_id: formItem.category_id });
                      setSuppliers([]);
                      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
                    }}
                  />
                  <span>📦 انتخاب از داروهای موجود</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#111827" }}>
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={formItem.is_custom}
                    onChange={() => {
                      setFormItem({ ...emptyItem, is_custom: true, category_id: formItem.category_id });
                      setSuppliers([]);
                      setStockAvailability({ available: true, totalStock: 0, message: "", checking: false });
                    }}
                  />
                  <span>✍️ تجویز داروی دستی</span>
                </label>
              </div>
            </div>

            <div>
              <label>کتگوری *</label>
              <select
                value={formItem.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className="form-input"
              >
                <option value="">انتخاب</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
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
                    onChange={(e) => setFormItem({ ...formItem, custom_name: e.target.value })}
                    placeholder="نام دارو"
                    className="form-input"
                  />
                </div>
                <div>
                  <label>نوع دارو</label>
                  <input
                    type="text"
                    value={formItem.custom_type}
                    onChange={(e) => setFormItem({ ...formItem, custom_type: e.target.value })}
                    placeholder="قرص، شربت، آمپول"
                    className="form-input"
                  />
                </div>
                <div>
                  <label>حمایت‌کننده *</label>
                  <input
                    type="text"
                    value={formItem.custom_supplier_name}
                    onChange={(e) => setFormItem({ ...formItem, custom_supplier_name: e.target.value })}
                    placeholder="نام حمایت‌کننده"
                    className="form-input"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label>دارو *</label>
                  <select
                    value={formItem.med_id}
                    onChange={(e) => handleChange("med_id", e.target.value)}
                    className="form-input"
                  >
                    <option value="">انتخاب</option>
                    {filteredMedications.map((m) => (
                      <option key={m.med_id} value={m.med_id}>{m.gen_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>حمایت‌کننده *</label>
                  <select
                    value={formItem.supplier_id}
                    onChange={(e) => handleChange("supplier_id", e.target.value)}
                    disabled={!formItem.med_id || loadingSuppliers}
                    className="form-input"
                    style={{
                      borderColor:
                        formItem.supplier_id && !stockAvailability.available && formItem.quantity
                          ? "#dc2626" : "#d1d5db",
                      opacity: !formItem.med_id || loadingSuppliers ? 0.6 : 1,
                      cursor: !formItem.med_id || loadingSuppliers ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="">
                      {loadingSuppliers ? "⏳ در حال بارگذاری..."
                        : !formItem.med_id ? "ابتدا دارو را انتخاب کنید"
                        : suppliers.length === 0 ? "حمایت‌کننده‌ای یافت نشد"
                        : "انتخاب"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.reg_id} value={s.reg_id}>
                        {s.full_name ?? s.name ?? s.reg_name}
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
                    className="form-input"
                    style={{ color: "#2563eb", fontWeight: "bold" }}
                  />
                </div>
              </>
            )}

            <div>
              <label>مقدار مصرف *</label>
              <input
                value={formItem.dosage}
                onChange={(e) => handleChange("dosage", e.target.value)}
                placeholder="مثلاً: 1×3"
                className="form-input"
              />
            </div>

            <div>
              <label>تعداد *</label>
              <input
                type="number"
                min="1"
                value={formItem.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                className="form-input"
                style={{
                  borderColor:
                    !formItem.is_custom && stockAvailability.message && !stockAvailability.available
                      ? "#dc2626" : stockAvailability.available ? "#10b981" : "#d1d5db"
                }}
              />
              {!formItem.is_custom && stockAvailability.message && (
                <small style={{
                  color: stockAvailability.available ? "#059669" : "#dc2626",
                  display: "block", marginTop: "4px", fontWeight: "bold"
                }}>
                  {stockAvailability.checking ? "⏳ در حال بررسی موجودی..." : stockAvailability.message}
                </small>
              )}
            </div>

            <div>
              <label>ملاحظات</label>
              <input
                value={formItem.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="توضیحات اضافی..."
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={handleAddItem} className="btn-add">➕ افزودن به نسخه</button>
            {formItem.is_custom && (
              <button
                type="button"
                onClick={() => {
                  setFormItem({ ...emptyItem, category_id: formItem.category_id });
                  setStockAvailability({ available: false, totalStock: 0, message: "", checking: false });
                }}
                className="btn-cancel-custom"
              >
                ❌ لغو ثبت دستی
              </button>
            )}
          </div>

          <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
            ⚡ برای افزودن سریع، کلید Enter را بزنید
          </div>
        </div>

        {prescriptionItems.length > 0 && (
          <div className="table-container" style={{ marginTop: "20px" }}>
            <h4 style={{ color: "#2563eb" }}>
              📋 لیست داروهای تجویز شده ({prescriptionItems.length})
            </h4>
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
                      {item.is_custom && <span className="badge-custom">دستی</span>}
                    </td>
                    <td>{item.med_type || "-"}</td>
                    <td>{item.supplier_name || "-"}</td>
                    <td>{item.dosage || "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{item.remarks || "-"}</td>
                    <td>
                      <button onClick={() => handleRemoveItem(item.id)} className="btn-delete">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="9" style={{ textAlign: "left", fontWeight: "bold", color: "#b45309" }}>
                    مجموع: {prescriptionItems.length} قلم دارو
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="action-buttons">
          <button
            type="button"
            onClick={handleSavePrescription}
            disabled={prescriptionItems.length === 0 || isSubmitting}
            className="btn-save"
          >
            {isSubmitting ? "⏳ در حال ذخیره..."
              : editingId ? `💾 بروزرسانی نسخه ${editingId}`
              : "💾 ذخیره نسخه"}
          </button>

          {prescriptionItems.length > 0 && (
            <button type="button" onClick={handlePrintClick} className="btn-print">🖨️ چاپ نسخه</button>
          )}

          <button type="button" onClick={handleCancel} className="btn-cancel">
            {editingId ? "❌ لغو ویرایش" : "❌ انصراف"}
          </button>
        </div>
      </div>

      {/* ============================================================
          ✅ لیست نسخه‌ها به‌صورت ردیفی (Row-based)
      ============================================================ */}
      <div className="prescriptions-list-container">
        <div className="list-header">
          <h3 style={{ color: "#1e40af", margin: 0 }}>
            📚 نسخه‌های ثبت‌شده ({prescriptions.length})
          </h3>
          <button
            type="button"
            onClick={loadPrescriptions}
            className="btn-refresh"
            disabled={loadingList}
          >
            {loadingList ? "⏳..." : "🔄 بروزرسانی"}
          </button>
        </div>

        {loadingList && prescriptions.length === 0 ? (
          <div className="empty-state">⏳ در حال بارگذاری نسخه‌ها...</div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">📭 هنوز نسخه‌ای برای این مراجعه ثبت نشده است</div>
        ) : (
          <div className="table-container" style={{ marginTop: 0 }}>
            <table className="prescriptions-table">
              <thead>
                <tr>
                  <th style={{ width: "36px" }}></th>
                  <th>#</th>
                  <th>شماره نسخه</th>
                  <th>تاریخ</th>
                  <th>داکتر</th>
                  <th>تشخیص</th>
                  <th>تعداد اقلام</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((pres, idx) => {
                  const st = STATUS_MAP[pres.status] || STATUS_MAP.pending;
                  const isOpen = !!expandedRows[pres.pres_id];
                  const items = pres.items ?? [];

                  return (
                    <Fragment key={pres.pres_id}>
                      <tr className="pres-main-row">
                        <td>
                          {items.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(pres.pres_id)}
                              className="btn-toggle-row"
                              title={isOpen ? "بستن داروها" : "نمایش داروها"}
                            >
                              {isOpen ? "▼" : "▶"}
                            </button>
                          )}
                        </td>
                        <td>{idx + 1}</td>
                        <td>
                          <span className="pres-num-inline">
                            #{pres.pres_num || pres.pres_id}
                          </span>
                        </td>
                        <td>
                          {pres.pres_date
                            ? new Date(pres.pres_date).toLocaleDateString("fa-IR")
                            : "-"}
                        </td>
                        <td>{pres.doc_name || "-"}</td>
                        <td className="td-ellipsis" title={pres.diagnosis || "-"}>
                          {pres.diagnosis || "-"}
                        </td>
                        <td>
                          <span className="items-count">{items.length}</span>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: st.bg, color: st.color }}
                          >
                            ● {st.label}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-action btn-edit"
                              onClick={() => handleEditPrescription(pres)}
                              title="ویرایش"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-print-sm"
                              onClick={() => handlePrintExisting(pres)}
                              title="چاپ"
                            >
                              🖨️
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-delete-sm"
                              onClick={() => handleDeletePrescription(pres.pres_id)}
                              title="حذف"
                            >
                              🗑️
                            </button>
                            <select
                              value={pres.status}
                              onChange={(e) => handleChangeStatus(pres.pres_id, e.target.value)}
                              className="status-select-inline"
                              title="تغییر وضعیت"
                            >
                              <option value="pending">در انتظار</option>
                              <option value="sent_to_pharmacy">ارسال به دواخانه</option>
                              <option value="pharmacy_registered">ثبت دواخانه</option>
                              <option value="paid">پول اخذ شده</option>
                              <option value="cancelled">لغو شده</option>
                            </select>
                          </div>
                        </td>
                      </tr>

                      {isOpen && items.length > 0 && (
                        <tr className="pres-detail-row">
                          <td colSpan="9">
                            <div className="detail-wrapper">
                              {(pres.sent_to_pharmacy_at || pres.pharmacy_registered_at || pres.paid_at) && (
                                <div className="timeline">
                                  {pres.sent_to_pharmacy_at && (
                                    <div className="timeline-item">
                                      📤 ارسال به دواخانه: {new Date(pres.sent_to_pharmacy_at).toLocaleString("fa-IR")}
                                    </div>
                                  )}
                                  {pres.pharmacy_registered_at && (
                                    <div className="timeline-item">
                                      🏥 ثبت دواخانه: {new Date(pres.pharmacy_registered_at).toLocaleString("fa-IR")}
                                      {pres.pharmacy_name && ` — ${pres.pharmacy_name}`}
                                    </div>
                                  )}
                                  {pres.paid_at && (
                                    <div className="timeline-item">
                                      💰 پرداخت: {new Date(pres.paid_at).toLocaleString("fa-IR")}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="detail-items-title">
                                💊 داروهای تجویز شده ({items.length})
                              </div>
                              <table className="detail-items-table">
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
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, i) => (
                                    <tr key={it.pres_it_id ?? i}>
                                      <td>{i + 1}</td>
                                      <td>{it.category_name || "-"}</td>
                                      <td>
                                        {it.med_name || "-"}
                                        {it.is_custom && (
                                          <span className="badge-custom">دستی</span>
                                        )}
                                      </td>
                                      <td>{it.type || "-"}</td>
                                      <td>{it.supplier_name || "-"}</td>
                                      <td>{it.dosage || "-"}</td>
                                      <td>{it.quantity}</td>
                                      <td>{it.remarks || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {prescriptionPrintData && (
          <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />
        )}
      </div>

      <style>{`
        .form-container {
          background: #ffffff;
          padding: 25px;
          border-radius: 10px;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .form-grid label {
          display: block;
          margin-bottom: 5px;
          color: #374151;
          font-size: 13px;
          font-weight: 600;
        }
        .form-input {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background-color: #ffffff;
          color: #111827;
          width: 100%;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-input:disabled {
          background-color: #f9fafb;
          color: #6b7280;
        }
        .btn-add {
          background-color: #3b82f6;
          color: #ffffff;
          padding: 10px 25px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .btn-add:hover { background-color: #2563eb; }
        .btn-cancel-custom {
          background-color: #6b7280;
          color: #ffffff;
          padding: 10px 25px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .btn-cancel-custom:hover { background-color: #4b5563; }
        .btn-delete {
          background-color: #dc2626;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-delete:hover { background-color: #b91c1c; }
        .btn-save {
          background-color: #059669;
          color: #ffffff;
          padding: 10px 25px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .btn-save:hover:not(:disabled) { background-color: #047857; }
        .btn-save:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .btn-print {
          background-color: #7c3aed;
          color: #ffffff;
          padding: 10px 25px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .btn-print:hover { background-color: #6d28d9; }
        .btn-cancel {
          background-color: #ef4444;
          color: #ffffff;
          padding: 10px 25px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        .btn-cancel:hover { background-color: #dc2626; }
        .badge-custom {
          background: #8b5cf6;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          margin-right: 5px;
        }
        .table-container {
          overflow-x: auto;
          background: #ffffff;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #e5e7eb;
        }
        .table-container table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .table-container th {
          background: #f9fafb;
          color: #1e40af;
          padding: 10px 12px;
          text-align: center;
          border: 1px solid #e5e7eb;
          white-space: nowrap;
          font-weight: 700;
        }
        .table-container td {
          padding: 8px 12px;
          text-align: center;
          border: 1px solid #e5e7eb;
          color: #111827;
        }
        .table-container tbody tr:hover { background: #f9fafb; }
        .table-container tfoot td { font-weight: bold; background: #f9fafb; }
        .action-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }

        .prescriptions-list-container {
          margin-top: 30px;
          background: #ffffff;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }
        .btn-refresh {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .btn-refresh:hover:not(:disabled) { background: #dbeafe; }
        .btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 14px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px dashed #d1d5db;
        }

        .prescriptions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .prescriptions-table thead th {
          background: #eff6ff;
          color: #1e40af;
          padding: 10px 8px;
          text-align: center;
          border: 1px solid #dbeafe;
          white-space: nowrap;
          font-weight: 700;
          font-size: 12px;
        }
        .pres-main-row td {
          padding: 10px 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
          color: #111827;
          background: #ffffff;
        }
        .pres-main-row:hover td { background: #f9fafb; }

        .pres-num-inline {
          font-weight: bold;
          color: #1e40af;
          font-size: 14px;
        }
        .items-count {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          padding: 2px 10px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 12px;
        }
        .td-ellipsis {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          display: inline-block;
        }

        .btn-toggle-row {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .btn-toggle-row:hover { background: #dbeafe; }

        .row-actions {
          display: flex;
          gap: 4px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-action {
          padding: 5px 8px;
          border-radius: 5px;
          border: 1px solid;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          background: #ffffff;
          transition: background 0.15s;
          line-height: 1;
        }
        .btn-edit {
          color: #2563eb;
          border-color: #bfdbfe;
        }
        .btn-edit:hover { background: #eff6ff; }
        .btn-print-sm {
          color: #7c3aed;
          border-color: #ddd6fe;
        }
        .btn-print-sm:hover { background: #f5f3ff; }
        .btn-delete-sm {
          color: #dc2626;
          border-color: #fecaca;
        }
        .btn-delete-sm:hover { background: #fef2f2; }

        .status-select-inline {
          padding: 5px 6px;
          border-radius: 5px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #111827;
          font-size: 11px;
          cursor: pointer;
        }
        .status-select-inline:focus {
          outline: none;
          border-color: #2563eb;
        }

        .pres-detail-row td {
          padding: 0;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .detail-wrapper {
          padding: 15px 20px;
        }
        .detail-items-title {
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .detail-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: #ffffff;
          border-radius: 6px;
          overflow: hidden;
        }
        .detail-items-table th {
          background: #dbeafe;
          color: #1e40af;
          padding: 8px 10px;
          text-align: center;
          border: 1px solid #bfdbfe;
          font-weight: 700;
          font-size: 11px;
          white-space: nowrap;
        }
        .detail-items-table td {
          padding: 7px 10px;
          text-align: center;
          border: 1px solid #e5e7eb;
          color: #111827;
        }
        .detail-items-table tbody tr:hover { background: #f9fafb; }

        .timeline {
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #ffffff;
          border-radius: 6px;
          border-right: 3px solid #3b82f6;
        }
        .timeline-item {
          font-size: 11px;
          color: #4b5563;
          padding: 2px 0;
        }
      `}</style>
    </MainLayoutjur>
  );
}