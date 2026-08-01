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
  
  // State های اصلی
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    endTime: null
  });

  // دریافت صف انتظار
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
      
      if (selectedRegistration) {
        const stillInQueue = data.some(r => r.reg_id === selectedRegistration.reg_id);
        if (!stillInQueue) {
          setSelectedRegistration(null);
        }
      }
    } catch (err) {
      console.error("خطا در دریافت صف:", err);
      toast.error("❌ خطا در دریافت لیست مریضان");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  // ============ توابع مدیریت مراحل ============

  // شروع درمان (انتخاب مریض از صف)
  const startTreatment = (registration) => {
    if (!registration || !registration.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }
    setSelectedRegistration(registration);
    setSelectedHistory(null);
    
    // تنظیم وضعیت شروع درمان
    setTreatmentProgress({
      currentStepIndex: 1, // معاینه (بعد از صف)
      completedSteps: ['queue'],
      isComplete: false,
      startTime: new Date().toISOString(),
      endTime: null
    });
    
    setActiveTab("examination");
    toast.info(`👨‍⚕️ شروع درمان برای ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''}`);
  };

  // رفتن به مرحله بعدی
  const goToNextStep = () => {
    const currentIndex = treatmentProgress.currentStepIndex;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= STEPS.length) {
      toast.info("✅ تمام مراحل درمان تکمیل شد");
      return;
    }
    
    // مرحله فعلی را کامل شده علامت بزن
    const currentStep = STEPS[currentIndex];
    if (!treatmentProgress.completedSteps.includes(currentStep.key)) {
      setTreatmentProgress(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, currentStep.key]
      }));
    }
    
    setTreatmentProgress(prev => ({
      ...prev,
      currentStepIndex: nextIndex
    }));
    
    setActiveTab(STEPS[nextIndex].key);
    toast.info(`➡️ رفتن به مرحله ${STEPS[nextIndex].label}`);
  };

  // برگشت به مرحله قبلی
  const goToPreviousStep = () => {
    const currentIndex = treatmentProgress.currentStepIndex;
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 1) {
      // اگر در صف هستیم، به صف برگردیم
      setActiveTab('queue');
      setTreatmentProgress({
        currentStepIndex: 0,
        completedSteps: [],
        isComplete: false,
        startTime: null,
        endTime: null
      });
      toast.info("↩️ بازگشت به صف انتظار");
      return;
    }
    
    setTreatmentProgress(prev => ({
      ...prev,
      currentStepIndex: prevIndex,
      completedSteps: prev.completedSteps.filter(step => step !== STEPS[currentIndex].key)
    }));
    
    setActiveTab(STEPS[prevIndex].key);
    toast.info(`↩️ بازگشت به مرحله ${STEPS[prevIndex].label}`);
  };

  // ثبت اطلاعات مرحله فعلی
  const saveCurrentStep = async (data) => {
    setIsSubmitting(true);
    try {
      const currentStep = STEPS[treatmentProgress.currentStepIndex];
      
      const response = await api.post(`/doctor/${currentStep.key}/save`, {
        registration_id: selectedRegistration?.reg_id,
        ...data
      });
      
      toast.success(`✅ اطلاعات ${currentStep.label} با موفقیت ثبت شد`);
      
      setTreatmentProgress(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, currentStep.key]
      }));
      
      return response.data;
    } catch (err) {
      console.error("خطا در ثبت اطلاعات:", err);
      toast.error("❌ خطا در ثبت اطلاعات");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ختم معالجه
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
      
      setTreatmentProgress(prev => ({
        ...prev,
        isComplete: true,
        endTime: new Date().toISOString()
      }));

      setTimeout(() => {
        setSelectedRegistration(null);
        setTreatmentProgress({
          currentStepIndex: 0,
          completedSteps: [],
          isComplete: false,
          startTime: null,
          endTime: null
        });
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

  const goBackToQueue = () => {
    if (treatmentProgress.completedSteps.length > 0) {
      if (!window.confirm("⚠️ آیا مطمئن هستید؟ اطلاعات ثبت شده از دست خواهد رفت.")) {
        return;
      }
    }
    setSelectedRegistration(null);
    setSelectedHistory(null);
    setTreatmentProgress({
      currentStepIndex: 0,
      completedSteps: [],
      isComplete: false,
      startTime: null,
      endTime: null
    });
    setActiveTab("queue");
    refreshData();
  };

  const handleSelectHistory = (historyItem) => {
    setSelectedHistory(historyItem);
    toast.info(`📜 مشاهده تاریخچه ${historyItem.patient?.first_name || ''} ${historyItem.patient?.last_name || ''}`);
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

        {/* نوار پیشرفت */}
        {renderProgressBar()}

        {/* اطلاعات مریض انتخاب شده */}
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
              <strong style={{ color: '#60a5fa' }}>👤 مریض:</strong>
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
              ✕ بازگشت به صف
            </button>
          </div>
        )}

        {/* Tabs - فقط صف انتظار و تاریخچه فعال هستند */}
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
            
            // تعیین اینکه آیا تب فعال است یا غیرفعال
            // فقط صف انتظار و تاریخچه همیشه فعال هستند
            // سایر تب‌ها فقط در صورتی فعال می‌شوند که مریض انتخاب شده باشد و مرحله به آن رسیده باشد
            const isStepAccessible = 
              step.key === 'queue' || 
              step.key === 'history' ||
              (hasValidRegistration && treatmentProgress.currentStepIndex >= STEPS.findIndex(s => s.key === step.key));
            
            // تعیین رنگ
            let bgColor = '#374151';
            if (isActive) bgColor = step.color;
            else if (isCompleted) bgColor = '#10b981';
            
            return (
              <button
                key={step.key}
                onClick={() => {
                  // فقط صف انتظار و تاریخچه قابل کلیک مستقیم هستند
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
                  
                  // سایر تب‌ها فقط در صورتی قابل کلیک هستند که قابل دسترس باشند
                  if (!isStepAccessible) {
                    toast.warning(`⚠️ ابتدا باید مراحل قبلی را تکمیل کنید`);
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
                title={!isStepAccessible ? `برای دسترسی به ${step.label}، ابتدا مراحل قبل را تکمیل کنید` : ''}
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
                {!isStepAccessible && step.key !== 'queue' && step.key !== 'history' && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    fontSize: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
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
              onSelectPatient={startTreatment}
              onRefresh={refreshData}
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
              onSelectPatient={startTreatment}
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

        {/* ============ دکمه‌های ناوبری حذف شدند ============ */}
        {/* دیگر دکمه‌های پایین صفحه وجود ندارند */}
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