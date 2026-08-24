// src/app/pages/laboratory/LabBloodSugar.jsx
import React, { useState } from "react";
import LabBasePage from "./LabBasePage";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";

export default function LabBloodSugar() {
  const [badgeCount, setBadgeCount] = useState(0);

  return (
    <LabBasePage
      title="🩸 قند خون (Blood Sugar)"
      icon={<MonitorHeartIcon sx={{ color: "#ec4899" }} />}
      testType=""  // ❌ بدون testType - فقط با کلمات کلیدی
      testKeywords={["قند", "blood sugar", "گلوکز", "glucose"]}
      backPath="/material/lab-hematology"
      badgeCount={badgeCount}
      onBadgeCountChange={setBadgeCount}
    />
  );
}