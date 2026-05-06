 import React from "react";
 import "./slayout.css"; 

export default function slayout({ children, title }) {
  return (
    <div className="main-layout">
      <div className="background-overlay">
        {title && <h1 className="layout-title">{title}</h1>}
        <div className="layout-content">{children}</div>
        <div className="purchase-item">
 
</div>

      </div>
    </div>
  );
}
