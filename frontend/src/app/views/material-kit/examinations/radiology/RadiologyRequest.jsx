import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";

export default function RadiologyRequest({ 
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
  isTreatmentComplete,
  savedRadiology,
  allRadiology,
  isRadiologyRequested,
  setIsRadiologyRequested,
  setAllRadiology,
  hasRadiologyResult = false
}) {
  const [formData, setFormData] = useState({
    radiology_type: '',
    body_part: '',
    reason: '',
    notes: '',
    priority: 'normal',
    request_date: new Date().toISOString().split('T')[0],
    clinical_indication: '',
    special_notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [radiologyList, setRadiologyList] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [editingRadiology, setEditingRadiology] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [barcode, setBarcode] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [loadingRadiology, setLoadingRadiology] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [resultsData, setResultsData] = useState([]);
  // ✅ فیلتر و جستجو برای لیست درخواست‌ها
  const [listFilter, setListFilter] = useState('all');
  const [listSearchTerm, setListSearchTerm] = useState("");
  const printRef = useRef(null);
  const isMounted = useRef(true);
  const loadedRegistrationRef = useRef(null);
  const loadingRequestRef = useRef(false);

  const radiologyTypes = [
    { value: 'xray', label: '📷 رادیوگرافی ساده (X-Ray)', category: 'رادیوگرافی' },
    { value: 'chest_xray', label: '📷 رادیوگرافی قفسه سینه (CXR)', category: 'رادیوگرافی' },
    { value: 'abdominal_xray', label: '📷 رادیوگرافی شکم', category: 'رادیوگرافی' },
    { value: 'spine_xray', label: '📷 رادیوگرافی ستون فقرات', category: 'رادیوگرافی' },
    { value: 'extremity_xray', label: '📷 رادیوگرافی اندام‌ها', category: 'رادیوگرافی' },
    { value: 'ct_scan', label: '📷 سی‌تی اسکن (CT Scan)', category: 'سی‌تی اسکن' },
    { value: 'brain_ct', label: '📷 سی‌تی اسکن مغز', category: 'سی‌تی اسکن' },
    { value: 'chest_ct', label: '📷 سی‌تی اسکن قفسه سینه', category: 'سی‌تی اسکن' },
    { value: 'abdominal_ct', label: '📷 سی‌تی اسکن شکم و لگن', category: 'سی‌تی اسکن' },
    { value: 'spine_ct', label: '📷 سی‌تی اسکن ستون فقرات', category: 'سی‌تی اسکن' },
    { value: 'mri', label: '📷 ام‌آرآی (MRI)', category: 'ام‌آرآی' },
    { value: 'brain_mri', label: '📷 ام‌آرآی مغز', category: 'ام‌آرآی' },
    { value: 'spine_mri', label: '📷 ام‌آرآی ستون فقرات', category: 'ام‌آرآی' },
    { value: 'joint_mri', label: '📷 ام‌آرآی مفاصل', category: 'ام‌آرآی' },
    { value: 'ultrasound', label: '📷 سونوگرافی (اولتراسوند)', category: 'سونوگرافی' },
    { value: 'pelvic_ultrasound', label: '📷 سونوگرافی لگن', category: 'سونوگرافی' },
    { value: 'abdominal_ultrasound', label: '📷 سونوگرافی شکم', category: 'سونوگرافی' },
    { value: 'obstetric_ultrasound', label: '📷 سونوگرافی مامایی', category: 'سونوگرافی' },
    { value: 'vascular_ultrasound', label: '📷 سونوگرافی عروق', category: 'سونوگرافی' },
    { value: 'fluoroscopy', label: '📷 فلوروسکوپی', category: 'فلوروسکوپی' },
    { value: 'mammography', label: '📷 ماموگرافی', category: 'ماموگرافی' },
    { value: 'angiography', label: '📷 آنژیوگرافی', category: 'آنژیوگرافی' },
    { value: 'echocardiography', label: '📷 اکوکاردیوگرافی', category: 'اکوکاردیوگرافی' },
    { value: 'pet_scan', label: '📷 PET Scan', category: 'پت اسکن' },
    { value: 'bone_density', label: '📷 سنجش تراکم استخوان (DEXA)', category: 'تراکم‌سنجی' },
    { value: 'other', label: '📋 سایر', category: 'سایر' },
  ];

  const radiologyTypeLabels = {
    xray: 'رادیوگرافی ساده', chest_xray: 'رادیوگرافی قفسه سینه',
    abdominal_xray: 'رادیوگرافی شکم', spine_xray: 'رادیوگرافی ستون فقرات',
    extremity_xray: 'رادیوگرافی اندام‌ها', ct_scan: 'سی‌تی اسکن',
    brain_ct: 'سی‌تی اسکن مغز', chest_ct: 'سی‌تی اسکن قفسه سینه',
    abdominal_ct: 'سی‌تی اسکن شکم و لگن', spine_ct: 'سی‌تی اسکن ستون فقرات',
    mri: 'ام‌آرآی', brain_mri: 'ام‌آرآی مغز', spine_mri: 'ام‌آرآی ستون فقرات',
    joint_mri: 'ام‌آرآی مفاصل', ultrasound: 'سونوگرافی',
    pelvic_ultrasound: 'سونوگرافی لگن', abdominal_ultrasound: 'سونوگرافی شکم',
    obstetric_ultrasound: 'سونوگرافی مامایی', vascular_ultrasound: 'سونوگرافی عروق',
    fluoroscopy: 'فلوروسکوپی', mammography: 'ماموگرافی',
    angiography: 'آنژیوگرافی', echocardiography: 'اکوکاردیوگرافی',
    pet_scan: 'PET Scan', bone_density: 'سنجش تراکم استخوان', other: 'سایر',
  };

  const priorityLabels = {
    normal: '🟢 عادی', urgent: '🟡 فوری', emergency: '🔴 اورژانسی'
  };

  const priorityColors = {
    normal: '#10b981', urgent: '#f59e0b', emergency: '#ef4444'
  };

  const statusLabels = {
    pending: 'در انتظار', scheduled: 'برنامه‌ریزی شده', in_progress: 'در حال انجام',
    completed: 'تکمیل شده', cancelled: 'لغو شده', rejected: 'رد شده',
    sent_to_radiology: 'ارسال به رادیولوژی'
  };

  const statusColors = {
    pending: '#f59e0b', scheduled: '#3b82f6', in_progress: '#8b5cf6',
    completed: '#10b981', cancelled: '#6b7280', rejected: '#ef4444',
    sent_to_radiology: '#8b5cf6'
  };

  const resultStatusLabels = {
    'Draft': 'پیش‌نویس',
    'Completed': 'تکمیل شده',
    'Verified': 'تأیید شده',
    'Delivered': 'تحویل شده',
    'Cancelled': 'لغو شده'
  };

  const resultStatusColors = {
    'Draft': '#f59e0b',
    'Completed': '#10b981',
    'Verified': '#3b82f6',
    'Delivered': '#8b5cf6',
    'Cancelled': '#ef4444'
  };

  const bodyParts = [
    'سر', 'مغز', 'صورت', 'گردن', 'سینه', 'قفسه سینه', 'شکم', 'لگن',
    'کمر', 'ستون فقرات', 'دست چپ', 'دست راست', 'پای چپ', 'پای راست',
    'زانو', 'شانه', 'مچ پا', 'مچ دست', 'آرنج', 'لگن خاصره', 'مهره‌ها'
  ];

  // ============ Styles ============
  const styles = {
    container: { padding: "8px" },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
      borderRadius: "10px",
    },
    statBox: { textAlign: "center" },
    statValue: { fontSize: "20px", fontWeight: "bold" },
    statLabel: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
    infoCard: {
      background: "white",
      borderRadius: "10px",
      padding: "15px 20px",
      marginBottom: "15px",
      border: "1px solid #e5e7eb",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: "10px 15px",
    },
    infoLabel: { color: "#6b7280", fontSize: "11px", display: "block", marginBottom: "3px" },
    infoValue: { color: "#1f2937", fontWeight: "bold", fontSize: "14px" },
    sectionTitle: {
      color: "#1f2937",
      marginBottom: "15px",
      borderBottom: "2px solid #e5e7eb",
      paddingBottom: "10px",
      fontSize: "16px",
      fontWeight: "bold",
    },
    card: {
      background: "white",
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "20px",
      border: "1px solid #e5e7eb",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "15px",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
      background: "white",
      color: "#1f2937",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#374151",
      fontWeight: "bold",
      marginBottom: "6px",
      marginTop: "8px",
    },
    btn: {
      padding: "6px 12px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
      marginRight: "4px",
    },
    // ✅ فیلترها و جستجو (مطابق PharmacyFeeTab)
    filters: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    filterBtn: {
      padding: "8px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      background: "white",
      transition: "all 0.2s",
    },
    searchInput: {
      padding: "8px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "250px",
      flex: 1,
      background: "white",
      color: "#1f2937",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
      background: "white",
      borderRadius: "10px",
      overflow: "hidden",
    },
    th: {
      padding: "12px",
      textAlign: "right",
      background: "#f9fafb",
      color: "#374151",
      fontSize: "13px",
      fontWeight: "bold",
      borderBottom: "2px solid #e5e7eb",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #f3f4f6",
      color: "#1f2937",
    },
    modal: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      padding: "16px",
    },
    modalContent: {
      background: "white",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "700px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    resultCard: {
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      padding: "15px",
      transition: "all 0.3s",
    },
    badge: {
      padding: "3px 10px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "bold",
      color: "white",
      display: "inline-block",
    },
  };

  useEffect(() => {
    const regId = registration?.reg_id;
    if (!regId || !api) return;

    let cancelled = false;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/registrations/${regId}`);
        if (cancelled || !isMounted.current) return;

        const data = response.data?.data || response.data;
        setPatientInfo(data);

        if (data?.barcode) {
          setBarcode(data.barcode);
        } else if (data?.patient?.barcode) {
          setBarcode(data.patient.barcode);
        }

        setIsCompleted(data?.visit_status === 'Completed');
        setConnectionError(false);
      } catch (err) {
        if (cancelled || !isMounted.current) return;
        console.error("خطا در دریافت اطلاعات مریض:", err);

        if (err.code === 'ERR_NETWORK') {
          setConnectionError(true);
        }
      }
    };

    fetchPatientInfo();

    return () => {
      cancelled = true;
    };
  }, [registration?.reg_id, api]);

  useEffect(() => {
    if (!isMounted.current || !Array.isArray(allRadiology)) return;
    
    setRadiologyList(allRadiology);

    const firstWithBarcode = allRadiology.find(item => item?.barcode);
    if (firstWithBarcode?.barcode) {
      setBarcode(firstWithBarcode.barcode);
    }

    const resultItems = allRadiology.filter(
      item => item?.has_result === true && item?.result_details
    );

    setHasResults(resultItems.length > 0);
    setResultsData(resultItems);
  }, [allRadiology]);

  const loadRadiologyFromServer = useCallback(async (force = false) => {
    const regId = registration?.reg_id;

    if (!regId || !api || !isMounted.current) {
      console.log('⚠️ No registration ID/API available');
      return;
    }

    if (loadingRequestRef.current) {
      console.log('⏳ Radiology request is already loading');
      return;
    }

    if (!force && loadedRegistrationRef.current === regId) {
      console.log('✅ Radiology already loaded for registration:', regId);
      return;
    }

    loadingRequestRef.current = true;
    setLoadingRadiology(true);

    try {
      const url = `/radiology-requests/registration/${regId}/full`;
      console.log('📥 Loading full radiology from:', url);

      const response = await api.get(url);

      if (!isMounted.current) return;

      console.log('📥 Full Response:', response.data);

      let radiologyData = [];
      let resultsFromResponse = [];
      const data = response.data?.data;

      if (response.data?.success) {
        if (Array.isArray(data?.all_radiology)) {
          radiologyData = data.all_radiology;
        } else if (Array.isArray(data?.radiology)) {
          radiologyData = data.radiology;
        } else if (Array.isArray(data)) {
          radiologyData = data;
        }

        if (Array.isArray(data?.results)) {
          resultsFromResponse = data.results;
        }
      }

      const processedData = radiologyData.map(item => {
        if (item.result) {
          return {
            ...item,
            has_result: true,
            result_details: item.result
          };
        }
        if (item.result_details) {
          return {
            ...item,
            has_result: true,
            result_details: item.result_details
          };
        }
        if (item.radiology_result) {
          return {
            ...item,
            has_result: true,
            result_details: item.radiology_result
          };
        }
        return item;
      });

      console.log(`✅ Loaded ${processedData.length} radiology from server`);

      setRadiologyList(processedData);

      const firstWithBarcode = processedData.find(item => item?.barcode);
      if (firstWithBarcode?.barcode) {
        setBarcode(firstWithBarcode.barcode);
      } else if (data?.barcode) {
        setBarcode(data.barcode);
      }

      const resultItems = processedData.filter(
        item => item?.has_result === true && item?.result_details
      );

      const finalResults = resultsFromResponse.length > 0 ? resultsFromResponse : resultItems;

      setHasResults(finalResults.length > 0);
      setResultsData(finalResults);

      loadedRegistrationRef.current = regId;
      setConnectionError(false);

      if (!response.data?.success && response.data?.message) {
        toast.error(`❌ ${response.data.message}`);
      }
    } catch (err) {
      if (!isMounted.current) return;

      console.error("❌ Error loading radiology:", err);

      if (err.code === 'ERR_NETWORK') {
        setConnectionError(true);
        return;
      }

      if (err.response?.status !== 404) {
        toast.error(
          `❌ خطا در بارگذاری رادیولوژی‌ها: ${
            err.response?.data?.message || err.message
          }`
        );
      }

      setRadiologyList([]);
      setHasResults(false);
      setResultsData([]);

      loadedRegistrationRef.current = regId;
    } finally {
      loadingRequestRef.current = false;
      if (isMounted.current) {
        setLoadingRadiology(false);
      }
    }
  }, [registration?.reg_id, api]);

  useEffect(() => {
    const regId = registration?.reg_id;

    if (!regId) {
      loadedRegistrationRef.current = null;
      setRadiologyList([]);
      setResultsData([]);
      setHasResults(false);
      return;
    }

    if (loadedRegistrationRef.current !== regId) {
      if (Array.isArray(allRadiology) && allRadiology.length > 0) {
        loadedRegistrationRef.current = regId;
      } else {
        loadRadiologyFromServer(false);
      }
    }
  }, [registration?.reg_id, loadRadiologyFromServer]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      loadingRequestRef.current = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      radiology_type: '',
      body_part: '',
      reason: '',
      notes: '',
      priority: 'normal',
      request_date: new Date().toISOString().split('T')[0],
      clinical_indication: '',
      special_notes: '',
    });
  };

  const extractRadiologyData = (data) => {
    if (Array.isArray(data?.all_radiology)) return data.all_radiology;
    if (Array.isArray(data?.radiology)) return data.radiology;
    if (Array.isArray(data)) return data;
    return [];
  };

  const applyRadiologyData = (data) => {
    const radiologyData = extractRadiologyData(data);
    let resultsFromResponse = [];

    if (data?.results && Array.isArray(data.results)) {
      resultsFromResponse = data.results;
    }

    const processedData = radiologyData.map(item => {
      if (item.result) {
        return {
          ...item,
          has_result: true,
          result_details: item.result
        };
      }
      if (item.result_details) {
        return {
          ...item,
          has_result: true,
          result_details: item.result_details
        };
      }
      if (item.radiology_result) {
        return {
          ...item,
          has_result: true,
          result_details: item.radiology_result
        };
      }
      return item;
    });

    setRadiologyList(processedData);

    const firstWithBarcode = processedData.find(item => item?.barcode);
    if (firstWithBarcode?.barcode) {
      setBarcode(firstWithBarcode.barcode);
    }

    const resultItems = processedData.filter(
      item => item?.has_result === true && item?.result_details
    );

    const finalResults = resultsFromResponse.length > 0 ? resultsFromResponse : resultItems;

    setHasResults(finalResults.length > 0);
    setResultsData(finalResults);

    return processedData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.radiology_type) {
      toast.warning("⚠️ لطفاً نوع رادیولوژی را انتخاب کنید");
      return;
    }

    if (!formData.body_part) {
      toast.warning("⚠️ لطفاً بخش مورد نظر را مشخص کنید");
      return;
    }

    if (!formData.reason) {
      toast.warning("⚠️ لطفاً دلیل درخواست را وارد کنید");
      return;
    }

    if (!registration?.reg_id) {
      toast.error("❌ اطلاعات مراجعه معتبر نیست");
      return;
    }

    setIsSubmittingForm(true);
    setLoading(true);

    try {
      const url = `/radiology-requests/registration/${registration.reg_id}`;

      const payload = {
        radiology_type: formData.radiology_type,
        body_part: formData.body_part,
        reason: formData.reason,
        notes: formData.notes || null,
        priority: formData.priority || 'normal',
        request_date:
          formData.request_date || new Date().toISOString().split('T')[0],
        clinical_indication: formData.clinical_indication || null,
        special_notes: formData.special_notes || null,
      };

      console.log('📤 Sending payload:', payload);

      const response = await api.post(url, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      console.log('✅ Store Response:', response.data);

      if (!response.data?.success) {
        toast.error(`❌ خطا: ${response.data?.message || 'ثبت ناموفق بود'}`);
        return;
      }

      const data = response.data.data;
      const radiologyData = applyRadiologyData(data);

      const requestBarcode =
        data?.radiology_request?.barcode ||
        radiologyData.find(item => item?.barcode)?.barcode;

      if (requestBarcode) {
        setBarcode(requestBarcode);
      }

      if (setIsRadiologyRequested) {
        setIsRadiologyRequested(radiologyData.length > 0);
      }

      if (setAllRadiology) {
        setAllRadiology(radiologyData);
      }

      loadedRegistrationRef.current = registration.reg_id;

      const radiologyLabel =
        radiologyTypeLabels[formData.radiology_type] ||
        formData.radiology_type;

      toast.success(
        `✅ درخواست "${radiologyLabel}" با موفقیت ثبت شد و به بخش رادیولوژی ارسال گردید`
      );

      resetForm();

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("❌ خطا:", err);

      if (err.code === 'ERR_NETWORK') {
        toast.error("❌ خطای شبکه - سرور پاسخ نمی‌دهد");
        setConnectionError(true);
      } else if (err.response?.status === 422) {
        const errors = err.response?.data?.errors || {};
        Object.keys(errors).forEach(key => {
          const message = Array.isArray(errors[key])
            ? errors[key][0]
            : errors[key];
          toast.error(`❌ ${key}: ${message}`);
        });
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا در ارسال به رادیولوژی: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setIsSubmittingForm(false);
    }
  };

  const handleEditRadiology = (item) => {
    setEditingRadiology(item);
    setFormData({
      radiology_type: item.radiology_type || '',
      body_part: item.body_part || '',
      reason: item.reason || '',
      notes: item.notes || '',
      priority: item.priority || 'normal',
      request_date:
        item.request_date || new Date().toISOString().split('T')[0],
      clinical_indication: item.clinical_indication || '',
      special_notes: item.special_notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateRadiology = async () => {
    if (!editingRadiology) return;

    setLoading(true);

    try {
      const response = await api.put(
        `/radiology-requests/${editingRadiology.id}`,
        {
          radiology_type: formData.radiology_type,
          body_part: formData.body_part,
          reason: formData.reason,
          notes: formData.notes,
          priority: formData.priority,
          request_date: formData.request_date,
          clinical_indication: formData.clinical_indication,
          special_notes: formData.special_notes,
        }
      );

      if (!response.data?.success) {
        toast.error(
          `❌ خطا: ${response.data?.message || 'ویرایش ناموفق بود'}`
        );
        return;
      }

      const data = response.data.data;
      const radiologyData = applyRadiologyData(data);

      if (setIsRadiologyRequested) {
        setIsRadiologyRequested(radiologyData.length > 0);
      }

      if (setAllRadiology) {
        setAllRadiology(radiologyData);
      }

      loadedRegistrationRef.current = registration?.reg_id ?? null;

      toast.success("✅ درخواست رادیولوژی با موفقیت ویرایش شد");
      setShowEditModal(false);
      setEditingRadiology(null);
      resetForm();

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("❌ خطا در ویرایش رادیولوژی:", err);
      toast.error(
        `❌ خطا در ویرایش رادیولوژی: ${
          err.response?.data?.message || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRadiology = async (id) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این درخواست رادیولوژی را حذف کنید؟")) {
      return;
    }

    try {
      const response = await api.delete(`/radiology-requests/${id}`);

      if (!response.data?.success) {
        toast.error(
          `❌ خطا: ${response.data?.message || 'حذف ناموفق بود'}`
        );
        return;
      }

      const data = response.data.data;

      if (Array.isArray(data)) {
        const radiologyData = applyRadiologyData(data);

        if (setIsRadiologyRequested) {
          setIsRadiologyRequested(radiologyData.length > 0);
        }

        if (setAllRadiology) {
          setAllRadiology(radiologyData);
        }

        loadedRegistrationRef.current = registration?.reg_id ?? null;
      } else {
        loadedRegistrationRef.current = null;
        await loadRadiologyFromServer(true);

        if (setIsRadiologyRequested) {
          setIsRadiologyRequested(false);
        }
        if (setAllRadiology && radiologyList.length === 0) {
          setAllRadiology([]);
        }
      }

      toast.success("✅ درخواست رادیولوژی با موفقیت حذف شد");

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("❌ خطا در حذف رادیولوژی:", err);
      toast.error(
        `❌ خطا در حذف رادیولوژی: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printStyles = `
      <style>
        @media print {
          body * { display: none; }
          #print-content, #print-content * { display: block; }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
            direction: rtl;
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .print-patient-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .print-item {
            border-bottom: 1px solid #eee;
            padding: 10px 0;
          }
          .print-item:last-child { border-bottom: none; }
          .print-label { font-weight: bold; color: #333; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    document.body.innerHTML = printStyles + printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handlePrintItem = (item) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد. لطفاً pop-up را فعال کنید.");
      return;
    }

    const patient = patientInfo?.patient || registration?.patient || {};

    const printContent = `
      <html dir="rtl">
        <head>
          <title>درخواست رادیولوژی</title>
          <style>
            body { font-family: 'Tahoma', Arial, sans-serif; padding: 20px; direction: rtl; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin: 15px 0; }
            .info-item { margin: 5px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .signature { margin-top: 30px; border-top: 1px solid #333; padding-top: 10px; }
            .barcode { font-family: monospace; font-size: 20px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📷 درخواست رادیولوژی</h2>
            <p>تاریخ: ${new Date(item.request_date).toLocaleDateString('fa-IR')}</p>
          </div>
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ''} ${patient.last_name || ''}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration?.visit_number || '-'}</span></div>
            <div class="info-item"><span class="label">بارکد:</span> <span class="barcode">${item.barcode || '-'}</span></div>
          </div>
          <h3>📋 اطلاعات درخواست</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>نوع رادیولوژی</td><td>${item.radiology_type_label || item.radiology_type}</td></tr>
            <tr><td>بخش مورد نظر</td><td>${item.body_part || '-'}</td></tr>
            <tr><td>دلیل درخواست</td><td>${item.reason || '-'}</td></tr>
            <tr><td>اولویت</td><td>${priorityLabels[item.priority] || item.priority}</td></tr>
            <tr><td>وضعیت</td><td>${statusLabels[item.status] || item.status || 'نامشخص'}</td></tr>
          </table>
          ${item.has_result && item.result_details ? `
          <h3>📄 نتیجه</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>نتیجه</td><td>${item.result_details.result || '-'}</td></tr>
            <tr><td>یافته‌ها</td><td>${item.result_details.findings || '-'}</td></tr>
            <tr><td>تفسیر</td><td>${item.result_details.interpretation || '-'}</td></tr>
            <tr><td>شماره گزارش</td><td>${item.result_details.report_no || '-'}</td></tr>
            <tr><td>وضعیت نتیجه</td><td>${resultStatusLabels[item.result_details.result_status] || item.result_details.result_status || 'نامشخص'}</td></tr>
          </table>
          ` : ''}
          <div class="signature">
            <p>دکتر: ${item.doctor?.name || '-'}</p>
            <p>امضاء: _________________</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async (radiologyResultId, fileName) => {
    if (!radiologyResultId) {
      toast.error("❌ شناسه نتیجه موجود نیست");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      toast.info("⏳ در حال دانلود فایل...");

      const baseURL = api?.defaults?.baseURL || '';
      const normalizedBaseURL = baseURL.replace(/\/+$/, '');
      const downloadUrl =
        `${normalizedBaseURL}/radiology-results/download/${radiologyResultId}`;

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("❌ نشست شما منقضی شده است. لطفاً مجدداً وارد شوید.");
          return;
        }
        if (response.status === 404) {
          toast.error("❌ فایل یافت نشد");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'result.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success("✅ دانلود با موفقیت انجام شد");
    } catch (error) {
      console.error("❌ خطا:", error);
      toast.error("❌ خطا در دانلود فایل: " + error.message);
    }
  };

  const patient = patientInfo?.patient || registration?.patient || {};
  const isDisabled =
    isCompleted || isTreatmentComplete || isSubmitting || isSubmittingForm;

  const radiologyRequested =
    Boolean(isRadiologyRequested) || radiologyList.length > 0;

  const getGenderText = (gender) => {
    if (!gender) return '-';

    const genderMap = {
      male: '♂️ مرد',
      female: '♀️ زن',
      other: '⚧️ دیگر'
    };

    return genderMap[gender] || gender;
  };

  // ✅ فیلتر و جستجوی لیست درخواست‌ها
  const filterAndSearchList = (list) => {
    let filtered = list;

    // فیلتر بر اساس وضعیت
    if (listFilter === 'with_result') {
      filtered = filtered.filter(item => item.has_result && item.result_details);
    } else if (listFilter === 'without_result') {
      filtered = filtered.filter(item => !item.has_result || !item.result_details);
    } else if (listFilter === 'pending') {
      filtered = filtered.filter(item => item.status === 'pending');
    } else if (listFilter === 'completed') {
      filtered = filtered.filter(item => item.status === 'completed');
    } else if (listFilter === 'sent_to_radiology') {
      filtered = filtered.filter(item => item.status === 'sent_to_radiology');
    } else if (listFilter === 'urgent') {
      filtered = filtered.filter(item => item.priority === 'urgent' || item.priority === 'emergency');
    }

    // جستجو
    if (listSearchTerm.trim()) {
      const term = listSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const typeLabel = (item.radiology_type_label || item.radiology_type || '').toLowerCase();
        const bodyPart = (item.body_part || '').toLowerCase();
        const reason = (item.reason || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();
        const reportNo = (item.result_details?.report_no || '').toLowerCase();
        const result = (item.result_details?.result || '').toLowerCase();

        return typeLabel.includes(term) ||
          bodyPart.includes(term) ||
          reason.includes(term) ||
          barcode.includes(term) ||
          reportNo.includes(term) ||
          result.includes(term);
      });
    }

    return filtered;
  };

  const filteredRadiologyList = filterAndSearchList(radiologyList);

  // شمارش برای تب‌ها
  const countWithResult = radiologyList.filter(item => item.has_result && item.result_details).length;
  const countWithoutResult = radiologyList.filter(item => !item.has_result || !item.result_details).length;
  const countPending = radiologyList.filter(item => item.status === 'pending').length;
  const countCompleted = radiologyList.filter(item => item.status === 'completed').length;
  const countSentToRadiology = radiologyList.filter(item => item.status === 'sent_to_radiology').length;
  const countUrgent = radiologyList.filter(item => item.priority === 'urgent' || item.priority === 'emergency').length;

  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444', background: 'white', borderRadius: '10px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '18px' }}>اطلاعات مریض معتبر نیست</div>
        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '10px' }}>
          لطفاً یک مریض را از صف انتخاب کنید
        </div>
      </div>
    );
  }

  if (connectionError && !patientInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444', background: 'white', borderRadius: '10px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🌐</div>
        <div style={{ fontSize: '18px' }}>خطای اتصال به سرور</div>
        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '10px' }}>
          لطفاً اتصال سرور را بررسی کرده و دوباره تلاش کنید
        </div>
        <button
          onClick={() => {
            setConnectionError(false);
            loadedRegistrationRef.current = null;
            loadRadiologyFromServer(true);
          }}
          style={{
            marginTop: '20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔄 تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div id="print-content" style={{ display: 'none' }}>
        <div className="print-header">
          <h2>📷 درخواست رادیولوژی</h2>
          <p>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
        </div>

        <div className="print-patient-info">
          <div><span className="print-label">نام بیمار:</span> {patient.first_name || ''} {patient.last_name || ''}</div>
          <div><span className="print-label">کد ملی:</span> {patient.national_id || '-'}</div>
          <div><span className="print-label">سن:</span> {patient.age ? `${patient.age} سال` : '-'}</div>
          <div><span className="print-label">جنسیت:</span> {getGenderText(patient.gender)}</div>
          <div><span className="print-label">شماره تماس:</span> {patient.mobile || '-'}</div>
          <div><span className="print-label">شماره مراجعه:</span> {registration.visit_number || '-'}</div>
          {barcode && <div><span className="print-label">بارکد:</span> <span className="print-barcode">{barcode}</span></div>}
        </div>

        <h3>📋 لیست درخواست‌های رادیولوژی</h3>
        {radiologyList.map((item, index) => (
          <div key={item.id || `print-${index}`} className="print-item">
            <div>
              <strong>{item.radiology_type_label || item.radiology_type}</strong>
              <span style={{ backgroundColor: priorityColors[item.priority] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '4px', marginRight: '10px' }}>
                {priorityLabels[item.priority] || item.priority}
              </span>
              <span style={{ backgroundColor: statusColors[item.status] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '4px', marginRight: '10px' }}>
                {statusLabels[item.status] || item.status}
              </span>
            </div>
            <div>بخش: {item.body_part}</div>
            <div>دلیل: {item.reason}</div>
            {item.notes && <div>یادداشت: {item.notes}</div>}
            {item.clinical_indication && <div>اندیکاسیون: {item.clinical_indication}</div>}
            {item.special_notes && <div>نکات ویژه: {item.special_notes}</div>}
            <div style={{ fontSize: '12px', color: '#666' }}>
              تاریخ درخواست: {item.request_date ? new Date(item.request_date).toLocaleDateString('fa-IR') : '-'}
              {item.barcode && ` | بارکد: ${item.barcode}`}
            </div>
            {item.has_result && item.result_details && (
              <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>📄 نتیجه:</div>
                <div style={{ fontSize: '12px' }}>{item.result_details.result || 'ثبت شده'}</div>
                {item.result_details.pdf_url && (
                  <div style={{ fontSize: '11px', color: '#1565c0' }}>📎 PDF: {item.result_details.pdf_file_name || 'فایل'}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 style={styles.sectionTitle}>
        📷 درخواست رادیولوژی
      </h3>

      {/* نوار آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: radiologyRequested ? "#22c55e" : "#f59e0b" }}>
            {radiologyRequested ? '✅' : '⏳'}
          </div>
          <div style={styles.statLabel}>
            {radiologyRequested ? 'ثبت شده' : 'ثبت نشده'}
          </div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: "#3b82f6" }}>{radiologyList.length}</div>
          <div style={styles.statLabel}>تعداد درخواست‌ها</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: hasResults ? "#22c55e" : "#9ca3af", fontSize: "16px" }}>
            {hasResults ? `✅ ${resultsData.length}` : '❌'}
          </div>
          <div style={styles.statLabel}>نتایج ثبت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isCompleted ? "#22c55e" : "#f59e0b" }}>
            {isCompleted ? '✅' : '⏳'}
          </div>
          <div style={styles.statLabel}>
            {isCompleted ? 'ختم شده' : 'در حال 진행'}
          </div>
        </div>
      </div>

      {/* کارت اطلاعات مریض */}
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
          <h5 style={{ color: '#1f2937', margin: 0, fontSize: '14px' }}>👤 اطلاعات مریض</h5>
          {loadingRadiology && (
            <span style={{ color: '#6b7280', fontSize: '11px' }}>⏳ در حال بارگذاری...</span>
          )}
        </div>
        <div style={styles.infoGrid}>
          <div>
            <span style={styles.infoLabel}>نام کامل</span>
            <div style={styles.infoValue}>
              {patient.first_name || ''} {patient.last_name || ''}
            </div>
          </div>
          <div>
            <span style={styles.infoLabel}>کد ملی</span>
            <div style={styles.infoValue}>{patient.national_id || '-'}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>سن</span>
            <div style={styles.infoValue}>{patient.age ? `${patient.age} سال` : '-'}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>جنسیت</span>
            <div style={styles.infoValue}>{getGenderText(patient.gender)}</div>
          </div>
          <div>
            <span style={styles.infoLabel}>شماره مراجعه</span>
            <div style={{ ...styles.infoValue, color: '#d48806' }}>{registration.visit_number || '-'}</div>
          </div>
          {barcode && (
            <div>
              <span style={styles.infoLabel}>بارکد</span>
              <div style={{ ...styles.infoValue, color: '#d48806', fontFamily: 'monospace' }}>{barcode}</div>
            </div>
          )}
        </div>
      </div>

      {/* فرم درخواست */}
      <form onSubmit={handleSubmit} className="no-print" style={styles.card}>
        <h4 style={{ color: '#1f2937', marginBottom: '15px', fontSize: '15px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
          📋 ثبت درخواست جدید
        </h4>

        <div style={styles.formGrid}>
          <div>
            <div>
              <label style={styles.label}>نوع رادیولوژی *</label>
              <select
                name="radiology_type"
                value={formData.radiology_type}
                onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || radiologyRequested ? 0.5 : 1 }}
                disabled={isDisabled || radiologyRequested}
                required
              >
                <option value="">-- انتخاب کنید --</option>
                {radiologyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>بخش مورد نظر *</label>
              <select
                name="body_part"
                value={formData.body_part}
                onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || radiologyRequested ? 0.5 : 1 }}
                disabled={isDisabled || radiologyRequested}
                required
              >
                <option value="">-- انتخاب کنید --</option>
                {bodyParts.map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>اولویت</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || radiologyRequested ? 0.5 : 1 }}
                disabled={isDisabled || radiologyRequested}
              >
                <option value="normal">🟢 عادی</option>
                <option value="urgent">🟡 فوری</option>
                <option value="emergency">🔴 اورژانسی</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>تاریخ درخواست</label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || radiologyRequested ? 0.5 : 1 }}
                disabled={isDisabled || radiologyRequested}
              />
            </div>
          </div>

          <div>
            {[
              ['reason', 'دلیل درخواست *', 'دلیل درخواست رادیولوژی را وارد کنید...', true],
              ['clinical_indication', 'اندیکاسیون بالینی', 'دلایل بالینی برای انجام این رادیولوژی...', false],
              ['special_notes', 'نکات ویژه', 'نکات ویژه برای بخش رادیولوژی...', false],
              ['notes', 'یادداشت', 'یادداشت‌های اضافی...', false],
            ].map(([name, label, placeholder, required]) => (
              <div key={name}>
                <label style={styles.label}>{label}</label>
                <textarea
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  rows="2"
                  placeholder={placeholder}
                  style={{ ...styles.input, minHeight: "55px", opacity: isDisabled || radiologyRequested ? 0.5 : 1 }}
                  disabled={isDisabled || radiologyRequested}
                  required={required}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            style={{ ...styles.btn, background: '#6b7280', color: 'white', padding: '10px 24px', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            ↩️ برگشت
          </button>

          <button
            type="submit"
            disabled={loading || isDisabled || radiologyRequested}
            style={{ ...styles.btn, background: (isDisabled || radiologyRequested) ? '#6b7280' : '#8b5cf6', color: 'white', padding: '10px 24px', opacity: (loading || isDisabled || radiologyRequested) ? 0.6 : 1, cursor: (loading || isDisabled || radiologyRequested) ? 'not-allowed' : 'pointer' }}
          >
            📤 {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : radiologyRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
          </button>

          {radiologyList.length > 0 && (
            <button
              type="button"
              onClick={handlePrint}
              style={{ ...styles.btn, background: '#10b981', color: 'white', padding: '10px 24px' }}
            >
              🖨️ پرینت همه
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            disabled={!radiologyRequested || isCompleted || isSubmitting}
            style={{ ...styles.btn, background: (!radiologyRequested || isCompleted) ? '#6b7280' : '#dc2626', color: 'white', padding: '10px 24px', opacity: (!radiologyRequested || isCompleted || isSubmitting) ? 0.6 : 1, cursor: (!radiologyRequested || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer' }}
          >
            🏁 {isCompleted ? '✅ ختم شده' : 'ختم معالجه'}
          </button>

          {nextStep && (
            <button
              type="button"
              onClick={onNextStep}
              disabled={isSubmitting}
              style={{ ...styles.btn, background: isSubmitting ? '#6b7280' : '#3b82f6', color: 'white', padding: '10px 24px', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              ➡️ رفتن به {nextStep.label}
            </button>
          )}
        </div>
      </form>

      {/* لیست درخواست‌ها */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: '#1f2937', fontSize: '15px', margin: 0 }}>
            📋 لیست درخواست‌های رادیولوژی ({filteredRadiologyList.length}
            {listFilter !== 'all' || listSearchTerm ? ` از ${radiologyList.length}` : ''})
            {loadingRadiology && (
              <span style={{ marginLeft: '10px', fontSize: '13px', color: '#9ca3af' }}>
                ⏳ در حال بارگذاری...
              </span>
            )}
          </h4>
        </div>

        {/* ✅ فیلترها و جستجو */}
        {radiologyList.length > 0 && (
          <div style={styles.filters}>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'all' ? { background: "#3b82f6", color: "white", borderColor: "#3b82f6" } : {}),
              }}
              onClick={() => setListFilter('all')}
            >
              📋 همه ({radiologyList.length})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'with_result' ? { background: "#22c55e", color: "white", borderColor: "#22c55e" } : {}),
              }}
              onClick={() => setListFilter('with_result')}
            >
              ✅ دارای نتیجه ({countWithResult})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'without_result' ? { background: "#f59e0b", color: "white", borderColor: "#f59e0b" } : {}),
              }}
              onClick={() => setListFilter('without_result')}
            >
              ⏳ بدون نتیجه ({countWithoutResult})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'pending' ? { background: "#f59e0b", color: "white", borderColor: "#f59e0b" } : {}),
              }}
              onClick={() => setListFilter('pending')}
            >
              🕐 در انتظار ({countPending})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'sent_to_radiology' ? { background: "#8b5cf6", color: "white", borderColor: "#8b5cf6" } : {}),
              }}
              onClick={() => setListFilter('sent_to_radiology')}
            >
              📤 ارسال شده ({countSentToRadiology})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'completed' ? { background: "#10b981", color: "white", borderColor: "#10b981" } : {}),
              }}
              onClick={() => setListFilter('completed')}
            >
              ✅ تکمیل شده ({countCompleted})
            </button>
            <button
              style={{
                ...styles.filterBtn,
                ...(listFilter === 'urgent' ? { background: "#ef4444", color: "white", borderColor: "#ef4444" } : {}),
              }}
              onClick={() => setListFilter('urgent')}
            >
              🔴 فوری/اورژانسی ({countUrgent})
            </button>

            <input
              type="text"
              placeholder="🔍 جستجو در نوع، بخش، دلیل، بارکد، شماره گزارش..."
              value={listSearchTerm}
              onChange={(e) => setListSearchTerm(e.target.value)}
              style={styles.searchInput}
            />

            <button
              type="button"
              onClick={() => loadRadiologyFromServer(true)}
              disabled={loadingRadiology}
              style={{ ...styles.btn, background: '#3b82f6', color: 'white', padding: '8px 16px', opacity: loadingRadiology ? 0.6 : 1, cursor: loadingRadiology ? 'not-allowed' : 'pointer' }}
            >
              🔄 بروزرسانی
            </button>

            {radiologyList.length > 0 && (
              <button
                type="button"
                onClick={handlePrint}
                className="no-print"
                style={{ ...styles.btn, background: '#10b981', color: 'white', padding: '8px 16px' }}
              >
                🖨️ پرینت
              </button>
            )}
          </div>
        )}

        {radiologyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: 'white', borderRadius: '10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <div>هیچ درخواست رادیولوژی ثبت نشده است</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              برای ثبت درخواست، فرم بالا را پر کنید
            </div>
          </div>
        ) : filteredRadiologyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: 'white', borderRadius: '10px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div>هیچ درخواستی با این فیلتر/جستجو یافت نشد</div>
            <button
              onClick={() => {
                setListFilter('all');
                setListSearchTerm('');
              }}
              style={{ ...styles.btn, background: '#3b82f6', color: 'white', marginTop: '10px', padding: '8px 16px' }}
            >
              🔄 حذف فیلترها
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>🏷️ بارکد</th>
                  <th style={styles.th}>📷 نوع</th>
                  <th style={styles.th}>🦴 بخش</th>
                  <th style={styles.th}>⚡ اولویت</th>
                  <th style={styles.th}>📊 وضعیت</th>
                  <th style={styles.th}>📄 نتیجه</th>
                  <th style={styles.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRadiologyList.map((item, index) => {
                  const editDisabled = ['completed', 'cancelled', 'sent_to_radiology', 'in_progress', 'scheduled'].includes(item.status);
                  const deleteDisabled = ['completed', 'in_progress', 'scheduled', 'sent_to_radiology'].includes(item.status) || item.has_result;
                  const hasResult = !!(item.has_result && item.result_details);
                  const resultData = item.result_details || {};

                  return (
                    <tr key={item.id || `row-${index}`}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>
                        <code style={{ background: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: 'monospace' }}>
                          {item.barcode || '-'}
                        </code>
                      </td>
                      <td style={{ ...styles.td, color: '#3b82f6', fontWeight: 'bold' }}>
                        {item.radiology_type_label || item.radiology_type || '-'}
                      </td>
                      <td style={styles.td}>{item.body_part || '-'}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: priorityColors[item.priority] || '#6b7280' }}>
                          {priorityLabels[item.priority] || item.priority || 'عادی'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: statusColors[item.status] || '#6b7280' }}>
                          {statusLabels[item.status] || item.status || 'نامشخص'}
                        </span>
                        {item.has_result && (
                          <span style={{ ...styles.badge, backgroundColor: '#10b981', marginLeft: '4px', fontSize: '9px', padding: '2px 6px' }}>
                            ✅ نتیجه
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {hasResult ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold' }}>
                              {resultData.result || 'ثبت شده'}
                            </div>
                            {resultData.report_no && (
                              <div style={{ color: '#6b7280', fontSize: '10px' }}>
                                شماره: {resultData.report_no}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleEditRadiology(item)}
                            disabled={editDisabled}
                            style={{ ...styles.btn, background: editDisabled ? '#6b7280' : '#3b82f6', color: 'white', opacity: editDisabled ? 0.5 : 1, cursor: editDisabled ? 'not-allowed' : 'pointer', marginRight: 0 }}
                            title="ویرایش"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRadiology(item.id)}
                            disabled={deleteDisabled}
                            style={{ ...styles.btn, background: deleteDisabled ? '#6b7280' : '#dc2626', color: 'white', opacity: deleteDisabled ? 0.5 : 1, cursor: deleteDisabled ? 'not-allowed' : 'pointer', marginRight: 0 }}
                            title="حذف"
                          >
                            🗑️
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintItem(item)}
                            style={{ ...styles.btn, background: '#8b5cf6', color: 'white', marginRight: 0 }}
                            title="پرینت"
                          >
                            🖨️
                          </button>

                          {hasResult && resultData.pdf_url && (
                            <button
                              type="button"
                              onClick={() => {
                                const resultId = resultData.id || item.id;
                                handleDownloadPdf(
                                  resultId,
                                  resultData.pdf_file_name || 'result.pdf'
                                );
                              }}
                              style={{ ...styles.btn, background: '#22c55e', color: 'white', marginRight: 0 }}
                              title="دانلود PDF"
                            >
                              ⬇️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* کارت‌های نتایج */}
      {(() => {
        const resultsFromList = radiologyList.filter(item => item.has_result && item.result_details);
        
        if (resultsFromList.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: 'white', borderRadius: '10px', border: '1px dashed #e5e7eb', marginTop: '25px' }}>
              <div style={{ fontSize: '40px' }}>📋</div>
              <div>هنوز نتیجه‌ای برای درخواست‌های رادیولوژی ثبت نشده است</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                نتایج پس از ثبت در بخش رادیولوژی در اینجا نمایش داده می‌شود
              </div>
              <button
                onClick={() => loadRadiologyFromServer(true)}
                style={{ ...styles.btn, background: '#3b82f6', color: 'white', marginTop: '10px', padding: '6px 16px' }}
              >
                🔄 بررسی مجدد
              </button>
            </div>
          );
        }

        return (
          <div style={{ marginTop: '25px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}>
              <span>✅</span>
              نتایج ثبت شده رادیولوژی
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                ({resultsFromList.length} نتیجه)
              </span>
              <button
                onClick={() => loadRadiologyFromServer(true)}
                style={{ ...styles.btn, background: '#3b82f6', color: 'white', padding: '4px 12px', fontSize: '11px', marginRight: '10px' }}
              >
                🔄 بارگذاری مجدد
              </button>
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px' }}>
              {resultsFromList.map((item, index) => {
                const resultData = item.result_details || {};
                
                const statusLabel = resultData.result_status_label || resultData.result_status || 'نامشخص';
                const statusColor = resultStatusColors[resultData.result_status] || '#f59e0b';

                return (
                  <div key={item.id || `result-${index}`} style={styles.resultCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>
                          {item.radiology_type_label || item.radiology_type || 'رادیولوژی'}
                        </span>
                        {item.body_part && (
                          <span style={{ color: '#6b7280', fontSize: '12px', display: 'block' }}>
                            بخش: {item.body_part}
                          </span>
                        )}
                      </div>
                      <span style={{ ...styles.badge, backgroundColor: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>شماره گزارش:</span>
                        <div style={{ color: '#d48806', fontSize: '13px', fontWeight: 'bold' }}>
                          {resultData.report_no || '-'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>نتیجه:</span>
                        <div style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '15px' }}>
                          {resultData.result || '-'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>یافته‌ها:</span>
                        <div style={{ color: '#4b5563', fontSize: '13px' }}>
                          {resultData.findings || '-'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>تفسیر:</span>
                        <div style={{ color: '#4b5563', fontSize: '13px' }}>
                          {resultData.interpretation || '-'}
                        </div>
                      </div>
                      {resultData.remarks && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#6b7280', fontSize: '11px' }}>یادداشت:</span>
                          <div style={{ color: '#4b5563', fontSize: '13px' }}>
                            {resultData.remarks}
                          </div>
                        </div>
                      )}
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#6b7280', fontSize: '11px' }}>تاریخ نتیجه:</span>
                        <div style={{ color: '#4b5563', fontSize: '13px' }}>
                          {resultData.analysis_completed_at ? new Date(resultData.analysis_completed_at).toLocaleDateString('fa-IR') + ' ' + new Date(resultData.analysis_completed_at).toLocaleTimeString('fa-IR') : '-'}
                        </div>
                      </div>
                      {(resultData.pdf_url || resultData.pdf_file) && (
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <a
                            href={resultData.pdf_url || `/storage/${resultData.pdf_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...styles.btn, background: '#3b82f6', color: 'white', textDecoration: 'none', padding: '6px 14px' }}
                          >
                            👁️ مشاهده PDF
                          </a>
                          <button
                            onClick={() => {
                              const resultId = resultData.id || item.id;
                              handleDownloadPdf(resultId, resultData.pdf_file_name || 'result.pdf');
                            }}
                            style={{ ...styles.btn, background: '#22c55e', color: 'white', padding: '6px 14px' }}
                          >
                            ⬇️ دانلود PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* مودال ویرایش */}
      {showEditModal && (
        <div style={styles.modal} onClick={() => {
          setShowEditModal(false);
          setEditingRadiology(null);
          resetForm();
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: '#3b82f6', marginBottom: '20px' }}>
              ✏️ ویرایش درخواست رادیولوژی
            </h2>

            {barcode && (
              <div style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>بارکد:</span>
                <span style={{ color: '#d48806', fontFamily: 'monospace', fontWeight: 'bold' }}>{barcode}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={styles.label}>نوع رادیولوژی *</label>
                <select
                  name="radiology_type"
                  value={formData.radiology_type}
                  onChange={handleChange}
                  style={styles.input}
                >
                  {radiologyTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>بخش مورد نظر *</label>
                <select
                  name="body_part"
                  value={formData.body_part}
                  onChange={handleChange}
                  style={styles.input}
                >
                  {bodyParts.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>اولویت</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="normal">🟢 عادی</option>
                  <option value="urgent">🟡 فوری</option>
                  <option value="emergency">🔴 اورژانسی</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>تاریخ درخواست</label>
                <input
                  type="date"
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>دلیل درخواست *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="2"
                  style={{ ...styles.input, minHeight: "55px" }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>اندیکاسیون بالینی</label>
                <textarea
                  name="clinical_indication"
                  value={formData.clinical_indication}
                  onChange={handleChange}
                  rows="2"
                  style={{ ...styles.input, minHeight: "55px" }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>نکات ویژه</label>
                <textarea
                  name="special_notes"
                  value={formData.special_notes}
                  onChange={handleChange}
                  rows="2"
                  style={{ ...styles.input, minHeight: "55px" }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>یادداشت</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  style={{ ...styles.input, minHeight: "55px" }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRadiology(null);
                  resetForm();
                }}
                style={{ ...styles.btn, background: '#6b7280', color: 'white', padding: '10px 24px' }}
              >
                لغو
              </button>

              <button
                type="button"
                onClick={handleUpdateRadiology}
                disabled={loading}
                style={{ ...styles.btn, background: loading ? '#6b7280' : '#3b82f6', color: 'white', padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'در حال ذخیره...' : '💾 ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}