 import React from 'react';
import './report-layout.css';

const ReportLayout = ({ title, children }) => {
  return (
    <div className="report-page">
      {title && <h2 className="report-title">{title}</h2>}
      {children}
    </div>
  );
};

export default ReportLayout;