import React from "react";
import "./MainLayout.css"; // فایل استایل جداگانه

export default function MainLayout({ children, title }) {
  return (
    <div className="main-layout">
      {/* پس‌زمینه */}
      <div className="background-overlay">
        <h1 className="layout-title">{title}</h1>
        <div className="layout-content">{children}</div>
      </div>
    </div>
  );
}
