// src/app/pages/treatment/TreatmentPage.jsx
import { useState, useEffect, useRef } from "react";
import MainLayoutjur from "../../../../components/Mainlayoutjur";
import { useAuth } from "app/contexts/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PatientQueue from "./patientsqueue/PatientQueue";
import ExaminationForm from "./examinate/ExaminationForm";
import LaboratoryRequest from "./laborate/LaboratoryRequest";
import PrescriptionRequest from "./prescription/PrescriptionRequest";
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

const statusLabelsMap = {
  'pending': 'در انتظار',
  'sample_taken': 'نمونه گرفته شده',
  'in_progress': 'در حال انجام',
  'completed': 'تکمیل شده',
  'cancelled': 'لغو شده',
  'rejected': 'رد شده',
  'sent_to_lab': 'ارسال به لابراتوار'
};

const ACTIVE_PATIENTS_KEY = 'treatment_active_patients';
const SELECTED_PATIENT_KEY = 'treatment_selected_patient';
const ACTIVE_TAB_KEY = 'treatment_active_tab';

const C = {
  pageBg: '#f1f5f9',
  cardBg: '#ffffff',
  softBg: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
  accentSoft: '#eff6ff',
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

const STEP_REF_TABLE = {
  'examination': 'examinations',
  'laboratory': 'laboratory_requests',
  'radiology': 'radiology_requests',
  'operation': 'operation_requests',
  'pres_insert': 'prescriptions',
  'followup': 'followups',
  'admission': 'admission_requests',
};

// ============================================================
// ✅ تابع کمکی: استخراج refId از پاسخ API
// ============================================================
const extractRefId = (returnedData) => {
  if (!returnedData || typeof returnedData !== 'object') return null;

  // اگر مستقیم id دارد
  if (returnedData.id != null) return returnedData.id;

  // ساختارهای تودرتو — به ترتیب اولویت
  const candidates = [
    returnedData.examination?.id,
    returnedData.laboratory_request?.id,
    returnedData.laboratory?.id,
    returnedData.radiology_request?.id,
    returnedData.radiology?.id,
    returnedData.prescription?.pres_id,
    returnedData.prescription?.id,
    returnedData.admission?.id,
    returnedData.operation?.id,
    returnedData.operation_request?.id,
    returnedData.followup?.id,
    // آرایه‌ها — اولین عضو
    Array.isArray(returnedData.tests) ? returnedData.tests[0]?.id : null,
    Array.isArray(returnedData.radiology) ? returnedData.radiology[0]?.id : null,
    Array.isArray(returnedData.all_tests) ? returnedData.all_tests[0]?.id : null,
    Array.isArray(returnedData.all_radiology) ? returnedData.all_radiology[0]?.id : null,
  ];

  return candidates.find((c) => c != null) ?? null;
};

// ============================================================
// ✅ تابع کمکی: پاک‌سازی داده قبل از ارسال به سرور
// ============================================================
const sanitizeForApi = (obj) => {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForApi);
  if (typeof obj === 'object') {
    // اگر File/Blob/Date است، دست نزن
    if (obj instanceof File || obj instanceof Blob || obj instanceof Date) return obj;
    const out = {};
    for (const k of Object.keys(obj)) {
      out[k] = sanitizeForApi(obj[k]);
    }
    return out;
  }
  return obj;
};

