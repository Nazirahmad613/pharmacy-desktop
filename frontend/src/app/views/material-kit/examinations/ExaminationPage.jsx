// src/app/pages/treatment/TreatmentPage.jsx
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

// تابع کمکی برای ایجاد progress اولیه (خارج از کامپوننت - مجاز است)
const createPatientProgress = (registrationId) => ({
  currentStepIndex: 1,
  completedSteps: ['queue'],
  isComplete: false,
  startTime: new Date().toISOString(),
  endTime: null,
  registrationId: registrationId,
  savedData: {}
});

export default function TreatmentPage() {
  const { api } = useAuth();
  
  // ✅ اصلاح: useState به داخل کامپوننت منتقل شد
  const [serverActivePatients, setServerActivePatients] = useState([]);
  
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activePatients, setActivePatients] = useState({});
  const [currentPatientId, setCurrentPatientId] = useState(null);

  const ACTIVE_PATIENTS_KEY = 'active_patients_data';

  // ============ توابع ذخیره و بازیابی ============
  const saveActivePatients = (patients) => {
    try {
      localStorage.setItem(ACTIVE_PATIENTS_KEY, JSON.stringify(patients));
      console.log('💾 Saved to localStorage:', patients);
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

  // تابع به‌روزرسانی اطلاعات مریض
  const updatePatientData = (registrationId, section, data) => {
    setActivePatients(prev => {
      const updated = {
        ...prev,
        [registrationId]: {
          ...(prev[registrationId] || {}),
          [section]: data
        }
      };

      localStorage.setItem(
        ACTIVE_PATIENTS_KEY,
        JSON.stringify(updated)
      );

      return updated;
    });
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

  // ============ دریافت تمام مریضان فعال درمان از سرور ============
  const fetchActivePatients = async () => {
    try {
      console.log("📥 دریافت مریضان فعال از سرور...");

      const response = await api.get("/doctor/active-patients");

      const data =
        response.data?.data ||
        response.data ||
        [];

      if (Array.isArray(data)) {
        setServerActivePatients(data);

        console.log(
          "✅ مریضان فعال دریافت شدند:",
          data
        );

        return data;
      }

      setServerActivePatients([]);
      return [];

    } catch (err) {
      console.error(
        "❌ خطا در دریافت مریضان فعال:",
        err
      );

      setServerActivePatients([]);
      return [];
    }
  };

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

  // ============ بارگذاری معاینات ============
  const loadExaminations = async (registrationId) => {
    try {
      console.log(
        `📥 Loading examinations for ${registrationId}...`
      );

      const response = await api.get(
        `/doctor/examination/${registrationId}`
      );

      if (
        response.data?.success &&
        response.data?.data
      ) {
        const data = response.data.data;

        const examinationData = {
          data: data.examination || null,
          allExaminations: data.all_examinations || [],
          isExamined: !!data.examination
        };

        updatePatientData(
          registrationId,
          'examination',
          examinationData
        );

        console.log(
          `✅ Examination loaded for ${registrationId}`,
          examinationData
        );

        return data;
      }

    } catch (err) {
      console.log(
        `ℹ️ No examinations found for ${registrationId}`
      );

      updatePatientData(
        registrationId,
        'examination',
        {
          data: null,
          allExaminations: [],
          isExamined: false
        }
      );
    }

    return null;
  };

  // ============ بارگذاری تست‌های لابراتوار ============
  const loadLaboratoryTests = async (registrationId) => {
    try {
      console.log(
        `📥 Loading laboratory tests for ${registrationId}...`
      );

      const response = await api.get(
        `/laboratory-requests/registration/${registrationId}`
      );

      if (
        response.data?.success &&
        response.data?.data
      ) {
        const data = response.data.data;

        const testsData =
          data.tests ||
          data.all_tests ||
          [];

        const laboratoryData = {
          data: testsData.length > 0 ? testsData[0] : null,
          allTests: testsData,
          isRequested: testsData.length > 0
        };

        updatePatientData(
          registrationId,
          'laboratory',
          laboratoryData
        );

        return data;
      }

    } catch (err) {
      console.log(
        `ℹ️ No laboratory tests found for ${registrationId}`
      );

      updatePatientData(
        registrationId,
        'laboratory',
        {
          data: null,
          allTests: [],
          isRequested: false
        }
      );
    }

    return null;
  };

  // ============ بارگذاری رادیولوژی ============
  const loadRadiologyRequests = async (registrationId) => {
    try {
      console.log(
        `📥 Loading radiology for ${registrationId}...`
      );

      const response = await api.get(
        `/doctor/radiology/${registrationId}`
      );

      if (
        response.data?.success &&
        response.data?.data
      ) {
        const data = response.data.data;

        const radiologyData = {
          data: data.radiology || null,
          allRadiologies: data.all_radiologies || [],
          isRequested: !!data.radiology
        };

        updatePatientData(
          registrationId,
          'radiology',
          radiologyData
        );

        return data;
      }

    } catch (err) {
      console.log(
        `ℹ️ No radiology found for ${registrationId}`
      );

      updatePatientData(
        registrationId,
        'radiology',
        {
          data: null,
          allRadiologies: [],
          isRequested: false
        }
      );
    }

    return null;
  };

  // ============ بارگذاری نسخه ============
  const loadPrescriptions = async (registrationId) => {
    try {
      console.log(
        `📥 Loading prescriptions for ${registrationId}...`
      );

      const response = await api.get(
        `/doctor/prescription/${registrationId}`
      );

      if (
        response.data?.success &&
        response.data?.data
      ) {
        const data = response.data.data;

        const prescriptionData = {
          data: data.prescription || null,
          allPrescriptions: data.all_prescriptions || [],
          isPrescribed: !!data.prescription
        };

        updatePatientData(
          registrationId,
          'prescription',
          prescriptionData
        );

        return data;
      }

    } catch (err) {
      console.log(
        `ℹ️ No prescription found for ${registrationId}`
      );

      updatePatientData(
        registrationId,
        'prescription',
        {
          data: null,
          allPrescriptions: [],
          isPrescribed: false
        }
      );
    }

    return null;
  };

  const loadAllPatientData = async (registrationId) => {
    await Promise.all([
      loadExaminations(registrationId),
      loadLaboratoryTests(registrationId),
      loadRadiologyRequests(registrationId),
      loadPrescriptions(registrationId)
    ]);
  };

  // ============ تابع شروع درمان ============
  const startTreatment = async (registration) => {
    if (!registration?.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }

    const regId = registration.reg_id;

    try {
      console.log(
        `🔄 Starting treatment for patient ${regId}...`
      );

      // اول مریض را انتخاب کن
      setCurrentPatientId(regId);
      setSelectedRegistration(registration);

      // اگر قبلاً progress دارد همان را استفاده کن
      const existingPatient = activePatients[regId];
      const progress = existingPatient?.progress || createPatientProgress(regId);

      // progress را نگهدار
      setActivePatients(prev => {
        const updated = {
          ...prev,
          [regId]: {
            ...(prev[regId] || {}),
            progress
          }
        };

        localStorage.setItem(
          ACTIVE_PATIENTS_KEY,
          JSON.stringify(updated)
        );

        return updated;
      });

      // اطلاعات تمام تب‌ها را از دیتابیس بگیر
      await Promise.all([
        loadExaminations(regId),
        loadLaboratoryTests(regId),
        loadRadiologyRequests(regId),
        loadPrescriptions(regId)
      ]);

      // تب فعلی
      const stepIndex = progress.currentStepIndex || 1;

      setActiveTab(
        STEPS[stepIndex]?.key || 'examination'
      );

      // فقط اگر هنوز InProgress نیست
      if (registration.visit_status !== "InProgress") {
        await api.put(
          `/registrations/${regId}/status`,
          {
            visit_status: "InProgress"
          }
        );
      }

      // بعد از تغییر وضعیت، لیست مریضان فعال را دوباره بگیر
      await fetchActivePatients();

      toast.info(
        `👨‍⚕️ ادامه/شروع معالجه برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`
      );

    } catch (err) {
      console.error(
        "❌ خطا در شروع درمان:",
        err
      );

      toast.error(
        "❌ خطا در شروع درمان"
      );
    }
  };

  const handleSelectPatient = (registration) => {
    startTreatment(registration);
  };

  // ============ دریافت مریضان یک مرحله خاص ============
  const getPatientsInStage = (stage) => {
    // صف انتظار همچنان از queue می‌آید
    if (stage === "queue") {
      return queue.filter(
        patient =>
          !activePatients[patient.reg_id] &&
          patient.visit_status !== "Completed" &&
          patient.visit_status !== "InProgress"
      );
    }

    // تاریخچه جداگانه است
    if (stage === "history") {
      return [];
    }

    const stageIndex = STEPS.findIndex(
      step => step.key === stage
    );

    if (stageIndex === -1) {
      return [];
    }

    const patients = serverActivePatients
      .filter(patient => {
        const regId = patient.reg_id;
        const localPatient = activePatients[regId];
        const progress = localPatient?.progress;

        if (progress) {
          return (
            progress.currentStepIndex === stageIndex ||
            progress.completedSteps?.includes(stage)
          );
        }

        switch (patient.visit_status) {
          case "InProgress":
          case "Examining":
            return stage === "examination";
          case "Laboratory":
            return stage === "laboratory";
          case "Radiology":
            return stage === "radiology";
          case "Prescription":
            return stage === "pres_insert";
          case "FollowUp":
            return stage === "followup";
          case "Admission":
            return stage === "admission";
          case "Operation":
            return stage === "operation";
          default:
            return false;
        }
      })
      .map(patient => {
        const regId = patient.reg_id;
        return {
          ...patient,
          progress: activePatients[regId]?.progress || null
        };
      });

    return patients;
  };

  // ============ دریافت progress مریض فعلی ============
  const getCurrentProgress = () => {
    if (!currentPatientId || !activePatients[currentPatientId]) {
      return {
        currentStepIndex: 0,
        completedSteps: [],
        isComplete: false,
        startTime: null,
        endTime: null,
        registrationId: null,
        savedData: {}
      };
    }
    return activePatients[currentPatientId].progress || {
      currentStepIndex: 0,
      completedSteps: [],
      isComplete: false,
      startTime: null,
      endTime: null,
      registrationId: null,
      savedData: {}
    };
  };

  // ============ به‌روزرسانی progress مریض فعلی ============
  const updateCurrentProgress = async (newProgress) => {
    if (!currentPatientId) return;
    
    setActivePatients(prev => {
      const updated = { ...prev };
      if (!updated[currentPatientId]) {
        updated[currentPatientId] = {};
      }
      updated[currentPatientId].progress = newProgress;
      saveActivePatients(updated);
      return updated;
    });
    
    if (currentPatientId) {
      await saveProgressToServer(newProgress, currentPatientId);
    }
  };

  // ============ رفتن به مرحله بعدی ============
  const goToNextStep = async () => {
    const currentProgress = getCurrentProgress();
    const currentIndex = currentProgress.currentStepIndex;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= STEPS.length) {
      toast.info("✅ تمام مراحل درمان تکمیل شد");
      return;
    }
    
    const currentStep = STEPS[currentIndex];
    const newCompletedSteps = [...currentProgress.completedSteps];
    if (!newCompletedSteps.includes(currentStep.key)) {
      newCompletedSteps.push(currentStep.key);
    }
    
    const newProgress = {
      ...currentProgress,
      currentStepIndex: nextIndex,
      completedSteps: newCompletedSteps,
      registrationId: currentPatientId
    };
    
    await updateCurrentProgress(newProgress);
    setActiveTab(STEPS[nextIndex].key);
    toast.info(`➡️ رفتن به مرحله ${STEPS[nextIndex].label}`);
  };

  // ============ برگشت به مرحله قبلی ============
  const goToPreviousStep = async () => {
    const currentProgress = getCurrentProgress();
    const currentIndex = currentProgress.currentStepIndex;
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 1) {
      setActiveTab('queue');
      toast.info("↩️ بازگشت به صف انتظار");
      return;
    }
    
    const newProgress = {
      ...currentProgress,
      currentStepIndex: prevIndex,
      completedSteps: currentProgress.completedSteps.filter(step => step !== STEPS[currentIndex].key),
      registrationId: currentPatientId
    };
    
    await updateCurrentProgress(newProgress);
    setActiveTab(STEPS[prevIndex].key);
    toast.info(`↩️ بازگشت به مرحله ${STEPS[prevIndex].label}`);
  };

  // ============ ثبت اطلاعات مرحله فعلی ============
  const saveCurrentStep = async (data) => {
    setIsSubmitting(true);

    try {
      const currentProgress = getCurrentProgress();
      const currentStep = STEPS[currentProgress.currentStepIndex];

      const regId = selectedRegistration?.reg_id || currentPatientId;

      if (!regId) {
        toast.error("❌ شناسه مراجعه یافت نشد");
        throw new Error("شناسه مراجعه یافت نشد");
      }

      let url = "";
      let payload = { ...data };

      if (currentStep.key === "laboratory") {
        url = `/laboratory-requests/registration/${regId}`;
        payload = {
          test_type: data.test_type,
          test_name: data.test_name || null,
          test_description: data.test_description || null,
          clinical_indication: data.clinical_indication || null,
          special_notes: data.special_notes || null,
          request_date: data.request_date || new Date().toISOString().split("T")[0],
          sample_collection_date: data.sample_collection_date || null,
        };
      } else if (currentStep.key === "examination") {
        url = `/doctor/examination/${regId}`;
      } else if (currentStep.key === "radiology") {
        url = `/doctor/radiology/${regId}`;
      } else if (currentStep.key === "pres_insert") {
        url = `/doctor/prescription/${regId}`;
      } else if (currentStep.key === "followup") {
        url = `/doctor/followup/${regId}`;
      } else if (currentStep.key === "admission") {
        url = `/doctor/admission/${regId}`;
      } else if (currentStep.key === "operation") {
        url = `/doctor/operation/${regId}`;
      } else {
        url = `/doctor/${currentStep.key}/save`;
      }

      const response = await api.post(url, payload);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "ثبت اطلاعات با موفقیت انجام نشد"
        );
      }

      console.log(`🔄 Reloading ${currentStep.key} for registration ${regId}`);

      try {
        if (currentStep.key === "examination") {
          await loadExaminations(regId);
        } else if (currentStep.key === "laboratory") {
          await loadLaboratoryTests(regId);
        } else if (currentStep.key === "radiology") {
          await loadRadiologyRequests(regId);
        } else if (currentStep.key === "pres_insert") {
          await loadPrescriptions(regId);
        }
      } catch (reloadError) {
        console.error(`⚠️ خطا در بارگذاری مجدد ${currentStep.key}:`, reloadError);
      }

      const newCompletedSteps = [...currentProgress.completedSteps];
      if (!newCompletedSteps.includes(currentStep.key)) {
        newCompletedSteps.push(currentStep.key);
      }

      const newProgress = {
        ...currentProgress,
        completedSteps: newCompletedSteps,
        savedData: {
          ...currentProgress.savedData,
          [currentStep.key]: data,
        },
        registrationId: regId,
      };

      await updateCurrentProgress(newProgress);

      try {
        const registrationResponse = await api.get(`/registrations/${regId}`);
        const updatedRegistration = registrationResponse.data?.data || registrationResponse.data;
        if (updatedRegistration) {
          setSelectedRegistration(updatedRegistration);
          console.log("✅ Registration refreshed:", updatedRegistration);
        }
      } catch (registrationError) {
        console.error("⚠️ خطا در دریافت مجدد registration:", registrationError);
      }

      await Promise.all([
        fetchQueue(),
        fetchActivePatients(),
      ]);

      console.log("✅ Queue and active patients refreshed");
      toast.success(`✅ اطلاعات ${currentStep.label} با موفقیت ثبت شد`);

      return response.data;

    } catch (err) {
      console.error("❌ خطا در ثبت اطلاعات:", err);

      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        Object.keys(errors).forEach((key) => {
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

    const currentProgress = getCurrentProgress();
    const requiredSteps = ['examination', 'pres_insert'];
    const missingSteps = requiredSteps.filter(step => 
      !currentProgress.completedSteps.includes(step)
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
        completed_steps: currentProgress.completedSteps,
        start_time: currentProgress.startTime,
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
    setActiveTab("queue");
    refreshData();
  };

  // ============ بازیابی وضعیت ============
  const restoreSavedState = async () => {
    try {
      console.log('🔄 Starting restoreSavedState...');

      const savedPatients = loadActivePatients();
      console.log('📂 Saved patients from localStorage:', savedPatients);

      const [queueResponse, activeResponse] = await Promise.all([
        api.get("/doctor/queue"),
        api.get("/doctor/active-patients")
      ]);

      const queueData = queueResponse.data?.data || queueResponse.data || [];
      const activeData = activeResponse.data?.data || activeResponse.data || [];

      setQueue(Array.isArray(queueData) ? queueData : []);
      setServerActivePatients(Array.isArray(activeData) ? activeData : []);

      const currentPatients = loadActivePatients();
      const remainingIds = Object.keys(currentPatients);

      if (remainingIds.length > 0) {
        const firstId = parseInt(remainingIds[0], 10);

        try {
          const response = await api.get(`/registrations/${firstId}`);
          const registration = response.data?.data || response.data;

          if (registration) {
            setSelectedRegistration(registration);
            setCurrentPatientId(firstId);

            const patientData = currentPatients[firstId];
            const progress = patientData?.progress || createPatientProgress(firstId);
            const stepIndex = Number.isInteger(progress.currentStepIndex) ? progress.currentStepIndex : 1;

            setActiveTab(STEPS[stepIndex]?.key || "examination");
          }
        } catch (err) {
          console.error(`❌ خطا در دریافت registration ${firstId}:`, err);
        }
      }

    } catch (err) {
      console.error("❌ خطا در بازیابی وضعیت:", err);
    } finally {
      setIsInitialized(true);
    }
  };

  const handleSelectHistory = (history) => {
    setSelectedHistory(history);
  };

  // ============ useEffect ============
  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchQueue(),
          fetchActivePatients()
        ]);
        await restoreSavedState();
      } catch (err) {
        console.error("❌ خطا در initialize:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchQueue();
    }
  }, [refreshKey]);

  // ============ تابع refreshData ============
  const refreshData = async () => {
    console.log("🔄 Refreshing treatment data...");

    try {
      await Promise.all([
        fetchQueue(),
        fetchActivePatients()
      ]);

      if (currentPatientId) {
        console.log(`🔄 Reloading data for current patient: ${currentPatientId}`);
        await loadAllPatientData(currentPatientId);
      }

      if (selectedRegistration && selectedRegistration.reg_id && !currentPatientId) {
        const regId = selectedRegistration.reg_id;
        console.log(`🔄 Reloading data for selected patient: ${regId}`);
        await loadAllPatientData(regId);
      }

    } catch (err) {
      console.error("❌ خطا در refresh:", err);
    }
  };

  const currentProgress = getCurrentProgress();
  const hasValidRegistration = selectedRegistration && selectedRegistration.reg_id;
  const currentStep = STEPS[currentProgress.currentStepIndex];
  const nextStep = currentProgress.currentStepIndex < STEPS.length - 1 
    ? STEPS[currentProgress.currentStepIndex + 1] 
    : null;
  const prevStep = currentProgress.currentStepIndex > 1 
    ? STEPS[currentProgress.currentStepIndex - 1] 
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
          treatmentProgress={currentProgress}
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
    
    const regId = selectedRegistration.reg_id;
    const patientData = activePatients[regId] || {};
    
    console.log('🔍 Rendering form for regId:', regId);
    console.log('🔍 Patient data:', patientData);
    console.log('🔍 Examination data:', patientData.examination);
    
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
            isTreatmentComplete={currentProgress.isComplete}
            savedData={patientData.examination?.data || null}
            allExaminations={patientData.examination?.allExaminations || []}
            isExamined={patientData.examination?.isExamined || false}
            setIsExamined={(val) => {
              setActivePatients(prev => {
                const updated = { ...prev };
                if (!updated[regId]) {
                  updated[regId] = {};
                }
                if (!updated[regId].examination) {
                  updated[regId].examination = { data: null, allExaminations: [], isExamined: false };
                }
                updated[regId].examination.isExamined = val;
                saveActivePatients(updated);
                return updated;
              });
            }}
            setAllExaminations={(exams) => {
              console.log('📋 Setting allExaminations:', exams);
              setActivePatients(prev => {
                const updated = { ...prev };
                if (!updated[regId]) {
                  updated[regId] = {};
                }
                if (!updated[regId].examination) {
                  updated[regId].examination = { data: null, allExaminations: [], isExamined: false };
                }
                updated[regId].examination.allExaminations = exams;
                if (exams && exams.length > 0) {
                  updated[regId].examination.isExamined = true;
                }
                saveActivePatients(updated);
                return updated;
              });
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
            isTreatmentComplete={currentProgress.isComplete}
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
            isTreatmentComplete={currentProgress.isComplete}
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
            isTreatmentComplete={currentProgress.isComplete}
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
            isTreatmentComplete={currentProgress.isComplete}
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
            isTreatmentComplete={currentProgress.isComplete}
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
    const completed = currentProgress.completedSteps.length;
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
              const isCompleted = currentProgress.completedSteps.includes(step.key);
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
            const isCompleted = currentProgress.completedSteps.includes(step.key);
            
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

        {selectedRegistration && !currentProgress.isComplete && activeTab !== 'queue' && activeTab !== 'history' && (
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