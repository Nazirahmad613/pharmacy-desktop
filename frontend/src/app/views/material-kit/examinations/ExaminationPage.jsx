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

export default function TreatmentPage() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
 
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const selectPatient = (registration) => {
    if (!registration || !registration.reg_id) {
      toast.error("❌ اطلاعات مریض معتبر نیست");
      return;
    }
    setSelectedRegistration(registration);
    setSelectedHistory(null);
    setActiveTab("examination");
    toast.info(`👨‍⚕️ مریض ${registration.patient?.first_name || ''} ${registration.patient?.last_name || ''} انتخاب شد`);
  };

  const goBackToQueue = () => {
    setSelectedRegistration(null);
    setSelectedHistory(null);
    setActiveTab("queue");
    refreshData();
  };

  const handleSelectHistory = (historyItem) => {
    setSelectedHistory(historyItem);
    toast.info(`📜 مشاهده تاریخچه ${historyItem.patient?.first_name || ''} ${historyItem.patient?.last_name || ''}`);
  };

  const hasValidRegistration = selectedRegistration && selectedRegistration.reg_id;

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

        {hasValidRegistration && (
          <div style={{
            backgroundColor: '#1e3a5f',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #3b82f6',
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

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              setActiveTab("queue");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              background: activeTab === "queue" ? "#3b82f6" : "#374151",
              color: "#fff",
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📋</span>
            صف انتظار
            {queue.length > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                padding: '2px 8px',
                fontSize: '12px',
                marginLeft: '5px'
              }}>
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("examination");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "examination" ? "#3b82f6" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>🩺</span>
            معاینه
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("laboratory");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "laboratory" ? "#3b82f6" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>🔬</span>
            لابراتوار
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("radiology");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "radiology" ? "#8b5cf6" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>📷</span>
            رادیولوژی
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("pres_insert");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "pres_insert" ? "#3b82f6" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>📝</span>
            نسخه
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("followup");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "followup" ? "#10b981" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>📅</span>
            ملاقات بعدی
          </button>

          <button
            onClick={() => {
              if (!hasValidRegistration) {
                toast.warning("⚠️ لطفاً ابتدا یک مریض را از صف انتخاب کنید");
                return;
              }
              setActiveTab("admission");
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: hasValidRegistration ? "pointer" : "not-allowed",
              fontWeight: "bold",
              background: activeTab === "admission" ? "#ef4444" : "#374151",
              color: "#fff",
              opacity: hasValidRegistration ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={!hasValidRegistration}
          >
            <span>🏥</span>
            بستری
          </button>

          <button
            onClick={() => {
              setActiveTab("history");
              setSelectedRegistration(null);
              setSelectedHistory(null);
            }}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              background: activeTab === "history" ? "#8b5cf6" : "#374151",
              color: "#fff",
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📜</span>
            تاریخچه معالجه
          </button>
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
              onSelectPatient={selectPatient}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "examination" && hasValidRegistration && (
            <ExaminationForm 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "laboratory" && hasValidRegistration && (
            <LaboratoryRequest 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "radiology" && hasValidRegistration && (
            <RadiologyRequest 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "pres_insert" && hasValidRegistration && (
            <PrescriptionForm 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "followup" && hasValidRegistration && (
            <FollowUp 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "admission" && hasValidRegistration && (
            <Admission 
              registration={selectedRegistration}
              onComplete={goBackToQueue}
              onRefresh={refreshData}
              api={api}
            />
          )}

          {activeTab === "history" && (
            <HistoryList 
              api={api}
              onSelectHistory={handleSelectHistory}
            />
          )}
        </div>
      </div>
    </MainLayoutjur>
  );
}