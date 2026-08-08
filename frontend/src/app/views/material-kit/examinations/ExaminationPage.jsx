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
import StagePatients from "./StagePatients";

// تعریف STEPS در سطح بالا
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

  // ============ مریض جاری ============
  const [currentPatientId, setCurrentPatientId] = useState(null);

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

  // ============ کلیدهای ذخیره‌سازی ============
  const STORAGE_KEY = 'treatment_progress_data';
  const ACTIVE_PATIENTS_KEY = 'active_patients_data';

  // ============ توابع ذخیره و بازیابی ============
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

  const saveActivePatients = (patients) => {
    try {
      localStorage.setItem(ACTIVE_PATIENTS_KEY, JSON.stringify(patients));
    } catch (err) {
      console.error("خطا در ذخیره مریض‌های فعال:", err);
    }
  };

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

  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
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

  // ============ به‌روزرسانی وضعیت ============
  const updateTreatmentProgress = async (newProgress, regId) => {
    const registrationId = regId || newProgress.registrationId || treatmentProgress.registrationId;
    setTreatmentProgress(newProgress);
    saveToLocalStorage(newProgress, registrationId);
    if (registrationId) {
      await saveProgressToServer(newProgress, registrationId);
    }
  };

  // ============ بارگذاری معاینات ============
  const loadExaminations = async (registrationId) => {
    try {
      const response = await api.get(`/doctor/examination/${registrationId}`);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
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

  // ============ بارگذاری تست‌های لابراتوار ============
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
      if (activePatients[regId]) {
        setCurrentPatientId(regId);
        setSelectedRegistration(registration);
        
        const savedProgress = await loadProgressFromServer(regId);
        if (savedProgress) {
          const stepIndex = savedProgress.currentStepIndex || 1;
          setTreatmentProgress(savedProgress);
          setActiveTab(STEPS[stepIndex]?.key || 'examination');
        } else {
          setActiveTab("examination");
        }
        
        toast.info(`👤 بازگشت به معالجه ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
        return;
      }

      await loadExaminations(regId);
      await loadLaboratoryTests(regId);

      setCurrentPatientId(regId);
      setSelectedRegistration(registration);
      setActiveTab("examination");

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

      await api.put(`/registrations/${regId}/status`, {
        visit_status: 'InProgress'
      });

      saveActivePatients(activePatients);

      toast.info(`👨‍⚕️ شروع درمان برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
      
    } catch (err) {
      console.error("خطا در شروع درمان:", err);
      toast.error("❌ خطا در شروع درمان");
    }
  };

  // ============ انتخاب مریض از هر مرحله ============
  const handleSelectPatient = (registration) => {
    startTreatment(registration);
  };

  // ============ دریافت مریض‌های یک مرحله خاص ============
  const getPatientsInStage = (stage) => {
    if (stage === 'queue') {
      return queue.filter(p => 
        !activePatients[p.reg_id] && 
        p.visit_status !== 'Completed' &&
        p.visit_status !== 'InProgress'
      );
    }

    const patientsInStage = [];
    const patientIds = Object.keys(activePatients);
    
    patientIds.forEach(id => {
      const regId = parseInt(id);
      const patientData = queue.find(r => r.reg_id === regId);
      if (!patientData) return;
      
      const progress = treatmentProgress;
      if (progress.registrationId === regId) {
        const currentStep = progress.currentStepIndex;
        const stageIndex = STEPS.findIndex(s => s.key === stage);
        if (currentStep === stageIndex || progress.completedSteps.includes(stage)) {
          patientsInStage.push({
            ...patientData,
            progress: progress
          });
        }
      }
    });
    
    return patientsInStage;
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
      
      if (!regId) {
        toast.error("❌ شناسه مراجعه یافت نشد");
        throw new Error("شناسه مراجعه یافت نشد");
      }
      
      let url = '';
      let payload = { ...data };
      
      if (currentStep.key === 'laboratory') {
        url = `/doctor/laboratory/${regId}`;
        payload = {
          registration_id: regId,
          patient_id: selectedRegistration.patient_id || selectedRegistration.patient?.id,
          ...data
        };
      } else if (currentStep.key === 'examination') {
        url = `/doctor/examination/${regId}`;
      } else if (currentStep.key === 'radiology') {
        url = `/doctor/radiology/${regId}`;
      } else if (currentStep.key === 'pres_insert') {
        url = `/doctor/prescription/${regId}`;
      } else if (currentStep.key === 'followup') {
        url = `/doctor/followup/${regId}`;
      } else if (currentStep.key === 'admission') {
        url = `/doctor/admission/${regId}`;
      } else if (currentStep.key === 'operation') {
        url = `/doctor/operation/${regId}`;
      } else {
        url = `/doctor/${currentStep.key}/save`;
      }
      
      const response = await api.post(url, payload);
      
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
        } else if (currentStep.key === 'laboratory') {
          setActivePatients(prev => ({
            ...prev,
            [regId]: {
              ...prev[regId],
              laboratory: {
                data: response.data.data.laboratory_request || null,
                allTests: response.data.data.all_tests || [],
                isRequested: !!response.data.data.laboratory_request
              }
            }
          }));
        }
      }
      
      toast.success(`✅ اطلاعات ${currentStep.label} با موفقیت ثبت شد`);
      
      const newProgress = {
        ...treatmentProgress,
        completedSteps: [...treatmentProgress.completedSteps, currentStep.key],
        savedData: {
          ...treatmentProgress.savedData,
          [currentStep.key]: data
        }
      };
      await updateTreatmentProgress(newProgress);
      
      saveActivePatients(activePatients);
      
      return response.data;
    } catch (err) {
      console.error("خطا در ثبت اطلاعات:", err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach(key => {
          toast.error(`❌ ${key}: ${errors[key][0]}`);
        });
      } else {
        toast.error(`❌ خطا در ثبت اطلاعات: ${err.response?.data?.message || err.message}`);
      }
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

  // ============ بازیابی وضعیت ============
  const restoreSavedState = async () => {
    try {
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

  // ============ انتخاب تاریخچه ============
  const handleSelectHistory = (history) => {
    setSelectedHistory(history);
    // منطق نمایش تاریخچه
  };

  // ============ useEffect ============
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

  // ============ نمایش محتوای تب ============
  const renderTabContent = () => {
    if (activeTab !== 'queue' && activeTab !== 'history') {
      const stagePatients = getPatientsInStage(activeTab);
      return (
        <StagePatients
          stage={activeTab}
          queue={queue}
          activePatients={activePatients}
          treatmentProgress={treatmentProgress}
          onSelectPatient={handleSelectPatient}
          onRefresh={refreshData}
        />
      );
    }

    switch (activeTab) {
      case "queue":
        return (
          <PatientQueue 
            queue={queue}
            loading={loading}
            onSelectPatient={handleSelectPatient}
            onRefresh={refreshData}
            activePatients={activePatients}
          />
        );
      case "history":
        return (
          <HistoryList 
            api={api}
            onSelectHistory={handleSelectHistory}
          />
        );
      default:
        return null;
    }
  };

  // ============ نمایش فرم‌های مربوط به مریض انتخاب شده ============
  const renderSelectedPatientForm = () => {
    if (!selectedRegistration || !selectedRegistration.reg_id) return null;
    
    const currentStep = STEPS[treatmentProgress.currentStepIndex];
    
    switch (activeTab) {
      case "examination":
        return (
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
        );
      case "laboratory":
        return (
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
        );
      case "radiology":
        return (
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
        );
      case "operation":
        return (
          <OperationRoom 
            api={api}
            onSelectPatient={handleSelectPatient}
            onRefresh={refreshData}
          />
        );
      case "pres_insert":
        return (
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
        );
      case "followup":
        return (
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
        );
      case "admission":
        return (
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
        );
      default:
        return null;
    }
  };

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

        {renderProgressBar()}

        {/* ============ Tabs ============ */}
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
            
            let patientCount = 0;
            if (step.key === 'queue') {
              patientCount = queue.filter(p => 
                !activePatients[p.reg_id] && 
                p.visit_status !== 'Completed' &&
                p.visit_status !== 'InProgress'
              ).length;
            } else if (step.key !== 'history') {
              const patients = getPatientsInStage(step.key);
              patientCount = patients.length;
            }
            
            let bgColor = '#374151';
            if (isActive) bgColor = step.color;
            else if (isCompleted) bgColor = '#10b981';
            
            return (
              <button
                key={step.key}
                onClick={() => {
                  setActiveTab(step.key);
                  setSelectedHistory(null);
                  
                  if (step.key !== 'queue' && step.key !== 'history') {
                    const patients = getPatientsInStage(step.key);
                    if (patients.length > 0) {
                      const currentPatient = patients.find(p => p.reg_id === currentPatientId);
                      if (!currentPatient) {
                        handleSelectPatient(patients[0]);
                      }
                    } else {
                      toast.info(`📭 هیچ مریضی در مرحله ${step.label} وجود ندارد`);
                    }
                  }
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  background: bgColor,
                  color: "#fff",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  position: 'relative',
                  border: isActive ? '2px solid #60a5fa' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                {isCompleted ? '✅' : step.icon}
                {step.label}
                {patientCount > 0 && (
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '0 8px',
                    borderRadius: '10px',
                    fontSize: '11px'
                  }}>
                    {patientCount}
                  </span>
                )}
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
          {selectedRegistration && activeTab !== 'queue' && activeTab !== 'history' ? (
            renderSelectedPatientForm()
          ) : (
            renderTabContent()
          )}
        </div>

        {/* ============ دکمه‌های ناوبری ============ */}
        {selectedRegistration && !treatmentProgress.isComplete && activeTab !== 'queue' && activeTab !== 'history' && (
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