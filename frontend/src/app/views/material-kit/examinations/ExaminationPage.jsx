import { useState, useEffect } from "react";
import MainLayoutjur from "../../../../components/MainLayoutjur";
import { useAuth } from "app/contexts/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PatientQueue from "./patientsqueue/PatientQueue";
import ExaminationForm from "./examinate/ExaminationForm";
import LaboratoryRequest from "./laborate/LaboratoryRequest";
import PrescriptionForm from "../pres_insert/pres_insert";
import HistoryList from "./historytreanment/HistoryList";
import RadiologyRequest from "./radiology/RadiologyRequest";
import FollowUp from "./follow/FollowUp";
import Admission from "./admission/Admission";
import OperationRoom from "./operations/OperationRoom";

export default function TreatmentPage() {
  const { api } = useAuth();
  
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ============ مدیریت چندین مریض فعال ============
  const [activePatients, setActivePatients] = useState({});
  // ساختار: { reg_id: { examination: {...}, laboratory: {...}, ... } }

  // ============ مریض جاری ============
  const [currentPatientId, setCurrentPatientId] = useState(null);

  // ============ تعریف مراحل درمان ============
  const STEPS = [
    { key: 'queue', label: 'صف انتظار', icon: '📋', color: '#3b82f6' },
    { key: 'examination', label: 'معاینه', icon: '🩺', color: '#3b82f6' },
    { key: 'laboratory', label: 'لابراتوار', icon: '🔬', color: '#8b5cf6' },
    { key: 'radiology', label: 'رادیولوژی', icon: '📷', color: '#ec4899' },
    { key: 'operation', label: 'عملیات خانه', icon: '🔪', color: '#dc2626' },
    { key: 'pres_insert', label: 'نسخه', icon: '📝', color: '#10b981' },
    { key: 'followup', label: 'ملاقات بعدی', icon: '📅', color: '#f59e0b' },
    { key: 'admission', label: 'بستری', icon: '🏥', color: '#ef4444' },
    { key: 'history', label: 'تاریخچه', icon: '📜', color: '#8b5cf6' }
  ];

  // ============ وضعیت عملیات جاری ============
  const [treatmentProgress, setTreatmentProgress] = useState({
    currentStepIndex: 0,
    completedSteps: [],
    isComplete: false,
    startTime: null,
    endTime: null,
    registrationId: null,
    savedData: {}
  });

  // ============ کلید ذخیره‌سازی در localStorage ============
  const STORAGE_KEY = 'treatment_progress_data';
  const ACTIVE_PATIENTS_KEY = 'active_patients_data';

  // ============ ذخیره وضعیت در localStorage ============
  const saveToLocalStorage = (progress, regId) => {
    try {
      const dataToSave = {
        ...progress,
        registrationId: regId || progress.registrationId,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error("خطا در ذخیره localStorage:", err);
    }
  };

  // ============ ذخیره مریض‌های فعال ============
  const saveActivePatients = (patients) => {
    try {
      localStorage.setItem(ACTIVE_PATIENTS_KEY, JSON.stringify(patients));
    } catch (err) {
      console.error("خطا در ذخیره مریض‌های فعال:", err);
    }
  };

  // ============ بازیابی مریض‌های فعال ============
  const loadActivePatients = () => {
    try {
      const saved = localStorage.getItem(ACTIVE_PATIENTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("خطا در بازیابی مریض‌های فعال:", err);
    }
    return {};
  };

  // ============ بازیابی وضعیت از localStorage ============
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return parsed;
      }
    } catch (err) {
      console.error("خطا در بازیابی localStorage:", err);
    }
    return null;
  };

  // ============ پاک کردن وضعیت ذخیره شده ============
  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // ============ بارگذاری وضعیت از سرور ============
  const loadProgressFromServer = async (registrationId) => {
    try {
      const response = await api.get(`/doctor/treatment/progress/${registrationId}`);
      if (response.data && response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.log("وضعیت در سرور یافت نشد");
    }
    return null;
  };

  // ============ ذخیره وضعیت در سرور ============
  const saveProgressToServer = async (progress, registrationId) => {
    try {
      await api.post('/doctor/treatment/progress/save', {
        registration_id: registrationId || progress.registrationId,
        ...progress
      });
    } catch (err) {
      console.error("خطا در ذخیره سرور:", err);
    }
  };

  // ============ تابع به‌روزرسانی وضعیت ============
  const updateTreatmentProgress = async (newProgress, regId) => {
    const registrationId = regId || newProgress.registrationId || treatmentProgress.registrationId;
    setTreatmentProgress(newProgress);
    saveToLocalStorage(newProgress, registrationId);
    if (registrationId) {
      await saveProgressToServer(newProgress, registrationId);
    }
  };

  // ============ بارگذاری معاینات یک مریض خاص ============
  const loadExaminations = async (registrationId) => {
    try {
      const response = await api.get(`/doctor/examination/${registrationId}`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        // ذخیره در activePatients
        setActivePatients(prev => ({
          ...prev,
          [registrationId]: {
            ...prev[registrationId],
            examination: {
              data: data.examination || null,
              allExaminations: data.all_examinations || [],
              isExamined: !!data.examination
            }
          }
        }));
        return data;
      }
    } catch (err) {
      console.log("هیچ معاینه‌ای یافت نشد");
      setActivePatients(prev => ({
        ...prev,
        [registrationId]: {
          ...prev[registrationId],
          examination: {
            data: null,
            allExaminations: [],
            isExamined: false
          }
        }
      }));
    }
    return null;
  };

  // ============ بارگذاری تست‌های لابراتوار یک مریض خاص ============
  const loadLaboratoryTests = async (registrationId) => {
    try {
      const response = await api.get(`/doctor/laboratory/${registrationId}`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setActivePatients(prev => ({
          ...prev,
          [registrationId]: {
            ...prev[registrationId],
            laboratory: {
              data: data.test || null,
              allTests: data.all_tests || [],
              isRequested: !!data.test
            }
          }
        }));
        return data;
      }
    } catch (err) {
      console.log("هیچ تست لابراتواری یافت نشد");
      setActivePatients(prev => ({
        ...prev,
        [registrationId]: {
          ...prev[registrationId],
          laboratory: {
            data: null,
            allTests: [],
            isRequested: false
          }
        }
      }));
    }
    return null;
  };

  // ============ تابع شروع درمان ============
  const startTreatment = async (registration) => {
    if (!registration || !registration.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }

    const regId = registration.reg_id;

    try {
      // بررسی اینکه آیا مریض قبلاً فعال است
      if (activePatients[regId]) {
        // مریض فعال است، فقط انتخابش کن
        setCurrentPatientId(regId);
        setSelectedRegistration(registration);
        setActiveTab("examination");
        toast.info(`👤 بازگشت به معالجه ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
        return;
      }

      // مریض جدید - بارگذاری اطلاعات
      await loadExaminations(regId);
      await loadLaboratoryTests(regId);

      // تنظیم مریض جاری
      setCurrentPatientId(regId);
      setSelectedRegistration(registration);
      setActiveTab("examination");

      // تنظیم treatmentProgress
      const newProgress = {
        currentStepIndex: 1,
        completedSteps: ['queue'],
        isComplete: false,
        startTime: new Date().toISOString(),
        endTime: null,
        registrationId: regId,
        savedData: {}
      };
      setTreatmentProgress(newProgress);
      saveToLocalStorage(newProgress, regId);

      // ذخیره مریض‌های فعال
      saveActivePatients(activePatients);

      toast.info(`👨‍⚕️ شروع درمان برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
      
    } catch (err) {
      console.error("خطا در شروع درمان:", err);
      toast.error("❌ خطا در شروع درمان");
    }
  };

  // ============ بارگذاری اطلاعات مریض هنگام انتخاب ============
  const loadPatientData = async (registrationId) => {
    if (!registrationId) return;
    
    // اگر اطلاعات مریض قبلاً بارگذاری شده، از کش استفاده کن
    if (activePatients[registrationId]) {
      return activePatients[registrationId];
    }

    // بارگذاری از سرور
    await loadExaminations(registrationId);
    await loadLaboratoryTests(registrationId);
    
    return activePatients[registrationId];
  };

  // ============ رفتن به مرحله بعدی ============
  const goToNextStep = async () => {
    const currentIndex = treatmentProgress.currentStepIndex;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= STEPS.length) {
      toast.info("✅ تمام مراحل درمان تکمیل شد");
      return;
    }
    
    const currentStep = STEPS[currentIndex];
    const newCompletedSteps = [...treatmentProgress.completedSteps];
    if (!newCompletedSteps.includes(currentStep.key)) {
      newCompletedSteps.push(currentStep.key);
    }
    
    const newProgress = {
      ...treatmentProgress,
      currentStepIndex: nextIndex,
      completedSteps: newCompletedSteps
    };
    
    await updateTreatmentProgress(newProgress);
    setActiveTab(STEPS[nextIndex].key);
    toast.info(`➡️ رفتن به مرحله ${STEPS[nextIndex].label}`);
  };

  // ============ برگشت به مرحله قبلی ============
  const goToPreviousStep = async () => {
    const currentIndex = treatmentProgress.currentStepIndex;
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 1) {
      setActiveTab('queue');
      toast.info("↩️ بازگشت به صف انتظار");
      return;
    }
    
    const newProgress = {
      ...treatmentProgress,
      currentStepIndex: prevIndex,
      completedSteps: treatmentProgress.completedSteps.filter(step => step !== STEPS[currentIndex].key)
    };
    
    await updateTreatmentProgress(newProgress);
    setActiveTab(STEPS[prevIndex].key);
    toast.info(`↩️ بازگشت به مرحله ${STEPS[prevIndex].label}`);
  };

  // ============ ثبت اطلاعات مرحله فعلی ============
  const saveCurrentStep = async (data) => {
    setIsSubmitting(true);
    try {
      const currentStep = STEPS[treatmentProgress.currentStepIndex];
      const regId = selectedRegistration?.reg_id;
      
      const response = await api.post(`/doctor/${currentStep.key}/save`, {
        registration_id: regId,
        ...data
      });
      
      // به‌روزرسانی داده‌های معاینه در activePatients
      if (response.data?.data && regId) {
        if (currentStep.key === 'examination') {
          setActivePatients(prev => ({
            ...prev,
            [regId]: {
              ...prev[regId],
              examination: {
                data: response.data.data.examination || null,
                allExaminations: response.data.data.all_examinations || [],
                isExamined: !!response.data.data.examination
              }
            }
          }));
        }
      }
      
      toast.success(`✅ اطلاعات ${currentStep.label} با موفقیت ثبت شد`);
      
      // به‌روزرسانی وضعیت
      const newProgress = {
        ...treatmentProgress,
        completedSteps: [...treatmentProgress.completedSteps, currentStep.key],
        savedData: {
          ...treatmentProgress.savedData,
          [currentStep.key]: data
        }
      };
      await updateTreatmentProgress(newProgress);
      
      // ذخیره مریض‌های فعال
      saveActivePatients(activePatients);
      
      return response.data;
    } catch (err) {
      console.error("خطا در ثبت اطلاعات:", err);
      toast.error(`❌ خطا در ثبت اطلاعات: ${err.response?.data?.message || err.message}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ ختم معالجه ============
  const finishTreatment = async () => {
    if (!selectedRegistration) {
      toast.error("❌ مریضی انتخاب نشده است");
      return;
    }

    const requiredSteps = ['examination', 'pres_insert'];
    const missingSteps = requiredSteps.filter(step => 
      !treatmentProgress.completedSteps.includes(step)
    );

    if (missingSteps.length > 0) {
      const missingLabels = missingSteps.map(s => STEPS.find(st => st.key === s)?.label || s);
      if (!window.confirm(`⚠️ مراحل ${missingLabels.join('، ')} هنوز تکمیل نشده است. آیا مطمئن هستید؟`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/doctor/treatment/complete', {
        registration_id: selectedRegistration.reg_id,
        completed_steps: treatmentProgress.completedSteps,
        start_time: treatmentProgress.startTime,
        end_time: new Date().toISOString()
      });

      await api.put(`/registrations/${selectedRegistration.reg_id}/status`, {
        visit_status: 'Completed'
      });

      toast.success("✅ معالجه با موفقیت به پایان رسید");
      
      // حذف مریض از لیست فعال
      const regId = selectedRegistration.reg_id;
      setActivePatients(prev => {
        const newPatients = { ...prev };
        delete newPatients[regId];
        saveActivePatients(newPatients);
        return newPatients;
      });

      setTimeout(() => {
        setSelectedRegistration(null);
        setCurrentPatientId(null);
        const resetProgress = {
          currentStepIndex: 0,
          completedSteps: [],
          isComplete: false,
          startTime: null,
          endTime: null,
          registrationId: null,
          savedData: {}
        };
        setTreatmentProgress(resetProgress);
        clearSavedProgress();
        setActiveTab('queue');
        refreshData();
      }, 2000);

    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error("❌ خطا در ختم معالجه");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ بازگشت به صف ============
  const goBackToQueue = () => {
    setSelectedRegistration(null);
    setCurrentPatientId(null);
    setSelectedHistory(null);
    const resetProgress = {
      currentStepIndex: 0,
      completedSteps: [],
      isComplete: false,
      startTime: null,
      endTime: null,
      registrationId: null,
      savedData: {}
    };
    setTreatmentProgress(resetProgress);
    clearSavedProgress();
    setActiveTab("queue");
    refreshData();
  };

  // ============ بازیابی وضعیت در اولین بارگذاری ============
  const restoreSavedState = async () => {
    try {
      // بازیابی مریض‌های فعال
      const savedPatients = loadActivePatients();
      if (savedPatients && Object.keys(savedPatients).length > 0) {
        setActivePatients(savedPatients);
      }

      const savedLocal = loadFromLocalStorage();
      
      if (savedLocal && savedLocal.registrationId) {
        try {
          const queueResponse = await api.get("/doctor/queue");
          const queueData = queueResponse.data?.data || queueResponse.data || [];
          const isInQueue = queueData.some(r => r.reg_id === savedLocal.registrationId);
          
          if (isInQueue) {
            const reg = queueData.find(r => r.reg_id === savedLocal.registrationId);
            setSelectedRegistration(reg);
            setCurrentPatientId(savedLocal.registrationId);
            setTreatmentProgress(savedLocal);
            setActiveTab(STEPS[savedLocal.currentStepIndex]?.key || 'examination');
            
            // بارگذاری معاینات
            await loadExaminations(savedLocal.registrationId);
            
            toast.info(`↩️ ادامه درمان از مرحله ${STEPS[savedLocal.currentStepIndex]?.label || 'نامشخص'}`);
            return;
          }
        } catch (err) {
          console.error("خطا در بررسی صف:", err);
        }
      }
    } catch (err) {
      console.error("خطا در بازیابی وضعیت:", err);
    } finally {
      setIsInitialized(true);
    }
  };

  // ============ دریافت صف انتظار ============
  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get("/doctor/queue");
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      setQueue(data);
    } catch (err) {
      console.error("خطا در دریافت صف:", err);
      toast.error("❌ خطا در دریافت لیست مریضان");
    } finally {
      setLoading(false);
    }
  };

  // ============ انتخاب مریض از لیست ============
  const handleSelectPatient = (registration) => {
    startTreatment(registration);
  };

  // ============ استفاده از useEffect ============
  useEffect(() => {
    const initialize = async () => {
      await fetchQueue();
      await restoreSavedState();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchQueue();
    }
  }, [refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const hasValidRegistration = selectedRegistration && selectedRegistration.reg_id;
  const currentStep = STEPS[treatmentProgress.currentStepIndex];
  const nextStep = treatmentProgress.currentStepIndex < STEPS.length - 1 
    ? STEPS[treatmentProgress.currentStepIndex + 1] 
    : null;
  const prevStep = treatmentProgress.currentStepIndex > 1 
    ? STEPS[treatmentProgress.currentStepIndex - 1] 
    : null;

  // ============ نمایش وضعیت پیشرفت ============
  const renderProgressBar = () => {
    if (activeTab === 'queue' || activeTab === 'history') return null;
    if (!hasValidRegistration) return null;

    const totalSteps = STEPS.length - 1;
    const completed = treatmentProgress.completedSteps.length;
    const progress = Math.round((completed / totalSteps) * 100);

    return (
      <div style={{
        backgroundColor: '#1f2937',
        padding: '12px 20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #374151'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <span style={{ color: '#fff', fontSize: '14px' }}>
              پیشرفت درمان: {completed} از {totalSteps} مرحله
            </span>
            <span style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {progress}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STEPS.slice(1).map((step) => {
              const isCompleted = treatmentProgress.completedSteps.includes(step.key);
              const isActive = step.key === activeTab;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    backgroundColor: isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#374151',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: isActive ? 'bold' : 'normal'
                  }}
                >
                  {isCompleted ? '✅' : isActive ? '🔄' : '⏳'}
                  {step.icon} {step.label}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#374151',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: progress === 100 ? '#10b981' : '#3b82f6',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>
    );
  };

  // ============ لیست مریض‌های فعال ============
  const renderActivePatients = () => {
    const patientIds = Object.keys(activePatients);
    if (patientIds.length === 0) return null;

    return (
      <div style={{
        backgroundColor: '#1a2a3a',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        border: '1px solid #374151'
      }}>
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>👥 مریض‌های فعال:</span>
        {patientIds.map((id) => {
          const isCurrent = id === currentPatientId;
          // پیدا کردن اطلاعات مریض از صف
          const patient = queue.find(r => r.reg_id === parseInt(id));
          return (
            <button
              key={id}
              onClick={() => {
                const reg = queue.find(r => r.reg_id === parseInt(id));
                if (reg) {
                  setSelectedRegistration(reg);
                  setCurrentPatientId(id);
                  // بازیابی وضعیت از activePatients
                  setActiveTab("examination");
                  toast.info(`👤切换到 مریض ${reg.patient?.first_name || ''} ${reg.patient?.last_name || ''}`);
                }
              }}
              style={{
                backgroundColor: isCurrent ? '#3b82f6' : '#2a3a4a',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '15px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isCurrent && '📍 '}
              {patient?.patient?.first_name || 'نامشخص'} {patient?.patient?.last_name || ''}
              {isCurrent && ' (جاری)'}
            </button>
          );
        })}
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <MainLayoutjur>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: 'white',
          fontSize: '18px'
        }}>
          ⏳ در حال بارگذاری اطلاعات درمان...
        </div>
      </MainLayoutjur>
    );
  }

  return (
    <MainLayoutjur>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        limit={5}
        style={{ 
          zIndex: 9999999,
          position: 'fixed',
          top: '20px',
          right: '20px',
          left: 'auto',
          width: 'auto',
          maxWidth: '350px',
          transform: 'none'
        }}
      />

      <div className="form-container">
        <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#fff" }}>
          🏥 معالجه داکتر
        </h2>

        {/* لیست مریض‌های فعال */}
        {renderActivePatients()}

        {renderProgressBar()}

        {hasValidRegistration && (
          <div style={{
            backgroundColor: treatmentProgress.isComplete ? '#065f46' : '#1e3a5f',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `2px solid ${treatmentProgress.isComplete ? '#10b981' : '#3b82f6'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <strong style={{ color: '#60a5fa' }}>👤 مریض جاری:</strong>
              <span style={{ color: 'white', marginRight: '10px', fontSize: '16px' }}>
                {selectedRegistration.patient?.first_name || ''} {selectedRegistration.patient?.last_name || ''}
              </span>
              <span style={{ color: '#9ca3af', marginRight: '15px', fontSize: '13px' }}>
                📋 {selectedRegistration.visit_number || '-'}
              </span>
              <span style={{ color: '#9ca3af', marginRight: '15px', fontSize: '13px' }}>
                🎫 صف: {selectedRegistration.queue_number || '-'}
              </span>
              <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                📅 {selectedRegistration.visit_date ? new Date(selectedRegistration.visit_date).toLocaleDateString('fa-IR') : '-'}
              </span>
              {treatmentProgress.isComplete && (
                <span style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginLeft: '10px'
                }}>
                  ✅ تکمیل شد
                </span>
              )}
              {!treatmentProgress.isComplete && (
                <span style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginLeft: '10px'
                }}>
                  📍 {STEPS[treatmentProgress.currentStepIndex]?.label || 'نامشخص'}
                </span>
              )}
            </div>
            <button
              onClick={goBackToQueue}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ✕ خروج از معالجه
            </button>
          </div>
        )}

        {/* ============ Tabs - همه تب‌ها قابل دسترس ============ */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          {STEPS.map((step) => {
            const isActive = activeTab === step.key;
            const isCompleted = treatmentProgress.completedSteps.includes(step.key);
            
            let isStepAccessible = false;
            
            if (step.key === 'queue' || step.key === 'history') {
              isStepAccessible = true;
            } else if (hasValidRegistration) {
              isStepAccessible = true;
            }
            
            let bgColor = '#374151';
            if (isActive) bgColor = step.color;
            else if (isCompleted) bgColor = '#10b981';
            
            return (
              <button
                key={step.key}
                onClick={() => {
                  if (!isStepAccessible) {
                    toast.warning(`⚠️ لطفاً ابتدا یک مریض را انتخاب کنید`);
                    return;
                  }
                  
                  if (step.key === 'queue') {
                    setActiveTab(step.key);
                    setSelectedHistory(null);
                    return;
                  }
                  if (step.key === 'history') {
                    setActiveTab(step.key);
                    setSelectedHistory(null);
                    return;
                  }
                  
                  if (!hasValidRegistration) {
                    toast.warning("⚠️ لطفاً ابتدا یک مریض را انتخاب کنید");
                    return;
                  }
                  
                  setActiveTab(step.key);
                  setSelectedHistory(null);
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isStepAccessible ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  background: bgColor,
                  color: "#fff",
                  opacity: isStepAccessible ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  position: 'relative',
                  border: isActive ? '2px solid #60a5fa' : 'none',
                  transition: 'all 0.3s'
                }}
                disabled={!isStepAccessible}
                title={!isStepAccessible ? `برای دسترسی به ${step.label}، ابتدا یک مریض انتخاب کنید` : ''}
              >
                {isCompleted ? '✅' : step.icon}
                {step.label}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ============ Content ============ */}
        <div
          style={{
            background: "#1f2937",
            borderRadius: "10px",
            padding: "25px",
            minHeight: "500px",
            color: "#fff",
          }}
        >
          {activeTab === "queue" && (
            <PatientQueue 
              queue={queue}
              loading={loading}
              onSelectPatient={handleSelectPatient}
              onRefresh={refreshData}
              activePatients={activePatients}
            />
          )}

          {activeTab === "examination" && hasValidRegistration && (
            <ExaminationForm 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
              savedData={activePatients[currentPatientId]?.examination?.data || null}
              allExaminations={activePatients[currentPatientId]?.examination?.allExaminations || []}
              isExamined={activePatients[currentPatientId]?.examination?.isExamined || false}
              setIsExamined={(val) => {
                setActivePatients(prev => ({
                  ...prev,
                  [currentPatientId]: {
                    ...prev[currentPatientId],
                    examination: {
                      ...prev[currentPatientId]?.examination,
                      isExamined: val
                    }
                  }
                }));
              }}
              setAllExaminations={(exams) => {
                setActivePatients(prev => ({
                  ...prev,
                  [currentPatientId]: {
                    ...prev[currentPatientId],
                    examination: {
                      ...prev[currentPatientId]?.examination,
                      allExaminations: exams
                    }
                  }
                }));
              }}
            />
          )}

          {activeTab === "laboratory" && hasValidRegistration && (
            <LaboratoryRequest 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
            />
          )}

          {activeTab === "radiology" && hasValidRegistration && (
            <RadiologyRequest 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
            />
          )}

          {activeTab === "operation" && (
            <OperationRoom 
              api={api}
              onSelectPatient={handleSelectPatient}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "pres_insert" && hasValidRegistration && (
            <PrescriptionForm 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
            />
          )}

          {activeTab === "followup" && hasValidRegistration && (
            <FollowUp 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
            />
          )}

          {activeTab === "admission" && hasValidRegistration && (
            <Admission 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
              onSave={saveCurrentStep}
              onFinish={finishTreatment}
              onNextStep={goToNextStep}
              onPrevStep={goToPreviousStep}
              currentStep={currentStep}
              nextStep={nextStep}
              prevStep={prevStep}
              isSubmitting={isSubmitting}
              isTreatmentComplete={treatmentProgress.isComplete}
            />
          )}

          {activeTab === "history" && (
            <HistoryList 
              api={api}
              onSelectHistory={handleSelectHistory}
            />
          )}
        </div>

        {/* ============ دکمه‌های ناوبری ============ */}
        {hasValidRegistration && !treatmentProgress.isComplete && activeTab !== 'queue' && activeTab !== 'history' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
            gap: '10px'
          }}>
            <button
              onClick={goToPreviousStep}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ↩️ مرحله قبل
            </button>
            <button
              onClick={goToNextStep}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              مرحله بعد ➡️
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </MainLayoutjur>
  );
}