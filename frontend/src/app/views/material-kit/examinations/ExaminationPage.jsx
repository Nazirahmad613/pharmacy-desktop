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
  { key: 'queue', label: 'صف انتظار', icon: '📋', color: '#2563eb' },
  { key: 'examination', label: 'معاینه', icon: '🩺', color: '#0284c7' },
  { key: 'laboratory', label: 'لابراتوار', icon: '🔬', color: '#6366f1' },
  { key: 'radiology', label: 'رادیولوژی', icon: '📷', color: '#0ea5e9' },
  { key: 'operation', label: 'عملیات', icon: '🔪', color: '#e11d48' },
  { key: 'pres_insert', label: 'نسخه', icon: '📝', color: '#059669' },
  { key: 'followup', label: 'ملاقات بعدی', icon: '📅', color: '#d97706' },
  { key: 'admission', label: 'بستری', icon: '🏥', color: '#dc2626' },
  { key: 'history', label: 'تاریخچه', icon: '📜', color: '#7c3aed' }
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
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  softBg: '#f1f5f9',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2563eb',
  accentSoft: '#eff6ff',
  success: '#10b981',
  successSoft: '#ecfdf5',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  purple: '#8b5cf6',
  purpleSoft: '#f5f3ff',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 10px 15px -3px rgba(37, 99, 235, 0.1), 0 4px 6px -4px rgba(37, 99, 235, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.7)',
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

const extractRefId = (returnedData) => {
  if (!returnedData || typeof returnedData !== 'object') return null;

  if (returnedData.id != null) return returnedData.id;
  if (returnedData.pres_id != null) return returnedData.pres_id;

  const inner = returnedData.data && typeof returnedData.data === 'object' 
    ? returnedData.data 
    : {};

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
    inner.id,
    inner.pres_id,
    inner.examination?.id,
    inner.laboratory_request?.id,
    inner.laboratory?.id,
    inner.radiology_request?.id,
    inner.radiology?.id,
    inner.prescription?.pres_id,
    inner.prescription?.id,
    inner.admission?.id,
    inner.operation?.id,
    inner.operation_request?.id,
    inner.followup?.id,
    Array.isArray(returnedData.tests) ? returnedData.tests[0]?.id : null,
    Array.isArray(returnedData.radiology) ? returnedData.radiology[0]?.id : null,
    Array.isArray(returnedData.all_tests) ? returnedData.all_tests[0]?.id : null,
    Array.isArray(returnedData.all_radiology) ? returnedData.all_radiology[0]?.id : null,
    Array.isArray(inner.tests) ? inner.tests[0]?.id : null,
    Array.isArray(inner.radiology) ? inner.radiology[0]?.id : null,
    Array.isArray(inner.all_tests) ? inner.all_tests[0]?.id : null,
    Array.isArray(inner.all_radiology) ? inner.all_radiology[0]?.id : null,
  ];

  return candidates.find((c) => c != null) ?? null;
};

const sanitizeForApi = (obj) => {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForApi);
  if (typeof obj === 'object') {
    if (obj instanceof File || obj instanceof Blob || obj instanceof Date) return obj;
    const out = {};
    for (const k of Object.keys(obj)) {
      if (k === '__proto__' || k === 'constructor') continue;
      out[k] = sanitizeForApi(obj[k]);
    }
    return out;
  }
  return obj;
};

