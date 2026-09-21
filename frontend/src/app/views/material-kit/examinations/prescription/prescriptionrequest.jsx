import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import MainLayoutjur from "../../../../../components/Mainlayoutjur";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "app/contexts/AuthContext";
import { useReactToPrint } from "react-to-print";
import PrescriptionPrint from "../../PrescriptionPrint";

// ============================================================
// ✅ نگاشت وضعیت‌ها
// ============================================================
const STATUS_MAP = {
  pending:             { label: "در انتظار ارسال",     color: "#6b7280", bg: "#f3f4f6" },
  sent_to_pharmacy:    { label: "ارسال به دواخانه",    color: "#0369a1", bg: "#e0f2fe" },
  pharmacy_registered: { label: "ثبت شده در دواخانه",  color: "#6d28d9", bg: "#ede9fe" },
  paid:                { label: "پول اخذ شده",         color: "#047857", bg: "#d1fae5" },
  cancelled:           { label: "لغو شده",             color: "#b91c1c", bg: "#fee2e2" },
};

const FEE_STATUS_MAP = {
  pending:   { label: "پرداخت نشده",  color: "#b45309", bg: "#fef3c7" },
  partial:   { label: "پرداخت جزئی",  color: "#0369a1", bg: "#e0f2fe" },
  paid:      { label: "پرداخت شده",   color: "#047857", bg: "#d1fae5" },
  refunded:  { label: "برگشت داده",   color: "#6d28d9", bg: "#ede9fe" },
  cancelled: { label: "لغو شده",      color: "#b91c1c", bg: "#fee2e2" },
};

const normalizeStatus = (raw) => {
  if (raw === null || raw === undefined || raw === "") return "pending";
  if (typeof raw === "number") {
    const map = ["pending", "sent_to_pharmacy", "pharmacy_registered", "paid", "cancelled"];
    return map[raw] || "pending";
  }
  const s = String(raw).trim().toLowerCase();
  if (STATUS_MAP[s]) return s;
  if (s === "sent" || s === "sent-to-pharmacy") return "sent_to_pharmacy";
  if (s === "registered" || s === "pharmacy-registered") return "pharmacy_registered";
  if (s === "completed" || s === "done") return "paid";
  if (s === "canceled" || s === "cancell") return "cancelled";
  if (s === "waiting") return "pending";
  return "pending";
};

const normalizeFeeStatus = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  return FEE_STATUS_MAP[s] ? s : null;
};

const pick = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "" && v !== "-" && v !== 0 && v !== "0") return v;
  }
  return "-";
};

