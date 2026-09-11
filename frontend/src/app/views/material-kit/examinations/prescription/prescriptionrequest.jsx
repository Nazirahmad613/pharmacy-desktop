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
      console.log(`🔍 دریافت patient_id از سرور برای reg_id=${regIdValue}`);
      const res = await api.get(`/registrations/${regIdValue}`);
      const data = res.data?.data ?? res.data;
      console.log("📥 پاسخ سرور registrations:", data);

      const pid =
        data?.patient_id ||
        data?.patient?.id ||
        data?.patient?.patient_id ||
        data?.registration?.patient_id ||
        null;

      console.log("✅ patient_id از سرور:", pid);
      return pid;
    } catch (err) {
      console.error("❌ خطا در دریافت patient_id از سرور:", err);
      return null;
    }
  };

  // ========== مقداردهی اولیه ==========
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      const effectiveRegId = regId || registration?.reg_id;

      // ========== 🔍 لاگ کامل ==========
      console.group("🔍 [PrescriptionForm] دیباگ مقداردهی اولیه");
      console.log("📌 regId prop:", regId);
      console.log("📌 registration prop:", registration);
      console.log("📌 effectiveRegId:", effectiveRegId);

      const rawStored = sessionStorage.getItem("selectedPatient");
      console.log("📌 sessionStorage.selectedPatient (خام):", rawStored);

      let storedPatient = null;
      if (rawStored) {
        try {
          storedPatient = JSON.parse(rawStored);
          console.log("📌 storedPatient (parsed):", storedPatient);
          console.log("   ├─ patient_id:", storedPatient?.patient_id);
          console.log("   ├─ reg_id:", storedPatient?.reg_id);
          console.log("   ├─ id:", storedPatient?.id);
          console.log("   ├─ full_name:", storedPatient?.full_name);
          console.log("   └─ name:", storedPatient?.name);
        } catch (e) {
          console.error("❌ خطا در parse کردن storedPatient:", e);
        }
      } else {
        console.warn("⚠️ sessionStorage.selectedPatient وجود ندارد!");
      }

      console.log("📌 کلیدهای sessionStorage:", Object.keys(sessionStorage));
      console.groupEnd();

      if (registration) {
        const patient = registration.patient || registration;

        console.group("🔍 [PrescriptionForm] ساختار registration");
        console.log("📌 registration.patient_id:", registration.patient_id);
        console.log("📌 registration.reg_id:", registration.reg_id);
        console.log("📌 patient.patient_id:", patient?.patient_id);
        console.log("📌 patient.id:", patient?.id);
        console.groupEnd();

        // ✅ 1) تلاش از منابع محلی
        let resolvedPatientId =
          patient?.patient_id ||
          registration?.patient_id ||
          storedPatient?.patient_id ||
          storedPatient?.id ||
          null;

        // ✅ 2) اگر null بود، از سرور بگیر
        if (!resolvedPatientId && effectiveRegId) {
          console.log("⚠️ patient_id در منابع محلی نبود — از سرور می‌گیریم");
          resolvedPatientId = await fetchPatientIdFromServer(effectiveRegId);
        }

        const patientInfo = {
          reg_id: effectiveRegId,
          patient_id: resolvedPatientId,
          full_name:
            `${patient?.first_name || ""} ${patient?.last_name || ""}`.trim() ||
            patient?.full_name ||
            patient?.name ||
            storedPatient?.full_name ||
            "نامشخص",
          age: patient?.age || registration.age || storedPatient?.age || "-",
          gender:
            patient?.gender === "male"
              ? "مرد"
              : patient?.gender === "female"
              ? "زن"
              : patient?.gender || storedPatient?.gender || "-",
          phone:
            patient?.phone ||
            patient?.mobile ||
            registration.phone ||
            storedPatient?.phone ||
            "-",
          tazkira_number:
            patient?.national_id ||
            patient?.tazkira_number ||
            registration.tazkira_number ||
            storedPatient?.tazkira_number ||
            "-",
          blood_group:
            patient?.blood_group ||
            registration.blood_group ||
            storedPatient?.blood_group ||
            "-",
          diagnosis:
            registration.diagnosis ||
            patient?.diagnosis ||
            storedPatient?.diagnosis ||
            "-",
          weight:
            registration.weight ??
            patient?.weight ??
            storedPatient?.weight ??
            null,
          blood_pressure:
            registration.blood_pressure ||
            patient?.blood_pressure ||
            storedPatient?.blood_pressure ||
            "-",
          temperature:
            registration.temperature ??
            patient?.temperature ??
            storedPatient?.temperature ??
            null,
          oxygen:
            registration.oxygen ??
            patient?.oxygen ??
            storedPatient?.oxygen ??
            null
        };

        console.log("✅ [PrescriptionForm] patientInfo نهایی:", patientInfo);
        console.log(
          "   └─ patient_id نهایی:",
          patientInfo.patient_id,
          patientInfo.patient_id ? "✅" : "❌ خالی!"
        );

        setPatientData(patientInfo);
      } else if (storedPatient) {
        console.group("🔍 [PrescriptionForm] فقط از sessionStorage");
        console.log("📌 storedPatient.patient_id:", storedPatient.patient_id);
        console.log("📌 storedPatient.id:", storedPatient.id);
        console.log("📌 storedPatient.reg_id:", storedPatient.reg_id);
        console.groupEnd();

        const regIdForFetch =
          storedPatient.reg_id || storedPatient.id || effectiveRegId;

        // ✅ تلاش از منابع محلی
        let resolvedPatientId =
          storedPatient.patient_id ||
          storedPatient.id ||
          null;

        // ✅ اگر null بود، از سرور بگیر
        if (!resolvedPatientId && regIdForFetch) {
          console.log("⚠️ patient_id در storedPatient نبود — از سرور می‌گیریم");
          resolvedPatientId = await fetchPatientIdFromServer(regIdForFetch);
        }

        setPatientData({
          ...storedPatient,
          reg_id: regIdForFetch,
          patient_id: resolvedPatientId,
          full_name:
            storedPatient.full_name || storedPatient.name || "نامشخص",
          age: storedPatient.age || "-",
          gender:
            storedPatient.gender === "male"
              ? "مرد"
              : storedPatient.gender === "female"
              ? "زن"
              : storedPatient.gender || "-"
        });
      } else {
        console.error(
          "❌ [PrescriptionForm] نه registration داریم نه storedPatient!"
        );
      }

      setPrescriptionDate(new Date().toISOString().slice(0, 10));

      await Promise.all([loadMedications(), loadCategories()]);

      setLoading(false);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration, regId]);

  // ========== 🔍 لاگ patientData ==========
  useEffect(() => {
    if (patientData) {
      console.group("🔍 [PrescriptionForm] patientData تغییر کرد");
      console.log("📌 patientData.patient_id:", patientData.patient_id);
      console.log("📌 patientData.reg_id:", patientData.reg_id);
      console.log("📌 patientData.full_name:", patientData.full_name);
      console.groupEnd();
    }
  }, [patientData]);

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

  // ========== دریافت حمایت‌کننده‌ها ==========
  const loadSuppliersForMedication = async (medId) => {
    if (!medId) {
      setSuppliers([]);
      return;
    }

    setLoadingSuppliers(true);
    setSuppliers([]);

    try {
      const url = `/prescriptions/medication/${medId}/suppliers`;
      const res = await api.get(url);

      let list = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res.data?.data)) list = res.data.data;
      else if (res.data?.data && typeof res.data.data === "object")
        list = res.data.data;

      setSuppliers(list);

      if (list.length === 0) {
        toast.warning("⚠️ هیچ حمایت‌کننده‌ای برای این دارو یافت نشد");
      }
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
        setStockAvailability({
          available: true,
          totalStock: 0,
          message: "",
          checking: false
        });
        return;
      }

      if (
        !formItem.med_id ||
        !formItem.supplier_id ||
        !formItem.quantity ||
        Number(formItem.quantity) <= 0
      ) {
        setStockAvailability({
          available: false,
          totalStock: 0,
          message: "",
          checking: false
        });
        return;
      }

      setStockAvailability((prev) => ({ ...prev, checking: true }));

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
  }, [
    formItem.med_id,
    formItem.supplier_id,
    formItem.quantity,
    formItem.type,
    formItem.is_custom,
    api
  ]);

  // ========== مدیریت تغییر ==========
  const handleChange = (field, value) => {
    let updated = { ...formItem, [field]: value };

    if (field === "category_id") {
      updated.med_id = "";
      updated.supplier_id = "";
      updated.type = "";
      setSuppliers([]);
      setStockAvailability({
        available: false,
        totalStock: 0,
        message: "",
        checking: false
      });
    }

    if (field === "med_id") {
      const med = medications.find((m) => Number(m.med_id) === Number(value));
      updated.type = med?.type ?? "";
      updated.supplier_id = "";
      setStockAvailability({
        available: false,
        totalStock: 0,
        message: "",
        checking: false
      });
    }

    if (field === "supplier_id") {
      setStockAvailability({
        available: false,
        totalStock: 0,
        message: "",
        checking: false
      });
    }

    setFormItem(updated);
  };

  // ========== افزودن آیتم ==========
  const handleAddItem = () => {
    if (formItem.is_custom) {
      if (!formItem.custom_name.trim()) {
        toast.error("❌ لطفاً نام دارو را وارد کنید");
        return;
      }
      if (!formItem.category_id) {
        toast.error("❌ لطفاً کتگوری را انتخاب کنید");
        return;
      }
      if (!formItem.custom_supplier_name.trim()) {
        toast.error("❌ لطفاً نام حمایت‌کننده را وارد کنید");
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

    const med = medications.find(
      (m) => Number(m.med_id) === Number(formItem.med_id)
    );
    const cat = categories.find(
      (c) => Number(c.category_id) === Number(formItem.category_id)
    );

    let supplierName = "-";
    if (formItem.is_custom) {
      supplierName = formItem.custom_supplier_name.trim() || "-";
    } else {
      const sup = suppliers.find(
        (s) => Number(s.reg_id) === Number(formItem.supplier_id)
      );
      supplierName = sup?.full_name ?? sup?.name ?? sup?.reg_name ?? "-";
    }

    const newItem = {
      ...formItem,
      id: Date.now() + Math.random(),
      med_name: formItem.is_custom
        ? formItem.custom_name.trim()
        : med?.gen_name ?? "-",
      med_type: formItem.is_custom
        ? formItem.custom_type || "سایر"
        : med?.type ?? "-",
      category_name: cat?.category_name ?? "-",
      supplier_name: supplierName
    };

    setPrescriptionItems([...prescriptionItems, newItem]);

    setFormItem({
      ...emptyItem,
      category_id: formItem.category_id
    });
    setSuppliers([]);
    setStockAvailability({
      available: false,
      totalStock: 0,
      message: "",
      checking: false
    });

    toast.success("✅ دارو با موفقیت اضافه شد");
  };

  const handleRemoveItem = (id) => {
    setPrescriptionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAddItem();
  };

  // ========== ذخیره نسخه ==========
  const handleSavePrescription = async () => {
    console.group("🔍 [PrescriptionForm] شروع ذخیره نسخه");

    if (!patientData) {
      console.error("❌ patientData خالی است!");
      toast.error("❌ لطفاً یک مریض انتخاب کنید");
      console.groupEnd();
      return;
    }

    console.log("📌 patientData کامل:", patientData);
    console.log("📌 patientData.patient_id:", patientData.patient_id);
    console.log("📌 patientData.reg_id:", patientData.reg_id);

    let patientId = patientData.patient_id;
    const regIdValue = patientData.reg_id;

    // ✅ اگر patient_id نبود، یک‌بار دیگر از سرور بگیر
    if (!patientId && regIdValue) {
      console.warn("⚠️ patient_id خالی است — تلاش دوباره از سرور");
      patientId = await fetchPatientIdFromServer(regIdValue);
      if (patientId) {
        console.log("✅ patient_id از سرور گرفته شد:", patientId);
        setPatientData((prev) => ({ ...prev, patient_id: patientId }));
      }
    }

    if (!patientId) {
      console.error("❌ patient_id یافت نشد!");
      toast.error(
        "❌ شناسه اصلی مریض (patient_id) یافت نشد. لطفاً تب مریض را دوباره باز کنید."
      );
      console.groupEnd();
      return;
    }

    if (!regIdValue) {
      console.error("❌ reg_id یافت نشد!");
      toast.error("❌ شناسه مراجعه یافت نشد");
      console.groupEnd();
      return;
    }

    if (prescriptionItems.length === 0) {
      console.error("❌ آیتمی برای ذخیره وجود ندارد");
      toast.error("❌ حداقل یک دارو باید تجویز شود");
      console.groupEnd();
      return;
    }

    const presDate =
      prescriptionDate || new Date().toISOString().slice(0, 10);

    const payload = {
      patient_id: Number(patientId),
      reg_id: Number(regIdValue),
      pres_date: presDate,

      patient_name: patientData.full_name !== "-" ? patientData.full_name : null,
      tazkira_number:
        patientData.tazkira_number !== "-"
          ? patientData.tazkira_number
          : null,
      patient_age:
        patientData.age && patientData.age !== "-"
          ? parseInt(patientData.age, 10) || null
          : null,
      patient_gender:
        patientData.gender !== "-" ? patientData.gender : null,
      patient_phone:
        patientData.phone !== "-" ? patientData.phone : null,
      patient_blood_group:
        patientData.blood_group !== "-" ? patientData.blood_group : null,

      diagnosis:
        patientData.diagnosis !== "-" ? patientData.diagnosis : null,
      weight:
        patientData.weight !== null && patientData.weight !== "-"
          ? Number(patientData.weight)
          : null,
      blood_pressure:
        patientData.blood_pressure !== "-"
          ? patientData.blood_pressure
          : null,
      temperature:
        patientData.temperature !== null && patientData.temperature !== "-"
          ? Number(patientData.temperature)
          : null,
      oxygen:
        patientData.oxygen !== null && patientData.oxygen !== "-"
          ? parseInt(patientData.oxygen, 10)
          : null,

      items: prescriptionItems.map((item) => ({
        category_id: item.category_id ? Number(item.category_id) : null,
        is_custom: item.is_custom || false,
        med_id: item.is_custom ? null : Number(item.med_id),
        supplier_id: item.is_custom ? null : Number(item.supplier_id),
        med_name: item.is_custom
          ? (item.custom_name?.trim() || item.med_name || null)
          : null,
        supplier_name: item.is_custom
          ? (item.custom_supplier_name?.trim() || item.supplier_name || null)
          : null,
        type: item.med_type || null,
        dosage: item.dosage,
        quantity: Number(item.quantity),
        remarks: item.remarks || null
      }))
    };

    console.log("📤 payload نهایی:", payload);

    try {
      if (editingId) {
        const res = await api.put(`/prescriptions/${editingId}`, payload);
        console.log("✅ پاسخ PUT:", res.data);
        toast.success("✅ نسخه با موفقیت بروزرسانی شد");
        setEditingId(null);
      } else {
        const res = await api.post("/prescriptions", payload);
        console.log("✅ پاسخ POST:", res.data);

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
      console.error("❌ خطا در ذخیره نسخه:", error);
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

    console.groupEnd();
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
      pres_num: prescriptionNumber || "-",
      date: prescriptionDate,
      patient_name: patientData?.full_name || "-",
      patient_age: patientData?.age || "-",
      patient_gender: patientData?.gender || "-",
      patient_phone: patientData?.phone || "-",
      tazkira_number: patientData?.tazkira_number || "-",
      blood_group: patientData?.blood_group || "-",
      diagnosis: patientData?.diagnosis || "-",
      weight: patientData?.weight ?? "-",
      blood_pressure: patientData?.blood_pressure || "-",
      temperature: patientData?.temperature ?? "-",
      oxygen: patientData?.oxygen ?? "-",
      doctor_name: user?.name || user?.full_name || "-",
      items: prescriptionItems
    };

    setPrescriptionPrintData(printData);
    setIsPrintReady(true);
  };

  const handleCancel = () => {
    setPrescriptionItems([]);
    setFormItem(emptyItem);
    setSuppliers([]);
    setStockAvailability({
      available: false,
      totalStock: 0,
      message: "",
      checking: false
    });
    if (onComplete) {
      onComplete();
    }
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
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                نام مریض
              </span>
              <span style={{ color: "#111827", fontWeight: "bold" }}>
                {patientData.full_name}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                شناسه مریض
              </span>
              <span
                style={{
                  color: patientData.patient_id ? "#059669" : "#dc2626",
                  fontWeight: "bold"
                }}
              >
                {patientData.patient_id || "❌ یافت نشد"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                شماره مراجعه
              </span>
              <span style={{ color: "#b45309", fontWeight: "bold" }}>
                {patientData.reg_id || "-"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                سن
              </span>
              <span style={{ color: "#111827" }}>
                {patientData.age ? `${patientData.age} سال` : "-"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                جنسیت
              </span>
              <span style={{ color: "#111827" }}>
                {patientData.gender || "-"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                تشخیص
              </span>
              <span style={{ color: "#111827" }}>
                {patientData.diagnosis || "-"}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                شماره نسخه
              </span>
              <span style={{ color: "#059669", fontWeight: "bold" }}>
                {prescriptionNumber || "— پس از ثبت —"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== فرم اصلی ===== */}
      <div className="form-container">
        <h3 style={{ color: "#059669", marginBottom: "15px" }}>📝 ثبت نسخه</h3>

        <div
          style={{
            marginTop: "20px",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "20px"
          }}
        >
          <h4 style={{ color: "#2563eb", marginBottom: "12px" }}>
            ➕ افزودن دارو
          </h4>

          <div className="form-grid" onKeyDown={handleKeyDown}>
            <div style={{ gridColumn: "1 / -1", marginBottom: "10px" }}>
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#111827"
                  }}
                >
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={!formItem.is_custom}
                    onChange={() => {
                      setFormItem({
                        ...emptyItem,
                        is_custom: false,
                        category_id: formItem.category_id
                      });
                      setSuppliers([]);
                      setStockAvailability({
                        available: false,
                        totalStock: 0,
                        message: "",
                        checking: false
                      });
                    }}
                  />
                  <span>📦 انتخاب از داروهای موجود</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#111827"
                  }}
                >
                  <input
                    type="radio"
                    name="prescriptionType"
                    checked={formItem.is_custom}
                    onChange={() => {
                      setFormItem({
                        ...emptyItem,
                        is_custom: true,
                        category_id: formItem.category_id
                      });
                      setSuppliers([]);
                      setStockAvailability({
                        available: true,
                        totalStock: 0,
                        message: "",
                        checking: false
                      });
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
                onChange={(e) => handleChange("category_id", e.target.value)}
                className="form-input"
              >
                <option value="">انتخاب</option>
                {categories.map((c) => (
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
                    onChange={(e) =>
                      setFormItem({ ...formItem, custom_name: e.target.value })
                    }
                    placeholder="نام دارو را وارد کنید"
                    className="form-input"
                  />
                </div>
                <div>
                  <label>نوع دارو</label>
                  <input
                    type="text"
                    value={formItem.custom_type}
                    onChange={(e) =>
                      setFormItem({ ...formItem, custom_type: e.target.value })
                    }
                    placeholder="مثلاً: قرص، شربت، آمپول"
                    className="form-input"
                  />
                </div>
                <div>
                  <label>حمایت‌کننده *</label>
                  <input
                    type="text"
                    value={formItem.custom_supplier_name}
                    onChange={(e) =>
                      setFormItem({
                        ...formItem,
                        custom_supplier_name: e.target.value
                      })
                    }
                    placeholder="نام حمایت‌کننده را وارد کنید"
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
                    onChange={(e) => handleChange("supplier_id", e.target.value)}
                    disabled={!formItem.med_id || loadingSuppliers}
                    className="form-input"
                    style={{
                      borderColor:
                        formItem.supplier_id &&
                        !stockAvailability.available &&
                        formItem.quantity
                          ? "#dc2626"
                          : "#d1d5db",
                      opacity: !formItem.med_id || loadingSuppliers ? 0.6 : 1,
                      cursor:
                        !formItem.med_id || loadingSuppliers
                          ? "not-allowed"
                          : "pointer"
                    }}
                  >
                    <option value="">
                      {loadingSuppliers
                        ? "⏳ در حال بارگذاری..."
                        : !formItem.med_id
                        ? "ابتدا دارو را انتخاب کنید"
                        : suppliers.length === 0
                        ? "حمایت‌کننده‌ای یافت نشد"
                        : "انتخاب"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.reg_id} value={s.reg_id}>
                        {s.full_name ?? s.name ?? s.reg_name}
                      </option>
                    ))}
                  </select>
                  {!loadingSuppliers &&
                    formItem.med_id &&
                    suppliers.length === 0 && (
                      <small
                        style={{
                          color: "#b45309",
                          display: "block",
                          marginTop: "4px",
                          fontSize: "11px"
                        }}
                      >
                        ⚠️ این دارو در هیچ خریدی ثبت نشده است
                      </small>
                    )}
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
                    !formItem.is_custom &&
                    stockAvailability.message &&
                    !stockAvailability.available
                      ? "#dc2626"
                      : stockAvailability.available
                      ? "#10b981"
                      : "#d1d5db"
                }}
              />
              {!formItem.is_custom && stockAvailability.message && (
                <small
                  style={{
                    color: stockAvailability.available ? "#059669" : "#dc2626",
                    display: "block",
                    marginTop: "4px",
                    fontWeight: "bold"
                  }}
                >
                  {stockAvailability.checking
                    ? "⏳ در حال بررسی موجودی..."
                    : stockAvailability.message}
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

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap"
            }}
          >
            <button type="button" onClick={handleAddItem} className="btn-add">
              ➕ افزودن به نسخه
            </button>
            {formItem.is_custom && (
              <button
                type="button"
                onClick={() => {
                  setFormItem({
                    ...emptyItem,
                    category_id: formItem.category_id
                  });
                  setStockAvailability({
                    available: false,
                    totalStock: 0,
                    message: "",
                    checking: false
                  });
                }}
                className="btn-cancel-custom"
              >
                ❌ لغو ثبت دستی
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: "#6b7280",
              textAlign: "center"
            }}
          >
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
                      {item.is_custom && (
                        <span className="badge-custom">دستی</span>
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
                        className="btn-delete"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "left",
                      fontWeight: "bold",
                      color: "#b45309"
                    }}
                  >
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
            {isSubmitting ? "⏳ در حال ذخیره..." : "💾 ذخیره نسخه"}
          </button>

          {prescriptionItems.length > 0 && (
            <button
              type="button"
              onClick={handlePrintClick}
              className="btn-print"
            >
              🖨️ چاپ نسخه
            </button>
          )}

          <button type="button" onClick={handleCancel} className="btn-cancel">
            ❌ انصراف
          </button>
        </div>
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
        .form-input option {
          color: #111827;
          background: #ffffff;
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
        .btn-add:hover {
          background-color: #2563eb;
        }
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
        .btn-cancel-custom:hover {
          background-color: #4b5563;
        }
        .btn-delete {
          background-color: #dc2626;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-delete:hover {
          background-color: #b91c1c;
        }
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
        .btn-save:hover:not(:disabled) {
          background-color: #047857;
        }
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
        .btn-print:hover {
          background-color: #6d28d9;
        }
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
        .btn-cancel:hover {
          background-color: #dc2626;
        }
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
        .table-container tbody tr:hover {
          background: #f9fafb;
        }
        .table-container tfoot td {
          font-weight: bold;
          background: #f9fafb;
        }
        .action-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      `}</style>
    </MainLayoutjur>
  );
}