const buildHistorySnapshot = (stepKey, payload, returnedData, currentStepLabel) => {
  const responseData = returnedData?.data && typeof returnedData.data === 'object'
    ? returnedData.data
    : (returnedData && typeof returnedData === 'object' ? returnedData : {});

  const base = {
    ...payload,
    ...(typeof responseData === 'object' ? responseData : {}),
    status: responseData?.status || returnedData?.status || 'completed',
    submitted_at: new Date().toISOString(),
    step_label: currentStepLabel,
  };

  if (stepKey === 'laboratory') {
    base.test_name = payload.test_name || responseData.test_name || responseData.test_type || null;
    base.test_type = payload.test_type || responseData.test_type || null;
    base.test_description = payload.test_description || responseData.test_description || null;
    base.clinical_indication = payload.clinical_indication || responseData.clinical_indication || null;
    base.special_notes = payload.special_notes || responseData.special_notes || null;
    base.barcode = responseData.barcode || payload.barcode || null;

    if (responseData.tests && Array.isArray(responseData.tests) && responseData.tests.length > 0) {
      base.tests = responseData.tests;
      base.tests_count = responseData.tests.length;
      if (!base.test_name) {
        base.test_name = responseData.tests[0]?.test_name || responseData.tests[0]?.test_type || responseData.tests[0]?.name || null;
      }
    }
    if (responseData.all_tests && Array.isArray(responseData.all_tests)) {
      base.all_tests = responseData.all_tests;
    }
  }

  if (stepKey === 'radiology') {
    base.radiology_type = payload.radiology_type || responseData.radiology_type || null;
    base.body_part = payload.body_part || responseData.body_part || null;
    base.reason = payload.reason || responseData.reason || null;
    base.notes = payload.notes || responseData.notes || null;
    base.priority = payload.priority || responseData.priority || 'normal';
    base.clinical_indication = payload.clinical_indication || responseData.clinical_indication || null;
    base.special_notes = payload.special_notes || responseData.special_notes || null;
    base.barcode = responseData.barcode || payload.barcode || null;

    if (responseData.radiology && Array.isArray(responseData.radiology)) {
      base.radiology_list = responseData.radiology;
    }
    if (responseData.all_radiology && Array.isArray(responseData.all_radiology)) {
      base.all_radiology = responseData.all_radiology;
    }
  }

  if (stepKey === 'operation') {
    base.surgery_type = payload.surgery_type || responseData.surgery_type || null;
    base.operation_type = payload.operation_type || responseData.operation_type || null;
    base.surgeon = payload.surgeon || responseData.surgeon || null;
    base.surgeon_name = payload.surgeon_name || responseData.surgeon_name || null;
    base.operation_date = payload.operation_date || responseData.operation_date || null;
    base.scheduled_date = payload.scheduled_date || responseData.scheduled_date || null;
    base.operation_notes = payload.operation_notes || responseData.operation_notes || null;
    base.room_name = payload.room_name || responseData.room_name || null;
  }

  if (stepKey === 'pres_insert' || stepKey === 'prescription') {
    const items = responseData.items || payload.items || responseData.prescription?.items || [];
    base.items = items;
    base.items_count = items.length;
    base.medicines = responseData.medicines || payload.medicines || null;

    if (responseData.prescription) {
      base.prescription = responseData.prescription;
    }
    if (responseData.all_prescriptions && Array.isArray(responseData.all_prescriptions)) {
      base.all_prescriptions = responseData.all_prescriptions;
    }
  }

  if (stepKey === 'examination') {
    base.diagnosis = payload.diagnosis || responseData.diagnosis || null;
    base.weight = payload.weight || responseData.weight || null;
    base.blood_pressure = payload.blood_pressure || responseData.blood_pressure || null;
    base.temperature = payload.temperature || responseData.temperature || null;
    base.oxygen = payload.oxygen || responseData.oxygen || null;
    base.clinical_notes = payload.clinical_notes || responseData.clinical_notes || null;
  }

  if (stepKey === 'admission') {
    base.ward_id = payload.ward_id || responseData.ward_id || null;
    base.ward_name = payload.ward_name || responseData.ward_name || responseData.ward?.name || null;
    base.admission_date = payload.admission_date || responseData.admission_date || null;
    base.diagnosis = payload.diagnosis || responseData.diagnosis || null;
    base.admission_instructions = payload.admission_instructions || responseData.admission_instructions || null;
    base.special_notes = payload.special_notes || responseData.special_notes || null;
    base.priority = payload.priority || responseData.priority || 'normal';
  }

  const fee = responseData?.fee || returnedData?.fee || responseData?.data?.fee || null;
  if (fee) {
    base.amount = fee.amount || fee.total_amount || base.amount;
    base.paid_amount = fee.paid_amount || base.paid_amount;
    base.remaining_amount = fee.remaining_amount || base.remaining_amount;
    base.payment_status = fee.payment_status || base.payment_status;
  }

  if (responseData?.barcode) base.barcode = responseData.barcode;
  else if (returnedData?.barcode) base.barcode = returnedData.barcode;

  if (responseData?.pdf_url) base.pdf_url = responseData.pdf_url;
  else if (returnedData?.pdf_url) base.pdf_url = returnedData.pdf_url;

  return sanitizeForApi(base);
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

  const syncTreatmentHistory = async (
    regId,
    stepKey = null,
    stepData = null,
    refId = null,
    refTable = null,
    finalize = false
  ) => {
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
        payload.step_data = sanitizeForApi(stepData);
        payload.ref_id = refId ?? extractRefId(stepData);
        payload.ref_table = refTable || STEP_REF_TABLE[stepKey] || null;
      }

      const response = await api.post('/treatment-history/sync', payload);

      if (response.data?.success) {
        return response.data.data;
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
          url = `/doctor/follow-up`;
          payload = {
            reg_id: regId,
            patient_id: selectedRegistration?.patient_id
              || selectedRegistration?.patient?.id
              || null,
            doctor_id: selectedRegistration?.doctor_id || null,
            follow_up_date: data.follow_up_date,
            follow_up_time: data.follow_up_time || null,
            reason: data.reason || '',
            instructions: data.instructions || null,
            priority: data.priority || 'normal',
          };
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

      try {
        const returnedData = response.data?.data || response.data || payload;
        const refId = extractRefId(returnedData);
        const refTable = STEP_REF_TABLE[currentStep.key] || null;

        const historySnapshot = buildHistorySnapshot(
          currentStep.key,
          payload,
          returnedData,
          currentStep.label
        );

        await syncTreatmentHistory(
          regId,
          currentStep.key,
          historySnapshot,
          refId,
          refTable
        );
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
      try {
        await syncTreatmentHistory(selectedPatientId, null, null, null, null, true);
      } catch (finalizeErr) {
        errors.push(`تاریخچه: ${finalizeErr?.response?.data?.message || finalizeErr?.message}`);
      }

      try {
        await api.post(`/doctor/complete/${selectedPatientId}`, {
          completed_steps: progress.completedSteps,
          start_time: progress.startTime,
          end_time: new Date().toISOString()
        });
      } catch (completeErr) {
        errors.push(`ختم معالجه: ${completeErr?.response?.data?.message || completeErr?.message}`);
      }

      try {
        await api.put(`/registrations/${selectedPatientId}/status`, {
          visit_status: 'Completed'
        });
      } catch (statusErr) {
        errors.push(`وضعیت: ${statusErr?.response?.data?.message || statusErr?.message}`);
      }

      if (errors.length > 0) {
        toast.warning(
          `⚠️ بعضی از عملیات ناقص بود: ${errors.join(' | ')}`,
          { autoClose: 8000 }
        );
      } else {
        toast.success("✅ معالجه با موفقیت خاتمه یافت و تمام معلومات در تاریخچه ثبت شد");
      }

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
      <div className="glass-panel" style={{
        padding: '18px 24px',
        borderRadius: '16px',
        marginBottom: '24px',
        borderRight: '5px solid #0284c7',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
          paddingBottom: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>👤</span>
          <h4 style={{ color: '#0369a1', margin: 0, fontSize: '16px', fontWeight: '800' }}>
            معلومات و مشخصات مریض
          </h4>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          <div className="glass-stat-card">
            <div className="stat-label">👤 نام و تخلص</div>
            <div className="stat-value">{fullName}</div>
          </div>

          <div className="glass-stat-card">
            <div className="stat-label">🆔 شماره تذکره</div>
            <div className="stat-value">{nationalId}</div>
          </div>

          <div className="glass-stat-card">
            <div className="stat-label">📋 شماره مراجعه</div>
            <div className="stat-value" style={{ color: '#0284c7' }}>#{visitNumber}</div>
          </div>

          <div className="glass-stat-card">
            <div className="stat-label">⚧ جنسیت</div>
            <div className="stat-value">{gender}</div>
          </div>

          {phone !== '-' && (
            <div className="glass-stat-card">
              <div className="stat-label">📞 شماره تماس</div>
              <div className="stat-value">{phone}</div>
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
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ 
            color: C.textPrimary, 
            marginBottom: '14px', 
            fontSize: '15px', 
            fontWeight: '700',
            borderBottom: `1.5px solid ${C.border}`, 
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span>
            <span>مریضان در مرحله {STEPS.find(s => s.key === activeTab)?.label}</span>
          </h4>
          {stagePatients.length === 0 ? (
            <div className="glass-empty">
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>📭</div>
              <div style={{ fontWeight: '500' }}>هیچ مریضی در این مرحله وجود ندارد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                    className={`patient-card-pill ${isSelected ? 'selected' : ''}`}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: isSelected ? '#1e40af' : C.textPrimary, fontSize: '14px' }}>
                        {p.patient?.first_name || ''} {p.patient?.last_name || ''}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '4px' }}>
                        #{p.visit_number || p.id} | {p.patient?.national_id || '-'}
                        {activeTab === 'admission' && p.status && (
                          <span style={{
                            marginRight: '6px',
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
                      <span className="badge-bubble">📋</span>
                    )}
                    {activeTab === 'radiology' && p.has_rad_result && (
                      <span className="badge-bubble">📷</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedPatientId && selectedRegistration ? (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '22px' }}>
            {renderSelectedPatientForm()}
          </div>
        ) : (
          <div className="glass-empty" style={{ padding: '48px 20px' }}>
            <div style={{ fontSize: '50px', marginBottom: '14px' }}>👤</div>
            <div style={{ fontSize: '15px', fontWeight: '500' }}>برای مشاهده جزئیات و ادامه معالجه، یک مریض را انتخاب کنید</div>
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
            <div className="glass-empty" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: C.danger }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
              <p style={{ fontWeight: 'bold' }}>شناسه مراجعه یافت نشد. لطفاً یک مریض را انتخاب کنید.</p>
              <button
                onClick={() => {
                  setActiveTab('queue');
                  setSelectedPatientId(null);
                  setSelectedRegistration(null);
                }}
                className="btn-primary"
                style={{ marginTop: '16px' }}
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
            <div style={{ color: C.textPrimary }}>
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
      <div className="glass-panel" style={{
        padding: '16px 22px',
        borderRadius: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <span style={{ color: C.textPrimary, fontSize: '14px', fontWeight: '700' }}>
              {selectedRegistration?.patient?.first_name || ''} {selectedRegistration?.patient?.last_name || ''} —
              پیشرفت درمان: {completed} از {totalSteps} مرحله
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: 'white',
              padding: '3px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}>
              {progress}%
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STEPS.slice(1).map((step) => {
              const isCompleted = currentProgress.completedSteps?.includes(step.key);
              const isActive = step.key === activeTab;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: isCompleted ? C.successSoft : isActive ? C.accentSoft : 'rgba(241, 245, 249, 0.8)',
                    color: isCompleted ? '#065f46' : isActive ? '#1e40af' : C.textSecondary,
                    fontSize: '11px',
                    fontWeight: isActive ? '700' : '500',
                    border: isActive ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
          height: '10px',
          backgroundColor: '#e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 50%, #2563eb 100%)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '10px',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.5)'
          }} />
        </div>
      </div>
    );
  };

  if (!isInitialized) {
    return (
      <MainLayoutjur>
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          height: '420px',
          color: C.textSecondary,
          fontSize: '18px',
          borderRadius: '20px',
          margin: '30px auto',
          maxWidth: '90%'
        }}>
          <div className="water-loader"></div>
          <span style={{ fontWeight: '600', color: '#0284c7' }}>در حال آماده‌سازی سیستم درمان...</span>
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

      <div className="treatment-wrapper">
        <div className="form-container">
          <div className="glass-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ fontSize: '26px' }}>🏥</span>
              <h2>معالجه و مدیریت مریضان</h2>
            </div>
            <p>سیستم یکپارچه ویزیت، لابراتوار، رادیولوژی، بستری و تاریخچه الکترونیک</p>
          </div>

          {renderProgressBar()}

          {/* نوار تب شیشه‌ای با افکت پر شدن آب آبی */}
          <div className="glass-tab-container">
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
                  className={`water-tab-btn ${isActive ? 'active' : ''}`}
                >
                  {/* لایه آب پر شونده */}
                  <div className="water-liquid">
                    <div className="water-wave"></div>
                    <div className="water-wave wave-back"></div>
                  </div>

                  {/* محتوای روی تب */}
                  <div className="tab-content-layer">
                    <span className="tab-icon">{step.icon}</span>
                    <span className="tab-title">{step.label}</span>
                    {patientCount > 0 && (
                      <span className={`tab-badge ${isActive ? 'active-badge' : ''}`}>
                        {patientCount}
                      </span>
                    )}
                    {isActive && selectedPatientId && (
                      <span className="live-indicator-dot" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* بدنه محتوای فرم تب فعال */}
          <div className="glass-panel main-content-box">
            {renderTabContent()}
          </div>

          {/* دکمه‌های ناوبری مراحل */}
          {selectedPatientId && activeTab !== 'queue' && activeTab !== 'history' && !currentProgress.isComplete && activeTab !== 'admission' && (
            <div className="glass-panel" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '22px',
              gap: '12px',
              padding: '16px 24px',
              borderRadius: '16px'
            }}>
              <button
                onClick={goToPreviousStep}
                className="btn-secondary"
              >
                <span>↩️</span>
                <span>مرحله قبل</span>
              </button>
              <button
                onClick={goToNextStep}
                className="btn-primary"
              >
                <span>مرحله بعد</span>
                <span>➡️</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ================= Glassmorphism & Liquid Styles ================= */
        .treatment-wrapper {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 50%, #eff6ff 100%);
          font-family: inherit;
        }

        .glass-header {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 22px;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.08), 0 8px 10px -6px rgba(37, 99, 235, 0.04);
        }

        .glass-header h2 {
          color: #0f172a;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .glass-header p {
          color: #64748b;
          font-size: 13px;
          margin: 6px 0 0 0;
          font-weight: 500;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 4px 6px -2px rgba(15, 23, 42, 0.02);
        }

        .main-content-box {
          border-radius: 20px;
          padding: 28px;
          min-height: 520px;
          margin-top: 10px;
        }

        /* ظرف تب‌ها به شکل Glass شیشه‌ای */
        .glass-tab-container {
          display: flex;
          justifyContent: center;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          flex-wrap: wrap;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 10px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.07);
        }

        /* استایل دکمه تب با افکت لیوان پر از آب */
        .water-tab-btn {
          position: relative;
          overflow: hidden;
          padding: 10px 18px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          background: rgba(255, 255, 255, 0.6);
          color: #475569;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          outline: none;
        }

        .water-tab-btn:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(186, 230, 253, 0.9);
          box-shadow: 0 6px 14px -2px rgba(2, 132, 199, 0.15);
        }

        /* لایه مایع آبی درون تب (مانند لیوان پر شونده) */
        .water-liquid {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0%;
          background: linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #1d4ed8 100%);
          transition: height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 1;
          pointer-events: none;
        }

        /* امواج سطح آب */
        .water-wave {
          position: absolute;
          top: -12px;
          left: -50%;
          width: 200%;
          height: 24px;
          background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%);
          border-radius: 40%;
          opacity: 0.6;
          animation: waveRotate 5s linear infinite;
        }

        .water-wave.wave-back {
          top: -14px;
          opacity: 0.35;
          animation: waveRotate 3s linear infinite reverse;
        }

        /* حالت فعال: بالا آمدن آب به 100% ارتفاع لیوان */
        .water-tab-btn.active {
          border-color: #38bdf8;
          box-shadow: 0 8px 22px rgba(2, 132, 199, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.5);
          transform: translateY(-3px);
        }

        .water-tab-btn.active .water-liquid {
          height: 100%;
        }

        .water-tab-btn.active .tab-content-layer {
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        }

        /* لایه آیکون و متن تب */
        .tab-content-layer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: color 0.3s ease;
        }

        .tab-icon {
          font-size: 15px;
          display: inline-flex;
          align-items: center;
        }

        .tab-badge {
          background: #e2e8f0;
          color: #334155;
          padding: 2px 7px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 800;
          transition: all 0.3s ease;
        }

        .tab-badge.active-badge {
          background: rgba(255, 255, 255, 0.28);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .live-indicator-dot {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 9px;
          height: 9px;
          background-color: #10b981;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 0 6px #10b981;
          animation: pulseDot 1.6s infinite;
        }

        /* کارت مریضان با ظاهر مدرن */
        .patient-card-pill {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          padding: 12px 18px;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1.5px solid rgba(226, 232, 240, 0.9);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          min-width: 230px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }

        .patient-card-pill:hover {
          transform: translateY(-2px);
          border-color: #93c5fd;
          box-shadow: 0 8px 18px -4px rgba(37, 99, 235, 0.12);
        }

        .patient-card-pill.selected {
          background: #f0f9ff;
          border-color: #0284c7;
          box-shadow: 0 8px 20px -3px rgba(2, 132, 199, 0.2);
        }

        .badge-bubble {
          position: absolute;
          top: -6px;
          right: -6px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        }

        .glass-stat-card {
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 12px 16px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .glass-stat-card:hover {
          background: #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
        }

        .stat-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 14px;
          color: #0f172a;
          font-weight: 800;
        }

        .glass-empty {
          text-align: center;
          padding: 36px 20px;
          color: #64748b;
          background: rgba(248, 250, 252, 0.6);
          border-radius: 16px;
          border: 2px dashed rgba(203, 213, 225, 0.7);
        }

        /* دکمه‌های کنترلی شیشه‌ای و مدرن */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
          background: linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
          transition: all 0.25s ease;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        }

        .water-loader {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 4px solid #e0f2fe;
          border-top-color: #0284c7;
          animation: spin 1s infinite linear;
        }

        /* انیمیشن‌ها */
        @keyframes waveRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulseDot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </MainLayoutjur>
  );
}