export default function PrescriptionForm({
  registration,
  regId,
  api: propApi,
  onComplete,
  onRefresh,
  onSave,
  isSubmitting,
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

  const [patientData, setPatientData] = useState(null);
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [medications, setMedications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [formItem, setFormItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [syncingId, setSyncingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [stockAvailability, setStockAvailability] = useState({
    available: false, totalStock: 0, message: "",
    checking: false, nextBatch: null
  });
  const [prescriptionPrintData, setPrescriptionPrintData] = useState(null);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ جلوگیری از فراخوانی همزمان
  const isLoadingRef = useRef(false);
  const abortRef = useRef(null);

  // ========== patient_id از سرور ==========
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
      console.error("❌ خطا در دریافت patient_id:", err);
      return null;
    }
  };

  // ============================================================
  // ✅ ساخت اطلاعات چاپ
  // ============================================================
  const buildPrintData = ({ prescription, items }) => {
    const pd = patientData || {};
    const p = prescription || {};

    const patient_name = pick(
      p.patient_name, p.patient?.full_name,
      p.registration?.patient_name, pd.full_name
    );
    const patient_age = pick(
      p.patient_age, p.patient?.age,
      p.registration?.patient_age, pd.age
    );
    const patient_gender = pick(
      p.patient_gender, p.patient?.gender,
      p.registration?.patient_gender, pd.gender
    );
    const patient_phone = pick(
      p.patient_phone, p.patient?.mobile, p.patient?.phone,
      p.registration?.patient_phone, pd.phone
    );
    const tazkira_number = pick(
      p.tazkira_number, p.patient?.national_id, p.patient?.tazkira_number,
      p.registration?.tazkira_number, pd.tazkira_number
    );
    const blood_group = pick(
      p.patient_blood_group, p.patient?.blood_group,
      p.registration?.patient_blood_group, pd.blood_group
    );

    return {
      pres_num: pick(p.pres_num, p.pres_id, prescriptionNumber),
      date: pick(p.pres_date, prescriptionDate),
      patient_name,
      patient_age,
      patient_gender,
      patient_phone,
      tazkira_number,
      blood_group,
      diagnosis: pick(p.diagnosis, pd.diagnosis),
      weight: pick(p.weight, pd.weight),
      blood_pressure: pick(p.blood_pressure, pd.blood_pressure),
      temperature: pick(p.temperature, pd.temperature),
      oxygen: pick(p.oxygen, pd.oxygen),
      doctor_name: pick(p.doc_name, p.doctor?.name, p.doctor?.full_name, user?.name, user?.full_name, "-"),
      items: (items || []).map(it => ({
        med_name: it.med_name || "-",
        med_type: it.med_type || it.type || "-",
        supplier_name: it.supplier_name || "-",
        dosage: it.dosage || "-",
        quantity: it.quantity ?? "-",
        remarks: it.remarks || "-",
        is_custom: !!it.is_custom,
        category_name: it.category_name || "-",
        barcode: it.barcode || "-",
        batch_number: it.batch_number || "-",
      }))
    };
  };

  // ============================================================
  // ✅ بارگذاری لیست نسخه‌ها (بدون درخواست اضافی فیس)
  // ============================================================
  const loadPrescriptions = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoadingList(true);
    try {
      const res = await api.get("/prescriptions");
      const all = res.data?.data ?? res.data ?? [];
      const effectiveRegId = regId || registration?.reg_id;
      const filtered = effectiveRegId
        ? all.filter(p => Number(p.reg_id) === Number(effectiveRegId))
        : all;

      // ✅ سرور خودش fee را برگردانده — دیگر نیازی به درخواست جدا نیست
      const normalized = filtered.map(p => {
        const feeStatus = normalizeFeeStatus(
          p.fee_status ?? p.fee?.payment_status ?? null
        );

        let status = normalizeStatus(p.status);

        // اگر فیس paid است و نسخه هنوز paid نشده، وضعیت نمایشی را paid نشان بده
        if (feeStatus === "paid" && status !== "paid" && status !== "cancelled") {
          status = "paid";
        }
        if ((feeStatus === "cancelled" || feeStatus === "refunded")
            && status !== "cancelled") {
          status = "cancelled";
        }

        return {
          ...p,
          status,
          status_label: p.status_label || STATUS_MAP[status]?.label,
          fee_status: feeStatus,
          fee_paid: p.fee_paid ?? p.fee?.paid_amount ?? 0,
          fee_remaining: p.fee_remaining ?? p.fee?.remaining_amount ?? 0,
          fee_total: p.fee_total ?? p.fee?.total_amount ?? 0,
        };
      });

      setPrescriptions(normalized);
    } catch (error) {
      // ✅ خطای 500 را نگیر (تا polling را متوقف نکند)
      console.warn("loadPrescriptions failed:", error?.response?.status);
      if (error?.response?.status !== 500) {
        // اگر خطا از نوع دیگر بود، لاگ کن
        console.error("Error loading prescriptions:", error);
      }
    } finally {
      setLoadingList(false);
      isLoadingRef.current = false;
    }
  }, [api, regId, registration]);

  // ========== مقداردهی اولیه ==========
  useEffect(() => {
    let pollTimer = null;
    let cancelled = false;

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

        if (cancelled) return;

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
        if (cancelled) return;
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

      if (cancelled) return;

      setPrescriptionDate(new Date().toISOString().slice(0, 10));
      await Promise.all([loadMedications(), loadCategories()]);

      if (cancelled) return;

      await loadPrescriptions();
      setLoading(false);

      // ✅ Polling خودکار هر 30 ثانیه (به‌جای 15)
      pollTimer = setInterval(() => {
        if (!cancelled) loadPrescriptions();
      }, 30000);
    };

    initialize();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration, regId]);

  // ========== بارگذاری‌ها ==========
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
      if (list.length === 0) toast.warning("⚠️ حمایت‌کننده‌ای یافت نشد");
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
        setStockAvailability({ available: true, totalStock: 0, message: "", checking: false, nextBatch: null });
        return;
      }
      if (!formItem.med_id || !formItem.supplier_id || !formItem.quantity || Number(formItem.quantity) <= 0) {
        setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
        return;
      }

      setStockAvailability(prev => ({ ...prev, checking: true }));

      try {
        const response = await api.get("/prescriptions/next-batch", {
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
            message: `✅ بچ: ${batch.batch_number || "بدون بچ"} — انقضا: ${batch.exp_date || "-"} — بارکد: ${batch.barcode || "-"}`,
            checking: false,
            nextBatch: batch
          });
        } else {
          setStockAvailability({
            available: false, totalStock: 0,
            message: response.data?.message || "❌ موجودی کافی نیست",
            checking: false, nextBatch: null
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setStockAvailability({
            available: false, totalStock: 0,
            message: "❌ موجودی کافی یافت نشد",
            checking: false, nextBatch: null
          });
        } else {
          setStockAvailability({
            available: false, totalStock: 0,
            message: "⚠️ خطا در بررسی موجودی",
            checking: false, nextBatch: null
          });
        }
      }
    };

    const timer = setTimeout(() => checkStockAvailability(), 500);
    return () => clearTimeout(timer);
  }, [formItem.med_id, formItem.supplier_id, formItem.quantity, formItem.type, formItem.is_custom, api]);

  // ========== مدیریت فرم ==========
  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };
    if (field === "category_id") {
      updated.med_id = ""; updated.supplier_id = ""; updated.type = "";
      setSuppliers([]);
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
    }
    if (field === "med_id") {
      const med = medications.find(m => Number(m.med_id) === Number(value));
      updated.type = med?.type ?? "";
      updated.supplier_id = "";
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
    }
    if (field === "supplier_id") {
      setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
    }
    setFormItem(updated);
  };

  const handleAddItem = () => {
    if (formItem.is_custom) {
      if (!formItem.custom_name.trim()) { toast.error("❌ نام دارو را وارد کنید"); return; }
      if (!formItem.category_id) { toast.error("❌ کتگوری را انتخاب کنید"); return; }
      if (!formItem.custom_supplier_name.trim()) { toast.error("❌ نام حمایت‌کننده را وارد کنید"); return; }
      if (!formItem.dosage.trim()) { toast.error("❌ مقدار مصرف را وارد کنید"); return; }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) { toast.error("❌ تعداد را وارد کنید"); return; }
    } else {
      if (!formItem.category_id || !formItem.med_id) { toast.error("❌ کتگوری و دارو را انتخاب کنید"); return; }
      if (!formItem.supplier_id) { toast.error("❌ حمایت‌کننده را انتخاب کنید"); return; }
      if (!formItem.quantity || Number(formItem.quantity) <= 0) { toast.error("❌ تعداد را وارد کنید"); return; }
      if (!formItem.dosage.trim()) { toast.error("❌ مقدار مصرف را وارد کنید"); return; }
      if (!stockAvailability.available) { toast.error(`❌ موجودی کافی نیست! ${stockAvailability.message}`); return; }
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

    const batchInfo = stockAvailability.nextBatch || {};

    const newItem = {
      ...formItem,
      id: Date.now() + Math.random(),
      med_name: formItem.is_custom ? formItem.custom_name.trim() : med?.gen_name ?? "-",
      med_type: formItem.is_custom ? formItem.custom_type || "سایر" : med?.type ?? "-",
      category_name: cat?.category_name ?? "-",
      supplier_name: supplierName,
      barcode: batchInfo.barcode ?? null,
      batch_number: batchInfo.batch_number ?? null,
      stock_id: batchInfo.stock_id ?? null,
      exp_date: batchInfo.exp_date ?? null,
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setFormItem({ ...emptyItem, category_id: formItem.category_id });
    setSuppliers([]);
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
    toast.success("✅ دارو اضافه شد");
  };

  const handleRemoveItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAddItem();
  };

  // ========== ویرایش کل نسخه ==========
  const handleEditPrescription = async (pres) => {
    try {
      const res = await api.get(`/prescriptions/${pres.pres_id}`);
      const data = res.data?.data ?? res.data;
      if (!data) { toast.error("خطا در دریافت نسخه"); return; }

      setPatientData(prev => ({
        ...prev,
        full_name: data.patient_name ?? data.patient?.full_name ?? prev?.full_name,
        age: data.patient_age ?? data.patient?.age ?? prev?.age,
        gender: data.patient_gender ?? data.patient?.gender ?? prev?.gender,
        phone: data.patient_phone ?? data.patient?.mobile ?? prev?.phone,
        tazkira_number: data.tazkira_number ?? data.patient?.national_id ?? prev?.tazkira_number,
        blood_group: data.patient_blood_group ?? data.patient?.blood_group ?? prev?.blood_group,
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
        barcode: it.barcode ?? null,
        batch_number: it.batch_number ?? null,
        stock_id: it.stock_id ?? null,
      }));

      setPrescriptionItems(items);
      toast.info(`✏️ نسخه ${data.pres_id} بارگذاری شد`);
    } catch (error) {
      console.error("Error loading prescription for edit:", error);
      toast.error("❌ خطا در بارگذاری نسخه");
    }
  };

  // ========== حذف کل نسخه ==========
  const handleDeletePrescription = async (presId) => {
    if (!window.confirm(`حذف نسخه شماره ${presId}؟`)) return;
    try {
      await api.delete(`/prescriptions/${presId}`);
      toast.success(`🗑️ نسخه ${presId} حذف شد`);
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting prescription:", error);
      toast.error("❌ خطا در حذف نسخه");
    }
  };

  // ============================================================
  // ✅ همگام‌سازی دستی وضعیت از فیس
  // ============================================================
  const handleSyncFromFee = async (presId) => {
    setSyncingId(presId);
    try {
      const res = await api.post(`/prescriptions/${presId}/sync-status`);
      const syncResult = res.data?.sync_result;
      if (syncResult?.synced) {
        toast.success(`✅ وضعیت همگام شد: ${syncResult.old_status} → ${syncResult.new_status}`);
      } else {
        toast.info(`ℹ️ ${res.data?.message || "تغییری لازم نبود"}`);
      }
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error?.response?.data?.message || "خطا در همگام‌سازی";
      toast.error(`❌ ${msg}`);
    } finally {
      setSyncingId(null);
    }
  };

  // ============================================================
  // ✅ شروع ویرایش inline یک قلم
  // ============================================================
  const handleStartEditItem = (presId, item) => {
    setEditingItem({
      presId,
      presItId: item.pres_it_id,
      quantity: item.quantity,
      dosage: item.dosage,
      remarks: item.remarks || "",
      med_name: item.med_name,
    });
  };

  // ============================================================
  // ✅ ذخیره ویرایش inline یک قلم
  // ============================================================
  const handleSaveEditItem = async () => {
    if (!editingItem) return;

    const qty = Number(editingItem.quantity);
    if (!qty || qty <= 0) {
      toast.error("❌ تعداد باید حداقل ۱ باشد");
      return;
    }

    try {
      const { presId, presItId } = editingItem;

      const res = await api.get(`/prescriptions/${presId}`);
      const data = res.data?.data ?? res.data;
      if (!data) { toast.error("❌ نسخه یافت نشد"); return; }

      const updatedItems = (data.items ?? []).map((it) => {
        if (it.pres_it_id === presItId) {
          return {
            category_id: it.category_id ? Number(it.category_id) : null,
            is_custom: !!it.is_custom,
            med_id: it.is_custom ? null : Number(it.med_id),
            supplier_id: it.is_custom ? null : Number(it.supplier_id),
            med_name: it.is_custom ? it.med_name : null,
            supplier_name: it.is_custom ? it.supplier_name : null,
            type: it.type || null,
            dosage: editingItem.dosage || it.dosage,
            quantity: qty,
            remarks: editingItem.remarks || null,
          };
        }
        return {
          category_id: it.category_id ? Number(it.category_id) : null,
          is_custom: !!it.is_custom,
          med_id: it.is_custom ? null : Number(it.med_id),
          supplier_id: it.is_custom ? null : Number(it.supplier_id),
          med_name: it.is_custom ? it.med_name : null,
          supplier_name: it.is_custom ? it.supplier_name : null,
          type: it.type || null,
          dosage: it.dosage,
          quantity: Number(it.quantity),
          remarks: it.remarks || null,
        };
      });

      const payload = {
        patient_id: data.patient_id,
        reg_id: data.reg_id,
        pres_date: data.pres_date,
        patient_name: data.patient_name,
        tazkira_number: data.tazkira_number,
        patient_age: data.patient_age,
        patient_gender: data.patient_gender,
        patient_phone: data.patient_phone,
        patient_blood_group: data.patient_blood_group,
        diagnosis: data.diagnosis,
        weight: data.weight,
        blood_pressure: data.blood_pressure,
        temperature: data.temperature,
        oxygen: data.oxygen,
        status: data.status,
        items: updatedItems,
      };

      await api.put(`/prescriptions/${presId}`, payload);
      toast.success("✅ قلم دارو بروزرسانی شد");
      setEditingItem(null);
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("❌ خطا در بروزرسانی");
    }
  };

  const handleCancelEditItem = () => {
    setEditingItem(null);
  };

  // ============================================================
  // ✅ حذف یک قلم
  // ============================================================
  const handleDeleteSingleItem = async (presId, presItId) => {
    if (!window.confirm(`حذف این قلم دارو؟`)) return;

    try {
      const res = await api.get(`/prescriptions/${presId}`);
      const data = res.data?.data ?? res.data;
      if (!data) { toast.error("❌ نسخه یافت نشد"); return; }

      const remainingItems = (data.items ?? []).filter(it => it.pres_it_id !== presItId);

      if (remainingItems.length === 0) {
        toast.error("❌ نمی‌توان آخرین قلم را حذف کرد. کل نسخه را حذف کنید.");
        return;
      }

      const payload = {
        patient_id: data.patient_id,
        reg_id: data.reg_id,
        pres_date: data.pres_date,
        patient_name: data.patient_name,
        tazkira_number: data.tazkira_number,
        patient_age: data.patient_age,
        patient_gender: data.patient_gender,
        patient_phone: data.patient_phone,
        patient_blood_group: data.patient_blood_group,
        diagnosis: data.diagnosis,
        weight: data.weight,
        blood_pressure: data.blood_pressure,
        temperature: data.temperature,
        oxygen: data.oxygen,
        status: data.status,
        items: remainingItems.map((it) => ({
          category_id: it.category_id ? Number(it.category_id) : null,
          is_custom: !!it.is_custom,
          med_id: it.is_custom ? null : Number(it.med_id),
          supplier_id: it.is_custom ? null : Number(it.supplier_id),
          med_name: it.is_custom ? it.med_name : null,
          supplier_name: it.is_custom ? it.supplier_name : null,
          type: it.type || null,
          dosage: it.dosage,
          quantity: Number(it.quantity),
          remarks: it.remarks || null,
        })),
      };

      await api.put(`/prescriptions/${presId}`, payload);
      toast.success("✅ قلم دارو حذف شد");
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("❌ خطا در حذف");
    }
  };

  // ========== چاپ ==========
  const handlePrintExisting = async (pres) => {
    try {
      const res = await api.get(`/prescriptions/${pres.pres_id}`);
      const data = res.data?.data ?? res.data;

      if (data) {
        setPatientData(prev => ({
          ...(prev || {}),
          full_name: pick(data.patient_name, data.patient?.full_name, prev?.full_name, "نامشخص"),
          age: pick(data.patient_age, data.patient?.age, prev?.age, "-"),
          gender: pick(data.patient_gender, data.patient?.gender, prev?.gender, "-"),
          phone: pick(data.patient_phone, data.patient?.mobile, prev?.phone, "-"),
          tazkira_number: pick(data.tazkira_number, data.patient?.national_id, prev?.tazkira_number, "-"),
          blood_group: pick(data.patient_blood_group, data.patient?.blood_group, prev?.blood_group, "-"),
          diagnosis: pick(data.diagnosis, prev?.diagnosis, "-"),
          weight: data.weight ?? prev?.weight,
          blood_pressure: pick(data.blood_pressure, prev?.blood_pressure, "-"),
          temperature: data.temperature ?? prev?.temperature,
          oxygen: data.oxygen ?? prev?.oxygen,
        }));
      }

      const printData = buildPrintData({
        prescription: data || pres,
        items: data?.items ?? pres.items ?? []
      });
      setPrescriptionPrintData(printData);
      setIsPrintReady(true);
    } catch (error) {
      console.error("Error loading prescription for print:", error);
      const printData = buildPrintData({
        prescription: pres,
        items: pres.items ?? []
      });
      setPrescriptionPrintData(printData);
      setIsPrintReady(true);
    }
  };

  const handleChangeStatus = async (presId, newStatus) => {
    try {
      await api.patch(`/prescriptions/${presId}/status`, { status: newStatus });
      toast.success("✅ وضعیت بروزرسانی شد");
      await loadPrescriptions();
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error?.response?.data?.message || "خطا";
      toast.error(`❌ ${msg}`);
    }
  };

  const toggleRowExpand = (presId) => {
    setExpandedRows(prev => ({ ...prev, [presId]: !prev[presId] }));
    if (editingItem?.presId === presId) setEditingItem(null);
  };

  // ========== ذخیره نسخه ==========
  const handleSavePrescription = async () => {
    if (!patientData) { toast.error("❌ مریض انتخاب نشده"); return; }

    let patientId = patientData.patient_id;
    const regIdValue = patientData.reg_id;

    if (!patientId && regIdValue) {
      patientId = await fetchPatientIdFromServer(regIdValue);
      if (patientId) setPatientData(prev => ({ ...prev, patient_id: patientId }));
    }
    if (!patientId) { toast.error("❌ patient_id یافت نشد."); return; }
    if (!regIdValue) { toast.error("❌ reg_id یافت نشد"); return; }
    if (prescriptionItems.length === 0) { toast.error("❌ حداقل یک دارو"); return; }

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
        toast.success(`✅ نسخه ${editingId} بروزرسانی شد`);
        setEditingId(null);
      } else {
        const res = await api.post("/prescriptions", payload);
        const created = res.data?.data ?? res.data;
        const presId = created?.pres_id;
        if (presId) {
          setPrescriptionNumber(String(presId));
          toast.success(`✅ نسخه ${presId} ثبت شد`);
        } else {
          toast.success("✅ نسخه ثبت شد");
        }
      }

      setPrescriptionItems([]);
      await loadPrescriptions();
      if (onSave) { try { await onSave(payload); } catch (err) {} }
      if (onComplete) onComplete();
    } catch (error) {
      console.error("❌ خطا:", error);
      if (error.response) {
        const errors = error.response.data.errors;
        if (errors) {
          const msgs = Object.entries(errors).map(([f, m]) => `${f}: ${m.join(", ")}`).join("\n");
          toast.error(`خطاهای اعتبارسنجی:\n${msgs}`);
        } else {
          toast.error(error.response.data.message || "خطا");
        }
      } else {
        toast.error(error.message || "خطا");
      }
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: prescriptionNumber || "Prescription",
    pageStyle: `@page { size: A4; margin: 20mm; } @media print { body { -webkit-print-color-adjust: exact; } }`,
    onAfterPrint: () => setIsPrintReady(false)
  });

  useEffect(() => {
    if (isPrintReady) {
      setTimeout(() => handlePrint(), 100);
    }
  }, [isPrintReady, handlePrint]);

  const handlePrintClick = () => {
    if (!prescriptionItems.length) { toast.error("آیتمی برای چاپ نیست"); return; }
    const printData = buildPrintData({ prescription: null, items: prescriptionItems });
    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  const handleCancel = () => {
    setPrescriptionItems([]);
    setFormItem(emptyItem);
    setSuppliers([]);
    setEditingId(null);
    setPrescriptionNumber("");
    setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null });
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
      {patientData && (
        <div style={{ background: "#fff", padding: "15px 20px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px 15px" }}>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>نام مریض</span><span style={{ color: "#111827", fontWeight: "bold" }}>{patientData.full_name}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>شناسه</span><span style={{ color: patientData.patient_id ? "#059669" : "#dc2626", fontWeight: "bold" }}>{patientData.patient_id || "❌"}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>مراجعه</span><span style={{ color: "#b45309", fontWeight: "bold" }}>{patientData.reg_id || "-"}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>سن</span><span>{patientData.age ? `${patientData.age} سال` : "-"}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>جنسیت</span><span>{patientData.gender || "-"}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>تشخیص</span><span>{patientData.diagnosis || "-"}</span></div>
            <div><span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>شماره نسخه</span><span style={{ color: "#059669", fontWeight: "bold" }}>{prescriptionNumber || "—"}</span></div>
          </div>
        </div>
      )}

      <div className="form-container">
        <h3 style={{ color: "#059669", marginBottom: "15px" }}>
          {editingId ? `✏️ ویرایش نسخه ${editingId}` : "📝 ثبت نسخه"}
        </h3>

        <div style={{ marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
          <h4 style={{ color: "#2563eb", marginBottom: "12px" }}>➕ افزودن دارو</h4>

          <div className="form-grid" onKeyDown={handleKeyDown}>
            <div style={{ gridColumn: "1 / -1", marginBottom: "10px" }}>
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="prescriptionType" checked={!formItem.is_custom}
                    onChange={() => { setFormItem({ ...emptyItem, is_custom: false, category_id: formItem.category_id }); setSuppliers([]); setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null }); }} />
                  <span>📦 از داروهای موجود</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="prescriptionType" checked={formItem.is_custom}
                    onChange={() => { setFormItem({ ...emptyItem, is_custom: true, category_id: formItem.category_id }); setSuppliers([]); setStockAvailability({ available: true, totalStock: 0, message: "", checking: false, nextBatch: null }); }} />
                  <span>✍️ داروی دستی</span>
                </label>
              </div>
            </div>

            <div>
              <label>کتگوری *</label>
              <select value={formItem.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className="form-input">
                <option value="">انتخاب</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </div>

            {formItem.is_custom ? (
              <>
                <div><label>نام دارو *</label><input type="text" value={formItem.custom_name} onChange={(e) => setFormItem({ ...formItem, custom_name: e.target.value })} className="form-input" /></div>
                <div><label>نوع دارو</label><input type="text" value={formItem.custom_type} onChange={(e) => setFormItem({ ...formItem, custom_type: e.target.value })} className="form-input" /></div>
                <div><label>حمایت‌کننده *</label><input type="text" value={formItem.custom_supplier_name} onChange={(e) => setFormItem({ ...formItem, custom_supplier_name: e.target.value })} className="form-input" /></div>
              </>
            ) : (
              <>
                <div>
                  <label>دارو *</label>
                  <select value={formItem.med_id} onChange={(e) => handleChange("med_id", e.target.value)} className="form-input">
                    <option value="">انتخاب</option>
                    {filteredMedications.map((m) => <option key={m.med_id} value={m.med_id}>{m.gen_name}</option>)}
                  </select>
                </div>
                <div>
                  <label>حمایت‌کننده *</label>
                  <select value={formItem.supplier_id} onChange={(e) => handleChange("supplier_id", e.target.value)} disabled={!formItem.med_id || loadingSuppliers} className="form-input">
                    <option value="">{loadingSuppliers ? "⏳..." : !formItem.med_id ? "ابتدا دارو" : suppliers.length === 0 ? "یافت نشد" : "انتخاب"}</option>
                    {suppliers.map((s) => <option key={s.reg_id} value={s.reg_id}>{s.full_name ?? s.name ?? s.reg_name}</option>)}
                  </select>
                </div>
                <div><label>نوع دارو</label><input type="text" value={formItem.type} readOnly className="form-input" /></div>
              </>
            )}

            <div><label>مقدار مصرف *</label><input value={formItem.dosage} onChange={(e) => handleChange("dosage", e.target.value)} placeholder="1×3" className="form-input" /></div>
            <div>
              <label>تعداد *</label>
              <input type="number" min="1" value={formItem.quantity} onChange={(e) => handleChange("quantity", e.target.value)} className="form-input" />
              {!formItem.is_custom && stockAvailability.message && (
                <small style={{ color: stockAvailability.available ? "#059669" : "#dc2626", display: "block", marginTop: "4px", fontSize: "11px" }}>
                  {stockAvailability.checking ? "⏳..." : stockAvailability.message}
                </small>
              )}
            </div>
            <div><label>ملاحظات</label><input value={formItem.remarks} onChange={(e) => handleChange("remarks", e.target.value)} className="form-input" /></div>
          </div>

          <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button type="button" onClick={handleAddItem} className="btn-add">➕ افزودن</button>
            {formItem.is_custom && (
              <button type="button" onClick={() => { setFormItem({ ...emptyItem, category_id: formItem.category_id }); setStockAvailability({ available: false, totalStock: 0, message: "", checking: false, nextBatch: null }); }} className="btn-cancel-custom">❌ لغو</button>
            )}
          </div>
        </div>

        {prescriptionItems.length > 0 && (
          <div className="table-container" style={{ marginTop: "20px" }}>
            <h4 style={{ color: "#2563eb" }}>📋 لیست داروها ({prescriptionItems.length})</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>کتگوری</th><th>نام دارو</th><th>نوع</th><th>حمایت‌کننده</th>
                  <th>بارکد</th><th>Batch</th><th>مقدار</th><th>تعداد</th><th>ملاحظات</th><th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.category_name || "-"}</td>
                    <td>{item.med_name || "-"}{item.is_custom && <span className="badge-custom">دستی</span>}</td>
                    <td>{item.med_type || "-"}</td>
                    <td>{item.supplier_name || "-"}</td>
                    <td>{item.barcode ? <span className="badge-barcode">{item.barcode}</span> : "-"}</td>
                    <td>{item.batch_number ? <span className="badge-batch">{item.batch_number}</span> : "-"}</td>
                    <td>{item.dosage || "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{item.remarks || "-"}</td>
                    <td><button onClick={() => handleRemoveItem(item.id)} className="btn-delete">حذف</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan="11" style={{ textAlign: "left", fontWeight: "bold", color: "#b45309" }}>مجموع: {prescriptionItems.length} قلم</td></tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="action-buttons">
          <button type="button" onClick={handleSavePrescription} disabled={prescriptionItems.length === 0 || isSubmitting} className="btn-save">
            {isSubmitting ? "⏳..." : editingId ? `💾 بروزرسانی ${editingId}` : "💾 ذخیره"}
          </button>
          {prescriptionItems.length > 0 && <button type="button" onClick={handlePrintClick} className="btn-print">🖨️ چاپ</button>}
          <button type="button" onClick={handleCancel} className="btn-cancel">{editingId ? "❌ لغو ویرایش" : "❌ انصراف"}</button>
        </div>
      </div>

      <div className="prescriptions-list-container">
        <div className="list-header">
          <h3 style={{ color: "#1e40af", margin: 0 }}>📚 نسخه‌ها ({prescriptions.length})</h3>
          <button type="button" onClick={loadPrescriptions} className="btn-refresh" disabled={loadingList}>
            {loadingList ? "⏳..." : "🔄 بروزرسانی"}
          </button>
        </div>

        {loadingList && prescriptions.length === 0 ? (
          <div className="empty-state">⏳...</div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">📭 نسخه‌ای نیست</div>
        ) : (
          <div className="table-container" style={{ marginTop: 0 }}>
            <table className="prescriptions-table">
              <thead>
                <tr>
                  <th style={{ width: "36px" }}></th><th>#</th><th>شماره</th><th>تاریخ</th>
                  <th>داکتر</th><th>تشخیص</th><th>اقلام</th><th>وضعیت</th><th>فیس</th><th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((pres, idx) => {
                  const st = STATUS_MAP[pres.status] || STATUS_MAP.pending;
                  const fs = pres.fee_status ? FEE_STATUS_MAP[pres.fee_status] : null;
                  const isOpen = !!expandedRows[pres.pres_id];
                  const items = pres.items ?? [];
                  const isSyncing = syncingId === pres.pres_id;

                  return (
                    <Fragment key={pres.pres_id}>
                      <tr className="pres-main-row">
                        <td>
                          {items.length > 0 && (
                            <button type="button" onClick={() => toggleRowExpand(pres.pres_id)} className="btn-toggle-row">
                              {isOpen ? "▼" : "▶"}
                            </button>
                          )}
                        </td>
                        <td>{idx + 1}</td>
                        <td><span className="pres-num-inline">#{pres.pres_num || pres.pres_id}</span></td>
                        <td>{pres.pres_date ? new Date(pres.pres_date).toLocaleDateString("fa-IR") : "-"}</td>
                        <td>{pres.doc_name || pres.doctor?.name || "-"}</td>
                        <td className="td-ellipsis">{pres.diagnosis || "-"}</td>
                        <td><span className="items-count">{items.length}</span></td>
                        <td><span className="status-badge" style={{ backgroundColor: st.bg, color: st.color }}>● {st.label}</span></td>
                        <td>
                          {fs ? (
                            <span className="status-badge" style={{ backgroundColor: fs.bg, color: fs.color }} title={`پرداخت: ${pres.fee_paid} / باقیمانده: ${pres.fee_remaining}`}>
                              {fs.label}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "11px" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="btn-action btn-edit" onClick={() => handleEditPrescription(pres)} title="ویرایش کل">✏️</button>
                            <button type="button" className="btn-action btn-print-sm" onClick={() => handlePrintExisting(pres)} title="چاپ">🖨️</button>
                            <button
                              type="button"
                              className="btn-action btn-sync"
                              onClick={() => handleSyncFromFee(pres.pres_id)}
                              disabled={isSyncing}
                              title="همگام‌سازی وضعیت از فیس"
                            >
                              {isSyncing ? "⏳" : "🔄"}
                            </button>
                            <button type="button" className="btn-action btn-delete-sm" onClick={() => handleDeletePrescription(pres.pres_id)} title="حذف کل">🗑️</button>
                            <select value={pres.status} onChange={(e) => handleChangeStatus(pres.pres_id, e.target.value)} className="status-select-inline">
                              <option value="pending">در انتظار</option>
                              <option value="sent_to_pharmacy">ارسال دواخانه</option>
                              <option value="pharmacy_registered">ثبت دواخانه</option>
                              <option value="paid">پول اخذ</option>
                              <option value="cancelled">لغو</option>
                            </select>
                          </div>
                        </td>
                      </tr>

                      {isOpen && items.length > 0 && (
                        <tr className="pres-detail-row">
                          <td colSpan="10">
                            <div className="detail-wrapper">
                              <div className="detail-items-title">💊 داروها ({items.length})</div>
                              <table className="detail-items-table">
                                <thead>
                                  <tr>
                                    <th>#</th><th>کتگوری</th><th>نام دارو</th><th>نوع</th><th>حمایت‌کننده</th>
                                    <th>بارکد</th><th>Batch</th><th>مقدار</th><th>تعداد</th><th>ملاحظات</th><th>عملیات</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, i) => {
                                    const isEditing = editingItem?.presId === pres.pres_id
                                      && editingItem?.presItId === it.pres_it_id;

                                    return (
                                      <tr key={it.pres_it_id ?? i}>
                                        <td>{i + 1}</td>
                                        <td>{it.category_name || "-"}</td>
                                        <td>{it.med_name || "-"}{it.is_custom && <span className="badge-custom">دستی</span>}</td>
                                        <td>{it.type || "-"}</td>
                                        <td>{it.supplier_name || "-"}</td>
                                        <td>{it.barcode ? <span className="badge-barcode">{it.barcode}</span> : "-"}</td>
                                        <td>{it.batch_number ? <span className="badge-batch">{it.batch_number}</span> : "-"}</td>

                                        <td>
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editingItem.dosage}
                                              onChange={(e) => setEditingItem({ ...editingItem, dosage: e.target.value })}
                                              style={{ width: "80px", padding: "3px 5px", fontSize: "11px", textAlign: "center" }}
                                            />
                                          ) : (it.dosage || "-")}
                                        </td>
                                        <td>
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              min="1"
                                              value={editingItem.quantity}
                                              onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                                              style={{ width: "60px", padding: "3px 5px", fontSize: "11px", textAlign: "center" }}
                                            />
                                          ) : it.quantity}
                                        </td>
                                        <td>
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editingItem.remarks}
                                              onChange={(e) => setEditingItem({ ...editingItem, remarks: e.target.value })}
                                              style={{ width: "100px", padding: "3px 5px", fontSize: "11px" }}
                                            />
                                          ) : (it.remarks || "-")}
                                        </td>
                                        <td>
                                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                            {isEditing ? (
                                              <>
                                                <button type="button" className="btn-action" onClick={handleSaveEditItem}
                                                  style={{ padding: "3px 6px", fontSize: "11px", background: "#059669", color: "#fff", borderColor: "#059669" }}>
                                                  💾
                                                </button>
                                                <button type="button" className="btn-action" onClick={handleCancelEditItem}
                                                  style={{ padding: "3px 6px", fontSize: "11px" }}>
                                                  ❌
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button type="button" className="btn-action btn-edit" onClick={() => handleStartEditItem(pres.pres_id, it)}
                                                  title="ویرایش این قلم" style={{ padding: "3px 6px", fontSize: "11px" }}>
                                                  ✏️
                                                </button>
                                                <button type="button" className="btn-action btn-delete-sm" onClick={() => handleDeleteSingleItem(pres.pres_id, it.pres_it_id)}
                                                  title="حذف این قلم" style={{ padding: "3px 6px", fontSize: "11px" }}>
                                                  🗑️
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
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
        {prescriptionPrintData && <PrescriptionPrint ref={printRef} data={prescriptionPrintData} />}
      </div>

      <style>{`
        .form-container { background: #fff; padding: 25px; border-radius: 10px; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .form-grid label { display: block; margin-bottom: 5px; color: #374151; font-size: 13px; font-weight: 600; }
        .form-input { padding: 8px 12px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #111827; width: 100%; font-size: 14px; outline: none; }
        .form-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .btn-add { background: #3b82f6; color: #fff; padding: 10px 25px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .btn-add:hover { background: #2563eb; }
        .btn-cancel-custom { background: #6b7280; color: #fff; padding: 10px 25px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .btn-delete { background: #dc2626; color: #fff; padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; }
        .btn-save { background: #059669; color: #fff; padding: 10px 25px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .btn-save:disabled { background: #9ca3af; cursor: not-allowed; }
        .btn-print { background: #7c3aed; color: #fff; padding: 10px 25px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .btn-cancel { background: #ef4444; color: #fff; padding: 10px 25px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
        .badge-custom { background: #8b5cf6; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; margin-right: 5px; }
        .badge-barcode { background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: monospace; }
        .badge-batch { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: monospace; }
        .table-container { overflow-x: auto; background: #fff; border-radius: 8px; padding: 15px; border: 1px solid #e5e7eb; }
        .table-container table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table-container th { background: #f9fafb; color: #1e40af; padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; white-space: nowrap; font-weight: 700; }
        .table-container td { padding: 8px 12px; text-align: center; border: 1px solid #e5e7eb; color: #111827; }
        .table-container tbody tr:hover { background: #f9fafb; }
        .table-container tfoot td { font-weight: bold; background: #f9fafb; }
        .action-buttons { display: flex; gap: 10px; justify-content: center; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .prescriptions-list-container { margin-top: 30px; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
        .btn-refresh { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .empty-state { text-align: center; padding: 40px 20px; color: #6b7280; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; }
        .prescriptions-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .prescriptions-table thead th { background: #eff6ff; color: #1e40af; padding: 10px 8px; text-align: center; border: 1px solid #dbeafe; font-weight: 700; font-size: 12px; }
        .pres-main-row td { padding: 10px 8px; text-align: center; border: 1px solid #e5e7eb; background: #fff; }
        .pres-main-row:hover td { background: #f9fafb; }
        .pres-num-inline { font-weight: bold; color: #1e40af; font-size: 14px; }
        .items-count { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 10px; font-weight: bold; font-size: 12px; }
        .td-ellipsis { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; display: inline-block; }
        .btn-toggle-row { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        .row-actions { display: flex; gap: 4px; align-items: center; justify-content: center; flex-wrap: wrap; }
        .btn-action { padding: 5px 8px; border-radius: 5px; border: 1px solid; cursor: pointer; font-size: 12px; background: #fff; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-edit { color: #2563eb; border-color: #bfdbfe; }
        .btn-print-sm { color: #7c3aed; border-color: #ddd6fe; }
        .btn-sync { color: #047857; border-color: #a7f3d0; }
        .btn-delete-sm { color: #dc2626; border-color: #fecaca; }
        .status-select-inline { padding: 5px 6px; border-radius: 5px; border: 1px solid #d1d5db; font-size: 11px; cursor: pointer; }
        .pres-detail-row td { padding: 0; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
        .detail-wrapper { padding: 15px 20px; }
        .detail-items-title { font-weight: bold; color: #1e40af; margin-bottom: 8px; font-size: 13px; }
        .detail-items-table { width: 100%; border-collapse: collapse; font-size: 12px; background: #fff; border-radius: 6px; overflow: hidden; }
        .detail-items-table th { background: #dbeafe; color: #1e40af; padding: 8px 10px; text-align: center; border: 1px solid #bfdbfe; font-weight: 700; font-size: 11px; }
        .detail-items-table td { padding: 7px 10px; text-align: center; border: 1px solid #e5e7eb; }
        .detail-items-table tbody tr:hover { background: #f9fafb; }
      `}</style>
    </MainLayoutjur>
  );
}