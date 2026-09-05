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

  const bodyParts = [
    'سر', 'مغز', 'صورت', 'گردن', 'سینه', 'قفسه سینه', 'شکم', 'لگن',
    'کمر', 'ستون فقرات', 'دست چپ', 'دست راست', 'پای چپ', 'پای راست',
    'زانو', 'شانه', 'مچ پا', 'مچ دست', 'آرنج', 'لگن خاصره', 'مهره‌ها'
  ];

  // این Effect فقط اطلاعات مریض را می‌گیرد و هیچ State والد را تغییر نمی‌دهد.
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

  // فقط از Props به State محلی همگام می‌کنیم.
  // مهم: این Effect دیگر setIsRadiologyRequested را صدا نمی‌زند.
  useEffect(() => {
    if (!isMounted.current || !Array.isArray(allRadiology)) return;
    if (allRadiology.length === 0) return;

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

  // بارگذاری اولیه فقط یک‌بار برای هر registration انجام می‌شود.
  // اگر Parent قبلاً اطلاعات را داده باشد، درخواست اضافی به سرور ارسال نمی‌شود.
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
      const data = response.data?.data;

      if (response.data?.success) {
        if (Array.isArray(data?.all_radiology)) {
          radiologyData = data.all_radiology;
        } else if (Array.isArray(data?.radiology)) {
          radiologyData = data.radiology;
        } else if (Array.isArray(data)) {
          radiologyData = data;
        }
      }

      console.log(`✅ Loaded ${radiologyData.length} radiology from server`);

      setRadiologyList(radiologyData);

      const firstWithBarcode = radiologyData.find(item => item?.barcode);
      if (firstWithBarcode?.barcode) {
        setBarcode(firstWithBarcode.barcode);
      } else if (data?.barcode) {
        setBarcode(data.barcode);
      }

      const resultItems = radiologyData.filter(
        item => item?.has_result === true && item?.result_details
      );

      setHasResults(resultItems.length > 0);
      setResultsData(resultItems);

      // عمداً در Effect/Callback والد را Update نمی‌کنیم.
      // این قسمت عامل اصلی Maximum update depth در نسخه قبلی بود.
      loadedRegistrationRef.current = regId;
      setConnectionError(false);

      if (!response.data?.success && response.data?.message) {
        toast.error(`❌ ${response.data.message}`);
      }
    } catch (err) {
      if (!isMounted.current) return;

      console.error("❌ Error loading radiology:", err);

      // در خطای شبکه، لیست قبلی را پاک نمی‌کنیم.
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

  // وقتی مریض/registration عوض شد، وضعیت بارگذاری قبلی را ریست می‌کنیم.
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
      // اگر Parent اطلاعات واقعی دارد، همان را استفاده می‌کنیم.
      // در غیر این صورت یک بار از سرور می‌گیریم.
      if (Array.isArray(allRadiology) && allRadiology.length > 0) {
        loadedRegistrationRef.current = regId;
      } else {
        loadRadiologyFromServer(false);
      }
    }
  }, [registration?.reg_id, loadRadiologyFromServer]);

  // Cleanup
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

    setRadiologyList(radiologyData);

    const firstWithBarcode = radiologyData.find(item => item?.barcode);
    if (firstWithBarcode?.barcode) {
      setBarcode(firstWithBarcode.barcode);
    }

    const resultItems = radiologyData.filter(
      item => item?.has_result === true && item?.result_details
    );

    setHasResults(resultItems.length > 0);
    setResultsData(resultItems);

    return radiologyData;
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

      // برای هماهنگی با Parent فقط هنگام Action کاربر Update می‌کنیم.
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
        // برای حذف، reload را اجباری می‌کنیم؛ ولی فقط با force و خارج از Effect.
        loadedRegistrationRef.current = null;
        await loadRadiologyFromServer(true);

        // اگر سرور بعد از حذف لیست خالی برگرداند، Parent را هم هماهنگ می‌کنیم.
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

      // به جای localhost ثابت، از همان Axios baseURL استفاده می‌کنیم.
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

  const renderResults = () => {
    if (!resultsData?.length) return null;

    return (
      <div style={{ marginTop: '25px', borderTop: '2px solid #374151', paddingTop: '20px' }}>
        <h4 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>✅</span>
          نتایج ثبت شده رادیولوژی ({resultsData.length} نتیجه)
        </h4>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '15px'
        }}>
          {resultsData.map((result, index) => {
            const resultData = result.result_details || result;
            const stableKey =
              result.id ||
              result.radiology_result_id ||
              result.result_id ||
              result.radiology_request_id ||
              result.request_id ||
              `result-${index}`;

            return (
              <div key={stableKey} style={{
                backgroundColor: '#0f1a2a',
                border: '1px solid #2a3a4a',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #2a3a4a',
                  paddingBottom: '10px',
                  marginBottom: '10px'
                }}>
                  <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                    {resultData.radiology_type_label || resultData.radiology_type || 'رادیولوژی'}
                  </span>
                  <span style={{
                    backgroundColor: resultData.result_status === 'Completed' ? '#10b981' : '#f59e0b',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '11px'
                  }}>
                    {resultData.result_status_label || resultData.result_status || 'نامشخص'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '11px' }}>نتیجه:</span>
                    <div style={{ color: 'white', fontWeight: 'bold' }}>{resultData.result || '-'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '11px' }}>تفسیر:</span>
                    <div style={{ color: '#9ca3af' }}>{resultData.interpretation || '-'}</div>
                  </div>

                  {(resultData.pdf_url || resultData.pdf_file) && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <a
                        href={resultData.pdf_url || `/storage/${resultData.pdf_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          display: 'inline-block'
                        }}
                      >
                        👁️ مشاهده PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const patient = patientInfo?.patient || registration?.patient || {};
  const isDisabled =
    isCompleted || isTreatmentComplete || isSubmitting || isSubmittingForm;

  // اگر Parent مقدار false قدیمی داشته باشد ولی لیست محلی اطلاعات داشته باشد،
  // فرم نباید دوباره فعال شود.
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

  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
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
      <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>
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
    <div>
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
          </div>
        ))}
      </div>

      <h3 style={{ color: '#60a5fa', marginBottom: '20px', borderBottom: '2px solid #374151', paddingBottom: '10px' }}>
        📷 درخواست رادیولوژی
      </h3>

      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        padding: '10px 15px',
        backgroundColor: '#1a2a3a',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت درخواست:</span>
          <span style={{
            color: radiologyRequested ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {radiologyRequested ? '✅ ثبت شده' : '⏳ ثبت نشده'}
          </span>
        </div>

        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>تعداد درخواست‌ها:</span>
          <span style={{ color: '#60a5fa', fontWeight: 'bold', marginRight: '8px' }}>
            {radiologyList.length}
          </span>
        </div>

        <div>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>وضعیت معالجه:</span>
          <span style={{
            color: isCompleted ? '#22c55e' : '#f59e0b',
            fontWeight: 'bold',
            marginRight: '8px'
          }}>
            {isCompleted ? '✅ ختم شده' : '⏳ در حال 진행'}
          </span>
        </div>

        {loadingRadiology && (
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            ⏳ در حال بارگذاری...
          </span>
        )}
      </div>

      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '15px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px 15px'
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>نام کامل</span>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
            {patient.first_name || ''} {patient.last_name || ''}
          </div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>کد ملی</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{patient.national_id || '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>سن</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{patient.age ? `${patient.age} سال` : '-'}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>جنسیت</span>
          <div style={{ color: 'white', fontWeight: 'bold' }}>{getGenderText(patient.gender)}</div>
        </div>
        <div>
          <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>شماره مراجعه</span>
          <div style={{ color: '#fcd34d', fontWeight: 'bold' }}>{registration.visit_number || '-'}</div>
        </div>
        {barcode && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: '11px', display: 'block' }}>بارکد</span>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', fontFamily: 'monospace' }}>{barcode}</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="no-print">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '14px' }}>📋 اطلاعات درخواست</h4>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>نوع رادیولوژی *</label>
              <select
                name="radiology_type"
                value={formData.radiology_type}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                  width: '100%', padding: '6px 10px', borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || radiologyRequested ? 0.5 : 1
                }}
                disabled={isDisabled || radiologyRequested}
                required
              >
                <option value="">-- انتخاب کنید --</option>
                {radiologyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>بخش مورد نظر *</label>
              <select
                name="body_part"
                value={formData.body_part}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                  width: '100%', padding: '6px 10px', borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || radiologyRequested ? 0.5 : 1
                }}
                disabled={isDisabled || radiologyRequested}
                required
              >
                <option value="">-- انتخاب کنید --</option>
                {bodyParts.map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>اولویت</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                  width: '100%', padding: '6px 10px', borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || radiologyRequested ? 0.5 : 1
                }}
                disabled={isDisabled || radiologyRequested}
              >
                <option value="normal">🟢 عادی</option>
                <option value="urgent">🟡 فوری</option>
                <option value="emergency">🔴 اورژانسی</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>تاریخ درخواست</label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                style={{
                  backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                  width: '100%', padding: '6px 10px', borderRadius: '4px',
                  border: '1px solid #374151',
                  opacity: isDisabled || radiologyRequested ? 0.5 : 1
                }}
                disabled={isDisabled || radiologyRequested}
              />
            </div>
          </div>

          <div>
            <h4 style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '14px' }}>📝 توضیحات</h4>

            {[
              ['reason', 'دلیل درخواست *', 'دلیل درخواست رادیولوژی را وارد کنید...', true],
              ['clinical_indication', 'اندیکاسیون بالینی', 'دلایل بالینی برای انجام این رادیولوژی...', false],
              ['special_notes', 'نکات ویژه', 'نکات ویژه برای بخش رادیولوژی...', false],
              ['notes', 'یادداشت', 'یادداشت‌های اضافی...', false],
            ].map(([name, label, placeholder, required]) => (
              <div key={name} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  {label}
                </label>
                <textarea
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  rows="2"
                  placeholder={placeholder}
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151',
                    opacity: isDisabled || radiologyRequested ? 0.5 : 1
                  }}
                  disabled={isDisabled || radiologyRequested}
                  required={required}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px',
          flexWrap: 'wrap', borderTop: '1px solid #374151', paddingTop: '15px'
        }}>
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#6b7280', color: 'white', padding: '8px 20px',
              borderRadius: '6px', border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1, fontSize: '13px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>↩️</span> برگشت
          </button>

          <button
            type="submit"
            disabled={loading || isDisabled || radiologyRequested}
            style={{
              backgroundColor: (isDisabled || radiologyRequested) ? '#6b7280' : '#8b5cf6',
              color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none',
              cursor: (loading || isDisabled || radiologyRequested) ? 'not-allowed' : 'pointer',
              opacity: (loading || isDisabled || radiologyRequested) ? 0.6 : 1,
              fontSize: '13px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>📤</span>
            {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : radiologyRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
          </button>

          {radiologyList.length > 0 && (
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#10b981', color: 'white', padding: '8px 20px',
                borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span>🖨️</span> پرینت همه
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            disabled={!radiologyRequested || isCompleted || isSubmitting}
            style={{
              backgroundColor: (!radiologyRequested || isCompleted) ? '#6b7280' : '#dc2626',
              color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none',
              cursor: (!radiologyRequested || isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!radiologyRequested || isCompleted || isSubmitting) ? 0.6 : 1,
              fontSize: '13px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>🏁</span> {isCompleted ? '✅ ختم شده' : 'ختم معالجه'}
          </button>

          {nextStep && (
            <button
              type="button"
              onClick={onNextStep}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#6b7280' : '#3b82f6',
                color: 'white', padding: '8px 20px', borderRadius: '6px', border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1, fontSize: '13px', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <span>➡️</span> رفتن به {nextStep.label}
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: '30px' }}>
        <div style={{
          backgroundColor: '#0f1a2a', padding: '15px 20px', borderRadius: '8px',
          marginBottom: '15px', border: '1px solid #2a3a4a'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '10px', borderBottom: '1px solid #2a3a4a', paddingBottom: '8px'
          }}>
            <h5 style={{ color: '#60a5fa', margin: 0, fontSize: '14px' }}>👤 اطلاعات مریض</h5>
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>
              شماره مراجعه: {registration?.visit_number || '-'}
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '8px 15px'
          }}>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>نام کامل</span>
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                {patient.first_name || ''} {patient.last_name || ''}
              </span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>کد ملی</span>
              <span style={{ color: 'white', fontSize: '13px' }}>{patient.national_id || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>سن</span>
              <span style={{ color: 'white', fontSize: '13px' }}>{patient.age ? `${patient.age} سال` : '-'}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>جنسیت</span>
              <span style={{ color: 'white', fontSize: '13px' }}>{getGenderText(patient.gender)}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>شماره تماس</span>
              <span style={{ color: 'white', fontSize: '13px' }}>{patient.mobile || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>شماره مراجعه</span>
              <span style={{ color: '#fcd34d', fontSize: '13px', fontWeight: 'bold' }}>{registration?.visit_number || '-'}</span>
            </div>
            {barcode && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '10px', display: 'block' }}>بارکد</span>
                <span style={{ color: '#fcd34d', fontSize: '13px', fontFamily: 'monospace' }}>{barcode}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '2px solid #374151', paddingTop: '20px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: '#60a5fa', fontSize: '15px', margin: 0 }}>
              📋 لیست درخواست‌های رادیولوژی ({radiologyList.length})
              {loadingRadiology && (
                <span style={{ marginLeft: '10px', fontSize: '13px', color: '#9ca3af' }}>
                  ⏳ در حال بارگذاری...
                </span>
              )}
            </h4>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => loadRadiologyFromServer(true)}
                disabled={loadingRadiology}
                style={{
                  backgroundColor: '#3b82f6', color: 'white', padding: '4px 12px',
                  borderRadius: '4px', border: 'none',
                  cursor: loadingRadiology ? 'not-allowed' : 'pointer',
                  fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                  opacity: loadingRadiology ? 0.6 : 1
                }}
              >
                🔄 بارگذاری مجدد
              </button>

              {radiologyList.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="no-print"
                  style={{
                    backgroundColor: '#10b981', color: 'white', padding: '4px 12px',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  🖨️ پرینت
                </button>
              )}
            </div>
          </div>

          {radiologyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '25px', color: '#9ca3af' }}>
              <div style={{ fontSize: '35px', marginBottom: '8px' }}>📷</div>
              <div>هیچ درخواست رادیولوژی ثبت نشده است</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                برای ثبت درخواست، فرم بالا را پر کنید
              </div>
            </div>
          ) : (
            <div style={{
              overflowX: 'auto', borderRadius: '8px', border: '1px solid #374151'
            }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f1a2a', borderBottom: '2px solid #374151' }}>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>#</th>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>📷 نوع</th>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>🦴 بخش</th>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>⚡ اولویت</th>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', borderLeft: '1px solid #2a3a4a' }}>📊 وضعیت</th>
                    <th style={{ padding: '10px 12px', color: '#60a5fa', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {radiologyList.map((item, index) => {
                    const editDisabled = ['completed', 'cancelled', 'sent_to_radiology', 'in_progress', 'scheduled'].includes(item.status);
                    const deleteDisabled = ['completed', 'in_progress', 'scheduled', 'sent_to_radiology'].includes(item.status) || item.has_result;

                    return (
                      <tr key={item.id || `row-${index}`} style={{ borderBottom: '1px solid #2a3a4a' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#9ca3af', fontWeight: 'bold', borderLeft: '1px solid #2a3a4a' }}>{index + 1}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#60a5fa', fontWeight: 'bold', borderLeft: '1px solid #2a3a4a' }}>{item.radiology_type_label || item.radiology_type || '-'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'white', borderLeft: '1px solid #2a3a4a' }}>{item.body_part || '-'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '1px solid #2a3a4a' }}>
                          <span style={{ backgroundColor: priorityColors[item.priority] || '#6b7280', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>
                            {priorityLabels[item.priority] || item.priority || 'عادی'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '1px solid #2a3a4a' }}>
                          <span style={{ backgroundColor: statusColors[item.status] || '#6b7280', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' }}>
                            {statusLabels[item.status] || item.status || 'نامشخص'}
                          </span>
                          {item.has_result && (
                            <span style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', marginLeft: '4px' }}>
                              ✅ نتیجه
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleEditRadiology(item)}
                              disabled={editDisabled}
                              style={{
                                backgroundColor: editDisabled ? '#6b7280' : '#3b82f6',
                                color: 'white', padding: '4px 8px', borderRadius: '4px',
                                border: 'none', fontSize: '11px',
                                cursor: editDisabled ? 'not-allowed' : 'pointer',
                                opacity: editDisabled ? 0.5 : 1
                              }}
                              title="ویرایش"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRadiology(item.id)}
                              disabled={deleteDisabled}
                              style={{
                                backgroundColor: deleteDisabled ? '#6b7280' : '#dc2626',
                                color: 'white', padding: '4px 8px', borderRadius: '4px',
                                border: 'none', fontSize: '11px',
                                cursor: deleteDisabled ? 'not-allowed' : 'pointer',
                                opacity: deleteDisabled ? 0.5 : 1
                              }}
                              title="حذف"
                            >
                              🗑️
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintItem(item)}
                              style={{
                                backgroundColor: '#8b5cf6', color: 'white', padding: '4px 8px',
                                borderRadius: '4px', border: 'none', fontSize: '11px', cursor: 'pointer'
                              }}
                              title="پرینت"
                            >
                              🖨️
                            </button>

                            {item.has_result && item.result_details?.pdf_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  const resultId =
                                    item.result_details?.id || item.id;
                                  handleDownloadPdf(
                                    resultId,
                                    item.result_details?.pdf_file_name || 'result.pdf'
                                  );
                                }}
                                style={{
                                  backgroundColor: '#22c55e', color: 'white', padding: '4px 8px',
                                  borderRadius: '4px', border: 'none', fontSize: '11px', cursor: 'pointer'
                                }}
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
      </div>

      {renderResults()}

      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '15px'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e', padding: '25px', borderRadius: '10px',
            maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>
              ✏️ ویرایش درخواست رادیولوژی
            </h4>

            {barcode && (
              <div style={{
                backgroundColor: '#1a2a3a', padding: '6px 12px', borderRadius: '4px',
                marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>بارکد:</span>
                <span style={{ color: '#fcd34d', fontFamily: 'monospace' }}>{barcode}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  نوع رادیولوژی *
                </label>
                <select
                  name="radiology_type"
                  value={formData.radiology_type}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                >
                  {radiologyTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  بخش مورد نظر *
                </label>
                <select
                  name="body_part"
                  value={formData.body_part}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                >
                  {bodyParts.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  اولویت
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                >
                  <option value="normal">🟢 عادی</option>
                  <option value="urgent">🟡 فوری</option>
                  <option value="emergency">🔴 اورژانسی</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  تاریخ درخواست
                </label>
                <input
                  type="date"
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleChange}
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  دلیل درخواست *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  اندیکاسیون بالینی
                </label>
                <textarea
                  name="clinical_indication"
                  value={formData.clinical_indication}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  نکات ویژه
                </label>
                <textarea
                  name="special_notes"
                  value={formData.special_notes}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>
                  یادداشت
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  style={{
                    backgroundColor: '#1a1a2e', color: 'white', borderColor: '#374151',
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    border: '1px solid #374151'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '15px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRadiology(null);
                  resetForm();
                }}
                style={{
                  backgroundColor: '#6b7280', color: 'white', padding: '6px 16px',
                  borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px'
                }}
              >
                لغو
              </button>

              <button
                type="button"
                onClick={handleUpdateRadiology}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#6b7280' : '#3b82f6',
                  color: 'white', padding: '6px 16px', borderRadius: '4px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px'
                }}
              >
                {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
