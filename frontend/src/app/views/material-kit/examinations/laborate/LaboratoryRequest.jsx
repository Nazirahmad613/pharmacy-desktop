// src/app/pages/laboratory/LaboratoryRequest.jsx
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

// 🎨 پالت رنگ ملایم برای چشم (همان TreatmentPage)
const C = {
  pageBg: '#f1f5f9',        // پس‌زمینه کل صفحه
  cardBg: '#ffffff',        // کارت‌های سفید
  softBg: '#f8fafc',        // پس‌زمینه داخلی ملایم‌تر
  border: '#e2e8f0',        // مرز روشن
  textPrimary: '#1e293b',   // متن اصلی تیره نرم
  textSecondary: '#64748b', // متن فرعی
  textMuted: '#94a3b8',     // متن کم‌رنگ
  accent: '#3b82f6',        // آبی اصلی
  accentSoft: '#eff6ff',    // آبی خیلی ملایم
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  purple: '#8b5cf6',
  purpleSoft: '#f5f3ff',
  shadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  shadowMd: '0 2px 8px rgba(15, 23, 42, 0.08)',
};

export default function LaboratoryRequest({ 
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
  savedTests,
  allTests,
  isLabRequested,
  setIsLabRequested,
  setAllTests,
  hasLabResult = false
}) {
  const [formData, setFormData] = useState({
    test_type: '',
    test_name: '',
    test_description: '',
    clinical_indication: '',
    special_notes: '',
    request_date: new Date().toISOString().split('T')[0],
    sample_collection_date: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [barcode, setBarcode] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [resultsData, setResultsData] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [listFilter, setListFilter] = useState('all');
  const [listSearchTerm, setListSearchTerm] = useState("");
  const printRef = useRef();

  const testTypes = [
    { value: 'blood', label: '🩸 آزمایش خون (هماتولوژی)', category: 'خون' },
    { value: 'cbc', label: '🩸 شمارش کامل خون (CBC)', category: 'خون' },
    { value: 'blood_sugar', label: '🩸 قند خون (FBS / BS)', category: 'خون' },
    { value: 'blood_group', label: '🩸 گروپ خون', category: 'خون' },
    { value: 'biochemistry', label: '🧪 بیوشیمی خون', category: 'بیوشیمی' },
    { value: 'lipid_profile', label: '🧪 پروفایل چربی (Lipid Profile)', category: 'بیوشیمی' },
    { value: 'liver_function', label: '🧪 عملکرد کبد (LFT)', category: 'بیوشیمی' },
    { value: 'kidney_function', label: '🧪 عملکرد کلیه (RFT)', category: 'بیوشیمی' },
    { value: 'thyroid', label: '🧪 هورمون‌های تیروئید (T3/T4/TSH)', category: 'بیوشیمی' },
    { value: 'hormonal', label: '🧬 هورمون‌ها', category: 'هورمونی' },
    { value: 'reproductive_hormones', label: '🧬 هورمون‌های تولیدمثل', category: 'هورمونی' },
    { value: 'adrenal_hormones', label: '🧬 هورمون‌های آدرنال', category: 'هورمونی' },
    { value: 'microbial', label: '🦠 آزمایش میکروبی', category: 'میکروبی' },
    { value: 'bacterial_culture', label: '🦠 کشت باکتری', category: 'میکروبی' },
    { value: 'fungal_culture', label: '🦠 کشت قارچ', category: 'میکروبی' },
    { value: 'antibiotic_sensitivity', label: '🦠 آنتی‌بیوگرام', category: 'میکروبی' },
    { value: 'serology', label: '🧫 سرولوژی', category: 'سرولوژی' },
    { value: 'hepatitis_b', label: '🧪 تست هپاتیت B (HBsAg)', category: 'سرولوژی' },
    { value: 'hepatitis_c', label: '🧪 تست هپاتیت C (Anti-HCV)', category: 'سرولوژی' },
    { value: 'hiv', label: '🧫 تست HIV / AIDS', category: 'سرولوژی' },
    { value: 'syphilis', label: '🧫 تست سیفلیس (VDRL)', category: 'سرولوژی' },
    { value: 'rubella', label: '🧫 تست روبلا', category: 'سرولوژی' },
    { value: 'toxoplasmosis', label: '🧫 تست توکسوپلاسموز', category: 'سرولوژی' },
    { value: 'urine', label: '💧 آنالیز ادرار', category: 'ادرار' },
    { value: 'urine_culture', label: '💧 کشت ادرار', category: 'ادرار' },
    { value: 'stool', label: '💩 آزمایش مدفوع', category: 'مدفوع' },
    { value: 'stool_culture', label: '💩 کشت مدفوع', category: 'مدفوع' },
    { value: 'occult_blood', label: '💩 خون مخفی مدفوع', category: 'مدفوع' },
    { value: 'pathology', label: '🔬 پاتولوژی', category: 'پاتولوژی' },
    { value: 'biopsy', label: '🔬 بیوپسی', category: 'پاتولوژی' },
    { value: 'cytology', label: '🔬 سیتولوژی', category: 'پاتولوژی' },
    { value: 'genetic', label: '🧬 آزمایش ژنتیک', category: 'ژنتیک' },
    { value: 'pcr', label: '🧬 PCR', category: 'ژنتیک' },
    { value: 'karyotyping', label: '🧬 کاریوتایپینگ', category: 'ژنتیک' },
    { value: 'malaria', label: '🦟 تست مالاریا', category: 'انگل‌شناسی' },
    { value: 'parasitology', label: '🦟 انگل‌شناسی', category: 'انگل‌شناسی' },
    { value: 'kala_azar', label: '🦟 کالا آزار (لیشمانیوز احشایی)', category: 'انگل‌شناسی' },
    { value: 'leishmaniasis', label: '🦟 لیشمانیوز', category: 'انگل‌شناسی' },
    { value: 'imaging', label: '📷 تصویربرداری', category: 'تصویربرداری' },
    { value: 'ultrasound', label: '📷 سونوگرافی', category: 'تصویربرداری' },
    { value: 'xray', label: '📷 رادیوگرافی (X-Ray)', category: 'تصویربرداری' },
    { value: 'ct_scan', label: '📷 سی‌تی اسکن (CT Scan)', category: 'تصویربرداری' },
    { value: 'mri', label: '📷 ام‌آرآی (MRI)', category: 'تصویربرداری' },
    { value: 'other', label: '📋 سایر آزمایشات', category: 'سایر' },
    { value: 'general', label: '📋 عمومی', category: 'سایر' },
  ];

  const testTypeLabels = {
    blood: 'آزمایش خون (هماتولوژی)', cbc: 'شمارش کامل خون (CBC)',
    blood_sugar: 'قند خون', blood_group: 'گروپ خون',
    biochemistry: 'بیوشیمی خون', lipid_profile: 'پروفایل چربی',
    liver_function: 'عملکرد کبد', kidney_function: 'عملکرد کلیه',
    thyroid: 'هورمون‌های تیروئید', hormonal: 'هورمون‌ها',
    reproductive_hormones: 'هورمون‌های تولیدمثل', adrenal_hormones: 'هورمون‌های آدرنال',
    microbial: 'آزمایش میکروبی', bacterial_culture: 'کشت باکتری',
    fungal_culture: 'کشت قارچ', antibiotic_sensitivity: 'آنتی‌بیوگرام',
    serology: 'سرولوژی', hepatitis_b: 'تست هپاتیت B',
    hepatitis_c: 'تست هپاتیت C', hiv: 'تست HIV / AIDS',
    syphilis: 'تست سیفلیس', rubella: 'تست روبلا',
    toxoplasmosis: 'تست توکسوپلاسموز', urine: 'آنالیز ادرار',
    urine_culture: 'کشت ادرار', stool: 'آزمایش مدفوع',
    stool_culture: 'کشت مدفوع', occult_blood: 'خون مخفی مدفوع',
    pathology: 'پاتولوژی', biopsy: 'بیوپسی', cytology: 'سیتولوژی',
    genetic: 'آزمایش ژنتیک', pcr: 'PCR', karyotyping: 'کاریوتایپینگ',
    malaria: 'تست مالاریا', parasitology: 'انگل‌شناسی',
    kala_azar: 'کالا آزار', leishmaniasis: 'لیشمانیوز',
    imaging: 'تصویربرداری', ultrasound: 'سونوگرافی', xray: 'رادیوگرافی',
    ct_scan: 'سی‌تی اسکن', mri: 'ام‌آرآی',
    other: 'سایر آزمایشات', general: 'عمومی',
  };

  // ============ Styles — پالت ملایم ============
  const styles = {
    container: { padding: "8px" },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      background: C.cardBg,
      borderRadius: "10px",
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    statBox: { textAlign: "center" },
    statValue: { fontSize: "20px", fontWeight: "bold" },
    statLabel: { fontSize: "11px", color: C.textSecondary, marginTop: "2px" },
    filters: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    filterBtn: {
      padding: "8px 16px",
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      background: C.cardBg,
      color: C.textPrimary,
      transition: "all 0.2s",
      boxShadow: C.shadow,
    },
    searchInput: {
      padding: "8px 16px",
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "250px",
      flex: 1,
      background: C.cardBg,
      color: C.textPrimary,
      outline: "none",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
      background: C.cardBg,
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: C.shadow,
    },
    th: {
      padding: "12px",
      textAlign: "right",
      background: C.softBg,
      color: C.textPrimary,
      fontSize: "13px",
      fontWeight: "bold",
      borderBottom: `2px solid ${C.border}`,
    },
    td: {
      padding: "12px",
      borderBottom: `1px solid ${C.border}`,
      color: C.textPrimary,
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
    modal: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      padding: "16px",
    },
    modalContent: {
      background: C.cardBg,
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "700px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1)',
    },
    input: {
      padding: "10px 12px",
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
      background: C.cardBg,
      color: C.textPrimary,
      outline: "none",
    },
    label: {
      display: "block",
      fontSize: "12px",
      color: C.textPrimary,
      fontWeight: "bold",
      marginBottom: "6px",
      marginTop: "12px",
    },
    infoCard: {
      background: C.cardBg,
      borderRadius: "10px",
      padding: "15px 20px",
      marginBottom: "15px",
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: "10px 15px",
    },
    infoLabel: { color: C.textSecondary, fontSize: "11px", display: "block", marginBottom: "3px" },
    infoValue: { color: C.textPrimary, fontWeight: "bold", fontSize: "14px" },
    card: {
      background: C.cardBg,
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "20px",
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "15px",
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

  // ============ دریافت اطلاعات مریض ============
  useEffect(() => {
    if (!registration || !registration.reg_id) return;

    const fetchPatientInfo = async () => {
      try {
        const response = await api.get(`/registrations/${registration.reg_id}`);
        const data = response.data?.data || response.data;
        setPatientInfo(data);
        
        if (data.barcode) {
          setBarcode(data.barcode);
        } else if (data.patient?.barcode) {
          setBarcode(data.patient.barcode);
        }
        
        if (data.visit_status === 'Completed') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error("خطا در دریافت اطلاعات مریض:", err);
        if (err.code === 'ERR_NETWORK') {
          setConnectionError(true);
          toast.error("❌ خطای شبکه - لطفاً اتصال اینترنت خود را بررسی کنید");
        }
      }
    };
    fetchPatientInfo();
  }, [registration?.reg_id, api]);

  useEffect(() => {
    if (allTests && Array.isArray(allTests) && allTests.length > 0) {
      setTests(allTests);
      if (setIsLabRequested) setIsLabRequested(true);
      if (allTests[0]?.barcode) setBarcode(allTests[0].barcode);
      
      const hasResultsData = allTests.some(t => t.has_result === true && t.result_details);
      setHasResults(hasResultsData);
      const results = allTests.filter(t => t.has_result === true && t.result_details);
      setResultsData(results);
    } else if (allTests && Array.isArray(allTests) && allTests.length === 0) {
      setTests([]);
      setResultsData([]);
      setHasResults(false);
      if (setIsLabRequested) setIsLabRequested(false);
    }
  }, [allTests, setIsLabRequested, hasLabResult]);

  useEffect(() => {
    if (registration?.reg_id) {
      if (allTests && Array.isArray(allTests) && allTests.length > 0) {
        setTests(allTests);
        if (setIsLabRequested) setIsLabRequested(true);
      } else {
        loadTestsFromServer();
      }
    }
  }, [registration?.reg_id]);

  const loadTestsFromServer = async () => {
    if (!registration || !registration.reg_id) return;

    setLoadingTests(true);
    try {
      const url = `/laboratory-requests/registration/${registration.reg_id}/full`;
      const response = await api.get(url);
      
      if (response.data?.success) {
        const data = response.data.data;
        let testsData = [];
        
        if (data.all_tests && Array.isArray(data.all_tests)) testsData = data.all_tests;
        else if (data.tests && Array.isArray(data.tests)) testsData = data.tests;
        else if (Array.isArray(data)) testsData = data;
        
        setTests(testsData);
        if (setIsLabRequested) setIsLabRequested(testsData.length > 0);
        if (setAllTests) setAllTests(testsData);
        
        const hasResultsData = testsData.some(t => t.has_result === true && t.result_details);
        setHasResults(hasResultsData);
        const results = testsData.filter(t => t.has_result === true && t.result_details);
        setResultsData(results);
        
        if (testsData.length > 0 && testsData[0].barcode) setBarcode(testsData[0].barcode);
        else if (data.barcode) setBarcode(data.barcode);
      } else {
        setTests([]); setResultsData([]); setHasResults(false);
        if (setIsLabRequested) setIsLabRequested(false);
        if (setAllTests) setAllTests([]);
      }
    } catch (err) {
      console.error("❌ Error loading tests:", err);
      setTests([]); setResultsData([]); setHasResults(false);
      if (setIsLabRequested) setIsLabRequested(false);
      if (setAllTests) setAllTests([]);
      if (err.response?.status !== 404) {
        toast.error(`❌ خطا در بارگذاری تست‌ها: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoadingTests(false);
    }
  };

  const loadResultsFromServer = async () => {
    if (!registration || !registration.reg_id) return;

    setLoadingResults(true);
    try {
      const url = `/laboratory-results/registration/${registration.reg_id}`;
      const response = await api.get(url);
      
      if (response.data?.success) {
        const data = response.data.data;
        let resultsArray = [];
        
        if (Array.isArray(data)) resultsArray = data;
        else if (data.results && Array.isArray(data.results)) resultsArray = data.results;
        else if (data.data && Array.isArray(data.data)) resultsArray = data.data;
        
        if (resultsArray.length > 0) {
          setResultsData(resultsArray); setHasResults(true);
        } else {
          setResultsData([]); setHasResults(false);
        }
      } else {
        setResultsData([]); setHasResults(false);
      }
    } catch (err) {
      console.error("❌ Error loading results:", err);
      setResultsData([]); setHasResults(false);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      test_type: '', test_name: '', test_description: '',
      clinical_indication: '', special_notes: '',
      request_date: new Date().toISOString().split('T')[0],
      sample_collection_date: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.test_type) {
      toast.warning("⚠️ لطفاً نوع آزمایش را انتخاب کنید");
      return;
    }
    if (!registration || !registration.reg_id) {
      toast.error("❌ اطلاعات مراجعه معتبر نیست");
      return;
    }

    setIsSubmittingForm(true);
    setLoading(true);

    try {
      const url = `/laboratory-requests/registration/${registration.reg_id}`;
      const payload = {
        test_type: formData.test_type,
        test_name: formData.test_name || null,
        test_description: formData.test_description || null,
        clinical_indication: formData.clinical_indication || null,
        special_notes: formData.special_notes || null,
        request_date: formData.request_date || new Date().toISOString().split('T')[0],
        sample_collection_date: formData.sample_collection_date || null,
      };

      const response = await api.post(url, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      
      if (response.data?.success) {
        const data = response.data.data;
        let testsData = [];
        if (data.all_tests && Array.isArray(data.all_tests)) testsData = data.all_tests;
        else if (data.tests && Array.isArray(data.tests)) testsData = data.tests;
        else if (Array.isArray(data)) testsData = data;
        
        setTests(testsData);
        if (setIsLabRequested) setIsLabRequested(testsData.length > 0);
        if (setAllTests) setAllTests(testsData);
        
        if (data.laboratory_request?.barcode) setBarcode(data.laboratory_request.barcode);
        else if (testsData.length > 0 && testsData[0].barcode) setBarcode(testsData[0].barcode);

        const testLabel = testTypeLabels[formData.test_type] || formData.test_type;
        toast.success(`✅ درخواست "${testLabel}" با موفقیت ثبت شد`);

        resetForm();
        if (onRefresh) onRefresh();
        
        setTimeout(() => {
          loadTestsFromServer();
          loadResultsFromServer();
        }, 500);
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'ثبت ناموفق بود'}`);
      }
    } catch (err) {
      console.error("❌ خطا:", err);
      if (err.code === 'ERR_NETWORK') {
        toast.error("❌ خطای شبکه - سرور پاسخ نمی‌دهد");
        setConnectionError(true);
      } else if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => toast.error(`❌ ${key}: ${errors[key][0]}`));
      } else if (err.response?.data?.message) {
        toast.error(`❌ ${err.response.data.message}`);
      } else {
        toast.error(`❌ خطا: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setIsSubmittingForm(false);
    }
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    setFormData({
      test_type: test.test_type || '',
      test_name: test.test_name || '',
      test_description: test.test_description || '',
      clinical_indication: test.clinical_indication || '',
      special_notes: test.special_notes || '',
      request_date: test.request_date || new Date().toISOString().split('T')[0],
      sample_collection_date: test.sample_collection_date || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;
    setLoading(true);

    try {
      const response = await api.put(`/laboratory-requests/${editingTest.id}`, {
        test_type: formData.test_type,
        test_name: formData.test_name,
        test_description: formData.test_description,
        clinical_indication: formData.clinical_indication,
        special_notes: formData.special_notes,
        request_date: formData.request_date,
        sample_collection_date: formData.sample_collection_date,
      });
      
      if (response.data?.success) {
        const data = response.data.data;
        let testsData = [];
        if (data.all_tests && Array.isArray(data.all_tests)) testsData = data.all_tests;
        else if (data.tests && Array.isArray(data.tests)) testsData = data.tests;
        else if (Array.isArray(data)) testsData = data;
        
        setTests(testsData);
        if (setIsLabRequested) setIsLabRequested(testsData.length > 0);
        if (setAllTests) setAllTests(testsData);

        toast.success("✅ تست با موفقیت ویرایش شد");
        setShowEditModal(false);
        setEditingTest(null);
        resetForm();
        
        if (onRefresh) onRefresh();
        setTimeout(() => { loadTestsFromServer(); loadResultsFromServer(); }, 300);
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'ویرایش ناموفق بود'}`);
      }
    } catch (err) {
      console.error("❌ خطا در ویرایش:", err);
      toast.error(`❌ خطا در ویرایش: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این تست را حذف کنید؟")) return;

    try {
      const response = await api.delete(`/laboratory-requests/${testId}`);
      
      if (response.data?.success) {
        let testsData = [];
        if (response.data.data && Array.isArray(response.data.data)) {
          testsData = response.data.data;
        } else {
          await loadTestsFromServer();
          return;
        }
        
        setTests(testsData);
        if (setIsLabRequested) setIsLabRequested(testsData.length > 0);
        if (setAllTests) setAllTests(testsData);

        toast.success("✅ تست با موفقیت حذف شد");
        if (onRefresh) onRefresh();
      } else {
        toast.error(`❌ خطا: ${response.data?.message || 'حذف ناموفق بود'}`);
      }
    } catch (err) {
      console.error("❌ خطا در حذف:", err);
      toast.error(`❌ خطا در حذف: ${err.response?.data?.message || err.message}`);
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
            position: absolute; left: 0; top: 0; width: 100%; padding: 20px;
            background: white; color: black; font-family: Arial, sans-serif;
          }
          .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .print-patient-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .print-test-item { border-bottom: 1px solid #eee; padding: 10px 0; }
          .print-test-item:last-child { border-bottom: none; }
          .print-label { font-weight: bold; color: #333; }
          .print-status { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .print-barcode { font-family: monospace; font-size: 18px; letter-spacing: 2px; }
          .no-print { display: none !important; }
        }
      </style>
    `;
    
    document.body.innerHTML = printStyles + printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handlePrintTest = (test) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد");
      return;
    }
    
    const patient = patientInfo?.patient || registration?.patient || {};
    
    const printContent = `
      <html dir="rtl">
        <head>
          <title>درخواست لابراتوار</title>
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
            <h2>🔬 درخواست لابراتوار</h2>
            <p>تاریخ: ${new Date(test.request_date).toLocaleDateString('fa-IR')}</p>
          </div>
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ''} ${patient.last_name || ''}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration?.visit_number || '-'}</span></div>
            <div class="info-item"><span class="label">بارکد:</span> <span class="barcode">${test.barcode || '-'}</span></div>
          </div>
          <h3>📋 اطلاعات تست</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>نوع تست</td><td>${test.test_type_label || test.test_type}</td></tr>
            <tr><td>نام تست</td><td>${test.test_name || '-'}</td></tr>
            <tr><td>شرح تست</td><td>${test.test_description || '-'}</td></tr>
            <tr><td>اندیکاسیون بالینی</td><td>${test.clinical_indication || '-'}</td></tr>
            <tr><td>نکات ویژه</td><td>${test.special_notes || '-'}</td></tr>
            <tr><td>وضعیت</td><td>${test.status_label || test.status}</td></tr>
            <tr><td>تاریخ نمونه‌گیری</td><td>${test.sample_collection_date ? new Date(test.sample_collection_date).toLocaleDateString('fa-IR') : '-'}</td></tr>
          </table>
          <div class="signature">
            <p>دکتر: ${test.doctor?.name || '-'}</p>
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

  const handlePrintResult = (result) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error("❌ پنجره پرینت باز نشد");
      return;
    }
    
    const patient = patientInfo?.patient || registration?.patient || {};
    const resultData = result.result_details || result;
    const testType = result.test_type_label || result.test_type || 'آزمایش';
    const testName = result.test_name || '';
    
    const statusLabels = {
      'Draft': 'پیش‌نویس', 'Completed': 'تکمیل شده',
      'Verified': 'تأیید شده', 'Delivered': 'تحویل شده', 'Cancelled': 'لغو شده'
    };
    
    const printContent = `
      <html dir="rtl">
        <head>
          <title>نتیجه لابراتوار</title>
          <style>
            body { font-family: 'Tahoma', Arial, sans-serif; padding: 20px; direction: rtl; }
            .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .header h2 { color: #10b981; }
            .info { margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .info-item { margin: 5px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .result-box { background: #f0fdf4; border: 2px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .result-value { font-size: 24px; font-weight: bold; color: #059669; }
            .signature { margin-top: 30px; border-top: 1px solid #333; padding-top: 10px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>✅ نتیجه آزمایش لابراتوار</h2>
            <p>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
          </div>
          
          <div class="info">
            <div class="info-item"><span class="label">نام مریض:</span> <span class="value">${patient.first_name || ''} ${patient.last_name || ''}</span></div>
            <div class="info-item"><span class="label">شماره مراجعه:</span> <span class="value">${registration?.visit_number || '-'}</span></div>
            <div class="info-item"><span class="label">بارکد:</span> <span class="value">${result.barcode || result.laboratory_request?.barcode || '-'}</span></div>
          </div>
          
          <h3>🔬 اطلاعات آزمایش</h3>
          <table>
            <tr><th>فیلد</th><th>مقدار</th></tr>
            <tr><td>نوع تست</td><td>${testType}</td></tr>
            ${testName ? `<tr><td>نام تست</td><td>${testName}</td></tr>` : ''}
            <tr><td>شماره گزارش</td><td>${resultData.report_no || '-'}</td></tr>
            <tr><td>وضعیت</td><td>${statusLabels[resultData.result_status] || resultData.result_status || '-'}</td></tr>
          </table>
          
          <div class="result-box">
            <div style="font-size: 14px; color: #555; margin-bottom: 5px;">💰 نتیجه:</div>
            <div class="result-value">${resultData.result || resultData.result_value || '-'}</div>
            ${resultData.normal_range ? `<div style="margin-top: 8px; font-size: 13px; color: #666;">محدوده نرمال: ${resultData.normal_range}</div>` : ''}
          </div>
          
          ${resultData.interpretation ? `
          <h3>📝 تفسیر</h3>
          <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">${resultData.interpretation}</div>
          ` : ''}
          
          ${resultData.recommendation ? `
          <h3>💡 توصیه</h3>
          <div style="padding: 10px; background: #fef3c7; border-radius: 5px;">${resultData.recommendation}</div>
          ` : ''}
          
          ${resultData.remarks ? `
          <h3>📌 یادداشت</h3>
          <div style="padding: 10px; background: #f9fafb; border-radius: 5px;">${resultData.remarks}</div>
          ` : ''}
          
          <div class="signature">
            <div>
              <p>تاریخ نتیجه: ${resultData.analysis_completed_at ? new Date(resultData.analysis_completed_at).toLocaleDateString('fa-IR') : '-'}</p>
            </div>
            <div>
              <p>امضاء: _________________</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPdf = async (laboratoryResultId, fileName) => {
    if (!laboratoryResultId) {
      toast.error("❌ شناسه نتیجه موجود نیست");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      toast.info("⏳ در حال دانلود فایل...");
      
      const response = await fetch(`http://localhost:8000/api/laboratory-results/download/${laboratoryResultId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        if (response.status === 401) { toast.error("❌ نشست منقضی شده"); return; }
        if (response.status === 404) { toast.error("❌ فایل یافت نشد"); return; }
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

  // ============ نمایش نتایج — استایل ملایم ============
  const renderResults = () => {
    let allResults = [];
    
    if (resultsData && resultsData.length > 0) {
      allResults = [...resultsData];
    }
    
    if (tests && tests.length > 0) {
      for (const test of tests) {
        if (test.has_result && test.result_details) {
          const exists = allResults.some(r => 
            r.id === test.result_details.id || 
            r.laboratory_request_id === test.id
          );
          if (!exists) {
            allResults.push({
              ...test.result_details,
              laboratory_request_id: test.id,
              test_type: test.test_type,
              test_type_label: test.test_type_label,
              test_name: test.test_name,
              result_details: test.result_details
            });
          }
        }
      }
    }
    
    if (allResults.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: C.textSecondary, 
          background: C.cardBg, 
          borderRadius: '10px', 
          border: `1px dashed ${C.border}`, 
          marginTop: '25px',
          boxShadow: C.shadow
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
          <div>هنوز نتیجه‌ای برای تست‌ها ثبت نشده است</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            نتایج پس از ثبت در بخش لابراتوار در اینجا نمایش داده می‌شود
          </div>
          <button
            onClick={() => { loadResultsFromServer(); loadTestsFromServer(); }}
            style={{ ...styles.btn, background: C.accent, color: 'white', marginTop: '10px', padding: '8px 18px' }}
          >
            🔄 بررسی مجدد
          </button>
        </div>
      );
    }
    
    const statusLabels = {
      'Draft': 'پیش‌نویس', 'Completed': 'تکمیل شده',
      'Verified': 'تأیید شده', 'Delivered': 'تحویل شده', 'Cancelled': 'لغو شده'
    };
    
    const statusColors = {
      'Draft': '#f59e0b', 'Completed': '#10b981',
      'Verified': '#3b82f6', 'Delivered': '#8b5cf6', 'Cancelled': '#ef4444'
    };
    
    return (
      <div style={{ marginTop: '25px', borderTop: `2px solid ${C.border}`, paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: C.success, margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✅</span>
            نتایج ثبت شده لابراتوار
            <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 'normal' }}>
              ({allResults.length} نتیجه)
            </span>
          </h4>
          <button
            onClick={() => { loadResultsFromServer(); loadTestsFromServer(); }}
            style={{ ...styles.btn, background: C.accent, color: 'white', padding: '6px 14px' }}
          >
            🔄 بارگذاری مجدد
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>🔬 نوع تست</th>
                <th style={styles.th}>📝 نام تست</th>
                <th style={styles.th}>📋 شماره گزارش</th>
                <th style={styles.th}>💰 نتیجه</th>
                <th style={styles.th}>📏 محدوده نرمال</th>
                <th style={styles.th}>📊 وضعیت</th>
                <th style={styles.th}>📅 تاریخ</th>
                <th style={styles.th}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((result, index) => {
                const resultData = result.result_details || result;
                const testType = result.test_type_label || result.test_type || 'آزمایش';
                const testName = result.test_name || '';
                const statusLabel = statusLabels[resultData.result_status] || resultData.result_status || 'نامشخص';
                const statusColor = statusColors[resultData.result_status] || '#f59e0b';
                
                return (
                  <tr key={result.id || index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={{ ...styles.td, color: C.accent, fontWeight: 'bold' }}>
                      {testType}
                    </td>
                    <td style={styles.td}>{testName || '-'}</td>
                    <td style={styles.td}>
                      <code style={{ background: C.softBg, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", color: C.textPrimary }}>
                        {resultData.report_no || '-'}
                      </code>
                    </td>
                    <td style={{ ...styles.td, color: '#059669', fontWeight: 'bold', fontSize: '14px' }}>
                      {resultData.result || resultData.result_value || '-'}
                    </td>
                    <td style={{ ...styles.td, color: C.textSecondary, fontSize: '12px' }}>
                      {resultData.normal_range || '-'}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: statusColor }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {resultData.analysis_completed_at 
                        ? new Date(resultData.analysis_completed_at).toLocaleDateString('fa-IR')
                        : resultData.created_at 
                          ? new Date(resultData.created_at).toLocaleDateString('fa-IR') 
                          : '-'}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {(resultData.pdf_url || resultData.pdf_file) ? (
                          <a
                            href={resultData.pdf_url || `/storage/${resultData.pdf_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              ...styles.btn, 
                              background: C.accent, 
                              color: 'white', 
                              textDecoration: 'none', 
                              marginRight: 0,
                              display: 'inline-block'
                            }}
                            title="مشاهده"
                          >
                            👁️ مشاهده
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              const resultId = resultData.id || result.id;
                              handleDownloadPdf(resultId, resultData.pdf_file_name || 'result.pdf');
                            }}
                            style={{ ...styles.btn, background: C.accent, color: 'white', marginRight: 0 }}
                            title="مشاهده"
                          >
                            👁️ مشاهده
                          </button>
                        )}
                        
                        <button
                          onClick={() => handlePrintResult(result)}
                          style={{ ...styles.btn, background: C.purple, color: 'white', marginRight: 0 }}
                          title="پرینت"
                        >
                          🖨️ پرینت
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const patient = patientInfo?.patient || registration?.patient || {};
  const isDisabled = isCompleted || isTreatmentComplete || isSubmitting || isSubmittingForm;
  const labRequested = isLabRequested !== undefined ? isLabRequested : tests.length > 0;

  const getGenderText = (gender) => {
    if (!gender) return '-';
    const genderMap = { 'male': '♂️ مرد', 'female': '♀️ زن', 'other': '⚧️ دیگر' };
    return genderMap[gender] || gender;
  };

  const statusColors = {
    pending: '#f59e0b', sample_taken: '#3b82f6', in_progress: '#8b5cf6',
    completed: '#10b981', cancelled: '#6b7280', rejected: '#ef4444', sent_to_lab: '#8b5cf6'
  };

  const statusLabels = {
    pending: 'در انتظار', sample_taken: 'نمونه گرفته شده', in_progress: 'در حال انجام',
    completed: 'تکمیل شده', cancelled: 'لغو شده', rejected: 'رد شده', sent_to_lab: 'ارسال به لابراتوار'
  };

  const filterAndSearchList = (list) => {
    let filtered = list;

    if (listFilter === 'with_result') filtered = filtered.filter(item => item.has_result && item.result_details);
    else if (listFilter === 'without_result') filtered = filtered.filter(item => !item.has_result || !item.result_details);
    else if (listFilter === 'pending') filtered = filtered.filter(item => item.status === 'pending');
    else if (listFilter === 'sample_taken') filtered = filtered.filter(item => item.status === 'sample_taken');
    else if (listFilter === 'completed') filtered = filtered.filter(item => item.status === 'completed');
    else if (listFilter === 'sent_to_lab') filtered = filtered.filter(item => item.status === 'sent_to_lab');

    if (listSearchTerm.trim()) {
      const term = listSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const typeLabel = (item.test_type_label || item.test_type || '').toLowerCase();
        const testName = (item.test_name || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();
        const description = (item.test_description || '').toLowerCase();
        const indication = (item.clinical_indication || '').toLowerCase();
        const reportNo = (item.result_details?.report_no || '').toLowerCase();
        const result = (item.result_details?.result || '').toLowerCase();

        return typeLabel.includes(term) || testName.includes(term) || barcode.includes(term) ||
          description.includes(term) || indication.includes(term) || reportNo.includes(term) || result.includes(term);
      });
    }

    return filtered;
  };

  const filteredTests = filterAndSearchList(tests);

  const countWithResult = tests.filter(t => t.has_result && t.result_details).length;
  const countWithoutResult = tests.filter(t => !t.has_result || !t.result_details).length;
  const countPending = tests.filter(t => t.status === 'pending').length;
  const countSampleTaken = tests.filter(t => t.status === 'sample_taken').length;
  const countCompleted = tests.filter(t => t.status === 'completed').length;
  const countSentToLab = tests.filter(t => t.status === 'sent_to_lab').length;

  if (!registration || !registration.reg_id) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: C.danger, background: C.cardBg, borderRadius: '10px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '18px' }}>اطلاعات مریض معتبر نیست</div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: C.danger, background: C.cardBg, borderRadius: '10px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🌐</div>
        <div style={{ fontSize: '18px' }}>خطای اتصال به سرور</div>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '20px', backgroundColor: C.accent, color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
        >
          🔄 تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, background: C.pageBg, minHeight: '100vh', padding: '20px', borderRadius: '10px' }}>
      <div id="print-content" style={{ display: 'none' }}>
        <div className="print-header">
          <h2>🔬 درخواست لابراتوار</h2>
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
        <h3>📋 لیست تست‌های لابراتوار</h3>
        {tests.map((test) => (
          <div key={test.id} className="print-test-item">
            <div>
              <strong>{test.test_type_label || test.test_type}</strong>
              <span className="print-status" style={{ backgroundColor: statusColors[test.status] || '#6b7280', color: 'white', padding: '2px 8px', borderRadius: '4px', marginRight: '10px' }}>
                {statusLabels[test.status] || test.status}
              </span>
            </div>
            {test.test_name && <div>نام تست: {test.test_name}</div>}
            {test.clinical_indication && <div>اندیکاسیون: {test.clinical_indication}</div>}
            <div style={{ fontSize: '12px', color: '#666' }}>
              تاریخ درخواست: {test.request_date ? new Date(test.request_date).toLocaleDateString('fa-IR') : '-'}
              {test.barcode && ` | بارکد: ${test.barcode}`}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ color: C.textPrimary, marginBottom: '15px', borderBottom: `2px solid ${C.border}`, paddingBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
        🔬 درخواست لابراتوار
      </h3>

      {/* آمار */}
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: labRequested ? C.success : C.warning }}>
            {labRequested ? '✅' : '⏳'}
          </div>
          <div style={styles.statLabel}>{labRequested ? 'ثبت شده' : 'ثبت نشده'}</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: C.accent }}>{tests.length}</div>
          <div style={styles.statLabel}>تعداد تست‌ها</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: hasResults ? C.success : C.textMuted, fontSize: "16px" }}>
            {hasResults ? `✅ ${resultsData.length}` : '❌'}
          </div>
          <div style={styles.statLabel}>نتایج ثبت شده</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statValue, color: isCompleted ? C.success : C.warning }}>
            {isCompleted ? '✅' : '⏳'}
          </div>
          <div style={styles.statLabel}>{isCompleted ? 'ختم شده' : 'در حال 진행'}</div>
        </div>
      </div>

      {/* اطلاعات مریض */}
      <div style={styles.infoCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
          <h5 style={{ color: C.textPrimary, margin: 0, fontSize: '14px' }}>👤 اطلاعات مریض</h5>
          {loadingTests && <span style={{ color: C.textSecondary, fontSize: '11px' }}>⏳ در حال بارگذاری...</span>}
        </div>
        <div style={styles.infoGrid}>
          <div>
            <span style={styles.infoLabel}>نام کامل</span>
            <div style={styles.infoValue}>{patient.first_name || ''} {patient.last_name || ''}</div>
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
            <div style={{ ...styles.infoValue, color: '#b45309' }}>{registration?.visit_number || '-'}</div>
          </div>
          {barcode && (
            <div>
              <span style={styles.infoLabel}>بارکد</span>
              <div style={{ ...styles.infoValue, color: '#b45309', fontFamily: 'monospace' }}>{barcode}</div>
            </div>
          )}
        </div>
      </div>

      {/* فرم */}
      <form onSubmit={handleSubmit} className="no-print" style={styles.card}>
        <h4 style={{ color: C.textPrimary, marginBottom: '15px', fontSize: '15px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
          📋 ثبت درخواست جدید
        </h4>

        <div style={styles.formGrid}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>نوع تست *</label>
              <select name="test_type" value={formData.test_type} onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} required>
                <option value="">-- انتخاب کنید --</option>
                {testTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>نام تست</label>
              <input type="text" name="test_name" value={formData.test_name} onChange={handleChange}
                placeholder="مثلاً CBC, FBS, TSH..."
                style={{ ...styles.input, opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>تاریخ درخواست</label>
              <input type="date" name="request_date" value={formData.request_date} onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>تاریخ نمونه‌گیری</label>
              <input type="date" name="sample_collection_date" value={formData.sample_collection_date} onChange={handleChange}
                style={{ ...styles.input, opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>شرح تست</label>
              <textarea name="test_description" value={formData.test_description} onChange={handleChange}
                rows="2" placeholder="شرح کامل تست..."
                style={{ ...styles.input, minHeight: "55px", opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>اندیکاسیون بالینی</label>
              <textarea name="clinical_indication" value={formData.clinical_indication} onChange={handleChange}
                rows="2" placeholder="دلیل درخواست تست..."
                style={{ ...styles.input, minHeight: "55px", opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>نکات ویژه</label>
              <textarea name="special_notes" value={formData.special_notes} onChange={handleChange}
                rows="2" placeholder="نکات ویژه برای لابراتوار..."
                style={{ ...styles.input, minHeight: "55px", opacity: isDisabled || labRequested ? 0.5 : 1 }}
                disabled={isDisabled || labRequested} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap', borderTop: `1px solid ${C.border}`, paddingTop: '15px' }}>
          <button type="button" onClick={onPrevStep} disabled={isSubmitting}
            style={{ ...styles.btn, background: C.cardBg, color: C.textPrimary, border: `1px solid ${C.border}`, padding: '10px 24px', opacity: isSubmitting ? 0.6 : 1 }}>
            ↩️ برگشت
          </button>
          <button type="submit" disabled={loading || isDisabled || labRequested}
            style={{ ...styles.btn, background: (isDisabled || labRequested) ? C.textMuted : C.purple, color: 'white', padding: '10px 24px', opacity: (loading || isDisabled || labRequested) ? 0.6 : 1, boxShadow: (isDisabled || labRequested) ? 'none' : `0 2px 8px ${C.purple}40` }}>
            📤 {loading ? 'در حال ارسال...' : isCompleted ? 'معالجه ختم شده' : labRequested ? '✅ ثبت شده' : 'ثبت درخواست'}
          </button>
          {tests.length > 0 && (
            <button type="button" onClick={handlePrint} style={{ ...styles.btn, background: C.success, color: 'white', padding: '10px 24px', boxShadow: `0 2px 8px ${C.success}40` }}>
              🖨️ پرینت همه
            </button>
          )}
          <button type="button" onClick={onFinish} disabled={!labRequested || isCompleted || isSubmitting}
            style={{ ...styles.btn, background: (!labRequested || isCompleted) ? C.textMuted : C.danger, color: 'white', padding: '10px 24px', opacity: (!labRequested || isCompleted || isSubmitting) ? 0.6 : 1 }}>
            🏁 {isCompleted ? '✅ ختم شده' : 'ختم معالجه'}
          </button>
          {nextStep && (
            <button type="button" onClick={onNextStep} disabled={isSubmitting}
              style={{ ...styles.btn, background: isSubmitting ? C.textMuted : C.accent, color: 'white', padding: '10px 24px', opacity: isSubmitting ? 0.6 : 1, boxShadow: isSubmitting ? 'none' : `0 2px 8px ${C.accent}40` }}>
              ➡️ رفتن به {nextStep.label}
            </button>
          )}
        </div>
      </form>

      {/* لیست تست‌ها */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: C.textPrimary, fontSize: '15px', margin: 0 }}>
            📋 لیست تست‌های لابراتوار ({filteredTests.length}
            {listFilter !== 'all' || listSearchTerm ? ` از ${tests.length}` : ''})
            {loadingTests && <span style={{ marginLeft: '10px', fontSize: '13px', color: C.textSecondary }}>⏳ در حال بارگذاری...</span>}
          </h4>
        </div>

        {tests.length > 0 && (
          <div style={styles.filters}>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'all' ? { background: C.accent, color: "white", borderColor: C.accent } : {}) }}
              onClick={() => setListFilter('all')}>📋 همه ({tests.length})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'with_result' ? { background: C.success, color: "white", borderColor: C.success } : {}) }}
              onClick={() => setListFilter('with_result')}>✅ دارای نتیجه ({countWithResult})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'without_result' ? { background: C.warning, color: "white", borderColor: C.warning } : {}) }}
              onClick={() => setListFilter('without_result')}>⏳ بدون نتیجه ({countWithoutResult})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'pending' ? { background: C.warning, color: "white", borderColor: C.warning } : {}) }}
              onClick={() => setListFilter('pending')}>🕐 در انتظار ({countPending})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'sample_taken' ? { background: C.accent, color: "white", borderColor: C.accent } : {}) }}
              onClick={() => setListFilter('sample_taken')}>🧪 نمونه گرفته شده ({countSampleTaken})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'sent_to_lab' ? { background: C.purple, color: "white", borderColor: C.purple } : {}) }}
              onClick={() => setListFilter('sent_to_lab')}>📤 ارسال شده ({countSentToLab})</button>
            <button style={{ ...styles.filterBtn, ...(listFilter === 'completed' ? { background: C.success, color: "white", borderColor: C.success } : {}) }}
              onClick={() => setListFilter('completed')}>✅ تکمیل شده ({countCompleted})</button>

            <input type="text" placeholder="🔍 جستجو در نوع، نام، بارکد، شرح، شماره گزارش..."
              value={listSearchTerm} onChange={(e) => setListSearchTerm(e.target.value)} style={styles.searchInput} />

            <button onClick={loadTestsFromServer} disabled={loadingTests}
              style={{ ...styles.btn, background: C.accent, color: 'white', padding: '8px 16px', opacity: loadingTests ? 0.6 : 1, boxShadow: `0 2px 8px ${C.accent}40` }}>
              🔄 بروزرسانی
            </button>

            {tests.length > 0 && (
              <button onClick={handlePrint} className="no-print"
                style={{ ...styles.btn, background: C.success, color: 'white', padding: '8px 16px', boxShadow: `0 2px 8px ${C.success}40` }}>
                🖨️ پرینت
              </button>
            )}
          </div>
        )}

        {tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textSecondary, background: C.cardBg, borderRadius: '10px', border: `1px dashed ${C.border}`, boxShadow: C.shadow }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <div>هیچ تست لابراتواری ثبت نشده است</div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textSecondary, background: C.cardBg, borderRadius: '10px', border: `1px dashed ${C.border}`, boxShadow: C.shadow }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div>هیچ تستی با این فیلتر/جستجو یافت نشد</div>
            <button onClick={() => { setListFilter('all'); setListSearchTerm(''); }}
              style={{ ...styles.btn, background: C.accent, color: 'white', marginTop: '10px', padding: '8px 16px' }}>
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
                  <th style={styles.th}>🔬 نوع تست</th>
                  <th style={styles.th}>📝 نام تست</th>
                  <th style={styles.th}>📅 تاریخ</th>
                  <th style={styles.th}>📊 وضعیت</th>
                  <th style={styles.th}>💰 فیس</th>
                  <th style={styles.th}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test, index) => (
                  <tr key={test.id || index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <code style={{ background: C.softBg, padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: 'monospace', color: C.textPrimary }}>
                        {test.barcode || '-'}
                      </code>
                    </td>
                    <td style={{ ...styles.td, color: C.accent, fontWeight: 'bold' }}>{test.test_type_label || test.test_type || '-'}</td>
                    <td style={styles.td}>{test.test_name || '-'}</td>
                    <td style={styles.td}>{test.request_date ? new Date(test.request_date).toLocaleDateString('fa-IR') : '-'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: statusColors[test.status] || '#6b7280' }}>
                        {statusLabels[test.status] || test.status || 'نامشخص'}
                      </span>
                      {test.has_result && (
                        <span style={{ ...styles.badge, backgroundColor: C.success, marginLeft: '4px', fontSize: '9px', padding: '2px 6px' }}>✅ نتیجه</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {test.has_fee ? (
                        <span style={{ ...styles.badge, backgroundColor: C.success, fontSize: '10px' }}>✅ ثبت شده</span>
                      ) : (
                        <span style={{ color: C.textSecondary, fontSize: '11px' }}>❌ ثبت نشده</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEditTest(test)}
                          disabled={test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab'}
                          style={{ ...styles.btn, background: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? C.textMuted : C.accent, color: 'white', opacity: (test.status === 'completed' || test.status === 'cancelled' || test.status === 'sent_to_lab') ? 0.5 : 1, marginRight: 0 }}
                          title="ویرایش">✏️</button>
                        <button onClick={() => handleDeleteTest(test.id)}
                          disabled={test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee}
                          style={{ ...styles.btn, background: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? C.textMuted : C.danger, color: 'white', opacity: (test.status === 'completed' || test.status === 'in_progress' || test.status === 'sample_taken' || test.status === 'sent_to_lab' || test.has_fee) ? 0.5 : 1, marginRight: 0 }}
                          title="حذف">🗑️</button>
                        <button onClick={() => handlePrintTest(test)}
                          style={{ ...styles.btn, background: C.purple, color: 'white', marginRight: 0 }} title="پرینت">🖨️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نمایش نتایج */}
      {renderResults()}

      {/* مودال ویرایش */}
      {showEditModal && (
        <div style={styles.modal} onClick={() => { setShowEditModal(false); setEditingTest(null); resetForm(); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: C.accent, marginBottom: '20px' }}>✏️ ویرایش تست لابراتوار</h2>
            
            {barcode && (
              <div style={{ background: C.softBg, padding: '10px 14px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${C.border}` }}>
                <span style={{ color: C.textSecondary, fontSize: '12px' }}>بارکد:</span>
                <span style={{ color: '#b45309', fontFamily: 'monospace', fontWeight: 'bold' }}>{barcode}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={styles.label}>نوع تست *</label>
                <select name="test_type" value={formData.test_type} onChange={handleChange} style={styles.input}>
                  {testTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>نام تست</label>
                <input type="text" name="test_name" value={formData.test_name} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>شرح تست</label>
                <textarea name="test_description" value={formData.test_description} onChange={handleChange} rows="2" style={{ ...styles.input, minHeight: "55px" }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>اندیکاسیون بالینی</label>
                <textarea name="clinical_indication" value={formData.clinical_indication} onChange={handleChange} rows="2" style={{ ...styles.input, minHeight: "55px" }} />
              </div>
              <div>
                <label style={styles.label}>تاریخ درخواست</label>
                <input type="date" name="request_date" value={formData.request_date} onChange={handleChange} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>تاریخ نمونه‌گیری</label>
                <input type="date" name="sample_collection_date" value={formData.sample_collection_date} onChange={handleChange} style={styles.input} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={styles.label}>نکات ویژه</label>
                <textarea name="special_notes" value={formData.special_notes} onChange={handleChange} rows="2" style={{ ...styles.input, minHeight: "55px" }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
              <button onClick={() => { setShowEditModal(false); setEditingTest(null); resetForm(); }}
                style={{ ...styles.btn, background: C.cardBg, color: C.textPrimary, border: `1px solid ${C.border}`, padding: '10px 24px' }}>لغو</button>
              <button onClick={handleUpdateTest} disabled={loading}
                style={{ ...styles.btn, background: loading ? C.textMuted : C.accent, color: 'white', padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 2px 8px ${C.accent}40` }}>
                {loading ? 'در حال ذخیره...' : '💾 ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}