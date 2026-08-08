// StagePatients.jsx
import { useState } from 'react';
import { toast } from 'react-toastify';

// تعریف STEPS در این فایل
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

export default function StagePatients({ 
  stage, 
  queue, 
  activePatients, 
  treatmentProgress,
  onSelectPatient,
  onRefresh 
}) {
  // پیدا کردن مریض‌هایی که در این مرحله هستند
  const getPatientsInStage = () => {
    if (stage === 'queue') return [];
    
    const patientsInStage = [];
    const patientIds = Object.keys(activePatients);
    
    patientIds.forEach(id => {
      const regId = parseInt(id);
      const patientData = queue.find(r => r.reg_id === regId);
      if (!patientData) return;
      
      // بررسی اینکه آیا مریض در این مرحله است
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

  const patients = getPatientsInStage();
  const stageLabel = STEPS.find(s => s.key === stage)?.label || stage;

  if (patients.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📭</span>
        <p>هیچ مریضی در مرحله {stageLabel} وجود ندارد</p>
        <button
          onClick={onRefresh}
          style={{
            marginTop: '15px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔄 بروزرسانی
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#60a5fa' }}>
          👥 مریض‌های در مرحله {stageLabel} ({patients.length})
        </h3>
        <button
          onClick={onRefresh}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '6px 15px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🔄 بروزرسانی
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '15px'
      }}>
        {patients.map((patient) => {
          const isCurrent = treatmentProgress.registrationId === patient.reg_id;
          return (
            <div
              key={patient.reg_id}
              style={{
                backgroundColor: isCurrent ? '#1e3a5f' : '#2a3a4a',
                padding: '15px',
                borderRadius: '8px',
                border: isCurrent ? '2px solid #3b82f6' : '1px solid #374151',
                cursor: 'pointer',
                transition: 'all 0.3s',
                hover: {
                  borderColor: '#3b82f6',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => onSelectPatient(patient)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '16px' }}>
                    {patient.patient?.first_name || ''} {patient.patient?.last_name || ''}
                  </strong>
                  {isCurrent && (
                    <span style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      marginLeft: '8px'
                    }}>
                      جاری
                    </span>
                  )}
                  <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '5px' }}>
                    <span>🎫 {patient.queue_number || '-'}</span>
                    <span style={{ marginLeft: '10px' }}>📋 {patient.visit_number || '-'}</span>
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '3px' }}>
                    📅 {patient.visit_date ? new Date(patient.visit_date).toLocaleDateString('fa-IR') : '-'}
                  </div>
                  {patient.progress && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '11px'
                      }}>
                        ✅ {patient.progress.completedSteps.length} مرحله تکمیل شده
                      </span>
                    </div>
                  )}
                </div>
                <button
                  style={{
                    backgroundColor: isCurrent ? '#10b981' : '#3b82f6',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPatient(patient);
                  }}
                >
                  {isCurrent ? 'ادامه' : 'انتخاب'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}