// src/app/pages/treatment/TreatmentPage.jsx
import { useState, useEffect, useRef } from "react";
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

const STEPS = [
  { key: 'queue', label: 'صف انتظار', icon: '📋', color: '#3b82f6' },
  { key: 'examination', label: 'معاینه', icon: '🩺', color: '#3b82f6' },
  { key: 'laboratory', label: 'لابراتوار', icon: '🔬', color: '#8b5cf6' },
  { key: 'radiology', label: 'رادیولوژی', icon: '📷', color: '#ec4899' },
  { key: 'operation', label: 'عملیات', icon: '🔪', color: '#dc2626' },
  { key: 'pres_insert', label: 'نسخه', icon: '📝', color: '#10b981' },
  { key: 'followup', label: 'ملاقات بعدی', icon: '📅', color: '#f59e0b' },
  { key: 'admission', label: 'بستری', icon: '🏥', color: '#ef4444' },
  { key: 'history', label: 'تاریخچه', icon: '📜', color: '#8b5cf6' }
];

// کلید localStorage
const ACTIVE_PATIENTS_KEY = 'treatment_active_patients';

export default function TreatmentPage() {
  const { api } = useAuth();
  
  // ============ State ============
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // تب فعال
  const [activeTab, setActiveTab] = useState('queue');
  
  // مریض‌های فعال با تمام اطلاعات
  const [activePatients, setActivePatients] = useState({});
  
  // مریض انتخاب شده برای تب فعلی
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  // تاریخچه انتخاب شده
  const [selectedHistory, setSelectedHistory] = useState(null);
  
  // اطلاعات کامل مریض انتخاب شده
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  // ============ توابع ذخیره و بازیابی ============
  const saveState = (patients, tab) => {
    try {
      const data = {
        patients: patients,
        activeTab: tab || activeTab
      };
      localStorage.setItem(ACTIVE_PATIENTS_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("خطا در ذخیره وضعیت:", err);
    }
  };

  const loadState = () => {
    try {
      const saved = localStorage.getItem(ACTIVE_PATIENTS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return {
          patients: data.patients || {},
          activeTab: data.activeTab || 'queue'
        };
      }
    } catch (err) {
      console.error("خطا در بازیابی وضعیت:", err);
    }
    return { patients: {}, activeTab: 'queue' };
  };

  // ============ به‌روزرسانی اطلاعات مریض ============
  const updatePatientData = (registrationId, section, data) => {
    setActivePatients(prev => {
      const updated = { ...prev };
      if (!updated[registrationId]) {
        updated[registrationId] = { 
          registration: null,
          progress: {
            currentStepIndex: 1,
            completedSteps: ['queue'],
            isComplete: false,
            startTime: new Date().toISOString(),
            endTime: null,
            registrationId: registrationId,
            savedData: {}
          },
          data: {}
        };
      }
      
      if (!updated[registrationId].data) {
        updated[registrationId].data = {};
      }
      
      updated[registrationId].data[section] = data;
      
      // ✅ اگر registration وجود داشت، ذخیره کن
      if (selectedRegistration && selectedRegistration.reg_id === registrationId) {
        updated[registrationId].registration = selectedRegistration;
      }
      
      // ذخیره در localStorage
      saveState(updated);
      
      return updated;
    });
  };

  // ============ دریافت اطلاعات کامل یک مریض ============
  const fetchPatientRegistration = async (registrationId) => {
    try {
      console.log(`📥 Fetching registration for ${registrationId}...`);
      const response = await api.get(`/registrations/${registrationId}`);
      const data = response.data?.data || response.data;
      
      if (data) {
        setActivePatients(prev => {
          const updated = { ...prev };
          if (!updated[registrationId]) {
            updated[registrationId] = {
              registration: data,
              progress: {
                currentStepIndex: 1,
                completedSteps: ['queue'],
                isComplete: false,
                startTime: new Date().toISOString(),
                endTime: null,
                registrationId: registrationId,
                savedData: {}
              },
              data: {}
            };
          } else {
            updated[registrationId].registration = data;
          }
          saveState(updated);
          return updated;
        });
        return data;
      }
    } catch (err) {
      console.error(`خطا در دریافت مریض ${registrationId}:`, err);
    }
    return null;
  };

  // ============ بارگذاری تمام اطلاعات یک مریض ============
  const loadAllPatientData = async (registrationId) => {
    console.log(`📥 Loading all data for patient ${registrationId}...`);
    
    try {
      // دریافت اطلاعات مریض
      const regData = await fetchPatientRegistration(registrationId);
      
      // بارگذاری معاینات
      try {
        const examResponse = await api.get(`/doctor/examination/${registrationId}`);
        if (examResponse.data?.success) {
          const data = examResponse.data.data;
          updatePatientData(registrationId, 'examination', {
            data: data.examination || null,
            allExaminations: data.all_examinations || [],
            isExamined: !!data.examination
          });
        }
      } catch (err) {
        console.log(`ℹ️ No examination for ${registrationId}`);
        updatePatientData(registrationId, 'examination', {
          data: null,
          allExaminations: [],
          isExamined: false
        });
      }
      
      // ✅ بارگذاری لابراتوار با روت FULL
      try {
        const labResponse = await api.get(`/laboratory-requests/registration/${registrationId}/full`);
        console.log('📥 Lab Response:', labResponse.data);
        
        if (labResponse.data?.success) {
          const data = labResponse.data.data;
          const tests = data.tests || data.all_tests || [];
          
          console.log(`✅ Found ${tests.length} laboratory tests`);
          
          updatePatientData(registrationId, 'laboratory', {
            data: tests.length > 0 ? tests[0] : null,
            allTests: tests,
            isRequested: tests.length > 0
          });
        }
      } catch (err) {
        console.log(`ℹ️ No laboratory for ${registrationId}`);
        updatePatientData(registrationId, 'laboratory', {
          data: null,
          allTests: [],
          isRequested: false
        });
      }
      
      // بارگذاری رادیولوژی
      try {
        const radResponse = await api.get(`/doctor/radiology/${registrationId}`);
        if (radResponse.data?.success) {
          const data = radResponse.data.data;
          updatePatientData(registrationId, 'radiology', {
            data: data.radiology || null,
            allRadiologies: data.all_radiologies || [],
            isRequested: !!data.radiology
          });
        }
      } catch (err) {
        console.log(`ℹ️ No radiology for ${registrationId}`);
        updatePatientData(registrationId, 'radiology', {
          data: null,
          allRadiologies: [],
          isRequested: false
        });
      }
      
      // بارگذاری نسخه
      try {
        const presResponse = await api.get(`/doctor/prescription/${registrationId}`);
        if (presResponse.data?.success) {
          const data = presResponse.data.data;
          updatePatientData(registrationId, 'prescription', {
            data: data.prescription || null,
            allPrescriptions: data.all_prescriptions || [],
            isPrescribed: !!data.prescription
          });
        }
      } catch (err) {
        console.log(`ℹ️ No prescription for ${registrationId}`);
        updatePatientData(registrationId, 'prescription', {
          data: null,
          allPrescriptions: [],
          isPrescribed: false
        });
      }
      
      console.log(`✅ All data loaded for patient ${registrationId}`);
    } catch (err) {
      console.error(`❌ Error loading data for ${registrationId}:`, err);
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

  // ============ شروع/ادامه درمان ============
  const handleSelectPatient = async (registration) => {
    if (!registration?.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }

    const regId = registration.reg_id;
    setSelectedPatientId(regId);
    setSelectedRegistration(registration);

    // بررسی وجود مریض در activePatients
    let patientData = activePatients[regId];
    if (!patientData) {
      // ایجاد entry جدید
      const newProgress = {
        currentStepIndex: 1,
        completedSteps: ['queue'],
        isComplete: false,
        startTime: new Date().toISOString(),
        endTime: null,
        registrationId: regId,
        savedData: {}
      };
      
      setActivePatients(prev => {
        const updated = { ...prev };
        updated[regId] = {
          registration: registration,
          progress: newProgress,
          data: {}
        };
        saveState(updated);
        return updated;
      });
      
      // بارگذاری تمام اطلاعات
      await loadAllPatientData(regId);
    } else {
      // اطلاعات موجود را بروز کن
      setActivePatients(prev => {
        const updated = { ...prev };
        if (updated[regId]) {
          updated[regId].registration = registration;
        }
        saveState(updated);
        return updated;
      });
    }

    // برو به مرحله بعد از صف
    const progress = activePatients[regId]?.progress || {
      currentStepIndex: 1,
      completedSteps: ['queue']
    };
    
    const stepIndex = progress.currentStepIndex || 1;
    const nextTab = STEPS[stepIndex]?.key || 'examination';
    setActiveTab(nextTab);
    
    // به‌روزرسانی وضعیت مریض
    if (registration.visit_status !== "InProgress") {
      await api.put(`/registrations/${regId}/status`, {
        visit_status: "InProgress"
      });
    }

    toast.info(`👨‍⚕️ شروع معالجه برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
  };

  // ============ دریافت مریضان یک مرحله ============
  const getPatientsInStage = (stage) => {
    if (stage === "queue") {
      return queue.filter(p => 
        !activePatients[p.reg_id] && 
        p.visit_status !== "Completed" &&
        p.visit_status !== "InProgress"
      );
    }
    
    if (stage === "history") {
      return [];
    }
    
    const stageIndex = STEPS.findIndex(s => s.key === stage);
    if (stageIndex === -1) return [];
    
    const patients = [];
    const patientIds = Object.keys(activePatients);
    
    for (const id of patientIds) {
      const patient = activePatients[id];
      const progress = patient?.progress;
      
      if (progress) {
        const currentIdx = progress.currentStepIndex || 0;
        const completedSteps = progress.completedSteps || [];
        
        if (currentIdx === stageIndex || completedSteps.includes(stage)) {
          patients.push({
            reg_id: parseInt(id),
            ...patient.registration,
            progress: progress
          });
        }
      }
    }
    
    return patients;
  };

  // ============ رفتن به مرحله بعد ============
  const goToNextStep = async () => {
    if (!selectedPatientId) {
      toast.warning("⚠️ لطفاً یک مریض را انتخاب کنید");
      return;
    }
    
    const patient = activePatients[selectedPatientId];
    if (!patient) return;
    
    const progress = patient.progress;
    const currentIndex = progress.currentStepIndex || 0;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= STEPS.length) {
      toast.info("✅ تمام مراحل درمان تکمیل شد");
      return;
    }
    
    const currentStep = STEPS[currentIndex];
    const newCompletedSteps = [...(progress.completedSteps || [])];
    if (!newCompletedSteps.includes(currentStep.key)) {
      newCompletedSteps.push(currentStep.key);
    }
    
    const newProgress = {
      ...progress,
      currentStepIndex: nextIndex,
      completedSteps: newCompletedSteps,
      registrationId: selectedPatientId
    };
    
    setActivePatients(prev => {
      const updated = { ...prev };
      if (updated[selectedPatientId]) {
        updated[selectedPatientId].progress = newProgress;
      }
      saveState(updated);
      return updated;
    });
    
    setActiveTab(STEPS[nextIndex].key);
    toast.info(`➡️ رفتن به مرحله ${STEPS[nextIndex].label}`);
  };

  // ============ برگشت به مرحله قبل ============
  const goToPreviousStep = async () => {
    if (!selectedPatientId) {
      toast.warning("⚠️ لطفاً یک مریض را انتخاب کنید");
      return;
    }
    
    const patient = activePatients[selectedPatientId];
    if (!patient) return;
    
    const progress = patient.progress;
    const currentIndex = progress.currentStepIndex || 0;
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 1) {
      setActiveTab('queue');
      toast.info("↩️ بازگشت به صف انتظار");
      return;
    }
    
    const newProgress = {
      ...progress,
      currentStepIndex: prevIndex,
      completedSteps: (progress.completedSteps || []).filter(s => s !== STEPS[currentIndex].key),
      registrationId: selectedPatientId
    };
    
    setActivePatients(prev => {
      const updated = { ...prev };
      if (updated[selectedPatientId]) {
        updated[selectedPatientId].progress = newProgress;
      }
      saveState(updated);
      return updated;
    });
    
    setActiveTab(STEPS[prevIndex].key);
    toast.info(`↩️ بازگشت به مرحله ${STEPS[prevIndex].label}`);
  };

  // ============ ثبت اطلاعات مرحله ============
  const saveCurrentStep = async (data) => {
    if (!selectedPatientId) {
      toast.error("❌ مریضی انتخاب نشده است");
      return null;
    }
    
    setIsSubmitting(true);
    
    try {
      const regId = selectedPatientId;
      const currentStep = STEPS.find(s => s.key === activeTab);
      if (!currentStep) return null;
      
      let url = "";
      let payload = { ...data };
      
      switch (currentStep.key) {
        case "examination":
          url = `/doctor/examination/${regId}`;
          break;
        case "laboratory":
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
          break;
        case "radiology":
          url = `/doctor/radiology/${regId}`;
          break;
        case "pres_insert":
          url = `/doctor/prescription/${regId}`;
          break;
        case "followup":
          url = `/doctor/followup/${regId}`;
          break;
        case "admission":
          url = `/doctor/admission/${regId}`;
          break;
        case "operation":
          url = `/doctor/operation/${regId}`;
          break;
        default:
          url = `/doctor/${currentStep.key}/save`;
      }
      
      const response = await api.post(url, payload);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || "ثبت اطلاعات با موفقیت انجام نشد");
      }
      
      toast.success(`✅ ${currentStep.label} با موفقیت ثبت شد`);
      
      // بارگذاری مجدد اطلاعات
      await loadAllPatientData(regId);
      
      return response.data;
      
    } catch (err) {
      console.error("❌ خطا در ثبت:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ ختم معالجه ============
  const finishTreatment = async () => {
    if (!selectedPatientId) {
      toast.error("❌ مریضی انتخاب نشده است");
      return;
    }
    
    const patient = activePatients[selectedPatientId];
    if (!patient) return;
    
    const progress = patient.progress;
    const requiredSteps = ['examination', 'pres_insert'];
    const missingSteps = requiredSteps.filter(s => !(progress.completedSteps || []).includes(s));
    
    if (missingSteps.length > 0) {
      const missingLabels = missingSteps.map(s => STEPS.find(st => st.key === s)?.label || s);
      if (!window.confirm(`⚠️ مراحل ${missingLabels.join('، ')} هنوز تکمیل نشده است. آیا مطمئن هستید؟`)) {
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/doctor/treatment/complete', {
        registration_id: selectedPatientId,
        completed_steps: progress.completedSteps,
        start_time: progress.startTime,
        end_time: new Date().toISOString()
      });
      
      await api.put(`/registrations/${selectedPatientId}/status`, {
        visit_status: 'Completed'
      });
      
      toast.success("✅ معالجه با موفقیت به پایان رسید");
      
      // حذف مریض از لیست فعال
      setActivePatients(prev => {
        const updated = { ...prev };
        delete updated[selectedPatientId];
        saveState(updated);
        return updated;
      });
      
      setSelectedPatientId(null);
      setSelectedRegistration(null);
      setActiveTab('queue');
      await fetchQueue();
      
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error("❌ خطا در ختم معالجه");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ تابع رفرش ============
  const refreshData = async () => {
    console.log("🔄 Refreshing data...");
    await fetchQueue();
    
    if (selectedPatientId) {
      await loadAllPatientData(selectedPatientId);
    }
    
    setRefreshKey(prev => prev + 1);
  };

  // ============ بازیابی وضعیت ============
  const restoreState = async () => {
    try {
      console.log("🔄 Restoring state...");
      
      const saved = loadState();
      const patients = saved.patients || {};
      
      const patientIds = Object.keys(patients);
      if (patientIds.length > 0) {
        for (const id of patientIds) {
          await loadAllPatientData(parseInt(id));
        }
        
        const firstId = parseInt(patientIds[0]);
        setSelectedPatientId(firstId);
        
        // ✅ دریافت مجدد registration از state به‌روز شده
        const updatedPatient = activePatients[firstId];
        if (updatedPatient?.registration) {
          setSelectedRegistration(updatedPatient.registration);
        } else {
          const regData = await fetchPatientRegistration(firstId);
          setSelectedRegistration(regData);
        }
        
        setActiveTab(saved.activeTab || 'examination');
      } else {
        setActiveTab('queue');
      }
      
      await fetchQueue();
      console.log("✅ State restored successfully");
      
    } catch (err) {
      console.error("❌ Error restoring state:", err);
    } finally {
      setIsInitialized(true);
    }
  };

  // ============ useEffect ============
  useEffect(() => {
    restoreState();
  }, []);

  // ============ وضعیت‌ها ============
  const getCurrentProgress = () => {
    if (!selectedPatientId || !activePatients[selectedPatientId]) {
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
    return activePatients[selectedPatientId].progress || {
      currentStepIndex: 0,
      completedSteps: [],
      isComplete: false,
      startTime: null,
      endTime: null,
      registrationId: null,
      savedData: {}
    };
  };

  const currentProgress = getCurrentProgress();
  const currentStep = STEPS[currentProgress.currentStepIndex] || STEPS[1];
  const nextStep = currentProgress.currentStepIndex < STEPS.length - 1 
    ? STEPS[currentProgress.currentStepIndex + 1] 
    : null;
  const prevStep = currentProgress.currentStepIndex > 1 
    ? STEPS[currentProgress.currentStepIndex - 1] 
    : null;

  // ============ رندر محتوای تب ============
  const renderTabContent = () => {
    if (activeTab === 'queue') {
      return (
        <PatientQueue 
          queue={queue}
          loading={loading}
          onSelectPatient={handleSelectPatient}
          onRefresh={refreshData}
          activePatients={activePatients}
        />
      );
    }
    
    if (activeTab === 'history') {
      return (
        <HistoryList 
          api={api}
          onSelectHistory={setSelectedHistory}
        />
      );
    }
    
    const stagePatients = getPatientsInStage(activeTab);
    
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#60a5fa', marginBottom: '10px' }}>
            📋 مریضان در مرحله {STEPS.find(s => s.key === activeTab)?.label}
          </h4>
          {stagePatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
              <div style={{ fontSize: '30px' }}>📭</div>
              <div>هیچ مریضی در این مرحله وجود ندارد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {stagePatients.map(p => (
                <div
                  key={p.reg_id}
                  onClick={() => {
                    setSelectedPatientId(p.reg_id);
                    setSelectedRegistration(p);
                    setActiveTab(activeTab);
                  }}
                  style={{
                    backgroundColor: selectedPatientId === p.reg_id ? '#3b82f6' : '#1a2a3a',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: selectedPatientId === p.reg_id ? '2px solid #60a5fa' : '1px solid #374151',
                    transition: 'all 0.3s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'white' }}>
                      {p.patient?.first_name || ''} {p.patient?.last_name || ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      #{p.visit_number} | {p.patient?.national_id || '-'}
                    </div>
                  </div>
                  {p.progress?.completedSteps?.includes(activeTab) && (
                    <span style={{ color: '#10b981', fontSize: '14px' }}>✅</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedPatientId && selectedRegistration && (
          <div style={{ borderTop: '1px solid #374151', paddingTop: '20px' }}>
            {renderSelectedPatientForm()}
          </div>
        )}
      </div>
    );
  };

  // ============ رندر فرم مریض انتخاب شده ============
  const renderSelectedPatientForm = () => {
    if (!selectedPatientId || !selectedRegistration) return null;
    
    const regId = selectedPatientId;
    const patientData = activePatients[regId]?.data || {};
    const isComplete = currentProgress.isComplete || false;
    
    switch (activeTab) {
      case "examination":
        return (
          <ExaminationForm 
            registration={selectedRegistration}
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
            savedData={patientData.examination?.data || null}
            allExaminations={patientData.examination?.allExaminations || []}
            isExamined={patientData.examination?.isExamined || false}
            setIsExamined={(val) => {
              updatePatientData(regId, 'examination', {
                ...patientData.examination,
                isExamined: val
              });
            }}
            setAllExaminations={(exams) => {
              updatePatientData(regId, 'examination', {
                ...patientData.examination,
                allExaminations: exams,
                isExamined: exams && exams.length > 0
              });
            }}
          />
        );
        
      case "laboratory":
        const labData = patientData.laboratory || { 
          data: null, 
          allTests: [], 
          isRequested: false 
        };
        
        return (
          <LaboratoryRequest 
            registration={selectedRegistration}
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
            savedTests={labData.data}
            allTests={labData.allTests || []}
            isLabRequested={labData.isRequested || false}
            setIsLabRequested={(val) => {
              updatePatientData(regId, 'laboratory', {
                ...labData,
                isRequested: val
              });
            }}
            setAllTests={(tests) => {
              updatePatientData(regId, 'laboratory', {
                ...labData,
                allTests: tests,
                isRequested: tests.length > 0,
                data: tests.length > 0 ? tests[0] : null
              });
            }}
          />
        );
        
      case "radiology":
        return (
          <RadiologyRequest 
            registration={selectedRegistration}
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
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
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
          />
        );
        
      case "followup":
        return (
          <FollowUp 
            registration={selectedRegistration}
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
          />
        );
        
      case "admission":
        return (
          <Admission 
            registration={selectedRegistration}
            onComplete={() => {
              setActiveTab('queue');
              setSelectedPatientId(null);
              setSelectedRegistration(null);
            }}
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
            isTreatmentComplete={isComplete}
          />
        );
        
      default:
        return null;
    }
  };

  // ============ رندر نوار پیشرفت ============
  const renderProgressBar = () => {
    if (activeTab === 'queue' || activeTab === 'history') return null;
    if (!selectedPatientId) return null;
    
    const totalSteps = STEPS.length - 1;
    const completed = currentProgress.completedSteps?.length || 0;
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
              {selectedRegistration?.patient?.first_name || ''} {selectedRegistration?.patient?.last_name || ''} - 
              پیشرفت: {completed} از {totalSteps} مرحله
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
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {STEPS.slice(1).map((step) => {
              const isCompleted = currentProgress.completedSteps?.includes(step.key);
              const isActive = step.key === activeTab;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#374151',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: isActive ? 'bold' : 'normal'
                  }}
                >
                  {isCompleted ? '✅' : isActive ? '🔄' : '⏳'}
                  {step.icon}
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

        {/* تب‌ها */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          {STEPS.map((step) => {
            const isActive = activeTab === step.key;
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
            
            return (
              <button
                key={step.key}
                onClick={() => {
                  setActiveTab(step.key);
                  setSelectedHistory(null);
                }}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  background: bgColor,
                  color: "#fff",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  position: 'relative',
                  border: isActive ? '2px solid #60a5fa' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                {step.icon}
                {step.label}
                {patientCount > 0 && (
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '0 8px',
                    borderRadius: '10px',
                    fontSize: '10px'
                  }}>
                    {patientCount}
                  </span>
                )}
                {isActive && selectedPatientId && (
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

        {/* محتوای تب */}
        <div
          style={{
            background: "#1f2937",
            borderRadius: "10px",
            padding: "25px",
            minHeight: "500px",
            color: "#fff",
          }}
        >
          {renderTabContent()}
        </div>

        {/* دکمه‌های ناوبری */}
        {selectedPatientId && activeTab !== 'queue' && activeTab !== 'history' && !currentProgress.isComplete && (
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