export default function TreatmentPage() {
  const { api } = useAuth();
  
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('queue');
  const [activePatients, setActivePatients] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [allAdmissionRequests, setAllAdmissionRequests] = useState([]);

  const activePatientsRef = useRef({});
  const activeTabRef = useRef('queue');
  const selectedPatientIdRef = useRef(null);

  useEffect(() => { activePatientsRef.current = activePatients; }, [activePatients]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { selectedPatientIdRef.current = selectedPatientId; }, [selectedPatientId]);

  // ============================================================
  // ✅ همگام‌سازی تاریخچه — نسخه بهبود یافته
  // ============================================================
  const syncTreatmentHistory = async (regId, stepKey = null, stepData = null, refId = null, finalize = false) => {
    if (!regId) return null;

    try {
      const patient = activePatientsRef.current?.[regId];
      const progress = patient?.progress || {
        currentStepIndex: 1,
        completedSteps: ['queue'],
      };

      const payload = {
        reg_id: regId,
        progress: {
          current_step: finalize ? 'completed' : activeTabRef.current,
          current_step_index: finalize ? 8 : (progress.currentStepIndex || 0),
          completed_steps: progress.completedSteps || [],
          finalize: finalize,
        },
      };

      if (finalize) {
        payload.finalize = true;
      }

      if (stepKey && stepData) {
        payload.step_key = stepKey;
        // ✅ اطمینان از اینکه stepData یک آبجکت تمیز است
        payload.step_data = sanitizeForApi(stepData);
        payload.ref_id = refId ?? extractRefId(stepData);
        payload.ref_table = STEP_REF_TABLE[stepKey] || null;
      }

      console.log('📤 syncTreatmentHistory payload:', {
        reg_id: payload.reg_id,
        step_key: payload.step_key,
        ref_id: payload.ref_id,
        ref_table: payload.ref_table,
        finalize: payload.finalize,
      });

      const response = await api.post('/treatment-history/sync', payload);

      if (response.data?.success) {
        console.log('✅ Treatment history synced:', regId, finalize ? 'FINALIZED' : (stepKey || 'main'), {
          item_id: response.data?.item?.id,
          history_id: response.data?.data?.history_id,
          counters: {
            exam: response.data?.data?.examinations_count,
            lab: response.data?.data?.laboratory_tests_count,
            rad: response.data?.data?.radiology_requests_count,
            pres: response.data?.data?.prescriptions_count,
          },
        });
        return response.data.data;
      } else {
        console.warn('⚠️ sync returned success=false:', response.data?.message);
      }
    } catch (err) {
      console.warn('⚠️ Treatment history sync failed (non-blocking):', err?.response?.data?.message || err.message);
    }

    return null;
  };

  const saveState = (patients, tab, patientId) => {
    try {
      const data = {
        patients: patients,
        activeTab: tab || activeTab,
        selectedPatientId: patientId || selectedPatientId
      };
      localStorage.setItem(ACTIVE_PATIENTS_KEY, JSON.stringify(data));
      if (tab) localStorage.setItem(ACTIVE_TAB_KEY, tab);
      if (patientId) localStorage.setItem(SELECTED_PATIENT_KEY, String(patientId));
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
          activeTab: data.activeTab || 'queue',
          selectedPatientId: data.selectedPatientId || null
        };
      }
    } catch (err) {
      console.error("خطا در بازیابی وضعیت:", err);
    }
    return { patients: {}, activeTab: 'queue', selectedPatientId: null };
  };

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
      if (selectedRegistration && selectedRegistration.reg_id === registrationId) {
        updated[registrationId].registration = selectedRegistration;
      }
      saveState(updated, activeTab, selectedPatientId);
      return updated;
    });
  };

  const fetchPatientRegistration = async (registrationId) => {
    try {
      const response = await api.get(`/doctor/patient/${registrationId}`);
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
          saveState(updated, activeTab, selectedPatientId);
          return updated;
        });
        return data;
      }
    } catch (err) {
      console.error(`خطا در دریافت مریض ${registrationId}:`, err);
    }
    return null;
  };

  const fetchAllAdmissions = async () => {
    try {
      const response = await api.get("/admissions");
      if (response.data?.data) {
        const requests = response.data.data.data || response.data.data;
        const data = Array.isArray(requests) ? requests : [];
        setAllAdmissionRequests(data);
        return data;
      }
      return [];
    } catch (err) {
      console.error("خطا در دریافت درخواست‌های بستری:", err);
      return [];
    }
  };

  const loadAllPatientData = async (registrationId) => {
    try {
      await fetchPatientRegistration(registrationId);
      
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
        updatePatientData(registrationId, 'examination', {
          data: null, allExaminations: [], isExamined: false
        });
      }
      
      try {
        const labResponse = await api.get(`/laboratory-requests/registration/${registrationId}/full`);
        
        if (labResponse.data?.success) {
          const data = labResponse.data.data;
          let tests = [];
          if (data.tests && Array.isArray(data.tests)) tests = data.tests;
          else if (data.all_tests && Array.isArray(data.all_tests)) tests = data.all_tests;
          
          let hasAnyResult = false;
          const testsWithResults = await Promise.all(tests.map(async (test) => {
            try {
              const resultResponse = await api.get(`/laboratory-results/request/${test.id}`);
              if (resultResponse.data?.success) {
                test.result_details = resultResponse.data.data;
                test.has_result = true;
                hasAnyResult = true;
              } else {
                test.result_details = null;
                test.has_result = false;
              }
            } catch (resultErr) {
              test.result_details = null;
              test.has_result = false;
            }
            return test;
          }));
          
          updatePatientData(registrationId, 'laboratory', {
            data: testsWithResults.length > 0 ? testsWithResults[0] : null,
            allTests: testsWithResults,
            isRequested: testsWithResults.length > 0,
            hasResult: hasAnyResult
          });
        } else {
          updatePatientData(registrationId, 'laboratory', {
            data: null, allTests: [], isRequested: false, hasResult: false
          });
        }
      } catch (err) {
        updatePatientData(registrationId, 'laboratory', {
          data: null, allTests: [], isRequested: false, hasResult: false
        });
      }
      
      try {
        const radResponse = await api.get(`/radiology-requests/registration/${registrationId}`);
        if (radResponse.data?.success) {
          const data = radResponse.data.data;
          const radiologyData = Array.isArray(data) ? data : (data.radiology || data.all_radiology || []);
          updatePatientData(registrationId, 'radiology', {
            data: radiologyData.length > 0 ? radiologyData[0] : null,
            allRadiology: radiologyData,
            isRequested: radiologyData.length > 0,
            hasResult: radiologyData.some(r => r.has_result === true)
          });
        } else {
          updatePatientData(registrationId, 'radiology', {
            data: null, allRadiology: [], isRequested: false, hasResult: false
          });
        }
      } catch (err) {
        updatePatientData(registrationId, 'radiology', {
          data: null, allRadiology: [], isRequested: false, hasResult: false
        });
      }
      
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
        updatePatientData(registrationId, 'prescription', {
          data: null, allPrescriptions: [], isPrescribed: false
        });
      }
    } catch (err) {
      console.error(`❌ Error loading data for ${registrationId}:`, err);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get("/doctor/queue");
      let data = [];
      if (Array.isArray(response.data)) data = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) data = response.data.data;
      setQueue(data);
    } catch (err) {
      console.error("خطا در دریافت صف:", err);
      toast.error("❌ خطا در دریافت لیست مریضان");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (registration) => {
    if (!registration?.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }

    const regId = registration.reg_id;
    setSelectedPatientId(regId);
    setSelectedRegistration(registration);

    let patientData = activePatients[regId];
    if (!patientData) {
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
        saveState(updated, 'examination', regId);
        return updated;
      });
      
      await loadAllPatientData(regId);

      setTimeout(() => {
        syncTreatmentHistory(regId);
      }, 500);
    } else {
      setActivePatients(prev => {
        const updated = { ...prev };
        if (updated[regId]) {
          updated[regId].registration = registration;
        }
        saveState(updated, activeTab, regId);
        return updated;
      });
    }

    const progress = activePatients[regId]?.progress || {
      currentStepIndex: 1,
      completedSteps: ['queue']
    };
    
    const stepIndex = progress.currentStepIndex || 1;
    const nextTab = STEPS[stepIndex]?.key || 'examination';
    setActiveTab(nextTab);
    
    localStorage.setItem(ACTIVE_TAB_KEY, nextTab);
    localStorage.setItem(SELECTED_PATIENT_KEY, String(regId));
    
    if (registration.visit_status !== "InProgress") {
      await api.put(`/registrations/${regId}/status`, {
        visit_status: "InProgress"
      });
    }

    toast.info(`👨‍⚕️ شروع معالجه برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
  };
  
  const getPatientsInStage = (stage) => {
    if (stage === "queue") {
      return queue.filter(p => 
        !activePatients[p.reg_id] && 
        p.visit_status !== "Completed" &&
        p.visit_status !== "InProgress"
      );
    }
    
    if (stage === "history") return [];
    
    if (stage === "admission") {
      const admittedPatients = [];
      const patientIds = Object.keys(activePatients);
      for (const id of patientIds) {
        const patient = activePatients[id];
        const progress = patient?.progress;
        
        if (progress) {
          const currentIdx = progress.currentStepIndex || 0;
          const admissionStepIndex = STEPS.findIndex(s => s.key === 'admission');
          
          if (currentIdx >= admissionStepIndex || progress.completedSteps?.includes('admission')) {
            const admissionData = patient.data?.admission || {};
            const isAdmitted = admissionData.isAdmitted || false;
            
            admittedPatients.push({
              reg_id: parseInt(id),
              ...patient.registration,
              progress: progress,
              patient: patient.registration?.patient || patient.registration,
              status: isAdmitted ? 'admitted' : 'pending',
              admission_id: admissionData.admissionId || null,
              ward_name: admissionData.ward_name || null,
              admission_data: admissionData
            });
          }
        }
      }
      
      if (allAdmissionRequests && allAdmissionRequests.length > 0) {
        for (const request of allAdmissionRequests) {
          const regId = request.reg_id;
          if (!admittedPatients.find(p => p.reg_id === regId)) {
            admittedPatients.push({
              reg_id: regId,
              patient: request.patient,
              visit_number: request.visit_number,
              status: request.status === 'admitted' ? 'admitted' : 'pending',
              admission_id: request.id,
              ward_name: request.ward?.name,
              ...request,
              progress: {
                completedSteps: request.status === 'admitted' ? ['admission'] : [],
                currentStepIndex: STEPS.findIndex(s => s.key === 'admission')
              }
            });
          }
        }
      }
      
      return admittedPatients;
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
        
        if (currentIdx === stageIndex) {
          const labData = patient.data?.laboratory || {};
          const radData = patient.data?.radiology || {};
          
          patients.push({
            reg_id: parseInt(id),
            ...patient.registration,
            progress: progress,
            has_lab_result: labData.hasResult || false,
            lab_results: labData.allTests?.filter(t => t.has_result) || [],
            has_rad_result: radData.hasResult || false,
            radiology_count: radData.allRadiology?.length || 0
          });
        }
      }
    }
    
    return patients;
  };

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
          url = `/radiology-requests/registration/${regId}`;
          payload = {
            radiology_type: data.radiology_type,
            body_part: data.body_part,
            reason: data.reason,
            notes: data.notes || null,
            priority: data.priority || 'normal',
            request_date: data.request_date || new Date().toISOString().split("T")[0],
            clinical_indication: data.clinical_indication || null,
            special_notes: data.special_notes || null,
          };
          break;
        case "pres_insert":
          url = `/doctor/prescription/${regId}`;
          break;
        case "followup":
          url = `/doctor/followup/${regId}`;
          break;
        case "admission":
          url = `/admissions`;
          payload = {
            reg_id: regId,
            ward_id: data.ward_id,
            admission_date: data.admission_date || new Date().toISOString().split('T')[0],
            diagnosis: data.diagnosis || "",
            admission_instructions: data.admission_instructions || "",
            special_notes: data.special_notes || "",
            priority: data.priority || "normal"
          };
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
      
      // ✅ همگام‌سازی با تاریخچه
      try {
        const returnedData = response.data?.data || payload;
        const refId = extractRefId(returnedData);

        // ✅ historySnapshot را تمیز کن
        const historySnapshot = sanitizeForApi({
          ...payload,
          ...(typeof returnedData === 'object' ? returnedData : {}),
          status: returnedData?.status || 'completed',
          submitted_at: new Date().toISOString(),
          step_label: currentStep.label,
        });

        console.log('🔄 Syncing history:', {
          step_key: currentStep.key,
          refId,
          snapshot_keys: Object.keys(historySnapshot),
        });

        const syncResult = await syncTreatmentHistory(regId, currentStep.key, historySnapshot, refId);

        if (!syncResult) {
          console.warn('⚠️ History sync returned null — check backend logs');
        }
      } catch (histErr) {
        console.warn('⚠️ History sync failed but main step saved:', histErr);
      }
      
      await loadAllPatientData(regId);
      
      if (currentStep.key === 'admission') {
        await fetchAllAdmissions();
        
        setActivePatients(prev => {
          const updated = { ...prev };
          if (updated[regId]) {
            if (!updated[regId].data) updated[regId].data = {};
            updated[regId].data.admission = {
              ...updated[regId].data.admission,
              isAdmitted: true,
              admissionId: response.data?.data?.id || null,
              ward_name: payload.ward_name || null
            };
          }
          saveState(updated, activeTab, selectedPatientId);
          return updated;
        });
      }
      
      return response.data;
      
    } catch (err) {
      console.error("❌ خطا در ثبت:", err);
      toast.error(`❌ خطا: ${err.response?.data?.message || err.message}`);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
      saveState(updated, STEPS[nextIndex].key, selectedPatientId);
      return updated;
    });
    
    setActiveTab(STEPS[nextIndex].key);
    localStorage.setItem(ACTIVE_TAB_KEY, STEPS[nextIndex].key);

    setTimeout(() => {
      syncTreatmentHistory(selectedPatientId);
    }, 300);
    
    toast.info(`➡️ رفتن به مرحله ${STEPS[nextIndex].label}`);
  };

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
      localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
      localStorage.removeItem(SELECTED_PATIENT_KEY);
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
      saveState(updated, STEPS[prevIndex].key, selectedPatientId);
      return updated;
    });
    
    setActiveTab(STEPS[prevIndex].key);
    localStorage.setItem(ACTIVE_TAB_KEY, STEPS[prevIndex].key);

    setTimeout(() => {
      syncTreatmentHistory(selectedPatientId);
    }, 300);
    
    toast.info(`↩️ بازگشت به مرحله ${STEPS[prevIndex].label}`);
  };
 
  // ============================================================
  // ✅ ختم معالجه — endpoint صحیح: /doctor/complete/{reg_id}
  // ============================================================
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
    const errors = [];

    try {
      // ============================================================
      // ✅ 1. نهایی‌سازی تاریخچه (non-blocking)
      // ============================================================
      try {
        await syncTreatmentHistory(selectedPatientId, null, null, null, true);
        console.log('✅ Treatment history finalized');
      } catch (finalizeErr) {
        console.warn('⚠️ Finalize failed (non-blocking):', finalizeErr);
        errors.push(`تاریخچه: ${finalizeErr?.response?.data?.message || finalizeErr?.message}`);
      }

      // ============================================================
      // ✅ 2. ختم معالجه — endpoint صحیح
      //    POST /doctor/complete/{reg_id}
      // ============================================================
      try {
        await api.post(`/doctor/complete/${selectedPatientId}`, {
          completed_steps: progress.completedSteps,
          start_time: progress.startTime,
          end_time: new Date().toISOString()
        });
        console.log('✅ Treatment completed');
      } catch (completeErr) {
        console.warn('⚠️ treatment/complete failed:', completeErr);
        errors.push(`ختم معالجه: ${completeErr?.response?.data?.message || completeErr?.message}`);
      }

      // ============================================================
      // ✅ 3. به‌روزرسانی وضعیت مراجعه
      //    PUT /registrations/{reg_id}/status
      // ============================================================
      try {
        await api.put(`/registrations/${selectedPatientId}/status`, {
          visit_status: 'Completed'
        });
        console.log('✅ Registration status updated');
      } catch (statusErr) {
        console.warn('⚠️ update status failed:', statusErr);
        errors.push(`وضعیت: ${statusErr?.response?.data?.message || statusErr?.message}`);
      }

      // ============================================================
      // ✅ نمایش نتیجه
      // ============================================================
      if (errors.length > 0) {
        console.error('❌ Errors during finalize:', errors);
        toast.warning(
          `⚠️ بعضی از عملیات ناقص بود: ${errors.join(' | ')}`,
          { autoClose: 8000 }
        );
      } else {
        toast.success("✅ معالجه با موفقیت خاتمه یافت و تمام معلومات در تاریخچه ثبت شد");
      }

      // ============================================================
      // ✅ پاک‌سازی state
      // ============================================================
      setActivePatients(prev => {
        const updated = { ...prev };
        delete updated[selectedPatientId];
        saveState(updated, 'queue', null);
        return updated;
      });
      
      setSelectedPatientId(null);
      setSelectedRegistration(null);
      setActiveTab('queue');
      localStorage.removeItem(SELECTED_PATIENT_KEY);
      localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
      await fetchQueue();
      await fetchAllAdmissions();
      
    } catch (err) {
      console.error("خطا در ختم معالجه:", err);
      toast.error("❌ خطا در ختم معالجه");
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshData = async () => {
    await fetchQueue();
    await fetchAllAdmissions();
    if (selectedPatientId) {
      await loadAllPatientData(selectedPatientId);
    }
    setRefreshKey(prev => prev + 1);
  };

  const restoreState = async () => {
    try {
      const saved = loadState();
      const patients = saved.patients || {};
      const savedTab = saved.activeTab || 'queue';
      const savedPatientId = saved.selectedPatientId;
      
      setActivePatients(patients);
      await fetchAllAdmissions();
      
      if (savedPatientId && patients[savedPatientId]) {
        setSelectedPatientId(savedPatientId);
        setActiveTab(savedTab);
        const regData = await fetchPatientRegistration(savedPatientId);
        if (regData) {
          setSelectedRegistration(regData);
        }
        await loadAllPatientData(savedPatientId);
      } else {
        setActiveTab('queue');
        localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
        localStorage.removeItem(SELECTED_PATIENT_KEY);
      }
      await fetchQueue();
    } catch (err) {
      console.error("❌ Error restoring state:", err);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    restoreState();
  }, []);

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

  const renderPatientInfoHeader = () => {
    if (!selectedRegistration) return null;
    
    const patient = selectedRegistration.patient || selectedRegistration;
    const firstName = patient.first_name || '';
    const lastName = patient.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'نامشخص';
    const nationalId = patient.national_id || selectedRegistration.patient?.national_id || '-';
    const visitNumber = selectedRegistration.visit_number || selectedRegistration.id || selectedRegistration.reg_id || '-';
    const phone = patient.phone || patient.mobile || '-';
    const gender = patient.gender === 'male' ? 'مرد' : patient.gender === 'female' ? 'زن' : '-';
    
    return (
      <div style={{
        backgroundColor: C.cardBg,
        padding: '15px 20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: `1px solid ${C.border}`,
        borderRight: `4px solid ${C.success}`,
        boxShadow: C.shadow
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '12px',
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: '10px'
        }}>
          <span style={{ fontSize: '22px' }}>👤</span>
          <h4 style={{ color: C.success, margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
            معلومات مریض
          </h4>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: C.softBg,
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>
              👤 نام و تخلص
            </div>
            <div style={{ fontSize: '14px', color: C.textPrimary, fontWeight: 'bold' }}>
              {fullName}
            </div>
          </div>
          
          <div style={{
            backgroundColor: C.softBg,
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>
              🆔 شماره تذکره
            </div>
            <div style={{ fontSize: '14px', color: C.textPrimary, fontWeight: 'bold' }}>
              {nationalId}
            </div>
          </div>
          
          <div style={{
            backgroundColor: C.softBg,
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>
              📋 شماره مراجعه
            </div>
            <div style={{ fontSize: '14px', color: '#b45309', fontWeight: 'bold' }}>
              #{visitNumber}
            </div>
          </div>
          
          <div style={{
            backgroundColor: C.softBg,
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${C.border}`
          }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>
              ⚧ جنسیت
            </div>
            <div style={{ fontSize: '14px', color: C.textPrimary, fontWeight: 'bold' }}>
              {gender}
            </div>
          </div>
          
          {phone !== '-' && (
            <div style={{
              backgroundColor: C.softBg,
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${C.border}`
            }}>
              <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>
                📞 شماره تماس
              </div>
              <div style={{ fontSize: '14px', color: C.textPrimary, fontWeight: 'bold' }}>
                {phone}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          <h4 style={{ color: C.textPrimary, marginBottom: '12px', fontSize: '15px', borderBottom: `2px solid ${C.border}`, paddingBottom: '10px' }}>
            📋 مریضان در مرحله {STEPS.find(s => s.key === activeTab)?.label}
          </h4>
          {stagePatients.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px', 
              color: C.textSecondary,
              background: C.softBg,
              borderRadius: '10px',
              border: `1px dashed ${C.border}`
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
              <div>هیچ مریضی در این مرحله وجود ندارد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {stagePatients.map(p => {
                const isSelected = selectedPatientId === p.reg_id;
                return (
                  <div
                    key={p.reg_id}
                    onClick={() => {
                      setSelectedPatientId(p.reg_id);
                      setSelectedRegistration(p);
                      setActiveTab(activeTab);
                      localStorage.setItem(SELECTED_PATIENT_KEY, String(p.reg_id));
                      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
                    }}
                    style={{
                      backgroundColor: isSelected ? C.accentSoft : C.cardBg,
                      padding: '12px 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                      transition: 'all 0.3s',
                      position: 'relative',
                      minWidth: '220px',
                      boxShadow: isSelected ? C.shadowMd : C.shadow
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: isSelected ? '#1e40af' : C.textPrimary, fontSize: '14px' }}>
                        {p.patient?.first_name || ''} {p.patient?.last_name || ''}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '3px' }}>
                        #{p.visit_number || p.id} | {p.patient?.national_id || '-'}
                        {activeTab === 'admission' && p.status && (
                          <span style={{ 
                            marginLeft: '8px', 
                            color: p.status === 'admitted' ? C.success : C.warning,
                            fontWeight: 'bold'
                          }}>
                            [{p.status === 'admitted' ? 'بستری' : 'در انتظار'}]
                          </span>
                        )}
                      </div>
                    </div>
                    {p.progress?.completedSteps?.includes(activeTab) && (
                      <span style={{ color: C.success, fontSize: '16px', marginRight: 'auto' }}>✅</span>
                    )}
                    {activeTab === 'laboratory' && p.has_lab_result && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        backgroundColor: C.success,
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff'
                      }}>
                        📋
                      </span>
                    )}
                    {activeTab === 'radiology' && p.has_rad_result && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        backgroundColor: C.success,
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff'
                      }}>
                        📷
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {selectedPatientId && selectedRegistration ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
            {renderSelectedPatientForm()}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: C.textSecondary,
            background: C.softBg,
            borderRadius: '10px',
            border: `1px dashed ${C.border}`
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
            <div>برای مشاهده فرم، یک مریض را از لیست بالا انتخاب کنید</div>
          </div>
        )}
      </div>
    );
  };

  const renderSelectedPatientForm = () => {
    if (!selectedPatientId || !selectedRegistration) return null;
    
    const regId = selectedPatientId;
    const patientData = activePatients[regId]?.data || {};
    const isComplete = currentProgress.isComplete || false;
    
    switch (activeTab) {
      case "examination":
        return (
          <>
            {renderPatientInfoHeader()}
            <ExaminationForm 
              registration={selectedRegistration}
              onComplete={() => {
                setActiveTab('queue');
                setSelectedPatientId(null);
                setSelectedRegistration(null);
                localStorage.removeItem(SELECTED_PATIENT_KEY);
                localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
          </>
        );
        
      case "laboratory":
        const labData = patientData.laboratory || { 
          data: null, allTests: [], isRequested: false, hasResult: false
        };
        
        return (
          <>
            {renderPatientInfoHeader()}
            <LaboratoryRequest 
              registration={selectedRegistration}
              onComplete={() => {
                setActiveTab('queue');
                setSelectedPatientId(null);
                setSelectedRegistration(null);
                localStorage.removeItem(SELECTED_PATIENT_KEY);
                localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
              hasLabResult={labData.hasResult || false}
              setIsLabRequested={(val) => {
                updatePatientData(regId, 'laboratory', {
                  ...labData,
                  isRequested: val
                });
              }}
              setAllTests={(tests) => {
                const hasResult = tests?.some(t => t.has_result === true && t.result_details) || false;
                updatePatientData(regId, 'laboratory', {
                  ...labData,
                  allTests: tests || [],
                  isRequested: (tests || []).length > 0,
                  data: (tests || []).length > 0 ? tests[0] : null,
                  hasResult: hasResult
                });
              }}
            />
          </>
        );
        
      case "radiology":
        const radData = patientData.radiology || { 
          data: null, allRadiology: [], isRequested: false, hasResult: false
        };
        
        return (
          <>
            {renderPatientInfoHeader()}
            <RadiologyRequest 
              registration={selectedRegistration}
              onComplete={() => {
                setActiveTab('queue');
                setSelectedPatientId(null);
                setSelectedRegistration(null);
                localStorage.removeItem(SELECTED_PATIENT_KEY);
                localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
              savedRadiology={radData.data}
              allRadiology={radData.allRadiology || []}
              isRadiologyRequested={radData.isRequested || false}
              hasRadiologyResult={radData.hasResult || false}
              setIsRadiologyRequested={(val) => {
                updatePatientData(regId, 'radiology', {
                  ...radData,
                  isRequested: val
                });
              }}
              setAllRadiology={(items) => {
                const hasResult = items?.some(t => t.has_result === true) || false;
                updatePatientData(regId, 'radiology', {
                  ...radData,
                  allRadiology: items || [],
                  isRequested: (items || []).length > 0,
                  data: (items || []).length > 0 ? items[0] : null,
                  hasResult: hasResult
                });
              }}
            />
          </>
        );
        
      case "operation":
        const operationRegId = selectedPatientId || selectedRegistration?.reg_id;
        
        if (!operationRegId) {
          return (
            <div style={{ textAlign: 'center', padding: '40px', color: C.danger, background: C.cardBg, borderRadius: '10px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
              <p>شناسه مراجعه یافت نشد. لطفاً یک مریض را انتخاب کنید.</p>
              <button
                onClick={() => {
                  setActiveTab('queue');
                  setSelectedPatientId(null);
                  setSelectedRegistration(null);
                }}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  backgroundColor: C.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                بازگشت به صف انتظار
              </button>
            </div>
          );
        }
        
        return (
          <>
            {renderPatientInfoHeader()}
            <OperationRoom 
              api={api}
              registration={selectedRegistration}
              registrationId={selectedPatientId}
              patientId={selectedRegistration?.patient_id || selectedRegistration?.patient?.id}
              regId={operationRegId}
              onSelectPatient={handleSelectPatient}
              onRefresh={refreshData}
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
          </>
        );
        
      case "pres_insert":
        return (
          <>
            {renderPatientInfoHeader()}
            <div style={{
              backgroundColor: C.cardBg,
              borderRadius: '10px',
              padding: '5px',
              color: C.textPrimary
            }}>
              <PrescriptionRequest 
                registration={selectedRegistration}
                regId={regId}
                onComplete={() => {
                  setActiveTab('queue');
                  setSelectedPatientId(null);
                  setSelectedRegistration(null);
                  localStorage.removeItem(SELECTED_PATIENT_KEY);
                  localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
            </div>
          </>
        );
        
      case "followup":
        return (
          <>
            {renderPatientInfoHeader()}
            <FollowUp 
              registration={selectedRegistration}
              onComplete={() => {
                setActiveTab('queue');
                setSelectedPatientId(null);
                setSelectedRegistration(null);
                localStorage.removeItem(SELECTED_PATIENT_KEY);
                localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
          </>
        );
        
      case "admission":
        return (
          <>
            {renderPatientInfoHeader()}
            <Admission 
              registration={selectedRegistration}
              onComplete={() => {
                setActiveTab('queue');
                setSelectedPatientId(null);
                setSelectedRegistration(null);
                localStorage.removeItem(SELECTED_PATIENT_KEY);
                localStorage.setItem(ACTIVE_TAB_KEY, 'queue');
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
              allAdmissionRequests={allAdmissionRequests}
              fetchAllAdmissions={fetchAllAdmissions}
            />
          </>
        );
        
      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    if (activeTab === 'queue' || activeTab === 'history') return null;
    if (!selectedPatientId) return null;
    
    const totalSteps = STEPS.length - 1;
    const completed = currentProgress.completedSteps?.length || 0;
    const progress = Math.round((completed / totalSteps) * 100);
    
    return (
      <div style={{
        backgroundColor: C.cardBg,
        padding: '15px 20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: `1px solid ${C.border}`,
        boxShadow: C.shadow
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <span style={{ color: C.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
              {selectedRegistration?.patient?.first_name || ''} {selectedRegistration?.patient?.last_name || ''} — 
              پیشرفت: {completed} از {totalSteps} مرحله
            </span>
            <span style={{
              backgroundColor: progress === 100 ? C.success : C.accent,
              color: 'white',
              padding: '3px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {progress}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
                    padding: '3px 10px',
                    borderRadius: '10px',
                    backgroundColor: isCompleted ? C.successSoft : isActive ? C.accentSoft : C.softBg,
                    color: isCompleted ? '#065f46' : isActive ? '#1e40af' : C.textSecondary,
                    fontSize: '10px',
                    fontWeight: isActive ? 'bold' : 'normal',
                    border: isActive ? `1px solid ${C.accent}` : `1px solid ${C.border}`
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
          height: '8px',
          backgroundColor: C.border,
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: progress === 100 ? C.success : C.accent,
            transition: 'width 0.5s ease',
            borderRadius: '4px'
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
          color: C.textSecondary,
          fontSize: '18px',
          background: C.cardBg,
          borderRadius: '10px',
          margin: '20px',
          border: `1px solid ${C.border}`
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

      <div style={{ 
        background: C.pageBg,
        minHeight: '100vh',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <div className="form-container">
          <h2 style={{ 
            textAlign: "center", 
            marginBottom: "20px", 
            color: C.textPrimary,
            fontSize: '20px',
            fontWeight: 'bold',
            background: C.cardBg,
            padding: '15px 20px',
            borderRadius: '10px',
            border: `1px solid ${C.border}`,
            boxShadow: C.shadow
          }}>
            🏥 معالجه داکتر
          </h2>

          {renderProgressBar()}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
              background: C.cardBg,
              padding: '15px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow
            }}
          >
            {STEPS.map((step) => {
              const isActive = activeTab === step.key;
              let patientCount = 0;
              
              if (step.key === 'queue') {
                patientCount = queue.filter(p => 
                  !activePatients[p.reg_id] && 
                  p.visit_status !== "Completed" &&
                  p.visit_status !== "InProgress"
                ).length;
              } else if (step.key === 'admission') {
                patientCount = allAdmissionRequests.length;
              } else if (step.key !== 'history') {
                const patients = getPatientsInStage(step.key);
                patientCount = patients.length;
              }
              
              return (
                <button
                  key={step.key}
                  onClick={() => {
                    setActiveTab(step.key);
                    setSelectedHistory(null);
                    localStorage.setItem(ACTIVE_TAB_KEY, step.key);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    background: isActive ? step.color : C.cardBg,
                    color: isActive ? "#fff" : C.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    position: 'relative',
                    border: isActive ? `1px solid ${step.color}` : `1px solid ${C.border}`,
                    transition: 'all 0.3s',
                    boxShadow: isActive ? `0 2px 8px ${step.color}40` : C.shadow
                  }}
                >
                  {step.icon}
                  {step.label}
                  {patientCount > 0 && (
                    <span style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : C.softBg,
                      color: isActive ? '#fff' : C.textSecondary,
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold'
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
                      backgroundColor: C.success,
                      borderRadius: '50%',
                      animation: 'pulse 1.5s infinite',
                      border: '2px solid #ffffff'
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              background: C.cardBg,
              borderRadius: "10px",
              padding: "25px",
              minHeight: "500px",
              color: C.textPrimary,
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow
            }}
          >
            {renderTabContent()}
          </div>

          {selectedPatientId && activeTab !== 'queue' && activeTab !== 'history' && !currentProgress.isComplete && activeTab !== 'admission' && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              gap: '10px',
              background: C.cardBg,
              padding: '15px 20px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow
            }}>
              <button
                onClick={goToPreviousStep}
                style={{
                  padding: '10px 24px',
                  backgroundColor: C.cardBg,
                  color: C.textPrimary,
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = C.softBg}
                onMouseLeave={(e) => e.target.style.backgroundColor = C.cardBg}
              >
                ↩️ مرحله قبل
              </button>
              <button
                onClick={goToNextStep}
                style={{
                  padding: '10px 24px',
                  backgroundColor: C.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 2px 8px ${C.accent}40`,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = C.accent}
              >
                مرحله بعد ➡️
              </button>
            </div>
          )}
        </div>
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