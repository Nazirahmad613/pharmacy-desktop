// PrintComponent.jsx - کامپوننت پرینت جداگانه
import React from "react";

const PrintComponent = React.forwardRef(({ data, departmentNames, getDoctorName, getPatientFullName, getStatusText }, ref) => {
  if (!data) return null;
  
  const patient = data.patient || {};
  const department = data.department;
  const doctorName = data.doctor_id ? getDoctorName(data.doctor_id) : "-";
  
  return (
    <div ref={ref} style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl',
      backgroundColor: 'white',
      color: 'black',
      width: '210px',
      fontSize: '10px',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '10px' }}>
        <h3 style={{ margin: '0', fontSize: '14px' }}>رسید مراجعه</h3>
        <p style={{ margin: '2px 0', fontSize: '9px' }}>شماره: {data.visit_number || '-'}</p>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <p style={{ margin: '2px 0' }}><strong>نام مریض:</strong> {getPatientFullName(patient)}</p>
        <p style={{ margin: '2px 0' }}><strong>نام پدر:</strong> {patient.father_name || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>شماره تماس:</strong> {patient.mobile || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>شماره تذکره:</strong> {patient.national_id || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>جنسیت:</strong> {patient.gender === 'Male' ? 'مرد' : patient.gender === 'Female' ? 'زن' : patient.gender || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>سن:</strong> {patient.age || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>گروه خون:</strong> {patient.blood_group || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>آدرس:</strong> {patient.address || '-'}</p>
      </div>
      
      <div style={{ borderTop: '1px dashed #999', paddingTop: '8px', marginTop: '8px' }}>
        <p style={{ margin: '2px 0' }}><strong>بخش:</strong> {department ? (departmentNames[department.name] || department.name) : '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>داکتر معالج:</strong> {doctorName}</p>
        <p style={{ margin: '2px 0' }}><strong>نوع مراجعه:</strong> {data.visit_type || '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>وضعیت:</strong> {getStatusText(data.visit_status)}</p>
        <p style={{ margin: '2px 0' }}><strong>تاریخ مراجعه:</strong> {data.visit_date ? new Date(data.visit_date).toLocaleDateString('fa-IR') : '-'}</p>
        <p style={{ margin: '2px 0' }}><strong>فیس مراجعه:</strong> {Number(data.registration_fee || 0).toFixed(2)} افغانی</p>
        {data.diagnosis && <p style={{ margin: '2px 0' }}><strong>تشخیص:</strong> {data.diagnosis}</p>}
        {data.weight && <p style={{ margin: '2px 0' }}><strong>وزن:</strong> {data.weight} کیلوگرم</p>}
        {data.blood_pressure && <p style={{ margin: '2px 0' }}><strong>فشار خون:</strong> {data.blood_pressure}</p>}
        {data.temperature && <p style={{ margin: '2px 0' }}><strong>حرارت:</strong> {data.temperature} درجه</p>}
        {data.oxygen && <p style={{ margin: '2px 0' }}><strong>اکسیجن:</strong> {data.oxygen}%</p>}
        {data.note && <p style={{ margin: '2px 0' }}><strong>یادداشت:</strong> {data.note}</p>}
      </div>
      
      <div style={{ textAlign: 'center', borderTop: '2px solid #000', paddingTop: '8px', marginTop: '10px', fontSize: '8px', color: '#666' }}>
        <p style={{ margin: '0' }}>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} - {new Date().toLocaleTimeString('fa-IR')}</p>
      </div>
    </div>
  );
});

PrintComponent.displayName = 'PrintComponent';

export default PrintComponent;