// PrescriptionPrint.jsx - Fixed version with proper styling and bold text
import React, { forwardRef } from "react";
import "./sale-print.css";

const PrescriptionPrint = forwardRef(({ data }, ref) => {
  const genderFa =
    data?.gender?.toLowerCase() === "male"
      ? "مرد"
      : data?.gender?.toLowerCase() === "female"
      ? "زن"
      : "-";

  // Get current date for Persian calendar display
  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  return (
    <div ref={ref} className="print-container">
      {data ? (
        <>
          {/* Header - Matching Appointment Card */}
          <div className="print-header">
            <div className="logo-left">
              <div className="logo-left-inner">⚕</div>
            </div>
            <div className="hospital-name">
              <div className="hospital-name-persian">شفاخانه معالجوی آروین</div>
              <div className="hospital-name-english">Avrin Skin Hospital</div>
            </div>
            <div className="logo-right">
              <div className="logo-right-inner">⚕</div>
            </div>
            <div className="date-section">
              تاریخ: {data.date || getCurrentDate()}
            </div>
          </div>

          {/* Prescription Info Section */}
          <div className="prescription-info">
            <div className="prescription-left">
              <div className="doctor-info">
                <div className="doctor-name">
                  <strong>{data.doctor || "دکتر نامشخص"}</strong>
                </div>
                <div className="doctor-specialty">
                  <strong>متخصص پوست و اعصاب</strong>
                </div>
              </div>
              <div className="timing-section">
                <div className="diagnosis-title">
                  <strong>تشخیص</strong>
                </div>
                <div className="diagnosis-value">
                  <strong>{data.diagnosis || "-"}</strong>
                </div>
              </div>
            </div>

            <div className="prescription-right">
              <div className="patient-details">
                <div className="detail-row">
                  <div className="detail-field">
                    <span className="detail-label"><strong>نام مریض:</strong></span>
                    <span className="detail-value"><strong>{data.patient || "-"}</strong></span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label"><strong>شماره نسخه:</strong></span>
                    <span className="detail-value"><strong>{data.pres_num || "-"}</strong></span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-field">
                    <span className="detail-label"><strong>سن:</strong></span>
                    <span className="detail-value"><strong>{data.age || "-"}</strong></span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label"><strong>جنسیت:</strong></span>
                    <span className="detail-value"><strong>{genderFa}</strong></span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-field">
                    <span className="detail-label"><strong>گروپ خون:</strong></span>
                    <span className="detail-value"><strong>{data.blood_group || "-"}</strong></span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label"><strong>تذکره:</strong></span>
                    <span className="detail-value"><strong>{data.tazkira_number || "-"}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vital Signs Section */}
          <div className="vital-signs">
            <div className="vital-signs-grid">
              <div className="vital-item">
                <span className="vital-label"><strong>فشار خون:</strong></span>
                <span className="vital-value"><strong>{data.blood_pressure || "-"}</strong></span>
              </div>
              <div className="vital-item">
                <span className="vital-label"><strong>وزن (کیلوگرم):</strong></span>
                <span className="vital-value"><strong>{data.weight || "-"}</strong></span>
              </div>
              <div className="vital-item">
                <span className="vital-label"><strong>حرارت (درجه سانتی‌گراد):</strong></span>
                <span className="vital-value"><strong>{data.temperature || "-"}</strong></span>
              </div>
              <div className="vital-item">
                <span className="vital-label"><strong>اکسیژن (%):</strong></span>
                <span className="vital-value"><strong>{data.oxygen || "-"}</strong></span>
              </div>
            </div>
          </div>

          {/* Medicines Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th><strong>ردیف</strong></th>
                <th><strong>کتگوری</strong></th>
                <th><strong>نام دوا</strong></th>
                <th><strong>حمایت‌کننده</strong></th>
                <th><strong>نوع دوا</strong></th>
                <th><strong>مقدار مصرف</strong></th>
                <th><strong>تعداد</strong></th>
                <th><strong>قیمت واحد</strong></th>
                <th><strong>قیمت کل</strong></th>
                <th><strong>ملاحظات</strong></th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, i) => (
                <tr key={i}>
                  <td><strong>{i + 1}</strong></td>
                  <td><strong>{item.category_name || "-"}</strong></td>
                  <td><strong>{item.med_name || "-"}</strong></td>
                  <td><strong>{item.supplier_name || "-"}</strong></td>
                  <td><strong>{item.type || "-"}</strong></td>
                  <td><strong>{item.dosage || "-"}</strong></td>
                  <td><strong>{item.quantity}</strong></td>
                  <td><strong>{Number(item.unit_price).toLocaleString()}</strong></td>
                  <td><strong>{Number(item.total_price).toLocaleString()}</strong></td>
                  <td><strong>{item.remarks || "-"}</strong></td>
                </tr>
              ))}
              {(!data.items || data.items.length === 0) && (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "20px" }}>
                    <strong>هیچ آیتمی وجود ندارد</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-item">
              <span className="summary-label"><strong>مجموع</strong></span>
              <span className="summary-value"><strong>{Number(data.total).toLocaleString()}</strong></span>
            </div>
            <div className="summary-item">
              <span className="summary-label"><strong>تخفیف</strong></span>
              <span className="summary-value"><strong>{Number(data.discount).toLocaleString()}</strong></span>
            </div>
            <div className="summary-item">
              <span className="summary-label"><strong>خالص</strong></span>
              <span className="summary-value"><strong>{Number(data.net).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Watermark */}
          <div className="watermark">شفاخانه جلدی آروین</div>

          {/* Footer - Matching Appointment Card */}
          <div className="print-footer">
            <div className="footer-icon"><strong>☎</strong></div>
            <div className="footer-contact">
              <div className="footer-phones"><strong>+93 77 5481818 | +93 77 5481818</strong></div>
              <div className="footer-address"><strong>مرکز تخصصی مراقبت و تداوی جلد آدرس چهار راهی جمهوری</strong></div>
            </div>
          </div>
        </>
      ) : (
        <div className="loading-placeholder">در حال آماده‌سازی...</div>
      )}
    </div>
  );
});

export default PrescriptionPrint;